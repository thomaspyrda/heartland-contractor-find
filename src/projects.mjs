import examples from '../content/project-examples.json' with {type:'json'};

// Related projects stay together: each theme has a distinct homeowner goal and discussion prompt.
const overrides={
 concrete:{'pawnee-city-ne':3,'clarinda-ia':8,'shenandoah-ia':1,'maryville-mo':5,'lenox-ia':2},
 masonry:{'shenandoah-ia':1,'maryville-mo':8,'clarinda-ia':5},
 hardscaping:{'treynor-ia':9,'fort-calhoun-ne':9,'glenwood-ia':9,'portsmouth-ia':10}
};
export function projectThemeFor(service,town,index){
 if(service==='retaining-walls'){
  const catalog=examples.hardscaping;
  return {id:'retaining-walls',title:'Retaining walls and usable yard space',hook:`Imagine more useful outdoor space at your ${town.name} home, with a new retaining wall, a replacement for an aging wall, or terraces connected by steps. Tell us what you would like to change.`,prompt:'Show the slope, any existing wall, nearby buildings and paving, and the area from several angles. Describe the height changes if known and any water concerns.',projects:[31,32,33].map(id=>catalog.projects.find(p=>p.id===id)),catalog:'hardscaping'};
 }
 const catalog=examples[service];
 const requested=overrides[service]?.[town.slug];
 const theme=requested?catalog.themes.find(t=>t.id===requested):catalog.themes[index%catalog.themes.length];
 return {...theme,hook:theme.hook.replaceAll('{town}',town.name),projects:theme.projectIds.map(id=>catalog.projects.find(p=>p.id===id)),catalog:service};
}
export {examples as projectCatalog};
