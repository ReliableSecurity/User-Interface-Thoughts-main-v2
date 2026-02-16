import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MoreHorizontal,
  FileText,
  Edit,
  Copy,
  Trash2,
  Terminal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  Bug,
  AlertTriangle,
} from "lucide-react";
import type { ServiceWithHost } from "@shared/schema";

interface ServicesTableProps {
  services: ServiceWithHost[];
  selectedServices: string[];
  onSelectServices: (ids: string[]) => void;
  onEditService: (service: ServiceWithHost) => void;
  onDeleteService: (id: string) => void;
  onOpenRawOutput: (service: ServiceWithHost) => void;
  onRunCommand: (services: ServiceWithHost[]) => void;
  isLoading?: boolean;
}

type SortField = "id" | "ipAddress" | "port" | "serviceName" | "protocol" | "os" | "equipment" | "comment";
type SortDirection = "asc" | "desc";

const serviceColors: Record<string, string> = {
  SSH: "bg-green-500/20 text-green-400 border-green-500/30",
  HTTP: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  HTTPS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  SMB: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  RDP: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  SIP: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  DNS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LDAP: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  MySQL: "bg-red-500/20 text-red-400 border-red-500/30",
  FTP: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

export function ServicesTable({
  services,
  selectedServices,
  onSelectServices,
  onEditService,
  onDeleteService,
  onOpenRawOutput,
  onRunCommand,
  isLoading,
}: ServicesTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("ipAddress");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterService, setFilterService] = useState<string>("all");
  const [filterOS, setFilterOS] = useState<string>("all");

  const uniqueServiceNames = useMemo(() => {
    const names = new Set(services.map((s) => s.serviceName).filter(Boolean));
    return Array.from(names) as string[];
  }, [services]);

  const uniqueOSes = useMemo(() => {
    const oses = new Set(services.map((s) => s.host.os).filter(Boolean));
    return Array.from(oses) as string[];
  }, [services]);

  const filteredAndSortedServices = useMemo(() => {
    let result = [...services];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.host.ipAddress.toLowerCase().includes(searchLower) ||
          s.serviceName?.toLowerCase().includes(searchLower) ||
          s.comment?.toLowerCase().includes(searchLower) ||
          s.host.equipment?.toLowerCase().includes(searchLower)
      );
    }

    if (filterService !== "all") {
      result = result.filter((s) => s.serviceName === filterService);
    }

    if (filterOS !== "all") {
      result = result.filter((s) => s.host.os === filterOS);
    }

    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "ipAddress":
          aVal = a.host.ipAddress;
          bVal = b.host.ipAddress;
          break;
        case "port":
          aVal = a.port;
          bVal = b.port;
          break;
        case "serviceName":
          aVal = a.serviceName || "";
          bVal = b.serviceName || "";
          break;
        case "protocol":
          aVal = a.protocol;
          bVal = b.protocol;
          break;
        case "os":
          aVal = a.host.os || "";
          bVal = b.host.os || "";
          break;
        case "equipment":
          aVal = a.host.equipment || "";
          bVal = b.host.equipment || "";
          break;
        case "comment":
          aVal = a.comment || "";
          bVal = b.comment || "";
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [services, search, sortField, sortDirection, filterService, filterOS]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectServices(filteredAndSortedServices.map((s) => s.id));
    } else {
      onSelectServices([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectServices([...selectedServices, id]);
    } else {
      onSelectServices(selectedServices.filter((s) => s !== id));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    );
  };

  const getServiceColor = (serviceName?: string | null) => {
    if (!serviceName) return "bg-muted text-muted-foreground";
    return serviceColors[serviceName] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка сервисов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по IP, сервису, комментарию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
            data-testid="input-search-services"
          />
        </div>

        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-[140px]" data-testid="button-filter-service">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Сервис" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все сервисы</SelectItem>
            {uniqueServiceNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOS} onValueChange={setFilterOS}>
          <SelectTrigger className="w-[130px]" data-testid="button-filter-os">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="ОС" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все ОС</SelectItem>
            {uniqueOSes.map((os) => (
              <SelectItem key={os} value={os}>
                {os}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedServices.length > 0 && (
          <Button
            size="sm"
            onClick={() => {
              const selected = services.filter((s) => selectedServices.includes(s.id));
              onRunCommand(selected);
            }}
            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
            data-testid="button-run-command-selected"
          >
            <Terminal className="h-4 w-4 mr-1" />
            Запустить на {selectedServices.length}
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredAndSortedServices.length > 0 &&
                    selectedServices.length === filteredAndSortedServices.length
                  }
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="w-12 text-center">
                <button
                  className="flex items-center justify-center w-full font-medium hover:text-foreground"
                  onClick={() => handleSort("id")}
                >
                  ID
                  <SortIcon field="id" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("ipAddress")}
                >
                  IP адрес
                  <SortIcon field="ipAddress" />
                </button>
              </TableHead>
              <TableHead className="w-20">
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("port")}
                >
                  Порт
                  <SortIcon field="port" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("serviceName")}
                >
                  Сервис
                  <SortIcon field="serviceName" />
                </button>
              </TableHead>
              <TableHead className="w-16">
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("protocol")}
                >
                  Тип
                  <SortIcon field="protocol" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("os")}
                >
                  ОС
                  <SortIcon field="os" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("equipment")}
                >
                  Оборудование
                  <SortIcon field="equipment" />
                </button>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <button
                  className="flex items-center font-medium hover:text-foreground"
                  onClick={() => handleSort("comment")}
                >
                  Комментарии
                  <SortIcon field="comment" />
                </button>
              </TableHead>
              <TableHead className="w-16 text-center">Уязв.</TableHead>
              <TableHead className="w-24 text-center">Вывод</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedServices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  {search || filterService !== "all" || filterOS !== "all"
                    ? "Нет результатов по фильтру"
                    : "Нет данных"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedServices.map((service, index) => (
                <TableRow
                  key={service.id}
                  className={`hover:bg-muted/20 ${
                    selectedServices.includes(service.id) ? "bg-primary/5" : ""
                  }`}
                  data-testid={`row-service-${service.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => handleSelectOne(service.id, checked as boolean)}
                      data-testid={`checkbox-service-${service.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-primary">
                    {service.host.ipAddress}
                  </TableCell>
                  <TableCell className="font-mono">{service.port}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${getServiceColor(service.serviceName)} border`}
                    >
                      {service.serviceName || "Неизвестно"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{service.protocol}</TableCell>
                  <TableCell>{service.host.os || "-"}</TableCell>
                  <TableCell>{service.host.equipment || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {service.comment || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {service.vulnerabilityCount && service.vulnerabilityCount > 0 ? (
                      <Badge 
                        variant="outline" 
                        className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"
                      >
                        <Bug className="w-3 h-3" />
                        {service.vulnerabilityCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {service.rawOutput ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenRawOutput(service)}
                        className="text-primary hover:text-primary/80"
                        data-testid={`button-open-raw-${service.id}`}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Открыть
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-service-menu-${service.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditService(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigator.clipboard.writeText(service.host.ipAddress)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать IP
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRunCommand([service])}>
                          <Terminal className="h-4 w-4 mr-2" />
                          Запустить команду
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteService(service.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Показано {filteredAndSortedServices.length} из {services.length} записей
      </div>
    </div>
  );
}
