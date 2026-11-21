import site from '../content/site.json' with {type:'json'};
import coverage from '../content/coverage.json' with {type:'json'};
const locationNames=new Map(coverage.towns.map(t=>[t.slug,`${t.name}, ${t.state}`]));

const MAX_BODY = 10 * 1024 * 1024;
const MAX_PHOTO = 3 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (data, status=200) => Response.json(data, {status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (error,status=400) => json({error},status);
export function configured(env) {
  return env.INQUIRIES_ENABLED === 'true' && !!(env.DB && env.PHOTOS && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.RESEND_API_KEY && env.LEAD_NOTIFICATION_TO && env.MAIL_FROM && env.PUBLIC_ORIGIN);
}
export function pageContext(path) {
  const route=/^\/([^/]+)\/([^/]+)\/$/.exec(path);
  if(route && site.services[route[1]] && locationNames.has(route[2]))return {path,service:site.services[route[1]].name,town:locationNames.get(route[2])};
  const category=Object.keys(site.services).find(k=>`/${k}/`===path);
  return {path:category||['/','/services/','/areas/','/about/','/privacy/','/photo-credits/'].includes(path)?path:'/',service:category?site.services[category].name:'General project inquiry',town:''};
}
export function validateFields(data) {
  const limits={name:120,phone:40,email:254,location:180,description:6000,budget:200,timeline:300,notes:2000,callback_time:20,source_path:240,request_id:36};
  const values={};
  for(const [key,max] of Object.entries(limits)) {
    const value=data.get(key);
    if(value!==null && typeof value!=='string') return {error:'Please check the information in your form.'};
    values[key]=(value||'').trim();
    if(values[key].length>max || /\x00/.test(values[key])) return {error:`Please shorten the ${key.replace('_',' ')} field.`};
  }
  if(!values.name || !values.location || values.description.length<10) return {error:'Please include your name, project ZIP code, and a description of at least 10 characters.'};
  if(!/^[0-9]{5}$/.test(values.location))return {error:'Please enter a ZIP code using exactly 5 digits.'};
  if(values.phone.replace(/\D/g,'').length<7 || !MAIL.test(values.email)) return {error:'Please include a valid phone number and email address.'};
  if(pageContext(values.source_path).path!=='/privacy/' && (!values.budget || !values.timeline)) return {error:'Please include your budget range and preferred timing.'};
  if(!['Morning','Afternoon','Evening'].includes(values.callback_time))return {error:'Please choose Morning, Afternoon, or Evening for your phone call.'};
  if(!UUID.test(values.request_id)) return {error:'Please reload the page and try again.'};
  if(data.get('consent')!=='yes') return {error:'Please agree to contact and project-information sharing before submitting.'};
  return {values};
}
export function imageType(bytes) {
  if(bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return ['image/jpeg','jpg'];
  if(bytes.length>=8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return ['image/png','png'];
  if(bytes.length>=12 && new TextDecoder().decode(bytes.slice(0,4))==='RIFF' && new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return ['image/webp','webp'];
  return null;
}
async function readLimited(request) {
  if(Number(request.headers.get('Content-Length'))>MAX_BODY)throw new Error('too-large');
  const reader=request.body?.getReader();if(!reader)throw new Error('bad-body');
  let length=0;const parts=[];
  for(;;) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BODY){await reader.cancel();throw new Error('too-large');}parts.push(value);}
  const body=new Uint8Array(length);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length;}
  return new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')},body}).formData();
}
async function verifyTurnstile(env,token,hostname,fetcher) {
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return false;
  const result=await response.json();return result.success===true && result.hostname===hostname && result.action==='project-inquiry';
}
export async function acceptLead(request,env,ctx,fetcher=fetch) {
  if(!configured(env))return fail('Project inquiries are not open yet. Please check back soon.',503);
  const url=new URL(request.url);
  let origin;
  try{origin=new URL(env.PUBLIC_ORIGIN).origin;}catch{return fail('Project inquiries are temporarily unavailable.',503);}
  if(request.headers.get('Origin')!==origin || url.origin!==origin)return fail('Please submit the form from this website.',403);
  if(!request.headers.get('Content-Type')?.startsWith('multipart/form-data'))return fail('Please use the project inquiry form.',415);
  let data;
  try{data=await readLimited(request);}catch(error){return fail(error.message==='too-large'?'Please keep the total upload below 10 MB.':'We could not read the form. Please try again.',error.message==='too-large'?413:400);}
  if(data.get('website'))return fail('Your request could not be accepted.',400);
  const validated=validateFields(data);if(validated.error)return fail(validated.error);
  const v=validated.values;
  // Store the preference with the lead's notes so existing databases and notification retries retain it.
  if(v.callback_time)v.notes=`Preferred Time for Phone Call: ${v.callback_time}${v.notes?'\n\n'+v.notes:''}`;
  const token=data.get('cf-turnstile-response');
  if(typeof token!=='string'||token.length>2048||!token)return fail('Please complete the security check.');
  try{if(!await verifyTurnstile(env,token,url.hostname,fetcher))return fail('Please complete the security check again.');}catch{return fail('The security check is temporarily unavailable. Please try again.',503);}
  const context=pageContext(v.source_path);
  const previous=await env.DB.prepare('SELECT id FROM leads WHERE request_id = ?').bind(v.request_id).first();
  if(previous)return json({reference:previous.id},200);
  const files=data.getAll('photos').filter(f=>typeof f!=='string'&&f.size>0);
  if(context.path!=='/privacy/' && files.length===0)return fail('Please add at least one project or inspiration photo.');
  if(files.length>3)return fail('Please choose no more than 3 images.');
  const prepared=[];
  for(const file of files){
    if(file.size>MAX_PHOTO)return fail('Each photo must be 3 MB or smaller.');
    const bytes=new Uint8Array(await file.arrayBuffer());const type=imageType(bytes);
    if(!type || file.type!==type[0])return fail('Please upload JPG, PNG, or WebP images only.');
    prepared.push({bytes,type});
  }
  const id=crypto.randomUUID(),created=new Date().toISOString(),keys=[];
  const kind=context.path==='/privacy/'?'privacy':'project';
  try{
    for(let i=0;i<prepared.length;i++){
      const {bytes,type}=prepared[i],key=`inquiries/${id}/photo-${i+1}.${type[1]}`;
      await env.PHOTOS.put(key,bytes,{httpMetadata:{contentType:type[0]}});keys.push(key);
    }
    await env.DB.prepare(`INSERT INTO leads (id, request_id, created_at, name, email, phone, location, description, budget, timeline, notes, source_path, service_context, town_context, referral_owner, partner_id, request_kind, consent_version, photo_keys, notification_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).bind(id,v.request_id,created,v.name,v.email,v.phone,v.location,v.description,v.budget,v.timeline,v.notes,context.path,context.service,context.town,env.REFERRAL_OWNER||'heartland-contractor-find',kind==='privacy'?'unassigned':(env.PARTNER_ID||'unassigned'),kind,'2026-11-20',JSON.stringify(keys)).run();
  }catch{
    // Undo uploads on a failed database write; another concurrent request may have won the unique request ID.
    if(keys.length)await env.PHOTOS.delete(keys).catch(()=>{});
    const existing=await env.DB.prepare('SELECT id FROM leads WHERE request_id = ?').bind(v.request_id).first();
    if(existing)return json({reference:existing.id});
    return fail('Your inquiry could not be saved. Your details remain in the form; please try again.',503);
  }
  ctx.waitUntil(notifyLead(env,id,fetcher).catch(()=>{}));
  return json({reference:id},201);
}
function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export async function notifyLead(env,id,fetcher=fetch) {
  if(!configured(env))return false;
  const now=Date.now();
  const lead=await env.DB.prepare(`UPDATE leads SET notification_state='sending', notification_attempts=notification_attempts+1, notification_lock_until=? WHERE id=? AND notification_attempts<8 AND (notification_state IN ('pending','retry') OR (notification_state='sending' AND notification_lock_until<?)) RETURNING *`).bind(now+600000,id,now).first();
  if(!lead)return false;
  try{
    const attachmentKeys=JSON.parse(lead.photo_keys||'[]');const attachments=[];
    for(const key of attachmentKeys){const object=await env.PHOTOS.get(key);if(!object)throw new Error('photo-missing');attachments.push({filename:key.split('/').pop(),content:base64(new Uint8Array(await object.arrayBuffer()))});}
    const text=[`New ${lead.request_kind==='privacy'?'privacy request':'project inquiry'}`,`Reference: ${lead.id}`,`Received: ${lead.created_at}`,`Name: ${lead.name}`,`Phone: ${lead.phone}`,`Email: ${lead.email}`,`Project ZIP code: ${lead.location}`,`\nPROJECT\n${lead.description}`,`\nBudget: ${lead.budget||'Not specified'}`,`Timing: ${lead.timeline||'Not specified'}`,`Other notes: ${lead.notes||'None'}`,`\nSource: ${lead.source_path}`,`Page topic: ${lead.service_context}`,`Page town: ${lead.town_context||'Not specified'}`,`Referral owner: ${lead.referral_owner}`,`Assigned partner: ${lead.partner_id}`,`Photos: ${attachmentKeys.length}`,lead.request_kind==='privacy'?'PRIVACY REQUEST: review privately; do not forward to a contractor.':'Follow up with the homeowner to qualify the project and arrange any appointment.'].join('\n');
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`inquiry-${lead.id}`},body:JSON.stringify({from:env.MAIL_FROM,to:[env.LEAD_NOTIFICATION_TO],reply_to:lead.email,subject:`${lead.request_kind==='privacy'?'Privacy request':'New project inquiry'} · ${lead.service_context} · ${lead.id.slice(0,8)}`,text,...(attachments.length?{attachments}:{})}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('delivery-failed');
    await env.DB.prepare("UPDATE leads SET notification_state='sent', notified_at=?, notification_lock_until=0 WHERE id=?").bind(new Date().toISOString(),id).run();return true;
  }catch{
    await env.DB.prepare("UPDATE leads SET notification_state=CASE WHEN notification_attempts>=8 THEN 'failed' ELSE 'retry' END, notification_lock_until=0 WHERE id=?").bind(id).run();return false;
  }
}
export async function retryNotifications(env,fetcher=fetch) {
  if(!configured(env))return;
  const rows=await env.DB.prepare("SELECT id FROM leads WHERE notification_attempts<8 AND (notification_state IN ('pending','retry') OR (notification_state='sending' AND notification_lock_until<?)) ORDER BY created_at LIMIT 10").bind(Date.now()).all();
  for(const row of rows.results||[])await notifyLead(env,row.id,fetcher);
}
function protect(response) {
  const r=new Response(response.body,response);
  r.headers.set('X-Content-Type-Options','nosniff');r.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  r.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  // JSON-LD is non-executable structured data. No executable inline scripts or event handlers are used.
  if(r.headers.get('Content-Type')?.includes('text/html'))r.headers.set('Cache-Control','public, max-age=0, must-revalidate');
  return r;
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(url.hostname==='www.heartlandcontractorfind.com'){url.hostname='heartlandcontractorfind.com';return Response.redirect(url.toString(),308);}
    if(url.pathname==='/api/form-config' && request.method==='GET')return json({ready:configured(env),sitekey:configured(env)?env.TURNSTILE_SITE_KEY:null});
    if(url.pathname==='/api/leads'){
      if(request.method!=='POST')return fail('Method not allowed.',405);
      try{return await acceptLead(request,env,ctx);}catch{return fail('Your inquiry could not be confirmed. Please try again.',503);}
    }
    if(url.pathname.startsWith('/api/'))return fail('Not found.',404);
    if(!['GET','HEAD'].includes(request.method))return fail('Method not allowed.',405);
    return protect(await env.ASSETS.fetch(request));
  },
  scheduled(event,env,ctx){ctx.waitUntil(retryNotifications(env));}
};
