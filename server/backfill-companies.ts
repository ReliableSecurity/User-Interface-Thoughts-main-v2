import { and, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { companies, projects, hosts, vulnerabilities, scans } from "@shared/schema";

export async function backfillCompanies() {
  const projectList = await db.select().from(projects);

  for (const project of projectList) {
    let companyList = await db
      .select()
      .from(companies)
      .where(eq(companies.projectId, project.id));

    if (companyList.length === 0) {
      const [created] = await db
        .insert(companies)
        .values({
          projectId: project.id,
          name: "Компания по умолчанию",
          description: "Автоматически создана для текущего проекта",
        })
        .returning();
      companyList = [created];
    }

    const defaultCompanyId = companyList[0].id;

    const hostsToUpdate = await db
      .select()
      .from(hosts)
      .where(and(eq(hosts.projectId, project.id), isNull(hosts.companyId)));

    for (const host of hostsToUpdate) {
      await db
        .update(hosts)
        .set({ companyId: defaultCompanyId })
        .where(eq(hosts.id, host.id));
    }

    const projectHosts = await db
      .select()
      .from(hosts)
      .where(eq(hosts.projectId, project.id));

    const hostCompanyMap = new Map(
      projectHosts.map((host) => [host.id, host.companyId || defaultCompanyId]),
    );

    const vulnsToUpdate = await db
      .select()
      .from(vulnerabilities)
      .where(and(eq(vulnerabilities.projectId, project.id), isNull(vulnerabilities.companyId)));

    for (const vuln of vulnsToUpdate) {
      const resolvedCompanyId = vuln.hostId
        ? hostCompanyMap.get(vuln.hostId) || defaultCompanyId
        : defaultCompanyId;
      await db
        .update(vulnerabilities)
        .set({ companyId: resolvedCompanyId })
        .where(eq(vulnerabilities.id, vuln.id));
    }

    const scansToUpdate = await db
      .select()
      .from(scans)
      .where(and(eq(scans.projectId, project.id), isNull(scans.companyId)));

    for (const scan of scansToUpdate) {
      await db
        .update(scans)
        .set({ companyId: defaultCompanyId })
        .where(eq(scans.id, scan.id));
    }
  }
}
