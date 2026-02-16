import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Server, 
  Globe, 
  ChevronDown,
  ChevronRight,
  FileJson,
  Import,
  Check,
  X,
  Loader2,
  Terminal,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedService {
  ip: string;
  hostname?: string;
  port: number;
  protocol: string;
  state: string;
  service: string;
  version?: string;
  product?: string;
  extraInfo?: string;
  osMatch?: string;
  scripts?: Array<{ name: string; output: string }>;
}

interface ParsedHost {
  ip: string;
  hostname?: string;
  state: string;
  os?: string;
  services: ParsedService[];
}

interface ParsedScanResult {
  scanner: string;
  scanType: string;
  startTime?: string;
  endTime?: string;
  hosts: ParsedHost[];
  rawOutput: string;
}

interface ScanResultsDialogProps {
  open: boolean;
  onClose: () => void;
  scanOutput: string;
  parsedOutput?: string;
  onImport: (hosts: Array<{ ip: string; hostname?: string; os?: string }>, services: ParsedService[]) => Promise<void>;
}

const STATE_COLORS: Record<string, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-red-500/20 text-red-400 border-red-500/30",
  filtered: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "open|filtered": "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const STATE_LABELS: Record<string, string> = {
  open: "открыт",
  closed: "закрыт", 
  filtered: "фильтр",
  "open|filtered": "откр|фильтр",
  up: "онлайн",
  down: "оффлайн",
  unknown: "неизв.",
};

