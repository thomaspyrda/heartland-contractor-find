import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker,{acceptLead,notifyLead,retryNotifications,configured,pageContext} from '../src/worker.mjs';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_leads.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){return {bind(...params){return {first:async()=>sqlite.prepare(sql).get(...params)||null,run:async()=>sqlite.prepare(sql).run(...params),all:async()=>({results:sqlite.prepare(sql).all(...params)})};}};}};
  const objects=new Map();
  const PHOTOS={put:async(k,v)=>objects.set(k,v),get:async k=>objects.has(k)?{arrayBuffer:async()=>objects.get(k).buffer}:null,delete:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k);}};
  const env={DB,PHOTOS,TURNSTILE_SITE_KEY:'public-test-key',TURNSTILE_SECRET_KEY:'test-secret',RESEND_API_KEY:'test-api-key',LEAD_NOTIFICATION_TO:'inquiries@example.test',MAIL_FROM:'Forms <forms@example.test>',PUBLIC_ORIGIN:'https://heartlandcontractorfind.com',INQUIRIES_ENABLED:'true',PARTNER_ID:'partner-test',REFERRAL_OWNER:'owner-test'};
  const pending=[];const ctx={waitUntil:p=>pending.push(p)};const sent=[];
  const fetcher=async(url,opts)=>{
    if(url.includes('siteverify'))return Response.json({success:true,hostname:'heartlandcontractorfind.com',action:'project-inquiry'});
    sent.push(JSON.parse(opts.body));return Response.json({id:'mail-test'});
  };
  const count=()=>sqlite.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
  const lead=()=>sqlite.prepare('SELECT * FROM leads LIMIT 1').get();
  return {sqlite,env,objects,pending,ctx,sent,fetcher,count,lead};
}
function fields(changes={},withPhoto=true) {
  const values={name:'Test Homeowner',email:'homeowner@example.test',phone:'712-555-0100',location:'Shenandoah, IA 51601',description:'A small concrete pad and a related brick step repair.',budget:'$150 or still figuring it out',timeline:'Next spring if possible',notes:'Please call in the afternoon.',source_path:'/concrete/shenandoah-ia/',request_id:crypto.randomUUID(),consent:'yes','cf-turnstile-response':'valid-test-token',...changes};
  const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);if(withPhoto)data.append('photos',new File([new Uint8Array([255,216,255,1,2,3])],'project.jpg',{type:'image/jpeg'}));return data;
}
function request(data,origin='https://heartlandcontractorfind.com') {return new Request('https://heartlandcontractorfind.com/api/leads',{method:'POST',headers:{Origin:origin},body:data});}
test('saves an open-ended small project, attribution and privately addressed email',async()=>{
  const f=fixture();const response=await acceptLead(request(fields()),f.env,f.ctx,f.fetcher);
  assert.equal(response.status,201);const result=await response.json();assert.match(result.reference,/^[a-f0-9-]{36}$/);
  await Promise.all(f.pending);const row=f.lead();assert.equal(row.budget,'$150 or still figuring it out');assert.equal(row.referral_owner,'owner-test');assert.equal(row.service_context,'Concrete');assert.equal(row.town_context,'Shenandoah, IA');assert.equal(row.partner_id,'partner-test');assert.equal(row.notification_state,'sent');
  assert.deepEqual(f.sent[0].to,['inquiries@example.test']);assert.equal(f.sent[0].reply_to,'homeowner@example.test');
});
test('accepts mixed work, an uncertain location, and a budget range without a minimum',async()=>{
  const f=fixture();const r=await acceptLead(request(fields({description:'I have a mixed outdoor project and do not know what services are involved.',location:'Near the service boundary; please call me',budget:'$100–$200'})),f.env,f.ctx,f.fetcher);assert.equal(r.status,201);await Promise.all(f.pending);
});
test('retrying the same submission creates one lead and one notification',async()=>{
  const f=fixture(),id=crypto.randomUUID();for(let i=0;i<2;i++){const r=await acceptLead(request(fields({request_id:id})),f.env,f.ctx,f.fetcher);assert.ok(r.ok);await Promise.all(f.pending);}assert.equal(f.count(),1);assert.equal(f.sent.length,1);
});
test('retains the inquiry and retries a notification failure',async()=>{
  const f=fixture();const failMail=async(url,opts)=>url.includes('siteverify')?f.fetcher(url,opts):new Response('unavailable',{status:503});
  const r=await acceptLead(request(fields()),f.env,f.ctx,failMail);assert.equal(r.status,201);await Promise.all(f.pending);assert.equal(f.count(),1);assert.equal(f.lead().notification_state,'retry');
  await retryNotifications(f.env,f.fetcher);assert.equal(f.lead().notification_state,'sent');assert.equal(f.sent.length,1);
});
test('a notification claim prevents duplicate concurrent delivery',async()=>{
  const f=fixture();await acceptLead(request(fields()),f.env,f.ctx,f.fetcher);await Promise.all(f.pending);
  await Promise.all([notifyLead(f.env,f.lead().id,f.fetcher),notifyLead(f.env,f.lead().id,f.fetcher)]);assert.equal(f.sent.length,1);
});
test('stores photos privately and includes them in the owner notification',async()=>{
  const f=fixture(),data=fields({},false);data.append('photos',new File([new Uint8Array([255,216,255,1,2,3])],'private-name.jpg',{type:'image/jpeg'}));
  const r=await acceptLead(request(data),f.env,f.ctx,f.fetcher);assert.equal(r.status,201);await Promise.all(f.pending);assert.equal(f.objects.size,1);assert.equal(f.sent[0].attachments.length,1);assert.equal(f.sent[0].attachments[0].filename,'photo-1.jpg');assert.equal(JSON.stringify(await r.json()).includes('private-name'),false);
});
test('rejects disguised or oversized photos without saving a lead',async()=>{
  const f=fixture(),data=fields({},false);data.append('photos',new File(['<script>bad</script>'],'image.jpg',{type:'image/jpeg'}));
  assert.equal((await acceptLead(request(data),f.env,f.ctx,f.fetcher)).status,400);assert.equal(f.count(),0);
  const oversized=fields({},false);oversized.append('photos',new File([new Uint8Array(3*1024*1024+1)],'big.jpg',{type:'image/jpeg'}));assert.equal((await acceptLead(request(oversized),f.env,f.ctx,f.fetcher)).status,400);assert.equal(f.count(),0);
});
test('rejects missing consent, incorrect origin, honeypot, and invalid security token',async()=>{
  const f=fixture();assert.equal((await acceptLead(request(fields({consent:''})),f.env,f.ctx,f.fetcher)).status,400);
  assert.equal((await acceptLead(request(fields(),'https://unrelated.example'),f.env,f.ctx,f.fetcher)).status,403);
  const trap=fields();trap.set('website','spam');assert.equal((await acceptLead(request(trap),f.env,f.ctx,f.fetcher)).status,400);
  assert.equal((await acceptLead(request(fields()),f.env,f.ctx,async()=>Response.json({success:false}))).status,400);assert.equal(f.count(),0);
});
test('rejects a verified token for another hostname or action',async()=>{
  for(const value of [{hostname:'other.example',action:'project-inquiry'},{hostname:'heartlandcontractorfind.com',action:'other'}]){const f=fixture();const r=await acceptLead(request(fields()),f.env,f.ctx,async()=>Response.json({success:true,...value}));assert.equal(r.status,400);assert.equal(f.count(),0);}
});
test('privacy requests are saved unassigned and marked for private handling',async()=>{
  const f=fixture();await acceptLead(request(fields({source_path:'/privacy/',description:'Please remove my previous project inquiry.',budget:'',timeline:''},false)),f.env,f.ctx,f.fetcher);await Promise.all(f.pending);assert.equal(f.lead().request_kind,'privacy');assert.equal(f.lead().partner_id,'unassigned');assert.match(f.sent[0].text,/do not forward to a contractor/);
});
test('does not accept submissions while configuration is incomplete',async()=>{
  const f=fixture();delete f.env.RESEND_API_KEY;assert.equal(configured(f.env),false);assert.equal((await acceptLead(request(fields()),f.env,f.ctx,f.fetcher)).status,503);assert.equal(f.count(),0);
});
test('the public configuration endpoint exposes only readiness and the public sitekey',async()=>{
  const f=fixture();const r=await worker.fetch(new Request('https://heartlandcontractorfind.com/api/form-config'),f.env,f.ctx);const value=await r.json();assert.deepEqual(value,{ready:true,sitekey:'public-test-key'});assert.equal(JSON.stringify(value).includes('example.test'),false);
});
test('there is no public endpoint for retrieving lead records',async()=>{
  const f=fixture();const r=await worker.fetch(new Request('https://heartlandcontractorfind.com/api/leads'),f.env,f.ctx);assert.equal(r.status,405);assert.equal((await worker.fetch(new Request('https://heartlandcontractorfind.com/api/admin/leads'),f.env,f.ctx)).status,404);
});
test('context comes from known pages rather than arbitrary posted service names',()=>{
  assert.equal(pageContext('/masonry/clarinda-ia/').service,'Masonry');assert.equal(pageContext('/not-a-page/').path,'/');
});

