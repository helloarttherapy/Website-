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
    const rendered=load(fs.readFileSync(fileFor(post.url),'utf8'));
    assert.equal(readableText(rendered('article.blog-body').html()),readableText(post.body),`Rendered article words changed: ${post.title}`);
    assert.equal(rendered('article.blog-body iframe').length,load(post.body)('iframe').length,`Rendered podcast missing: ${post.title}`);
    assert.equal(rendered('article.blog-body img').length,load(post.body)('img').length,`Rendered artwork missing: ${post.title}`);
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
    const intro = readableText(card.find('.post-excerpt').html() || '');
    assert.ok(intro,`Missing opening paragraph: ${post.title}`);
    assert.ok(readableText(post.body).includes(intro),`Card intro must use original article words: ${post.title}`);
  }
  const firstIntro = blog('.post-card').first().find('.post-excerpt').text().trim();
  assert.equal(firstIntro,'A vulnerable little baby was born, as the ancient story goes, in the most lowly of circumstances.');
  const leadingBreakIntro = blog('.post-card').filter((_,el)=>blog(el).find('h2 a').text()==='The Kardashians and God').find('.post-excerpt').text().trim();
  assert.ok(leadingBreakIntro.startsWith('God and online celebrity culture. Two concepts'), 'Leading line breaks must not create an empty card intro');
  assert.equal($('footer .footer-top nav').text().replace(/\s+/g,''),'AboutHowitworksBlogArtfortheEverydayGetintouch');
  assert.equal($('footer .footer-socials').text().replace(/\s+/g,''),'InstagramLinkedinSpotifyYouTube');
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
  assert.equal(readableText(therapy('.therapy-hero').html() + therapy('article').html()),readableText(site.therapy.replace(/^\s*<h2>What is Art Therapy\?<\/h2>/,'')));
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

test('page metadata describes each page and article structured data matches the published source',()=>{
  const routes=['/','/new-page','/how-it-works','/about-1','/contact','/blog'];
  const descriptions = routes.map(route=>{
    const $=load(fs.readFileSync(fileFor(route),'utf8'));
    const description=$('meta[name="description"]').attr('content');
    assert.equal($('meta[property="og:description"]').attr('content'),description);
    assert.equal($('link[rel="canonical"]').attr('href'),`https://www.annaworthingtonarttherapy.com${route}`);
    const schema=JSON.parse($('script[type="application/ld+json"]').html());
    assert.ok(schema['@graph'].some(entity=>entity['@type']==='WebSite' && entity.name==='Hello Art Therapy'));
    return description;
  });
  assert.equal(new Set(descriptions).size,routes.length,'Core pages share generic descriptions');
  for(const post of site.posts){
    const $=load(fs.readFileSync(fileFor(post.url),'utf8'));
    const schema=JSON.parse($('script[type="application/ld+json"]').html());
    const article=schema['@graph'].find(entity=>entity['@type']==='BlogPosting');
    assert.equal(article.headline,post.title);
    assert.equal(article.datePublished,post.date);
    assert.equal(article.url,`https://www.annaworthingtonarttherapy.com${post.url}`);
    assert.deepEqual(article.keywords || [],post.tags);
    const author=schema['@graph'].find(entity=>entity['@id']===article.author['@id']);
    assert.equal(author.name,'Anna Worthington');
    assert.ok(readableText(post.body).includes(article.description),'Description must be an original excerpt');
    if(post.image) {
      assert.deepEqual(article.image,[`https://www.annaworthingtonarttherapy.com${post.image}`]);
      assert.ok(Number($('.article-cover').attr('width'))>0);
      assert.ok(Number($('.article-cover').attr('height'))>0);
    }
  }
  const missing=load(read('dist/404.html'));
  assert.equal(missing('meta[name="robots"]').attr('content'),'noindex, follow');
  assert.ok(!read('dist/sitemap-0.xml').includes('/404'));
});

test('site flow uses existing headings and article cards have one focusable destination',()=>{
  const $=load(read('dist/index.html'));
  assert.equal($('#what-is-art-therapy h2 a').attr('href'),'/new-page');
  assert.equal($('#what-i-offer h2 a').attr('href'),'/how-it-works');
  const blog=load(read('dist/blog/index.html'));
  blog('.post-card').each((_,element)=>{
    assert.equal(blog(element).find('a').length,1);
    const image=blog(element).find('img');
    if(image.length){ assert.ok(Number(image.attr('width'))>0); assert.ok(Number(image.attr('height'))>0); }
  });
  const therapy=load(read('dist/new-page/index.html'));
  therapy('.therapy-chapter').each((_,element)=>{
    const id=therapy(element).attr('aria-labelledby');
    assert.equal(therapy(element).find(`h2[id="${id}"]`).length,1);
  });
  assert.equal(therapy('article a').filter((_,element)=>!therapy(element).text().trim()&&!therapy(element).find('img').length).length,0);
});

test('breadcrumbs and section navigation reflect real pages and valid sections',()=>{
  const routes=['/new-page','/how-it-works','/about-1','/contact','/blog',site.posts[0].url];
  for(const route of routes){
    const $=load(fs.readFileSync(fileFor(route),'utf8'));
    const schema=JSON.parse($('script[type="application/ld+json"]').html());
    const trail=schema['@graph'].find(entity=>entity['@type']==='BreadcrumbList');
    assert.equal(trail.itemListElement.at(-1).item,`https://www.annaworthingtonarttherapy.com${route}`);
    const labels=$('.breadcrumbs li').map((_,element)=>$(element).text().trim()).get();
    assert.deepEqual(trail.itemListElement.map(item=>item.name),labels);
    $('a[href^="#"]').each((_,element)=>{
      const id=$(element).attr('href').slice(1);
      assert.equal($(`[id="${id}"]`).length,1,`Broken section link in ${route}: ${id}`);
    });
  }
  const $=load(read('dist/index.html'));
  assert.equal($('.breadcrumbs').length,0);
  assert.equal($('#what-is-art-therapy h3').length,0,'Definition should be a paragraph, not a navigation heading');
  assert.equal($('#what-can-it-help-with h2').length,2);
});
