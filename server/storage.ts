import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import {
  projects,
  companies,
  hosts,
  services,
  tools,
  presets,
  scans,
  vulnerabilities,
  type Project,
  type InsertProject,
  type Company,
  type InsertCompany,
  type Host,
  type InsertHost,
  type Service,
  type InsertService,
  type ServiceWithHost,
  type Tool,
  type InsertTool,
  type Preset,
  type InsertPreset,
  type Scan,
  type InsertScan,
  type Vulnerability,
  type InsertVulnerability,
  type VulnerabilityWithContext,
} from "@shared/schema";

export interface IStorage {
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getCompanies(projectId: string): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<void>;

  getHosts(projectId: string, companyId?: string): Promise<(Host & { services: Service[] })[]>;
  getHost(id: string): Promise<Host | undefined>;
  createHost(host: InsertHost): Promise<Host>;
  updateHost(id: string, host: Partial<InsertHost>): Promise<Host | undefined>;
  deleteHost(id: string): Promise<void>;

  getServices(hostId: string): Promise<Service[]>;
  getProjectServices(projectId: string, companyId?: string): Promise<ServiceWithHost[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  getTools(): Promise<Tool[]>;
  getTool(id: string): Promise<Tool | undefined>;
  createTool(tool: InsertTool): Promise<Tool>;

  getPresets(): Promise<Preset[]>;
  getPreset(id: string): Promise<Preset | undefined>;
  createPreset(preset: InsertPreset): Promise<Preset>;
  updatePreset(id: string, preset: Partial<InsertPreset>): Promise<Preset | undefined>;
  deletePreset(id: string): Promise<void>;

  getScans(projectId: string, companyId?: string): Promise<Scan[]>;
  getScan(id: string): Promise<Scan | undefined>;
  createScan(scan: InsertScan): Promise<Scan>;
  updateScan(id: string, scan: Partial<InsertScan>): Promise<Scan | undefined>;

  getVulnerabilities(projectId: string, companyId?: string): Promise<VulnerabilityWithContext[]>;
  getVulnerability(id: string): Promise<VulnerabilityWithContext | undefined>;
  createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability>;
  updateVulnerability(id: string, vuln: Partial<InsertVulnerability>): Promise<Vulnerability | undefined>;
  deleteVulnerability(id: string): Promise<void>;
  getVulnerabilityStats(projectId: string, companyId?: string): Promise<{ severity: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.createdAt);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getCompanies(projectId: string): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.projectId, projectId)).orderBy(companies.createdAt);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set(company).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getHosts(projectId: string, companyId?: string): Promise<(Host & { services: Service[] })[]> {
    const condition = companyId
      ? and(eq(hosts.projectId, projectId), eq(hosts.companyId, companyId))
      : eq(hosts.projectId, projectId);
    const hostsList = await db.select().from(hosts).where(condition);
    const hostsWithServices = await Promise.all(
      hostsList.map(async (host) => {
        const hostServices = await db.select().from(services).where(eq(services.hostId, host.id));
        return { ...host, services: hostServices };
      })
    );
    return hostsWithServices;
  }

  async getHost(id: string): Promise<Host | undefined> {
    const [host] = await db.select().from(hosts).where(eq(hosts.id, id));
    return host;
  }

  async createHost(host: InsertHost): Promise<Host> {
    const [newHost] = await db.insert(hosts).values(host).returning();
    return newHost;
  }

  async updateHost(id: string, host: Partial<InsertHost>): Promise<Host | undefined> {
    const [updated] = await db.update(hosts).set(host).where(eq(hosts.id, id)).returning();
    return updated;
  }

  async deleteHost(id: string): Promise<void> {
    await db.delete(hosts).where(eq(hosts.id, id));
  }

  async getServices(hostId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.hostId, hostId));
  }

  async getProjectServices(projectId: string, companyId?: string): Promise<ServiceWithHost[]> {
    const condition = companyId
      ? and(eq(hosts.projectId, projectId), eq(hosts.companyId, companyId))
      : eq(hosts.projectId, projectId);
    const hostsList = await db.select().from(hosts).where(condition);
    const allServices: ServiceWithHost[] = [];
    
    for (const host of hostsList) {
      const hostServices = await db.select().from(services).where(eq(services.hostId, host.id));
      for (const service of hostServices) {
        const vulnCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(vulnerabilities)
          .where(eq(vulnerabilities.serviceId, service.id));
        allServices.push({ 
          ...service, 
          host,
          vulnerabilityCount: Number(vulnCount[0]?.count || 0)
        });
      }
    }
    
    return allServices;
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(service).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getTools(): Promise<Tool[]> {
    return await db.select().from(tools);
  }

  async getTool(id: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool;
  }

  async createTool(tool: InsertTool): Promise<Tool> {
    const [newTool] = await db.insert(tools).values(tool).returning();
    return newTool;
  }

  async getPresets(): Promise<Preset[]> {
    return await db.select().from(presets);
  }

  async getPreset(id: string): Promise<Preset | undefined> {
    const [preset] = await db.select().from(presets).where(eq(presets.id, id));
    return preset;
  }

  async createPreset(preset: InsertPreset): Promise<Preset> {
    const [newPreset] = await db.insert(presets).values(preset).returning();
    return newPreset;
  }

  async updatePreset(id: string, preset: Partial<InsertPreset>): Promise<Preset | undefined> {
    const [updated] = await db.update(presets).set(preset).where(eq(presets.id, id)).returning();
    return updated;
  }

  async deletePreset(id: string): Promise<void> {
    await db.delete(presets).where(eq(presets.id, id));
  }

  async getScans(projectId: string, companyId?: string): Promise<Scan[]> {
    const condition = companyId
      ? and(eq(scans.projectId, projectId), eq(scans.companyId, companyId))
      : eq(scans.projectId, projectId);
    return await db.select().from(scans).where(condition);
  }

  async getScan(id: string): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async createScan(scan: InsertScan): Promise<Scan> {
    const [newScan] = await db.insert(scans).values(scan).returning();
    return newScan;
  }

  async updateScan(id: string, scan: Partial<InsertScan>): Promise<Scan | undefined> {
    const [updated] = await db.update(scans).set(scan).where(eq(scans.id, id)).returning();
    return updated;
  }

  async getVulnerabilities(projectId: string, companyId?: string): Promise<VulnerabilityWithContext[]> {
    const condition = companyId
      ? and(eq(vulnerabilities.projectId, projectId), eq(vulnerabilities.companyId, companyId))
      : eq(vulnerabilities.projectId, projectId);
    const vulnList = await db
      .select()
      .from(vulnerabilities)
      .where(condition)
      .orderBy(vulnerabilities.discoveredAt);
    
    const vulnsWithContext: VulnerabilityWithContext[] = [];
    
    for (const vuln of vulnList) {
      let service: Service | undefined;
      let host: Host | undefined;
      
      if (vuln.serviceId) {
        const [svc] = await db.select().from(services).where(eq(services.id, vuln.serviceId));
        service = svc;
      }
      
      if (vuln.hostId) {
        const [h] = await db.select().from(hosts).where(eq(hosts.id, vuln.hostId));
        host = h;
      } else if (service) {
        const [h] = await db.select().from(hosts).where(eq(hosts.id, service.hostId));
        host = h;
      }
      
      vulnsWithContext.push({ ...vuln, service, host });
    }
    
    return vulnsWithContext;
  }

  async getVulnerability(id: string): Promise<VulnerabilityWithContext | undefined> {
    const [vuln] = await db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id));
    if (!vuln) return undefined;
    
    let service: Service | undefined;
    let host: Host | undefined;
    
    if (vuln.serviceId) {
      const [svc] = await db.select().from(services).where(eq(services.id, vuln.serviceId));
      service = svc;
    }
    
    if (vuln.hostId) {
      const [h] = await db.select().from(hosts).where(eq(hosts.id, vuln.hostId));
      host = h;
    } else if (service) {
      const [h] = await db.select().from(hosts).where(eq(hosts.id, service.hostId));
      host = h;
    }
    
    return { ...vuln, service, host };
  }

  async createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability> {
    const [newVuln] = await db.insert(vulnerabilities).values(vuln).returning();
    return newVuln;
  }

  async updateVulnerability(id: string, vuln: Partial<InsertVulnerability>): Promise<Vulnerability | undefined> {
    const [updated] = await db.update(vulnerabilities).set(vuln).where(eq(vulnerabilities.id, id)).returning();
    return updated;
  }

  async deleteVulnerability(id: string): Promise<void> {
    await db.delete(vulnerabilities).where(eq(vulnerabilities.id, id));
  }

  async getVulnerabilityStats(projectId: string, companyId?: string): Promise<{ severity: string; count: number }[]> {
    const baseQuery = db
      .select({
        severity: vulnerabilities.severity,
        count: sql<number>`count(*)`,
      })
      .from(vulnerabilities);
    const condition = companyId
      ? and(eq(vulnerabilities.projectId, projectId), eq(vulnerabilities.companyId, companyId))
      : eq(vulnerabilities.projectId, projectId);
    const stats = await baseQuery
      .where(condition)
      .groupBy(vulnerabilities.severity);
    
    return stats.map(s => ({ severity: s.severity, count: Number(s.count) }));
  }
}

export const storage = new DatabaseStorage();
