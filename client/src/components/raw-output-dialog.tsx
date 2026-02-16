import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ServiceWithHost } from "@shared/schema";

interface RawOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceWithHost | null;
}

export function RawOutputDialog({
  open,
  onOpenChange,
  service,
}: RawOutputDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (service?.rawOutput) {
      navigator.clipboard.writeText(service.rawOutput);
      toast({ title: "Скопировано в буфер обмена" });
    }
  };

  const handleDownload = () => {
    if (service?.rawOutput) {
      const blob = new Blob([service.rawOutput], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${service.host.ipAddress}_${service.port}_${service.serviceName || "output"}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Результат сканирования: {service?.host.ipAddress}:{service?.port} ({service?.serviceName})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />
                Копировать
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Скачать
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Сырой вывод результатов сканирования сервиса
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto max-h-[60vh] rounded-md border border-border bg-background/50 p-4">
          <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
            {service?.rawOutput || "Нет данных"}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
