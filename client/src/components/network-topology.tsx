import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Host, ServiceWithHost } from "@shared/schema";
import {
  Server,
  Monitor,
  Globe,
  ChevronRight,
  ChevronDown,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NetworkTopologyProps {
  hosts: Host[];
  services: ServiceWithHost[];
  onSelectHost?: (host: Host) => void;
  onSelectService?: (service: ServiceWithHost) => void;
}

interface Subnet {
  prefix: string;
  hosts: Host[];
  serviceCount: number;
}

function getSubnetPrefix(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return ip;
}

function getHostIcon(os: string | null | undefined) {
  const osLower = (os || "").toLowerCase();
  if (osLower.includes("windows")) {
    return Monitor;
  }
  if (osLower.includes("linux") || osLower.includes("unix")) {
    return Server;
  }
  return Globe;
}

export function NetworkTopology({
  hosts,
  services,
  onSelectHost,
  onSelectService,
}: NetworkTopologyProps) {
  const [expandedSubnets, setExpandedSubnets] = useState<Set<string>>(
    new Set()
  );
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());

  const subnets = useMemo<Subnet[]>(() => {
    const subnetMap = new Map<string, { hosts: Host[]; serviceCount: number }>();

    hosts.forEach((host) => {
      const prefix = getSubnetPrefix(host.ipAddress);
      if (!subnetMap.has(prefix)) {
        subnetMap.set(prefix, { hosts: [], serviceCount: 0 });
      }
      subnetMap.get(prefix)!.hosts.push(host);
    });

    services.forEach((service) => {
      const prefix = getSubnetPrefix(service.host?.ipAddress || "");
      if (subnetMap.has(prefix)) {
        subnetMap.get(prefix)!.serviceCount++;
      }
    });

    return Array.from(subnetMap.entries())
      .map(([prefix, data]) => ({
        prefix,
        hosts: data.hosts.sort((a, b) => {
          const aNum = a.ipAddress.split(".").map(Number);
          const bNum = b.ipAddress.split(".").map(Number);
          for (let i = 0; i < 4; i++) {
            if (aNum[i] !== bNum[i]) return aNum[i] - bNum[i];
          }
          return 0;
        }),
        serviceCount: data.serviceCount,
      }))
      .sort((a, b) => a.prefix.localeCompare(b.prefix));
  }, [hosts, services]);

  const toggleSubnet = (prefix: string) => {
    const newExpanded = new Set(expandedSubnets);
    if (newExpanded.has(prefix)) {
      newExpanded.delete(prefix);
    } else {
      newExpanded.add(prefix);
    }
    setExpandedSubnets(newExpanded);
  };

  const toggleHost = (hostId: string) => {
    const newExpanded = new Set(expandedHosts);
    if (newExpanded.has(hostId)) {
      newExpanded.delete(hostId);
    } else {
      newExpanded.add(hostId);
    }
    setExpandedHosts(newExpanded);
  };

  const getHostServices = (hostId: string) => {
    return services.filter((s) => s.hostId === hostId);
  };

  if (hosts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Нет хостов для отображения</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 pr-4">
        {subnets.map((subnet) => (
          <Card
            key={subnet.prefix}
            className="bg-card/50 border-border/50 overflow-hidden"
          >
            <Collapsible
              open={expandedSubnets.has(subnet.prefix)}
              onOpenChange={() => toggleSubnet(subnet.prefix)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 px-4 cursor-pointer hover-elevate">
                  <div className="flex items-center gap-3">
                    {expandedSubnets.has(subnet.prefix) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle className="text-sm font-mono">
                      {subnet.prefix}
                    </CardTitle>
                    <div className="flex gap-2 ml-auto">
                      <Badge variant="outline" className="text-xs">
                        {subnet.hosts.length} хостов
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {subnet.serviceCount} сервисов
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="space-y-1 ml-6">
                    {subnet.hosts.map((host) => {
                      const HostIcon = getHostIcon(host.os);
                      const hostServices = getHostServices(host.id);
                      const isExpanded = expandedHosts.has(host.id);

                      return (
                        <div key={host.id}>
                          <Collapsible
                            open={isExpanded}
                            onOpenChange={() => toggleHost(host.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 h-auto py-2 px-2 font-normal"
                                onClick={(e) => {
                                  if (onSelectHost) {
                                    e.stopPropagation();
                                    onSelectHost(host);
                                  }
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                                <HostIcon className="w-4 h-4 text-cyan-400" />
                                <span className="font-mono text-sm">
                                  {host.ipAddress}
                                </span>
                                {(host.domain || host.hostname) && (
                                  <span className="text-muted-foreground text-xs">
                                    ({host.domain || host.hostname})
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className="ml-auto text-xs"
                                >
                                  {hostServices.length} порт.
                                </Badge>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-8 space-y-0.5 py-1">
                                {hostServices.map((service) => (
                                  <Button
                                    key={service.id}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2 h-7 text-xs font-normal"
                                    onClick={() => onSelectService?.(service)}
                                  >
                                    <div
                                      className={cn(
                                        "w-2 h-2 rounded-full",
                                        service.state === "open"
                                          ? "bg-green-500"
                                          : "bg-gray-500"
                                      )}
                                    />
                                    <span className="font-mono">
                                      {service.port}/{service.protocol}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {service.serviceName || "неизв."}
                                    </span>
                                    {service.version && (
                                      <span className="text-muted-foreground/60 truncate">
                                        {service.version}
                                      </span>
                                    )}
                                  </Button>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
