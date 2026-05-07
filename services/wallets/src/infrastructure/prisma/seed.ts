import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const playerId = "player";
  const existing = await prisma.wallet.findUnique({
    where: { playerId },
  });
  if (!existing) {
    await prisma.wallet.create({
      data: {
        playerId,
        balanceCents: BigInt(100000),
      },
    });
    console.log(`Seeded wallet for playerId=${playerId}`);
  } else {
    console.log(`Wallet already exists for playerId=${playerId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
