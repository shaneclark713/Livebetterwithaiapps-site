const express = require('express');
const { requireStackAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireStackAccess, (req, res) => {
  res.json({
    email: req.user.email,
    product_key: req.entitlement.product_key,
    tier: req.stackTier,
    status: req.entitlement.status
  });
});

router.get('/data', requireStackAccess, (req, res) => {
  const baseData = {
    title: '$STACK Secure Dashboard',
    updated_at: new Date().toISOString(),
    tier: req.stackTier,
    note: 'Protected sample payload. Replace with live data after launch.',
    holdings: [
      { ticker: 'AMAT', weight: 15 },
      { ticker: 'KLAC', weight: 15 },
      { ticker: 'UCTT', weight: 2 }
    ]
  };

  if (req.stackTier === 'institutional') {
    baseData.institutional = {
      unlocked: true,
      message: 'Institutional tier placeholder: add deeper allocation notes, downloadable reports, and expanded analytics here.'
    };
  }

  res.json(baseData);
});

module.exports = router;
