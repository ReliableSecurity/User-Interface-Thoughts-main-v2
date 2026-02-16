import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  SidebarProvider, 
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ServicesTable } from "@/components/services-table";
import { VulnerabilitiesTable } from "@/components/vulnerabilities-table";
import { VulnerabilityDetailsDialog } from "@/components/vulnerability-details-dialog";
import { CommandPanel } from "@/components/command-panel";
import { EditServiceDialog } from "@/components/edit-service-dialog";
import { RawOutputDialog } from "@/components/raw-output-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateCompanyDialog } from "@/components/create-company-dialog";
import { AddHostDialog } from "@/components/add-host-dialog";
import { HostDetailsDialog } from "@/components/host-details-dialog";
import { HostsTable } from "@/components/hosts-table";
import { StatsCards } from "@/components/stats-cards";
import { Charts } from "@/components/charts";
import { GlobalSearch } from "@/components/global-search";
import { ExportReport } from "@/components/export-report";
import { BatchVulnActions } from "@/components/batch-vuln-actions";
import { ScanResultsDialog } from "@/components/scan-results-dialog";
import { FileImport } from "@/components/file-import";
import { NetworkTopology } from "@/components/network-topology";
import { useActivityLog, type Activity } from "@/components/activity-timeline";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { CreateVulnerabilityDialog, type VulnerabilityFormData } from "@/components/create-vulnerability-dialog";
import { EditVulnerabilityDialog } from "@/components/edit-vulnerability-dialog";
import { VulnerabilityGroups } from "@/components/vulnerability-groups";
import { ExportVulnerabilities } from "@/components/export-vulnerabilities";
import { ImportVulnerabilitiesDialog } from "@/components/import-vulnerabilities-dialog";
import { 
  Plus, 
  RefreshCw,
  Network,
  LayoutGrid,
  Server,
  Bug,
  AlertTriangle,
  Upload,
  Map as MapIcon,
  Layers
} from "lucide-react";
import type { 
  Project, 
  Company,
  Host, 
  Service,
  ServiceWithHost,
  Tool, 
  Preset,
  InsertProject,
  InsertHost,
  InsertService,
  VulnerabilityWithContext,
  VulnStatus
} from "@shared/schema";

type ToolWithAvailability = Tool & { available?: boolean };

type HostWithServices = Host & { services: Service[] };

type ParsedService = {
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
};

type ParsedHost = {
  ip: string;
  hostname?: string;
  state: string;
  os?: string;
  services: ParsedService[];
};

type ParsedScanResult = {
  scanner: string;
  scanType: string;
  startTime?: string;
  endTime?: string;
  hosts: ParsedHost[];
  rawOutput: string;
};

