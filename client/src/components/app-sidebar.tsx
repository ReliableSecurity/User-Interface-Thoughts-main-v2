import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderKanban, 
  Plus, 
  Network, 
  Layers,
  Zap,
  Shield
} from "lucide-react";
import type { Project } from "@shared/schema";

interface AppSidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  isLoading?: boolean;
}

export function AppSidebar({ 
  projects, 
  selectedProjectId, 
  onSelectProject,
  onCreateProject,
  isLoading 
}: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/20">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">PenTest</span>
            <span className="text-xs text-muted-foreground">Сканер сети</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5" />
              Проекты
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-5 w-5"
              onClick={onCreateProject}
              data-testid="button-create-project"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                  Загрузка...
                </div>
              ) : projects.length === 0 ? (
                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                  Нет проектов
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton 
                      isActive={selectedProjectId === project.id}
                      onClick={() => onSelectProject(project.id)}
                      data-testid={`button-project-${project.id}`}
                    >
                      <Network className="w-4 h-4" />
                      <span className="truncate">{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Настройки
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/presets">
                    <Zap className="w-4 h-4" />
                    <span>Пресеты команд</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">v1.0</Badge>
          <span>Сканер сети</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