export function ScanResultsDialog({ 
  open, 
  onClose, 
  scanOutput,
  parsedOutput,
  onImport 
}: ScanResultsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"preview" | "json" | "raw">("preview");
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const parsedResult = useMemo(() => {
    if (parsedOutput) {
      try {
        return JSON.parse(parsedOutput) as ParsedScanResult;
      } catch {
        return parseScanOutput(scanOutput);
      }
    }
    return parseScanOutput(scanOutput);
  }, [scanOutput, parsedOutput]);

  const allServiceKeys = useMemo(() => {
    const keys: string[] = [];
    parsedResult.hosts.forEach(host => {
      host.services.forEach(service => {
        keys.push(`${host.ip}:${service.port}/${service.protocol}`);
      });
    });
    return keys;
  }, [parsedResult]);

  const toggleHost = (ip: string) => {
    const newSelected = new Set(selectedHosts);
    const host = parsedResult.hosts.find(h => h.ip === ip);
    
    if (newSelected.has(ip)) {
      newSelected.delete(ip);
      if (host) {
        const newServices = new Set(selectedServices);
        host.services.forEach(s => {
          newServices.delete(`${ip}:${s.port}/${s.protocol}`);
        });
        setSelectedServices(newServices);
      }
    } else {
      newSelected.add(ip);
      if (host) {
        const newServices = new Set(selectedServices);
        host.services.forEach(s => {
          newServices.add(`${ip}:${s.port}/${s.protocol}`);
        });
        setSelectedServices(newServices);
      }
    }
    setSelectedHosts(newSelected);
  };

  const toggleService = (ip: string, port: number, protocol: string) => {
    const key = `${ip}:${port}/${protocol}`;
    const newSelected = new Set(selectedServices);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedServices(newSelected);
  };

  const toggleExpandHost = (ip: string) => {
    const newExpanded = new Set(expandedHosts);
    if (newExpanded.has(ip)) {
      newExpanded.delete(ip);
    } else {
      newExpanded.add(ip);
    }
    setExpandedHosts(newExpanded);
  };

  const selectAll = () => {
    const allHosts = new Set(parsedResult.hosts.map(h => h.ip));
    const allServices = new Set(allServiceKeys);
    setSelectedHosts(allHosts);
    setSelectedServices(allServices);
  };

  const selectNone = () => {
    setSelectedHosts(new Set());
    setSelectedServices(new Set());
  };

  const selectOpenOnly = () => {
    const newHosts = new Set<string>();
    const newServices = new Set<string>();
    
    parsedResult.hosts.forEach(host => {
      const openServices = host.services.filter(s => s.state === "open");
      if (openServices.length > 0) {
        newHosts.add(host.ip);
        openServices.forEach(s => {
          newServices.add(`${host.ip}:${s.port}/${s.protocol}`);
        });
      }
    });
    
    setSelectedHosts(newHosts);
    setSelectedServices(newServices);
  };

  const handleImport = async () => {
    if (selectedServices.size === 0) {
      toast({ title: "Выберите хотя бы один сервис", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    
    try {
      const hostsToImport = parsedResult.hosts
        .filter(h => selectedHosts.has(h.ip))
        .map(h => ({
          ip: h.ip,
          hostname: h.hostname,
          os: h.os,
        }));

      const servicesToImport = parsedResult.hosts
        .flatMap(host => 
          host.services
            .filter(s => selectedServices.has(`${host.ip}:${s.port}/${s.protocol}`))
        );

      await onImport(hostsToImport, servicesToImport);
      
      toast({ 
        title: "Импорт завершён", 
        description: `Добавлено ${hostsToImport.length} хостов и ${servicesToImport.length} сервисов` 
      });
      
      onClose();
    } catch (error) {
      toast({ 
        title: "Ошибка импорта", 
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive" 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const copyJSON = () => {
    const exportData = {
      scanner: parsedResult.scanner,
      scanType: parsedResult.scanType,
      hosts: parsedResult.hosts,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast({ title: "JSON скопирован в буфер обмена" });
  };

  const totalServices = parsedResult.hosts.reduce((acc, h) => acc + h.services.length, 0);
  const openServices = parsedResult.hosts.reduce(
    (acc, h) => acc + h.services.filter(s => s.state === "open").length, 
    0
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-primary" />
            Результаты сканирования
          </DialogTitle>
          <DialogDescription>
            Сканер: <Badge variant="secondary">{parsedResult.scanner}</Badge>
            {" • "}
            Найдено: <Badge variant="outline">{parsedResult.hosts.length} хостов</Badge>
            {" • "}
            <Badge variant="outline">{totalServices} сервисов</Badge>
            {" • "}
            <Badge className="bg-green-500/20 text-green-400">{openServices} открытых</Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preview" className="gap-1" data-testid="tab-preview">
              <Server className="w-4 h-4" />
              Предпросмотр
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1" data-testid="tab-json">
              <FileJson className="w-4 h-4" />
              Данные
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1" data-testid="tab-raw">
              <Terminal className="w-4 h-4" />
              Вывод
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 min-h-0 flex flex-col mt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Выбор:</span>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Всё
              </Button>
              <Button variant="outline" size="sm" onClick={selectOpenOnly}>
                Только открытые
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Сбросить
              </Button>
              <div className="ml-auto text-sm text-muted-foreground">
                Выбрано: {selectedServices.size} сервисов
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-1">
                {parsedResult.hosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Не удалось распознать данные сканирования.
                    Попробуйте вкладку "Сырой вывод".
                  </div>
                ) : (
                  parsedResult.hosts.map(host => (
                    <Collapsible 
                      key={host.ip} 
                      open={expandedHosts.has(host.ip)}
                      onOpenChange={() => toggleExpandHost(host.ip)}
                    >
                      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover-elevate">
                        <Checkbox
                          checked={selectedHosts.has(host.ip)}
                          onCheckedChange={() => toggleHost(host.ip)}
                          data-testid={`checkbox-host-${host.ip}`}
                        />
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {expandedHosts.has(host.ip) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="font-mono font-medium">{host.ip}</span>
                        {host.hostname && (
                          <span className="text-muted-foreground">({host.hostname})</span>
                        )}
                        <Badge 
                          variant="outline" 
                          className={host.state === "up" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20"}
                        >
                          {STATE_LABELS[host.state] || host.state}
                        </Badge>
                        {host.os && (
                          <Badge variant="secondary" className="text-xs">
                            {host.os.length > 30 ? host.os.slice(0, 30) + "..." : host.os}
                          </Badge>
                        )}
                        <Badge variant="outline" className="ml-auto">
                          {host.services.length} сервисов
                        </Badge>
                      </div>

                      <CollapsibleContent>
                        <div className="ml-10 mt-1 border-l-2 border-muted pl-4 space-y-1">
                          {host.services.map(service => {
                            const key = `${host.ip}:${service.port}/${service.protocol}`;
                            return (
                              <div 
                                key={key}
                                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/20"
                              >
                                <Checkbox
                                  checked={selectedServices.has(key)}
                                  onCheckedChange={() => toggleService(host.ip, service.port, service.protocol)}
                                  data-testid={`checkbox-service-${key}`}
                                />
                                <span className="font-mono text-sm w-16">
                                  {service.port}/{service.protocol}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={STATE_COLORS[service.state] || "bg-gray-500/20"}
                                >
                                  {STATE_LABELS[service.state] || service.state}
                                </Badge>
                                <span className="font-medium">{service.service}</span>
                                {service.product && (
                                  <span className="text-muted-foreground">{service.product}</span>
                                )}
                                {service.version && (
                                  <Badge variant="secondary" className="text-xs">
                                    v{service.version}
                                  </Badge>
                                )}
                                {service.extraInfo && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {service.extraInfo}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="json" className="flex-1 min-h-0 flex flex-col mt-2">
            <div className="flex justify-end mb-2">
              <Button variant="outline" size="sm" onClick={copyJSON} className="gap-1">
                <Copy className="w-4 h-4" />
                Копировать
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-md bg-muted/20">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify({
                  scanner: parsedResult.scanner,
                  scanType: parsedResult.scanType,
                  hosts: parsedResult.hosts,
                }, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 min-h-0 flex flex-col mt-2">
            <ScrollArea className="flex-1 border rounded-md bg-black/50">
              <pre className="p-4 text-xs font-mono text-green-400 whitespace-pre-wrap">
                {scanOutput}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedServices.size === 0 || isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Import className="w-4 h-4" />
            )}
            Импортировать ({selectedServices.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseScanOutput(output: string): ParsedScanResult {
  const trimmed = output.trim();
  
  if (trimmed.startsWith("<?xml") || trimmed.includes("<nmaprun")) {
    return parseNmapXML(output);
  }
  
  if (trimmed.includes("Nmap scan report") || trimmed.includes("Starting Nmap")) {
    return parseNmapText(output);
  }
  
  if (trimmed.includes("Discovered open port") || trimmed.includes("masscan")) {
    return parseMasscanOutput(output);
  }
  
  return {
    scanner: "unknown",
    scanType: "raw",
    hosts: [],
    rawOutput: output,
  };
}

function parseNmapText(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nmap",
    scanType: "text",
    hosts: [],
    rawOutput: output,
  };

  const lines = output.split("\n");
  let currentHost: ParsedHost | null = null;
  let currentIP = "";

  for (const line of lines) {
    const scanReportMatch = line.match(/^Nmap scan report for (.+)$/);
    if (scanReportMatch) {
      if (currentHost) {
        result.hosts.push(currentHost);
      }
      const target = scanReportMatch[1].trim();
      let hostname: string | undefined;
      let ip: string | undefined;

      const hostWithIpMatch = target.match(/^(.+?) \(([\d.]+)\)$/);
      if (hostWithIpMatch) {
        hostname = hostWithIpMatch[1];
        ip = hostWithIpMatch[2];
      } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(target)) {
        ip = target;
      } else {
        hostname = target;
      }

      currentIP = ip || hostname || target;
      currentHost = {
        ip: currentIP,
        hostname: hostname,
        state: "up",
        services: [],
      };
      continue;
    }

    const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/);
    if (portMatch && currentHost) {
      const [, port, protocol, state, service, versionInfo] = portMatch;
      
      currentHost.services.push({
        ip: currentIP,
        hostname: currentHost.hostname,
        port: parseInt(port, 10),
        protocol,
        state,
        service,
        version: versionInfo?.match(/(\d+[\d.]*)/)?.[1],
        product: versionInfo?.split(" ")[0],
        extraInfo: versionInfo,
      });
      continue;
    }

    const osMatch = line.match(/OS details?:\s*(.+)/i);
    if (osMatch && currentHost) {
      currentHost.os = osMatch[1].trim();
    }
  }

  if (currentHost) {
    result.hosts.push(currentHost);
  }

  return result;
}

function parseNmapXML(xmlContent: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nmap",
    scanType: "xml",
    hosts: [],
    rawOutput: xmlContent,
  };

  const hostMatches = xmlContent.matchAll(/<host[^>]*>([\s\S]*?)<\/host>/g);
  
  for (const hostMatch of hostMatches) {
    const hostContent = hostMatch[1];
    
    const addrMatch = hostContent.match(/<address addr="([^"]+)" addrtype="ipv4"/);
    if (!addrMatch) continue;
    
    const ip = addrMatch[1];
    const hostnameMatch = hostContent.match(/<hostname name="([^"]+)"/);
    const statusMatch = hostContent.match(/<status state="([^"]+)"/);
    const osMatchResult = hostContent.match(/<osmatch name="([^"]+)"/);
    
    const host: ParsedHost = {
      ip,
      hostname: hostnameMatch?.[1],
      state: statusMatch?.[1] || "unknown",
      os: osMatchResult?.[1],
      services: [],
    };
    
    const portMatches = hostContent.matchAll(/<port protocol="([^"]+)" portid="(\d+)">([\s\S]*?)<\/port>/g);
    
    for (const portMatch of portMatches) {
      const [, protocol, portId, portContent] = portMatch;
      const stateMatch = portContent.match(/<state state="([^"]+)"/);
      const serviceMatch = portContent.match(/<service name="([^"]*)"(?:[^>]*product="([^"]*)")?(?:[^>]*version="([^"]*)")?/);
      
      host.services.push({
        ip,
        hostname: host.hostname,
        port: parseInt(portId, 10),
        protocol,
        state: stateMatch?.[1] || "unknown",
        service: serviceMatch?.[1] || "unknown",
        product: serviceMatch?.[2],
        version: serviceMatch?.[3],
      });
    }
    
    result.hosts.push(host);
  }

  return result;
}

function parseMasscanOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "masscan",
    scanType: "text",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");
  
  for (const line of lines) {
    const match = line.match(/Discovered open port (\d+)\/(tcp|udp) on (\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      const [, port, protocol, ip] = match;
      
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      
      hostsMap.get(ip)!.services.push({
        ip,
        port: parseInt(port, 10),
        protocol,
        state: "open",
        service: "unknown",
      });
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}
