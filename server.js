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

app.get('/', (req, res) => res.json({ status: 'LeadFlow Backend online ✓' }));

app.get('/auth/url', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Kein Code erhalten');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    tokenStore[userInfo.email] = tokens;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    res.redirect(`${frontendUrl}/?auth=success&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/?auth=error`);
  }
});

app.get('/auth/status', async (req, res) => {
  const { email } = req.query;
  if (!email || !tokenStore[email]) return res.json({ authenticated: false });
  try {
    oauth2Client.setCredentials(tokenStore[email]);
    const { credentials } = await oauth2Client.refreshAccessToken();
    tokenStore[email] = credentials;
    res.json({ authenticated: true, email });
  } catch {
    delete tokenStore[email];
    res.json({ authenticated: false });
  }
});

app.post('/auth/logout', (req, res) => {
  const { email } = req.body;
  if (email) delete tokenStore[email];
  res.json({ success: true });
});

app.post('/send', async (req, res) => {
  const { email: senderEmail, to, subject, body } = req.body;
  if (!senderEmail || !tokenStore[senderEmail]) return res.status(401).json({ error: 'Nicht authentifiziert.' });
  try {
    oauth2Client.setCredentials(tokenStore[senderEmail]);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const messageParts = [
      `From: ${senderEmail}`,`To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64','',Buffer.from(body).toString('base64'),
    ];
    const raw = Buffer.from(messageParts.join('\r\n')).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 401 || err.message?.includes('invalid_grant')) {
      delete tokenStore[senderEmail];
      return res.status(401).json({ error: 'Session abgelaufen.', reauth: true });
    }
    res.status(500).json({ error: err.message });
  }
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
      const messageParts = [
        `From: ${senderEmail}`,`To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64','',Buffer.from(body).toString('base64'),
      ];
      const raw = Buffer.from(messageParts.join('\r\n')).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
      sent++;
      send({ index: i, to, status: 'sent', sent, errors, total: recipients.length });
    } catch (err) {
      errors++;
      send({ index: i, to, status: 'error', error: err.message, sent, errors, total: recipients.length });
      if (err.code === 401 || err.message?.includes('invalid_grant')) { send({ fatal: true, error: 'Session abgelaufen.' }); break; }
    }
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, delay));
  }
  send({ done: true, sent, errors, total: recipients.length });
  res.end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 LeadFlow Backend läuft auf Port ${PORT}`));
