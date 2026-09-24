# Migration: Sovereign Content Separation

**Date:** 2026-09-24  
**Status:** In Progress  
**Priority:** CRITICAL — Production Outage + Branch Broken  
**Target:** Move all sovereign code to `moldovancsaba/sovereign.content`

---

## Incident Summary

### Problem 1: Production Outage
`sport.doneisbetter.com/browse` went down because a listing was written with incorrect schedule shape:

**❌ What was written (WRONG):**
```typescript
schedule.recurring = [{
  weekdays: ["monday", "tuesday", ...],  // ARRAY — WRONG!
  startTime: "10:00",
  endTime: "11:00",
  note: "..."
}]
```

**✅ Correct data contract:**
```typescript
schedule.recurring = [
  { weekday: "mon", startTime: "10:00", endTime: "11:00" },  // ONE per weekday
  { weekday: "tue", startTime: "10:00", endTime: "11:00" },
  // ... separate object for each day
]
```

**Root cause:** Sovereign agent's internal `ContentCard.schedule` model uses string array format (`["Monday 10:00-11:00", "Wednesday 15:00-16:00"]`) which differs from management app's `RecurringSlot` structure. Conversion logic bypassed validated write path.

### Problem 2: Broken Release Branch
`release/sportolok` has diverged from `main` by 20+ commits and can no longer be fast-forwarded. This blocks all engineering changes from reaching sportolok.

---

## What Must Move

### Files to Move to `moldovancsaba/sovereign.content/sportolok/`

**Core sovereign system:**
```
src/lib/sovereign/
├── agent.ts
├── agent.test.ts
├── delivery.ts
├── delivery.test.ts
├── executor.ts
├── lessons.ts
├── approvalRequest.ts
└── reviewDoc.ts
```

**Sovereign API routes:**
```
src/app/api/sovereign/
├── evaluate/route.ts
├── status/route.ts
└── status/route.test.ts

src/app/api/cron/
└── sovereign-delivery-optimizer/route.ts
```

**Sovereign scripts:**
```
scripts/
├── test-sovereign-scenarios.ts
├── demo-sovereign-scenarios.ts
├── verify-sovereign-deployment.ts
└── seed-quality-lessons.mts
```

**Sovereign documentation:**
```
docs/
├── sovereign-content-*.md (all sovereign docs)
├── sovereign-testing-guide.md
├── sovereign-deployment-checklist.md
├── sovereign-system-README.md
├── sovereign-intelligence-enhancement.md
├── SOVEREIGN-CONTENT-DELIVERED.md
├── INTELLIGENT-SELF-HEALING-DELIVERED.md
├── self-healing-*.md (all self-healing docs)
└── All other autonomous/self-heal/sovereignty docs
```

---

## What Must Be Reverted

### Shared Engine Files (Revert to `main`)

These files were modified on `release/sportolok` but must be reverted:

1. **`src/lib/pipeline/extraction.ts`**
   - Ollama removal changes
   - `AGENT_OWNED_LLM_DETAIL` additions
   - Must be proposed as PR to `main` if needed

2. **`src/lib/catalogHygiene/descriptionQuality.ts`**
   - Quality gate logic additions
   - Must be proposed as PR to `main` if needed

3. **`src/lib/vertical/pack.ts`**
   - Any sovereign-specific additions
   - Revert to `main`

4. **`src/lib/flags/registry.ts`**
   - Removal of `OLLAMA_*` flags
   - Must be proposed as PR to `main` if needed

5. **`vercel.json`**
   - Cron entries for `media-curate`, `sovereign-delivery-optimizer`
   - Remove from `release/sportolok`

---

## Target Repository Structure

```
moldovancsaba/sovereign.content/
├── sportolok/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── sovereign/         # All sovereign logic
│   │   │   ├── catalog/           # Catalog jobs (media, quality, etc)
│   │   │   └── integration/       # API client for management app
│   │   └── scripts/
│   │       ├── catalog-*.mts      # All catalog jobs
│   │       └── seed-*.mts         # Setup scripts
│   ├── docs/
│   │   └── (all sovereign docs)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── padel-africa/
    ├── (same structure, independent)
    └── README.md
```

