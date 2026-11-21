import policy from '../content/indexing.json' with {type:'json'};
const services=['concrete','masonry','hardscaping','retaining-walls'];
export const approvedIndexPaths=new Set([...policy.corePaths,...policy.localTowns.flatMap(town=>services.map(service=>`/${service}/${town}/`))]);
export function indexingEnabled(value=process.env.INDEXING_ENABLED){
  return value===undefined?policy.enabled===true:value==='true';
}
export function isIndexable(path,enabled=indexingEnabled()){
  return enabled && approvedIndexPaths.has(path);
}
export {policy as indexingPolicy};
