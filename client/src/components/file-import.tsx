import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (content: string, fileName: string) => void;
}

export function FileImport({ open, onOpenChange, onImport }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file: File) => {
    setError(null);
    const validExtensions = [".xml", ".json", ".txt", ".log", ".nmap"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext) && !file.type.includes("text") && !file.type.includes("json") && !file.type.includes("xml")) {
      setError("Поддерживаемые форматы: XML, JSON, TXT, LOG");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Максимальный размер файла: 10 МБ");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFile(file);
      setContent(text);
    };
    reader.onerror = () => {
      setError("Ошибка чтения файла");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        processFile(droppedFile);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    [processFile]
  );

  const handleImport = useCallback(() => {
    if (file && content) {
      onImport(content, file.name);
      setFile(null);
      setContent("");
      setError(null);
      onOpenChange(false);
    }
  }, [file, content, onImport, onOpenChange]);

  const handleClear = useCallback(() => {
    setFile(null);
    setContent("");
    setError(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Импорт результатов сканирования</DialogTitle>
          <DialogDescription>
            Загрузите файл с результатами сканирования (nmap XML, JSON, текстовый вывод)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Upload
                className={cn(
                  "w-12 h-12 mx-auto mb-4",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm text-muted-foreground mb-2">
                Перетащите файл сюда или
              </p>
              <label>
                <input
                  type="file"
                  className="hidden"
                  accept=".xml,.json,.txt,.log,.nmap"
                  onChange={handleFileSelect}
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Выбрать файл</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Поддерживаемые форматы: nmap XML, JSON, TXT, LOG
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <FileText className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} КБ • {content.split("\n").length} строк
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleImport} disabled={!file || !content}>
              <Check className="w-4 h-4 mr-2" />
              Импортировать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
