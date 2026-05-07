import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/infrastructure/prisma/prisma.service";
import { JwtAuthGuard } from "../../src/presentation/guards/jwt-auth.guard";
import { UserContext } from "../../src/presentation/decorators/current-user.decorator";

describe("Wallet API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockUser: UserContext = {
    playerId: "test-player-e2e",
    username: "testuser",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user: UserContext } } }) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    // Clean up test wallet before tests
    try {
      await prisma.wallet.deleteMany({ where: { playerId: mockUser.playerId } });
    } catch {
      // ignore
    }

    await app.init();
  });

  afterAll(async () => {
    try {
      await prisma.wallet.deleteMany({ where: { playerId: mockUser.playerId } });
    } catch {
      // ignore
    }
    await app.close();
  });

  it("GET /health should return ok", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("wallets");
  });

  it("POST / should create a wallet", async () => {
    const res = await request(app.getHttpServer())
      .post("/")
      .set("Authorization", "Bearer fake-token")
      .expect(201);

    expect(res.body.playerId).toBe(mockUser.playerId);
    expect(res.body.balanceCents).toBe("100000");
  });

  it("GET /me should return the wallet", async () => {
    const res = await request(app.getHttpServer())
      .get("/me")
      .set("Authorization", "Bearer fake-token")
      .expect(200);

    expect(res.body.playerId).toBe(mockUser.playerId);
    expect(res.body.balanceCents).toBe("100000");
    expect(res.body.id).toBeDefined();
  });

  it("POST / should be idempotent", async () => {
    const res = await request(app.getHttpServer())
      .post("/")
      .set("Authorization", "Bearer fake-token")
      .expect(201);

    expect(res.body.playerId).toBe(mockUser.playerId);
    expect(res.body.balanceCents).toBe("100000");
  });
});
