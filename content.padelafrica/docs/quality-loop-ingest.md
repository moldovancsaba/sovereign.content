# Ingest-backed quality loop (no Mongo)

Entrypoint: `npm run catalog:quality-loop` → `scripts/catalog-quality-loop-ingest.ts`

## Behaviour

1. **Score** all `scripts/data/*-padel-verified.json` About text (`scripts/lib/aboutQuality.ts`).
2. **Improve** rows below target 75 or with defects (`about_thin` / `about_template` / `about_url` / `about_contact_leak` / `about_chrome`) using:
   - `strip_chrome` — remove URLs / contact leaks / chrome
   - `compose_about` — recommendation prose from fixture facts only (never invents courts/prices/phones)
3. **Encode** applied deltas into `scripts/data/listing-quality/lessons.json`.
4. **Apply** via `POST /api/ingest` (`sourceText` + `reprocess: true` on `research-<recordId>`).

Local recommendations: `scripts/data/listing-quality/recommendations.json`.

## Flags

| Command | Meaning |
| --- | --- |
| `npm run catalog:quality-loop:dry` | Score+improve preview, no writes |
| `npm run catalog:quality-loop:score` | Catalogue score scan |
| `npm run catalog:quality-loop` | Apply improve + ingest reprocess |
| `npx tsx scripts/catalog-quality-loop-ingest.ts --test` | Synthetic thin/URL/good fixtures |

## Related

DISCOVERED pipeline feeder: `npm run pipeline:feed-discovered` (create-or-reprocess known ingested cards; management still owns PUBLISHED).
