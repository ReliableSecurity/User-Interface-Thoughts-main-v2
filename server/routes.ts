import type { Express } from "express";
import { createServer, type Server } from "http";
import dns from "dns/promises";
import net from "net";
import { storage } from "./storage";
import { insertProjectSchema, insertCompanySchema, insertHostSchema, insertServiceSchema, insertToolSchema, insertPresetSchema, insertScanSchema, insertVulnerabilitySchema } from "@shared/schema";
import { z } from "zod";
import { executeCommand, validateCommand, getAllowedTools } from "./command-executor";
import { detectAndParse } from "./scan-parser";
import { parseVulnerabilityScan, enrichVulnerabilities, type ParsedVulnerability } from "./vulnerability-parser";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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

    return "raw";
  };
  const createHostRequestSchema = z.object({
    projectId: z.string(),
    companyId: z.string(),
    ipAddress: z.string().optional(),
    domain: z.string().optional(),
    hostname: z.string().optional(),
    os: z.string().optional(),
    equipment: z.string().optional(),
    comment: z.string().optional(),
    rawOutput: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  const updateHostRequestSchema = createHostRequestSchema.partial();

  const resolveTargetToIp = async (value: string) => {
    const trimmed = value.trim();
    if (net.isIP(trimmed)) {
      return { ip: trimmed, hostname: undefined as string | undefined };
    }
    const result = await dns.lookup(trimmed, { family: 4 });
    return { ip: result.address, hostname: trimmed };
  };

  const importVulnerabilitiesFromOutput = async ({
    projectId,
    companyId,
    rawOutput,
    enrich = false,
  }: {
    projectId: string;
    companyId: string;
    rawOutput: string;
    enrich?: boolean;
  }) => {
    const parseResult = parseVulnerabilityScan(rawOutput);
    if (parseResult.vulnerabilities.length === 0) {
      return { created: 0, updated: 0, skipped: 0 };
    }

    let vulnsToImport = parseResult.vulnerabilities;
    if (enrich) {
      vulnsToImport = await enrichVulnerabilities(vulnsToImport);
    }

    const existingHosts = await storage.getHosts(projectId, companyId);
    const hostMap = new Map<string, { id: string; ipAddress: string; domain?: string | null }>();
    existingHosts.forEach((h) => {
      if (h.ipAddress) {
        hostMap.set(h.ipAddress.toLowerCase(), h);
      }
      if (h.domain) {
        hostMap.set(h.domain.toLowerCase(), h);
      }
    });

    const existingVulns = await storage.getVulnerabilities(projectId, companyId);
    const existingVulnMap = new Map(
      existingVulns.map((v) => [`${v.templateId || ""}::${v.matchedAt || ""}`, v]),
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const vuln of vulnsToImport) {
      let hostId: string | undefined;
      let serviceId: string | undefined;

      if (vuln.host) {
        const hostKey = vuln.host.toLowerCase();
        let host = hostMap.get(hostKey);

        if (!host) {
          const isIp = net.isIP(vuln.host);
          let resolvedIp = "";
          let domainValue: string | undefined;

          if (isIp) {
            resolvedIp = vuln.host;
          } else {
            domainValue = vuln.host;
            try {
              const resolved = await resolveTargetToIp(vuln.host);
              resolvedIp = resolved.ip;
            } catch {
              resolvedIp = "";
            }
          }

          const newHost = await storage.createHost({
            projectId,
            companyId,
            ipAddress: resolvedIp,
            ...(domainValue ? { domain: domainValue } : {}),
          });
          host = { id: newHost.id, ipAddress: newHost.ipAddress, domain: newHost.domain };
          if (newHost.ipAddress) {
            hostMap.set(newHost.ipAddress.toLowerCase(), host);
          }
          if (newHost.domain) {
            hostMap.set(newHost.domain.toLowerCase(), host);
          }
        }

        hostId = host.id;

        if (vuln.port) {
          const hostServices = await storage.getServices(host.id);
          let service = hostServices.find((s: { port: number; protocol: string | null }) =>
            s.port === vuln.port &&
            (vuln.protocol
              ? (s.protocol || "tcp").toLowerCase() === vuln.protocol.toLowerCase()
              : true),
          );
          if (!service) {
            service = await storage.createService({
              hostId: host.id,
              port: vuln.port,
              protocol: (vuln.protocol || "tcp").toUpperCase(),
              serviceName: vuln.protocol === "https" ? "https" : "http",
              state: "open",
            });
          }
          serviceId = service.id;
        }
      }

      const existingKey = `${vuln.templateId || ""}::${vuln.matchedAt || ""}`;
      const existingVuln = existingVulnMap.get(existingKey);

      if (existingVuln) {
        const hasChanges =
          (vuln.description && vuln.description !== existingVuln.description) ||
          (vuln.cvss && vuln.cvss !== existingVuln.cvss) ||
          (vuln.cwe && vuln.cwe !== existingVuln.cwe);

        if (hasChanges) {
          await storage.updateVulnerability(existingVuln.id, {
            ...(vuln.description && { description: vuln.description }),
            ...(vuln.cvss && { cvss: vuln.cvss }),
            ...(vuln.cwe && { cwe: vuln.cwe }),
            ...(vuln.solution && { solution: vuln.solution }),
            ...(vuln.references && { references: vuln.references }),
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      await storage.createVulnerability({
        projectId,
        companyId,
        hostId,
        serviceId,
        name: vuln.name,
        severity: vuln.severity,
        cve: vuln.cve,
        cwe: vuln.cwe,
        cvss: vuln.cvss,
        description: vuln.description,
        solution: vuln.solution,
        references: vuln.references,
        scanner: vuln.scanner,
        templateId: vuln.templateId,
        matchedAt: vuln.matchedAt,
        extractedData: vuln.extractedData,
        proof: vuln.proof,
        rawOutput: rawOutput.substring(0, 10000),
        status: "open",
      });
      created++;
    }

    return { created, updated, skipped };
  };
  
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.get("/api/projects/:projectId/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies(req.params.projectId);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.post("/api/projects/:projectId/companies", async (req, res) => {
    try {
      const data = insertCompanySchema.parse({
        ...req.body,
        projectId: req.params.projectId,
      });
      const company = await storage.createCompany(data);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ error: "Invalid company data" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const data = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, data);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(400).json({ error: "Invalid company data" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      await storage.createCompany({
        projectId: project.id,
        name: "Компания по умолчанию",
        description: "Автоматически создана для текущего проекта",
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const data = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, data);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/projects/:projectId/hosts", async (req, res) => {
    try {
      const companyId = req.query.companyId?.toString();
      const hosts = await storage.getHosts(req.params.projectId, companyId);
      res.json(hosts);
    } catch (error) {
      console.error("Error fetching hosts:", error);
      res.status(500).json({ error: "Failed to fetch hosts" });
    }
  });

  app.get("/api/hosts/:id", async (req, res) => {
    try {
      const host = await storage.getHost(req.params.id);
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      const services = await storage.getServices(req.params.id);
      res.json({ ...host, services });
    } catch (error) {
      console.error("Error fetching host:", error);
      res.status(500).json({ error: "Failed to fetch host" });
    }
  });

  app.post("/api/hosts", async (req, res) => {
    try {
      const data = createHostRequestSchema.parse(req.body);
      if (!data.companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      const company = await storage.getCompany(data.companyId);
      if (!company || company.projectId !== data.projectId) {
        return res.status(400).json({ error: "Company does not belong to project" });
      }
      const ipInput = data.ipAddress?.trim();
      const domainInput = data.domain?.trim();
      let resolvedIp = "";
      let resolvedDomain = domainInput;
      if (ipInput && net.isIP(ipInput)) {
        resolvedIp = ipInput;
      } else if (domainInput || ipInput) {
        const domainToResolve = domainInput || ipInput || "";
        try {
          const resolved = await resolveTargetToIp(domainToResolve);
          resolvedIp = resolved.ip;
          resolvedDomain = domainInput || domainToResolve;
        } catch (error) {
          return res.status(400).json({ error: "Failed to resolve domain to IP" });
        }
      } else {
        return res.status(400).json({ error: "IP address or domain is required" });
      }
      const host = await storage.createHost({
        ...data,
        ipAddress: resolvedIp,
        domain: resolvedDomain,
      });
      res.status(201).json(host);
    } catch (error) {
      console.error("Error creating host:", error);
      res.status(400).json({ error: "Invalid host data" });
    }
  });

  app.patch("/api/hosts/:id", async (req, res) => {
    try {
      const data = updateHostRequestSchema.parse(req.body);
      const ipProvided = Object.prototype.hasOwnProperty.call(data, "ipAddress");
      const domainProvided = Object.prototype.hasOwnProperty.call(data, "domain");
      const ipInput = data.ipAddress?.trim();
      const domainInput = data.domain?.trim();

      let resolvedIp: string | undefined;
      let resolvedDomain: string | undefined;
      if (ipProvided) {
        if (ipInput && net.isIP(ipInput)) {
          resolvedIp = ipInput;
        } else if (ipInput) {
          const domainToResolve = domainInput || ipInput;
          try {
            const resolved = await resolveTargetToIp(domainToResolve);
            resolvedIp = resolved.ip;
            resolvedDomain = domainInput || domainToResolve;
          } catch (error) {
            return res.status(400).json({ error: "Failed to resolve domain to IP" });
          }
        } else if (domainProvided) {
          resolvedDomain = domainInput || "";
        }
      } else if (domainProvided && domainInput) {
        try {
          const resolved = await resolveTargetToIp(domainInput);
          resolvedIp = resolved.ip;
          resolvedDomain = domainInput;
        } catch (error) {
          return res.status(400).json({ error: "Failed to resolve domain to IP" });
        }
      } else if (domainProvided) {
        resolvedDomain = "";
      }
      const host = await storage.updateHost(req.params.id, {
        ...data,
        ...(resolvedIp !== undefined && { ipAddress: resolvedIp }),
        ...(resolvedDomain !== undefined && { domain: resolvedDomain || undefined }),
      });
      if (!host) {
        return res.status(404).json({ error: "Host not found" });
      }
      res.json(host);
    } catch (error) {
      console.error("Error updating host:", error);
      res.status(400).json({ error: "Invalid host data" });
    }
  });

  app.delete("/api/hosts/:id", async (req, res) => {
    try {
      await storage.deleteHost(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting host:", error);
      res.status(500).json({ error: "Failed to delete host" });
    }
  });

  app.post("/api/hosts/:hostId/services", async (req, res) => {
    try {
      const data = insertServiceSchema.parse({
        ...req.body,
        hostId: req.params.hostId,
      });
      const service = await storage.createService(data);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(400).json({ error: "Invalid service data" });
    }
  });

  app.get("/api/projects/:projectId/services", async (req, res) => {
    try {
      const companyId = req.query.companyId?.toString();
      const services = await storage.getProjectServices(req.params.projectId, companyId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching project services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    try {
      const data = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(req.params.id, data);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(400).json({ error: "Invalid service data" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/tools", async (req, res) => {
    try {
      const tools = await storage.getTools();
      const availableTools = new Set(getAllowedTools());
      const toolsWithAvailability = tools.map((tool) => ({
        ...tool,
        available: availableTools.has(tool.name),
      }));
      res.json(toolsWithAvailability);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ error: "Failed to fetch tools" });
    }
  });

  app.post("/api/tools", async (req, res) => {
    try {
      const data = insertToolSchema.parse(req.body);
      const tool = await storage.createTool(data);
      res.status(201).json(tool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(400).json({ error: "Invalid tool data" });
    }
  });

  app.get("/api/presets", async (req, res) => {
    try {
      const presets = await storage.getPresets();
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  app.post("/api/presets", async (req, res) => {
    try {
      const data = insertPresetSchema.parse(req.body);
      const preset = await storage.createPreset({
        ...data,
        outputType: inferPresetOutputType(data),
      });
      res.status(201).json(preset);
    } catch (error) {
      console.error("Error creating preset:", error);
      res.status(400).json({ error: "Invalid preset data" });
    }
  });

  app.get("/api/presets/:id", async (req, res) => {
    try {
      const preset = await storage.getPreset(req.params.id);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Error fetching preset:", error);
      res.status(500).json({ error: "Failed to fetch preset" });
    }
  });

  app.patch("/api/presets/:id", async (req, res) => {
    try {
      const data = insertPresetSchema.partial().parse(req.body);
      const existing = await storage.getPreset(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Preset not found" });
      }
      const merged = { ...existing, ...data };
      const preset = await storage.updatePreset(req.params.id, {
        ...data,
        ...(data.outputType ? {} : { outputType: inferPresetOutputType(merged) }),
      });
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Error updating preset:", error);
      res.status(400).json({ error: "Invalid preset data" });
    }
  });

  app.delete("/api/presets/:id", async (req, res) => {
    try {
      await storage.deletePreset(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ error: "Failed to delete preset" });
    }
  });

  app.get("/api/projects/:projectId/scans", async (req, res) => {
    try {
      const companyId = req.query.companyId?.toString();
      const scans = await storage.getScans(req.params.projectId, companyId);
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  app.get("/api/tools/allowed", async (req, res) => {
    res.json({ tools: getAllowedTools() });
  });

  app.post("/api/scans", async (req, res) => {
    try {
      const data = insertScanSchema.parse({
        ...req.body,
        status: "pending",
      });
      if (!data.companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      const company = await storage.getCompany(data.companyId);
      if (!company || company.projectId !== data.projectId) {
        return res.status(400).json({ error: "Company does not belong to project" });
      }

      const validation = validateCommand(data.command || "");
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Недопустимая команда",
          details: validation.error
        });
      }

      const scan = await storage.createScan({
        ...data,
        status: "running",
      });

      res.status(201).json(scan);

      (async () => {
        try {
          const result = await executeCommand(data.command || "", 0);
          const rawOutput = result.output || result.error || "Нет вывода";
          
          const parsedResult = detectAndParse(rawOutput);
          const parsedJson = JSON.stringify(parsedResult);
          
          await storage.updateScan(scan.id, { 
            status: result.success ? "completed" : "failed",
            output: rawOutput,
            parsedOutput: parsedJson,
          });

          const preset = scan.presetId ? await storage.getPreset(scan.presetId) : undefined;
          const shouldImportVulns =
            (preset?.outputType || "") === "vuln" || validation.tool === "nuclei";

          if (shouldImportVulns && scan.companyId) {
            await importVulnerabilitiesFromOutput({
              projectId: scan.projectId,
              companyId: scan.companyId,
              rawOutput,
              enrich: false,
            });
          }
        } catch (error) {
          console.error("Error executing command:", error);
          await storage.updateScan(scan.id, { 
            status: "failed",
            output: `Ошибка выполнения: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      })();
      
    } catch (error) {
      console.error("Error creating scan:", error);
      res.status(400).json({ error: "Invalid scan data" });
    }
  });

  app.get("/api/scans/:id", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ error: "Failed to fetch scan" });
    }
  });

  app.get("/api/projects/:projectId/vulnerabilities", async (req, res) => {
    try {
      const companyId = req.query.companyId?.toString();
      const vulnerabilities = await storage.getVulnerabilities(req.params.projectId, companyId);
      res.json(vulnerabilities);
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      res.status(500).json({ error: "Failed to fetch vulnerabilities" });
    }
  });

  app.get("/api/projects/:projectId/vulnerabilities/stats", async (req, res) => {
    try {
      const companyId = req.query.companyId?.toString();
      const stats = await storage.getVulnerabilityStats(req.params.projectId, companyId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching vulnerability stats:", error);
      res.status(500).json({ error: "Failed to fetch vulnerability stats" });
    }
  });

  app.get("/api/vulnerabilities/:id", async (req, res) => {
    try {
      const vuln = await storage.getVulnerability(req.params.id);
      if (!vuln) {
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      res.json(vuln);
    } catch (error) {
      console.error("Error fetching vulnerability:", error);
      res.status(500).json({ error: "Failed to fetch vulnerability" });
    }
  });

  app.post("/api/vulnerabilities", async (req, res) => {
    try {
      let data = insertVulnerabilitySchema.parse(req.body);
      if (!data.companyId && data.hostId) {
        const host = await storage.getHost(data.hostId);
        if (host?.companyId) {
          data.companyId = host.companyId;
        }
      }
      if (!data.companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      const company = await storage.getCompany(data.companyId);
      if (!company || company.projectId !== data.projectId) {
        return res.status(400).json({ error: "Company does not belong to project" });
      }
      const vuln = await storage.createVulnerability(data);
      res.status(201).json(vuln);
    } catch (error) {
      console.error("Error creating vulnerability:", error);
      res.status(400).json({ error: "Invalid vulnerability data" });
    }
  });

  app.patch("/api/vulnerabilities/:id", async (req, res) => {
    try {
      const data = insertVulnerabilitySchema.partial().parse(req.body);
      const vuln = await storage.updateVulnerability(req.params.id, data);
      if (!vuln) {
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      res.json(vuln);
    } catch (error) {
      console.error("Error updating vulnerability:", error);
      res.status(400).json({ error: "Invalid vulnerability data" });
    }
  });

  app.delete("/api/vulnerabilities/:id", async (req, res) => {
    try {
      await storage.deleteVulnerability(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vulnerability:", error);
      res.status(500).json({ error: "Failed to delete vulnerability" });
    }
  });

  app.patch("/api/vulnerabilities/batch", async (req, res) => {
    try {
      const { ids, status } = req.body as { ids: string[]; status: string };
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs array is required" });
      }
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const results = await Promise.all(
        ids.map(id => storage.updateVulnerability(id, { status }))
      );

      res.json({ updated: results.filter(Boolean).length });
    } catch (error) {
      console.error("Error batch updating vulnerabilities:", error);
      res.status(500).json({ error: "Failed to batch update vulnerabilities" });
    }
  });

  app.get("/api/projects/:projectId/stats", async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const companyId = req.query.companyId?.toString();
      const [hostsData, servicesData, vulnStats] = await Promise.all([
        storage.getHosts(projectId, companyId),
        storage.getProjectServices(projectId, companyId),
        storage.getVulnerabilityStats(projectId, companyId),
      ]);

      res.json({
        hosts: hostsData.length,
        services: servicesData.length,
        vulnerabilities: vulnStats.reduce((sum, s) => sum + s.count, 0),
        bySeverity: vulnStats.reduce((acc, s) => {
          acc[s.severity] = s.count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ error: "Failed to fetch project stats" });
    }
  });

  app.post("/api/projects/:projectId/import", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { hosts, services, companyId } = req.body as {
        hosts: Array<{ ip: string; hostname?: string; os?: string }>;
        services: Array<{
          ip: string;
          port: number;
          protocol: string;
          state: string;
          service: string;
          version?: string;
          product?: string;
          extraInfo?: string;
        }>;
        companyId?: string;
      };

      const normalizeHostKey = (value: string) => value.trim().toLowerCase();
      const normalizeProtocol = (value?: string) => (value || "tcp").toUpperCase();

      if (!hosts || !services) {
        return res.status(400).json({ error: "Hosts and services are required" });
      }
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      const company = await storage.getCompany(companyId);
      if (!company || company.projectId !== projectId) {
        return res.status(400).json({ error: "Company does not belong to project" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      let resolvedHosts: Array<{
        ip: string;
        hostname?: string;
        os?: string;
        resolvedIp: string;
        resolvedDomain?: string;
      }>;
      let resolvedServices: Array<{
        ip: string;
        port: number;
        protocol: string;
        state: string;
        service: string;
        version?: string;
        product?: string;
        extraInfo?: string;
        resolvedIp: string;
      }>;

      try {
        resolvedHosts = await Promise.all(
          hosts.map(async (hostData) => {
            const rawTarget = hostData.ip.trim();
            const inputIsIp = net.isIP(rawTarget);
            const resolved = await resolveTargetToIp(rawTarget);
            const resolvedDomain = hostData.hostname || (inputIsIp ? undefined : rawTarget);
            return {
              ...hostData,
              resolvedIp: resolved.ip,
              resolvedDomain,
            };
          }),
        );
        resolvedServices = await Promise.all(
          services.map(async (svc) => {
            const resolved = await resolveTargetToIp(svc.ip);
            return {
              ...svc,
              resolvedIp: resolved.ip,
            };
          }),
        );
      } catch (error) {
        return res.status(400).json({ error: "Failed to resolve one or more domains" });
      }

      const existingHosts = await storage.getHosts(projectId, companyId);
      const hostIpToId = new Map<string, string>();
      const hostDomainToId = new Map<string, string>();

      existingHosts.forEach(h => {
        if (h.ipAddress) {
          hostIpToId.set(normalizeHostKey(h.ipAddress), h.id);
        }
        if (h.domain) {
          hostDomainToId.set(normalizeHostKey(h.domain), h.id);
        }
      });

      for (const host of existingHosts) {
        if (host.ipAddress || !host.domain) {
          continue;
        }
        try {
          const resolved = await resolveTargetToIp(host.domain);
          await storage.updateHost(host.id, { ipAddress: resolved.ip });
          hostIpToId.set(normalizeHostKey(resolved.ip), host.id);
        } catch {
          // Skip DNS failures; keep domain-only hosts.
        }
      }

      let hostsCreated = 0;
      let hostsUpdated = 0;
      let servicesCreated = 0;
      let servicesSkipped = 0;

      for (const hostData of resolvedHosts) {
        const normalizedHostKey = normalizeHostKey(hostData.resolvedIp);
        const normalizedDomainKey = hostData.resolvedDomain
          ? normalizeHostKey(hostData.resolvedDomain)
          : undefined;

        if (hostIpToId.has(normalizedHostKey)) {
          const existingId = hostIpToId.get(normalizedHostKey)!;
          if (hostData.os || hostData.resolvedDomain) {
            await storage.updateHost(existingId, {
              ...(hostData.resolvedDomain && { domain: hostData.resolvedDomain }),
              ...(hostData.os && { os: hostData.os }),
            });
            hostsUpdated++;
          }
          continue;
        }

        if (normalizedDomainKey && hostDomainToId.has(normalizedDomainKey)) {
          const existingId = hostDomainToId.get(normalizedDomainKey)!;
          await storage.updateHost(existingId, {
            ipAddress: hostData.resolvedIp.trim(),
            ...(hostData.resolvedDomain && { domain: hostData.resolvedDomain }),
            ...(hostData.os && { os: hostData.os }),
          });
          hostIpToId.set(normalizedHostKey, existingId);
          hostsUpdated++;
          continue;
        }

        const newHost = await storage.createHost({
          projectId,
          companyId,
          ipAddress: hostData.resolvedIp.trim(),
          domain: hostData.resolvedDomain,
          os: hostData.os,
        });
        hostIpToId.set(normalizedHostKey, newHost.id);
        if (normalizedDomainKey) {
          hostDomainToId.set(normalizedDomainKey, newHost.id);
        }
        hostsCreated++;
      }

      const existingServicesMap = new Map<string, { id: string; serviceName?: string; state?: string; comment?: string }>();
      const hostEntries = Array.from(hostIpToId.entries());
      for (const [hostKey, hostId] of hostEntries) {
        const hostServices = await storage.getServices(hostId);
        hostServices.forEach(s => {
          const protocol = normalizeProtocol(s.protocol);
          existingServicesMap.set(`${hostKey}:${s.port}/${protocol}`, {
            id: s.id,
            serviceName: s.serviceName || undefined,
            state: s.state || undefined,
            comment: s.comment || undefined,
          });
        });
      }

      let servicesUpdated = 0;

      for (const svc of resolvedServices) {
        const hostKey = normalizeHostKey(svc.resolvedIp);
        const protocol = normalizeProtocol(svc.protocol);
        const key = `${hostKey}:${svc.port}/${protocol}`;
        const hostId = hostIpToId.get(hostKey);
        if (!hostId) continue;

        const versionInfo = [svc.product, svc.version, svc.extraInfo]
          .filter(Boolean)
          .join(" ");

        const existing = existingServicesMap.get(key);
        
        if (existing) {
          const hasChanges = 
            (svc.service && svc.service !== "unknown" && svc.service !== existing.serviceName) ||
            (svc.state && svc.state !== existing.state) ||
            (versionInfo && versionInfo !== existing.comment);
          
          if (hasChanges) {
            await storage.updateService(existing.id, {
              ...(svc.service && svc.service !== "unknown" && { serviceName: svc.service }),
              ...(svc.state && { state: svc.state }),
              ...(versionInfo && { comment: versionInfo }),
            });
            servicesUpdated++;
          } else {
            servicesSkipped++;
          }
          continue;
        }

        await storage.createService({
          hostId,
          port: svc.port,
          protocol,
          serviceName: svc.service,
          comment: versionInfo || undefined,
          state: svc.state,
        });
        servicesCreated++;
      }

      res.json({
        hostsCreated,
        hostsUpdated,
        servicesCreated,
        servicesUpdated,
        servicesSkipped,
      });
    } catch (error) {
      console.error("Error importing scan results:", error);
      res.status(500).json({ error: "Failed to import scan results" });
    }
  });

  app.post("/api/projects/:projectId/import-vulnerabilities", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { rawOutput, enrich = true, companyId } = req.body as {
        rawOutput: string;
        enrich?: boolean;
        companyId?: string;
      };

      if (!rawOutput) {
        return res.status(400).json({ error: "rawOutput is required" });
      }
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      const company = await storage.getCompany(companyId);
      if (!company || company.projectId !== projectId) {
        return res.status(400).json({ error: "Company does not belong to project" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const parseResult = parseVulnerabilityScan(rawOutput);

      if (parseResult.vulnerabilities.length === 0) {
        return res.json({
          message: "No vulnerabilities found in scan output",
          scanner: parseResult.scanner,
          created: 0,
          updated: 0,
          skipped: 0,
        });
      }

      let vulnsToImport = parseResult.vulnerabilities;
      if (enrich) {
        vulnsToImport = await enrichVulnerabilities(vulnsToImport);
      }

      const existingHosts = await storage.getHosts(projectId, companyId);
      const hostMap = new Map(existingHosts.map((h: { ipAddress: string; id: string }) => [h.ipAddress, h]));

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const vuln of vulnsToImport) {
        let hostId: string | undefined;
        let serviceId: string | undefined;

        if (vuln.host) {
          let host = hostMap.get(vuln.host) as { id: string; ipAddress: string } | undefined;
          if (!host) {
            const newHost = await storage.createHost({
              projectId,
              companyId,
              ipAddress: vuln.host,
            });
            host = { id: newHost.id, ipAddress: newHost.ipAddress };
            hostMap.set(vuln.host, host);
          }
          hostId = host.id;

          if (vuln.port) {
            const hostServices = await storage.getServices(host.id);
            let service = hostServices.find((s: { port: number }) => s.port === vuln.port);
            if (!service) {
              service = await storage.createService({
                hostId: host.id,
                port: vuln.port,
                protocol: (vuln.protocol || "tcp").toUpperCase(),
                serviceName: vuln.protocol === "https" ? "https" : "http",
                state: "open",
              });
            }
            serviceId = service.id;
          }
        }

        const existingVulns = await storage.getVulnerabilities(projectId, companyId);
        const existingVuln = existingVulns.find((v: { templateId: string | null; matchedAt: string | null }) => 
          v.templateId === vuln.templateId && 
          v.matchedAt === vuln.matchedAt
        );

        if (existingVuln) {
          const hasChanges = 
            (vuln.description && vuln.description !== existingVuln.description) ||
            (vuln.cvss && vuln.cvss !== existingVuln.cvss) ||
            (vuln.cwe && vuln.cwe !== existingVuln.cwe);

          if (hasChanges) {
            await storage.updateVulnerability(existingVuln.id, {
              ...(vuln.description && { description: vuln.description }),
              ...(vuln.cvss && { cvss: vuln.cvss }),
              ...(vuln.cwe && { cwe: vuln.cwe }),
              ...(vuln.solution && { solution: vuln.solution }),
              ...(vuln.references && { references: vuln.references }),
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        await storage.createVulnerability({
          projectId,
          companyId,
          hostId,
          serviceId,
          name: vuln.name,
          severity: vuln.severity,
          cve: vuln.cve,
          cwe: vuln.cwe,
          cvss: vuln.cvss,
          description: vuln.description,
          solution: vuln.solution,
          references: vuln.references,
          scanner: vuln.scanner,
          templateId: vuln.templateId,
          matchedAt: vuln.matchedAt,
          extractedData: vuln.extractedData,
          proof: vuln.proof,
          rawOutput: rawOutput.substring(0, 10000),
          status: "open",
        });
        created++;
      }

      res.json({
        scanner: parseResult.scanner,
        total: vulnsToImport.length,
        created,
        updated,
        skipped,
        enriched: enrich,
      });
    } catch (error) {
      console.error("Error importing vulnerabilities:", error);
      res.status(500).json({ error: "Failed to import vulnerabilities" });
    }
  });

  app.post("/api/projects/:projectId/parse-vulnerabilities", async (req, res) => {
    try {
      const { rawOutput, enrich = false } = req.body as {
        rawOutput: string;
        enrich?: boolean;
      };

      if (!rawOutput) {
        return res.status(400).json({ error: "rawOutput is required" });
      }

      const parseResult = parseVulnerabilityScan(rawOutput);

      let vulnerabilities = parseResult.vulnerabilities;
      if (enrich && vulnerabilities.length > 0) {
        vulnerabilities = await enrichVulnerabilities(vulnerabilities);
      }

      res.json({
        scanner: parseResult.scanner,
        count: vulnerabilities.length,
        vulnerabilities,
      });
    } catch (error) {
      console.error("Error parsing vulnerabilities:", error);
      res.status(500).json({ error: "Failed to parse vulnerabilities" });
    }
  });

  return httpServer;
}
