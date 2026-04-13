import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Expenses() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const transactionsQuery = trpc.transactions.list.useQuery({});
  const creditCardTransactionsQuery = trpc.creditCardTransactions.list.useQuery({});
  const categoriesQuery = trpc.categories.list.useQuery();

  // Combinar e filtrar despesas
  const expenses = useMemo(() => {
    const allExpenses: any[] = [];

    // Despesas de contas bancárias (type = "expense", valores negativos)
    if (transactionsQuery.data) {
      transactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          tx.type === "expense" &&
          amount < 0 &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined
        ) {
          allExpenses.push({
            id: `bank-${tx.id}`,
            date: tx.date,
            description: tx.description,
            categoryId: tx.categoryId,
            amount: Math.abs(amount),
            source: "Conta Bancária",
          });
        }
      });
    }

    // Gastos de cartões de crédito (valores positivos = débito/gasto)
    if (creditCardTransactionsQuery.data) {
      creditCardTransactionsQuery.data.forEach((tx: any) => {
        const txDate = new Date(tx.date);
        const amount = typeof tx.amount === "string" ? parseFloat(tx.amount) : (tx.amount || 0);
        
        if (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          amount > 0 &&
          tx.categoryId &&
          tx.categoryId !== null &&
          tx.categoryId !== undefined
        ) {
          allExpenses.push({
            id: `card-${tx.id}`,
            date: tx.date,
            description: tx.description,
            categoryId: tx.categoryId,
            amount: amount,
            source: "Cartão de Crédito",
          });
        }
      });
    }

    return allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactionsQuery.data, creditCardTransactionsQuery.data, selectedMonth, selectedYear]);

  // Calcular totais por categoria com cores
  const expensesByCategory = useMemo(() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    expenses.forEach((exp) => {
      const category = categoriesQuery.data?.find((c: any) => c.id === exp.categoryId);
      if (category) {
        if (!grouped[category.name]) {
          grouped[category.name] = { value: 0, color: category.color || "#ef4444" };
        }
        grouped[category.name].value += exp.amount;
      }
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
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
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold">Despesas</h1>
        <p className="text-red-100 mt-1 md:mt-2 text-sm md:text-base">Visualize despesas de contas e gastos de cartões</p>
      </div>

      {/* Filtros */}
      <Card className="p-3 md:p-6">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-28 md:w-32 text-sm">
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
              <SelectTrigger className="w-20 md:w-24 text-sm">
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

          <div className="ml-auto text-lg md:text-2xl font-bold text-red-600">
            R$ {totalExpenses.toFixed(2).replace(".", ",")}
          </div>
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfico de Pizza */}
        <Card className="p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Despesas por Categoria</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: R$ ${(value as number).toFixed(2)}`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem despesas neste período
            </div>
          )}
        </Card>

        {/* Gráfico de Barras */}
        <Card className="p-3 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Top Categorias</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expensesByCategory.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
                <Bar dataKey="value" fill="#ef4444" radius={[8, 8, 0, 0]}>
                  {expensesByCategory.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem despesas neste período
            </div>
          )}
        </Card>
      </div>

      {/* Tabela de Despesas */}
      <Card className="p-3 md:p-6">
        <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Detalhes das Despesas</h2>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
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
                  const category = categoriesQuery.data?.find((c: any) => c.id === exp.categoryId);
                  return (
                    <tr key={exp.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{new Date(exp.date).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 px-2 truncate">{exp.description}</td>
                      <td className="py-2 px-2">
                        <span 
                          className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: category?.color || "#ef4444" }}
                        >
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma despesa registrada neste período
          </div>
        )}
      </Card>
    </div>
  );
}
