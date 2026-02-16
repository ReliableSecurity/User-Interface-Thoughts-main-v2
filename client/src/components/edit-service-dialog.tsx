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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceWithHost } from "@shared/schema";

const formSchema = z.object({
  port: z.coerce.number().min(1).max(65535),
  protocol: z.string().min(1),
  serviceName: z.string().optional(),
  comment: z.string().optional(),
  rawOutput: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithHost | null;
  onSubmit: (data: FormData) => void;
  isPending?: boolean;
}

export function EditServiceDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  isPending,
}: EditServiceDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      port: 80,
      protocol: "TCP",
      serviceName: "",
      comment: "",
      rawOutput: "",
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        port: service.port,
        protocol: service.protocol,
        serviceName: service.serviceName || "",
        comment: service.comment || "",
        rawOutput: service.rawOutput || "",
      });
    }
  }, [service, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service ? `Редактирование: ${service.host.ipAddress}:${service.port}` : "Редактирование"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Редактирование параметров сервиса
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Порт</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        data-testid="input-port"
                      />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-protocol">
                          <SelectValue placeholder="Выберите протокол" />
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

            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сервис</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SSH, HTTP, SMB..."
                      {...field}
                      data-testid="input-service-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Заметки по сервису..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rawOutput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Результат сканирования</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Сырой вывод сканера..."
                      className="resize-none font-mono text-xs"
                      rows={5}
                      {...field}
                      data-testid="input-raw-output"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-service">
                {isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
