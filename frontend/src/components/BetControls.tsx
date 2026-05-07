import { useCallback, useMemo, type FC, type ChangeEvent } from "react";
import { DollarSign, Zap, Loader2, Target } from "lucide-react";
import { useGameStore } from "@/stores/game.store";
import { useAuthStore } from "@/stores/auth.store";
import { placeBet, cashOut } from "@/api/game";
import {
  formatMoneyCents,
  parseMoneyCents,
  validateBetAmountCents,
  calculatePayoutCents,
} from "@crash/contracts";
import { toast } from "sonner";

export const BetControls: FC = () => {
  const {
    round,
    balanceCents,
    betAmount,
    autoCashout,
    isBetting,
    isCashingOut,
    setBetAmount,
    setAutoCashout,
    setIsBetting,
    setIsCashingOut,
  } = useGameStore();

  const { user } = useAuthStore();

  const canBet = round?.state === "betting";
  const canCashOut = round?.state === "running";

  // Check if user has an accepted bet in this round
  const myAcceptedBet = useMemo(() => {
    if (!round || !user) return null;
    return round.bets.find(
      (b) => b.playerId === user.playerId && b.state === "accepted"
    );
  }, [round, user]);

  const hasAcceptedBet = !!myAcceptedBet;

  const currentMultiplierX100 = round?.multiplierX100 ?? 100;

  const potentialPayout = useMemo(() => {
    if (!myAcceptedBet) return 0n;
    return calculatePayoutCents(
      BigInt(myAcceptedBet.amountCents),
      currentMultiplierX100
    );
  }, [myAcceptedBet, currentMultiplierX100]);

  const handleBetAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setBetAmount(value);
    }
  };

  const handleAutoCashoutChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setAutoCashout(value);
    }
  };

  const autoCashoutX100 = useMemo(() => {
    if (!autoCashout) return undefined;
    const parsed = parseFloat(autoCashout);
    if (isNaN(parsed) || parsed < 1.01) return undefined;
    return Math.round(parsed * 100);
  }, [autoCashout]);

  const handlePlaceBet = useCallback(async () => {
    if (!canBet || isBetting) return;
    const amountCents = parseMoneyCents(betAmount);
    const validation = validateBetAmountCents(amountCents);
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid bet amount");
      return;
    }
    if (amountCents > balanceCents) {
      toast.error("Saldo insuficiente");
      return;
    }

    setIsBetting(true);
    try {
      await placeBet(amountCents, autoCashoutX100);
      // Bet request sent - wait for bet.accepted or bet.rejected via WS
      toast.info("Aposta enviada...");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao apostar";
      toast.error(msg);
      setIsBetting(false);
    }
  }, [canBet, isBetting, betAmount, balanceCents, setIsBetting, autoCashoutX100]);

  const handleCashOut = useCallback(async () => {
    if (!canCashOut || !hasAcceptedBet || isCashingOut) return;
    setIsCashingOut(true);
    try {
      await cashOut();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no cashout";
      toast.error(msg);
      setIsCashingOut(false);
    }
  }, [canCashOut, hasAcceptedBet, isCashingOut, setIsCashingOut]);

  const quickAmounts = ["1.00", "5.00", "10.00", "25.00", "50.00", "100.00"];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-casino-border bg-casino-card p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-casino-muted">
        Apostar
      </h3>

      {/* Amount Input */}
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-casino-muted" />
        <input
          type="text"
          inputMode="decimal"
          value={betAmount}
          onChange={handleBetAmountChange}
          disabled={!canBet}
          className="w-full rounded-lg border border-casino-border bg-casino-bg py-3 pl-10 pr-4 font-mono text-lg text-casino-text placeholder-casino-muted outline-none transition-colors focus:border-casino-accent disabled:opacity-50"
          placeholder="0.00"
        />
      </div>

      {/* Quick Amounts */}
      <div className="grid grid-cols-3 gap-2">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => setBetAmount(amt)}
            disabled={!canBet}
            className="rounded-md border border-casino-border bg-casino-bg px-2 py-1.5 font-mono text-xs text-casino-muted transition-colors hover:border-casino-accent hover:text-casino-accent disabled:opacity-50"
          >
            ${amt}
          </button>
        ))}
      </div>

      {/* Auto Cashout */}
      <div className="relative">
        <Target className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-casino-muted" />
        <input
          type="text"
          inputMode="decimal"
          value={autoCashout}
          onChange={handleAutoCashoutChange}
          disabled={!canBet}
          className="w-full rounded-lg border border-casino-border bg-casino-bg py-2 pl-10 pr-12 font-mono text-sm text-casino-text placeholder-casino-muted outline-none transition-colors focus:border-casino-gold disabled:opacity-50"
          placeholder="Auto Cashout (ex: 2.00)"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-casino-muted">
          x
        </span>
      </div>

      {/* Balance info */}
      <div className="flex items-center justify-between text-xs text-casino-muted">
        <span>Saldo:</span>
        <span className="font-mono text-casino-text">
          ${formatMoneyCents(balanceCents)}
        </span>
      </div>

      {/* Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={!canBet || isBetting || hasAcceptedBet}
        className="relative flex w-full items-center justify-center gap-2 rounded-lg bg-casino-accent py-3 font-semibold text-casino-bg transition-all hover:bg-casino-accentDark disabled:opacity-50 disabled:hover:bg-casino-accent"
      >
        {isBetting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Apostar
          </>
        )}
      </button>

      {/* Cash Out Button */}
      <button
        onClick={handleCashOut}
        disabled={!canCashOut || !hasAcceptedBet || isCashingOut}
        className={`relative flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all disabled:opacity-50 ${
          canCashOut && hasAcceptedBet
            ? "animate-pulse-glow bg-casino-gold text-casino-bg hover:bg-yellow-400"
            : "bg-casino-border text-casino-muted"
        }`}
      >
        {isCashingOut ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <span>Cash Out</span>
            {hasAcceptedBet && canCashOut && (
              <span className="font-mono text-sm">
                ${formatMoneyCents(potentialPayout)} @{" "}
                {(currentMultiplierX100 / 100).toFixed(2)}x
              </span>
            )}
          </>
        )}
      </button>

      {/* My bet status */}
      {hasAcceptedBet && (
        <div className="rounded-lg border border-casino-accent/20 bg-casino-accent/5 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-casino-muted">Sua aposta:</span>
            <span className="font-mono font-semibold text-casino-accent">
              ${formatMoneyCents(BigInt(myAcceptedBet.amountCents))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
