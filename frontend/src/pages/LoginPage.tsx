import { LogIn, Gamepad2 } from "lucide-react";
import { login } from "@/auth/keycloak";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-casino-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-casino-border bg-casino-card p-8 shadow-2xl shadow-black/50">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-casino-accent/10 shadow-lg shadow-casino-accentGlow">
            <Gamepad2 className="h-8 w-8 text-casino-accent" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-casino-text">
              Crash Game
            </h1>
            <p className="mt-1 text-sm text-casino-muted">
              Jungle Gaming
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-casino-accent py-3.5 font-semibold text-casino-bg shadow-lg shadow-casino-accentGlow transition-all hover:bg-casino-accentDark hover:shadow-xl hover:shadow-casino-accentGlow active:scale-[0.98]"
          >
            <LogIn className="h-5 w-5" />
            Entrar com Keycloak
          </button>

          {/* Test credentials hint */}
          <div className="w-full rounded-lg border border-casino-border bg-casino-bg p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-casino-muted mb-2">
              Credenciais de Teste
            </p>
            <div className="flex justify-between font-mono text-sm">
              <span className="text-casino-text">Usuário:</span>
              <span className="text-casino-accent font-semibold">player</span>
            </div>
            <div className="flex justify-between font-mono text-sm mt-1">
              <span className="text-casino-text">Senha:</span>
              <span className="text-casino-accent font-semibold">player123</span>
            </div>
          </div>

          <p className="text-xs text-casino-muted">
            Ao entrar, você concorda com os termos de serviço.
          </p>
        </div>
      </div>
    </div>
  );
}
