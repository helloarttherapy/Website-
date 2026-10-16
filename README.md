# Hello Art Therapy

Standalone Astro rebuild of Anna Worthington's Squarespace site. This is the **H Art** project. It has no Tundra dependencies or configuration.

Git remote: https://github.com/helloarttherapy/Website-

Cloudflare preview: https://hello-art-therapy.hello-art-therapy.workers.dev

Live website: https://www.annaworthingtonarttherapy.com

Published to Anna's Cloudflare account on 10 October 2026. Both custom domain addresses serve the Astro deployment; the root domain permanently redirects to the canonical HTTPS www address.

## Local development

Use Node.js 22. Run `npm ci`, then `npm run dev`. Run `npm run check`, `npm run build` and `npm test` before shipping. All published content and imagery are local; the build does not fetch Squarespace.

## Content

`src/data/site.json` contains the migrated page copy, all 18 articles, social artwork and image paths. Pages live in `src/pages`, shared styling in `src/styles/global.css`. The article routes preserve the original dates and slugs. Topic pages preserve the original `/blog/tag/...` addresses. `public/_redirects` maps legacy index-section paths and `/home-1` to their replacements.

Public source snapshots, the original sitemap and an image attribution/provenance map are kept in `migration/`. The original animated hero includes its original star and a static alternative for reduced-motion visitors. The navigation labels, page text and cyan footer preserve the Squarespace site. Blog cards use the original opening paragraph from each article in place of the old excerpts, as requested. Images and fonts are self-hosted.

With Anna's approval, headings, the wordmark and display text use Belleza, restored after the serif-font trial. Tenor Sans remains the body font. Both fonts are bundled locally through Fontsource, so the site loads the actual fonts without an Adobe account, external font request or Squarespace font integration. The original hero's handwritten lettering remains part of its unchanged artwork.

The content layout groups session options and pricing, pairs Anna's portrait with her introduction and separates Experience and Education. Layout transformations in `src/lib/content-layout.mjs` preserve the source words and their order. Migration checks compare the rendered pages against the original copy.

The shared navigation groups the original five links beside the wordmark. Breadcrumbs use existing page labels and match the BreadcrumbList data. The homepage moves from the original artwork through an introduction, two benefits panels, sessions alongside Anna's portrait, testimonials and social artwork. Existing headings link to the detailed therapy and session pages.

The therapy essay has section navigation, an artwork/greeting opening and a single reading column. Sessions have separate rows for readable descriptions, followed by pricing. Anna's biography pairs her journey with her portrait, then puts Experience and Education in separate rows. The archive features the latest original article above the remaining cards; article pages pair titles with artwork, use a readable body column and link their original topics. Contact places the existing email invitation beside the form. Copy, typography sizes, weights, line heights, colours and artwork are preserved. Navigation repeats existing labels without rewriting page content.

The compact pill CTAs use a muted charcoal teal. Homepage list gaps are halved, and the offer section uses the warm grey sampled from the top right of Anna's portrait. The sessions introduction removes the forced heading break and the grey callout box. The footer keeps the original cyan, logo and labels with horizontal link groups and a separate copyright row. These refinements do not change the fonts or article text.

On mobile, the therapy essay's section menu stays below the header and closes after an anchor is selected. Footer links align left, with the contact pill beneath them; cyan continues through the bottom safe area and page canvas. Desktop pages show the book announcement immediately below the navigation.

Every article has Spotify and YouTube links at the beginning of its reading column. `src/data/podcast-episodes.json` maps the seven podcast articles to their verified Spotify episode IDs and YouTube videos; their links open the matching episode. The other eleven articles link to the Spotify podcast and YouTube channel, labelled accordingly. The original Spotify players and podcast caption links now use the matching `open.spotify.com` episode, without changing article words or the archived source snapshots. Update this mapping when adding another companion episode.

## Search metadata

