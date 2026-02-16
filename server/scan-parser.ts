export interface ParsedService {
  ip: string;
  hostname?: string;
  port: number;
  protocol: string;
  state: string;
  service: string;
  version?: string;
  product?: string;
  extraInfo?: string;
  osMatch?: string;
  scripts?: Array<{ name: string; output: string }>;
}

export interface ParsedHost {
  ip: string;
  hostname?: string;
  state: string;
  os?: string;
  services: ParsedService[];
}

export interface ParsedScanResult {
  scanner: string;
  scanType: string;
  startTime?: string;
  endTime?: string;
  hosts: ParsedHost[];
  rawOutput: string;
}

function isValidIp(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

function isValidHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(value);
}

export function parseNmapText(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nmap",
    scanType: "text",
    hosts: [],
    rawOutput: output,
  };

  const lines = output.split("\n");
  let currentHost: ParsedHost | null = null;
  let currentIP = "";

  for (const line of lines) {
    const scanReportMatch = line.match(/^Nmap scan report for (.+)$/);
    if (scanReportMatch) {
      if (currentHost) {
        result.hosts.push(currentHost);
      }
      const target = scanReportMatch[1].trim();
      let hostname: string | undefined;
      let ip: string | undefined;

      const hostWithIpMatch = target.match(/^(.+?) \(([\d.]+)\)$/);
      if (hostWithIpMatch) {
        hostname = hostWithIpMatch[1];
        ip = hostWithIpMatch[2];
      } else if (isValidIp(target)) {
        ip = target;
      } else {
        hostname = target;
      }

      currentIP = ip || hostname || target;
      currentHost = {
        ip: currentIP,
        hostname: hostname,
        state: "up",
        services: [],
      };
      continue;
    }

    const hostDownMatch = line.match(/Host seems down/i);
    if (hostDownMatch && currentHost) {
      currentHost.state = "down";
      continue;
    }

    const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\S+)\s+(\S+)(?:\s+(.*))?$/);
    if (portMatch && currentHost) {
      const [, port, protocol, state, service, versionInfo] = portMatch;
      
      let version = "";
      let product = "";
      let extraInfo = "";
      
      if (versionInfo) {
        const versionMatch = versionInfo.match(/^(\S+)(?:\s+(.*))?$/);
        if (versionMatch) {
          product = versionMatch[1] || "";
          const rest = versionMatch[2] || "";
          const verNumMatch = rest.match(/(\d+[\d.]*)/);
          if (verNumMatch) {
            version = verNumMatch[1];
          }
          extraInfo = rest;
        }
      }
      
      currentHost.services.push({
        ip: currentIP,
        hostname: currentHost.hostname,
        port: parseInt(port, 10),
        protocol,
        state,
        service,
        version: version || undefined,
        product: product || undefined,
        extraInfo: extraInfo || undefined,
      });
      continue;
    }

    const osMatch = line.match(/OS details?:\s*(.+)/i);
    if (osMatch && currentHost) {
      currentHost.os = osMatch[1].trim();
      continue;
    }

    const aggressiveOsMatch = line.match(/Running:\s*(.+)/i);
    if (aggressiveOsMatch && currentHost && !currentHost.os) {
      currentHost.os = aggressiveOsMatch[1].trim();
      continue;
    }
  }

  if (currentHost) {
    result.hosts.push(currentHost);
  }

  return result;
}

