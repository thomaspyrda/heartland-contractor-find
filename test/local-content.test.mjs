import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {site,coverage,localResearch} from '../src/catalog.mjs';
import {projectCatalog} from '../src/projects.mjs';
const esc=s=>s.replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('"','&quot;');
test('every town has researched guidance; only verified official resources are rendered',()=>{
 assert.deepEqual(Object.keys(localResearch).sort(),coverage.towns.map(t=>t.slug).sort());
 for(const t of Object.values(site.towns)){
  const record=localResearch[t.slug];assert.ok(record.evidence,t.slug);assert.ok(record.jurisdictionNote,t.slug);
  for(const service of Object.keys(site.services)){
   const html=readFileSync(`dist/${service}/${t.slug}/index.html`,'utf8');
   if(record.status==='verified'){
    assert.ok(record.url && record.label && record.office,t.slug);
    assert.ok(record.sourceUrls.includes(record.url),t.slug);
    assert.ok(['permit','city-hall','county'].includes(record.kind),t.slug);
    assert.ok(/^https:\/\//.test(record.url),t.slug);
    assert.doesNotMatch(record.url,/tigerweb|arcgis\/rest|facebook\.com|f=pjson/);
    assert.ok(html.includes(`class="resource" href="${esc(record.url)}"`),t.slug);
   }else{
    assert.equal(record.url,null,t.slug);assert.equal(t.resource,null,t.slug);
    assert.ok(!html.includes('class="resource"'),t.slug);
    assert.ok(html.includes(`More details about local requirements may need to be found before starting your project in ${esc(t.name)}.`),t.slug);
   }
  }
 }
});
test('every local page replaces the themed project cards with the approved town-specific licensing message',()=>{
 for(const [key,catalog] of Object.entries(projectCatalog)){
  assert.equal(catalog.projects.length,40,key);assert.equal(new Set(catalog.projects.map(p=>p.id)).size,40,key);
 }
 for(const p of site.pages){
  const t=site.towns[p.town],html=readFileSync(`dist/${p.service}/${p.town}/index.html`,'utf8');
  assert.ok(html.includes(`We only connect you with fully licensed and insured contractors serving ${esc(t.name)}.`));
  assert.match(html,/class="scope-box contractor-assurance"/);
  assert.ok(!html.includes('data-project-example='));
  assert.ok(!html.includes('Here is a closer look at a few possibilities.'));
  assert.match(html,/budget range, preferred timing, and at least one project or inspiration photo/);
  assert.ok(!html.includes('{town}'));
 }
});
test('local resources and expanded content do not increase lead Worker initialization dependencies',()=>{
 const worker=readFileSync('src/worker.mjs','utf8');
 assert.doesNotMatch(worker,/local-research|project-examples|catalog\.mjs|projects\.mjs/);
});

test('every concrete, masonry and hardscaping location page includes its complete 40-item bullet list',()=>{
 let count=0;
 for(const p of site.pages){
  const catalog=projectCatalog[p.service];if(!catalog)continue;
  const html=readFileSync(`dist/${p.service}/${p.town}/index.html`,'utf8');
  assert.match(html,/<ul class="full-project-list">/);
  assert.equal((html.match(/data-project-suggestion=/g)||[]).length,40);
  for(const project of catalog.projects)assert.ok(html.includes(`<li data-project-suggestion="${p.service}-${project.id}">${esc(project.title)}</li>`),`${p.service}/${p.town}: ${project.id}`);
  count++;
 }
 assert.equal(count,coverage.towns.length*3);
});
