// Audits built HTML, not live HTTP responses or Google's indexing decisions.
import {readFileSync,existsSync,statSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root='dist',origin='https://heartlandcontractorfind.com';
const info=JSON.parse(readFileSync(join(root,'build-info.json'),'utf8'));
const errors=[],warnings=[],pages=new Map(),titles=new Set(),descriptions=new Set();
const decode=s=>s.replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const path of info.pages){
 const html=readFileSync(join(root,path,'index.html'),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const title=html.match(/<title>(.*?)<\/title>/)?.[1];
 const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1];
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
 const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>decode(m[1]));
 const noindex=html.includes('name="robots" content="noindex,follow"');
 if(!title||titles.has(title))errors.push(`${path}: missing/duplicate title`);titles.add(title);
 if(!description||descriptions.has(description))errors.push(`${path}: missing/duplicate description`);descriptions.add(description);
 if(canonical!==origin+path)errors.push(`${path}: incorrect canonical`);
 if((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length!==1)errors.push(`${path}: expected one H1`);
 if(ids.length!==new Set(ids).size)errors.push(`${path}: duplicate element IDs`);
 for(const [,attrs] of html.matchAll(/<img\b([^>]+)>/g))if(!/\balt="[^"]+"/.test(attrs)||!/\bwidth="\d+"/.test(attrs)||!/\bheight="\d+"/.test(attrs))errors.push(`${path}: image missing description/dimensions`);
 for(const [,src] of html.matchAll(/(?:src|href)="(\/[^"#]*)/g))if(!src.startsWith('/api/')&&!existsSync(join(root,src.split('#')[0])))errors.push(`${path}: missing asset ${src}`);
 for(const [,schema] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))try{JSON.parse(schema);}catch{errors.push(`${path}: invalid JSON-LD`);}
 pages.set(path,{html,links,ids:new Set(ids),titleLength:decode(title||'').length,descriptionLength:decode(description||'').length,noindex});
}
const edges=new Map();
for(const [path,page] of pages){
 const targets=[];
 for(const href of page.links){
  const u=new URL(href,origin+path);if(u.origin!==origin)continue;
  const target=pages.get(u.pathname);
  if(target){targets.push(u.pathname);if(u.hash&&!target.ids.has(decodeURIComponent(u.hash.slice(1))))errors.push(`${path}: missing fragment ${href}`);}
  else if(!u.pathname.startsWith('/api/')&&!existsSync(join(root,u.pathname)))errors.push(`${path}: broken link ${href}`);
 }
 edges.set(path,targets);
}
const depth=new Map([['/',0]]),queue=['/'];
for(const path of queue)for(const target of edges.get(path)||[])if(!depth.has(target)){depth.set(target,depth.get(path)+1);queue.push(target);}
for(const path of pages.keys())if(!depth.has(path))errors.push(`${path}: unreachable from homepage`);
const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8');
const sitemapPaths=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(decode(m[1])).pathname);
for(const path of sitemapPaths)if(!pages.has(path))errors.push(`sitemap: unknown page ${path}`);
const noindexCount=[...pages.values()].filter(p=>p.noindex).length;
const sitemapNoindex=sitemapPaths.filter(p=>pages.get(p)?.noindex).length;
if(noindexCount)warnings.push(`${noindexCount} pages deliberately remain noindex under the current release policy.`);
if(sitemapNoindex)errors.push(`${sitemapNoindex} sitemap URLs are noindex; only indexable canonical URLs may be listed.`);
if(new Set(sitemapPaths).size!==sitemapPaths.length)errors.push('sitemap contains duplicate URLs');
for(const [path,page] of pages)if(!page.noindex&&!sitemapPaths.includes(path))errors.push(`${path}: indexable page absent from sitemap`);
const depthCounts={};for(const n of depth.values())depthCounts[n]=(depthCounts[n]||0)+1;
const assets=readdirSync(join(root,'assets')).map(name=>({name,bytes:statSync(join(root,'assets',name)).size})).sort((a,b)=>b.bytes-a.bytes);
const report={scope:'Built HTML only; live host routing, HTTP status and Core Web Vitals require separate checks.',pages:pages.size,localPages:info.pages.filter(p=>/^\/[^/]+\/[^/]+\/$/.test(p)).length,noindexPages:noindexCount,sitemapUrls:sitemapPaths.length,sitemapNoindexUrls:sitemapNoindex,maxClickDepth:Math.max(...depth.values()),depthCounts,missingOrDuplicateMetadata:errors.filter(e=>/title|description/.test(e)).length,titleCharacters:{min:Math.min(...[...pages.values()].map(p=>p.titleLength)),max:Math.max(...[...pages.values()].map(p=>p.titleLength))},largestAssets:assets.slice(0,5),errors,warnings};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