function normalizeScanJson(input: unknown): ParsedScanResult | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const source = input as Record<string, unknown>;
  const rawHosts = (source.hosts ||
    (source.scan as Record<string, unknown> | undefined)?.hosts ||
    (Array.isArray(input) ? input : null)) as unknown;

  if (!Array.isArray(rawHosts)) {
    return null;
  }

  const hosts: ParsedHost[] = rawHosts
    .map((hostEntry): ParsedHost | null => {
      if (!hostEntry || typeof hostEntry !== "object") {
        return null;
      }
      const host = hostEntry as Record<string, unknown>;
      const ip =
        (host.ip as string | undefined) ||
        (host.address as string | undefined) ||
        (host.host as string | undefined) ||
        (host.hostname as string | undefined) ||
        (host.target as string | undefined);

      if (!ip) {
        return null;
      }

      const hostname =
        (host.hostname as string | undefined) ||
        (host.name as string | undefined) ||
        undefined;

      const rawServices = (host.services ||
        host.ports ||
        host.open_ports ||
        []) as unknown;

      const services: ParsedService[] = Array.isArray(rawServices)
        ? rawServices
            .map((serviceEntry): ParsedService | null => {
              if (!serviceEntry || typeof serviceEntry !== "object") {
                return null;
              }
              const service = serviceEntry as Record<string, unknown>;
              const portValue =
                service.port ??
                service.portid ??
                service.port_id ??
                service.portId;
              const port = typeof portValue === "number" ? portValue : Number(portValue);
              if (!Number.isFinite(port) || port <= 0) {
                return null;
              }

              const protocol = String(service.protocol || service.proto || "tcp").toLowerCase();
              const state = String(service.state || service.status || "open");
              const serviceName = String(
                service.service || service.name || service.serviceName || "unknown",
              );

              return {
                ip,
                ...(hostname ? { hostname } : {}),
                port,
                protocol,
                state,
                service: serviceName,
                version: service.version as string | undefined,
                product: service.product as string | undefined,
                extraInfo: service.extraInfo as string | undefined,
                osMatch: service.osMatch as string | undefined,
                scripts: service.scripts as Array<{ name: string; output: string }> | undefined,
              };
            })
            .filter((entry): entry is ParsedService => entry !== null)
        : [];

      return {
        ip,
        ...(hostname ? { hostname } : {}),
        state: String(host.state || "up"),
        os: host.os as string | undefined,
        services,
      };
    })
    .filter((entry): entry is ParsedHost => entry !== null);

  if (hosts.length === 0) {
    return null;
  }

  return {
    scanner: String(source.scanner || "json"),
    scanType: String(source.scanType || "import"),
    startTime: source.startTime as string | undefined,
    endTime: source.endTime as string | undefined,
    hosts,
    rawOutput: JSON.stringify(input),
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [selectedVulnIds, setSelectedVulnIds] = useState<string[]>([]);
  const [editingService, setEditingService] = useState<ServiceWithHost | null>(null);
  const [viewingHost, setViewingHost] = useState<HostWithServices | null>(null);
  const [editingHost, setEditingHost] = useState<HostWithServices | null>(null);
  const [viewingRawOutput, setViewingRawOutput] = useState<ServiceWithHost | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showAddHost, setShowAddHost] = useState(false);
  const [commandPanelServices, setCommandPanelServices] = useState<ServiceWithHost[]>([]);
  const [commandPanelHosts, setCommandPanelHosts] = useState<HostWithServices[]>([]);
  const [activeTab, setActiveTab] = useState<"hosts" | "services" | "vulnerabilities" | "topology">("services");
  const [viewingVulnerability, setViewingVulnerability] = useState<VulnerabilityWithContext | null>(null);
  const [scanResultsOutput, setScanResultsOutput] = useState<string | null>(null);
  const [scanParsedOutput, setScanParsedOutput] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [showFileImport, setShowFileImport] = useState(false);
  const [showSearchOpen, setShowSearchOpen] = useState(false);
  const { addActivity } = useActivityLog();
  const [showCreateVuln, setShowCreateVuln] = useState(false);
  const [nucleiScanOutput, setNucleiScanOutput] = useState<string | null>(null);
  const [editingVulnerability, setEditingVulnerability] = useState<VulnerabilityWithContext | null>(null);
  const [vulnViewMode, setVulnViewMode] = useState<"list" | "groups">("list");

  const logActivity = useCallback((type: Activity["type"], title: string, description?: string) => {
    addActivity(type, title, description);
  }, [addActivity]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: companies = [], isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: selectedProjectId
      ? [`/api/projects/${selectedProjectId}/companies`]
      : ["/api/companies/empty"],
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedCompanyId(null);
      setSelectedHostIds([]);
      return;
    }
    if (companies.length === 0) {
      setSelectedCompanyId(null);
      setSelectedHostIds([]);
      return;
    }
    const hasSelectedCompany = !!selectedCompanyId && companies.some((c) => c.id === selectedCompanyId);
    if (!hasSelectedCompany) {
      setSelectedCompanyId(companies[0].id);
      setSelectedHostIds([]);
      return;
    }
    setSelectedHostIds([]);
  }, [selectedProjectId, companies, selectedCompanyId]);

  const servicesQueryKey = selectedProjectId && selectedCompanyId
    ? `/api/projects/${selectedProjectId}/services?companyId=${selectedCompanyId}`
    : "/api/projects/empty/services";

  const vulnerabilitiesQueryKey = selectedProjectId && selectedCompanyId
    ? `/api/projects/${selectedProjectId}/vulnerabilities?companyId=${selectedCompanyId}`
    : "/api/projects/empty/vulnerabilities";

  const hostsQueryKey = selectedProjectId && selectedCompanyId
    ? `/api/projects/${selectedProjectId}/hosts?companyId=${selectedCompanyId}`
    : "/api/projects/empty/hosts";

  const { data: hosts = [], isLoading: hostsLoading, refetch: refetchHosts } = useQuery<HostWithServices[]>({
    queryKey: [hostsQueryKey],
    enabled: !!selectedProjectId && !!selectedCompanyId,
  });

  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery<ServiceWithHost[]>({
    queryKey: [servicesQueryKey],
    enabled: !!selectedProjectId && !!selectedCompanyId,
  });

  const { data: vulnerabilities = [], isLoading: vulnsLoading, refetch: refetchVulns } = useQuery<VulnerabilityWithContext[]>({
    queryKey: [vulnerabilitiesQueryKey],
    enabled: !!selectedProjectId && !!selectedCompanyId,
  });

  const { data: tools = [] } = useQuery<ToolWithAvailability[]>({
    queryKey: ["/api/tools"],
  });

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["/api/presets"],
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreateProject(false);
      toast({ title: "Проект создан" });
    },
    onError: () => {
      toast({ title: "Ошибка при создании проекта", variant: "destructive" });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!selectedProjectId) {
        throw new Error("Project not selected");
      }
      const response = await apiRequest("POST", `/api/projects/${selectedProjectId}/companies`, data);
      return response.json();
    },
    onSuccess: (company: Company) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProjectId}/companies`] });
      setSelectedCompanyId(company.id);
      setShowCreateCompany(false);
      toast({ title: "Компания создана" });
    },
    onError: () => {
      toast({ title: "Ошибка при создании компании", variant: "destructive" });
    },
  });

  const createHostMutation = useMutation({
    mutationFn: async (data: InsertHost): Promise<Host> => {
      const response = await apiRequest("POST", "/api/hosts", data);
      return response.json();
    },
    onSuccess: (host) => {
      logActivity("host_added", host.ipAddress, host.domain || host.hostname || undefined);
    },
    onError: () => {
      toast({ title: "Ошибка при добавлении хоста", variant: "destructive" });
    },
  });

  const updateHostMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertHost>) => {
      const response = await apiRequest("PATCH", `/api/hosts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [hostsQueryKey] });
      toast({ title: "Хост обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении хоста", variant: "destructive" });
    },
  });

  const deleteHostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/hosts/${id}`),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: [hostsQueryKey] });
      queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
      setSelectedHostIds((prev) => prev.filter((hostId) => hostId !== id));
      toast({ title: "Хост удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении хоста", variant: "destructive" });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: { hostId: string } & Partial<InsertService>) => 
      apiRequest("POST", `/api/hosts/${data.hostId}/services`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
      queryClient.invalidateQueries({ queryKey: [hostsQueryKey] });
      setShowAddHost(false);
      toast({ title: "Сервис добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка при добавлении сервиса", variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<InsertService>) => 
      apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
      setEditingService(null);
      toast({ title: "Сервис обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении сервиса", variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
      toast({ title: "Сервис удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении сервиса", variant: "destructive" });
    },
  });

  const updateVulnerabilityMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: VulnStatus; notes?: string }) => 
      apiRequest("PATCH", `/api/vulnerabilities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [vulnerabilitiesQueryKey] });
      toast({ title: "Уязвимость обновлена" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении уязвимости", variant: "destructive" });
    },
  });

  const createVulnerabilityMutation = useMutation({
    mutationFn: (data: VulnerabilityFormData) => 
      apiRequest("POST", "/api/vulnerabilities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [vulnerabilitiesQueryKey] });
      setShowCreateVuln(false);
      toast({ title: "Уязвимость создана" });
      logActivity("vulnerability_added", "Добавлена уязвимость");
    },
    onError: () => {
      toast({ title: "Ошибка при создании уязвимости", variant: "destructive" });
    },
  });

  const editVulnerabilityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VulnerabilityFormData> }) => 
      apiRequest("PATCH", `/api/vulnerabilities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [vulnerabilitiesQueryKey] });
      setEditingVulnerability(null);
      toast({ title: "Уязвимость обновлена" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении уязвимости", variant: "destructive" });
    },
  });

  const createScanMutation = useMutation({
    mutationFn: async (data: { projectId: string; companyId: string; command: string; toolId?: string; presetId?: string; targetIps: string[] }) => {
      const response = await apiRequest("POST", "/api/scans", data);
      return response.json();
    },
    onSuccess: (scan: { id: string }) => {
      toast({ title: "Сканирование запущено" });
      setActiveScanId(scan.id);
    },
    onError: () => {
      toast({ title: "Ошибка запуска сканирования", variant: "destructive" });
    },
  });

  const importScanResultsMutation = useMutation({
    mutationFn: async (data: { hosts: Array<{ ip: string; hostname?: string; os?: string }>; services: Array<{ ip: string; port: number; protocol: string; state: string; service: string; version?: string; product?: string; extraInfo?: string }>; companyId: string }) => {
      const response = await apiRequest("POST", `/api/projects/${selectedProjectId}/import`, data);
      return response.json();
    },
    onSuccess: (result: { hostsCreated: number; hostsUpdated: number; servicesCreated: number; servicesUpdated: number; servicesSkipped: number }) => {
      queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
      toast({ 
        title: "Импорт завершён", 
        description: `Хостов: +${result.hostsCreated} (обн. ${result.hostsUpdated}). Сервисов: +${result.servicesCreated} (обн. ${result.servicesUpdated}, пропущено ${result.servicesSkipped})` 
      });
    },
    onError: () => {
      toast({ title: "Ошибка импорта", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!activeScanId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/scans/${activeScanId}`);
        const scan = await response.json();
        
        if (scan.status === "completed" || scan.status === "failed") {
          clearInterval(pollInterval);
          setActiveScanId(null);
          
          if (scan.parsedOutput || scan.output) {
            const command = (scan.command || "").toLowerCase();
            const isNucleiScan = command.includes("nuclei");
            
            if (isNucleiScan && scan.output) {
              setNucleiScanOutput(scan.output);
              setActiveTab("vulnerabilities");
            } else {
              setScanResultsOutput(scan.output || "");
              setScanParsedOutput(scan.parsedOutput || null);
            }
          }
        }
      } catch (error) {
        console.error("Error polling scan status:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [activeScanId]);

  const handleSelectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    setSelectedServices([]);
    setSelectedHostIds([]);
    setCommandPanelHosts([]);
    setCommandPanelServices([]);
  }, []);

  const handleRunCommand = useCallback((servicesToRun: ServiceWithHost[]) => {
    setCommandPanelHosts([]);
    setCommandPanelServices(servicesToRun);
  }, []);

  const handleRunCommandForHosts = useCallback((hostsToRun: HostWithServices[]) => {
    setCommandPanelServices([]);
    setCommandPanelHosts(hostsToRun);
  }, []);

  const handleCreateProject = useCallback((values: { name: string; description?: string }) => {
    createProjectMutation.mutate(values);
  }, [createProjectMutation]);

  const handleAddHostWithService = useCallback(async (values: {
    ipAddress: string;
    domain?: string;
    os?: string;
    equipment?: string;
    comment?: string;
    port?: number;
    serviceName?: string;
    protocol?: string;
  }) => {
    if (!selectedProjectId) return;
    if (!selectedCompanyId) {
      toast({ title: "Сначала выберите компанию", variant: "destructive" });
      return;
    }
    
    try {
      const host = editingHost
        ? await updateHostMutation.mutateAsync({
            id: editingHost.id,
            projectId: selectedProjectId,
            companyId: selectedCompanyId,
            domain: values.domain,
            os: values.os,
            equipment: values.equipment,
            comment: values.comment,
          })
        : await createHostMutation.mutateAsync({
            projectId: selectedProjectId,
            companyId: selectedCompanyId,
            ipAddress: values.ipAddress,
            domain: values.domain,
            os: values.os,
            equipment: values.equipment,
            comment: values.comment,
          });

      if (values.port) {
        await createServiceMutation.mutateAsync({
          hostId: host.id,
          port: values.port,
          serviceName: values.serviceName,
          protocol: values.protocol || "TCP",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [servicesQueryKey] });
        queryClient.invalidateQueries({ queryKey: [hostsQueryKey] });
        setShowAddHost(false);
        setEditingHost(null);
        toast({ title: "Хост добавлен" });
      }
    } catch (error) {
      console.error("Error adding host/service:", error);
    }
  }, [
    selectedProjectId,
    selectedCompanyId,
    editingHost,
    createHostMutation,
    updateHostMutation,
    createServiceMutation,
    toast,
    servicesQueryKey,
    hostsQueryKey,
  ]);

  const handleEditService = useCallback((service: ServiceWithHost) => {
    setEditingService(service);
  }, []);

  const handleUpdateService = useCallback((values: {
    port: number;
    protocol: string;
    serviceName?: string;
    comment?: string;
    rawOutput?: string;
  }) => {
    if (!editingService) return;
    updateServiceMutation.mutate({
      id: editingService.id,
      ...values,
    });
  }, [editingService, updateServiceMutation]);

  const handleDeleteService = useCallback((id: string) => {
    deleteServiceMutation.mutate(id);
  }, [deleteServiceMutation]);

  const handleSelectHost = useCallback((id: string, selected: boolean) => {
    setSelectedHostIds((prev) =>
      selected ? [...prev, id] : prev.filter((hostId) => hostId !== id),
    );
  }, []);

  const handleSelectAllHosts = useCallback((selected: boolean) => {
    setSelectedHostIds(selected ? hosts.map((host) => host.id) : []);
  }, [hosts]);

  const handleViewHost = useCallback((host: HostWithServices) => {
    setViewingHost(host);
  }, []);

  const handleEditHost = useCallback((host: HostWithServices) => {
    setEditingHost(host);
    setShowAddHost(true);
  }, []);

  const handleDeleteHost = useCallback((id: string) => {
    deleteHostMutation.mutate(id);
  }, [deleteHostMutation]);

  const handleUpdateVulnStatus = useCallback((id: string, status: VulnStatus) => {
    updateVulnerabilityMutation.mutate({ id, status });
  }, [updateVulnerabilityMutation]);

  const handleUpdateVulnNotes = useCallback((id: string, notes: string) => {
    updateVulnerabilityMutation.mutate({ id, notes });
  }, [updateVulnerabilityMutation]);

  const batchUpdateVulnsMutation = useMutation({
    mutationFn: async (data: { ids: string[]; status: VulnStatus }) => {
      await apiRequest("PATCH", "/api/vulnerabilities/batch", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [vulnerabilitiesQueryKey] });
      toast({ title: "Уязвимости обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении", variant: "destructive" });
    },
  });

  const handleBatchUpdateVulns = useCallback(async (ids: string[], status: VulnStatus) => {
    await batchUpdateVulnsMutation.mutateAsync({ ids, status });
  }, [batchUpdateVulnsMutation]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const uniqueHosts = useMemo(() => {
    if (hosts.length > 0) {
      return hosts;
    }
    return services.reduce((acc, s) => {
      if (!acc.find(h => h.id === s.host.id)) {
        acc.push(s.host);
      }
      return acc;
    }, [] as Host[]);
  }, [hosts, services]);

  useGlobalShortcuts({
    onNewHost: () => selectedProjectId && selectedCompanyId && setShowAddHost(true),
    onSearch: () => setShowSearchOpen(true),
    onRefresh: () => {
      refetchServices();
      refetchVulns();
    },
    enabled: !!selectedProjectId,
  });
  
  const commandServices = commandPanelServices.length > 0 
    ? commandPanelServices 
    : services.filter((s) => selectedServices.includes(s.id));

  const hostsById = new Map(uniqueHosts.map((host) => [host.id, host]));
  const selectedHosts = selectedHostIds
    .map((id) => hostsById.get(id))
    .filter((host): host is HostWithServices => Boolean(host));

  const commandHosts = commandPanelHosts.length > 0
    ? commandPanelHosts
    : selectedHosts.length > 0
      ? selectedHosts
      : commandServices.map(s => s.host).filter((host, index, self) => 
          index === self.findIndex(h => h.id === host.id)
        );

  const handleRunScan = useCallback((command: string, toolId?: string, presetId?: string) => {
    if (!selectedProjectId) return;
    if (!selectedCompanyId) {
      toast({ title: "Сначала выберите компанию", variant: "destructive" });
      return;
    }
    const targetIps = commandHosts
      .map(h => h.ipAddress || h.domain || h.hostname || "")
      .filter(Boolean);
    if (targetIps.length === 0) {
      toast({ title: "У выбранных хостов нет IP или домена", variant: "destructive" });
      return;
    }
    createScanMutation.mutate({
      projectId: selectedProjectId,
      companyId: selectedCompanyId,
      command,
      toolId,
      presetId,
      targetIps,
    });
  }, [selectedProjectId, selectedCompanyId, commandHosts, createScanMutation, toast]);

  const criticalVulns = vulnerabilities.filter(v => v.severity === "critical" || v.severity === "high").length;

  const handleImportScanResults = useCallback(async (
    hosts: Array<{ ip: string; hostname?: string; os?: string }>, 
    services: Array<{ ip: string; port: number; protocol: string; state: string; service: string; version?: string; product?: string; extraInfo?: string }>
  ) => {
    if (!selectedCompanyId) {
      toast({ title: "Сначала выберите компанию", variant: "destructive" });
      return;
    }
    await importScanResultsMutation.mutateAsync({ hosts, services, companyId: selectedCompanyId });
    refetchHosts();
    refetchServices();
  }, [importScanResultsMutation, selectedCompanyId, toast, refetchHosts, refetchServices]);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <AppSidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setShowCreateProject(true)}
          isLoading={projectsLoading}
        />
        
        <SidebarInset className="flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {selectedProject ? (
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedProject.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {uniqueHosts.length} хостов
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {services.length} сервисов
                  </Badge>
                  {vulnerabilities.length > 0 && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${criticalVulns > 0 ? "text-red-400 border-red-500/30" : "text-yellow-400 border-yellow-500/30"}`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {vulnerabilities.length} уязв.
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Выберите проект</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedProjectId && (
                <>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedCompanyId || ""}
                      onValueChange={(value) => setSelectedCompanyId(value)}
                    >
                      <SelectTrigger className="h-8 w-[220px]">
                        <SelectValue placeholder={companiesLoading ? "Загрузка компаний..." : "Выберите компанию"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.length === 0 ? (
                          <SelectItem value="empty" disabled>
                            Компаний нет
                          </SelectItem>
                        ) : (
                          companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateCompany(true)}
                      className="gap-1"
                      data-testid="button-create-company"
                    >
                      <Plus className="w-3 h-3" />
                      Компания
                    </Button>
                  </div>
                  <GlobalSearch
                    hosts={uniqueHosts}
                    services={services}
                    vulnerabilities={vulnerabilities}
                    onSelectService={(service) => setActiveTab("services")}
                    onSelectVulnerability={(vuln) => {
                      setActiveTab("vulnerabilities");
                      setViewingVulnerability(vuln);
                    }}
                  />
                  {selectedProject && (
                    <ExportReport
                      project={selectedProject}
                      hosts={uniqueHosts}
                      services={services}
                      vulnerabilities={vulnerabilities}
                    />
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      refetchServices();
                      refetchVulns();
                    }}
                    className="gap-1"
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Обновить
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowAddHost(true)}
                    disabled={!selectedCompanyId}
                    className="gap-1"
                    data-testid="button-add-entry"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFileImport(true)}
                    disabled={!selectedCompanyId}
                    className="gap-1"
                    data-testid="button-file-import"
                  >
                    <Upload className="w-3 h-3" />
                    Импорт файла
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden">
            {!selectedProjectId ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Проект не выбран</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Выберите существующий проект из боковой панели или создайте новый.
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateProject(true)} data-testid="button-create-first-project">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать проект
                  </Button>
                </div>
              </div>
            ) : !selectedCompanyId ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Layers className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Компания не выбрана</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Создайте компанию внутри проекта и выберите её для управления хостами и сканами.
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateCompany(true)} data-testid="button-create-first-company">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать компанию
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex">
                <div className="flex-1 min-w-0 flex flex-col h-full">
                  <div className="px-4 pt-3 shrink-0">
                    <StatsCards
                      hosts={uniqueHosts}
                      services={services}
                      vulnerabilities={vulnerabilities}
                    />
                    <Charts 
                      services={services}
                      vulnerabilities={vulnerabilities}
                    />
                  </div>

                  <Tabs 
                    value={activeTab} 
                    onValueChange={(v) => setActiveTab(v as "hosts" | "services" | "vulnerabilities" | "topology")}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    <div className="px-4 pt-3 border-b border-border shrink-0 flex items-center justify-between">
                      <TabsList className="bg-muted/30">
                        <TabsTrigger value="hosts" className="gap-1.5" data-testid="tab-hosts">
                          <Network className="w-4 h-4" />
                          Хосты
                          <Badge variant="secondary" className="ml-1 h-5 text-xs">
                            {uniqueHosts.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="services" className="gap-1.5" data-testid="tab-services">
                          <Server className="w-4 h-4" />
                          Сервисы
                          <Badge variant="secondary" className="ml-1 h-5 text-xs">
                            {services.length}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="vulnerabilities" className="gap-1.5" data-testid="tab-vulnerabilities">
                          <Bug className="w-4 h-4" />
                          Уязвимости
                          {vulnerabilities.length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className={`ml-1 h-5 text-xs ${criticalVulns > 0 ? "bg-red-500/20 text-red-400" : ""}`}
                            >
                              {vulnerabilities.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="topology" className="gap-1.5" data-testid="tab-topology">
                          <MapIcon className="w-4 h-4" />
                          Топология
                          <Badge variant="secondary" className="ml-1 h-5 text-xs">
                            {uniqueHosts.length}
                          </Badge>
                        </TabsTrigger>
                      </TabsList>

                      {activeTab === "vulnerabilities" && selectedVulnIds.length > 0 && (
                        <BatchVulnActions
                          selectedIds={selectedVulnIds}
                          onBatchUpdate={handleBatchUpdateVulns}
                          onClearSelection={() => setSelectedVulnIds([])}
                        />
                      )}
                    </div>

                    <TabsContent value="hosts" className="flex-1 min-h-0 overflow-auto p-4 mt-0">
                      <HostsTable
                        hosts={hosts}
                        selectedHosts={selectedHostIds}
                        onSelectHost={(id, selected) => {
                          setSelectedServices([]);
                          setCommandPanelServices([]);
                          handleSelectHost(id, selected);
                        }}
                        onSelectAll={(selected) => {
                          setSelectedServices([]);
                          setCommandPanelServices([]);
                          handleSelectAllHosts(selected);
                        }}
                        onViewHost={handleViewHost}
                        onEditHost={handleEditHost}
                        onDeleteHost={handleDeleteHost}
                        onRunCommand={handleRunCommandForHosts}
                        isLoading={hostsLoading}
                      />
                    </TabsContent>

                    <TabsContent value="services" className="flex-1 min-h-0 overflow-auto p-4 mt-0">
                      <ServicesTable
                        services={services}
                        selectedServices={selectedServices}
                        onSelectServices={(ids) => {
                          setSelectedHostIds([]);
                          setSelectedServices(ids);
                          setCommandPanelHosts([]);
                        }}
                        onEditService={handleEditService}
                        onDeleteService={handleDeleteService}
                        onOpenRawOutput={setViewingRawOutput}
                        onRunCommand={handleRunCommand}
                        isLoading={servicesLoading}
                      />
                    </TabsContent>

                    <TabsContent value="vulnerabilities" className="flex-1 min-h-0 overflow-auto p-4 mt-0">
                      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => setShowCreateVuln(true)}
                            data-testid="button-add-vulnerability"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Добавить
                          </Button>
                          <div className="flex border rounded-md">
                            <Button
                              variant={vulnViewMode === "list" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setVulnViewMode("list")}
                              className="rounded-r-none"
                              data-testid="button-vuln-list-view"
                            >
                              <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={vulnViewMode === "groups" ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setVulnViewMode("groups")}
                              className="rounded-l-none"
                              data-testid="button-vuln-groups-view"
                            >
                              <Layers className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BatchVulnActions
                            selectedIds={selectedVulnIds}
                            onBatchUpdate={handleBatchUpdateVulns}
                            onClearSelection={() => setSelectedVulnIds([])}
                          />
                          <ExportVulnerabilities 
                            vulnerabilities={vulnerabilities}
                            projectName={selectedProject?.name}
                          />
                        </div>
                      </div>
                      
                      {vulnViewMode === "list" ? (
                        <VulnerabilitiesTable
                          vulnerabilities={vulnerabilities}
                          isLoading={vulnsLoading}
                          onViewDetails={setViewingVulnerability}
                          onUpdateStatus={handleUpdateVulnStatus}
                          onEdit={setEditingVulnerability}
                          selectedIds={selectedVulnIds}
                          onSelectIds={setSelectedVulnIds}
                        />
                      ) : (
                        <VulnerabilityGroups
                          vulnerabilities={vulnerabilities}
                          onViewDetails={setViewingVulnerability}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="topology" className="flex-1 min-h-0 overflow-auto p-4 mt-0">
                      <NetworkTopology
                        hosts={uniqueHosts}
                        services={services}
                        onSelectHost={(host) => {
                          toast({ title: `Хост: ${host.ipAddress}` });
                        }}
                        onSelectService={(service) => {
                          setEditingService(service);
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="w-80 border-l border-border flex-shrink-0 overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 min-h-0">
                    <CommandPanel
                      tools={tools}
                      presets={presets}
                      selectedHosts={commandHosts}
                      activeScan={null}
                      onRunCommand={handleRunScan}
                      onStopScan={() => {}}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>

      <EditServiceDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        service={editingService}
        onSubmit={handleUpdateService}
        isPending={updateServiceMutation.isPending}
      />

      <RawOutputDialog
        open={!!viewingRawOutput}
        onOpenChange={(open) => !open && setViewingRawOutput(null)}
        service={viewingRawOutput}
      />

      <VulnerabilityDetailsDialog
        open={!!viewingVulnerability}
        onOpenChange={(open) => !open && setViewingVulnerability(null)}
        vulnerability={viewingVulnerability}
        onUpdateStatus={handleUpdateVulnStatus}
        onUpdateNotes={handleUpdateVulnNotes}
      />

      <CreateVulnerabilityDialog
        open={showCreateVuln}
        onOpenChange={setShowCreateVuln}
        hosts={uniqueHosts}
        services={services.map(s => ({ hostId: s.host.id, service: s }))}
        projectId={selectedProjectId || ""}
        companyId={selectedCompanyId || ""}
        onSubmit={(data) => createVulnerabilityMutation.mutate(data)}
        isPending={createVulnerabilityMutation.isPending}
      />

      <EditVulnerabilityDialog
        open={!!editingVulnerability}
        onOpenChange={(open) => !open && setEditingVulnerability(null)}
        vulnerability={editingVulnerability}
        onSubmit={(id, data) => editVulnerabilityMutation.mutate({ id, data })}
        isPending={editVulnerabilityMutation.isPending}
      />

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSubmit={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />

      <CreateCompanyDialog
        open={showCreateCompany}
        onOpenChange={setShowCreateCompany}
        onSubmit={(values) => createCompanyMutation.mutate(values)}
        isLoading={createCompanyMutation.isPending}
      />

      <AddHostDialog
        open={showAddHost}
        onOpenChange={(open) => {
          setShowAddHost(open);
          if (!open) {
            setEditingHost(null);
          }
        }}
        onSubmit={handleAddHostWithService}
        isLoading={createHostMutation.isPending || createServiceMutation.isPending}
        editHost={editingHost ? {
          id: editingHost.id,
          ipAddress: editingHost.ipAddress,
          domain: editingHost.domain,
          os: editingHost.os,
          equipment: editingHost.equipment,
          comment: editingHost.comment,
        } : null}
      />

      <HostDetailsDialog
        host={viewingHost}
        open={!!viewingHost}
        onOpenChange={(open) => !open && setViewingHost(null)}
        onDeleteHost={handleDeleteHost}
      />

      <ScanResultsDialog
        open={!!(scanResultsOutput || scanParsedOutput)}
        onClose={() => { setScanResultsOutput(null); setScanParsedOutput(null); }}
        scanOutput={scanResultsOutput || ""}
        parsedOutput={scanParsedOutput || undefined}
        onImport={handleImportScanResults}
      />

      <FileImport
        open={showFileImport}
        onOpenChange={setShowFileImport}
        onImport={(content, fileName) => {
          let parsed: ParsedScanResult | null = null;
          const trimmed = content.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
              const json = JSON.parse(trimmed);
              parsed = normalizeScanJson(json);
            } catch {
              parsed = null;
            }
          }

          setScanResultsOutput(content);
          setScanParsedOutput(parsed ? JSON.stringify(parsed) : null);
          toast({
            title: `Файл ${fileName} загружен`,
            description: parsed ? "JSON распознан, выберите данные для импорта" : undefined,
          });
        }}
      />

      <ImportVulnerabilitiesDialog
        open={nucleiScanOutput !== null}
        onClose={() => setNucleiScanOutput(null)}
        projectId={selectedProjectId || ""}
        companyId={selectedCompanyId || ""}
        initialOutput={nucleiScanOutput || ""}
        onImportComplete={() => {
          refetchVulns();
          setNucleiScanOutput(null);
        }}
      />
    </SidebarProvider>
  );
}
