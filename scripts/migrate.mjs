import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import sanitize from 'sanitize-html';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['home', 'therapy', 'how', 'about', 'contact', 'blog'];
const sources = Object.fromEntries(await Promise.all(names.map(async name => [name, JSON.parse(await fs.readFile(`/private/tmp/hello-art-${name}.json`, 'utf8'))])));
const assetMap = {};
const urls = new Set();
function scan(value) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/https:\/\/images\.squarespace-cdn\.com\/[^\s"<>\\]+/g)) urls.add(match[0].split('?')[0]);
  } else if (Array.isArray(value)) value.forEach(scan);
  else if (value && typeof value === 'object') Object.values(value).forEach(scan);
}
Object.values(sources).forEach(scan);
const queue = [...urls];
await Promise.all(Array.from({length: 6}, async () => {
  while(queue.length) {
    const url = queue.shift();
    const extension = path.extname(new URL(url).pathname).toLowerCase() || '.jpg';
    const id = crypto.createHash('sha256').update(url).digest('hex').slice(0,12);
    const file = `${id}${extension}`;
    const target = path.join(root, 'public/images', file);
    try {
      await fs.access(target);
    } catch {
      const response = await fetch(url + (extension === '.gif' ? '' : '?format=1500w'));
      if (!response.ok) throw new Error(`Image ${response.status}: ${url}`);
      await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
    }
    assetMap[url] = `/images/${file}`;
  }
}));

function local(url) { return assetMap[url?.split('?')[0]] || url; }
function cleanHtml(html) {
  const $ = load(html || '', null, false);
  $('script,style,noscript,.sqs-block-spacer,.sqs-block-form,.sqs-block-code').remove();
  $('img').each((_,el) => {
    const image=$(el); const src = image.attr('data-src') || image.attr('src');
    if(!src) { image.remove(); return; }
    const alt=image.attr('alt')||'';
    image.attr('src',local(src)).attr('alt',alt).attr('loading','lazy').attr('decoding','async');
    for(const a of Object.keys(el.attribs)) if(!['src','alt','loading','decoding','width','height'].includes(a)) image.removeAttr(a);
  });
  $('a').each((_,el)=>{
    const a=$(el); const href=a.attr('href') || '';
    if(href.startsWith('https://www.annaworthingtonarttherapy.com')) a.attr('href',href.replace('https://www.annaworthingtonarttherapy.com','')||'/');
  });
  $('iframe').each((_,el)=>{
    const frame=$(el);
    frame.attr('title','Listen to this article on Spotify').attr('loading','lazy').attr('width','100%').attr('height','152');
  });
  const result = sanitize($.html(), {
    allowedTags:['p','br','h1','h2','h3','h4','strong','em','b','i','a','ul','ol','li','blockquote','figure','figcaption','img','iframe','hr','sup','sub'],
    allowedAttributes:{a:['href','title'],img:['src','alt','loading','decoding','width','height'],iframe:['src','title','loading','width','height']},
    allowedIframeHostnames:['podcasters.spotify.com'],
    allowedSchemes:['https','http','mailto'],
    transformTags:{h1:'h2'}
  });
  const fragment=load(result,null,false);
  fragment('p,h2,h3,h4').each((_,el)=>{if(!fragment(el).text().trim() && !fragment(el).find('img').length) fragment(el).remove();});
  return fragment.html().replace(/\n\s*\n/g,'\n').trim();
}
const homeCollections=sources.home.collection.collections;
const get = (name,index=0) => (sources[name].collection.collections||[sources[name].collection])[index];
const hero=local(homeCollections[0].mainImage.assetUrl);
const poster='/images/hero-poster.webp';
await sharp(path.join(root,'public',hero)).webp({quality:85}).toFile(path.join(root,'public',poster));
const portraitUrl=load(get('about',1).mainContent)('img').first().attr('data-src');
const social$=load(homeCollections.at(-1).mainContent);
const social=social$('.slide').map((_,el)=>({image:local(social$(el).find('img').first().attr('src')||social$(el).find('img').first().attr('data-src')),url:social$(el).find('a').attr('href'),alt:(social$(el).find('img').first().attr('alt')||'Art and reflections from Hello Art Therapy').split('\n')[0].slice(0,160)})).get();
const posts=sources.blog.items.map(item=>{
  const body=cleanHtml(item.body);
  const excerptDoc=load(body);
  excerptDoc('br').replaceWith(' ');
  excerptDoc('p,h2,h3,h4,blockquote,figcaption,li').append(' ');
  const text=excerptDoc.text().replace(/\s+/g,' ').trim();
  return {title:item.title,url:item.fullUrl,slug:item.urlId,date:new Date(item.publishOn).toISOString(),displayDate:new Date(item.publishOn).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric',timeZone:sources.blog.website.timeZone}),tags:item.tags||[],body,image:local(item.assetUrl),excerpt:text.slice(0,185).replace(/\s+\S*$/,'')+'…',readingMinutes:Math.max(1,Math.ceil(text.split(/\s+/).length/220))};
});
const data={hero,poster,portrait:local(portraitUrl),social,definition:cleanHtml(homeCollections[1].mainContent),support:cleanHtml(homeCollections[2].mainContent),offer:cleanHtml(homeCollections[3].mainContent),testimonials:cleanHtml(homeCollections[4].mainContent),therapy:cleanHtml(sources.therapy.mainContent),how:cleanHtml(get('how',1).mainContent),about:cleanHtml(get('about',1).mainContent),posts};
await fs.writeFile(path.join(root,'src/data/site.json'),JSON.stringify(data,null,2)+'\n');
await fs.writeFile(path.join(root,'migration/assets.json'),JSON.stringify(assetMap,null,2)+'\n');
for(const name of names) await fs.copyFile(`/private/tmp/hello-art-${name}.json`,path.join(root,`migration/source-${name}.json`));
await fs.copyFile('/private/tmp/hello-art-sitemap.xml',path.join(root,'migration/source-sitemap.xml'));
console.log(`Migrated ${posts.length} posts and ${urls.size} local images.`);
