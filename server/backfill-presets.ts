import { eq } from "drizzle-orm";
import { db } from "./db";
import { presets, tools } from "@shared/schema";

const inferPresetOutputType = (preset: {
  category?: string | null;
  subcategory?: string | null;
  commandTemplate?: string | null;
  outputType?: string | null;
}) => {
  if (preset.outputType) {
    return preset.outputType;
  }
  const category = (preset.category || "").toLowerCase();
  const subcategory = (preset.subcategory || "").toLowerCase();
  const command = (preset.commandTemplate || "").toLowerCase();
  const vulnKeywords = ["уязв", "cve", "vuln", "exploit"];
  const vulnCommandMarkers = [
    "cves/",
    "network/cves/",
    "exposed-panels/",
    "default-logins/",
    "misconfiguration/",
    "takeovers/",
    "exposures/files/",
    "exposures/tokens/",
    "-severity",
    "--vuln",
    "vuln",
    "exploit",
  ];

  if (vulnKeywords.some((k) => category.includes(k) || subcategory.includes(k))) {
    return "vuln";
  }

  if (command.includes("nuclei") && vulnCommandMarkers.some((marker) => command.includes(marker))) {
    return "vuln";
  }
  if (command.includes("nikto")) {
    return "vuln";
  }
  if (command.includes("testssl") && command.includes("--vuln")) {
    return "vuln";
  }
  if (command.includes("sqlmap") && (command.includes("sqli") || command.includes("inject") || command.includes("vuln"))) {
    return "vuln";
  }
  if (command.includes("wpscan") && (command.includes("--enumerate v") || command.includes("--api-token"))) {
    return "vuln";
  }

  return preset.outputType || "raw";
};

export async function backfillPresets() {
  const presetList = await db.select().from(presets);
  const toolList = await db.select().from(tools);

  const normalizeNucleiTemplates = (commandTemplate: string) => {
    let next = commandTemplate;

    const absolutePathPatterns: Array<[RegExp, string]> = [
      [/(-t\s+)[^ ]*\/http\/cves\/?/g, "$1http/cves/"],
      [/(-t\s+)[^ ]*\/network\/cves\/?/g, "$1network/cves/"],
      [/(-t\s+)[^ ]*\/http\/exposed-panels\/?/g, "$1http/exposed-panels/"],
      [/(-t\s+)[^ ]*\/http\/default-logins\/?/g, "$1http/default-logins/"],
      [/(-t\s+)[^ ]*\/http\/misconfiguration\/?/g, "$1http/misconfiguration/"],
      [/(-t\s+)[^ ]*\/http\/takeovers\/?/g, "$1http/takeovers/"],
      [/(-t\s+)[^ ]*\/http\/exposures\/files\/?/g, "$1http/exposures/files/"],
      [/(-t\s+)[^ ]*\/http\/exposures\/tokens\/?/g, "$1http/exposures/tokens/"],
      [/(-t\s+)[^ ]*\/nuclei-templates\/?/g, "$1."],
    ];

    for (const [pattern, replacement] of absolutePathPatterns) {
      next = next.replace(pattern, replacement);
    }

    next = next.replace(/-t\s+cves\//g, "-t http/cves/");
    next = next.replace(/-t\s+exposed-panels\//g, "-t http/exposed-panels/");
    next = next.replace(/-t\s+default-logins\//g, "-t http/default-logins/");
    next = next.replace(/-t\s+misconfiguration\//g, "-t http/misconfiguration/");
    next = next.replace(/-t\s+takeovers\//g, "-t http/takeovers/");
    next = next.replace(/-t\s+exposures\/files\//g, "-t http/exposures/files/");
    next = next.replace(/-t\s+exposures\/tokens\//g, "-t http/exposures/tokens/");
    next = next.replace(/-t\s+network\/cves\//g, "-t network/cves/");

    next = next.replace(/-t\s+\.(\/)?/g, "");

    if (!/(\s|^)nuclei(\s|$)/.test(next)) {
      return next;
    }
    if (!next.includes("-no-color")) {
      next = `${next.trim()} -no-color`;
    }

    return next;
  };

  for (const tool of toolList) {
    let nextTemplate: string | null = null;

    if (tool.name === "httpx" && tool.commandTemplate?.includes("httpx -u ")) {
      nextTemplate = tool.commandTemplate.replace(/httpx\s+-u\s+/g, "httpx ");
    }

    if (tool.name === "nuclei" && tool.commandTemplate?.includes("nuclei")) {
      nextTemplate = normalizeNucleiTemplates(tool.commandTemplate);
    }

    if (nextTemplate && nextTemplate !== tool.commandTemplate) {
      await db.update(tools).set({ commandTemplate: nextTemplate }).where(eq(tools.id, tool.id));
    }
  }

  for (const preset of presetList) {
    let nextCommandTemplate = preset.commandTemplate || null;

    if (nextCommandTemplate?.includes("httpx -u ")) {
      nextCommandTemplate = nextCommandTemplate.replace(/httpx\s+-u\s+/g, "httpx ");
    }

    if (nextCommandTemplate?.includes("nuclei")) {
      nextCommandTemplate = normalizeNucleiTemplates(nextCommandTemplate);
    }

    if (nextCommandTemplate !== preset.commandTemplate) {
      await db.update(presets).set({ commandTemplate: nextCommandTemplate }).where(eq(presets.id, preset.id));
    }

    if (preset.outputType && preset.outputType !== "raw") {
      continue;
    }
    const inferred = inferPresetOutputType({
      ...preset,
      outputType: preset.outputType === "raw" ? null : preset.outputType,
    });
    if (inferred !== preset.outputType) {
      await db.update(presets).set({ outputType: inferred }).where(eq(presets.id, preset.id));
    }
  }
}