`src/lib/seo.mjs` supplies page-specific descriptions using complete sentences from the original copy, plus WebSite, Person, page and breadcrumb structured data. Articles include their original author, headline, publication date, image and tags as BlogPosting data; archives use CollectionPage. No ratings, addresses or clinical claims are added. Canonicals, social previews, robots and sitemap use the live original custom domain; the 404 page is noindex and excluded from the sitemap. Local image dimensions reserve space while images load. The launch audit verified all 102 sitemap pages return HTTP 200 with canonical links and descriptions, plus robots, sitemap, bundled fonts and stylesheet. Search Console submission remains separate.

## Cloudflare

This is an Astro static build deployed with **Cloudflare Workers Static Assets**. `wrangler.jsonc` serves `dist` and the custom 404 page. `worker/index.mjs` handles `/api/contact`; other requests go to the static asset binding. No Astro server adapter or database is required.

1. Connect the art therapy Git repository to a Cloudflare Workers project.
2. Build command: `npm run build`.
3. Deploy command: `npx wrangler deploy --profile hello-art-therapy` locally, or `npx wrangler deploy` in Cloudflare's Git build environment.
4. For manual deployment, create the separate profile with `npx wrangler auth create hello-art-therapy`, sign in as `anna@helloarttherapy.com`, then run `npm run deploy`. The deploy script explicitly uses this profile, and `wrangler.jsonc` pins Anna's account (`f42f869e89836bba54e556cb172b1226`). Cloudflare requires the account email to be verified before publishing Workers. For CI, use Cloudflare's Git integration or repository secrets; never commit tokens.
5. The 10 October 2026 launch deployment is live on both custom domains and the Workers preview address. `wrangler.jsonc` records both custom domain routes. Cloudflare's active “Root domain to canonical www” Redirect Rule permanently redirects HTTPS root requests to www, retaining paths and query strings. Always Use HTTPS is enabled. Squarespace billing and its account were not changed.

The direct contact endpoint requires Workers; a static-only Pages deployment will not provide form delivery.

## Contact

The rebuilt form posts directly to `/api/contact`, preserving the original fields, Submit label and error message. At Anna's request, the invitation now ends with a full stop, and the confirmation reads “Thank you for message, I will be in touch shortly.” The Worker sends to `anna@helloarttherapy.com` from `website@annaworthingtonarttherapy.com`, with the visitor's address as Reply-To. It validates inputs, limits body size, checks the request origin, uses a honeypot and rate limits repeat submissions. It does not log or store enquiry contents. A direct email link remains available.

After provider-confirmed success, the form and its instruction are hidden and focus moves to the visible thank-you message. A failed submission keeps the form and visitor's message available for retry. Both interface states were verified locally with controlled responses that send no email.

**Email delivery is active and tested.** On 10 October 2026, Cloudflare accepted a labelled launch test from the isolated preview, the form displayed its original thank-you message, and the email arrived in Anna's Google Workspace Inbox. The same tested Worker and assets are deployed to the public custom domain and production Workers address. A second labelled test submitted through the public contact page received provider acceptance and the original thank-you message. Unit tests mock the provider and send no actual mail.

