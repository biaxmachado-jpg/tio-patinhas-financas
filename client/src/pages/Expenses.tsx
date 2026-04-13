import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2"];

export default function Expenses() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const transactionsQuery = trpc.transactions.list.useQuery({});
  const creditCardTransactionsQuery = trpc.creditCardTransactions.list.useQuery({});
  const categoriesQuery = trpc.categories.list.useQuery();

  // Combinar e filtrar despesas
  const expenses = useMemo(() => {
    const allExpenses: any[] = [];

    // Despesas de contas bancárias
    if (transactionsQuery.data) {
      transactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        // Filtrar apenas transações classificadas (com categoryId válido) do tipo expense
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          tx.type === "expense" &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined &&
          amount > 0
        ) {
          allExpenses.push({
            id: `bank-${tx.id}`,
            date: tx.date,
            description: tx.description,
            category: tx.categoryId,
            amount: amount,
            source: "Conta Bancária",
          });
        }
      });
    }

    // Despesas de cartões de crédito (transações negativas)
    if (creditCardTransactionsQuery.data) {
      creditCardTransactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        // Filtrar apenas transações classificadas (com categoryId válido) e negativas
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          amount < 0 &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined
        ) {
          allExpenses.push({
            id: `card-${tx.id}`,
            date: tx.date,
            description: tx.description,
            category: tx.categoryId,
            amount: Math.abs(amount),
            source: "Cartão de Crédito",
          });
        }
      });
    }

    return allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsQuery.data, creditCardTransactionsQuery.data, selectedMonth, selectedYear]);

  // Calcular totais por categoria
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};

    expenses.forEach((exp) => {
      const category = categoriesQuery.data?.find((c: any) => c.id === exp.category);
      // Apenas incluir no gráfico se a categoria existir
      if (category) {
        grouped[category.name] = (grouped[category.name] || 0) + exp.amount;
      }
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, categoriesQuery.data]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">Despesas</h1>
        <p className="text-red-100 mt-2">Visualize todas as despesas de contas bancárias e cartões de crédito</p>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="ml-auto text-2xl font-bold text-red-600">
            R$ {totalExpenses.toFixed(2).replace(".", ",")}
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Despesas por Categoria</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: R$ ${(value as number).toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem despesas neste período
            </div>
          )}
        </Card>

        {/* Gráfico de Barras */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top 10 Categorias</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesByCategory.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem despesas neste período
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Despesas */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Detalhes das Despesas</h2>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Data</th>
                  <th className="text-left py-2 px-2">Descrição</th>
                  <th className="text-left py-2 px-2">Categoria</th>
                  <th className="text-left py-2 px-2">Origem</th>
                  <th className="text-right py-2 px-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const category = categoriesQuery.data?.find((c: any) => c.id === exp.category);
                  return (
                    <tr key={exp.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{new Date(exp.date).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 px-2">{exp.description}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-muted">
                          {category?.name || "Sem categoria"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{exp.source}</td>
                      <td className="py-2 px-2 text-right font-semibold text-red-600">
                        -R$ {exp.amount.toFixed(2).replace(".", ",")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma despesa registrada neste período
          </div>
        )}
      </Card>
    </div>
  );
}
