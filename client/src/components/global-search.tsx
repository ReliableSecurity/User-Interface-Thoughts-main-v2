import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  X,
  Server,
  Globe,
  Bug,
  ChevronRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ServiceWithHost, VulnerabilityWithContext, Host } from "@shared/schema";

interface GlobalSearchProps {
  hosts: Host[];
  services: ServiceWithHost[];
  vulnerabilities: VulnerabilityWithContext[];
  onSelectService?: (service: ServiceWithHost) => void;
  onSelectVulnerability?: (vuln: VulnerabilityWithContext) => void;
}

type SearchResult = {
  type: "host" | "service" | "vulnerability";
  id: string;
  title: string;
  subtitle: string;
  data: Host | ServiceWithHost | VulnerabilityWithContext;
  severity?: string;
};

export function GlobalSearch({ 
  hosts, 
  services, 
  vulnerabilities,
  onSelectService,
  onSelectVulnerability,
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    hosts.forEach(host => {
      if (
        host.ipAddress.toLowerCase().includes(q) ||
        host.domain?.toLowerCase().includes(q) ||
        host.hostname?.toLowerCase().includes(q) ||
        host.os?.toLowerCase().includes(q) ||
        host.equipment?.toLowerCase().includes(q)
      ) {
        found.push({
          type: "host",
          id: host.id,
          title: host.ipAddress,
          subtitle: [host.domain || host.hostname, host.os].filter(Boolean).join(" • ") || "Хост",
          data: host,
        });
      }
    });

    services.forEach(svc => {
      if (
        svc.serviceName?.toLowerCase().includes(q) ||
        svc.port.toString().includes(q) ||
        svc.host.ipAddress.includes(q) ||
        svc.version?.toLowerCase().includes(q) ||
        svc.banner?.toLowerCase().includes(q)
      ) {
        found.push({
          type: "service",
          id: svc.id,
          title: `${svc.host.ipAddress}:${svc.port}`,
          subtitle: svc.serviceName || svc.protocol,
          data: svc,
        });
      }
    });

    vulnerabilities.forEach(vuln => {
      if (
        vuln.name.toLowerCase().includes(q) ||
        vuln.cve?.toLowerCase().includes(q) ||
        vuln.description?.toLowerCase().includes(q) ||
        vuln.scanner.toLowerCase().includes(q)
      ) {
        found.push({
          type: "vulnerability",
          id: vuln.id,
          title: vuln.name,
          subtitle: [vuln.cve, vuln.scanner].filter(Boolean).join(" • "),
          data: vuln,
          severity: vuln.severity,
        });
      }
    });

    return found.slice(0, 50);
  }, [query, hosts, services, vulnerabilities]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "service" && onSelectService) {
      onSelectService(result.data as ServiceWithHost);
    } else if (result.type === "vulnerability" && onSelectVulnerability) {
      onSelectVulnerability(result.data as VulnerabilityWithContext);
    }
    setOpen(false);
    setQuery("");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "host": return Globe;
      case "service": return Server;
      case "vulnerability": return Bug;
      default: return Server;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
        data-testid="button-global-search"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Поиск...</span>
        <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-xs">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
            <DialogDescription className="sr-only">
              Поиск по хостам, сервисам и уязвимостям проекта
            </DialogDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по хостам, сервисам, уязвимостям..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
                data-testid="input-global-search"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            {query && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mb-2 opacity-50" />
                <p>Ничего не найдено</p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result) => {
                  const Icon = getIcon(result.type);
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 text-left transition-colors"
                      onClick={() => handleSelect(result)}
                      data-testid={`search-result-${result.type}-${result.id}`}
                    >
                      <div className="flex-shrink-0 p-2 rounded bg-muted">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.severity && (
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(result.severity)}`}>
                              {result.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Начните вводить для поиска
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
