import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
    url: `${import.meta.env.VITE_API_URL || ""}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }).then((res) => {
          // Diagnóstico: clonamos a resposta (sem consumir o body original,
          // que o tRPC ainda vai ler) e checamos se ela é JSON válido. Se
          // não for, isso loga o corpo bruto no console — é a única forma
          // de descobrir o que realmente veio do servidor quando o erro é
          // um "Unexpected ... after JSON" genérico do navegador, que hoje
          // não dá pista nenhuma de causa.
          res
            .clone()
            .text()
            .then((text) => {
              try {
                JSON.parse(text);
              } catch (parseError) {
                console.error(
                  "[API] Resposta HTTP não é JSON válido — status:",
                  res.status,
                  "content-type:",
                  res.headers.get("content-type"),
                  "erro:",
                  parseError,
                  "corpo (até 2000 chars):",
                  text.slice(0, 2000)
                );
              }
            })
            .catch(() => {
              // corpo não pôde ser lido como texto (ex.: já consumido); ignora
            });
          return res;
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
