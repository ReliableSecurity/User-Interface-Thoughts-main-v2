import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  ChevronDown, 
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Terminal,
  Copy
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Host, Service } from "@shared/schema";

interface HostWithServices extends Host {
  services: Service[];
}

interface HostsTableProps {
  hosts: HostWithServices[];
  selectedHosts: string[];
  onSelectHost: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onViewHost: (host: HostWithServices) => void;
  onEditHost: (host: HostWithServices) => void;
  onDeleteHost: (id: string) => void;
  onRunCommand: (hosts: HostWithServices[]) => void;
  isLoading?: boolean;
}

type SortField = "ipAddress" | "domain" | "os" | "equipment" | "services";
type SortDirection = "asc" | "desc";

interface FilterState {
  os: string[];
  equipment: string[];
  services: string[];
}

export function HostsTable({
  hosts,
  selectedHosts,
  onSelectHost,
  onSelectAll,
  onViewHost,
  onEditHost,
  onDeleteHost,
  onRunCommand,
  isLoading,
}: HostsTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("ipAddress");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<FilterState>({
    os: [],
    equipment: [],
    services: [],
  });

  const uniqueValues = useMemo(() => {
    const osSet = new Set<string>();
    const equipmentSet = new Set<string>();
    const servicesSet = new Set<string>();

    hosts.forEach((host) => {
      if (host.os) osSet.add(host.os);
      if (host.equipment) equipmentSet.add(host.equipment);
      host.services.forEach((s) => {
        if (s.serviceName) servicesSet.add(s.serviceName);
      });
    });

    return {
      os: Array.from(osSet),
      equipment: Array.from(equipmentSet),
      services: Array.from(servicesSet),
    };
  }, [hosts]);

  const filteredAndSortedHosts = useMemo(() => {
    let result = hosts.filter((host) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        host.ipAddress.toLowerCase().includes(searchLower) ||
        host.domain?.toLowerCase().includes(searchLower) ||
        host.hostname?.toLowerCase().includes(searchLower) ||
        host.os?.toLowerCase().includes(searchLower) ||
        host.equipment?.toLowerCase().includes(searchLower) ||
        host.comment?.toLowerCase().includes(searchLower);

      const matchesOs = filters.os.length === 0 || (host.os && filters.os.includes(host.os));
      const matchesEquipment =
        filters.equipment.length === 0 ||
        (host.equipment && filters.equipment.includes(host.equipment));
      const matchesServices =
        filters.services.length === 0 ||
        host.services.some((s) => s.serviceName && filters.services.includes(s.serviceName));

      return matchesSearch && matchesOs && matchesEquipment && matchesServices;
    });

    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "ipAddress":
          aValue = a.ipAddress;
          bValue = b.ipAddress;
          break;
        case "domain":
          aValue = a.domain || "";
          bValue = b.domain || "";
          break;
        case "os":
          aValue = a.os || "";
          bValue = b.os || "";
          break;
        case "equipment":
          aValue = a.equipment || "";
          bValue = b.equipment || "";
          break;
        case "services":
          aValue = a.services.length;
          bValue = b.services.length;
          break;
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return result;
  }, [hosts, search, sortField, sortDirection, filters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((v) => v !== value)
        : [...prev[type], value],
    }));
  };

  const allSelected = filteredAndSortedHosts.length > 0 && 
    filteredAndSortedHosts.every((h) => selectedHosts.includes(h.id));

  const getServiceBadgeColor = (serviceName: string) => {
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes("ssh")) return "bg-chart-1/20 text-chart-1 border-chart-1/30";
    if (lowerName.includes("http") || lowerName.includes("web")) return "bg-chart-2/20 text-chart-2 border-chart-2/30";
    if (lowerName.includes("smb") || lowerName.includes("samba")) return "bg-chart-4/20 text-chart-4 border-chart-4/30";
    if (lowerName.includes("rdp")) return "bg-chart-3/20 text-chart-3 border-chart-3/30";
    if (lowerName.includes("ftp")) return "bg-chart-5/20 text-chart-5 border-chart-5/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Input
          placeholder="Search hosts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
          data-testid="input-search-hosts"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1" data-testid="button-filter-os">
              <Filter className="w-3 h-3" />
              OS
              {filters.os.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.os.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by OS</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uniqueValues.os.length === 0 ? (
              <DropdownMenuItem disabled>No OS values</DropdownMenuItem>
            ) : (
              uniqueValues.os.map((os) => (
                <DropdownMenuCheckboxItem
                  key={os}
                  checked={filters.os.includes(os)}
                  onCheckedChange={() => toggleFilter("os", os)}
                >
                  {os}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1" data-testid="button-filter-services">
              <Filter className="w-3 h-3" />
              Services
              {filters.services.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {filters.services.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by Service</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uniqueValues.services.length === 0 ? (
              <DropdownMenuItem disabled>No services</DropdownMenuItem>
            ) : (
              uniqueValues.services.map((service) => (
                <DropdownMenuCheckboxItem
                  key={service}
                  checked={filters.services.includes(service)}
                  onCheckedChange={() => toggleFilter("services", service)}
                >
                  {service}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {selectedHosts.length > 0 && (
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => onRunCommand(filteredAndSortedHosts.filter((h) => selectedHosts.includes(h.id)))}
            data-testid="button-run-command-selected"
          >
            <Terminal className="w-3 h-3" />
            Run on {selectedHosts.length} hosts
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          {filteredAndSortedHosts.length} of {hosts.length} hosts
        </div>
      </div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("ipAddress")}>
                <div className="flex items-center gap-1">
                  IP
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("domain")}>
                <div className="flex items-center gap-1">
                  Domain
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("os")}>
                <div className="flex items-center gap-1">
                  OS
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("equipment")}>
                <div className="flex items-center gap-1">
                  Equipment
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </TableHead>
              <TableHead>Comment</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading hosts...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedHosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {hosts.length === 0 ? "No hosts discovered yet" : "No hosts match the current filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedHosts.map((host) => (
                <TableRow 
                  key={host.id} 
                  className={selectedHosts.includes(host.id) ? "bg-primary/5" : ""}
                  data-testid={`row-host-${host.id}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedHosts.includes(host.id)}
                      onCheckedChange={(checked) => onSelectHost(host.id, checked as boolean)}
                      data-testid={`checkbox-host-${host.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{host.ipAddress}</TableCell>
                  <TableCell className="text-sm">{host.domain || host.hostname || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {host.services.length === 0 ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        host.services.slice(0, 4).map((service) => (
                          <Badge
                            key={service.id}
                            variant="outline"
                            className={`text-[10px] ${getServiceBadgeColor(service.serviceName || "unknown")}`}
                          >
                            {service.port}/{service.serviceName || "unknown"}
                          </Badge>
                        ))
                      )}
                      {host.services.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{host.services.length - 4}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{host.os || "-"}</TableCell>
                  <TableCell className="text-sm">{host.equipment || "-"}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={host.comment || ""}>
                    {host.comment || "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-host-menu-${host.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewHost(host)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditHost(host)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(host.ipAddress)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy IP
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRunCommand([host])}>
                          <Terminal className="w-4 h-4 mr-2" />
                          Run Command
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteHost(host.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
