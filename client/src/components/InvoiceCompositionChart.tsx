import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@shared/const";

interface InvoiceCompositionChartProps {
  vistaAmount: number;
  parceladaAmount: number;
  creditoAmount?: number;
  title?: string;
}

export function InvoiceCompositionChart({
  vistaAmount,
  parceladaAmount,
  creditoAmount = 0,
  title = "Composição da Fatura",
}: InvoiceCompositionChartProps) {
  // Prepare data for the pie chart
  const data = [
    {
      name: "À Vista",
      value: Math.max(0, vistaAmount),
      color: "#10b981", // Green
    },
    {
      name: "Parceladas",
      value: Math.max(0, parceladaAmount),
      color: "#3b82f6", // Blue
    },
    ...(creditoAmount > 0
      ? [
          {
            name: "Créditos",
            value: creditoAmount,
            color: "#f59e0b", // Amber
          },
        ]
      : []),
  ].filter((item) => item.value > 0);

  const total = vistaAmount + parceladaAmount + creditoAmount;

  // Custom tooltip to show values and percentages
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatBRL(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Nenhuma transação para exibir</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>

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
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(item.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {((item.value / total) * 100).toFixed(1)}%
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
    </Card>
  );
}
