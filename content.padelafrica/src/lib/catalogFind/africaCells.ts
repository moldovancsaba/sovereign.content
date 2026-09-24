/**
 * Africa research cells — capitals + secondary cities for continent FIND.
 * Capitals first; secondary cities are deepen targets when the capital is already sampled.
 */

export type CountryCellMeta = {
  cc: string;
  country: string;
  /** Primary research city (usually capital / largest known padel hub). */
  capital: string;
  /** Other cities worth a dedicated FIND pass once capital has ≥1 venue. */
  secondary: string[];
  /** slug for fixture filenames */
  slug: string;
  /** ISO3-ish record prefix used in research fixtures (e.g. SEN, LBY). */
  recordPrefix: string;
};

/** 54 UN M49 Africa member states — research geography for catalog:find. */
export const AFRICA_FIND_CELLS: readonly CountryCellMeta[] = [
  // Northern
  { cc: "DZ", country: "Algeria", capital: "Algiers", secondary: ["Oran", "Constantine", "Annaba"], slug: "algeria", recordPrefix: "DZA" },
  { cc: "EG", country: "Egypt", capital: "Cairo", secondary: ["Alexandria", "Giza", "Hurghada", "Sharm El Sheikh"], slug: "egypt", recordPrefix: "EGY" },
  { cc: "LY", country: "Libya", capital: "Tripoli", secondary: ["Benghazi", "Misrata"], slug: "libya", recordPrefix: "LBY" },
  { cc: "MA", country: "Morocco", capital: "Casablanca", secondary: ["Rabat", "Marrakech", "Agadir", "Tangier", "Fes"], slug: "morocco", recordPrefix: "MAR" },
  { cc: "SD", country: "Sudan", capital: "Khartoum", secondary: ["Omdurman", "Port Sudan"], slug: "sudan", recordPrefix: "SDN" },
  { cc: "TN", country: "Tunisia", capital: "Tunis", secondary: ["Sfax", "Sousse", "Hammamet"], slug: "tunisia", recordPrefix: "TUN" },
  // Western
  { cc: "BJ", country: "Benin", capital: "Cotonou", secondary: ["Porto-Novo", "Parakou"], slug: "benin", recordPrefix: "BEN" },
  { cc: "BF", country: "Burkina Faso", capital: "Ouagadougou", secondary: ["Bobo-Dioulasso"], slug: "burkina-faso", recordPrefix: "BFA" },
  { cc: "CV", country: "Cabo Verde", capital: "Praia", secondary: ["Mindelo", "Santa Maria", "Sal Rei"], slug: "cabo-verde", recordPrefix: "CPV" },
  { cc: "CI", country: "Côte d'Ivoire", capital: "Abidjan", secondary: ["Yamoussoukro", "Bouaké", "San-Pédro"], slug: "ivory-coast", recordPrefix: "CIV" },
  { cc: "GM", country: "Gambia", capital: "Banjul", secondary: ["Serekunda", "Kololi"], slug: "gambia", recordPrefix: "GMB" },
  { cc: "GH", country: "Ghana", capital: "Accra", secondary: ["Kumasi", "Tema", "Cape Coast"], slug: "ghana", recordPrefix: "GHA" },
  { cc: "GN", country: "Guinea", capital: "Conakry", secondary: ["Kindia"], slug: "guinea", recordPrefix: "GIN" },
  { cc: "GW", country: "Guinea-Bissau", capital: "Bissau", secondary: [], slug: "guinea-bissau", recordPrefix: "GNB" },
  { cc: "LR", country: "Liberia", capital: "Monrovia", secondary: [], slug: "liberia", recordPrefix: "LBR" },
  { cc: "ML", country: "Mali", capital: "Bamako", secondary: ["Sikasso"], slug: "mali", recordPrefix: "MLI" },
  { cc: "MR", country: "Mauritania", capital: "Nouakchott", secondary: ["Nouadhibou"], slug: "mauritania", recordPrefix: "MRT" },
  { cc: "NE", country: "Niger", capital: "Niamey", secondary: [], slug: "niger", recordPrefix: "NER" },
  { cc: "NG", country: "Nigeria", capital: "Lagos", secondary: ["Abuja", "Port Harcourt", "Ibadan", "Kano"], slug: "nigeria", recordPrefix: "NGA" },
  { cc: "SN", country: "Senegal", capital: "Dakar", secondary: ["Thiès", "Saint-Louis", "Mbour"], slug: "senegal", recordPrefix: "SEN" },
  { cc: "SL", country: "Sierra Leone", capital: "Freetown", secondary: ["Bo"], slug: "sierra-leone", recordPrefix: "SLE" },
  { cc: "TG", country: "Togo", capital: "Lomé", secondary: ["Kara"], slug: "togo", recordPrefix: "TGO" },
  // Middle
  { cc: "AO", country: "Angola", capital: "Luanda", secondary: ["Benguela", "Lobito", "Lubango"], slug: "angola", recordPrefix: "AGO" },
  { cc: "CM", country: "Cameroon", capital: "Douala", secondary: ["Yaoundé", "Bafoussam", "Limbe"], slug: "cameroon", recordPrefix: "CMR" },
  { cc: "CF", country: "Central African Republic", capital: "Bangui", secondary: [], slug: "central-african-republic", recordPrefix: "CAF" },
  { cc: "TD", country: "Chad", capital: "N'Djamena", secondary: [], slug: "chad", recordPrefix: "TCD" },
  { cc: "CG", country: "Republic of the Congo", capital: "Brazzaville", secondary: ["Pointe-Noire"], slug: "republic-of-the-congo", recordPrefix: "COG" },
  { cc: "CD", country: "DRC", capital: "Kinshasa", secondary: ["Lubumbashi", "Goma", "Kisangani"], slug: "democratic-republic-of-the-congo", recordPrefix: "COD" },
  { cc: "GQ", country: "Equatorial Guinea", capital: "Malabo", secondary: ["Bata"], slug: "equatorial-guinea", recordPrefix: "GNQ" },
  { cc: "GA", country: "Gabon", capital: "Libreville", secondary: ["Port-Gentil"], slug: "gabon", recordPrefix: "GAB" },
  { cc: "ST", country: "São Tomé and Príncipe", capital: "São Tomé", secondary: [], slug: "sao-tome", recordPrefix: "STP" },
  // Eastern
  { cc: "BI", country: "Burundi", capital: "Bujumbura", secondary: ["Gitega"], slug: "burundi", recordPrefix: "BDI" },
  { cc: "KM", country: "Comoros", capital: "Moroni", secondary: [], slug: "comoros", recordPrefix: "COM" },
  { cc: "DJ", country: "Djibouti", capital: "Djibouti City", secondary: [], slug: "djibouti", recordPrefix: "DJI" },
  { cc: "ER", country: "Eritrea", capital: "Asmara", secondary: [], slug: "eritrea", recordPrefix: "ERI" },
  { cc: "ET", country: "Ethiopia", capital: "Addis Ababa", secondary: ["Dire Dawa", "Hawassa"], slug: "ethiopia", recordPrefix: "ETH" },
  { cc: "KE", country: "Kenya", capital: "Nairobi", secondary: ["Mombasa", "Kisumu", "Nakuru"], slug: "kenya", recordPrefix: "KEN" },
  { cc: "MG", country: "Madagascar", capital: "Antananarivo", secondary: ["Toamasina", "Mahajanga"], slug: "madagascar", recordPrefix: "MDG" },
  { cc: "MW", country: "Malawi", capital: "Lilongwe", secondary: ["Blantyre"], slug: "malawi", recordPrefix: "MWI" },
  { cc: "MU", country: "Mauritius", capital: "Port Louis", secondary: ["Grand Baie", "Flic en Flac"], slug: "mauritius", recordPrefix: "MUS" },
  { cc: "MZ", country: "Mozambique", capital: "Maputo", secondary: ["Beira", "Nampula", "Tofo"], slug: "mozambique", recordPrefix: "MOZ" },
  { cc: "RW", country: "Rwanda", capital: "Kigali", secondary: ["Musanze"], slug: "rwanda", recordPrefix: "RWA" },
  { cc: "SC", country: "Seychelles", capital: "Victoria", secondary: ["Eden Island", "Praslin"], slug: "seychelles", recordPrefix: "SYC" },
  { cc: "SO", country: "Somalia", capital: "Mogadishu", secondary: ["Hargeisa", "Bosaso"], slug: "somalia", recordPrefix: "SOM" },
  { cc: "SS", country: "South Sudan", capital: "Juba", secondary: [], slug: "south-sudan", recordPrefix: "SSD" },
  { cc: "TZ", country: "Tanzania", capital: "Dar es Salaam", secondary: ["Arusha", "Zanzibar", "Mwanza", "Dodoma"], slug: "tanzania", recordPrefix: "TZA" },
  { cc: "UG", country: "Uganda", capital: "Kampala", secondary: ["Entebbe", "Jinja"], slug: "uganda", recordPrefix: "UGA" },
  { cc: "ZM", country: "Zambia", capital: "Lusaka", secondary: ["Ndola", "Livingstone", "Kitwe"], slug: "zambia", recordPrefix: "ZMB" },
  { cc: "ZW", country: "Zimbabwe", capital: "Harare", secondary: ["Bulawayo", "Victoria Falls"], slug: "zimbabwe", recordPrefix: "ZWE" },
  // Southern
  { cc: "BW", country: "Botswana", capital: "Gaborone", secondary: ["Francistown", "Maun"], slug: "botswana", recordPrefix: "BWA" },
  { cc: "SZ", country: "Eswatini", capital: "Mbabane", secondary: ["Manzini", "Malkerns"], slug: "eswatini", recordPrefix: "SWZ" },
  { cc: "LS", country: "Lesotho", capital: "Maseru", secondary: [], slug: "lesotho", recordPrefix: "LSO" },
  { cc: "NA", country: "Namibia", capital: "Windhoek", secondary: ["Swakopmund", "Walvis Bay"], slug: "namibia", recordPrefix: "NAM" },
  { cc: "ZA", country: "South Africa", capital: "Johannesburg", secondary: ["Cape Town", "Durban", "Pretoria", "Sandton", "Stellenbosch"], slug: "south-africa", recordPrefix: "ZAF" },
] as const;

export const AFRICA_FIND_BY_CC: ReadonlyMap<string, CountryCellMeta> = new Map(
  AFRICA_FIND_CELLS.map((c) => [c.cc, c]),
);

export const AFRICA_ISO = AFRICA_FIND_CELLS.map((c) => c.cc);