export function parseNmapXML(xmlContent: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nmap",
    scanType: "xml",
    hosts: [],
    rawOutput: xmlContent,
  };

  const hostMatches = xmlContent.matchAll(/<host[^>]*>([\s\S]*?)<\/host>/g);
  
  for (const hostMatch of hostMatches) {
    const hostContent = hostMatch[1];
    
    const addrMatch = hostContent.match(/<address addr="([^"]+)" addrtype="ipv4"/);
    if (!addrMatch) continue;
    
    const ip = addrMatch[1];
    
    const hostnameMatch = hostContent.match(/<hostname name="([^"]+)"/);
    const hostname = hostnameMatch ? hostnameMatch[1] : undefined;
    
    const statusMatch = hostContent.match(/<status state="([^"]+)"/);
    const state = statusMatch ? statusMatch[1] : "unknown";
    
    const osMatchResult = hostContent.match(/<osmatch name="([^"]+)"/);
    const os = osMatchResult ? osMatchResult[1] : undefined;
    
    const host: ParsedHost = {
      ip,
      hostname,
      state,
      os,
      services: [],
    };
    
    const portMatches = hostContent.matchAll(/<port protocol="([^"]+)" portid="(\d+)">([\s\S]*?)<\/port>/g);
    
    for (const portMatch of portMatches) {
      const [, protocol, portId, portContent] = portMatch;
      
      const stateMatch = portContent.match(/<state state="([^"]+)"/);
      const portState = stateMatch ? stateMatch[1] : "unknown";
      
      const serviceMatch = portContent.match(/<service name="([^"]*)"(?:[^>]*product="([^"]*)")?(?:[^>]*version="([^"]*)")?(?:[^>]*extrainfo="([^"]*)")?/);
      
      const serviceName = serviceMatch ? serviceMatch[1] : "unknown";
      const product = serviceMatch ? serviceMatch[2] : undefined;
      const version = serviceMatch ? serviceMatch[3] : undefined;
      const extraInfo = serviceMatch ? serviceMatch[4] : undefined;
      
      const scripts: Array<{ name: string; output: string }> = [];
      const scriptMatches = portContent.matchAll(/<script id="([^"]+)" output="([^"]*)"/g);
      for (const scriptMatch of scriptMatches) {
        scripts.push({
          name: scriptMatch[1],
          output: scriptMatch[2].replace(/&#xa;/g, "\n").replace(/&quot;/g, '"'),
        });
      }
      
      host.services.push({
        ip,
        hostname,
        port: parseInt(portId, 10),
        protocol,
        state: portState,
        service: serviceName,
        version,
        product,
        extraInfo,
        osMatch: os,
        scripts: scripts.length > 0 ? scripts : undefined,
      });
    }
    
    result.hosts.push(host);
  }

  return result;
}

