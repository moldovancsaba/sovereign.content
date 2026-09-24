const assert = require("assert");

process.env.CATALOG_SELF_HEAL_AUTO_BATCH_LIMIT = "5";

const {
  DELIVERY_KINDS,
  classifyDelivery,
  classifyBriefs,
  deliveryQueues,
  kindsForBrief,
} = require("./selfHealDeliveryPolicy.cjs");

// Auto: chrome strip
{
  const d = classifyDelivery({ kind: DELIVERY_KINDS.ABOUT_CHROME_STRIP, count: 3 });
  assert.equal(d.lane, "auto");
}

// HitL: hide
{
  const d = classifyDelivery({
    kind: DELIVERY_KINDS.HIDE_OR_QUARANTINE,
    count: 1,
    wouldChangeVisibility: true,
  });
  assert.equal(d.lane, "hitl_review");
  assert.ok(d.ownerQuestion);
}

// Contact without evidence escalates
{
  const d = classifyDelivery({
    kind: DELIVERY_KINDS.CONTACT_FROM_OFFICIAL_PAGE,
    count: 2,
    hasOfficialEvidence: false,
  });
  assert.equal(d.lane, "hitl_review");
}

// Operator note must not drive About compose alone
{
  const d = classifyDelivery({
    kind: DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS,
    count: 1,
    fromOperatorNote: true,
  });
  assert.equal(d.lane, "hitl_review");
}

// Invent facts fail closed
{
  const d = classifyDelivery({
    kind: DELIVERY_KINDS.QUALITY_IMPROVE_EVIDENCE,
    count: 1,
    wouldInventFacts: true,
  });
  assert.equal(d.lane, "hitl_review");
}

// Bulk above limit (env set before require)
{
  const d = classifyDelivery({ kind: DELIVERY_KINDS.ABOUT_CHROME_STRIP, count: 50 });
  assert.equal(d.lane, "hitl_review");
}

// Brief → kinds
{
  assert.ok(kindsForBrief({ reason: "weak_about_debt" }).includes(DELIVERY_KINDS.ABOUT_CHROME_STRIP));
  assert.ok(
    kindsForBrief({ reason: "contact_research_debt" }).includes(DELIVERY_KINDS.CONTACT_NO_EVIDENCE_RESEARCH)
  );
}

// classifyBriefs splits auto vs hitl
{
  const classified = classifyBriefs(
    [{ action: "catalog:about-curate", reason: "weak_about_debt", detail: "test" }],
    {
      openRecs: [
        { providerId: "a", status: "open", gaps: ["weak_description"] },
        { providerId: "b", status: "open", gaps: ["blank_contacts"], researchDebt: "no_evidence" },
      ],
      exhaustedAddressIds: ["x"],
    }
  );
  assert.equal(classified.length, 1);
  assert.equal(classified[0].delivery.canAutoDeliver, true);
  const q = deliveryQueues(classified);
  assert.ok(q.auto.some((d) => d.kind === DELIVERY_KINDS.ABOUT_CHROME_STRIP || d.kind === DELIVERY_KINDS.ABOUT_COMPOSE_FROM_FACTS));
}

console.log("selfHealDeliveryPolicy.test.cjs: ok");
