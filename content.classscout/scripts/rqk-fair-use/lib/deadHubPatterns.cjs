/**
 * Known-dead / non-provider hub URL patterns per fair-use source.
 * These repeatedly 404 or are editorial hubs — never enqueue or re-fetch them.
 */
const DEAD_HUB_PATTERNS = Object.freeze({
  "timeout-ny-kids": [
    /\/new-york-kids\/attractions\/?$/i,
    /\/new-york-kids\/museums\/?$/i,
    /\/new-york-kids\/shopping\/?$/i,
    /\/new-york-kids\/restaurants\/?$/i,
  ],
  "park-slope-parents": [
    /\/reviews\/home-life\//i,
    /\/reviews\/.*?\/plumbers/i,
    /\/reviews\/.*?\/handypeople/i,
    /\/reviews\/.*?\/architects/i,
  ],
  "mommy-poppins": [/\/los-angeles\//i, /\/chicago\//i, /\/san-francisco\//i],
  beakid: [/\/ny\/brooklyn\/?$/i, /explore\s+brooklyn/i],
});

/**
 * @param {string} url
 * @param {string} [sourceId]
 */
function isDeadHubUrl(url, sourceId) {
  if (!url) return false;
  const patterns = [
    ...(DEAD_HUB_PATTERNS[sourceId] || []),
    // Cross-source: WhatsApp share links are never official provider sites.
    /wa\.me\//i,
    /api\.whatsapp\.com/i,
  ];
  return patterns.some((re) => re.test(String(url)));
}

module.exports = { DEAD_HUB_PATTERNS, isDeadHubUrl };
