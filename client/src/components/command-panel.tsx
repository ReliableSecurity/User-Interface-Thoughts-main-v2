import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Square, 
  Clock, 
  Terminal,
  Zap,
  FileText,
} from "lucide-react";
import { CommandHistory, addToCommandHistory } from "./command-history";
import type { Tool, Preset, Scan, Host } from "@shared/schema";

type CommandVariable = "$IP" | "$Service+$IP";

const COMMAND_VARIABLES: Record<CommandVariable, (hosts: Host[]) => string> = {
  "$IP": (hosts) => hosts.map((h) => h.ipAddress).join(" "),
  "$Service+$IP": (hosts) => hosts.map((h) => h.ipAddress).join(","),
};

function replaceCommandVariables(template: string, hosts: Host[]): string {
  let result = template;
  (Object.entries(COMMAND_VARIABLES) as [CommandVariable, (hosts: Host[]) => string][]).forEach(
    ([variable, replacer]) => {
      result = result.replace(new RegExp(variable.replace(/[+$]/g, "\\$&"), "g"), replacer(hosts));
    }
  );
  return result;
}

type ToolWithAvailability = Tool & { available?: boolean };

interface CommandPanelProps {
  tools: ToolWithAvailability[];
  presets: Preset[];
  selectedHosts: Host[];
  activeScan: Scan | null;
  onRunCommand: (command: string, toolId?: string, presetId?: string) => void;
  onStopScan: () => void;
}

export function CommandPanel({
  tools,
  presets,
  selectedHosts,
  activeScan,
  onRunCommand,
  onStopScan,
}: CommandPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customCommand, setCustomCommand] = useState("");
  const [activeTab, setActiveTab] = useState("presets");
  const [editableCommand, setEditableCommand] = useState("");

  const selectedToolObj = tools.find((t) => t.id === selectedTool);
  const selectedPresetObj = presets.find((p) => p.id === selectedPreset);

  useEffect(() => {
    if (selectedTool && !selectedToolObj) {
      setSelectedTool("");
    }
  }, [selectedTool, selectedToolObj]);

  useEffect(() => {
    if (selectedPreset && !selectedPresetObj) {
      setSelectedPreset("");
    }
  }, [selectedPreset, selectedPresetObj]);

  const generateCommandFromSource = (): string => {
    if (activeTab === "custom" && customCommand) {
      return replaceCommandVariables(customCommand, selectedHosts);
    }

    if (selectedPresetObj?.commandTemplate) {
      return replaceCommandVariables(selectedPresetObj.commandTemplate, selectedHosts);
    }

    if (selectedToolObj?.commandTemplate) {
      return replaceCommandVariables(selectedToolObj.commandTemplate, selectedHosts);
    }

    return "";
  };

  useEffect(() => {
    const baseCommand = generateCommandFromSource();
    if (baseCommand) {
      setEditableCommand(baseCommand);
    } else {
      setEditableCommand("");
    }
  }, [selectedPreset, selectedTool, customCommand, activeTab, selectedHosts]);

  const handleRun = () => {
    if (editableCommand && !editableCommand.startsWith("#")) {
      const toolName = selectedToolObj?.name || selectedPresetObj?.name;
      addToCommandHistory(editableCommand, toolName);
      onRunCommand(editableCommand, selectedToolObj?.id, selectedPresetObj?.id);
    }
  };

  const handleSelectFromHistory = (command: string) => {
    setEditableCommand(command);
    setActiveTab("custom");
  };

  const isRunning = activeScan?.status === "running";
  const progress = activeScan?.progress || 0;
  const totalTargets = activeScan?.totalTargets || 0;

  const presetsByCategory = presets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, Preset[]>);

  return (
    <Card className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] border-card-border overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Командный центр</span>
        </div>
        <div className="flex items-center gap-1">
          {selectedHosts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedHosts.length} хост{selectedHosts.length === 1 ? "" : selectedHosts.length < 5 ? "а" : "ов"}
            </Badge>
          )}
          <CommandHistory onSelectCommand={handleSelectFromHistory} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-card-border bg-transparent px-3">
          <TabsTrigger value="presets" className="gap-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Zap className="w-3 h-3" />
            Пресеты
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Terminal className="w-3 h-3" />
            Инструменты
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <FileText className="w-3 h-3" />
            Своя команда
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {activeTab === "presets" && (
            <ScrollArea className="h-full p-3">
              <div className="space-y-4">
                {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                  <div key={category}>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                      {category}
                    </Label>
                    <div className="grid gap-2">
                      {categoryPresets.map((preset) => (
                        <Button
                          key={preset.id}
                          variant={selectedPreset === preset.id ? "secondary" : "outline"}
                          className="justify-start h-auto py-2 px-3"
                          onClick={() => setSelectedPreset(preset.id)}
                          data-testid={`button-preset-${preset.id}`}
                        >
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-xs font-medium">{preset.name}</span>
                            {preset.description && (
                              <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(presetsByCategory).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Нет доступных пресетов
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {activeTab === "tools" && (
            <ScrollArea className="h-full p-3">
              <div className="space-y-2">
                <Label className="text-xs">Выберите инструмент</Label>
                <Select value={selectedTool} onValueChange={setSelectedTool}>
                  <SelectTrigger data-testid="select-tool">
                    <SelectValue placeholder="Выберите инструмент..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id} disabled={tool.available === false}>
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3 h-3" />
                          {tool.name}
                          {tool.isBuiltIn && (
                            <Badge variant="outline" className="text-[10px] ml-2">встроенный</Badge>
                          )}
                          {tool.available === false && (
                            <Badge variant="secondary" className="text-[10px] ml-2">недоступен</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedToolObj && (
                  <div className="mt-4 p-3 rounded-md bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Описание</div>
                    <div className="text-sm">{selectedToolObj.description || "Нет описания"}</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {activeTab === "custom" && (
            <ScrollArea className="h-full p-3">
              <div className="space-y-2">
                <Label className="text-xs">Своя команда</Label>
                <Textarea
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="nmap -p- $IP&#10;nuclei -u $Service+$IP"
                  className="min-h-[100px] font-mono text-sm resize-none"
                  data-testid="textarea-custom-command"
                />
                <div className="text-[10px] text-muted-foreground">
                  Переменные: $IP (IP адреса), $Service+$IP (сервис с IP)
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </Tabs>

      <div className="border-t border-card-border p-3 space-y-3 shrink-0 bg-card">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Команда для запуска (редактируемая)</Label>
            <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">
              root
            </Badge>
          </div>
          <Textarea
            value={editableCommand || "# Выберите пресет или введите команду"}
            onChange={(e) => setEditableCommand(e.target.value)}
            className="min-h-[80px] font-mono text-xs bg-background resize-none"
            placeholder="# Выберите пресет или введите команду"
            data-testid="textarea-editable-command"
          />
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-mono">{progress} / {totalTargets}</span>
            </div>
            <Progress value={(progress / totalTargets) * 100} className="h-1.5" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Расчёт времени...</span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {isRunning ? (
            <Button 
              variant="destructive" 
              className="flex-1 gap-1" 
              onClick={onStopScan}
              data-testid="button-stop-scan"
            >
              <Square className="w-3 h-3" />
              Стоп
            </Button>
          ) : (
            <Button
              className="flex-1 gap-1"
              onClick={handleRun}
              disabled={selectedHosts.length === 0}
              data-testid="button-run-command"
            >
              <Play className="w-3 h-3" />
              Запуск
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
