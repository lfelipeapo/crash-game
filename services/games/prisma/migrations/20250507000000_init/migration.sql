-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'betting',
    "serverSeed" TEXT,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL DEFAULT 'default-client-seed',
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "crashPointX100" INTEGER,
    "multiplierX100" INTEGER NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3),
    "crashedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "bettingEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerUsername" TEXT NOT NULL DEFAULT 'player',
    "amountCents" BIGINT NOT NULL,
    "payoutCents" BIGINT,
    "multiplierX100" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'pending_debit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bets_roundId_idx" ON "bets"("roundId");

-- CreateIndex
CREATE INDEX "bets_playerId_idx" ON "bets"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "bets_roundId_playerId_key" ON "bets"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
