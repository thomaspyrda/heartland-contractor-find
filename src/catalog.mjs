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
// Preserve the six individually researched local pages; expand every listed community across the existing services.
const pages=[];
for(const [slug,t] of Object.entries(towns))for(const [key,s] of Object.entries(base.services)){
  const original=base.pages.find(p=>p.town===slug&&p.service===key);
  if(original){pages.push(original);continue;}
  const zipText=t.zipCodes.join(', ');
  const nearby=Object.values(towns).filter(n=>n.slug!==slug).sort((a,b)=>milesBetween(t,a)-milesBetween(t,b)).slice(0,3).map(n=>`${n.name}, ${n.state}`).join('; ');
  const planning={
    concrete:'Describe what the concrete will support, approximate dimensions, site access, and whether existing material needs removal. For a patio, show the relationship to the home; for an indoor slab, explain access to the room and any connected work.',
    masonry:'Identify whether the work involves brick, block, stone, a chimney, or steps. Include a wide photo showing the area and close-up details of the joints or damage. Mention working height and nearby roofs or landscaping that affect access.',
    hardscaping:'Describe how you want to use the space and how the patio, paths, walls, and any fire feature should connect. Photos should show the wider yard, existing surfaces, changes in grade, and access from the street or driveway.',
    'retaining-walls':'Include the approximate wall length and height, material preferences, and what is above and below the wall. Photograph the slope and any existing wall. Mention connected patios or steps so the contractor can review the whole site.'
  };
  pages.push({service:key,town:slug,intro:`Looking for a local contractor to discuss ${s.name.toLowerCase()} in ${t.name}, ${t.stateName}? Share the whole residential project, your budget range, preferred timing, and at least one photo. We help arrange a contractor conversation for projects of all sizes.`,localHeading:`Planning ${s.name.toLowerCase()} in ${t.name}`,localDetail:`For a ${t.name} inquiry, our directory lists ZIP codes ${zipText}. Nearby listed communities include ${nearby}. ${planning[key]} A mailing ZIP can include several communities or rural addresses; provide the town and ZIP for the actual work site so the sales team can plan the follow-up.`});
}
export const site={...base,coverage:'Southwest Iowa, Southeast Nebraska, Northwest Missouri, and Northeast Kansas',towns,pages};
export {coverage};
