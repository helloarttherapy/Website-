# Hello Art Therapy

Standalone Astro rebuild of Anna Worthington's Squarespace site. This is the **H Art** project. It has no Tundra dependencies or configuration.

Git remote: https://github.com/helloarttherapy/Website-

## Local development

Use Node.js 22. Run `npm ci`, then `npm run dev`. Run `npm run check`, `npm run build` and `npm test` before shipping. All published content and imagery are local; the build does not fetch Squarespace.

## Content

`src/data/site.json` contains the migrated page copy, all 18 articles, social artwork and image paths. Pages live in `src/pages`, shared styling in `src/styles/global.css`. The article routes preserve the original dates and slugs. Topic pages preserve the original `/blog/tag/...` addresses. `public/_redirects` maps legacy index-section paths and `/home-1` to their replacements.

Public source snapshots, the original sitemap and an image attribution/provenance map are kept in `migration/`. The original animated hero includes a static alternative for reduced-motion visitors. Fonts and images are self-hosted.

## Cloudflare

This is a static site deployed with **Cloudflare Workers Static Assets**. `wrangler.jsonc` serves `dist` and the custom 404 page. No Astro server adapter, database or paid runtime is required.

1. Connect the art therapy Git repository to a Cloudflare Workers project.
2. Build command: `npm run build`.
3. Deploy command: `npx wrangler deploy`.
4. For manual deployment, create the separate profile with `npx wrangler auth create hello-art-therapy`, sign in as `anna@helloarttherapy.com`, then run `npm run deploy`. The deploy script explicitly uses this profile to keep account selection separate. Select the intended art therapy account, or provide `CLOUDFLARE_ACCOUNT_ID` locally. For CI, use Cloudflare's Git integration or repository secrets; never commit tokens.
5. Verify the generated workers.dev address before adding the existing custom domain in Cloudflare. Domain cutover and retiring Squarespace require a separate migration decision.

For an existing Cloudflare **Pages** project, use build command `npm run build` and output directory `dist`. The static output, `_headers`, `_redirects` and `404.html` work on Pages as well.

## Contact

The contact form deliberately prepares an email in the visitor's email app, using Anna's published email address. It does **not** submit to an unconfigured server or claim that a message has been sent. A direct email link is always available. To restore automatic form delivery, connect an approved email service and replace the submit handler with a server endpoint before launch. Do not store therapy enquiries in the repository or analytics.

## Migration checks before domain cutover

- Confirm Anna's existing session prices ($140 individual, $150 caregiver/child) and profile details are still accurate. The migration preserves the source's claims and dates.
- Confirm the email draft workflow is acceptable or connect form delivery.
- All original article and topic URLs must pass the route audit.
- Check desktop and mobile navigation, journal search, artwork and contact links.
- Existing blog comments, Squarespace form submissions, mailing lists, analytics and account settings are not in the public source export and have not been migrated.

Re-importing from live Squarespace is optional and separate from normal builds: download the six JSON snapshots to `/private/tmp/hello-art-{home,therapy,how,about,contact,blog}.json` plus the sitemap, then run `node scripts/migrate.mjs`. Review the resulting diff before committing.
