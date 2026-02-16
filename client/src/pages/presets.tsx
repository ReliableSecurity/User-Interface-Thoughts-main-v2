import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Zap, 
  Search,
  Clock,
  AlertTriangle,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Copy
} from "lucide-react";
import type { Preset, Tool, Project, InsertPreset } from "@shared/schema";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const riskColors: Record<string, string> = {
  safe: "bg-green-500/20 text-green-400 border-green-500/30",
  moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

const defaultPreset: Partial<InsertPreset> = {
  name: "",
  description: "",
  category: "Сканирование",
  subcategory: "",
  toolId: "",
  commandTemplate: "",
  riskLevel: "safe",
  estimatedTime: "",
  tags: [],
};

type ToolWithAvailability = Tool & { available?: boolean };

export default function PresetsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTool, setSelectedTool] = useState<string>("all");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<Partial<InsertPreset> & { id?: string }>(defaultPreset);
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: presets = [], isLoading } = useQuery<Preset[]>({
    queryKey: ["/api/presets"],
  });

  const { data: tools = [] } = useQuery<ToolWithAvailability[]>({
    queryKey: ["/api/tools"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPreset) => {
      const res = await apiRequest("POST", "/api/presets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Пресет создан" });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Ошибка создания пресета", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPreset> }) => {
      const res = await apiRequest("PATCH", `/api/presets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Пресет обновлён" });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Ошибка обновления пресета", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: "Пресет удалён" });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Ошибка удаления пресета", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    setCurrentPreset(defaultPreset);
    setIsEditing(false);
    setEditDialogOpen(true);
  };

  const handleEdit = (preset: Preset) => {
    setCurrentPreset({
      id: preset.id,
      name: preset.name,
      description: preset.description || "",
      category: preset.category,
      subcategory: preset.subcategory || "",
      toolId: preset.toolId || "",
      commandTemplate: preset.commandTemplate,
      riskLevel: preset.riskLevel || "safe",
      estimatedTime: preset.estimatedTime || "",
      tags: preset.tags || [],
    });
    setIsEditing(true);
    setEditDialogOpen(true);
  };

  const handleDuplicate = (preset: Preset) => {
    setCurrentPreset({
      name: `${preset.name} (копия)`,
      description: preset.description || "",
      category: preset.category,
      subcategory: preset.subcategory || "",
      toolId: preset.toolId || "",
      commandTemplate: preset.commandTemplate,
      riskLevel: preset.riskLevel || "safe",
      estimatedTime: preset.estimatedTime || "",
      tags: preset.tags || [],
    });
    setIsEditing(false);
    setEditDialogOpen(true);
  };

  const handleDelete = (preset: Preset) => {
    setCurrentPreset({ id: preset.id, name: preset.name });
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    const data: InsertPreset = {
      name: currentPreset.name || "",
      description: currentPreset.description || null,
      category: currentPreset.category || "Сканирование",
      subcategory: currentPreset.subcategory || null,
      toolId: currentPreset.toolId || null,
      commandTemplate: currentPreset.commandTemplate || "",
      riskLevel: currentPreset.riskLevel || "safe",
      estimatedTime: currentPreset.estimatedTime || null,
      tags: currentPreset.tags?.length ? currentPreset.tags : null,
    };

    if (isEditing && currentPreset.id) {
      updateMutation.mutate({ id: currentPreset.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleConfirmDelete = () => {
    if (currentPreset.id) {
      deleteMutation.mutate(currentPreset.id);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(presets.map(p => p.category));
    return Array.from(cats).sort();
  }, [presets]);

  const filteredPresets = useMemo(() => {
    return presets.filter(preset => {
      const matchesSearch = searchQuery === "" || 
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || preset.category === selectedCategory;
      const matchesTool = selectedTool === "all" || preset.toolId === selectedTool;
      
      return matchesSearch && matchesCategory && matchesTool;
    });
  }, [presets, searchQuery, selectedCategory, selectedTool]);

  const groupedPresets = useMemo(() => {
    const groups: Record<string, Preset[]> = {};
    filteredPresets.forEach(preset => {
      const key = `${preset.category} / ${preset.subcategory || 'Общее'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(preset);
    });
    return groups;
  }, [filteredPresets]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar
          projects={projects}
          selectedProjectId={null}
          onSelectProject={() => setLocation("/")}
          onCreateProject={() => setShowCreateProject(true)}
        />
        
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center gap-4 p-4 border-b border-border shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Пресеты команд</h1>
            </div>
            <Badge variant="secondary" className="ml-2">
              {filteredPresets.length} из {presets.length}
            </Badge>
            <div className="flex-1" />
            <Button onClick={handleCreate} data-testid="button-create-preset">
              <Plus className="w-4 h-4 mr-2" />
              Создать пресет
            </Button>
          </header>
          
          <div className="flex items-center gap-4 p-4 border-b border-border shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск пресетов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-presets"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-category">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTool} onValueChange={setSelectedTool}>
              <SelectTrigger className="w-[180px]" data-testid="select-tool">
                <SelectValue placeholder="Инструмент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все инструменты</SelectItem>
                {tools.map(tool => (
                  <SelectItem key={tool.id} value={tool.id} disabled={tool.available === false}>
                    {tool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <main className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Загрузка...</div>
              </div>
            ) : filteredPresets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-50" />
                <p>Пресеты не найдены</p>
                <Button variant="outline" className="mt-4" onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать первый пресет
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedPresets).map(([group, groupPresets]) => (
                  <div key={group}>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {group}
                      <Badge variant="outline" className="text-[10px]">{groupPresets.length}</Badge>
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupPresets.map((preset) => {
                        const tool = tools.find(t => t.id === preset.toolId);
                        return (
                          <Card key={preset.id} className="hover-elevate group" data-testid={`card-preset-${preset.id}`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-sm">{preset.name}</CardTitle>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7"
                                    onClick={() => handleDuplicate(preset)}
                                    data-testid={`button-duplicate-${preset.id}`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(preset)}
                                    data-testid={`button-edit-${preset.id}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(preset)}
                                    data-testid={`button-delete-${preset.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] w-fit ${riskColors[preset.riskLevel || 'safe']}`}
                              >
                                {preset.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {preset.riskLevel || 'safe'}
                              </Badge>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {preset.description}
                              </p>
                              <code className="block text-[10px] p-2 rounded bg-muted font-mono truncate">
                                {preset.commandTemplate}
                              </code>
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {tool?.name || 'Custom'}
                                  </Badge>
                                  {tool?.available === false && (
                                    <Badge variant="outline" className="text-[10px]">недоступен</Badge>
                                  )}
                                </div>
                                {preset.estimatedTime && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {preset.estimatedTime}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Редактировать пресет" : "Создать пресет"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Измените параметры пресета команды" : "Создайте новый пресет команды для сканирования"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={currentPreset.name || ""}
                  onChange={(e) => setCurrentPreset({ ...currentPreset, name: e.target.value })}
                  placeholder="Название пресета"
                  data-testid="input-preset-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool">Инструмент</Label>
                <Select
                  value={currentPreset.toolId || ""}
                  onValueChange={(value) => setCurrentPreset({ ...currentPreset, toolId: value })}
                >
                  <SelectTrigger data-testid="select-preset-tool">
                    <SelectValue placeholder="Выберите инструмент" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map(tool => (
                      <SelectItem key={tool.id} value={tool.id} disabled={tool.available === false}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={currentPreset.description || ""}
                onChange={(e) => setCurrentPreset({ ...currentPreset, description: e.target.value })}
                placeholder="Описание пресета"
                rows={2}
                data-testid="input-preset-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="command">Шаблон команды *</Label>
              <Textarea
                id="command"
                value={currentPreset.commandTemplate || ""}
                onChange={(e) => setCurrentPreset({ ...currentPreset, commandTemplate: e.target.value })}
                placeholder="nmap -sV -sC $IP"
                className="font-mono text-sm"
                rows={3}
                data-testid="input-preset-command"
              />
              <p className="text-xs text-muted-foreground">
                Используйте $IP для подстановки IP-адреса цели
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категория *</Label>
                <Select
                  value={currentPreset.category || "Сканирование"}
                  onValueChange={(value) => setCurrentPreset({ ...currentPreset, category: value })}
                >
                  <SelectTrigger data-testid="select-preset-category">
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Сканирование">Сканирование</SelectItem>
                    <SelectItem value="Разведка">Разведка</SelectItem>
                    <SelectItem value="Эксплуатация">Эксплуатация</SelectItem>
                    <SelectItem value="Веб">Веб</SelectItem>
                    <SelectItem value="Аутентификация">Аутентификация</SelectItem>
                    <SelectItem value="Криптография">Криптография</SelectItem>
                    <SelectItem value="Другое">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory">Подкатегория</Label>
                <Input
                  id="subcategory"
                  value={currentPreset.subcategory || ""}
                  onChange={(e) => setCurrentPreset({ ...currentPreset, subcategory: e.target.value })}
                  placeholder="Подкатегория"
                  data-testid="input-preset-subcategory"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="risk">Уровень риска</Label>
                <Select
                  value={currentPreset.riskLevel || "safe"}
                  onValueChange={(value) => setCurrentPreset({ ...currentPreset, riskLevel: value })}
                >
                  <SelectTrigger data-testid="select-preset-risk">
                    <SelectValue placeholder="Уровень риска" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">Безопасный</SelectItem>
                    <SelectItem value="moderate">Умеренный</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Время выполнения</Label>
                <Input
                  id="time"
                  value={currentPreset.estimatedTime || ""}
                  onChange={(e) => setCurrentPreset({ ...currentPreset, estimatedTime: e.target.value })}
                  placeholder="~5 мин"
                  data-testid="input-preset-time"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                value={(currentPreset.tags || []).join(", ")}
                onChange={(e) => setCurrentPreset({ 
                  ...currentPreset, 
                  tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="nmap, ports, scan"
                data-testid="input-preset-tags"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!currentPreset.name || !currentPreset.commandTemplate || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-preset"
            >
              {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пресет?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить пресет "{currentPreset.name}"? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onSubmit={() => setShowCreateProject(false)}
      />
    </SidebarProvider>
  );
}
