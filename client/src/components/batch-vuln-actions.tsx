import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  ChevronDown,
  Loader2
} from "lucide-react";
import type { VulnStatus } from "@shared/schema";

interface BatchVulnActionsProps {
  selectedIds: string[];
  onBatchUpdate: (ids: string[], status: VulnStatus) => Promise<void>;
  onClearSelection: () => void;
}

export function BatchVulnActions({ 
  selectedIds, 
  onBatchUpdate, 
  onClearSelection 
}: BatchVulnActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (selectedIds.length === 0) return null;

  const handleStatusChange = async (status: VulnStatus) => {
    setIsUpdating(true);
    try {
      await onBatchUpdate(selectedIds, status);
      onClearSelection();
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions: { value: VulnStatus; label: string; icon: typeof CheckCircle; color: string }[] = [
    { value: "open", label: "Открыта", icon: AlertTriangle, color: "text-yellow-500" },
    { value: "confirmed", label: "Подтверждена", icon: Shield, color: "text-red-500" },
    { value: "fixed", label: "Исправлена", icon: CheckCircle, color: "text-green-500" },
    { value: "false_positive", label: "Ложная", icon: XCircle, color: "text-gray-500" },
    { value: "accepted", label: "Принята", icon: Shield, color: "text-blue-500" },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
      <Badge variant="secondary">
        Выбрано: {selectedIds.length}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isUpdating} data-testid="button-batch-status">
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Изменить статус
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {statusOptions.map((option) => (
            <DropdownMenuItem 
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              data-testid={`batch-status-${option.value}`}
            >
              <option.icon className={`w-4 h-4 mr-2 ${option.color}`} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClearSelection}
        data-testid="button-clear-selection"
      >
        Отменить выбор
      </Button>
    </div>
  );
}
