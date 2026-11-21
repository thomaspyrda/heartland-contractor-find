import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../src/worker.mjs';
const ctx={waitUntil(){}};
test('canonical redirects preserve path and campaign query before asset lookup',async()=>{
 let fetched=false;const env={ASSETS:{fetch(){fetched=true;throw new Error('must redirect before assets');}}};
 for(const input of ['https://www.heartlandcontractorfind.com/concrete/shenandoah-ia/?utm_source=test','http://heartlandcontractorfind.com/concrete/shenandoah-ia/?utm_source=test']){
  const response=await worker.fetch(new Request(input),env,ctx);
  assert.equal(response.status,308);assert.equal(response.headers.get('Location'),'https://heartlandcontractorfind.com/concrete/shenandoah-ia/?utm_source=test');
 }
 assert.equal(fetched,false);assert.equal(JSON.parse(readFileSync('wrangler.json','utf8')).assets.run_worker_first,true);
});
test('missing-page status is preserved and previews, API and operational JSON stay noindex',async()=>{
 const asset=(status=200)=>({ASSETS:{fetch:async()=>new Response('asset',{status,headers:{'Content-Type':'text/html'}})}});
 const missing=await worker.fetch(new Request('https://heartlandcontractorfind.com/missing/'),asset(404),ctx);assert.equal(missing.status,404);assert.equal(missing.headers.get('X-Robots-Tag'),'noindex');
 for(const input of ['https://preview.workers.dev/','https://heartlandcontractorfind.com/build-info.json'])assert.equal((await worker.fetch(new Request(input),asset(),ctx)).headers.get('X-Robots-Tag'),'noindex');
 const api=await worker.fetch(new Request('https://heartlandcontractorfind.com/api/form-config'),{},ctx);assert.equal(api.headers.get('X-Robots-Tag'),'noindex');
 const page=await worker.fetch(new Request('https://heartlandcontractorfind.com/concrete/'),asset(),ctx);assert.equal(page.status,200);assert.equal(page.headers.get('X-Robots-Tag'),null);
});
