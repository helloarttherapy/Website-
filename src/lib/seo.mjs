import { load } from 'cheerio';
import { readableArticle } from './content-layout.mjs';

export function plainText(html) {
  const $ = load(html || '', null, false);
  $('script,style,iframe').remove();
  $('br').replaceWith(' ');
  $('p,h1,h2,h3,h4,li').append(' ');
  return $.text().replace(/\s+/g, ' ').trim();
}

// Use complete source sentences; no rewritten marketing or clinical claims.
export function sourceDescription(html) {
  const $ = load(readableArticle(html || ''), null, false);
  const paragraph = $('p').filter((_, element) => !$(element).closest('figcaption').length && $(element).text().trim()).first();
  const text = plainText(paragraph.length ? paragraph.html() : html);
  const sentences = Array.from(new Intl.Segmenter('en-AU', { granularity: 'sentence' }).segment(text), part => part.segment.trim());
  let description = sentences.shift() || text;
  for (const sentence of sentences) {
    if (`${description} ${sentence}`.length > 220) break;
    description += ` ${sentence}`;
  }
  return description;
}

export function pageDescription(site, pathname) {
  switch (pathname.replace(/\/$/, '') || '/') {
    case '/': return plainText(load(site.definition, null, false)('h3').html());
    case '/new-page': {
      const $ = load(readableArticle(site.therapy), null, false);
      return sourceDescription($('p').filter((_, element) => $(element).text().startsWith('It is the process of creating')).html());
    }
    case '/how-it-works': return sourceDescription(site.how);
    case '/about-1': {
      const $ = load(site.about, null, false);
      return sourceDescription($('p').eq(1).html());
    }
    case '/contact': return 'Feel free to email or fill in the form to say hello! Email: anna@helloarttherapy.com';
    case '/blog': return ['Words, pictures and things', ...site.posts.slice(0, 2).map(post => post.title)].join(' — ');
    case '/404': return 'Page not found';
    default: return plainText(load(site.definition, null, false)('h3').html());
  }
}

export function pageBreadcrumbs(pathname, title) {
  if (pathname === '/') return [];
  const trail = [{ name: 'Hello Art Therapy', url: '/' }];
  if (pathname.startsWith('/blog/')) trail.push({ name: 'Blog', url: '/blog' });
  trail.push({ name: title, url: pathname });
  return trail;
}

export function structuredData({ siteUrl, canonical, title, description, image, article, date, keywords, pathname, breadcrumbs = /** @type {Array<{name: string, url: string}>} */ ([]) }) {
  const url = new URL('/', siteUrl).href;
  const person = { '@type': 'Person', '@id': `${url}#anna`, name: 'Anna Worthington', url: new URL('/about-1', url).href };
  const website = { '@type': 'WebSite', '@id': `${url}#website`, name: 'Hello Art Therapy', url, inLanguage: 'en-AU', publisher: { '@id': person['@id'] } };
  const page = {
    '@type': article ? 'BlogPosting' : pathname === '/contact' ? 'ContactPage' : pathname === '/about-1' ? 'AboutPage' : pathname.startsWith('/blog') ? 'CollectionPage' : 'WebPage',
    '@id': `${canonical}#page`, url: String(canonical),
    [article ? 'headline' : 'name']: title, description, inLanguage: 'en-AU',
    isPartOf: { '@id': website['@id'] },
    ...(article ? { author: { '@id': person['@id'] }, datePublished: date, mainEntityOfPage: String(canonical), ...(image ? { image: [String(image)] } : {}), ...(keywords?.length ? { keywords } : {}) } : {}),
    ...(pathname === '/about-1' ? { mainEntity: { '@id': person['@id'] } } : {})
  };
  const breadcrumb = breadcrumbs.length ? [{ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: breadcrumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: new URL(crumb.url, url).href })) }] : [];
  if (breadcrumb.length) page.breadcrumb = { '@id': breadcrumb[0]['@id'] };
  return { '@context': 'https://schema.org', '@graph': [website, person, page, ...breadcrumb] };
}
