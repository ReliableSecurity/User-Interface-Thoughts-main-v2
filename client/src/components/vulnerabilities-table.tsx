import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Shield,
  Info,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Bug,
  Pencil
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { VulnerabilityWithContext, SeverityLevel, VulnStatus } from "@shared/schema";

interface VulnerabilitiesTableProps {
  vulnerabilities: VulnerabilityWithContext[];
  isLoading?: boolean;
  onViewDetails: (vuln: VulnerabilityWithContext) => void;
  onUpdateStatus: (id: string, status: VulnStatus) => void;
  onEdit?: (vuln: VulnerabilityWithContext) => void;
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
}

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Критический", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  high: { label: "Высокий", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  medium: { label: "Средний", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Shield },
  low: { label: "Низкий", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info },
  info: { label: "Инфо", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Info },
};

const STATUS_CONFIG: Record<VulnStatus, { label: string; color: string }> = {
  open: { label: "Открыта", color: "bg-red-500/20 text-red-400" },
  confirmed: { label: "Подтверждена", color: "bg-orange-500/20 text-orange-400" },
  false_positive: { label: "Ложная", color: "bg-gray-500/20 text-gray-400" },
  fixed: { label: "Исправлена", color: "bg-green-500/20 text-green-400" },
  accepted: { label: "Принята", color: "bg-blue-500/20 text-blue-400" },
};

