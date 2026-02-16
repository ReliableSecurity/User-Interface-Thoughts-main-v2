import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Scan,
  Bug,
  Plus,
  Trash,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityType =
  | "host_added"
  | "host_deleted"
  | "service_added"
  | "service_updated"
  | "scan_started"
  | "scan_completed"
  | "vuln_found"
  | "vuln_fixed"
  | "vulnerability_added"
  | "vulnerability_updated"
  | "import";

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, string | number>;
}

interface ActivityTimelineProps {
  activities: Activity[];
  maxItems?: number;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: typeof Server; color: string; label: string }
> = {
  host_added: {
    icon: Plus,
    color: "text-green-400 bg-green-500/20",
    label: "Хост добавлен",
  },
  host_deleted: {
    icon: Trash,
    color: "text-red-400 bg-red-500/20",
    label: "Хост удален",
  },
  service_added: {
    icon: Server,
    color: "text-cyan-400 bg-cyan-500/20",
    label: "Сервис добавлен",
  },
  service_updated: {
    icon: Edit,
    color: "text-blue-400 bg-blue-500/20",
    label: "Сервис обновлен",
  },
  scan_started: {
    icon: Scan,
    color: "text-yellow-400 bg-yellow-500/20",
    label: "Скан запущен",
  },
  scan_completed: {
    icon: CheckCircle,
    color: "text-green-400 bg-green-500/20",
    label: "Скан завершен",
  },
  vuln_found: {
    icon: AlertTriangle,
    color: "text-orange-400 bg-orange-500/20",
    label: "Уязвимость найдена",
  },
  vuln_fixed: {
    icon: CheckCircle,
    color: "text-green-400 bg-green-500/20",
    label: "Уязвимость исправлена",
  },
  vulnerability_added: {
    icon: Bug,
    color: "text-red-400 bg-red-500/20",
    label: "Уязвимость добавлена",
  },
  vulnerability_updated: {
    icon: Edit,
    color: "text-orange-400 bg-orange-500/20",
    label: "Уязвимость обновлена",
  },
  import: {
    icon: Plus,
    color: "text-purple-400 bg-purple-500/20",
    label: "Импорт данных",
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} дн. назад`;
  if (hours > 0) return `${hours} ч. назад`;
  if (minutes > 0) return `${minutes} мин. назад`;
  return "только что";
}

export function ActivityTimeline({
  activities,
  maxItems = 20,
}: ActivityTimelineProps) {
  const sortedActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [activities, maxItems]);

  if (sortedActivities.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет активности</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="relative pl-6 pr-2">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {sortedActivities.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type];
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex gap-3">
                <div
                  className={cn(
                    "absolute -left-4 w-6 h-6 rounded-full flex items-center justify-center",
                    config.color
                  )}
                >
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{activity.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

const ACTIVITY_STORAGE_KEY = "pentest_activities";
const MAX_STORED_ACTIVITIES = 100;

export function useActivityLog() {
  const getActivities = (): Activity[] => {
    try {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((a: Activity & { timestamp: string }) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      }));
    } catch {
      return [];
    }
  };

  const addActivity = (
    type: ActivityType,
    title: string,
    description?: string,
    metadata?: Record<string, string | number>
  ) => {
    const activities = getActivities();
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      title,
      description,
      timestamp: new Date(),
      metadata,
    };
    const updated = [newActivity, ...activities].slice(0, MAX_STORED_ACTIVITIES);
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
    return newActivity;
  };

  const clearActivities = () => {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  };

  return { getActivities, addActivity, clearActivities };
}
