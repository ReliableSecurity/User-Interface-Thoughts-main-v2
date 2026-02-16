import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Shield, 
  AlertTriangle,
  Import,
  Loader2,
  FileText,
  Database,
  CheckCircle2,
  XCircle,
  Info,
  Bug
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SeverityLevel } from "@shared/schema";

interface ParsedVulnerability {
  name: string;
  severity: SeverityLevel;
  cve?: string;
  cwe?: string;
  cvss?: string;
  description?: string;
  solution?: string;
  references?: string[];
  scanner: string;
  templateId?: string;
  matchedAt?: string;
  host?: string;
  port?: number;
}

interface ImportVulnerabilitiesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  companyId: string;
  initialOutput?: string;
  onImportComplete?: () => void;
}

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Крит.", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  high: { label: "Выс.", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  medium: { label: "Сред.", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Shield },
  low: { label: "Низ.", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info },
  info: { label: "Инфо", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Info },
};

export function ImportVulnerabilitiesDialog({
  open,
  onClose,
  projectId,
  companyId,
  initialOutput = "",
  onImportComplete,
}: ImportVulnerabilitiesDialogProps) {
  const { toast } = useToast();
  const [rawOutput, setRawOutput] = useState(initialOutput);
  const [activeTab, setActiveTab] = useState<"input" | "preview">("input");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [enrichFromNVD, setEnrichFromNVD] = useState(true);
  const [parsedVulnerabilities, setParsedVulnerabilities] = useState<ParsedVulnerability[]>([]);
  const [selectedVulns, setSelectedVulns] = useState<Set<number>>(new Set());
  const [scanner, setScanner] = useState<string>("");
  const hasAutoParsed = useRef(false);

  useEffect(() => {
    if (open && initialOutput && initialOutput.trim() && !hasAutoParsed.current) {
      hasAutoParsed.current = true;
      setRawOutput(initialOutput);
      handleAutoParse(initialOutput);
    }
    if (!open) {
      hasAutoParsed.current = false;
      setRawOutput("");
      setParsedVulnerabilities([]);
      setSelectedVulns(new Set());
      setActiveTab("input");
    }
  }, [open, initialOutput]);

  const handleAutoParse = async (output: string) => {
    setIsParsing(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/parse-vulnerabilities`,
        { rawOutput: output, enrich: false, companyId }
      );
      const data = await response.json();

      setParsedVulnerabilities(data.vulnerabilities || []);
      setScanner(data.scanner || "unknown");
      setSelectedVulns(new Set(data.vulnerabilities?.map((_: ParsedVulnerability, i: number) => i) || []));
      setActiveTab("preview");

      if (data.vulnerabilities?.length === 0) {
        toast({
          title: "Уязвимости не найдены",
          description: "В выводе не обнаружено уязвимостей",
        });
      } else {
        toast({
          title: "Результаты Nuclei",
          description: `Найдено ${data.vulnerabilities.length} уязвимостей`,
        });
      }
    } catch (error) {
      console.error("Auto-parse error:", error);
      toast({
        title: "Ошибка парсинга",
        description: "Не удалось распарсить вывод Nuclei",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleParse = async () => {
    if (!rawOutput.trim()) {
      toast({
        title: "Ошибка",
        description: "Вставьте вывод сканера",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/parse-vulnerabilities`,
        { rawOutput, enrich: enrichFromNVD, companyId }
      );
      const data = await response.json();

      setParsedVulnerabilities(data.vulnerabilities || []);
      setScanner(data.scanner || "unknown");
      setSelectedVulns(new Set(data.vulnerabilities?.map((_: ParsedVulnerability, i: number) => i) || []));
      setActiveTab("preview");

      if (data.vulnerabilities?.length === 0) {
        toast({
          title: "Уязвимости не найдены",
          description: "В выводе не обнаружено уязвимостей. Проверьте формат данных.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Парсинг завершен",
          description: `Найдено ${data.vulnerabilities.length} уязвимостей (${data.scanner})`,
        });
      }
    } catch (error) {
      console.error("Parse error:", error);
      toast({
        title: "Ошибка парсинга",
        description: "Не удалось распарсить вывод сканера",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (selectedVulns.size === 0) {
      toast({
        title: "Ничего не выбрано",
        description: "Выберите уязвимости для импорта",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/import-vulnerabilities`,
        { rawOutput, enrich: enrichFromNVD, companyId }
      );
      const data = await response.json();

      toast({
        title: "Импорт завершен",
        description: `Создано: ${data.created}, обновлено: ${data.updated}, пропущено: ${data.skipped}`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "vulnerabilities"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/vulnerabilities?companyId=${companyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "stats"] });

      if (onImportComplete) {
        onImportComplete();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Ошибка импорта",
        description: "Не удалось импортировать уязвимости",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const toggleVuln = (index: number) => {
    const newSelected = new Set(selectedVulns);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVulns(newSelected);
  };

  const selectAll = () => {
    setSelectedVulns(new Set(parsedVulnerabilities.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedVulns(new Set());
  };

  const severityCounts = parsedVulnerabilities.reduce(
    (acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    },
    {} as Record<SeverityLevel, number>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-400" />
            Импорт уязвимостей
          </DialogTitle>
          <DialogDescription>
            Вставьте вывод сканера уязвимостей (Nuclei, Nikto, и др.) для автоматического парсинга и импорта
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "input" | "preview")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="input" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ввод данных
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2" disabled={parsedVulnerabilities.length === 0}>
              <Database className="w-4 h-4" />
              Предпросмотр ({parsedVulnerabilities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enrich-nvd"
                  checked={enrichFromNVD}
                  onCheckedChange={setEnrichFromNVD}
                  data-testid="switch-enrich-nvd"
                />
                <Label htmlFor="enrich-nvd" className="text-sm">
                  Обогащать данными из NVD (CVSS, CWE, описание)
                </Label>
              </div>
            </div>

            <Textarea
              placeholder="Вставьте сюда вывод Nuclei, Nikto или другого сканера уязвимостей...

Поддерживаемые форматы:
• Nuclei JSON/JSONL (рекомендуется)
• Nuclei текстовый вывод
• Nikto вывод

Пример Nuclei JSONL:
{&quot;template-id&quot;:&quot;cve-2021-44228&quot;,&quot;info&quot;:{&quot;name&quot;:&quot;Log4j RCE&quot;,&quot;severity&quot;:&quot;critical&quot;,...},&quot;matched-at&quot;:&quot;http://example.com&quot;}"
              value={rawOutput}
              onChange={(e) => setRawOutput(e.target.value)}
              className="flex-1 min-h-[300px] font-mono text-sm resize-none"
              data-testid="textarea-vuln-output"
            />

            <Button
              onClick={handleParse}
              disabled={isParsing || !rawOutput.trim()}
              className="w-full"
              data-testid="button-parse-vulns"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Парсинг...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Распарсить уязвимости
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{scanner}</Badge>
                {Object.entries(severityCounts).map(([severity, count]) => (
                  <Badge
                    key={severity}
                    variant="outline"
                    className={SEVERITY_CONFIG[severity as SeverityLevel]?.color}
                  >
                    {SEVERITY_CONFIG[severity as SeverityLevel]?.label}: {count}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} data-testid="button-select-all-vulns">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Всё
                </Button>
                <Button size="sm" variant="outline" onClick={selectNone} data-testid="button-select-none-vulns">
                  <XCircle className="w-4 h-4 mr-1" />
                  Сбросить
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-2">
                {parsedVulnerabilities.map((vuln, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border transition-colors cursor-pointer ${
                      selectedVulns.has(index)
                        ? "bg-accent/50 border-accent"
                        : "bg-card hover:bg-accent/20"
                    }`}
                    onClick={() => toggleVuln(index)}
                    data-testid={`vuln-item-${index}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedVulns.has(index)}
                        onCheckedChange={() => toggleVuln(index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={SEVERITY_CONFIG[vuln.severity]?.color}
                          >
                            {SEVERITY_CONFIG[vuln.severity]?.label}
                          </Badge>
                          <span className="font-medium truncate">{vuln.name}</span>
                          {vuln.cve && (
                            <Badge variant="secondary" className="text-xs">
                              {vuln.cve}
                            </Badge>
                          )}
                          {vuln.cvss && (
                            <Badge variant="outline" className="text-xs">
                              CVSS: {vuln.cvss}
                            </Badge>
                          )}
                        </div>
                        {vuln.matchedAt && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {vuln.matchedAt}
                          </div>
                        )}
                        {vuln.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {vuln.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-import">
            Отмена
          </Button>
          {activeTab === "preview" && parsedVulnerabilities.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedVulns.size === 0}
              data-testid="button-import-vulns"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Import className="w-4 h-4 mr-2" />
                  Импортировать ({selectedVulns.size})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
