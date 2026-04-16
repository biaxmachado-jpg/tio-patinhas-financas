import { formatBRL } from "@/lib/currency";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  // Buscar TODAS as transações (sem filtro de data)
  const { data: transactions } = trpc.transactions.list.useQuery({});

  // Buscar TODAS as transacoes de cartao (sem filtro de data)
  const { data: creditCardTransactions } = trpc.creditCardTransactions.list.useQuery({});

  const currentMonthCCTransactions = (creditCardTransactions || [])
    .filter((t: any) => {
      const txDate = new Date(t.date);
      return txDate.getMonth() + 1 === selectedMonth && txDate.getFullYear() === selectedYear;
    });

  // Calcular receitas e despesas do mês selecionado (SEM TRANSF. ENTRE CONTAS)
  const currentMonthIncome = (transactions || [])
    .filter((t: any) => {
      const txDate = new Date(t.date);
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return (
        txDate.getMonth() + 1 === selectedMonth &&
        txDate.getFullYear() === selectedYear &&
        t.type === "income" &&
        !cat?.name?.includes("TRANSF. ENTRE CONTAS")
      );
    })
    .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

  const currentMonthExpenseBank = (transactions || [])
    .filter((t: any) => {
      const txDate = new Date(t.date);
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return (
        txDate.getMonth() + 1 === selectedMonth &&
        txDate.getFullYear() === selectedYear &&
        t.type === "expense" &&
        !cat?.name?.includes("TRANSF. ENTRE CONTAS")
      );
    })
    .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Estornos de cartão (negativos = receita) - SEM TRANSF. ENTRE CONTAS
  const currentMonthCCRefunds = currentMonthCCTransactions
    .filter((t: any) => {
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return parseFloat(t.amount) < 0 && cat?.name !== "TRANSF. ENTRE CONTAS";
    })
    .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Gastos de cartão (positivos = despesa) - SEM TRANSF. ENTRE CONTAS
  const currentMonthCCExpenses = currentMonthCCTransactions
    .filter((t: any) => {
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return parseFloat(t.amount) > 0 && cat?.name !== "TRANSF. ENTRE CONTAS";
    })
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

  const totalIncome = currentMonthIncome + currentMonthCCRefunds;
  const totalExpenses = currentMonthExpenseBank + currentMonthCCExpenses;

  // Calcular transferências entre contas - Receitas e Despesas
  const transferIncome = (transactions || [])
    .filter((t: any) => {
      const txDate = new Date(t.date);
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return (
        txDate.getMonth() + 1 === selectedMonth &&
        txDate.getFullYear() === selectedYear &&
        t.type === "income" &&
        cat?.name?.includes("TRANSF. ENTRE CONTAS")
      );
    })
    .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

  const transferExpense = (transactions || [])
    .filter((t: any) => {
      const txDate = new Date(t.date);
      const cat = categories?.find((c: any) => c.id === t.categoryId);
      return (
        txDate.getMonth() + 1 === selectedMonth &&
        txDate.getFullYear() === selectedYear &&
        t.type === "expense" &&
        cat?.name?.includes("TRANSF. ENTRE CONTAS")
      );
    })
    .reduce((sum: number, t: any) => sum + Math.abs(parseFloat(t.amount)), 0);

  const transferBetweenAccounts = transferIncome + transferExpense;

  // Breakdown de despesas por categoria
  const expensesByCategory = (() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    (transactions || [])
      .filter((t: any) => {
        const txDate = new Date(t.date);
        return (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          t.type === "expense"
        );
      })
      .forEach((t: any) => {
        const cat = categories?.find((c: any) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (name?.includes("TRANSF. ENTRE CONTAS")) return;
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += Math.abs(parseFloat(t.amount));
      });

    currentMonthCCTransactions
      .filter((t: any) => parseFloat(t.amount) > 0)
      .forEach((t: any) => {
        const cat = categories?.find((c: any) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (name?.includes("TRANSF. ENTRE CONTAS")) return;
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += parseFloat(t.amount);
      });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .filter((c: any) => c.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  })();

  // Breakdown de receitas por categoria
  const incomeByCategory = (() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    (transactions || [])
      .filter((t: any) => {
        const txDate = new Date(t.date);
        return (
          txDate.getMonth() + 1 === selectedMonth &&
          txDate.getFullYear() === selectedYear &&
          t.type === "income"
        );
      })
      .forEach((t: any) => {
        const cat = categories?.find((c: any) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#22c55e";
        if (name?.includes("TRANSF. ENTRE CONTAS")) return;
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += Math.abs(parseFloat(t.amount));
      });

    currentMonthCCTransactions
      .filter((t: any) => parseFloat(t.amount) < 0)
      .forEach((t: any) => {
        const cat = categories?.find((c: any) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#22c55e";
        if (name?.includes("TRANSF. ENTRE CONTAS")) return;
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += Math.abs(parseFloat(t.amount));
      });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .filter((c: any) => c.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  })();

  if (!user) return null;

  const totalBalance = (bankAccounts || [])
    .reduce((sum: any, acc) => sum + parseFloat(acc.balance || "0"), 0);
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-sm font-medium text-foreground">Mês:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          
          <label className="text-sm font-medium text-foreground">Ano:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
          >
            {[2024, 2025, 2026, 2027].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              setSelectedMonth(today.getMonth() + 1);
              setSelectedYear(today.getFullYear());
            }}
            className="ml-auto sm:ml-0"
          >
            Mês Atual
          </Button>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground">
            Bem-vindo, {user.name}!
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground italic">
            Dados referentes a: {monthNames[selectedMonth - 1]}/{selectedYear}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Saldo Total</p>
                <p className="stat-value text-lg md:text-2xl font-bold">
                  {formatBRL(totalBalance)}
                </p>
              </div>
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Receitas ({monthNames[selectedMonth - 1]}/{selectedYear})</p>
                <p className="stat-value text-lg md:text-2xl font-bold text-green-600">
                  {formatBRL(totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Despesas ({monthNames[selectedMonth - 1]}/{selectedYear})</p>
                <p className="stat-value text-lg md:text-2xl font-bold text-red-600">
                  {formatBRL(totalExpenses)}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* BLOCO DE DESPESAS */}
        {totalExpenses > 0 && (
          <div className="chart-card">
            <h2 className="text-lg md:text-xl font-semibold mb-6 text-foreground">Despesas por Categoria — {monthNames[selectedMonth - 1]}/{selectedYear}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tabela de Despesas */}
              <div className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Categoria</th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground">Valor</th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesByCategory.map((item) => (
                        <tr key={item.name} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-foreground">{item.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-3 font-semibold text-foreground">{formatBRL(item.value)}</td>
                          <td className="text-right py-3 px-3 text-muted-foreground">{((item.value / totalExpenses) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico de Pizza de Despesas */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* BLOCO DE RECEITAS */}
        {totalIncome > 0 && (
          <div className="chart-card">
            <h2 className="text-lg md:text-xl font-semibold mb-6 text-foreground">Receitas por Categoria — {monthNames[selectedMonth - 1]}/{selectedYear}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tabela de Receitas */}
              <div className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold text-foreground">Categoria</th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground">Valor</th>
                        <th className="text-right py-2 px-3 font-semibold text-foreground">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeByCategory.map((item) => (
                        <tr key={item.name} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                              <span className="text-foreground">{item.name}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-3 font-semibold text-foreground">{formatBRL(item.value)}</td>
                          <td className="text-right py-3 px-3 text-muted-foreground">{((item.value / totalIncome) * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráfico de Pizza de Receitas */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* CARD DE TRANSFERÊNCIAS */}
        {transferBetweenAccounts > 0 && (
          <div className="chart-card">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">Transferência entre Contas — {monthNames[selectedMonth - 1]}/{selectedYear}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-xs md:text-sm text-green-600 dark:text-green-400 mb-2">Transferências Recebidas</p>
                <p className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-300">
                  {formatBRL(transferIncome)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-700">
                <p className="text-xs md:text-sm text-red-600 dark:text-red-400 mb-2">Transferências Enviadas</p>
                <p className="text-2xl md:text-3xl font-bold text-red-700 dark:text-red-300">
                  {formatBRL(transferExpense)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
