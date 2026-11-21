import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {site,coverage} from '../src/catalog.mjs';
const root=resolve('dist');
const info=JSON.parse(readFileSync(join(root,'build-info.json'),'utf8'));
test('all published routes have one heading, unique SEO metadata and working local links',()=>{
  const titles=new Set(), descriptions=new Set();
  for(const path of info.pages){const html=readFileSync(join(root,path,'index.html'),'utf8');assert.equal((html.match(/<h1>/g)||[]).length,1,path);
    const title=html.match(/<title>(.*?)<\/title>/)[1],description=html.match(/<meta name="description" content="([^"]*)"/)[1];assert.ok(!titles.has(title),path);titles.add(title);assert.ok(!descriptions.has(description),path);descriptions.add(description);assert.match(html,new RegExp(`<link rel="canonical" href="https://heartlandcontractorfind.com${path}">`));
    for(const [,target] of html.matchAll(/(?:href|src)="(\/[^"#]*)/g)){const clean=target.split('#')[0];if(clean.startsWith('/api/'))continue;assert.ok(existsSync(join(root,clean))||existsSync(join(root,clean,'index.html')),`${path}: ${target}`);}
  }
});
test('all forms remain open-ended and include the source path',()=>{
  for(const path of info.pages){const html=readFileSync(join(root,path,'index.html'),'utf8');assert.ok(!html.includes('<select'),path);assert.match(html,/name="description" required/);assert.match(html,/name="source_path"/);if(path!=='/privacy/')for(const field of ['budget','timeline','photos'])assert.match(html,new RegExp(`name="${field}" required`));}
});
test('all structured data parses and no fake local contractor or review markup is present',()=>{
  for(const path of info.pages){const html=readFileSync(join(root,path,'index.html'),'utf8');for(const [,json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)){const schema=JSON.parse(json);assert.ok(Array.isArray(schema));}assert.doesNotMatch(html,/"@type":"(?:LocalBusiness|AggregateRating|Review)"/);}
});
test('prelaunch builds are not presented as indexed pages',()=>{
  if(!info.indexingEnabled)for(const path of info.pages)assert.match(readFileSync(join(root,path,'index.html'),'utf8'),/name="robots" content="noindex,follow"/);
});
test('every directory community has all four service pages',()=>{
  assert.equal(info.pages.filter(p=>/^\/[^/]+\/[^/]+\/$/.test(p)).length,coverage.towns.length*4);for(const key of ['concrete','masonry','hardscaping','retaining-walls'])assert.ok(info.pages.includes(`/${key}/`));
});
test('the public site contains no personal notification address, credentials or partner identity',()=>{
  function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
  for(const file of walk(root).filter(f=>/\.(html|js|json|css|xml|txt)$/.test(f))){const text=readFileSync(file,'utf8');assert.doesNotMatch(text,/@gmail\.com|RESEND_API_KEY|TURNSTILE_SECRET_KEY|LEAD_NOTIFICATION_TO|roushconstruction/i,file);}
});
test('stock images contain no embedded EXIF, IPTC or comment metadata',()=>{
  for(const name of readdirSync(join(root,'assets')).filter(f=>f.endsWith('.jpg'))){
    const bytes=readFileSync(join(root,'assets',name));let i=2;
    while(i<bytes.length){assert.equal(bytes[i],255,name);while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===218)break;if([216,217].includes(marker)||(marker>=208&&marker<=215))continue;
      assert.ok(![225,237,254].includes(marker),`Embedded metadata found: ${name}`);i+=bytes.readUInt16BE(i);
    }
  }
});

test('the directory includes the origin, overlapping boundary communities, and Kansas without removing the original pages',()=>{
  for(const path of ['/concrete/farragut-ia/','/hardscaping/omaha-ne/','/masonry/white-cloud-ks/','/retaining-walls/lincoln-ne/','/concrete/shenandoah-ia/'])assert.ok(info.pages.includes(path),path);
  for(const key of Object.keys(site.services)){
    const html=readFileSync(join(root,key,'index.html'),'utf8');
    for(const town of coverage.towns)assert.ok(html.includes(`href="/${key}/${town.slug}/"`),`${key}/${town.slug}`);
  }
  const codes=new Set(coverage.towns.flatMap(t=>t.zipCodes));
  for(const code of coverage.geographicZipCodes)assert.ok(codes.has(code),code);
  assert.equal(coverage.radiusMiles,60);
});
