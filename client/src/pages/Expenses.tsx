import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatBRL } from "@/lib/currency";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

// Componente de label customizado para o gráfico de pizza
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.04) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Expenses() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const transactionsQuery = trpc.transactions.list.useQuery({});
  const categoriesQuery = trpc.categories.list.useQuery();
  const bankAccountsQuery = trpc.bankAccounts.list.useQuery();
  const creditCardsQuery = trpc.creditCards.list.useQuery();
  const updateTransactionMutation = trpc.transactions.update.useMutation();

  // Combinar e filtrar despesas:
  // - transactions com type = "expense" (valores negativos)
  // - creditCardTransactions com valores POSITIVOS (gastos)
  const expenses = useMemo(() => {
    const allExpenses: any[] = [];

    // Despesas de contas bancárias: type = "expense"
    if (transactionsQuery.data) {
      transactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);

        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          tx.type === "expense" &&
          (!filterCategoryId || tx.categoryId === filterCategoryId)
        ) {
          allExpenses.push({
            id: `bank-${tx.id}`,
            date: tx.date,
            description: tx.description,
            categoryId: tx.categoryId,
            amount: Math.abs(amount),
            source: "Conta Bancária",
            accountId: tx.accountId,
          });
        }
      });
    }

    return allExpenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsQuery.data, selectedMonth, selectedYear, filterCategoryId]);

  // Calcular totais por categoria com cores (respeitando filtro)
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { value: number; color: string; id: number }> = {};

    expenses.forEach((exp) => {
      const category = categoriesQuery.data?.find((c: any) => c.id === exp.categoryId);
      const catName = category?.name || "Sem categoria";
      const catColor = category?.color || "#ef4444";
      const catId = category?.id || 0;

      if (!grouped[catName]) {
        grouped[catName] = { value: 0, color: catColor, id: catId };
      }
      grouped[catName].value += exp.amount;
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color, id: data.id }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [expenses, categoriesQuery.data]);

  const totalExpenses = expenses.reduce((sum: any, exp) => sum + (exp.amount || 0), 0);
  const filterCategoryName = filterCategoryId
    ? categoriesQuery.data?.find((c: any) => c.id === filterCategoryId)?.name
    : null;

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleEditExpense = (exp: any) => {
    setEditingExpense(exp);
    setSelectedCategoryId(exp.categoryId || null);
  };

  const handleSaveCategory = async () => {
    if (!editingExpense || !selectedCategoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    try {
      const txId = parseInt(editingExpense.id.replace("bank-", ""), 10);
      await updateTransactionMutation.mutateAsync({
        id: txId,
        categoryId: selectedCategoryId || 1,
      });
      
      toast.success("Categoria atualizada com sucesso!");
      setEditingExpense(null);
      setSelectedCategoryId(null);
      transactionsQuery.refetch();
    } catch (error) {
      toast.error("Erro ao atualizar categoria");
      console.error(error);
    }
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
          <p className="text-red-600 font-bold">{formatBRL(payload[0]?.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingDown className="w-6 h-6 md:w-8 md:h-8" />
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Despesas</h1>
            <p className="text-red-100 mt-0.5 text-xs md:text-sm">
              Transações expense + gastos de cartão
            </p>
          </div>
        </div>
      </div>

      {/* Filtros + Total */}
      <Card className="p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Select value={selectedMonth.toString()} onValueChange={(v: any) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-28 md:w-32 h-8 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={(idx + 1).toString()} className="text-xs md:text-sm">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v: any) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-20 md:w-24 h-8 text-xs md:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-xs md:text-sm">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 md:gap-3">
            <Select value={filterCategoryId?.toString() || "all"} onValueChange={(v: any) => setFilterCategoryId(v === "all" ? null : parseInt(v, 10))}>
              <SelectTrigger className="w-32 md:w-40 h-8 text-xs md:text-sm">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoriesQuery.data?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterCategoryId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterCategoryId(null)}
                className="h-8 px-2 text-xs"
              >
                Limpar
              </Button>
            )}
          </div>

          <div className="ml-auto">
            <p className="text-xs text-muted-foreground">
              {filterCategoryName ? `Total - ${filterCategoryName}` : "Total do período"}
            </p>
            <p className="text-lg md:text-2xl font-bold text-red-600">{formatBRL(totalExpenses)}</p>
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico de Pizza */}
        <Card className="p-3 md:p-6">
          <h2 className="text-sm md:text-base font-semibold mb-3">Despesas por Categoria</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={90}
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value, entry: any) => (
                    <span style={{ color: entry.color, fontSize: 11 }}>
                      {value}: {formatBRL(entry.payload.value)}
                    </span>
                  )}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Sem despesas neste período
            </div>
          )}
        </Card>

        {/* Gráfico de Barras Horizontal */}
        <Card className="p-3 md:p-6">
          <h2 className="text-sm md:text-base font-semibold mb-3">Top Categorias</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={expensesByCategory.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: any) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {expensesByCategory.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: number) => formatBRL(v)}
                    style={{ fontSize: 10, fill: "#555" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Sem despesas neste período
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Despesas */}
      <Card className="p-3 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm md:text-base font-semibold">Detalhes das Despesas</h2>
          <span className="text-xs text-muted-foreground">{expenses.length} registros</span>
        </div>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full text-xs md:text-sm min-w-[500px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Origem</th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-muted-foreground">Conta/Cartão</th>
                  <th className="text-right py-2 px-2 md:px-3 font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const category = categoriesQuery.data?.find((c: any) => c.id === exp.categoryId);
                  let accountName = "";
                  if (exp.source === "Conta Bancária") {
                    const account = bankAccountsQuery.data?.find((a: any) => a.id === exp.accountId);
                    accountName = account ? `${account.name} (${account.bank})` : "Conta desconhecida";
                  } else if (exp.source === "Cartão de Crédito") {
                    const card = creditCardsQuery.data?.find((c: any) => c.id === exp.cardId);
                    accountName = card?.name || "Cartão desconhecido";
                  }
                  return (
                    <tr key={exp.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 md:px-3 whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-2 md:px-3 max-w-[120px] md:max-w-[200px] truncate">
                        {exp.description}
                      </td>
                      <td className="py-2 px-2 md:px-3">
                        {/* REGRA: Abas de Despesas e Receitas são apenas visualização. Edição é feita em Contas Bancárias e Cartões de Crédito */}
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap"
                          style={{ backgroundColor: category?.color || "#ef4444" }}
                        >
                          {category?.name || "Sem categoria"}
                        </div>
                      </td>
                      <td className="py-2 px-2 md:px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {exp.source}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-xs text-muted-foreground max-w-[100px] truncate">
                        {accountName}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-right font-semibold text-red-600 whitespace-nowrap">
                        -{formatBRL(exp.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-red-50 dark:bg-red-950/20">
                  <td colSpan={5} className="py-2 px-2 md:px-3 font-semibold text-xs md:text-sm">
                    Total
                  </td>
                  <td className="py-2 px-2 md:px-3 text-right font-bold text-red-600 text-xs md:text-sm">
                    -{formatBRL(totalExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma despesa registrada neste período
          </div>
        )}
      </Card>

      {/* Dialog de Edição de Categoria */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Transação</p>
              <p className="text-sm text-muted-foreground">{editingExpense?.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select value={selectedCategoryId?.toString() || ""} onValueChange={(v: any) => setSelectedCategoryId(parseInt(v, 10))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesQuery.data?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExpense(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={updateTransactionMutation.isPending}>
              {updateTransactionMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
