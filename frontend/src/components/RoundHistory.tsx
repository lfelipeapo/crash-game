import type { FC } from "react";
import { useGameStore } from "@/stores/game.store";

export const RoundHistory: FC = () => {
  const { history } = useGameStore();

  if (history.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-casino-border bg-casino-card px-4 py-3 text-sm text-casino-muted">
        <span>Histórico de crash aparecerá aqui</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-casino-border bg-casino-card px-4 py-3">
      {history.map((round, i) => {
        const crashPoint = round.crashPointX100 ?? 0;
        const multiplier = (crashPoint / 100).toFixed(2);

        let colorClass = "";
        let bgClass = "";
        if (crashPoint < 200) {
          colorClass = "text-casino-danger";
          bgClass = "bg-casino-danger/10 border-casino-danger/30";
        } else if (crashPoint <= 500) {
          colorClass = "text-orange-400";
          bgClass = "bg-orange-400/10 border-orange-400/30";
        } else {
          colorClass = "text-casino-accent";
          bgClass = "bg-casino-accent/10 border-casino-accent/30";
        }

        return (
          <div
            key={`${round.id}-${i}`}
            className={`flex shrink-0 items-center justify-center rounded-lg border px-3 py-1.5 font-mono text-sm font-bold transition-transform hover:scale-105 ${colorClass} ${bgClass}`}
            title={`Crash em ${multiplier}x`}
          >
            {multiplier}x
          </div>
        );
      })}
    </div>
  );
};
