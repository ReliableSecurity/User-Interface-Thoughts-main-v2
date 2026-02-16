import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Play, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CommandHistoryItem {
  id: string;
  command: string;
  timestamp: number;
  success?: boolean;
  toolName?: string;
}

interface CommandHistoryProps {
  onSelectCommand: (command: string) => void;
}

const STORAGE_KEY = "pentest-command-history";
const MAX_HISTORY = 50;

export function getCommandHistory(): CommandHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToCommandHistory(command: string, toolName?: string, success?: boolean) {
  const history = getCommandHistory();
  const newItem: CommandHistoryItem = {
    id: crypto.randomUUID(),
    command,
    timestamp: Date.now(),
    success,
    toolName,
  };
  
  const filtered = history.filter(h => h.command !== command);
  const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("command-history-updated"));
}

export function clearCommandHistory() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("command-history-updated"));
}

export function CommandHistory({ onSelectCommand }: CommandHistoryProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadHistory = () => setHistory(getCommandHistory());
    loadHistory();
    
    window.addEventListener("command-history-updated", loadHistory);
    return () => window.removeEventListener("command-history-updated", loadHistory);
  }, []);

  const handleSelect = (command: string) => {
    onSelectCommand(command);
    setOpen(false);
  };

  const handleClear = () => {
    clearCommandHistory();
    setHistory([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString("ru-RU");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          data-testid="button-command-history"
        >
          <History className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              История команд
            </SheetTitle>
            {history.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive"
                data-testid="button-clear-history"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Очистить
              </Button>
            )}
          </div>
        </SheetHeader>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <History className="w-12 h-12 mb-2 opacity-50" />
            <p>История пуста</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-2 pr-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group p-3 rounded-md border border-border/50 hover:border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTime(item.timestamp)}
                      {item.success !== undefined && (
                        item.success ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )
                      )}
                    </div>
                    {item.toolName && (
                      <Badge variant="outline" className="text-xs">
                        {item.toolName}
                      </Badge>
                    )}
                  </div>
                  <code className="text-xs font-mono text-foreground/90 break-all line-clamp-3">
                    {item.command}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleSelect(item.command)}
                    data-testid={`button-use-command-${item.id}`}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Использовать
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
