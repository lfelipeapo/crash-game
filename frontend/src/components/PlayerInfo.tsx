import type { FC } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useGameStore } from "@/stores/game.store";
import { User, Wallet } from "lucide-react";
import { formatMoneyCents } from "@crash/contracts";

export const PlayerInfo: FC = () => {
  const { user } = useAuthStore();
  const { balanceCents } = useGameStore();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-casino-border bg-casino-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casino-accent/10">
          <User className="h-5 w-5 text-casino-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-casino-text">{user.username}</p>
          <p className="text-xs text-casino-muted">Jogador</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-casino-bg px-4 py-2 border border-casino-border">
        <Wallet className="h-4 w-4 text-casino-accent" />
        <span className="font-mono text-lg font-bold text-casino-accent">
          ${formatMoneyCents(balanceCents)}
        </span>
      </div>
    </div>
  );
};