test('requires budget, timing, and a nonempty photo before saving a project',async()=>{
  for(const field of ['budget','timeline','photos']){
    const f=fixture(),data=fields();data.delete(field);
    const response=await acceptLead(request(data),f.env,f.ctx,f.fetcher);
    assert.equal(response.status,400,field);assert.equal(f.count(),0);assert.equal(f.objects.size,0);assert.equal(f.sent.length,0);
  }
  const f=fixture(),data=fields({},false);data.append('photos',new File([],'empty.jpg',{type:'image/jpeg'}));
  assert.equal((await acceptLead(request(data),f.env,f.ctx,f.fetcher)).status,400);assert.equal(f.count(),0);
});

test('new community service pages retain service and town attribution without distance rejection',async()=>{
  const f=fixture();const r=await acceptLead(request(fields({source_path:'/hardscaping/white-cloud-ks/',location:'White Cloud, KS'})),f.env,f.ctx,f.fetcher);
  assert.equal(r.status,201);await Promise.all(f.pending);
  assert.equal(f.lead().town_context,'White Cloud, KS');assert.equal(f.lead().service_context,'Hardscaping');assert.equal(f.lead().referral_owner,'owner-test');
});

test('stores every offered phone-call preference and includes it in the owner notification',async()=>{
  for(const time of ['Morning','Afternoon','Evening']){
    const f=fixture();const response=await acceptLead(request(fields({callback_time:time,notes:'Side gate access.'})),f.env,f.ctx,f.fetcher);
    assert.equal(response.status,201);await Promise.all(f.pending);
    assert.equal(f.lead().notes,`Preferred Time for Phone Call: ${time}\n\nSide gate access.`);
    assert.ok(f.sent[0].text.includes(`Preferred Time for Phone Call: ${time}`));
  }
  const f=fixture();const response=await acceptLead(request(fields({callback_time:'Midnight'})),f.env,f.ctx,f.fetcher);
  assert.equal(response.status,400);assert.equal(f.count(),0);
});