export function parseMasscanOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "masscan",
    scanType: "text",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");
  
  for (const line of lines) {
    const match = line.match(/Discovered open port (\d+)\/(tcp|udp) on (\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      const [, port, protocol, ip] = match;
      
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, {
          ip,
          state: "up",
          services: [],
        });
      }
      
      const host = hostsMap.get(ip)!;
      host.services.push({
        ip,
        port: parseInt(port, 10),
        protocol,
        state: "open",
        service: "unknown",
      });
    }
    
    const jsonMatch = line.match(/^\{.*"ip":\s*"?(\d+\.\d+\.\d+\.\d+)"?.*"port":\s*(\d+).*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(line);
        const ip = data.ip;
        const port = data.port || data.ports?.[0]?.port;
        const protocol = data.proto || data.ports?.[0]?.proto || "tcp";
        
        if (ip && port) {
          if (!hostsMap.has(ip)) {
            hostsMap.set(ip, {
              ip,
              state: "up",
              services: [],
            });
          }
          
          const host = hostsMap.get(ip)!;
          host.services.push({
            ip,
            port: parseInt(port, 10),
            protocol,
            state: "open",
            service: "unknown",
          });
        }
      } catch {}
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseNucleiOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nuclei",
    scanType: "vulnerabilities",
    hosts: [],
    rawOutput: output,
  };

  const lines = output.split("\n");
  const hostsMap = new Map<string, ParsedHost>();

  for (const line of lines) {
    const match = line.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(https?:\/\/)?([^\/\s:]+)(?::(\d+))?/);
    if (match) {
      const [, templateId, severity, type, , host, port] = match;
      const ip = host;
      const portNum = port ? parseInt(port, 10) : (line.includes("https") ? 443 : 80);
      
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, {
          ip,
          state: "up",
          services: [],
        });
      }
      
      const hostEntry = hostsMap.get(ip)!;
      hostEntry.services.push({
        ip,
        port: portNum,
        protocol: "tcp",
        state: "open",
        service: "http",
        extraInfo: `[${severity}] ${templateId}: ${type}`,
      });
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseRustscanOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "rustscan",
    scanType: "ports",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const openPortMatch = line.match(/Open (\d+\.\d+\.\d+\.\d+):(\d+)/);
    if (openPortMatch) {
      const [, ip, port] = openPortMatch;
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      hostsMap.get(ip)!.services.push({
        ip, port: parseInt(port, 10), protocol: "tcp", state: "open", service: "unknown",
      });
    }

    const jsonMatch = line.match(/\[(\d+(?:,\s*\d+)*)\]/);
    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (jsonMatch && ipMatch && line.toLowerCase().includes("open")) {
      const ip = ipMatch[1];
      const ports = jsonMatch[1].split(",").map(p => parseInt(p.trim(), 10));
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      for (const port of ports) {
        if (!hostsMap.get(ip)!.services.find(s => s.port === port)) {
          hostsMap.get(ip)!.services.push({
            ip, port, protocol: "tcp", state: "open", service: "unknown",
          });
        }
      }
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseNiktoOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "nikto",
    scanType: "web-vulnerabilities",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");
  let currentHost = "";
  let currentPort = 80;

  for (const line of lines) {
    const targetMatch = line.match(/\+ Target IP:\s*(\d+\.\d+\.\d+\.\d+)/);
    if (targetMatch) {
      currentHost = targetMatch[1];
    }
    
    const portMatch = line.match(/\+ Target Port:\s*(\d+)/);
    if (portMatch) {
      currentPort = parseInt(portMatch[1], 10);
    }

    const hostMatch = line.match(/\+ Target Hostname:\s*(\S+)/);
    if (hostMatch && currentHost) {
      if (!hostsMap.has(currentHost)) {
        hostsMap.set(currentHost, { ip: currentHost, hostname: hostMatch[1], state: "up", services: [] });
      }
    }

    if (currentHost && line.startsWith("+ ") && !line.includes("Target")) {
      if (!hostsMap.has(currentHost)) {
        hostsMap.set(currentHost, { ip: currentHost, state: "up", services: [] });
      }
      const existing = hostsMap.get(currentHost)!.services.find(s => s.port === currentPort);
      if (!existing) {
        hostsMap.get(currentHost)!.services.push({
          ip: currentHost, port: currentPort, protocol: "tcp", state: "open", 
          service: currentPort === 443 ? "https" : "http",
          extraInfo: line.substring(2).trim(),
        });
      }
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseGobusterOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "gobuster",
    scanType: "directory",
    hosts: [],
    rawOutput: output,
  };

  const urlMatch = output.match(/Url:\s*(https?:\/\/)?([^\/:]+)(?::(\d+))?/i);
  if (urlMatch) {
    const ip = urlMatch[2];
    const port = urlMatch[3] ? parseInt(urlMatch[3], 10) : (urlMatch[1]?.includes("https") ? 443 : 80);
    result.hosts.push({
      ip,
      state: "up",
      services: [{
        ip, port, protocol: "tcp", state: "open",
        service: port === 443 ? "https" : "http",
        extraInfo: "Directory enumeration completed",
      }],
    });
  }

  return result;
}

export function parseFfufOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "ffuf",
    scanType: "fuzzing",
    hosts: [],
    rawOutput: output,
  };

  const urlMatch = output.match(/Target:\s*(https?:\/\/)?([^\/:]+)(?::(\d+))?/i) ||
                   output.match(/(https?:\/\/)?([^\/:]+)(?::(\d+))?\/FUZZ/i);
  if (urlMatch) {
    const ip = urlMatch[2];
    const port = urlMatch[3] ? parseInt(urlMatch[3], 10) : (urlMatch[1]?.includes("https") ? 443 : 80);
    result.hosts.push({
      ip,
      state: "up",
      services: [{
        ip, port, protocol: "tcp", state: "open",
        service: port === 443 ? "https" : "http",
        extraInfo: "Fuzzing completed",
      }],
    });
  }

  return result;
}

export function parseTestsslOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "testssl",
    scanType: "ssl-scan",
    hosts: [],
    rawOutput: output,
  };

  const targetMatch = output.match(/Testing\s+(\S+)/i) || output.match(/-->\s*(\S+)/);
  if (targetMatch) {
    const target = targetMatch[1];
    const hostMatch = target.match(/([\d.]+|[^:\/]+)(?::(\d+))?/);
    if (hostMatch) {
      const ip = hostMatch[1];
      const port = hostMatch[2] ? parseInt(hostMatch[2], 10) : 443;
      result.hosts.push({
        ip,
        state: "up",
        services: [{
          ip, port, protocol: "tcp", state: "open",
          service: "https",
          extraInfo: "SSL/TLS scan completed",
        }],
      });
    }
  }

  return result;
}