**Rules:**
- Each client folder is fully self-contained
- No imports between client folders
- Independently runnable and deployable
- Each has own dependencies, config, docs

---

## How Sovereign Agent Talks to Management App

### After Separation: API-Only

**✅ Allowed:**
- Call `/api/ingest` with authenticated machine token (SSO)
- Use public, documented, authenticated API endpoints only

**❌ Forbidden:**
- Add routes to `management` repository
- Add libraries to `management` repository
- Write directly to shared MongoDB
- Run cron jobs from inside `management` deployment

---

## Data Contract Fix

### Schedule Conversion Must Produce Correct Shape

**Current (ContentCard internal):**
```typescript
schedule: string[] = ["Monday 10:00-11:00", "Wednesday 15:00-16:00"]
```

**Must convert to (RecurringSlot[]):**
```typescript
schedule: {
  timezone: "Europe/Budapest",
  recurring: [
    { weekday: "mon", startTime: "10:00", endTime: "11:00" },
    { weekday: "wed", startTime: "15:00", endTime: "16:00" }
  ],
  sessions: []
}
```

**Rules:**
1. ONE `RecurringSlot` object per weekday (never array of weekdays)
2. `weekday` is singular: `"mon"` | `"tue"` | `"wed"` | `"thu"` | `"fri"` | `"sat"` | `"sun"`
3. `startTime` and `endTime` are `"HH:MM"` format (24-hour)
4. `from` and `until` are optional `"YYYY-MM-DD"` bounds
5. `timezone` is IANA name (e.g., `"Europe/Budapest"`)

**Validation:**
- Use `RecurringSlotSchema` from `src/lib/schedule/schedule.ts`
- Use `ScheduleSchema` for full schedule object
- Verify with Zod parse before submitting to API

---

## Migration Steps

### Phase 1: Create New Repository
1. ✅ Create `moldovancsaba/sovereign.content` repository
2. ✅ Set up `sportolok/` folder structure
3. ✅ Set up `padel-africa/` folder structure
4. ✅ Initialize package.json, tsconfig.json for each

### Phase 2: Move Sovereign Code
5. ⏳ Copy all files from "What Must Move" list
6. ⏳ Update imports to work in new structure
7. ⏳ Create API client for management app integration
8. ⏳ Test all scripts run independently

### Phase 3: Fix Data Contract
9. ⏳ Implement schedule string → RecurringSlot[] converter
10. ⏳ Add Zod validation before API submission
11. ⏳ Test with real sportolok data
12. ⏳ Verify no `weekdays` array produced

### Phase 4: Revert Shared Files
13. ⏳ Revert `src/lib/pipeline/extraction.ts` to main
14. ⏳ Revert `src/lib/catalogHygiene/descriptionQuality.ts` to main
15. ⏳ Revert `src/lib/vertical/pack.ts` to main
16. ⏳ Revert `src/lib/flags/registry.ts` to main
17. ⏳ Revert `vercel.json` cron entries to main

### Phase 5: Delete Sovereign Code from Management
18. ⏳ Delete `src/lib/sovereign/` directory
19. ⏳ Delete `src/app/api/sovereign/` directory
20. ⏳ Delete `src/app/api/cron/sovereign-delivery-optimizer/`
21. ⏳ Delete sovereign scripts
22. ⏳ Delete sovereign docs

### Phase 6: Deploy and Verify
23. ⏳ Deploy sovereign.content/sportolok as independent system
24. ⏳ Configure machine token for /api/ingest access
25. ⏳ Test full flow: discover → extract → convert → submit
26. ⏳ Verify schedule shape with real listing
27. ⏳ Monitor for errors

### Phase 7: Confirm Completion
28. ⏳ Report to core team that migration is complete
29. ⏳ Core team reconciles `release/sportolok` back to fast-forwardable state

---

## Definition of Done

