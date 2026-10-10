# Hello Art Therapy

Standalone Astro rebuild of Anna Worthington's Squarespace site. This is the **H Art** project. It has no Tundra dependencies or configuration.

Git remote: https://github.com/helloarttherapy/Website-

Cloudflare preview: https://hello-art-therapy.hello-art-therapy.workers.dev

Published to Anna's Cloudflare account. The existing custom domain still points to Squarespace; domain cutover is pending.

## Local development

Use Node.js 22. Run `npm ci`, then `npm run dev`. Run `npm run check`, `npm run build` and `npm test` before shipping. All published content and imagery are local; the build does not fetch Squarespace.

## Content

`src/data/site.json` contains the migrated page copy, all 18 articles, social artwork and image paths. Pages live in `src/pages`, shared styling in `src/styles/global.css`. The article routes preserve the original dates and slugs. Topic pages preserve the original `/blog/tag/...` addresses. `public/_redirects` maps legacy index-section paths and `/home-1` to their replacements.

Public source snapshots, the original sitemap and an image attribution/provenance map are kept in `migration/`. The original animated hero includes its original star and a static alternative for reduced-motion visitors. The navigation labels, page text, published blog excerpts and cyan footer preserve the Squarespace site. Images and the body font are self-hosted.

With Anna's approval, headings, the wordmark and display text use Belleza, restored after the serif-font trial. Tenor Sans remains the body font. Both fonts are bundled locally through Fontsource, so the site loads the actual fonts without an Adobe account, external font request or Squarespace font integration. The original hero's handwritten lettering remains part of its unchanged artwork.

The content layout groups session options and pricing, pairs Anna's portrait with her introduction and separates Experience and Education. Layout transformations in `src/lib/content-layout.mjs` preserve the source words and their order. Migration checks compare the rendered pages against the original copy.

The shared navigation groups the original five links beside the wordmark. Breadcrumbs use existing page labels and match the BreadcrumbList data. The homepage moves from the original artwork through an introduction, two benefits panels, sessions alongside Anna's portrait, testimonials and social artwork. Existing headings link to the detailed therapy and session pages.

The therapy essay has section navigation, an artwork/greeting opening and a single reading column. Sessions have separate rows for readable descriptions, followed by pricing. Anna's biography pairs her journey with her portrait, then puts Experience and Education in separate rows. The archive features the latest original article above the remaining cards; article pages pair titles with artwork, use a readable body column and link their original topics. Contact places the existing email invitation beside the form. Copy, typography sizes, weights, line heights, colours and artwork are preserved. Navigation repeats existing labels without rewriting page content.

## Search metadata

`src/lib/seo.mjs` supplies page-specific descriptions using complete sentences from the original copy, plus WebSite, Person, page and breadcrumb structured data. Articles include their original author, headline, publication date, image and tags as BlogPosting data; archives use CollectionPage. No ratings, addresses or clinical claims are added. Canonicals, social previews, robots and sitemap use the original custom domain, ready for migration; the 404 page is noindex and excluded from the sitemap. Local image dimensions reserve space while images load. Search Console submission and live rich-result checks belong to the domain cutover, after the new site is published there.

## Cloudflare

This is an Astro static build deployed with **Cloudflare Workers Static Assets**. `wrangler.jsonc` serves `dist` and the custom 404 page. `worker/index.mjs` handles `/api/contact`; other requests go to the static asset binding. No Astro server adapter or database is required.

1. Connect the art therapy Git repository to a Cloudflare Workers project.
2. Build command: `npm run build`.
3. Deploy command: `npx wrangler deploy --profile hello-art-therapy` locally, or `npx wrangler deploy` in Cloudflare's Git build environment.
4. For manual deployment, create the separate profile with `npx wrangler auth create hello-art-therapy`, sign in as `anna@helloarttherapy.com`, then run `npm run deploy`. The deploy script explicitly uses this profile, and `wrangler.jsonc` pins Anna's account (`f42f869e89836bba54e556cb172b1226`). Cloudflare requires the account email to be verified before publishing Workers. For CI, use Cloudflare's Git integration or repository secrets; never commit tokens.
5. Verify the generated workers.dev address before adding the existing custom domain in Cloudflare. Domain cutover and retiring Squarespace require a separate migration decision.

The direct contact endpoint requires Workers; a static-only Pages deployment will not provide form delivery.

## Contact

The rebuilt form posts directly to `/api/contact`, preserving the original fields, Submit label, thank-you and error messages. The Worker sends to `anna@helloarttherapy.com` from `website@helloarttherapy.com`, with the visitor's address as Reply-To. It validates inputs, limits body size, checks the request origin, uses a honeypot and rate limits repeat submissions. It does not log or store enquiry contents. A direct email link remains available.

**Activation is pending.** The checked-in configuration intentionally has no `EMAIL` binding until the sending domain and destination are configured. Submissions return HTTP 503 and the original error message when email is unavailable; they never report success without provider acceptance. The published preview still runs the earlier email-draft version. Do not deploy the direct-submission version before completing email setup.

To activate:

1. Inspect the full `helloarttherapy.com` DNS records at its current provider, Squarespace. If moving DNS to Cloudflare, reproduce every existing record and preserve Google Workspace MX, SPF, DKIM and DMARC settings before changing nameservers. The mail domain and `annaworthingtonarttherapy.com` are separate domains.
2. Onboard the sending domain in Anna's Cloudflare Email Service account using [Cloudflare's setup instructions](https://developers.cloudflare.com/email-service/get-started/send-emails/). Configure outbound Email Sending without replacing the Google Workspace inbox's root MX records.
3. `anna@helloarttherapy.com` is already verified as a destination in Anna's account. The Email Sending dashboard currently requests Workers Paid; Cloudflare also documents free sending to verified destinations when only Email Routing is configured. Confirm the appropriate setup after domain onboarding, without replacing Workspace's root MX records.
4. Add a `send_email` binding named `EMAIL`, restricted to destination `anna@helloarttherapy.com` and allowed sender `website@helloarttherapy.com`.
5. Test provider acceptance and receipt in Anna's inbox, then deploy and verify the live form. Unit tests mock the provider and send no actual mail.

## Migration checks before domain cutover

- Confirm Anna's existing session prices ($140 individual, $150 caregiver/child) and profile details are still accurate. The migration preserves the source's claims and dates.
- Activate and verify direct form delivery to Anna's inbox.
- All original article and topic URLs must pass the route audit.
- Check desktop and mobile navigation, loaded Google fonts, original artwork, footer colours and contact links.
- Existing blog comments, Squarespace form submissions, mailing lists, analytics and account settings are not in the public source export and have not been migrated.

Re-importing from live Squarespace is optional and separate from normal builds: download the six JSON snapshots to `/private/tmp/hello-art-{home,therapy,how,about,contact,blog}.json` plus the sitemap, then run `node scripts/migrate.mjs`. Review the resulting diff before committing.
