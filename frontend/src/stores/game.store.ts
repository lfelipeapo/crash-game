import { create } from "zustand";
import type {
  RoundWithBetsResponseDto,
  RoundResponseDto,
  BetResponseDto,
} from "@crash/contracts";

interface GameState {
  round: RoundWithBetsResponseDto | null;
  history: RoundResponseDto[];
  myBets: BetResponseDto[];
  balanceCents: bigint;
  betAmount: string;
  autoCashout: string;
  isBetting: boolean;
  isCashingOut: boolean;
  isCrashed: boolean;
  error: string | null;

  setRound: (round: RoundWithBetsResponseDto | null) => void;
  setHistory: (history: RoundResponseDto[]) => void;
  setMyBets: (myBets: BetResponseDto[]) => void;
  setBalance: (balanceCents: bigint) => void;
  setBetAmount: (amount: string) => void;
  setAutoCashout: (value: string) => void;
  setIsBetting: (isBetting: boolean) => void;
  setIsCashingOut: (isCashingOut: boolean) => void;
  setIsCrashed: (isCrashed: boolean) => void;
  setError: (error: string | null) => void;
  addBet: (bet: BetResponseDto) => void;
  updateBet: (bet: BetResponseDto) => void;
  addHistoryRound: (round: RoundResponseDto) => void;
  clearError: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  round: null,
  history: [],
  myBets: [],
  balanceCents: 0n,
  betAmount: "10.00",
  autoCashout: "",
  isBetting: false,
  isCashingOut: false,
  isCrashed: false,
  error: null,

  setRound: (round) => set({ round }),

  setHistory: (history) => set({ history }),

  setMyBets: (myBets) => set({ myBets }),

  setBalance: (balanceCents) => set({ balanceCents }),

  setBetAmount: (amount) => set({ betAmount: amount }),

  setAutoCashout: (value) => set({ autoCashout: value }),

  setIsBetting: (isBetting) => set({ isBetting }),

  setIsCashingOut: (isCashingOut) => set({ isCashingOut }),

  setIsCrashed: (isCrashed) => set({ isCrashed }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  addBet: (bet) => {
    const { round } = get();
    if (!round) return;
    const exists = round.bets.some((b) => b.id === bet.id);
    if (exists) return;
    set({
      round: {
        ...round,
        bets: [...round.bets, bet],
      },
    });
  },

  updateBet: (bet) => {
    const { round } = get();
    if (!round) return;
    set({
      round: {
        ...round,
        bets: round.bets.map((b) => (b.id === bet.id ? bet : b)),
      },
    });
  },

  addHistoryRound: (round) => {
    const { history } = get();
    const newHistory = [round, ...history].slice(0, 20);
    set({ history: newHistory });
  },
}));
