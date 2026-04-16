import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Calendar } from "lucide-react";

interface DueDateConfirmDialogProps {
  extractedDate: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  bankName?: string;
}

export function DueDateConfirmDialog({
  extractedDate,
  onConfirm,
  onCancel,
  bankName = "Banco",
}: DueDateConfirmDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    extractedDate
      ? extractedDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const handleConfirm = () => {
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) {
      alert("Por favor, insira uma data válida");
      return;
    }
    onConfirm(date);
  };

  const formatDateForDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Confirmar Data de Vencimento</h2>
          </div>
          <p className="text-sm text-gray-600">
            Verifique ou corrija a data de vencimento da fatura de {bankName}
          </p>
        </div>

        {extractedDate ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Data extraída do arquivo:
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatDateForDisplay(
                    extractedDate.toISOString().split("T")[0]
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Nenhuma data foi extraída automaticamente
                </p>
                <p className="text-sm text-yellow-700">
                  Por favor, insira a data de vencimento manualmente
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Data de Vencimento
          </label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 self-center whitespace-nowrap">
              {formatDateForDisplay(selectedDate)}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-gray-600 uppercase">
            Informação
          </p>
          <p className="text-xs text-gray-600">
            Todas as transações deste arquivo serão associadas à data de vencimento
            confirmada. Você poderá editar transações individuais depois se necessário.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Confirmar
          </Button>
        </div>
      </Card>
    </div>
  );
}
