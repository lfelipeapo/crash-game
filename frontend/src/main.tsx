import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { App } from "./App";
import { initKeycloak } from "./auth/keycloak";
import { useAuthStore } from "./stores/auth.store";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

async function bootstrap() {
  const user = await initKeycloak();
  if (user) {
    useAuthStore.getState().setUser(user);
  } else {
    useAuthStore.getState().setIsLoading(false);
  }

  const root = createRoot(document.getElementById("root")!);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#13131f",
                color: "#e0e0e0",
                border: "1px solid #2a2a3e",
              },
            }}
          />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  );
}

bootstrap();
