-- List paid users
SELECT u.email, e.product_key, e.status, e.current_period_end, e.updated_at
FROM users u
JOIN entitlements e ON e.user_id = u.id
ORDER BY e.updated_at DESC;

-- Manually grant access for a test user
INSERT INTO users (email)
VALUES ('test@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO entitlements (user_id, product_key, status)
SELECT id, 'stack_dashboard', 'active'
FROM users
WHERE email = 'test@example.com'
ON CONFLICT (user_id, product_key)
DO UPDATE SET status = 'active', updated_at = NOW();

-- Revoke access
UPDATE entitlements
SET status = 'inactive', updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com')
AND product_key = 'stack_dashboard';
