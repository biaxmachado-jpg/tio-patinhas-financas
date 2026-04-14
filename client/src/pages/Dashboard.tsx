import { formatBRL } from "@/lib/currency";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";
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
  
  // Inicializar com o primeiro dia do mês atual até hoje
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(now);

  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  // Buscar transações do período selecionado
  const { data: transactions } = trpc.transactions.list.useQuery({
    startDate: startDate,
    endDate: endDate,
  });

  // Buscar transacoes de cartao do período selecionado
  const { data: creditCardTransactions } = trpc.creditCardTransactions.list.useQuery({
    startDate: startDate,
    endDate: endDate,
  });
  const { data: creditCards } = trpc.creditCards.list.useQuery();

  // Usar transacoes de cartao ja filtradas
  const currentMonthCCTransactions = creditCardTransactions || [];

  // Calcular receitas e despesas do período selecionado
  const currentMonthIncome = (transactions || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const currentMonthExpenseBank = (transactions || [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Estornos de cartão (negativos = receita)
  const currentMonthCCRefunds = currentMonthCCTransactions
    .filter((t) => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  // Gastos de cartão (positivos = despesa)
  const currentMonthCCExpenses = currentMonthCCTransactions
    .filter((t) => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalIncome = currentMonthIncome + currentMonthCCRefunds;
  const totalExpenses = currentMonthExpenseBank + currentMonthCCExpenses;

  // Dados para o gráfico de barras Receitas vs Despesas
  const chartData = [
    { name: "Receitas", value: totalIncome, color: "#22c55e" },
    { name: "Despesas", value: totalExpenses, color: "#ef4444" },
  ];

  // Breakdown de despesas por categoria (período selecionado)
  const categoryBreakdown = (() => {
    const grouped: Record<string, { value: number; color: string }> = {};

    // Despesas de conta bancária
    (transactions || [])
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = categories?.find((c) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += Math.abs(parseFloat(t.amount));
      });

    // Gastos de cartão de crédito
    currentMonthCCTransactions
      .filter((t) => parseFloat(t.amount) > 0)
      .forEach((t) => {
        const cat = categories?.find((c) => c.id === t.categoryId);
        const name = cat?.name || "Sem categoria";
        const color = cat?.color || "#ef4444";
        if (!grouped[name]) grouped[name] = { value: 0, color };
        grouped[name].value += parseFloat(t.amount);
      });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  })();

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-semibold mb-1">{label || payload[0]?.name}</p>
          <p className="font-bold" style={{ color: payload[0]?.payload?.color || "#333" }}>
            {formatBRL(payload[0]?.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!user) return null;

  // Calcular saldo total das contas
  const totalBalance = (bankAccounts || [])
    .reduce((sum, acc) => sum + parseFloat(acc.balance || "0"), 0);
  
  const dateRangeLabel = `${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`;

  return (
    <DashboardLayout>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-sm font-medium text-foreground">Data Início:</label>
          <input
            type="date"
            value={format(startDate, "yyyy-MM-dd")}
            onChange={(e) => setStartDate(new Date(e.target.value))}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
          />
          
          <label className="text-sm font-medium text-foreground">Data Fim:</label>
          <input
            type="date"
            value={format(endDate, "yyyy-MM-dd")}
            onChange={(e) => setEndDate(new Date(e.target.value))}
            className="px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              setStartDate(new Date(today.getFullYear(), today.getMonth(), 1));
              setEndDate(today);
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
            Dados referentes ao período: {dateRangeLabel}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {/* Saldo Total */}
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

          {/* Receitas */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Receitas ({format(startDate, "MMM/yy", { locale: ptBR })})</p>
                <p className="stat-value text-lg md:text-2xl font-bold text-green-600">
                  {formatBRL(totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>

          {/* Despesas */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="stat-label text-xs md:text-sm">Despesas ({format(startDate, "MMM/yy", { locale: ptBR })})</p>
                <p className="stat-value text-lg md:text-2xl font-bold text-red-600">
                  {formatBRL(totalExpenses)}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-600/50 flex-shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Bar Chart - Receitas vs Despesas */}
          <div className="chart-card">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">
              Receitas vs Despesas — {dateRangeLabel}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Despesas por Categoria */}
          {categoryBreakdown.length > 0 && (
            <div className="chart-card">
              <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">
                Despesas por Categoria — {dateRangeLabel}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatBRL(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bank Accounts */}
        {bankAccounts && bankAccounts.length > 0 && (
          <div className="chart-card">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-foreground">Contas Bancárias</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="p-4 border border-border rounded-lg bg-card">
                  <p className="text-sm text-muted-foreground mb-1">{account.name}</p>
                  <p className="text-lg font-bold text-foreground">{formatBRL(account.balance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{account.bank}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
