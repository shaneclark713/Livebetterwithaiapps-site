require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { requireStackAccess, attachUser } = require('./src/middleware/auth');
const checkoutRoutes = require('./src/routes/checkout');
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const webhookRoutes = require('./src/routes/webhooks');

const app = express();

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || process.env.APP_BASE_URL || 'http://localhost:3000';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      "img-src": ["'self'", "data:", "https://www.google-analytics.com"],
      "connect-src": ["'self'", "https://www.google-analytics.com", "https://analytics.google.com"],
      "frame-src": ["'self'", "https://checkout.stripe.com"]
    }
  }
}));

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());

// Stripe webhook MUST be before express.json() because signature verification needs raw body.
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRoutes.handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 150, standardHeaders: 'draft-7', legacyHeaders: false }));

app.use(attachUser);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/checkout', checkoutRoutes);
app.use('/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/checkout/success', checkoutRoutes.handleCheckoutSuccess);

app.get('/dashboard', requireStackAccess, (req, res) => {
  res.sendFile(path.join(__dirname, 'protected', 'dashboard.html'));
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'stack-subscription-backend' }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

app.listen(PORT, () => console.log(`$STACK backend running on port ${PORT}`));
