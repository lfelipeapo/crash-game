import type { ReactNode } from "react";
import { LogOut, Wallet, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useGameStore } from "@/stores/game.store";
import { logout } from "@/auth/keycloak";
import { formatMoneyCents } from "@crash/contracts";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const { balanceCents } = useGameStore();

  const handleLogout = async () => {
    useAuthStore.getState().logout();
    await logout();
  };

  return (
    <div className="min-h-screen bg-casino-bg text-casino-text">
      {/* Header */}
      <header className="border-b border-casino-border bg-casino-card px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-casino-accent/10">
              <span className="text-lg font-bold text-casino-accent">JG</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-casino-accent">Crash</span>
              <span className="text-casino-muted ml-1 text-sm font-normal">Game</span>
            </h1>
          </div>

          {isAuthenticated && user && (
            <div className="flex items-center gap-4">
              {/* Balance */}
              <div className="flex items-center gap-2 rounded-lg bg-casino-bg px-3 py-1.5 border border-casino-border">
                <Wallet className="h-4 w-4 text-casino-accent" />
                <span className="font-mono text-sm font-semibold text-casino-accent">
                  ${formatMoneyCents(balanceCents)}
                </span>
              </div>

              {/* User */}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-casino-accent/10">
                  <User className="h-4 w-4 text-casino-accent" />
                </div>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.username}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-casino-muted transition-colors hover:bg-casino-danger/10 hover:text-casino-danger"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-4">{children}</main>
    </div>
  );
}