type SortField = "severity" | "name" | "host" | "status" | "scanner" | "discoveredAt";
type SortDirection = "asc" | "desc";

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export function VulnerabilitiesTable({
  vulnerabilities,
  isLoading,
  onViewDetails,
  onUpdateStatus,
  onEdit,
  selectedIds: externalSelectedIds,
  onSelectIds,
}: VulnerabilitiesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<VulnStatus | "all">("all");
  const [scannerFilter, setScannerFilter] = useState<string | "all">("all");
  const [sortField, setSortField] = useState<SortField>("severity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());

  const selectedIdsSet = useMemo(() => {
    if (externalSelectedIds !== undefined) {
      return new Set(externalSelectedIds);
    }
    return internalSelectedIds;
  }, [externalSelectedIds, internalSelectedIds]);

  const setSelectedIds = (ids: Set<string>) => {
    if (onSelectIds) {
      onSelectIds(Array.from(ids));
    } else {
      setInternalSelectedIds(ids);
    }
  };

  const scanners = useMemo(() => {
    const uniqueScanners = new Set(vulnerabilities.map(v => v.scanner));
    return Array.from(uniqueScanners);
  }, [vulnerabilities]);

  const filteredAndSorted = useMemo(() => {
    let result = [...vulnerabilities];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.cve?.toLowerCase().includes(query) ||
        v.host?.ipAddress.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== "all") {
      result = result.filter(v => v.severity === severityFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter(v => v.status === statusFilter);
    }

    if (scannerFilter !== "all") {
      result = result.filter(v => v.scanner === scannerFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "severity":
          comparison = SEVERITY_ORDER[a.severity as SeverityLevel] - SEVERITY_ORDER[b.severity as SeverityLevel];
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "host":
          comparison = (a.host?.ipAddress || "").localeCompare(b.host?.ipAddress || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "scanner":
          comparison = a.scanner.localeCompare(b.scanner);
          break;
        case "discoveredAt":
          comparison = new Date(a.discoveredAt || 0).getTime() - new Date(b.discoveredAt || 0).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [vulnerabilities, searchQuery, severityFilter, statusFilter, scannerFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSorted.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIdsSet);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const stats = useMemo(() => {
    const byStatus = vulnerabilities.reduce((acc, v) => {
      const status = v.status || "open";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = vulnerabilities.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byStatus, bySeverity };
  }, [vulnerabilities]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">{stats.bySeverity.critical || 0}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-orange-500/30 bg-orange-500/10">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-400">{stats.bySeverity.high || 0}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/10">
          <Shield className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-yellow-400">{stats.bySeverity.medium || 0}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-blue-500/30 bg-blue-500/10">
          <Info className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">{stats.bySeverity.low || 0}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-500/30 bg-gray-500/10">
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-400">{stats.bySeverity.info || 0}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {stats.byStatus.fixed || 0} исправлено
          </Badge>
          <Badge variant="outline" className="text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {stats.byStatus.open || 0} открыто
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, CVE, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-vuln-search"
          />
        </div>

        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityLevel | "all")}>
          <SelectTrigger className="w-[140px]" data-testid="select-severity-filter">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            <SelectItem value="critical">Критический</SelectItem>
            <SelectItem value="high">Высокий</SelectItem>
            <SelectItem value="medium">Средний</SelectItem>
            <SelectItem value="low">Низкий</SelectItem>
            <SelectItem value="info">Инфо</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VulnStatus | "all")}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="open">Открыта</SelectItem>
            <SelectItem value="confirmed">Подтверждена</SelectItem>
            <SelectItem value="false_positive">Ложная</SelectItem>
            <SelectItem value="fixed">Исправлена</SelectItem>
            <SelectItem value="accepted">Принята</SelectItem>
          </SelectContent>
        </Select>

        <Select value={scannerFilter} onValueChange={setScannerFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-scanner-filter">
            <SelectValue placeholder="Сканер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сканеры</SelectItem>
            {scanners.map(scanner => (
              <SelectItem key={scanner} value={scanner}>{scanner}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredAndSorted.length > 0 && selectedIdsSet.size === filteredAndSorted.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all-vulns"
                />
              </TableHead>
              <TableHead 
                className="w-28 cursor-pointer hover-elevate"
                onClick={() => handleSort("severity")}
              >
                <div className="flex items-center gap-1">
                  Severity <SortIcon field="severity" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover-elevate min-w-[250px]"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Уязвимость <SortIcon field="name" />
                </div>
              </TableHead>
              <TableHead 
                className="w-36 cursor-pointer hover-elevate"
                onClick={() => handleSort("host")}
              >
                <div className="flex items-center gap-1">
                  Хост/Сервис <SortIcon field="host" />
                </div>
              </TableHead>
              <TableHead 
                className="w-28 cursor-pointer hover-elevate"
                onClick={() => handleSort("scanner")}
              >
                <div className="flex items-center gap-1">
                  Сканер <SortIcon field="scanner" />
                </div>
              </TableHead>
              <TableHead 
                className="w-28 cursor-pointer hover-elevate"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  Статус <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Bug className="w-8 h-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {vulnerabilities.length === 0 
                        ? "Уязвимости не найдены" 
                        : "Нет результатов по фильтрам"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((vuln) => {
                const severityConfig = SEVERITY_CONFIG[vuln.severity as SeverityLevel] || SEVERITY_CONFIG.info;
                const statusConfig = STATUS_CONFIG[(vuln.status || "open") as VulnStatus];
                const SeverityIcon = severityConfig.icon;

                return (
                  <TableRow 
                    key={vuln.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => onViewDetails(vuln)}
                    data-testid={`row-vuln-${vuln.id}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIdsSet.has(vuln.id)}
                        onCheckedChange={(checked) => handleSelectOne(vuln.id, !!checked)}
                        data-testid={`checkbox-vuln-${vuln.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={`${severityConfig.color} border gap-1`}>
                        <SeverityIcon className="w-3 h-3" />
                        {severityConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm line-clamp-1">{vuln.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {vuln.cve && (
                            <Badge variant="outline" className="text-xs h-5 text-cyan-400 border-cyan-500/30">
                              {vuln.cve}
                            </Badge>
                          )}
                          {vuln.cvss && (
                            <span className="text-orange-400">CVSS: {vuln.cvss}</span>
                          )}
                          {vuln.cwe && (
                            <span>{vuln.cwe}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-mono text-sm text-primary">{vuln.host?.ipAddress || "N/A"}</div>
                        {vuln.service && (
                          <div className="text-xs text-muted-foreground">
                            :{vuln.service.port} ({vuln.service.serviceName || "unknown"})
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {vuln.scanner}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig.color} text-xs`}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-vuln-menu-${vuln.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewDetails(vuln)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Подробнее
                          </DropdownMenuItem>
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(vuln)} data-testid={`menu-edit-vuln-${vuln.id}`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onUpdateStatus(vuln.id, "confirmed")}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Подтвердить
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateStatus(vuln.id, "false_positive")}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Ложная
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdateStatus(vuln.id, "fixed")}>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                            Исправлена
                          </DropdownMenuItem>
                          {vuln.cve && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={`https://nvd.nist.gov/vuln/detail/${vuln.cve}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                NVD
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredAndSorted.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Показано {filteredAndSorted.length} из {vulnerabilities.length} уязвимостей
          {selectedIdsSet.size > 0 && ` (выбрано: ${selectedIdsSet.size})`}
        </div>
      )}
    </div>
  );
}
