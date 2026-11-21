import base from '../content/site.json' with {type:'json'};
import coverage from '../content/coverage.json' with {type:'json'};
import iaResearch from '../content/local-research-ia.json' with {type:'json'};
import neAResearch from '../content/local-research-ne-a.json' with {type:'json'};
import neBResearch from '../content/local-research-ne-b.json' with {type:'json'};
import moKsResearch from '../content/local-research-mo-ks.json' with {type:'json'};
import {projectThemeFor} from './projects.mjs';

export const localResearch={...iaResearch.towns,...neAResearch.towns,...neBResearch.towns,...moKsResearch.towns};

export const stateOrder=['IA','NE','MO','KS'];
export const stateNames={IA:'Iowa',NE:'Nebraska',MO:'Missouri',KS:'Kansas'};
export function milesBetween(a,b){
  const rad=x=>x*Math.PI/180,dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;
  return 3958.7613*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
const towns=Object.fromEntries(coverage.towns.map(t=>{
  const original=base.towns[t.slug]||{};
  const research=localResearch[t.slug];
  if(!research)throw new Error(`Missing local resource research for ${t.slug}`);
  const verified=research.status==='verified' && !!research.url;
  return [t.slug,{...t,...original,resource:verified?research.url:null,resourceLabel:verified?research.label:'',localPlanning:research.guidance,resourceKind:research.kind,resourceOffice:research.office}];
}));
// Research and expanded writing are build-time only. The lead Worker retains its lightweight attribution map.
const pages=[];
for(const [index,[slug,t]] of Object.entries(towns).entries())for(const [key,s] of Object.entries(base.services)){
  const theme=projectThemeFor(key,t,index);
  const note=slug==='pawnee-city-ne' && key!=='concrete' ? `Pawnee City publishes building-permit forms and project FAQs through its zoning office. Describe whether your work is a repair, replacement, or new feature so the office can confirm the appropriate local review.` : t.localPlanning;
  pages.push({service:key,town:slug,intro:`Planning ${s.name.toLowerCase()} at your ${t.name}, ${t.stateName}, home? Share your ideas, and we will help connect you with a local contractor to discuss the possibilities. Residential projects of all sizes are welcome.`,localHeading:`Bring your ${t.name} project to life.`,localDetail:theme.hook,localIdeas:`For your ${t.name} project, ${theme.prompt.charAt(0).toLowerCase()+theme.prompt.slice(1)} Include your budget range, preferred timing, and at least one project or inspiration photo. Those details help us understand your ideas and find a contractor to discuss the work.`,localPermits:`Depending on the scope of work, permits or other approvals may be needed for ${t.name}. Requirements vary by location and should be confirmed for your project before work begins.`,localPlanning:note,projectTheme:theme});
}
export const site={...base,coverage:'Southwest Iowa, Southeast Nebraska, Northwest Missouri, and Northeast Kansas',towns,pages};
export {coverage};
