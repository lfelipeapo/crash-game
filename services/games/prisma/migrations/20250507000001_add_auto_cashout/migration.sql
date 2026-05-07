-- Add autoCashoutMultiplierX100 to bets
ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "autoCashoutMultiplierX100" INTEGER;
