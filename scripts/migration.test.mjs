import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {load} from 'cheerio';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const site=JSON.parse(read('src/data/site.json'));
const originals=JSON.parse(read('migration/source-blog.json')).items;
const redirectLines=read('public/_redirects').trim().split('\n').map(l=>l.split(/\s+/));
const redirects=new Map(redirectLines.map(([from,to])=>[from,to]));
const fileFor=url=>path.join(root,'dist',decodeURIComponent(url).replace(/^\//,'').replace(/\/$/,'') || '', 'index.html');
function exists(url){return fs.existsSync(fileFor(url));}
const text=html=>{const $=load(html);$('script,style,noscript').remove();return $.text().replace(/\s+/g,' ').trim();};

test('all published Squarespace sitemap URLs resolve to a page or valid redirect',()=>{
  const urls=[...read('migration/source-sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
  for(const url of urls){const target=redirects.get(url)?.split('#')[0] || url;assert.ok(exists(target),`Missing original route: ${url}`);}
  assert.ok(exists('/new-page'));
});

test('all 18 original articles retain their full text, title, URL and podcast embeds',()=>{
  assert.equal(site.posts.length,18);
  for(const original of originals){
    const post=site.posts.find(p=>p.url===original.fullUrl);assert.ok(post,original.fullUrl);
    assert.equal(post.title,original.title);
    assert.equal(text(post.body),text(original.body),`Article text changed: ${post.title}`);
    const $=load(original.body);assert.equal(load(post.body)('iframe').length,$('iframe').length,`Podcast missing: ${post.title}`);
    assert.ok(read(path.relative(root,fileFor(post.url))).includes(post.title.replace(/&/g,'&amp;').replace(/'/g,'&#39;')) || text(read(path.relative(root,fileFor(post.url)))).includes(post.title));
  }
});

test('all rendered internal page links and local images exist',()=>{
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for(const file of walk(path.join(root,'dist')).filter(f=>f.endsWith('.html'))){
    const $=load(fs.readFileSync(file,'utf8'));
    $('a[href^="/"]').each((_,el)=>{const href=$(el).attr('href').split(/[?#]/)[0] || '/';assert.ok(exists(redirects.get(href)?.split('#')[0]||href),`Broken link ${href} in ${file}`);});
    $('img').each((_,el)=>{const src=$(el).attr('src');assert.ok(src?.startsWith('/images/'),`Remote/missing image ${src}`);assert.ok(fs.existsSync(path.join(root,'dist',src)),`Missing image ${src}`);});
    assert.equal($('h1').length,1,`Expected one page title: ${file}`);
    assert.ok($('title').text());assert.ok($('meta[name="description"]').attr('content'));assert.ok($('link[rel="canonical"]').attr('href'));
  }
});

test('legacy redirect targets and section anchors are valid',()=>{
  for(const [from,target] of redirects){const [url,anchor]=target.split('#');assert.ok(exists(url),`Invalid redirect ${from}`);if(anchor){const $=load(read(path.relative(root,fileFor(url))));assert.ok($(`[id="${anchor}"]`).length,`Missing anchor ${target}`);}}
});

test('contact form describes email drafting and does not claim successful delivery',()=>{
  const html=read('dist/contact/index.html');assert.ok(html.includes('Prepare email'));assert.ok(html.includes('review it there before sending'));assert.ok(html.includes('mailto:anna@helloarttherapy.com'));
});
