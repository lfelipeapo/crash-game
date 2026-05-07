import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { execSync } from "child_process";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.WEBSOCKET_CORS_ORIGIN ?? "*",
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Crash Game Service")
    .setDescription("Jungle Gaming Crash Game API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Run Prisma migrate deploy on startup
  try {
    execSync("bunx prisma migrate deploy", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
    console.log("Prisma migrations applied successfully");
  } catch (error) {
    console.error("Failed to apply Prisma migrations:", error);
    // Don't exit - migrations may already be applied
  }

  const port = process.env.PORT ?? "4001";
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
}

bootstrap();
