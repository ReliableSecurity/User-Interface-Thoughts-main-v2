import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileJson, FileText, FileCode } from "lucide-react";
import type { Project, ServiceWithHost, VulnerabilityWithContext, Host } from "@shared/schema";

interface ExportReportProps {
  project: Project;
  hosts: Host[];
  services: ServiceWithHost[];
  vulnerabilities: VulnerabilityWithContext[];
}

type ExportFormat = "json" | "markdown" | "csv";

export function ExportReport({ project, hosts, services, vulnerabilities }: ExportReportProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [includeHosts, setIncludeHosts] = useState(true);
  const [includeServices, setIncludeServices] = useState(true);
  const [includeVulns, setIncludeVulns] = useState(true);
  const [includeRawOutput, setIncludeRawOutput] = useState(false);

  const generateJSON = () => {
    const data: Record<string, unknown> = {
      project: {
        name: project.name,
        description: project.description,
        exportedAt: new Date().toISOString(),
      },
      summary: {
        totalHosts: hosts.length,
        totalServices: services.length,
        totalVulnerabilities: vulnerabilities.length,
        criticalVulns: vulnerabilities.filter(v => v.severity === "critical").length,
        highVulns: vulnerabilities.filter(v => v.severity === "high").length,
        mediumVulns: vulnerabilities.filter(v => v.severity === "medium").length,
        lowVulns: vulnerabilities.filter(v => v.severity === "low").length,
      },
    };

    if (includeHosts) {
      data.hosts = hosts.map(h => ({
        ipAddress: h.ipAddress,
        domain: h.domain || h.hostname,
        hostname: h.hostname,
        os: h.os,
        equipment: h.equipment,
        comment: h.comment,
      }));
    }

    if (includeServices) {
      data.services = services.map(s => ({
        host: s.host.ipAddress,
        port: s.port,
        protocol: s.protocol,
        serviceName: s.serviceName,
        version: s.version,
        state: s.state,
        ...(includeRawOutput && s.rawOutput ? { rawOutput: s.rawOutput } : {}),
      }));
    }

    if (includeVulns) {
      data.vulnerabilities = vulnerabilities.map(v => ({
        name: v.name,
        severity: v.severity,
        cve: v.cve,
        cvss: v.cvss,
        cwe: v.cwe,
        description: v.description,
        solution: v.solution,
        scanner: v.scanner,
        status: v.status,
        host: v.host?.ipAddress,
        service: v.service ? `${v.service.port}/${v.service.protocol}` : undefined,
        ...(includeRawOutput && v.proof ? { proof: v.proof } : {}),
      }));
    }

    return JSON.stringify(data, null, 2);
  };

  const generateMarkdown = () => {
    const lines: string[] = [];
    
    lines.push(`# Отчёт по проекту: ${project.name}`);
    lines.push("");
    lines.push(`**Дата экспорта:** ${new Date().toLocaleString("ru-RU")}`);
    if (project.description) {
      lines.push(`**Описание:** ${project.description}`);
    }
    lines.push("");

    lines.push("## Сводка");
    lines.push("");
    lines.push(`- Хосты: ${hosts.length}`);
    lines.push(`- Сервисы: ${services.length}`);
    lines.push(`- Уязвимости: ${vulnerabilities.length}`);
    lines.push(`  - Критические: ${vulnerabilities.filter(v => v.severity === "critical").length}`);
    lines.push(`  - Высокие: ${vulnerabilities.filter(v => v.severity === "high").length}`);
    lines.push(`  - Средние: ${vulnerabilities.filter(v => v.severity === "medium").length}`);
    lines.push(`  - Низкие: ${vulnerabilities.filter(v => v.severity === "low").length}`);
    lines.push("");

    if (includeHosts && hosts.length > 0) {
      lines.push("## Хосты");
      lines.push("");
      lines.push("| IP | Домен | ОС | Оборудование |");
      lines.push("|---|---|---|---|");
      hosts.forEach(h => {
        lines.push(`| ${h.ipAddress} | ${h.domain || h.hostname || "-"} | ${h.os || "-"} | ${h.equipment || "-"} |`);
      });
      lines.push("");
    }

    if (includeServices && services.length > 0) {
      lines.push("## Сервисы");
      lines.push("");
      lines.push("| Хост | Порт | Протокол | Сервис | Версия |");
      lines.push("|---|---|---|---|---|");
      services.forEach(s => {
        lines.push(`| ${s.host.ipAddress} | ${s.port} | ${s.protocol} | ${s.serviceName || "-"} | ${s.version || "-"} |`);
      });
      lines.push("");
    }

    if (includeVulns && vulnerabilities.length > 0) {
      lines.push("## Уязвимости");
      lines.push("");
      
      const byHost = new Map<string, VulnerabilityWithContext[]>();
      vulnerabilities.forEach(v => {
        const hostIp = v.host?.ipAddress || "Неизвестный хост";
        if (!byHost.has(hostIp)) byHost.set(hostIp, []);
        byHost.get(hostIp)!.push(v);
      });

      byHost.forEach((vulns, hostIp) => {
        lines.push(`### ${hostIp}`);
        lines.push("");
        vulns.forEach(v => {
          const severityEmoji = v.severity === "critical" ? "🔴" : 
            v.severity === "high" ? "🟠" : 
            v.severity === "medium" ? "🟡" : "🟢";
          lines.push(`#### ${severityEmoji} ${v.name}`);
          lines.push("");
          lines.push(`- **Severity:** ${v.severity.toUpperCase()}`);
          if (v.cve) lines.push(`- **CVE:** ${v.cve}`);
          if (v.cvss) lines.push(`- **CVSS:** ${v.cvss}`);
          if (v.scanner) lines.push(`- **Scanner:** ${v.scanner}`);
          if (v.service) lines.push(`- **Service:** ${v.service.port}/${v.service.protocol}`);
          if (v.description) {
            lines.push("");
            lines.push(`**Описание:** ${v.description}`);
          }
          if (v.solution) {
            lines.push("");
            lines.push(`**Решение:** ${v.solution}`);
          }
          lines.push("");
        });
      });
    }

    return lines.join("\n");
  };

  const generateCSV = () => {
    const lines: string[] = [];

    if (includeVulns && vulnerabilities.length > 0) {
      lines.push("Host,Port,Service,Severity,CVE,Name,Scanner,Status,Description");
      vulnerabilities.forEach(v => {
        const row = [
          v.host?.ipAddress || "",
          v.service?.port || "",
          v.service?.serviceName || "",
          v.severity,
          v.cve || "",
          `"${(v.name || "").replace(/"/g, '""')}"`,
          v.scanner,
          v.status || "",
          `"${(v.description || "").replace(/"/g, '""').substring(0, 200)}"`,
        ];
        lines.push(row.join(","));
      });
    } else if (includeServices && services.length > 0) {
      lines.push("Host,Port,Protocol,Service,Version,State");
      services.forEach(s => {
        lines.push([
          s.host.ipAddress,
          s.port,
          s.protocol,
          s.serviceName || "",
          s.version || "",
          s.state || "",
        ].join(","));
      });
    } else if (includeHosts && hosts.length > 0) {
      lines.push("IP,Domain,OS,Equipment");
      hosts.forEach(h => {
        lines.push([
          h.ipAddress,
          h.domain || h.hostname || "",
          h.os || "",
          h.equipment || "",
        ].join(","));
      });
    }

    return lines.join("\n");
  };

  const handleExport = () => {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case "json":
        content = generateJSON();
        mimeType = "application/json";
        extension = "json";
        break;
      case "markdown":
        content = generateMarkdown();
        mimeType = "text/markdown";
        extension = "md";
        break;
      case "csv":
        content = generateCSV();
        mimeType = "text/csv";
        extension = "csv";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_report.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const formatIcons = {
    json: FileJson,
    markdown: FileText,
    csv: FileCode,
  };

  const FormatIcon = formatIcons[format];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-report">
          <Download className="w-4 h-4" />
          Экспорт
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Экспорт отчёта</DialogTitle>
          <DialogDescription className="sr-only">
            Экспорт данных проекта в различных форматах
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Формат</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="markdown">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Markdown
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    CSV
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Включить в отчёт</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hosts" 
                checked={includeHosts} 
                onCheckedChange={(c) => setIncludeHosts(!!c)} 
              />
              <label htmlFor="hosts" className="text-sm flex items-center gap-2">
                Хосты
                <Badge variant="secondary" className="text-xs">{hosts.length}</Badge>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="services" 
                checked={includeServices} 
                onCheckedChange={(c) => setIncludeServices(!!c)} 
              />
              <label htmlFor="services" className="text-sm flex items-center gap-2">
                Сервисы
                <Badge variant="secondary" className="text-xs">{services.length}</Badge>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="vulns" 
                checked={includeVulns} 
                onCheckedChange={(c) => setIncludeVulns(!!c)} 
              />
              <label htmlFor="vulns" className="text-sm flex items-center gap-2">
                Уязвимости
                <Badge variant="secondary" className="text-xs">{vulnerabilities.length}</Badge>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="raw" 
                checked={includeRawOutput} 
                onCheckedChange={(c) => setIncludeRawOutput(!!c)} 
              />
              <label htmlFor="raw" className="text-sm text-muted-foreground">
                Включить сырой вывод (увеличит размер)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} className="gap-2" data-testid="button-download-export">
            <FormatIcon className="w-4 h-4" />
            Скачать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
