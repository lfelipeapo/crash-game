import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { PrismaService } from "./infrastructure/prisma/prisma.service";
import { execSync } from "child_process";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Wallet Service API")
    .setDescription("Wallet management for Jungle Gaming Crash Game")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Run migrations before starting
  try {
    execSync("bun prisma migrate deploy", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    console.log("Database migrations applied successfully");
  } catch {
    console.warn("Migration deploy failed or skipped, continuing...");
  }

  // Seed if needed
  try {
    execSync("bun run src/infrastructure/prisma/seed.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch {
    console.warn("Seed failed or skipped, continuing...");
  }

  const prismaService = app.get(PrismaService);
  await prismaService.$connect();

  const port = process.env.PORT || "4002";
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
}

bootstrap();
