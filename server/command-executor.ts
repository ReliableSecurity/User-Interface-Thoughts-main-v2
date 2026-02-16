import { spawn, spawnSync } from "child_process";

const ALLOWED_TOOLS = [
  // Network scanning
  "nmap", "masscan", "rustscan", "netcat", "nc", "hping3", "arping", "fping",
  // Web scanning
  "nuclei", "nikto", "wpscan", "whatweb", "wafw00f", "wapiti", "skipfish",
  // Directory/file discovery
  "ffuf", "gobuster", "dirb", "dirbuster", "feroxbuster", "wfuzz",
  // Subdomain enumeration
  "amass", "subfinder", "fierce", "dnsrecon", "dnsenum", "sublist3r",
  // SMB/AD enumeration
  "crackmapexec", "enum4linux", "smbclient", "rpcclient", "nbtscan", "smbmap", "ldapsearch",
  // SQL injection
  "sqlmap",
  // SSL/TLS testing
  "testssl.sh", "sslscan", "sslyze",
  // Password cracking
  "hydra", "john", "hashcat", "medusa", "ncrack", "patator",
  // Exploitation
  "searchsploit", "msfconsole", "msfvenom",
  // HTTP tools
  "httpx", "curl", "wget",
  // DNS tools
  "dig", "whois", "host", "nslookup", "dnsmap",
  // Wireless
  "aircrack-ng", "airodump-ng", "aireplay-ng", "wifite",
  // SNMP
  "snmpwalk", "snmpcheck", "onesixtyone",
  // Other reconnaissance
  "theHarvester", "recon-ng", "maltego", "spiderfoot",
  // Misc
  "tcpdump", "tshark", "netdiscover", "arp-scan", "p0f",
  // Hash tools
  "hash-identifier", "hashid",
  // Wordlist tools
  "cewl", "crunch",
  // VoIP
  "sipvicious", "svwar", "svcrack",
  // Web shells
  "weevely",
  // Bluetooth
  "hciconfig", "hcitool", "btscanner",
  // Password tools
  "responder", "bettercap",
  // OSINT
  "metagoofil", "exiftool",
];

const SHELL_INJECTION_PATTERNS = [
  /[;&|`]/,
  /\$\(/,
  /\$\{/,
  /\x00-\x1f/,
];

const toolAvailabilityCache = new Map<string, boolean>();

function isToolAvailable(tool: string): boolean {
  const cached = toolAvailabilityCache.get(tool);
  if (cached !== undefined) {
    return cached;
  }

  const result = spawnSync("sh", ["-c", `command -v ${tool}`], {
    stdio: "ignore",
  });
  const available = result.status === 0;
  toolAvailabilityCache.set(tool, available);
  return available;
}

export interface CommandResult {
  success: boolean;
  output: string;
  exitCode: number | null;
  error?: string;
}

function parseCommandTokens(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) return [];

  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    
    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
      } else {
        current += char;
      }
    } else if (inDoubleQuote) {
      if (char === '"') {
        inDoubleQuote = false;
      } else {
        current += char;
      }
    } else if (char === "'") {
      inSingleQuote = true;
    } else if (char === '"') {
      inDoubleQuote = true;
    } else if (char === " " || char === "\t") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    tokens.push(current);
  }
  
  return tokens;
}

export function validateCommand(command: string): { valid: boolean; tool?: string; error?: string } {
  if (!command || command.trim().length === 0) {
    return { valid: false, error: "Пустая команда" };
  }

  for (const pattern of SHELL_INJECTION_PATTERNS) {
    if (pattern.test(command)) {
      return { 
        valid: false, 
        error: "Команда содержит недопустимые символы оболочки" 
      };
    }
  }
  
  const tokens = parseCommandTokens(command);
  
  if (tokens.length === 0) {
    return { valid: false, error: "Пустая команда" };
  }
  
  const useSudo = tokens[0] === "sudo";
  const toolIndex = useSudo ? 1 : 0;
  const tool = tokens[toolIndex];
  
  if (!tool) {
    return { valid: false, error: "Не указан инструмент после sudo" };
  }

  if (useSudo && !isToolAvailable("sudo")) {
    return {
      valid: false,
      error: "Команда sudo недоступна в текущем окружении",
      tool,
    };
  }

  if (!ALLOWED_TOOLS.includes(tool)) {
    return { 
      valid: false, 
      error: `Инструмент '${tool}' не входит в список разрешённых (${ALLOWED_TOOLS.length} инструментов)`,
      tool 
    };
  }

  if (!isToolAvailable(tool)) {
    return {
      valid: false,
      error: `Инструмент '${tool}' не установлен в среде выполнения`,
      tool,
    };
  }

  return { valid: true, tool };
}

function parseCommand(command: string): { executable: string; args: string[] } | null {
  const tokens = parseCommandTokens(command);
  if (tokens.length === 0) return null;
  
  const useSudo = tokens[0] === "sudo";
  
  if (useSudo) {
    return {
      executable: "sudo",
      args: tokens.slice(1),
    };
  }
  
  return {
    executable: tokens[0],
    args: tokens.slice(1),
  };
}

export async function executeCommand(command: string, timeout: number = 300000): Promise<CommandResult> {
  const validation = validateCommand(command);
  
  if (!validation.valid) {
    return {
      success: false,
      output: "",
      exitCode: null,
      error: validation.error,
    };
  }

  const parsed = parseCommand(command);
  if (!parsed) {
    return {
      success: false,
      output: "",
      exitCode: null,
      error: "Ошибка парсинга команды",
    };
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    let output = "";
    let errorOutput = "";

    const { executable, args } = parsed;
    
    const proc = spawn(executable, args, {
      env: { ...process.env, TERM: "xterm-256color" },
      shell: false,
    });

    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill("SIGKILL");
          }
        }, 5000);
        resolve({
          success: false,
          output: output + "\n[TIMEOUT] Команда прервана по таймауту",
          exitCode: null,
          error: `Таймаут после ${timeout / 1000} секунд`,
        });
      }, timeout);
    }

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      const fullOutput = output + (errorOutput ? `\n[STDERR]\n${errorOutput}` : "");
      
      resolve({
        success: code === 0,
        output: `[Время выполнения: ${duration}s]\n${fullOutput}`,
        exitCode: code,
        error: code !== 0 ? `Код выхода: ${code}` : undefined,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: output,
        exitCode: null,
        error: `Ошибка запуска: ${err.message}`,
      });
    });
  });
}

export function getAllowedTools(): string[] {
  return ALLOWED_TOOLS.filter(isToolAvailable);
}
