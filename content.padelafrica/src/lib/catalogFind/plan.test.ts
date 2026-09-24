import { describe, expect, it } from "vitest";
import { buildFindPlan, pickNext } from "./plan";
import { buildFindBrief } from "./brief";
import { AFRICA_FIND_CELLS, AFRICA_ISO } from "./africaCells";
import { buildSearchQueries } from "./sources";

describe("catalogFind continent plan", () => {
  it("covers all 54 Africa member states", () => {
    expect(AFRICA_ISO).toHaveLength(54);
    expect(AFRICA_FIND_CELLS).toHaveLength(54);
  });

  it("prioritizes missing capitals before sparse and deepen", () => {
    const plan = buildFindPlan(
      {
        KE: { n: 5, names: ["A", "B", "C", "D", "E"], cities: { Nairobi: 5 } },
        BJ: { n: 1, names: ["Cotonou Padel Club"], cities: { Cotonou: 1 } },
        SN: { n: 3, names: ["a", "b", "c"], cities: { Dakar: 3 } },
      },
      [],
      { limit: 120 },
    );
    expect(plan.missingCount).toBe(54 - 3);
    expect(plan.next?.priority).toBe("missing");
    expect(plan.next?.city).toBeTruthy();
    const sparse = plan.cells.find((c) => c.cc === "BJ");
    expect(sparse?.priority).toBe("sparse_n1");
    const deepen = plan.cells.find((c) => c.cc === "KE" && c.city === "Mombasa");
    expect(deepen?.priority).toBe("deepen_large");
    const snDeepen = plan.cells.find((c) => c.cc === "SN" && c.city === "Thiès");
    expect(snDeepen?.priority).toBe("deepen_city");
  });

  it("cools zero-result cells so the plan rotates", () => {
    const byCc = Object.fromEntries(
      AFRICA_ISO.map((cc) => [cc, { n: 3, names: ["x"], cities: { Cap: 3 } }]),
    );
    byCc.BJ = { n: 1, names: ["Cotonou Padel Club"], cities: { Cotonou: 1 } };
    delete byCc.CF; // still missing
    const plan = buildFindPlan(
      byCc,
      [{ cc: "CF", city: "Bangui", at: new Date().toISOString(), outcome: "zero-result" }],
      { limit: 120 },
    );
    const cf = plan.cells.find((c) => c.cc === "CF");
    expect(cf?.reason.includes("cooldown")).toBe(true);
    // Cooled missing sorts after sparse — next should be BJ sparse_n1, not CF
    expect(plan.next?.cc).toBe("BJ");
    expect(plan.next?.priority).toBe("sparse_n1");
  });

  it("emits an agentRequired brief with search queries and evidence bar", () => {
    const plan = buildFindPlan(
      { BJ: { n: 1, names: ["Cotonou Padel Club"], cities: { Cotonou: 1 } } },
      [],
      { limit: 120 },
    );
    const cell = pickNext(plan, { cc: "BJ" });
    expect(cell).toBeTruthy();
    const brief = buildFindBrief(cell!);
    expect(brief.agentRequired).toBe(true);
    expect(brief.searchQueries.length).toBeGreaterThanOrEqual(5);
    expect(brief.excludeNames).toContain("Cotonou Padel Club");
    expect(brief.evidenceBar.length).toBeGreaterThan(3);
    expect(brief.applyCommands[0]).toContain("--dry-run");
  });

  it("builds city-scoped search queries", () => {
    const q = buildSearchQueries("Kenya", "Mombasa", "KE");
    expect(q.some((s) => s.includes("Mombasa"))).toBe(true);
    expect(q.some((s) => s.includes("padellands"))).toBe(true);
  });

  it("until-found campaign prefers deepen/high-yield and skips cooled cells", async () => {
    const { buildUntilFoundCampaign } = await import("./campaign");
    const byCc = Object.fromEntries(
      AFRICA_ISO.map((cc) => [cc, { n: 5, names: ["a", "b", "c", "d", "e"], cities: { Cap: 5 } }]),
    );
    // Nairobi-only KE → Mombasa deepen_large; Accra-only GH → Kumasi
    byCc.KE = { n: 5, names: ["n1", "n2", "n3", "n4", "n5"], cities: { Nairobi: 5 } };
    byCc.GH = { n: 4, names: ["g1", "g2", "g3", "g4"], cities: { Accra: 4 } };
    byCc.BJ = { n: 1, names: ["Cotonou Padel Club"], cities: { Cotonou: 1 } };
    const campaign = buildUntilFoundCampaign(
      byCc,
      [{ cc: "BJ", city: "Porto-Novo", at: new Date().toISOString(), outcome: "zero-result" }],
      { maxCells: 6, yieldBias: true },
    );
    expect(campaign.mode).toBe("until-found");
    expect(campaign.agentRequired).toBe(true);
    expect(campaign.stopWhen).toBe("seeded");
    expect(campaign.cells.length).toBeGreaterThan(0);
    expect(campaign.cells.length).toBeLessThanOrEqual(6);
    expect(campaign.firstBrief.cell.cc).toBe(campaign.cells[0].cc);
    // First cells should be deepen_* not cooled BJ
    expect(campaign.cells[0].priority === "deepen_large" || campaign.cells[0].priority === "deepen_city").toBe(
      true,
    );
    expect(campaign.cells.some((c) => c.cc === "BJ" && c.reason.includes("cooldown"))).toBe(false);
    expect(campaign.instructions.some((s) => s.includes("STOP"))).toBe(true);
  });
});
