import { io, Socket } from "socket.io-client";
import type {
  RoundBettingStartedEvent,
  RoundRunningStartedEvent,
  RoundMultiplierTickEvent,
  RoundCrashedEvent,
  RoundSettledEvent,
  BetAcceptedEvent,
  BetRejectedEvent,
  BetCashedOutEvent,
  WalletBalanceUpdatedEvent,
  RoundResponseDto,
  BetResponseDto,
} from "@crash/contracts";
import { RoundState, BetState } from "@crash/contracts";
import { useGameStore } from "@/stores/game.store";
import { useAuthStore } from "@/stores/auth.store";
import { getToken } from "@/auth/keycloak";
import { toast } from "sonner";
import { formatMoneyCents } from "@crash/contracts";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

/**
 * Connect to the game WebSocket gateway via Kong API Gateway.
 *
 * Kong strips the `/games` prefix and forwards to the Game Service.
 * The Socket.IO path becomes `/games/socket.io` externally,
 * which Kong strips to `/socket.io` for the Game Service.
 *
 * Trade-off: REST passes through Kong; WebSocket also goes through Kong
 * for consistency with the architecture diagram. Socket.IO long-polling
 * is disabled (`transports: ["websocket"]`) for reliable gateway proxying.
 */
export function connectWebSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getToken();

  socket = io("http://localhost:8000/game", {
    path: "/games/socket.io",
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[WS] Connected via Kong");
  });

  socket.on("disconnect", (reason) => {
    console.log("[WS] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[WS] Connection error:", err.message);
  });

  // Round snapshot on connection
  socket.on("round.snapshot", (data: {
    roundId: string;
    state: string;
    serverSeedHash: string | null;
    serverSeed: string | null;
    crashPointX100: number | null;
    multiplierX100: number;
    startedAt: string | null;
    bettingEndsAt: string | null;
    crashedAt: string | null;
  }) => {
    const store = useGameStore.getState();
    const round: RoundResponseDto = {
      id: data.roundId,
      state: data.state as any,
      serverSeedHash: data.serverSeedHash,
      serverSeed: data.serverSeed,
      crashPointX100: data.crashPointX100,
      multiplierX100: data.multiplierX100,
      startedAt: data.startedAt,
      crashedAt: data.crashedAt,
      settledAt: null,
      bettingEndsAt: data.bettingEndsAt,
      createdAt: new Date().toISOString(),
    };
    store.setRound({ ...round, bets: store.round?.bets ?? [] });
  });

  // Round events
  socket.on("round.betting.started", (event: RoundBettingStartedEvent) => {
    const store = useGameStore.getState();
    const round: RoundResponseDto = {
      id: event.roundId,
      state: RoundState.BETTING,
      serverSeedHash: event.serverSeedHash,
      serverSeed: null,
      crashPointX100: null,
      multiplierX100: 100,
      startedAt: null,
      crashedAt: null,
      settledAt: null,
      bettingEndsAt: event.bettingEndsAt,
      createdAt: event.occurredAt,
    };
    store.setRound({ ...round, bets: [] });
    store.setIsCrashed(false);
  });

  socket.on("round.running.started", (event: RoundRunningStartedEvent) => {
    const store = useGameStore.getState();
    if (store.round) {
      store.setRound({
        ...store.round,
        state: RoundState.RUNNING,
        startedAt: event.startedAt,
        multiplierX100: 100,
      });
    }
    store.setIsCrashed(false);
  });

  socket.on("round.multiplier.tick", (event: RoundMultiplierTickEvent) => {
    const store = useGameStore.getState();
    if (store.round && store.round.state === "running") {
      store.setRound({
        ...store.round,
        multiplierX100: event.multiplierX100,
      });
    }
  });

  socket.on("round.crashed", (event: RoundCrashedEvent) => {
    const store = useGameStore.getState();
    if (store.round) {
      const crashedRound: RoundResponseDto = {
        ...store.round,
        state: RoundState.CRASHED,
        crashPointX100: event.crashPointX100,
        serverSeed: event.serverSeed,
        crashedAt: event.occurredAt,
      };
      store.setRound({ ...crashedRound, bets: store.round.bets });
      store.addHistoryRound(crashedRound);
    }
    store.setIsCrashed(true);

    // Update local bets to lost
    const auth = useAuthStore.getState();
    const myPlayerId = auth.user?.playerId;
    if (myPlayerId && store.round?.bets) {
      const updatedBets = store.round.bets.map((b) =>
        b.playerId === myPlayerId && b.state === "accepted"
          ? { ...b, state: BetState.LOST }
          : b,
      );
      store.setRound({ ...store.round, bets: updatedBets });
    }
  });

  socket.on("round.settled", (event: RoundSettledEvent) => {
    const store = useGameStore.getState();
    if (store.round) {
      store.setRound({
        ...store.round,
        state: RoundState.SETTLED,
        settledAt: event.occurredAt,
      });
    }
  });

  // Bet events
  socket.on("bet.accepted", (event: BetAcceptedEvent) => {
    const store = useGameStore.getState();
    const auth = useAuthStore.getState();

    const bet: BetResponseDto = {
      id: event.betId,
      roundId: event.roundId,
      playerId: event.playerId,
      playerUsername: auth.user?.username ?? "player",
      amountCents: event.amountCents,
      payoutCents: null,
      multiplierX100: null,
      state: BetState.ACCEPTED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addBet(bet);

    if (event.playerId === auth.user?.playerId) {
      toast.success("Aposta aceita!");
    }
  });

  socket.on("bet.rejected", (event: BetRejectedEvent) => {
    const auth = useAuthStore.getState();
    if (event.playerId === auth.user?.playerId) {
      toast.error(`Aposta rejeitada: ${event.reason}`);
      useGameStore.getState().setIsBetting(false);
    }
  });

  socket.on("bet.cashed_out", (event: BetCashedOutEvent) => {
    const store = useGameStore.getState();
    const auth = useAuthStore.getState();

    const bet: BetResponseDto = {
      id: event.betId,
      roundId: event.roundId,
      playerId: event.playerId,
      playerUsername: auth.user?.username ?? "player",
      amountCents: event.amountCents,
      payoutCents: event.payoutCents,
      multiplierX100: event.multiplierX100,
      state: BetState.CASHED_OUT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.updateBet(bet);

    if (event.playerId === auth.user?.playerId) {
      toast.success(
        `Cashout! ${formatMoneyCents(BigInt(event.payoutCents))} @ ${(event.multiplierX100 / 100).toFixed(2)}x`,
      );
      store.setIsCashingOut(false);
    }
  });

  // Wallet events
  socket.on("wallet.balance.updated", (event: WalletBalanceUpdatedEvent) => {
    const auth = useAuthStore.getState();
    if (event.playerId === auth.user?.playerId) {
      useGameStore.getState().setBalance(BigInt(event.balanceCents));
    }
  });

  return socket;
}

export function disconnectWebSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
