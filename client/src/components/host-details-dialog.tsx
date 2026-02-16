import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Network, 
  Server, 
  FileText,
  Globe,
  Shield
} from "lucide-react";
import type { Host, Service } from "@shared/schema";

interface HostWithServices extends Host {
  services: Service[];
}

interface HostDetailsDialogProps {
  host: HostWithServices | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteHost: (id: string) => void;
}

export function HostDetailsDialog({ host, open, onOpenChange, onDeleteHost }: HostDetailsDialogProps) {
  if (!host) return null;

  const getStateColor = (state: string | null) => {
    switch (state) {
      case "open":
        return "bg-chart-1/20 text-chart-1 border-chart-1/30";
      case "filtered":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30";
      case "closed":
        return "bg-chart-5/20 text-chart-5 border-chart-5/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            <span className="font-mono">{host.ipAddress}</span>
            {(host.domain || host.hostname) && (
              <span className="text-muted-foreground font-normal">
                ({host.domain || host.hostname})
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Детальная информация о хосте и его сервисах
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="gap-1">
              <Server className="w-3 h-3" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1">
              <Globe className="w-3 h-3" />
              Сервисы ({host.services.length})
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1">
              <FileText className="w-3 h-3" />
              Вывод
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">IP адрес</div>
                  <div className="font-mono text-sm">{host.ipAddress}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Домен</div>
                  <div className="text-sm">{host.domain || host.hostname || "-"}</div>
                </div>
                {host.hostname && host.hostname !== host.domain && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Hostname</div>
                    <div className="text-sm">{host.hostname}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Операционная система</div>
                  <div className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    {host.os || "Неизвестно"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Тип оборудования</div>
                  <div className="text-sm">{host.equipment || "-"}</div>
                </div>
              </div>

              {host.comment && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Комментарий</div>
                  <div className="text-sm p-3 rounded-md bg-muted/50">{host.comment}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Открытые порты</div>
                <div className="flex flex-wrap gap-2">
                  {host.services.filter(s => s.state === "open").map((service) => (
                    <Badge key={service.id} variant="outline" className="font-mono">
                      {service.port}/{service.protocol?.toLowerCase()}
                    </Badge>
                  ))}
                  {host.services.filter(s => s.state === "open").length === 0 && (
                    <span className="text-sm text-muted-foreground">Открытые порты не обнаружены</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Порт</TableHead>
                    <TableHead>Протокол</TableHead>
                    <TableHead>Сервис</TableHead>
                    <TableHead>Версия</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {host.services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Сервисы не обнаружены
                      </TableCell>
                    </TableRow>
                  ) : (
                    host.services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-mono">{service.port}</TableCell>
                        <TableCell>{service.protocol}</TableCell>
                        <TableCell>{service.serviceName || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {service.version || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStateColor(service.state)}>
                            {service.state === "open" ? "открыт" : service.state === "closed" ? "закрыт" : service.state || "неизвестно"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {host.services.some(s => s.banner) && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-muted-foreground">Баннеры сервисов</div>
                  {host.services.filter(s => s.banner).map((service) => (
                    <div key={service.id} className="p-2 rounded-md bg-muted/50">
                      <div className="text-xs text-muted-foreground mb-1">
                        Порт {service.port} ({service.serviceName})
                      </div>
                      <div className="font-mono text-xs whitespace-pre-wrap">{service.banner}</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="raw" className="mt-0">
              <div className="rounded-md bg-background p-4 font-mono text-xs whitespace-pre-wrap">
                {host.rawOutput || "Нет данных"}
              </div>
            </TabsContent>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                onDeleteHost(host.id);
                onOpenChange(false);
              }}
            >
              Удалить хост
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
