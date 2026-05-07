import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { useGameStore } from "@/stores/game.store";
import { connectWebSocket, disconnectWebSocket } from "@/api/websocket";
import { getMyWallet } from "@/api/wallet";
import { getCurrentRound, getRoundHistory } from "@/api/game";
import { Layout } from "@/components/Layout";
import { CrashChart } from "@/components/CrashChart";
import { BetControls } from "@/components/BetControls";
import { CurrentBets } from "@/components/CurrentBets";
import { RoundHistory } from "@/components/RoundHistory";
import { SeedDisplay } from "@/components/SeedDisplay";
import { Timer } from "@/components/Timer";
import { PlayerInfo } from "@/components/PlayerInfo";

export function GamePage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { setRound, setHistory, setBalance } = useGameStore();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Connect WebSocket and fetch initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    connectWebSocket();

    // Fetch wallet
    getMyWallet()
      .then((wallet) => {
        setBalance(BigInt(wallet.balanceCents));
      })
      .catch((err) => {
        // If wallet not found, try creating it
        console.error("Wallet fetch error:", err);
      });

    // Fetch current round
    getCurrentRound()
      .then((data) => {
        if ("message" in data) {
          // No active round
        } else {
          setRound(data);
        }
      })
      .catch((err) => {
        console.error("Current round fetch error:", err);
      });

    // Fetch history
    getRoundHistory(0, 20)
      .then((data) => {
        setHistory(data.rounds);
      })
      .catch((err) => {
        console.error("History fetch error:", err);
      });

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, setRound, setHistory, setBalance]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-casino-bg text-casino-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-casino-accent border-t-transparent" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        {/* Player Info */}
        <PlayerInfo />

        {/* Round History */}
        <RoundHistory />

        {/* Timer */}
        <Timer />

        {/* Crash Chart */}
        <CrashChart />

        {/* Seed Display */}
        <SeedDisplay />

        {/* Game controls + bets */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BetControls />
          <CurrentBets />
        </div>
      </div>
    </Layout>
  );
}
