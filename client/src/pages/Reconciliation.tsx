import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle } from "lucide-react";

export default function Reconciliation() {
  const { user } = useAuth();
  const { data: transactions, refetch } = trpc.transactions.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const { data: accounts } = trpc.bankAccounts.list.useQuery();
  const updateMutation = trpc.transactions.update.useMutation();

  if (!user) return null;

  const unreconciled = transactions?.filter((t) => !t.reconciled) || [];
  const reconciled = transactions?.filter((t) => t.reconciled) || [];

  const handleToggleReconciliation = async (id: number, reconciled: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id,
        reconciled: !reconciled,
        reconciledAt: !reconciled ? new Date() : undefined,
      });
      toast.success(
        reconciled ? "Transação marcada como não reconciliada" : "Transação reconciliada com sucesso!"
      );
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar reconciliação");
    }
  };

  const renderTransactionRow = (transaction: any, isReconciled: boolean) => {
    const category = categories?.find((c) => c.id === transaction.categoryId);
    const account = accounts?.find((a) => a.id === transaction.accountId);

    return (
      <tr key={transaction.id} className="border-b border-border hover:bg-muted/50 transition-colors">
        <td className="px-6 py-3 text-center">
          <button
            onClick={() => handleToggleReconciliation(transaction.id, isReconciled)}
            className="inline-flex items-center justify-center"
          >
            {isReconciled ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
            )}
          </button>
        </td>
        <td className="px-6 py-3 text-sm text-foreground">
          {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
        </td>
        <td className="px-6 py-3 text-sm text-foreground">{transaction.description}</td>
        <td className="px-6 py-3 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: category?.color }}
            />
            {category?.name}
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-muted-foreground">{account?.name}</td>
        <td className={`px-6 py-3 text-sm font-semibold text-right ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
          {transaction.type === "income" ? "+" : "-"} R${" "}
          {parseFloat(transaction.amount).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}
        </td>
        {isReconciled && (
          <td className="px-6 py-3 text-sm text-muted-foreground">
            {transaction.reconciledAt
              ? format(new Date(transaction.reconciledAt), "dd/MM/yyyy", { locale: ptBR })
              : "-"}
          </td>
        )}
      </tr>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reconciliação</h1>
          <p className="text-muted-foreground">Marque as transações como reconciliadas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="stat-card">
            <p className="stat-label">Não Reconciliadas</p>
            <p className="stat-value text-yellow-600">{unreconciled.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">Reconciliadas</p>
            <p className="stat-value text-green-600">{reconciled.length}</p>
          </div>
        </div>

        {/* Unreconciled Transactions */}
        {unreconciled.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Transações a Reconciliar ({unreconciled.length})
              </h2>
            </div>
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Conta
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {unreconciled.map((transaction) => renderTransactionRow(transaction, false))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reconciled Transactions */}
        {reconciled.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Transações Reconciliadas ({reconciled.length})
              </h2>
            </div>
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-6 py-3 text-center text-sm font-semibold text-foreground">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Descrição
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Conta
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                        Reconciliada em
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciled.map((transaction) => renderTransactionRow(transaction, true))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {transactions?.length === 0 && (
          <div className="text-center py-12 card-elevated">
            <p className="text-muted-foreground mb-4">Nenhuma transação registrada</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
