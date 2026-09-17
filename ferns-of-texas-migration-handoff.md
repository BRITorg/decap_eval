# Ferns of Texas — Migration Handoff Doc

Planning conversation summary, handed off for hands-on execution in Claude Code.

## Background

- Live site: https://ferns.brit.org — companion site to *The Ferns and Lycophytes of Texas* (Diggs & Lipscomb, BRIT Press, 2014).
- Confirmed **Drupal 7** (14-year-old admin account, `?q=` URL pattern, Overlay module behavior — Overlay was core-only in D7, removed in D8+).
- Admin UI (`/admin/reports/status` and other admin pages) currently 404s or throws "unexpected error" — likely PHP version drift vs. old D7 module code. Not a blocker; migration will work directly against the DB, not the admin UI.
- Content is "bare bones": book-derived species descriptions, images, a "visual key" feature, herbarium-derived info. No confirmed custom/contrib modules yet — needs verification once inside the DB/filesystem.
- Content changes rarely. Owner does not want to be the person maintaining a CMS going forward.
- Hosting note: original plan was to deploy via an existing Coolify instance (local VM → cloud VM). **This has been superseded** — see Decision Summary. Coolify is no longer the intended host unless a reason emerges to revisit it.

## Decision Summary

| Area | Decision |
|---|---|
| Target platform | **Static site** (not Drupal 10/11) — content is stable/low-change, so a full CMS's ongoing maintenance isn't worth it. |
| Static site generator | Leaning **Eleventy** (Node-based, flexible templating). Jekyll is the fallback if simpler native GitHub Pages build support is preferred — no code decision locked yet. |
| Hosting | **GitHub Pages** — owner already has GitHub Pages experience. |
| DNS / CDN / redirects | **Cloudflare** (free tier) in front of GitHub Pages — handles DNS, CDN, and true 301 redirects (GitHub Pages alone has no server-side redirect support). Confirmed sufficient on Cloudflare's free tier (Redirect Rules allotment, unmetered-in-practice bandwidth). |
| Content editing | **Decap CMS** (git-based, formerly Netlify CMS) — gives non-technical editors a form-based UI that commits markdown directly to the GitHub repo. No database, no backend server. |
| Decap auth | GitHub OAuth, via a small **Cloudflare Worker** acting as the OAuth proxy (free tier — 100k requests/day, effectively unlimited for this use case). |
| Visual design | Consider **Claude Design** to mock up page layouts (homepage, species page template) before building the actual Eleventy templates — can hand off design output to Claude Code for implementation. |
| Search | **Pagefind** recommended for later — client-side, zero-infrastructure, builds its index as a post-build step. Not urgent; bolt on after the core site exists. |

## Architecture (once live)

```
Editor → Decap CMS (admin/ form, GitHub OAuth login)
       → commits markdown to GitHub repo
       → GitHub Actions builds the static site
       → published to GitHub Pages
       → Cloudflare (DNS, 301 redirects, CDN) sits in front
       → Visitor
```

Every step in this chain is either "a git commit" or "a static file being served" — no database, no PHP runtime, no always-on application server anywhere in the pipeline.

## Migration Plan (Drupal 7 DB → Markdown)

This is a **custom extraction**, not a Drupal-to-Drupal Migrate API operation, since the destination isn't Drupal anymore.

**Access needed (not yet obtained):**
- Direct MySQL/DB access to the D7 database
- Filesystem access to `sites/default/files` (images live on disk; DB only has pointers)
- Ideally shell/SSH access too, for `settings.php`, `sites/all/modules`, `sites/all/themes` inspection

**Once access is available, sequence is:**
1. Inspect content types (`node` table `type` column), fields (`field_config` / `field_config_instance`, or per-field `field_data_*` tables), and taxonomy vocabularies (`taxonomy_vocabulary`, `taxonomy_term_data`) to confirm the real content model — the "bare bones, mostly species pages + static pages" assumption needs validation against actual schema.
2. Check `sites/all/modules/custom` and `sites/all/themes/custom` for any non-stock logic (especially around the "visual key" feature — clarify whether it's DB-driven or a static/JS component, since that affects whether it can be reproduced client-side in the new site).
3. Write an extraction script (Node/Python — Claude Code's choice) that:
   - Reads `node` + `field_data_*` for each content type and writes one markdown file per node, with YAML front matter matching the new site's template fields.
   - Reads `file_managed` / `file_usage` to copy/relink images into the new site's asset structure.
   - Reads `taxonomy_term_data` to preserve the family/genus/species hierarchy as front matter or a data file.
4. Build the **redirect map** from `node` (nid) + `url_alias` (existing pretty URLs) → new site paths. Needs to cover both raw `?q=node/NID` form and any existing Pathauto-style aliases, since either could be bookmarked or indexed. Output as Cloudflare Redirect Rules (batch via wildcard/regex where possible rather than one rule per node).
5. Decide redirect coverage: full (every node, for SEO/link preservation — leaning this way per owner) vs. partial (only high-value pages).

## Decap CMS — Test Plan (do this first, on a throwaway repo)

Goal: validate the whole editing pipeline works end-to-end before touching real content.

1. Create a new, disposable GitHub repo.
2. Scaffold a minimal static site in it (a couple of HTML/markdown files is enough for the first pass).
3. Add `admin/index.html` (loads Decap CMS JS from CDN) and `admin/config.yml` (define 1-2 test collections — e.g. a "Pages" collection with `title` + `body` fields).
4. Enable GitHub Pages on the repo (Settings → Pages → deploy from branch).
5. Register a GitHub OAuth App (under the owner's GitHub account settings) and deploy a small OAuth proxy — Cloudflare Worker is the recommended free option — for Decap to authenticate against.
6. Point `config.yml`'s `backend.repo` at the test repo; push.
7. Visit `<repo>.github.io/<repo>/admin/`, log in via GitHub OAuth, create a test entry, publish.
8. Confirm the publish lands as a commit in the repo, GitHub Pages rebuilds, and the new page is live.

Steps 1, 4, and 5 require the owner's own GitHub account/actions (repo creation, enabling Pages, registering the OAuth App) — Claude Code can walk through them but can't perform the account-level clicks itself. Steps 2, 3, 6 are direct file/config work Claude Code can do outright once the repo exists and is authenticated locally.

## Open Questions / Not Yet Decided

- Eleventy vs. Jekyll — no final call made; depends on how the actual content model looks once DB access is available.
- Exact Decap collection/field schema — depends on real field structure found in the D7 DB.
- Whether the "visual key" needs a live backend or can be reproduced as client-side JS over a fixed dataset — needs investigation once inside the codebase.
- Full vs. partial redirect coverage — leaning full, not fully locked.
- Whether Claude Design gets used for visual mockups before or in parallel with the Eleventy build.

## Immediate Next Steps

1. Run the Decap test plan above on a throwaway repo to validate the pipeline.
2. Once DB/file/shell access to ferns.brit.org is available: dump schema, inspect real content types/fields, confirm the content model assumptions above.
3. Scaffold the real static site (generator TBD) and start the extraction script against real data.
