import net from "net";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { hosts } from "@shared/schema";

export async function backfillDomains() {
  const candidates = await db.select().from(hosts);

  for (const host of candidates) {
    const ipValue = (host.ipAddress || "").trim();
    const domainValue = (host.domain || "").trim();
    if (!ipValue && !domainValue) {
      await db.delete(hosts).where(eq(hosts.id, host.id));
      continue;
    }
    if (domainValue) {
      continue;
    }
    if (net.isIP(ipValue)) {
      continue;
    }
    await db
      .update(hosts)
      .set({ domain: ipValue, ipAddress: "" })
      .where(eq(hosts.id, host.id));
  }
}