export function parseWhatwebOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "whatweb",
    scanType: "web-fingerprint",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/(https?:\/\/)?([^\/:]+)(?::(\d+))?\s*\[/);
    if (match) {
      const ip = match[2];
      const port = match[3] ? parseInt(match[3], 10) : (match[1]?.includes("https") ? 443 : 80);
      
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }

      const techMatch = line.match(/\[([^\]]+)\]/g);
      const technologies = techMatch ? techMatch.map(t => t.replace(/[\[\]]/g, "")).join(", ") : "";

      hostsMap.get(ip)!.services.push({
        ip, port, protocol: "tcp", state: "open",
        service: port === 443 ? "https" : "http",
        extraInfo: technologies,
      });
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseWpscanOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "wpscan",
    scanType: "wordpress",
    hosts: [],
    rawOutput: output,
  };

  const urlMatch = output.match(/URL:\s*(https?:\/\/)?([^\/:]+)(?::(\d+))?/i) ||
                   output.match(/Scanning\s+(https?:\/\/)?([^\/:]+)/i);
  if (urlMatch) {
    const ip = urlMatch[2];
    const port = urlMatch[3] ? parseInt(urlMatch[3], 10) : (urlMatch[1]?.includes("https") ? 443 : 80);
    result.hosts.push({
      ip,
      state: "up",
      services: [{
        ip, port, protocol: "tcp", state: "open",
        service: "http",
        extraInfo: "WordPress detected",
      }],
    });
  }

  return result;
}

export function parseEnum4linuxOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "enum4linux",
    scanType: "smb-enum",
    hosts: [],
    rawOutput: output,
  };

  const targetMatch = output.match(/Target:\s*(\d+\.\d+\.\d+\.\d+)/i) ||
                      output.match(/(\d+\.\d+\.\d+\.\d+)/);
  if (targetMatch) {
    const ip = targetMatch[1];
    result.hosts.push({
      ip,
      state: "up",
      services: [{
        ip, port: 445, protocol: "tcp", state: "open",
        service: "smb",
        extraInfo: "SMB enumeration completed",
      }],
    });
  }

  return result;
}

export function parseHttpxOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "httpx",
    scanType: "http-probe",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/(https?):\/\/([^\/:]+)(?::(\d+))?/);
    if (match) {
      const [, protocol, ip, portStr] = match;
      const port = portStr ? parseInt(portStr, 10) : (protocol === "https" ? 443 : 80);

      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }

      const statusMatch = line.match(/\[(\d{3})\]/);
      const titleMatch = line.match(/\[([^\]]*title[^\]]*)\]/i);

      hostsMap.get(ip)!.services.push({
        ip, port, protocol: "tcp", state: "open",
        service: protocol === "https" ? "https" : "http",
        extraInfo: [statusMatch?.[1], titleMatch?.[1]].filter(Boolean).join(" ") || undefined,
      });
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseSqlmapOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "sqlmap",
    scanType: "sql-injection",
    hosts: [],
    rawOutput: output,
  };

  const urlMatch = output.match(/target URL:\s*(https?:\/\/)?([^\/:]+)(?::(\d+))?/i) ||
                   output.match(/(https?:\/\/)?([^\/:]+)(?::(\d+))?.*\?/);
  if (urlMatch) {
    const ip = urlMatch[2];
    const port = urlMatch[3] ? parseInt(urlMatch[3], 10) : (urlMatch[1]?.includes("https") ? 443 : 80);
    result.hosts.push({
      ip,
      state: "up",
      services: [{
        ip, port, protocol: "tcp", state: "open",
        service: port === 443 ? "https" : "http",
        extraInfo: "SQL injection testing completed",
      }],
    });
  }

  return result;
}

export function parseHydraOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "hydra",
    scanType: "brute-force",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/\[(\d+)\]\[([^\]]+)\]\s+host:\s*(\d+\.\d+\.\d+\.\d+)/i);
    if (match) {
      const [, port, service, ip] = match;
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      hostsMap.get(ip)!.services.push({
        ip, port: parseInt(port, 10), protocol: "tcp", state: "open", service,
      });
    }

    const targetMatch = line.match(/Hydra.*starting.*(\d+\.\d+\.\d+\.\d+)/i);
    if (targetMatch && !hostsMap.has(targetMatch[1])) {
      hostsMap.set(targetMatch[1], { ip: targetMatch[1], state: "up", services: [] });
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseAmassOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "amass",
    scanType: "subdomain",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
    const domainMatch = line.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.)+[a-zA-Z]{2,}/);
    
    if (domainMatch) {
      const hostname = domainMatch[0];
      const ip = ipMatch ? ipMatch[1] : hostname;
      
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, hostname, state: "up", services: [] });
      }
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseSubfinderOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "subfinder",
    scanType: "subdomain",
    hosts: [],
    rawOutput: output,
  };

  const lines = output.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && /^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}$/.test(trimmed)) {
      result.hosts.push({
        ip: trimmed,
        hostname: trimmed,
        state: "up",
        services: [],
      });
    }
  }

  return result;
}

