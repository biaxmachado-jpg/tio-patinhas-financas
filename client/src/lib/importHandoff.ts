/**
 * Handoff em memória entre a tela de importação inteligente (Importar.tsx —
 * sobe o arquivo sem escolher cartão/conta antes) e a tela de revisão por
 * entidade (ImportFile.tsx). Evita reclassificar o arquivo (uma segunda
 * chamada à IA, mais lenta e cara) só porque a pessoa confirmou qual
 * cartão/conta é depois de ver o resultado.
 *
 * É um singleton de módulo de propósito: só precisa sobreviver a uma
 * navegação client-side dentro da mesma aba, nunca entre abas ou reloads —
 * sessionStorage/localStorage seriam overkill (e exigiriam serializar de
 * volta os tipos que o wouter não passa via state).
 */
import type { AIClassifiedTransaction, DocumentMeta } from "../../../server/aiClassifier";

export interface PendingImport {
  fileName: string;
  document: DocumentMeta;
  transactions: (AIClassifiedTransaction & { categorySource: "rule" | "ai" })[];
}

let pending: PendingImport | null = null;

export function setPendingImport(data: PendingImport) {
  pending = data;
}

/** Consome o handoff pendente (se houver) — uso único, limpa depois de ler. */
export function takePendingImport(): PendingImport | null {
  const data = pending;
  pending = null;
  return data;
}
