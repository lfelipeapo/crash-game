import { useMemo, type FC, type ReactNode } from "react";
import { Users, TrendingUp, XCircle, CheckCircle2, Clock } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { useAuthStore } from "@/stores/auth.store";
import { formatMoneyCents, BetState } from "@crash/contracts";

const statusConfig: Record<
  BetState,
  { label: string; color: string; icon: ReactNode }
> = {
  pending_debit: {
    label: "Pendente",
    color: "text-casino-muted",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  accepted: {
    label: "Ativa",
    color: "text-casino-accent",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejeitada",
    color: "text-casino-danger",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  cashed_out: {
    label: "Cashout",
    color: "text-casino-gold",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  lost: {
    label: "Perdida",
    color: "text-casino-danger",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export const CurrentBets: FC = () => {
  const { round } = useGameStore();
  const { user } = useAuthStore();

  const sortedBets = useMemo(() => {
    if (!round?.bets) return [];
    return [...round.bets].sort((a, b) => {
      // Own bets first
      if (a.playerId === user?.playerId && b.playerId !== user?.playerId)
        return -1;
      if (b.playerId === user?.playerId && a.playerId !== user?.playerId)
        return 1;
      // Then by amount desc
      return Number(BigInt(b.amountCents) - BigInt(a.amountCents));
    });
  }, [round?.bets, user?.playerId]);

  if (!round || sortedBets.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-casino-border bg-casino-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-casino-muted">
          <Users className="h-4 w-4" />
          Apostas da Rodada
        </h3>
        <div className="flex h-32 items-center justify-center text-sm text-casino-muted">
          Nenhuma aposta nesta rodada
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-casino-border bg-casino-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-casino-muted">
        <Users className="h-4 w-4" />
        Apostas da Rodada
        <span className="ml-auto rounded-full bg-casino-bg px-2 py-0.5 font-mono text-xs">
          {sortedBets.length}
        </span>
      </h3>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {sortedBets.map((bet) => {
          const isMine = bet.playerId === user?.playerId;
          const status = statusConfig[bet.state];
          const payout = bet.payoutCents ? BigInt(bet.payoutCents) : null;
          const multiplier = bet.multiplierX100
            ? (bet.multiplierX100 / 100).toFixed(2)
            : null;

          return (
            <div
              key={bet.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                isMine
                  ? "border-casino-accent/30 bg-casino-accent/5"
                  : "border-casino-border bg-casino-bg"
              } ${
                bet.state === "cashed_out"
                  ? "border-casino-gold/30"
                  : bet.state === "lost"
                  ? "border-casino-danger/20"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      isMine ? "text-casino-accent" : "text-casino-text"
                    }`}
                  >
                    {isMine ? "Você" : bet.playerUsername}
                  </span>
                  <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <span className="font-mono text-xs text-casino-muted">
                  ${formatMoneyCents(BigInt(bet.amountCents))}
                </span>
              </div>

              <div className="text-right">
                {bet.state === "cashed_out" && payout !== null && multiplier && (
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-sm font-bold text-casino-gold">
                      ${formatMoneyCents(payout)}
                    </span>
                    <span className="font-mono text-xs text-casino-gold/70">
                      @{multiplier}x
                    </span>
                  </div>
                )}
                {bet.state === "lost" && (
                  <span className="font-mono text-sm text-casino-danger">
                    -${formatMoneyCents(BigInt(bet.amountCents))}
                  </span>
                )}
                {bet.state === "accepted" && (
                  <span className="font-mono text-xs text-casino-accent animate-pulse">
                    Em jogo...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
