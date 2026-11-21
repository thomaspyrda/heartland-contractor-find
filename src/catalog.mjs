import base from '../content/site.json' with {type:'json'};
import coverage from '../content/coverage.json' with {type:'json'};

export const stateOrder=['IA','NE','MO','KS'];
export const stateNames={IA:'Iowa',NE:'Nebraska',MO:'Missouri',KS:'Kansas'};
export function milesBetween(a,b){
  const rad=x=>x*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
const towns=Object.fromEntries(coverage.towns.map(t=>{
  const original=base.towns[t.slug]||{};
  return [t.slug,{...t,context:`${t.name}, ${t.stateName}, is included through our ZIP-area coverage directory. The listed ZIP codes are ${t.zipCodes.join(', ')}. ${t.counties.length?`Postal references associate this community with ${t.counties.join(' and ')} County${t.counties.length>1?' areas':''}. `:''}Tell us the actual project town and ZIP code, including rural properties or a different mailing-city name. Our sales team reviews location, scope, and availability during follow-up; the form does not reject a project by distance.`,resource:null,resourceLabel:'',...original}];
}));
// Service-specific passages are localized for every community; municipal resource links remain where researched.
const pages=[];
for(const [slug,t] of Object.entries(towns))for(const [key,s] of Object.entries(base.services)){
  const ideas={
    concrete:`A new patio, a durable slab, or fresh concrete for a space you use every day—what would make your ${t.name} home work better for you?`,
    masonry:`New brick or stonework, refreshed steps, or repairs to the masonry around your ${t.name} home—what would you like to improve?`,
    hardscaping:`A new patio, a welcoming walkway, or a fire pit for evenings outside—what would make your outdoor space in ${t.name} work better for you?`,
    'retaining-walls':`More usable yard space, a defined garden area, or a new wall to replace an aging one—what would you like to change at your ${t.name} property?`
  };
  const prompts={
    concrete:'Tell us how you plan to use the space, what is there now, and any related work you are considering.',
    masonry:'Tell us what you want to build or repair, what needs attention, and how you would like the finished work to look.',
    hardscaping:'Tell us how you would like to use the space, what you want to change, and any related work you are considering.',
    'retaining-walls':'Tell us about the space, any existing wall or slope, and how the wall should connect with your yard, patio, or steps.'
  };
  pages.push({service:key,town:slug,intro:`Planning ${s.name.toLowerCase()} at your ${t.name}, ${t.stateName}, home? Share your ideas, and we will help connect you with a local contractor to discuss the possibilities. Residential projects of all sizes are welcome.`,localHeading:`Bring your ${t.name} project to life.`,localDetail:`${ideas[key]} Whether you have a clear plan or are gathering ideas, we will help connect you with a local contractor to discuss the possibilities.`,localIdeas:`For your ${t.name} project, ${prompts[key].charAt(0).toLowerCase()+prompts[key].slice(1)} Include your budget range, preferred timing, and at least one photo of the area or inspiration you like. Those details give the contractor a useful starting point for your conversation.`,localPermits:`Depending on the scope of work, permits or other approvals may be needed for ${t.name}. Requirements vary by location and should be confirmed for your project before work begins.`});
}
export const site={...base,coverage:'Southwest Iowa, Southeast Nebraska, Northwest Missouri, and Northeast Kansas',towns,pages};
export {coverage};
