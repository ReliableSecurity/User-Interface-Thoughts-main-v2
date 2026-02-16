import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceWithHost, VulnerabilityWithContext } from "@shared/schema";

interface ChartsProps {
  services: ServiceWithHost[];
  vulnerabilities: VulnerabilityWithContext[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  info: "Инфо",
};

const SERVICE_COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export function Charts({ services, vulnerabilities }: ChartsProps) {
  const vulnBySeverity = useMemo(() => {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    vulnerabilities.forEach((v) => {
      if (v.severity && counts[v.severity] !== undefined) {
        counts[v.severity]++;
      }
    });
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name: SEVERITY_LABELS[name] || name,
        value,
        fill: SEVERITY_COLORS[name] || "#6b7280",
      }));
  }, [vulnerabilities]);

  const servicesByType = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      const name = s.serviceName || "Неизвестно";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], index) => ({
        name,
        value,
        fill: SERVICE_COLORS[index % SERVICE_COLORS.length],
      }));
  }, [services]);

  const vulnByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      open: 0,
      confirmed: 0,
      fixed: 0,
      false_positive: 0,
      accepted: 0,
    };
    vulnerabilities.forEach((v) => {
      if (v.status && counts[v.status] !== undefined) {
        counts[v.status]++;
      }
    });
    const labels: Record<string, string> = {
      open: "Открыто",
      confirmed: "Подтверждено",
      fixed: "Исправлено",
      false_positive: "Ложное",
      accepted: "Принято",
    };
    const colors: Record<string, string> = {
      open: "#ef4444",
      confirmed: "#f97316",
      fixed: "#10b981",
      false_positive: "#6b7280",
      accepted: "#8b5cf6",
    };
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({
        name: labels[status] || status,
        value,
        fill: colors[status] || "#6b7280",
      }));
  }, [vulnerabilities]);

  const portDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      const port = s.port?.toString() || "0";
      counts[port] = (counts[port] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .slice(0, 10)
      .map(([port, count]) => ({
        port,
        count,
      }));
  }, [services]);

  if (vulnerabilities.length === 0 && services.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {vulnBySeverity.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Уязвимости по критичности
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={vulnBySeverity}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {vulnBySeverity.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {vulnBySeverity.map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-muted-foreground">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {vulnByStatus.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Статусы уязвимостей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={vulnByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {vulnByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {vulnByStatus.map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-muted-foreground">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {servicesByType.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Топ сервисов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={servicesByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {servicesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {servicesByType.slice(0, 4).map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-muted-foreground">
                    {entry.name}: {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {portDistribution.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Распределение портов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={portDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="port"
                  width={40}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                  formatter={(value: number) => [`${value}`, "Кол-во"]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
