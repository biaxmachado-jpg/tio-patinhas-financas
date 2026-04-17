import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@shared/const";
import { useState } from "react";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  categoryId: number;
  category?: {
    id: number;
    name: string;
    color: string;
  };
  type: 'vista' | 'parcelada' | 'credito';
  installments?: number;
}

interface InvoiceByCategoryChartProps {
  transactions: Transaction[];
  categories?: Array<{ id: number; name: string; color: string }>;
  title?: string;
}

export function InvoiceByCategoryChart({
  transactions,
  categories = [],
  title = "Composição por Categoria",
}: InvoiceByCategoryChartProps) {
  const [filterType, setFilterType] = useState<'vista' | 'parcelada' | 'all'>('all');

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'all') return parseFloat(t.amount) > 0;
    if (filterType === 'vista') return t.type === 'vista' && parseFloat(t.amount) > 0;
    if (filterType === 'parcelada') return t.type === 'parcelada' && parseFloat(t.amount) > 0;
    return false;
  });

  // Group by category
  const categoryMap: Record<number, { name: string; value: number; color: string }> = {};
  
  filteredTransactions.forEach((t) => {
    const catId = t.categoryId;
    const category = categories.find((c) => c.id === catId);
    const catName = category?.name || "Sem categoria";
    const catColor = category?.color || "#ef4444";
    
    if (!categoryMap[catId]) {
      categoryMap[catId] = { name: catName, value: 0, color: catColor };
    }
    categoryMap[catId].value += Math.abs(parseFloat(t.amount));
  });

  const data = Object.values(categoryMap)
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : "0";
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatBRL(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterType === 'vista' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('vista')}
              >
                À Vista
              </Button>
              <Button
                variant={filterType === 'parcelada' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('parcelada')}
              >
                Parceladas
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Nenhuma transação para exibir</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
          <div className="flex gap-2 mb-4">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todas
            </Button>
            <Button
              variant={filterType === 'vista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('vista')}
            >
              À Vista
            </Button>
            <Button
              variant={filterType === 'parcelada' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('parcelada')}
            >
              Parceladas
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with details */}
          <div className="space-y-3">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {total > 0 ? ((item.value / total) * 100).toFixed(1) : "0"}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-1">Total</p>
              <p className="text-lg font-bold text-foreground">
                {formatBRL(total)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