- [ ] `moldovancsaba/sovereign.content` exists with `sportolok/` and `padel-africa/` folders
- [ ] Every sovereign-specific file removed from `moldovancsaba/management`
- [ ] Every shared engine file reverted to match `main`
- [ ] Sovereign agent runs as independent deployment
- [ ] Sovereign agent calls only `/api/ingest` (authenticated)
- [ ] Schedule conversion produces correct `RecurringSlot[]` shape (verified)
- [ ] No `weekdays` array ever produced
- [ ] Full flow tested with real sportolok data
- [ ] Core team notified that migration is complete

---

## Schedule Conversion Implementation

### Parser: String → RecurringSlot[]

```typescript
import { RecurringSlotSchema, type RecurringSlot, type Weekday, WEEKDAYS } from "@management/schedule";

const WEEKDAY_MAP: Record<string, Weekday> = {
  "monday": "mon",
  "tuesday": "tue", 
  "wednesday": "wed",
  "thursday": "thu",
  "friday": "fri",
  "saturday": "sat",
  "sunday": "sun"
};

function parseScheduleStrings(
  scheduleStrings: string[],
  timezone: string = "Europe/Budapest"
): { timezone: string; recurring: RecurringSlot[]; sessions: [] } {
  const recurring: RecurringSlot[] = [];
  
  for (const str of scheduleStrings) {
    // Parse "Monday 10:00-11:00" or "Wed 14:00-15:30"
    const match = str.match(/^(\w+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) {
      console.warn(`Could not parse schedule string: ${str}`);
      continue;
    }
    
    const [, dayName, startTime, endTime] = match;
    const weekday = WEEKDAY_MAP[dayName.toLowerCase()];
    
    if (!weekday) {
      console.warn(`Unknown weekday: ${dayName}`);
      continue;
    }
    
    const slot: RecurringSlot = {
      weekday,
      startTime,
      endTime
    };
    
    // Validate with Zod
    const parsed = RecurringSlotSchema.safeParse(slot);
    if (!parsed.success) {
      console.error(`Invalid RecurringSlot:`, parsed.error);
      continue;
    }
    
    recurring.push(parsed.data);
  }
  
  return {
    timezone,
    recurring,
    sessions: []
  };
}

// Usage in conversion:
const cardSchedule = ["Monday 10:00-11:00", "Wednesday 15:00-16:00"];
const listingSchedule = parseScheduleStrings(cardSchedule, "Europe/Budapest");
// Result:
// {
//   timezone: "Europe/Budapest",
//   recurring: [
//     { weekday: "mon", startTime: "10:00", endTime: "11:00" },
//     { weekday: "wed", startTime: "15:00", endTime: "16:00" }
//   ],
//   sessions: []
// }
```

**Critical validation:**
```typescript
// BEFORE submitting to /api/ingest:
import { ScheduleSchema } from "@management/schedule";

const validated = ScheduleSchema.safeParse(listingSchedule);
if (!validated.success) {
  throw new Error(`Schedule validation failed: ${validated.error}`);
}

await submitToManagementAPI(validated.data);
```

---

## Timeline

**Immediate (This Session):**
- Create migration document ✅
- Understand data contract ✅
- Identify all files to move
- Plan repository structure

**Next Session:**
- Create `sovereign.content` repository
- Move all sovereign code
- Implement schedule converter
- Revert shared files
- Test end-to-end

**After Migration:**
- Core team reconciles `release/sportolok`
- Resume normal development

---

## Risk Mitigation

### Risks
1. **Data loss:** Moving code might lose history
   - **Mitigation:** Keep full git history, reference commits
2. **Broken dependencies:** New repo might have missing deps
   - **Mitigation:** Copy package.json, test all scripts
3. **API auth failure:** Machine token might not work
   - **Mitigation:** Test with /api/ingest first, verify permissions
4. **Schedule conversion bugs:** Might still produce wrong shape
   - **Mitigation:** Zod validation, unit tests, real data verification

---

## Next Actions

1. Wait for user confirmation or clarification
2. Create `moldovancsaba/sovereign.content` repository (need GitHub access)
3. Begin file migration
4. Implement schedule converter
5. Test and verify
6. Report completion to core team

---

**Status:** Ready to begin migration  
**Blockers:** Need confirmation to proceed, GitHub repo creation access  
**ETA:** 1-2 sessions for complete migration
