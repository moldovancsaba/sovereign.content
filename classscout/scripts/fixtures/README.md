# Catalog-loop extractor fixtures

Regression snippets for Find/Improve extractors (quality plan Phase 4).

| Path | Asserts |
| --- | --- |
| `address/aqua-tots-false-street.html` | Rejects “15 minutes. Please” as a street address |
| `address/valid-west-76th.html` | Accepts a real West 76th Street address |
| `phone/invalid-area-code.html` | Rejects NANP area codes starting with 0/1 |
| `phone/valid-manhattan.html` | Accepts a valid +1 212 number |
| `trial/false-positive-noise.html` | Rejects review/theme noise as trialPolicy |
| `trial/free-trial-class.html` | Accepts stated free trial class copy |

Unit coverage: `src/lib/catalogLoop/extractOfficialPage.test.ts`.
