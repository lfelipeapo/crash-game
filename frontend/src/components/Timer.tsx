import { useEffect, useState, type FC } from "react";
import { useGameStore } from "@/stores/game.store";
import { Timer as TimerIcon } from "lucide-react";

export const Timer: FC = () => {
  const { round } = useGameStore();
  const [remaining, setRemaining] = useState(0);

  const isBetting = round?.state === "betting";
  const bettingEndsAt = round?.bettingEndsAt;

  useEffect(() => {
    if (!isBetting || !bettingEndsAt) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const end = new Date(bettingEndsAt).getTime();
      const now = Date.now();
      const left = Math.max(0, Math.ceil((end - now) / 1000));
      setRemaining(left);
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [isBetting, bettingEndsAt]);

  if (!isBetting || remaining <= 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-casino-accent/30 bg-casino-accent/5 px-4 py-3">
      <TimerIcon className="h-5 w-5 text-casino-accent" />
      <span className="font-mono text-2xl font-bold text-casino-accent">
        {remaining > 0 ? remaining.toFixed(1) : "0.0"}s
      </span>
      <span className="text-xs text-casino-accent/60">para apostar</span>
    </div>
  );
};
