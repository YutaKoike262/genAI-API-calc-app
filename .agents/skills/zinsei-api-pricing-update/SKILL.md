---
name: zinsei-api-pricing-update
description: Update zinsei-lab's API pricing spreadsheet and calculator with current OpenAI, Anthropic, and Google model data. Use when asked to check, add, or revise models and pricing for the site's API料金メーター, including deployment when requested or already authorized.
---

# zinsei-lab API料金更新

Use this workflow for the site's pricing master and calculator. Respect the user's requested providers, models, and scope. A request to update the spreadsheet authorizes editing it; deploy when the user requests site reflection or existing authorization covers it.

The native Google Sheet is the authoritative pricing source. Updating model or pricing data requires authenticated read and write access to that sheet. Use an available Google Sheets connector or authenticated Sheets API, and follow an available Google Sheets skill. If access is unavailable, continue independent research and prepare verifiable changes, then report the blocker and the access needed. Do not treat edits to repository CSVs, fallback data, or a copy as an update to the master, or deploy those as a substitute for updating it.

1. Read [references/project.md](references/project.md), the current repository configuration, and the live master sheet before editing. Ground target ranges, validation, formulas, formats, and current values; preserve unrelated data and user work.
2. Browse current official provider model documentation and pricing. Check model ID, lifecycle, input/output limits, API support, standard and batch pricing, cached input, long-context thresholds, and scheduled rates. Verify each source and record the actual confirmation date. Never assume a batch cache rate is half the standard rate without evidence. Distinguish introductory rates, regions, free tiers, and different modalities. Use an OpenAI documentation skill if available, otherwise consult official OpenAI documentation directly.
3. Compare against existing rows. Add only models that the calculator can represent correctly. Include relevant model-specific parameter mappings and pricing tiers. Do not silently approximate unsupported billing or API behavior; disclose excluded or partially supported capabilities, and fix implementation only within authorized scope. Keep historical model IDs needed by existing shared URLs. Avoid changing check dates for rates that were not actually verified.
4. Validate the proposed data with the repository's CSV parser, `normalizeTables`, and calculation engine before writing. Check effective-date boundaries, standard/batch and long-context cases, generated code for text models, and media-specific limits as applicable. Account for current source documents rather than assuming previous rates remain valid.
5. Apply coherent edits to the native sheet and reread the changed ranges, including any affected metadata. Confirm the published CSV contains the new version and parses successfully. Report any layout that cannot be visually verified. Sheet changes alone do not update the site's deployed static CSV.
6. When deployment is in scope, check Git status and the current Cloudflare workflow. Preserve unrelated work. Run appropriate tests, dispatch the existing workflow from the intended committed revision, and monitor through completion. Verify the production calculator loads the intended dataset version, relevant model choices and prices, and at least one calculation. If a deployment or validation fails, diagnose it and report any remaining blocker.

Report changed models, corrected prices, source dates, limitations, sheet link, and deployment status. Link authoritative sources where useful.
