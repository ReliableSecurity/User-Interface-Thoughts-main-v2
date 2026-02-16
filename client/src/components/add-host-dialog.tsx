import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Network } from "lucide-react";

const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const hostnamePattern = /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

const formSchema = z
  .object({
    ipAddress: z.string().optional(),
    domain: z.string().optional(),
    os: z.string().max(100).optional(),
    equipment: z.string().max(100).optional(),
    comment: z.string().max(1000).optional(),
    port: z.coerce.number().min(1).max(65535).optional().or(z.literal("")),
    serviceName: z.string().max(50).optional(),
    protocol: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const ip = values.ipAddress?.trim() || "";
    const domain = values.domain?.trim() || "";
    if (!ip && !domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите IP или домен",
        path: ["ipAddress"],
      });
    }
    if (ip && !ipPattern.test(ip) && !(hostnamePattern.test(ip) || ip === "localhost")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Неверный формат IP адреса",
        path: ["ipAddress"],
      });
    }
    if (domain && !(hostnamePattern.test(domain) || domain === "localhost")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Неверный формат доменного имени",
        path: ["domain"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface AddHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    ipAddress: string;
    domain?: string;
    os?: string;
    equipment?: string;
    comment?: string;
    port?: number;
    serviceName?: string;
    protocol?: string;
  }) => void;
  isLoading?: boolean;
  editHost?: {
    id: string;
    ipAddress: string;
    domain: string | null;
    os: string | null;
    equipment: string | null;
    comment: string | null;
  } | null;
}

const osOptions = [
  "Windows",
  "Windows 11",
  "Windows 10",
  "Windows Server 2022",
  "Windows Server 2019",
  "Ubuntu 22.04",
  "Ubuntu 20.04",
  "Debian 12",
  "CentOS 8",
  "RHEL 9",
  "Linux",
  "macOS",
  "FreeBSD",
  "Неизвестно",
];

const equipmentOptions = [
  "Рабочая станция",
  "Сервер",
  "Роутер",
  "Коммутатор",
  "Файрвол",
  "Точка доступа",
  "IP телефон",
  "Принтер",
  "IoT устройство",
  "Виртуальная машина",
  "Неизвестно",
];

const serviceOptions = [
  "SSH",
  "HTTP",
  "HTTPS",
  "FTP",
  "SMB",
  "RDP",
  "DNS",
  "LDAP",
  "MySQL",
  "PostgreSQL",
  "MSSQL",
  "MongoDB",
  "Redis",
  "SIP",
  "VNC",
  "Telnet",
  "SNMP",
  "NFS",
  "Kerberos",
];

export function AddHostDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  editHost,
}: AddHostDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipAddress: editHost?.ipAddress || "",
      domain: editHost?.domain || "",
      os: editHost?.os || "",
      equipment: editHost?.equipment || "",
      comment: editHost?.comment || "",
      port: "" as any,
      serviceName: "",
      protocol: "TCP",
    },
  });

  useEffect(() => {
    if (editHost) {
      form.reset({
        ipAddress: editHost.ipAddress || "",
        domain: editHost.domain || "",
        os: editHost.os || "",
        equipment: editHost.equipment || "",
        comment: editHost.comment || "",
        port: "" as any,
        serviceName: "",
        protocol: "TCP",
      });
    } else {
      form.reset({
        ipAddress: "",
        domain: "",
        os: "",
        equipment: "",
        comment: "",
        port: "" as any,
        serviceName: "",
        protocol: "TCP",
      });
    }
  }, [editHost, form]);

  const handleSubmit = (values: FormValues) => {
    const rawIp = values.ipAddress?.trim() || "";
    const rawDomain = values.domain?.trim() || "";
    const ipLooksLikeDomain = rawIp && !ipPattern.test(rawIp);
    const resolvedDomain = rawDomain || (ipLooksLikeDomain ? rawIp : "");
    const resolvedIp = ipLooksLikeDomain ? "" : rawIp;
    onSubmit({
      ipAddress: resolvedIp,
      domain: resolvedDomain,
      os: values.os,
      equipment: values.equipment,
      comment: values.comment,
      port: typeof values.port === "number" ? values.port : undefined,
      serviceName: values.serviceName,
      protocol: values.protocol,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            {editHost ? "Редактировать запись" : "Добавить запись"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {editHost ? "Форма редактирования хоста и сервисов" : "Добавление нового хоста в проект"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP адрес (если известен)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="192.168.1.1" 
                        {...field}
                        className="font-mono"
                        disabled={!!editHost}
                        data-testid="input-host-ip"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порт</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="80"
                        {...field}
                        className="font-mono"
                        data-testid="input-port"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Домен</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com"
                      {...field}
                      className="font-mono"
                      data-testid="input-host-domain"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сервис</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-service">
                          <SelectValue placeholder="Выберите..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceOptions.map((svc) => (
                          <SelectItem key={svc} value={svc}>{svc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="protocol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Протокол</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "TCP"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-protocol">
                          <SelectValue placeholder="TCP" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="os"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ОС</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-host-os">
                          <SelectValue placeholder="Выберите..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {osOptions.map((os) => (
                          <SelectItem key={os} value={os}>{os}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Оборудование</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-host-equipment">
                          <SelectValue placeholder="Выберите..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipmentOptions.map((eq) => (
                          <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Заметки..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      data-testid="input-host-comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-submit-host"
              >
                {isLoading ? "Сохранение..." : (editHost ? "Сохранить" : "Добавить")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
