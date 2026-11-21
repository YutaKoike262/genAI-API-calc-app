# Project reference

- Repository: the root containing this skill and `public/api-cost/`.
- Authoritative pricing master, requiring authenticated Google Sheets access: https://docs.google.com/spreadsheets/d/11nU1ZoJz_E1NDNOCJKPDMj-RJGhjL4Yud3QQC-rMkKg/edit
- Production calculator: https://zinsei-lab.com/api-cost/
- `docs/drive-setup.md` identifies the published sheet and tab URLs. Confirm these remain current.
- Nine tabs are consumed: `providers`, `models`, `prices`, `image_prices`, `video_prices`, `features`, `params`, `param_map`, `meta`. Read live headers and metadata; do not assume row numbers.
- `public/api-cost/assets/data.js` owns validation and scheduled pricing. `core.js` owns calculations and generated requests. Inspect current behavior before adding a model. In particular, the video calculation has a fixed 720p and 3–10 second implementation; do not imply that broader video capabilities are supported without updating it.
- `scripts/prepare-site.mjs` fetches published CSVs during deployment, validates them, writes local CSVs, and regenerates the static rate table. It mutates working-tree files when run locally, so use an isolated copy or inspect changes carefully.
- The `.github/workflows/cloudflare-pages.yml` workflow is manually dispatched and tests, prepares data, and deploys the committed ref. Check the workflow before invoking; use `gh run watch <run-id> --exit-status` and verify production after success.
- Existing shell commands include `npm test` and `npm run check -- --production`. Real sheet data and boundary-date scenarios need validation in addition to these checks.
- The master may contain scheduled dates and fractional rates. Preserve precision in native cells and published CSVs. Maintain `meta.dataset_version` and `updated_at` truthfully; do not advance currency or image-rate verification dates without checking them.
