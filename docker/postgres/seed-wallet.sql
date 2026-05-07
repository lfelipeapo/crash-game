-- Seed initial wallet for test player after wallet service creates schema
-- This runs manually or via wallets service seed on startup
INSERT INTO wallets (id, player_id, balance_cents, created_at, updated_at)
VALUES ('seed-wallet-1', 'player', 100000, NOW(), NOW())
ON CONFLICT (player_id) DO NOTHING;