export function parseCrackmapexecOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "crackmapexec",
    scanType: "smb/ldap",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+(\d+)\s+(\S+)/);
    if (match) {
      const [, ip, port, serviceName] = match;
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      hostsMap.get(ip)!.services.push({
        ip, port: parseInt(port, 10), protocol: "tcp", state: "open", service: serviceName,
      });
    }

    const smbMatch = line.match(/SMB\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+)/);
    if (smbMatch) {
      const [, ip, port] = smbMatch;
      if (!hostsMap.has(ip)) {
        hostsMap.set(ip, { ip, state: "up", services: [] });
      }
      if (!hostsMap.get(ip)!.services.find(s => s.port === parseInt(port, 10))) {
        hostsMap.get(ip)!.services.push({
          ip, port: parseInt(port, 10), protocol: "tcp", state: "open", service: "smb",
        });
      }
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function parseGenericOutput(output: string): ParsedScanResult {
  const result: ParsedScanResult = {
    scanner: "generic",
    scanType: "raw",
    hosts: [],
    rawOutput: output,
  };

  const hostsMap = new Map<string, ParsedHost>();
  const hostPortRegex = /(?:^|[\s,;])((?:\d{1,3}\.){3}\d{1,3}|(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63})(?::(\d{1,5}))?/g;
  let match;

  while ((match = hostPortRegex.exec(output)) !== null) {
    const [, host, port] = match;
    if (isValidIp(host) === false && isValidHostname(host) === false) {
      continue;
    }
    if (!hostsMap.has(host)) {
      hostsMap.set(host, { ip: host, state: "up", services: [] });
    }
    if (port) {
      const portNum = parseInt(port, 10);
      if (portNum > 0 && portNum <= 65535) {
        if (!hostsMap.get(host)!.services.find(s => s.port === portNum)) {
          hostsMap.get(host)!.services.push({
            ip: host, port: portNum, protocol: "tcp", state: "open", service: "unknown",
          });
        }
      }
    }
  }

  result.hosts = Array.from(hostsMap.values());
  return result;
}

export function detectAndParse(output: string): ParsedScanResult {
  const trimmed = output.trim();
  const lower = trimmed.toLowerCase();
  
  if (trimmed.startsWith("<?xml") || trimmed.includes("<nmaprun")) {
    return parseNmapXML(output);
  }
  
  if (trimmed.includes("Nmap scan report") || trimmed.includes("Starting Nmap")) {
    return parseNmapText(output);
  }
  
  if (lower.includes("discovered open port") || lower.includes("masscan")) {
    return parseMasscanOutput(output);
  }
  
  if (lower.includes("[nuclei]") || /\[[a-z-]+\]\s*\[(info|low|medium|high|critical)\]/i.test(trimmed)) {
    return parseNucleiOutput(output);
  }

  if (lower.includes("rustscan") || /open \d+\.\d+\.\d+\.\d+:\d+/i.test(trimmed)) {
    return parseRustscanOutput(output);
  }

  if (lower.includes("nikto") || lower.includes("+ target ip:")) {
    return parseNiktoOutput(output);
  }

  if (lower.includes("gobuster") || lower.includes("dir/") || lower.includes("dns/")) {
    return parseGobusterOutput(output);
  }

  if (lower.includes("ffuf") || lower.includes("fuzz")) {
    return parseFfufOutput(output);
  }

  if (lower.includes("testssl") || lower.includes("ssl/tls testing")) {
    return parseTestsslOutput(output);
  }

  if (lower.includes("whatweb")) {
    return parseWhatwebOutput(output);
  }

  if (lower.includes("wpscan") || lower.includes("wordpress")) {
    return parseWpscanOutput(output);
  }

  if (lower.includes("enum4linux") || lower.includes("smb enumeration")) {
    return parseEnum4linuxOutput(output);
  }

  if (lower.includes("httpx") || /https?:\/\/.*\[\d{3}\]/.test(trimmed)) {
    return parseHttpxOutput(output);
  }

  if (lower.includes("sqlmap") || lower.includes("sql injection")) {
    return parseSqlmapOutput(output);
  }

  if (lower.includes("hydra") || lower.includes("brute-force")) {
    return parseHydraOutput(output);
  }

  if (lower.includes("amass")) {
    return parseAmassOutput(output);
  }

  if (lower.includes("subfinder")) {
    return parseSubfinderOutput(output);
  }

  if (lower.includes("crackmapexec") || lower.includes("cme")) {
    return parseCrackmapexecOutput(output);
  }

  const genericResult = parseGenericOutput(output);
  if (genericResult.hosts.length > 0) {
    return genericResult;
  }
  
  return {
    scanner: "unknown",
    scanType: "raw",
    hosts: [],
    rawOutput: output,
  };
}
