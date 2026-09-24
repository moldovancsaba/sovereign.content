/**
 * Normalize seed/extract activity tags to canonical public vocabulary spellings.
 * Non-canonical tags (e.g. bare "Skating") pass Find's loose gate then 404 on public
 * detail because `visibleActivityTags` / `hasEnabledActivityTag` hide unreviewed labels.
 *
 * Bare "Skating" only becomes a canonical skate tag when the hint text has independent
 * evidence (roller / skateboard / ice / rink / blade / skate). Callers should pass name,
 * address, researchNote — not longDescription that merely echoes a false "Skating" service.
 */
function normalizeActivityTypes(types, hintText = "") {
  const blob = String(hintText || "").toLowerCase();
  const out = [];
  for (const raw of types || []) {
    let t = String(raw || "").trim();
    if (!t) continue;
    if (t === "Skating") {
      if (/roller/.test(blob)) t = "Roller Skating";
      else if (/skateboard/.test(blob)) t = "Skateboarding";
      else if (/ice|\brink\b|blade|\bskate|\bskating\b/.test(blob)) t = "Ice Skating";
      else continue;
    }
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

module.exports = { normalizeActivityTypes };
