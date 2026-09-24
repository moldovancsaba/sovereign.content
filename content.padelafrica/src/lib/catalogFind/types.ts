/**
 * Continent FIND types — Cloud Agent research discovery for padel-africa.
 * The CLI does not invent venues; it plans cells and emits agent briefs the
 * Cloud Agent must execute with WebSearch / official pages.
 */

export type FindPriority =
  | "missing"
  | "sparse_n1"
  | "sparse_n2"
  | "deepen_city"
  | "deepen_large";

export type FindCell = {
  cc: string;
  country: string;
  city: string;
  priority: FindPriority;
  publishedInCountry: number;
  knownNames: string[];
  knownCities: string[];
  reason: string;
  /** Suggested fixture path under scripts/data/ */
  fixtureHint: string;
  /** Suggested next recordId prefix e.g. TZA-VEN */
  recordIdPrefix: string;
};

export type FindSource = {
  id: string;
  label: string;
  kind: "directory" | "booking" | "federation" | "map" | "news";
  /** URL template; `{country}`, `{city}`, `{cc}` placeholders */
  urlTemplate?: string;
  notes: string;
};

export type FindBrief = {
  job: "catalog:find";
  mode: "brief";
  /** Explicit: the CLI cannot discover venues; the Cloud Agent must. */
  agentRequired: true;
  cell: FindCell;
  searchQueries: string[];
  sourcesToCheck: Array<{ label: string; url?: string; notes: string }>;
  evidenceBar: string[];
  excludeNames: string[];
  steps: string[];
  zeroResultProtocol: string[];
  applyCommands: string[];
};

export type FindPlan = {
  job: "catalog:find";
  mode: "plan";
  published: number;
  countriesWithListings: number;
  missingCount: number;
  sparseCount: number;
  cells: FindCell[];
  strategy: string[];
  next: FindCell | null;
};

/**
 * Do-until-find campaign: ordered cells the Cloud Agent must try until one seeds
 * (or the budget is exhausted). Still evidence-only — never invent.
 */
export type FindCampaign = {
  job: "catalog:find";
  mode: "until-found";
  agentRequired: true;
  maxCells: number;
  stopWhen: "seeded";
  yieldBias: boolean;
  cells: FindCell[];
  /** First cell brief — execute immediately; rebuild --until-found after each zero-result. */
  firstBrief: FindBrief;
  instructions: string[];
};