Cloudflare Email Routing is enabled on `annaworthingtonarttherapy.com`, which had no existing MX records. Anna's separate Google Workspace mail domain, `helloarttherapy.com`, was not changed. `anna@helloarttherapy.com` is a verified destination in Anna's account. The `EMAIL` send binding permits only that destination and the fixed website sender. [Cloudflare documents free sending to verified destinations when Email Routing is configured](https://developers.cloudflare.com/email-service/platform/pricing/); no paid Email Sending subscription was purchased.

If delivery fails or the binding is absent, the form returns HTTP 503 and its original error message. It never reports success without provider acceptance.

## Google Analytics

Google Analytics 4 was set up on 16 October 2026 under **anna@helloarttherapy.com**, in its own **Hello Art Therapy** account. The property is **Hello Art Therapy website**, with Melbourne reporting time and Australian dollars. Account ID: `412247588`; property ID: `559262305`; web stream ID: `16139384389`; measurement ID: `G-9LVJVK62SS`. These identifiers are configuration, not credentials. [Open Anna's Analytics property](https://analytics.google.com/analytics/web/#/a412247588p559262305/reports/intelligenthome) and select Anna's Google account if prompted.

`src/data/analytics.json` records the property and production hostname. `src/components/Analytics.astro` supplies the optional analytics choice and footer preferences; `src/lib/analytics-client.mjs` loads the Google tag only after consent and only on `www.annaworthingtonarttherapy.com`. Local development and Workers preview visits do not send analytics. No Google Analytics request is made before permission or after declining. The visitor can change their choice in the footer; declining disables collection and clears the site's GA cookies. The choice expires after 180 days; analytics cookies are configured for 90 days.

Page views include a page URL without query strings or fragments and a referrer reduced to its origin. Fixed `outbound_click` categories count Amazon, Spotify, YouTube, Instagram, LinkedIn and email clicks without copying link text, email addresses or URL queries. `generate_lead` is emitted only after the contact endpoint accepts a submission, with the fixed method `contact_form`; names, emails, subjects and messages never enter analytics. Amazon clicks measure an outbound visit, not a completed Amazon purchase.

Enhanced measurement is disabled in the web stream, including automatic form tracking. Optional account data sharing and Google signals are off; the website tag disables advertising personalization and denies advertising consent. Property-wide regional advertising controls retain Google's defaults. `/analytics-privacy` explains the actual setup and links to Google's processing notice. The site uses the direct Google tag integration.

Before publishing analytics changes, run the normal check, build and test sequence. The analytics tests verify consent, production-host restrictions, URL sanitization, fixed event payloads and withdrawal, including other open tabs and pages restored from back/forward cache. Check a consenting visit in Google's Realtime report after deployment. A live consenting visit was received on 16 October 2026; the mobile and desktop controls were checked, and declining left the Google tag unloaded. Standard reports can take time to populate; declined visits are intentionally absent.

## Domain connection

The domain remains registered at GoDaddy. Its nameservers are now `andronicus.ns.cloudflare.com` and `chelsea.ns.cloudflare.com`, and Anna's Cloudflare zone is active. The original GoDaddy records are backed up in `migration/godaddy-dns-before-cloudflare.json`. All seven service records were imported before the nameserver change; the Squarespace verification record and GoDaddy Domain Connect record are retained.

After explicit launch approval, the four root Squarespace A records and the `www` Squarespace CNAME were replaced by the production Worker's two custom domains. Cloudflare's Email Routing MX, SPF and DKIM records are separate from those five web records. HTTP redirects to HTTPS; HTTPS root redirects permanently to www. The launch audit verified path and query preservation, all sitemap pages, fonts and the 404 response. Final tested deployment: `bf563c68-e73a-466d-a418-7dbab8c84926`.

## Migration checks before domain cutover

- Confirm Anna's existing session prices ($140 individual, $150 caregiver/child) and profile details are still accurate. The migration preserves the source's claims and dates.
- Activate and verify direct form delivery to Anna's inbox.
- All original article and topic URLs must pass the route audit.
- Check desktop and mobile navigation, loaded Google fonts, original artwork, footer colours and contact links.
- Existing blog comments, Squarespace form submissions, mailing lists, analytics and account settings are not in the public source export and have not been migrated.

Re-importing from live Squarespace is optional and separate from normal builds: download the six JSON snapshots to `/private/tmp/hello-art-{home,therapy,how,about,contact,blog}.json` plus the sitemap, then run `node scripts/migrate.mjs`. Review the resulting diff before committing.

## Saved setup guide

`output/pdf/Hello-Art-Therapy-Site-Setup.pdf` documents the platform roles, publishing and contact flows, domain configuration, website routes and maintenance process. Its final page contains a paste-ready Codex handover prompt for recovering context in a new chat; a plain-text copy is saved as `docs/Codex-Site-Handover.txt`. The prompt records the 10 October 2026 setup and tells the new chat to inspect current repository state and preserve unrelated local drafts. A reusable vector diagram is saved alongside the guide as `Hello-Art-Therapy-System-Flow.svg`. The guide source is `docs/generate-site-guide.py` (Python with ReportLab). The website build does not use or publish these documentation files.
