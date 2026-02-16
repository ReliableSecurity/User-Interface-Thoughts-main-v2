import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileJson, FileText, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VulnerabilityWithContext, SeverityLevel, VulnStatus } from "@shared/schema";

interface ExportVulnerabilitiesProps {
  vulnerabilities: VulnerabilityWithContext[];
  projectName?: string;
}

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  info: "Информация",
};

const STATUS_LABELS: Record<VulnStatus, string> = {
  open: "Открыта",
  confirmed: "Подтверждена",
  false_positive: "Ложная",
  fixed: "Исправлена",
  accepted: "Принята",
};

export function ExportVulnerabilities({ vulnerabilities, projectName }: ExportVulnerabilitiesProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    setIsExporting(true);
    try {
      const data = vulnerabilities.map(v => ({
        id: v.id,
        name: v.name,
        severity: v.severity,
        severityLabel: SEVERITY_LABELS[v.severity as SeverityLevel] || v.severity,
        cvss: v.cvss,
        cve: v.cve,
        cwe: v.cwe,
        status: v.status,
        statusLabel: STATUS_LABELS[v.status as VulnStatus] || v.status,
        host: v.host?.ipAddress,
        domain: v.host?.domain || v.host?.hostname,
        hostname: v.host?.hostname,
        port: v.service?.port,
        protocol: v.service?.protocol,
        service: v.service?.serviceName,
        scanner: v.scanner,
        description: v.description,
        solution: v.solution,
        proof: v.proof,
        references: v.references,
        discoveredAt: v.discoveredAt,
        notes: v.notes,
      }));

      const content = JSON.stringify({ 
        project: projectName,
        exportDate: new Date().toISOString(),
        totalCount: vulnerabilities.length,
        vulnerabilities: data 
      }, null, 2);

      downloadFile(content, `vulnerabilities_${projectName || "export"}.json`, "application/json");
      toast({ title: "Экспорт завершен", description: `${vulnerabilities.length} уязвимостей экспортировано в JSON` });
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        "Название", "Критичность", "CVSS", "CVE", "CWE", "Статус", 
        "Хост", "Порт", "Сервис", "Сканер", "Описание", "Решение"
      ];
      
      const rows = vulnerabilities.map(v => [
        v.name,
        SEVERITY_LABELS[v.severity as SeverityLevel] || v.severity,
        v.cvss || "",
        v.cve || "",
        v.cwe || "",
        STATUS_LABELS[v.status as VulnStatus] || v.status,
        v.host?.ipAddress || "",
        v.service?.port?.toString() || "",
        v.service?.serviceName || "",
        v.scanner,
        (v.description || "").replace(/[\n\r,]/g, " ").slice(0, 200),
        (v.solution || "").replace(/[\n\r,]/g, " ").slice(0, 200),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      downloadFile("\uFEFF" + csvContent, `vulnerabilities_${projectName || "export"}.csv`, "text/csv;charset=utf-8");
      toast({ title: "Экспорт завершен", description: `${vulnerabilities.length} уязвимостей экспортировано в CSV` });
    } finally {
      setIsExporting(false);
    }
  };

  const exportMarkdown = () => {
    setIsExporting(true);
    try {
      const grouped: Record<string, VulnerabilityWithContext[]> = {};
      vulnerabilities.forEach(v => {
        const key = v.severity as string;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(v);
      });

      const severityOrder: SeverityLevel[] = ["critical", "high", "medium", "low", "info"];
      
      let md = `# Отчет об уязвимостях\n\n`;
      md += `**Проект:** ${projectName || "Не указан"}\n`;
      md += `**Дата:** ${new Date().toLocaleDateString("ru-RU")}\n`;
      md += `**Всего уязвимостей:** ${vulnerabilities.length}\n\n`;

      md += `## Сводка\n\n`;
      md += `| Критичность | Количество |\n`;
      md += `|-------------|------------|\n`;
      severityOrder.forEach(sev => {
        const count = grouped[sev]?.length || 0;
        if (count > 0) {
          md += `| ${SEVERITY_LABELS[sev]} | ${count} |\n`;
        }
      });
      md += `\n`;

      severityOrder.forEach(sev => {
        const vulns = grouped[sev];
        if (!vulns || vulns.length === 0) return;

        md += `## ${SEVERITY_LABELS[sev]} (${vulns.length})\n\n`;

        vulns.forEach((v, i) => {
          md += `### ${i + 1}. ${v.name}\n\n`;
          
          if (v.cve || v.cvss) {
            md += `**Идентификаторы:** `;
            if (v.cve) md += `${v.cve} `;
            if (v.cvss) md += `(CVSS: ${v.cvss})`;
            md += `\n\n`;
          }

          md += `**Цель:** ${v.host?.ipAddress || "N/A"}`;
          if (v.service) md += `:${v.service.port}/${v.service.protocol}`;
          if (v.service?.serviceName) md += ` (${v.service.serviceName})`;
          md += `\n\n`;

          md += `**Статус:** ${STATUS_LABELS[v.status as VulnStatus] || v.status}\n\n`;

          if (v.description) {
            md += `**Описание:**\n${v.description}\n\n`;
          }

          if (v.solution) {
            md += `**Рекомендации:**\n${v.solution}\n\n`;
          }

          if (v.proof) {
            md += `**Доказательство:**\n\`\`\`\n${v.proof}\n\`\`\`\n\n`;
          }

          if (v.references && v.references.length > 0) {
            md += `**Ссылки:**\n`;
            v.references.forEach(ref => {
              md += `- ${ref}\n`;
            });
            md += `\n`;
          }

          md += `---\n\n`;
        });
      });

      downloadFile(md, `vulnerability_report_${projectName || "export"}.md`, "text/markdown");
      toast({ title: "Экспорт завершен", description: `Отчет в формате Markdown создан` });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || vulnerabilities.length === 0} data-testid="button-export-vulns">
          <FileDown className="w-4 h-4 mr-2" />
          Экспорт ({vulnerabilities.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportJSON} data-testid="menu-export-json">
          <FileJson className="w-4 h-4 mr-2" />
          JSON (полные данные)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} data-testid="menu-export-csv">
          <Table className="w-4 h-4 mr-2" />
          CSV (для Excel)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportMarkdown} data-testid="menu-export-markdown">
          <FileText className="w-4 h-4 mr-2" />
          Markdown (для отчета)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
