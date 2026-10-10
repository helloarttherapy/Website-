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
const readableText=html=>{const $=load(html);$('script,style,noscript').remove();$('br').replaceWith(' ');$('h1,h2,h3,h4,p,li,blockquote,figcaption,a').append(' ');return $.text().replace(/\s+/g,' ').trim();};

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

test('navigation and page copy preserve the original labels and published content',()=>{
  const $=load(read('dist/index.html'));
  assert.deepEqual($('.desktop-nav a').map((_,el)=>({label:$(el).text(),href:$(el).attr('href')})).get(),[
    {label:'What is Art Therapy?',href:'/new-page'}, {label:'How it works',href:'/how-it-works'}, {label:'About',href:'/about-1'}, {label:'Blog',href:'/blog'}, {label:'Contact',href:'/contact'}
  ]);
  const original=JSON.parse(read('migration/source-home.json')).collection.collections;
  const core=[['what-is-art-therapy',1],['what-can-it-help-with',2],['what-i-offer',3],['testimonials',4]];
  for(const [id,index] of core) assert.equal(readableText($(`#${id}`).html()),readableText(original[index].mainContent),`Homepage copy changed in ${id}`);
  const blog=load(read('dist/blog/index.html'));
  for(const post of originals) {
    const card=blog('.post-card').filter((_,el)=>blog(el).find('h2 a').attr('href')===post.fullUrl);
    assert.equal(text(card.find('.post-excerpt').html()||''),text(post.excerpt||''),`Blog summary changed: ${post.title}`);
  }
  assert.equal($('footer .footer-top nav').text().replace(/\s+/g,''),'AboutHowitworksGetintouchBlogInstagramLinkedinSpotify');
  assert.ok(!read('src/styles/global.css').includes('✳'));
  assert.ok(!$('body').text().includes('Sometimes, there’s'));
});

test('restructured sessions, biography and therapy pages retain the original words in order',()=>{
  for(const [route,source,title] of [['how-it-works','how','How it works'],['about-1','about','About Anna']]){
    const $=load(read(`dist/${route}/index.html`));
    assert.equal(readableText($('main').html()),`${title} ${readableText(site[source])}`,`Page copy changed: ${route}`);
    assert.equal($('main a[href="/contact"]').length,1,`Duplicate contact button: ${route}`);
  }
  const therapy=load(read('dist/new-page/index.html'));
  assert.equal(readableText(therapy('article').html()),readableText(site.therapy.replace(/^\s*<h2>What is Art Therapy\?<\/h2>/,'')));
});

test('contact form retains the original copy and submits to the server endpoint',()=>{
  const $=load(read('dist/contact/index.html'));
  assert.equal($('main h1').text(),'Get in touch');
  assert.equal($('main h2').text(),'Feel free to email or fill in the form to say hello!');
  assert.equal($('form').attr('action'),'/api/contact');
  assert.equal($('form').attr('method'),'post');
  assert.equal($('form button').text(),'Submit');
  assert.ok($('input[name="lastName"]').is('[required]'));
  assert.ok(!$('main').text().includes('Prepare email'));
});
