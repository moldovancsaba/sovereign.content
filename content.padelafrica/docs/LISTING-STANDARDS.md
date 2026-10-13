# Padel Africa — listing store & show standards (agent SSOT)

**Date:** 2026-10-13  
**Live engine:** `moldovancsaba/management` → `padel-africa.doneisbetter.com`  
**Mirror evidence:** management `docs/padel-africa-publish-evidence.md` · `src/lib/pipeline/structuredSource.ts` · `src/lib/listing/programs.ts` (`publicContactRows`)

Agents write **cards** via `POST /api/ingest`. The management pipeline extracts, gates, and (when earned) publishes. Never set `lifecycleState: PUBLISHED` from this folder.

## How a listing is stored

Write path: fixture row → **structured `sourceText` headers** → ingest create/reprocess → extraction → draft listing → publish gate.

Use [`ingest/buildStructuredSourceText.ts`](../ingest/buildStructuredSourceText.ts) for every new seed or enrich reprocess. Header contract (leading block, blank line, then prose):

| Header | Maps to | Rules |
| --- | --- | --- |
| `URL:` | card source URL | First-party or booking URL preferred; directory citation OK as research, not as `Website` |
| `Qualified as:` | activity taxonomy | Always `padel-club` for venues |
| `Name:` / `Venue:` | `name` / `venueName` | Required |
| `Address:` | `venue.address.line1` | Prefer published street. If unknown → `Near {city}` |
| `Locality:` | locality | City / town |
| `Country:` / `CountryCode:` | country | ISO-2 in `CountryCode` |
| `Latitude:` / `Longitude:` | geo pin | Required pair when seeding; city pin OK |
| `Website:` | `website` | First-party http(s) only — **never** paste Instagram/Facebook here |
| `Phone:` | `phone` | Optional; never invent / never placeholder |
| `Email:` | staff-only `email` | Optional; never public on the site |
| `Instagram:` | `contactLinks` type `instagram` | Official http(s) profile URL only |
| `Facebook:` | `contactLinks` type `facebook` | Official http(s) URL only |
| `WhatsApp:` | `contactLinks` type `other`, label `WhatsApp` | Must be http(s) (`https://wa.me/…` or `https://api.whatsapp.com/…`). Bare `+digits` → normalize to `wa.me` |
| `Twitter:` | `contactLinks` type `other`, label `X` | Official http(s) x.com / twitter.com URL only |

Bare social handles (`@club`) are **not** links — omit the header rather than invent an href.

## How a listing is shown

| Surface | What visitors see |
| --- | --- |
| Map / browse cards | Serving projection **strips** `phone`, `email`, `contactLinks` (staff-only on cards) |
| Listing detail | `publicContactRows`: if `contactLinks` exist, those rows (no email); else fallback `phone` + `website` |
| Email | Staff editor only — never a public `mailto:` row |

So official Instagram / Facebook / WhatsApp / X on the fixture **must** land in structured social headers (→ `contactLinks`) or the detail contact panel stays empty when phone/website are also absent.

## Evidence / publish honesty (FIND + fair-use + enrich)

| Fact | Posture |
| --- | --- |
| Phone / email | Optional — do not skip seed or block for absence |
| Official social / messaging | Same grade as phone when the venue published the channel |
| No street | `Near {city}` + OSM/Nominatim city pin (`geoPrecision: locality`) |
| Invented fields | Forbidden — empty is honest debt; improve on a later tick |

Management publish gate admits locality pins and social-only contact (`docs/padel-africa-publish-evidence.md`). Agents never claim PUBLISHED.

## Fixture fields (verified JSON)

Country fixtures under `scripts/data/*-padel-verified.json` may carry:

`instagram`, `facebook`, `whatsapp`, `twitter`, `email`, `phone`, `website`, `line1`, `lat`/`lng`, `geoPrecision`, `description`, `primarySourceUrl`, …

`buildStructuredSourceText` is the only place that turns those into ingest headers. Keep tick-ingest one-offs calling that helper (or copy its output shape).

## Schedule patches (PUBLISHED only)

Singular `weekday` per slot — see [`ingest/content-data-contract.md`](../ingest/content-data-contract.md). Never `weekdays: []`.
