import type { FC } from "react";
import { useGameStore } from "@/stores/game.store";
import { Lock, Unlock, Timer } from "lucide-react";

export const SeedDisplay: FC = () => {
  const { round } = useGameStore();

  const isBetting = round?.state === "betting";
  const isRunning = round?.state === "running";
  const isCrashed = round?.state === "crashed" || round?.state === "settled";

  const serverSeedHash = round?.serverSeedHash ?? null;
  const serverSeed = round?.serverSeed ?? null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-casino-border bg-casino-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-casino-muted">
        {isBetting && <Lock className="h-3.5 w-3.5 text-casino-accent" />}
        {isRunning && <Timer className="h-3.5 w-3.5 text-casino-gold" />}
        {isCrashed && <Unlock className="h-3.5 w-3.5 text-casino-danger" />}
        <span className="font-semibold uppercase tracking-wider">
          {isBetting && "Server Seed Hash (Pré-round)"}
          {isRunning && "Rodada em andamento..."}
          {isCrashed && "Server Seed Revelada"}
          {!round && "Aguardando próxima rodada"}
        </span>
      </div>

      {serverSeedHash && (
        <div className="font-mono text-xs break-all text-casino-muted">
          <span className="text-casino-muted/60">Hash: </span>
          <span className={isCrashed ? "line-through opacity-50" : "text-casino-accent/70"}>
            {serverSeedHash}
          </span>
        </div>
      )}

      {serverSeed && (
        <div className="font-mono text-xs break-all text-casino-muted">
          <span className="text-casino-muted/60">Seed: </span>
          <span className="text-casino-danger/70">{serverSeed}</span>
        </div>
      )}
    </div>
  );
};
