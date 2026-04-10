import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const { data: transactions } = trpc.transactions.list.useQuery();
  const { data: bankAccounts } = trpc.bankAccounts.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();

  // Prepare chart data
  const chartData = [
    {
      name: "Receitas",
      value: parseFloat(stats?.totalIncome || "0"),
    },
    {
      name: "Despesas",
      value: parseFloat(stats?.totalExpense || "0"),
    },
  ];

  // Category breakdown
  const categoryBreakdown = categories?.map((cat) => {
    const total = transactions
      ?.filter((t) => t.categoryId === cat.id && t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    return {
      name: cat.name,
      value: total,
      color: cat.color,
    };
  }) || [];

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Bem-vindo, {user.name}!</h1>
          <p className="text-muted-foreground">
            {format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Balance */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Saldo Total</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-2" />
                ) : (
                  <p className="stat-value">
                    R$ {parseFloat(stats?.totalBalance || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <Wallet className="w-8 h-8 text-primary/50" />
            </div>
          </div>

          {/* Total Income */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Receitas</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-2" />
                ) : (
                  <p className="stat-value text-green-600">
                    R$ {parseFloat(stats?.totalIncome || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-600/50" />
            </div>
          </div>

          {/* Total Expenses */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Despesas</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32 mt-2" />
                ) : (
                  <p className="stat-value text-red-600">
                    R$ {parseFloat(stats?.totalExpense || "0").toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
              <TrendingDown className="w-8 h-8 text-red-600/50" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Chart */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Receitas vs Despesas</h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Despesas por Categoria</h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: R$ ${value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhuma despesa registrada
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-sm hover:shadow-md transition-colors p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Transações Recentes</h3>
          {!transactions || transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma transação registrada</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((transaction) => {
                const category = categories?.find((c) => c.id === transaction.categoryId);
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: category?.color }}
                      >
                        {category?.icon}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{category?.name}</p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? "+" : "-"} R${" "}
                      {parseFloat(transaction.amount).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
