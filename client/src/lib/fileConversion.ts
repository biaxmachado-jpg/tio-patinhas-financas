/**
 * Utilitários de conversão de arquivo compartilhados entre as telas de
 * importação (Importar.tsx — upload sem pré-seleção de cartão/conta — e
 * ImportFile.tsx — fluxo legado por cartão/conta específico).
 */
import * as XLSX from "xlsx";

export function fileToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

// Converte um workbook XLSX em texto (CSV), priorizando a aba "Lançamentos"
// quando existir — a IA lê o texto, não precisamos mais adivinhar colunas aqui.
export function xlsxToText(workbook: XLSX.WorkBook): string {
  const lancamentosSheet = workbook.SheetNames.find(
    (n) => n.toLowerCase().includes("lançamentos") || n.toLowerCase().includes("lancamentos")
  );
  const sheetName = lancamentosSheet || workbook.SheetNames[0];
  return workbook.SheetNames.map((name) => `--- Aba: ${name} ---\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`)
    .sort((a) => (sheetName && a.includes(`--- Aba: ${sheetName} ---`) ? -1 : 1)) // aba relevante primeiro
    .join("\n\n");
}

export const ACCEPTED_IMPORT_EXTENSIONS = [".pdf", ".ofx", ".txt", ".xlsx", ".xls", ".csv"];

/**
 * Lê um arquivo e devolve o payload pronto pra mandar pro endpoint de
 * classificação por IA (pdfBase64 para PDF, textContent para o resto).
 */
export async function readFileForClassification(
  file: File
): Promise<{ pdfBase64?: string; textContent?: string }> {
  const fileExtension = file.name.split(".").pop()?.toLowerCase();

  if (fileExtension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    return { pdfBase64: fileToBase64(arrayBuffer) };
  }
  if (fileExtension === "xlsx" || fileExtension === "xls") {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    return { textContent: xlsxToText(workbook) };
  }
  if (fileExtension === "csv" || fileExtension === "txt" || fileExtension === "ofx") {
    return { textContent: await file.text() };
  }
  throw new Error("Formato de arquivo não suportado para processamento automático");
}
