require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();
app.use(express.json());

const ALLOWED = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED.some(a => origin.startsWith(a))) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const tokenStore = {};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const httpGet = (url) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https') ? require('https') : require('http');
  const req = mod.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let data = '';
    res.on('data', chunk => { if (data.length < 80000) data += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });
  req.on('error', reject);
  req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
});

const extractEmails = (html) => {
  const found = new Set();
  const mailto = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi) || [];
  mailto.forEach(m => found.add(m.replace('mailto:', '').toLowerCase().trim()));
  const plain = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
  plain.forEach(e => {
    const clean = e.toLowerCase().trim();
    if (!clean.includes('example') && !clean.includes('yourdomain') &&
        !clean.includes('domain.com') && !clean.includes('@2x') &&
        !clean.includes('.png') && !clean.includes('.jpg') &&
        !clean.includes('sentry') && clean.length < 80) {
      found.add(clean);
    }
  });
  return [...found].slice(0, 3);
};

const scrapeEmail = async (website) => {
  if (!website) return null;
  try {
    let url = website.startsWith('http') ? website : 'https://' + website;
    const res = await httpGet(url);
    let emails = extractEmails(res.body);
    if (emails.length) return emails[0];
    const base = url.replace(/\/$/, '');
    for (const path of ['/kontakt', '/contact', '/impressum', '/about']) {
      try {
        const r2 = await httpGet(base + path);
        emails = extractEmails(r2.body);
        if (emails.length) return emails[0];
      } catch {}
    }
  } catch {}
  return null;
};

const placesSearch = async (query, location, pagetoken) => {
  const key = process.env.GOOGLE_PLACES_KEY;
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + location)}&key=${key}&language=de`;
  if (pagetoken) url += `&pagetoken=${pagetoken}`;
  const res = await httpGet(url);
  return JSON.parse(res.body);
};

const placeDetails = async (placeId) => {
  const key = process.env.GOOGLE_PLACES_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,website,formatted_address&key=${key}`;
  const res = await httpGet(url);
  return JSON.parse(res.body);
};

app.get('/', (req, res) => res.json({ status: 'LeadFlow Backend online ✓' }));

app.get('/scrape', async (req, res) => {
  const { niche, location, limit = 50 } = req.query;
  if (!niche || !location) return res.status(400).json({ error: 'niche und location erforderlich' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const maxLeads = Math.min(parseInt(limit), 500);
  const leads = [];
  let pagetoken = null;
  let attempts = 0;
  send({ status: 'searching', message: `Suche nach "${niche}" in ${location}...` });
  while (leads.length < maxLeads && attempts < 10) {
    attempts++;
    try {
      if (pagetoken) await sleep(2200);
      const data = await placesSearch(niche, location, pagetoken);
      if (data.status === 'REQUEST_DENIED') { send({ error: 'API Key ungültig.' }); break; }
      if (!data.results?.length) break;
      for (const place of data.results) {
        if (leads.length >= maxLeads) break;
        send({ status: 'processing', message: `Verarbeite: ${place.name}...`, progress: Math.round(leads.length / maxLeads * 100) });
        let website = '', phone = '', address = '';
        try {
          const details = await placeDetails(place.place_id);
          website = details.result?.website || '';
          phone = details.result?.formatted_phone_number || '';
          address = details.result?.formatted_address || '';
        } catch {}
        let email = '';
        if (website) {
          send({ status: 'scraping', message: `E-Mail suche: ${place.name}...` });
          email = await scrapeEmail(website) || '';
        }
        const lead = {
          id: Math.random().toString(36).substr(2, 9),
          company: place.name, email, website, phone,
          city: location, address, niche,
          rating: place.rating || '', status: 'new', selected: true,
        };
        leads.push(lead);
        send({ status: 'lead', lead, count: leads.length, total: maxLeads });
        await sleep(300);
      }
      pagetoken = data.next_page_token || null;
      if (!pagetoken) break;
    } catch (err) { send({ error: err.message }); break; }
  }
  send({ status: 'done', count: leads.length });
  res.end();
});

app.get('/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Kein Code');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    tokenStore[userInfo.email] = tokens;
    res.redirect(`${process.env.FRONTEND_URL}/?auth=success&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}`);
  } catch { res.redirect(`${process.env.FRONTEND_URL}/?auth=error`); }
});

app.get('/auth/status', async (req, res) => {
  const { email } = req.query;
  if (!email || !tokenStore[email]) return res.json({ authenticated: false });
  try {
    oauth2Client.setCredentials(tokenStore[email]);
    const { credentials } = await oauth2Client.refreshAccessToken();
    tokenStore[email] = credentials;
    res.json({ authenticated: true, email });
  } catch { delete tokenStore[email]; res.json({ authenticated: false }); }
});

app.post('/auth/logout', (req, res) => {
  const { email } = req.body;
  if (email) delete tokenStore[email];
  res.json({ success: true });
});

app.post('/send/bulk', async (req, res) => {
  const { email: senderEmail, recipients, delay = 1500 } = req.body;
  if (!senderEmail || !tokenStore[senderEmail]) return res.status(401).json({ error: 'Nicht authentifiziert.' });
  if (!Array.isArray(recipients) || !recipients.length) return res.status(400).json({ error: 'Keine Empfänger.' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  let sent = 0, errors = 0;
  for (let i = 0; i < recipients.length; i++) {
    const { to, subject, body } = recipients[i];
    try {
      oauth2Client.setCredentials(tokenStore[senderEmail]);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const parts = [`From: ${senderEmail}`, `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64', '', Buffer.from(body).toString('base64')];
      const raw = Buffer.from(parts.join('\r\n')).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
      sent++;
      send({ index: i, to, status: 'sent', sent, errors, total: recipients.length });
    } catch (err) {
      errors++;
      send({ index: i, to, status: 'error', error: err.message, sent, errors, total: recipients.length });
      if (err.code === 401 || err.message?.includes('invalid_grant')) { send({ fatal: true }); break; }
    }
    if (i < recipients.length - 1) await sleep(delay);
  }
  send({ done: true, sent, errors, total: recipients.length });
  res.end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 LeadFlow Backend Port ${PORT}`));
