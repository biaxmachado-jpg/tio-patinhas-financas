import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6"];

export default function Income() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const transactionsQuery = trpc.transactions.list.useQuery({});
  const creditCardTransactionsQuery = trpc.creditCardTransactions.list.useQuery({});
  const categoriesQuery = trpc.categories.list.useQuery();

  // Combinar e filtrar receitas
  const income = useMemo(() => {
    const allIncome: any[] = [];

    // Receitas de contas bancárias
    if (transactionsQuery.data) {
      transactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        // Filtrar apenas transações classificadas (com categoryId válido) do tipo income
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          tx.type === "income" &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined &&
          amount > 0
        ) {
          allIncome.push({
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

    // Receitas de cartões de crédito (transações positivas)
    if (creditCardTransactionsQuery.data) {
      creditCardTransactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        // Filtrar apenas transações classificadas (com categoryId válido) e positivas
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          amount > 0 &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined
        ) {
          allIncome.push({
            id: `card-${tx.id}`,
            date: tx.date,
            description: tx.description,
            category: tx.categoryId,
            amount: amount,
            source: "Cartão de Crédito",
          });
        }
      });
    }

    return allIncome.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsQuery.data, creditCardTransactionsQuery.data, selectedMonth, selectedYear]);

  // Calcular totais por categoria
  const incomeByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};

    income.forEach((inc) => {
      const category = categoriesQuery.data?.find((c: any) => c.id === inc.category);
      // Apenas incluir no gráfico se a categoria existir
      if (category) {
        grouped[category.name] = (grouped[category.name] || 0) + inc.amount;
      }
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [income, categoriesQuery.data]);

  const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);

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
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">Receitas</h1>
        <p className="text-green-100 mt-2">Visualize todas as receitas de contas bancárias e cartões de crédito</p>
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

          <div className="ml-auto text-2xl font-bold text-green-600">
            R$ {totalIncome.toFixed(2).replace(".", ",")}
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Pizza */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Receitas por Categoria</h2>
          {incomeByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: R$ ${(value as number).toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem receitas neste período
            </div>
          )}
        </Card>

        {/* Gráfico de Barras */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Top 10 Categorias</h2>
          {incomeByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeByCategory.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
                <Bar dataKey="value" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem receitas neste período
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Receitas */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Detalhes das Receitas</h2>
        {income.length > 0 ? (
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
                {income.map((inc) => {
                  const category = categoriesQuery.data?.find((c: any) => c.id === inc.category);
                  return (
                    <tr key={inc.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{new Date(inc.date).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 px-2">{inc.description}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-muted">
                          {category?.name || "Sem categoria"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{inc.source}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-600">
                        +R$ {inc.amount.toFixed(2).replace(".", ",")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma receita registrada neste período
          </div>
        )}
      </Card>
    </div>
  );
}
