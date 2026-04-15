import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ImportCreditCardInvoice() {
  const { cardId } = useParams();
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const cardQuery = trpc.creditCards.get.useQuery({ id: parseInt(cardId || "0") });
  const importMutation = trpc.creditCardTransactions.importFromPDF.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Por favor, selecione um arquivo PDF");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("O arquivo não pode ser maior que 10MB");
        return;
      }
      setFile(selectedFile);
      setUploadSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const base64 = Buffer.from(arrayBuffer).toString("base64");

          await importMutation.mutateAsync({
            cardId: parseInt(cardId || "0"),
            pdfBase64: base64,
            fileName: file.name,
          });

          toast.success("Fatura importada com sucesso!");
          setUploadSuccess(true);
          setFile(null);
          
          setTimeout(() => {
            navigate(`/cartoes/${cardId}`);
          }, 2000);
        } catch (error: any) {
          toast.error(error.message || "Erro ao processar o PDF");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error("Erro ao ler o arquivo");
      setIsLoading(false);
    }
  };

  if (cardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const card = cardQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/cartoes/${cardId}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Importar Fatura
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {card?.name}
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        {uploadSuccess ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Fatura importada com sucesso!
              </h2>
              <p className="text-muted-foreground">
                As transações foram adicionadas ao seu cartão.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecionando para os detalhes do cartão...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Selecione o arquivo PDF da fatura
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Faça upload do PDF da fatura do seu cartão de crédito. O sistema irá extrair as transações automaticamente.
                </p>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isLoading}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-semibold text-foreground mb-1">
                    {file ? file.name : "Clique para selecionar ou arraste um arquivo"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Apenas arquivos PDF são aceitos (máx. 10MB)
                  </p>
                </label>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    disabled={isLoading}
                  >
                    Remover
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Dica:</p>
                <p>
                  O sistema irá extrair automaticamente as transações do PDF. Certifique-se de que o arquivo contém as informações de transações em um formato legível.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/cartoes/${cardId}`)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!file || isLoading}
              >
                {isLoading ? "Processando..." : "Importar Fatura"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
