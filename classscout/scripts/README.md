# ClassScout catalog-loop runners

**Home:** `sovereign.content/classscout/scripts/`  
**Product:** set `CLASSSCOUT_PRODUCT_ROOT` to a `moldovancsaba/classscout` checkout (defaults to `/workspace` in Cloud Agent VMs).

Listing writes: `POST /api/ingest` (+ upload) only — see `../ingest/content-data-contract.md`.

```bash
export CLASSSCOUT_PRODUCT_ROOT=/path/to/classscout
export INGEST_API_KEY=…
export CATALOG_LOOP_BASE_URL=https://getyourfield.com   # if used by runners
npm run catalog-loop:forever   # from ../package.json
```

Runtime state lives under `scripts/data/` (gitignored). Do not commit `find-seeds.json` queues.
