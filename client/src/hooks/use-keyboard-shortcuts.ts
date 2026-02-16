import { useEffect, useCallback } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (isInput && !shortcut.ctrl && !shortcut.meta) {
            continue;
          }
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

export function useGlobalShortcuts({
  onNewHost,
  onSearch,
  onExport,
  onRefresh,
  onDelete,
  enabled = true,
}: {
  onNewHost?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: Shortcut[] = [];

  if (onNewHost) {
    shortcuts.push({
      key: "n",
      ctrl: true,
      handler: onNewHost,
      description: "Добавить хост",
    });
  }

  if (onSearch) {
    shortcuts.push({
      key: "k",
      ctrl: true,
      handler: onSearch,
      description: "Поиск",
    });
  }

  if (onExport) {
    shortcuts.push({
      key: "e",
      ctrl: true,
      handler: onExport,
      description: "Экспорт",
    });
  }

  if (onRefresh) {
    shortcuts.push({
      key: "r",
      ctrl: true,
      handler: onRefresh,
      description: "Обновить",
    });
  }

  if (onDelete) {
    shortcuts.push({
      key: "Delete",
      handler: onDelete,
      description: "Удалить выбранное",
    });
  }

  useKeyboardShortcuts(shortcuts, enabled);
}
