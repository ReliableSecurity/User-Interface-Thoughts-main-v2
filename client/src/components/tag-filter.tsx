import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Host } from "@shared/schema";

interface TagFilterProps {
  hosts: Host[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const TAG_COLORS = [
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-green-500/20 text-green-400 border-green-500/30",
  "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagFilter({ hosts, selectedTags, onTagsChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    hosts.forEach((host) => {
      (host.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [hosts]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Tag className="w-4 h-4" />
            Теги
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground px-1">
              Фильтр по тегам
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const hostCount = hosts.filter((h) =>
                    (h.tags || []).includes(tag)
                  ).length;
                  return (
                    <Button
                      key={tag}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-between h-8",
                        isSelected && "bg-muted"
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <Badge variant="outline" className={cn("text-xs", getTagColor(tag))}>
                          {tag}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{hostCount}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={clearTags}
              >
                <X className="w-3 h-3 mr-1" />
                Сбросить фильтр
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={cn("text-xs cursor-pointer", getTagColor(tag))}
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
}

export function TagInput({ tags, onChange, availableTags = [] }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!inputValue) return [];
    const lower = inputValue.toLowerCase();
    return availableTags
      .filter((t) => t.toLowerCase().includes(lower) && !tags.includes(t))
      .slice(0, 5);
  }, [inputValue, availableTags, tags]);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-[32px]">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={cn("text-xs cursor-pointer", getTagColor(tag))}
            onClick={() => removeTag(tag)}
          >
            {tag}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Добавить тег..."
          className="h-8 text-sm"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8"
                onClick={() => addTag(suggestion)}
              >
                <Plus className="w-3 h-3 mr-2" />
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
