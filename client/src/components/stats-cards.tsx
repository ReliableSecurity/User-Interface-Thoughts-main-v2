import { Card, CardContent } from "@/components/ui/card";
import { 
  Server, 
  Globe, 
  Bug, 
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity
} from "lucide-react";
import type { ServiceWithHost, VulnerabilityWithContext, Host } from "@shared/schema";

interface StatsCardsProps {
  hosts: Host[];
  services: ServiceWithHost[];
  vulnerabilities: VulnerabilityWithContext[];
  isLoading?: boolean;
}

export function StatsCards({ hosts, services, vulnerabilities, isLoading }: StatsCardsProps) {
  const criticalCount = vulnerabilities.filter(v => v.severity === "critical").length;
  const highCount = vulnerabilities.filter(v => v.severity === "high").length;
  const mediumCount = vulnerabilities.filter(v => v.severity === "medium").length;
  const lowCount = vulnerabilities.filter(v => v.severity === "low").length;
  const infoCount = vulnerabilities.filter(v => v.severity === "info").length;
  
  const openVulns = vulnerabilities.filter(v => v.status === "open").length;
  const fixedVulns = vulnerabilities.filter(v => v.status === "fixed").length;

  const stats = [
    {
      label: "Хосты",
      value: hosts.length,
      icon: Globe,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Сервисы",
      value: services.length,
      icon: Server,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Уязвимости",
      value: vulnerabilities.length,
      icon: Bug,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      subStats: openVulns > 0 ? `${openVulns} открытых` : undefined,
    },
    {
      label: "Критические",
      value: criticalCount,
      icon: ShieldAlert,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Высокие",
      value: highCount,
      icon: AlertTriangle,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Средние",
      value: mediumCount,
      icon: Activity,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card/50">
            <CardContent className="p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-16 mb-2" />
                <div className="h-6 bg-muted rounded w-10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50 hover-elevate">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className={`text-lg font-bold ${stat.value > 0 && (stat.label === "Критические" || stat.label === "Высокие") ? stat.color : ""}`}>
                    {stat.value}
                  </p>
                  {stat.subStats && (
                    <span className="text-xs text-muted-foreground">{stat.subStats}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
