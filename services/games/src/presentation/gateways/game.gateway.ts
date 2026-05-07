import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Injectable } from "@nestjs/common";
import { GameEventBus } from "../../infrastructure/game/game-event-bus.service";
import { GameLoopService } from "../../infrastructure/game/game-loop.service";
import { Subscription } from "rxjs";
import type { CrashGameEvent } from "@crash/contracts";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN ?? "*",
  },
  namespace: "/game",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly subscriptions = new Map<string, Subscription>();
  private eventSubscription: Subscription | null = null;

  constructor(
    private readonly eventBus: GameEventBus,
    private readonly gameLoop: GameLoopService,
  ) {}

  afterInit(): void {
    this.logger.log("WebSocket Gateway initialized");

    // Subscribe to game events and broadcast to all clients
    this.eventSubscription = this.eventBus.events$.subscribe((event) => {
      this.broadcast(event.type, event);
    });
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);

    // Send current round snapshot (hide serverSeed and crashPointX100 until crashed/settled)
    const currentRound = this.gameLoop.getCurrentRound();
    if (currentRound) {
      const isRevealed = currentRound.state === "crashed" || currentRound.state === "settled";
      client.emit("round.snapshot", {
        roundId: currentRound.id,
        state: currentRound.state,
        serverSeedHash: currentRound.serverSeedHash,
        serverSeed: isRevealed ? currentRound.serverSeed : null,
        crashPointX100: isRevealed ? currentRound.crashPointX100 : null,
        multiplierX100: currentRound.multiplierX100,
        startedAt: currentRound.startedAt?.toISOString() ?? null,
        bettingEndsAt: currentRound.bettingEndsAt?.toISOString() ?? null,
        crashedAt: currentRound.crashedAt?.toISOString() ?? null,
      });
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    const sub = this.subscriptions.get(client.id);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(client.id);
    }
  }

  private broadcast(event: string, data: CrashGameEvent): void {
    this.server.emit(event, data);
  }

  // Called by other services to emit bet-specific events
  emitBetAccepted(data: { roundId: string; betId: string; playerId: string; amountCents: string }): void {
    this.server.emit("bet.accepted", data);
  }

  emitBetRejected(data: { roundId: string; betId: string; playerId: string; amountCents: string; reason: string }): void {
    this.server.emit("bet.rejected", data);
  }

  emitBetCashedOut(data: {
    roundId: string;
    betId: string;
    playerId: string;
    amountCents: string;
    payoutCents: string;
    multiplierX100: number;
  }): void {
    this.server.emit("bet.cashed_out", data);
  }

  emitWalletBalanceUpdated(data: { playerId: string; balanceCents: string }): void {
    this.server.emit("wallet.balance.updated", data);
  }
}
