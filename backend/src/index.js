const express = require('express');
const cors = require('cors');
const config = require('./config');
const { authOptional } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const ai = require('./services/ai');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(authOptional);

app.get('/', (_req, res) =>
  res.json({
    service: 'Project Evergreen API',
    status: 'online',
    ai_mode: ai.enabled() ? 'live' : 'deterministic_fallback',
    docs: '/api',
  })
);

app.get('/api', (_req, res) =>
  res.json({
    auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me'],
    products: ['GET /api/products', 'GET /api/products/:idOrSlug', 'GET /api/products/meta/categories', 'GET /api/products/meta/certifications'],
    brands: ['POST /api/brands', 'GET /api/brands/:slug', 'GET /api/brands/me/products', 'POST /api/brands/me/products', 'PUT /api/brands/me/products/:id', 'POST /api/brands/me/products/:id/submit'],
    orders: ['POST /api/orders', 'GET /api/orders', 'GET /api/orders/:id'],
    admin: ['GET /api/admin/brands', 'PATCH /api/admin/brands/:id/verification', 'GET /api/admin/products', 'PATCH /api/admin/products/:id/moderate', 'POST /api/admin/scoring-rules', 'POST /api/admin/rescore-all'],
    ai: ['GET /api/ai/products/:idOrSlug/ingredient-summary', 'GET /api/ai/products/:idOrSlug/concerns', 'POST /api/ai/draft-description'],
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`🌿 Project Evergreen API on :${config.port} (AI: ${ai.enabled() ? 'live' : 'deterministic fallback'})`);
});

module.exports = app;
