import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).pick({
  projectId: true,
  name: true,
  description: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export const hosts = pgTable("hosts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull(),
  domain: text("domain"),
  hostname: text("hostname"),
  os: text("os"),
  equipment: text("equipment"),
  comment: text("comment"),
  rawOutput: text("raw_output"),
  tags: text("tags").array(),
});

export const insertHostSchema = createInsertSchema(hosts).pick({
  projectId: true,
  companyId: true,
  ipAddress: true,
  domain: true,
  hostname: true,
  os: true,
  equipment: true,
  comment: true,
  rawOutput: true,
  tags: true,
});

export type InsertHost = z.infer<typeof insertHostSchema>;
export type Host = typeof hosts.$inferSelect;

export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").notNull().references(() => hosts.id, { onDelete: "cascade" }),
  port: integer("port").notNull(),
  protocol: text("protocol").notNull().default("TCP"),
  serviceName: text("service_name"),
  version: text("version"),
  state: text("state").default("open"),
  banner: text("banner"),
  comment: text("comment"),
  rawOutput: text("raw_output"),
});

export const insertServiceSchema = createInsertSchema(services).pick({
  hostId: true,
  port: true,
  protocol: true,
  serviceName: true,
  version: true,
  state: true,
  banner: true,
  comment: true,
  rawOutput: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: varchar("service_id").references(() => services.id, { onDelete: "cascade" }),
  hostId: varchar("host_id").references(() => hosts.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  severity: text("severity").notNull().default("info"),
  cvss: text("cvss"),
  cve: text("cve"),
  cwe: text("cwe"),
  
  description: text("description"),
  solution: text("solution"),
  references: text("references").array(),
  
  scanner: text("scanner").notNull(),
  templateId: text("template_id"),
  matchedAt: text("matched_at"),
  extractedData: jsonb("extracted_data"),
  
  rawOutput: text("raw_output"),
  proof: text("proof"),
  
  status: text("status").default("open"),
  assignee: text("assignee"),
  notes: text("notes"),
  
  discoveredAt: timestamp("discovered_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export const insertVulnerabilitySchema = createInsertSchema(vulnerabilities).omit({
  id: true,
});

export type InsertVulnerability = z.infer<typeof insertVulnerabilitySchema>;
export type Vulnerability = typeof vulnerabilities.$inferSelect;

export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  commandTemplate: text("command_template"),
  isBuiltIn: boolean("is_built_in").default(false),
  category: text("category"),
  documentation: text("documentation"),
});

export const insertToolSchema = createInsertSchema(tools).pick({
  name: true,
  description: true,
  commandTemplate: true,
  isBuiltIn: true,
  category: true,
  documentation: true,
});

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

export const presets = pgTable("presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  toolId: varchar("tool_id").references(() => tools.id),
  commandTemplate: text("command_template").notNull(),
  outputType: text("output_type").default("raw"),
  riskLevel: text("risk_level").default("safe"),
  estimatedTime: text("estimated_time"),
  tags: text("tags").array(),
});

export const insertPresetSchema = createInsertSchema(presets).pick({
  name: true,
  description: true,
  category: true,
  subcategory: true,
  toolId: true,
  commandTemplate: true,
  outputType: true,
  riskLevel: true,
  estimatedTime: true,
  tags: true,
});

export type InsertPreset = z.infer<typeof insertPresetSchema>;
export type Preset = typeof presets.$inferSelect;

export const scans = pgTable("scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  toolId: varchar("tool_id").references(() => tools.id),
  presetId: varchar("preset_id").references(() => presets.id),
  command: text("command").notNull(),
  status: text("status").notNull().default("pending"),
  targetIps: text("target_ips").array(),
  output: text("output"),
  parsedOutput: text("parsed_output"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  progress: integer("progress").default(0),
  totalTargets: integer("total_targets").default(0),
  vulnerabilitiesFound: integer("vulnerabilities_found").default(0),
});

export const insertScanSchema = createInsertSchema(scans).pick({
  projectId: true,
  companyId: true,
  toolId: true,
  presetId: true,
  command: true,
  status: true,
  targetIps: true,
  output: true,
  parsedOutput: true,
  progress: true,
  totalTargets: true,
  vulnerabilitiesFound: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type HostWithServices = Host & {
  services: Service[];
};

export type ServiceWithHost = Service & {
  host: Host;
  vulnerabilityCount?: number;
};

export type VulnerabilityWithContext = Vulnerability & {
  service?: Service;
  host?: Host;
};

export type ScanWithDetails = Scan & {
  tool?: Tool;
  preset?: Preset;
};

export const SEVERITY_LEVELS = ["critical", "high", "medium", "low", "info"] as const;
export type SeverityLevel = typeof SEVERITY_LEVELS[number];

export const VULN_STATUS = ["open", "confirmed", "false_positive", "fixed", "accepted"] as const;
export type VulnStatus = typeof VULN_STATUS[number];
