from pathlib import Path
import json,urllib.request,urllib.parse,zipfile,io,concurrent.futures
from shapely.geometry import shape,Point
from shapely.ops import transform,unary_union
from pyproj import CRS,Transformer
import tempfile,sys
cache=Path(sys.argv[1]) if len(sys.argv)>1 else Path(tempfile.gettempdir())/'heartland-coverage'
cache.mkdir(parents=True,exist_ok=True)
base='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2025/MapServer'
def get(layer,params,name):
 p=cache/(name+'.json')
 if p.exists():return json.loads(p.read_text())
 params={'f':'geojson','outFields':'*','outSR':4326,'returnGeometry':'true',**params}
 url=f'{base}/{layer}/query?'+urllib.parse.urlencode(params)
 with urllib.request.urlopen(url,timeout=120) as r:d=json.load(r)
 if 'error' in d:raise RuntimeError(d)
 p.write_text(json.dumps(d));return d
origin=get(28,{'where':"STATE='19' AND BASENAME='Farragut'"},'origin')['features'][0]['properties']
lat,lon=float(origin['CENTLAT']),float(origin['CENTLON']);print('origin',lat,lon,flush=True)
projection=CRS.from_proj4(f'+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m')
project=Transformer.from_crs(4326,projection,always_xy=True).transform
radius=Point(0,0).buffer(60*1609.344,quad_segs=720)
params={'where':'1=1','geometry':json.dumps({'xmin':lon-1.7,'ymin':lat-1.25,'xmax':lon+1.7,'ymax':lat+1.25,'spatialReference':{'wkid':4326}}),'geometryType':'esriGeometryEnvelope','inSR':4326,'spatialRel':'esriSpatialRelIntersects'}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 results=list(pool.map(lambda x:get(*x),[(2,params,'zip-candidates'),(28,{**params,'where':"STATE IN ('19','20','29','31')"},'incorporated-4states'),(30,{**params,'where':"STATE IN ('19','20','29','31')"},'cdps-4states')]))
zips=[]
for f in results[0]['features']:
 g=transform(project,shape(f['geometry']));code=f['properties']['ZCTA5']
 if g.intersects(radius):zips.append((code,g))
print('intersecting ZIPs',len(zips),flush=True)
u=cache/'postal.zip'
if not u.exists():u.write_bytes(urllib.request.urlopen('https://download.geonames.org/export/zip/US.zip',timeout=60).read())
rows=zipfile.ZipFile(u).read('US.txt').decode().splitlines();postal=[]
for row in rows:
 p=row.split('\t')
 if p[4] in ['IA','NE','MO','KS']:postal.append({'zip':p[1],'name':p[2],'state':p[4],'county':p[5],'lat':float(p[9]),'lon':float(p[10])})
selected={code for code,g in zips};states={'19':'IA','20':'KS','29':'MO','31':'NE'};names={'IA':'Iowa','NE':'Nebraska','MO':'Missouri','KS':'Kansas'}
# Census places intersecting a selected ZIP area are retained even when their center is outside the radius.
towns={}
for f in results[1]['features']+results[2]['features']:
 p=f['properties'];g=transform(project,shape(f['geometry']))
 codes=sorted(code for code,z in zips if g.intersection(z).area>1)
 if not codes:continue
 state=states[p['STATE']];name=p['BASENAME'];key=(state,''.join(c for c in name.casefold() if c.isalnum()))
 plat,plon=float(p['CENTLAT']),float(p['CENTLON']);distance=Point(project(plon,plat)).distance(Point(0,0))/1609.344
 towns[key]={'name':name,'state':state,'stateName':names[state],'zipCodes':codes,'latitude':plat,'longitude':plon,'centerMiles':round(distance,1),'censusGeoid':p['GEOID'],'kind':'Census place','censusLayer':28 if f in results[1]['features'] else 30,'counties':sorted({q['county'] for q in postal if q['state']==state and q['name'].casefold()==name.casefold() and q['zip'] in codes})}
# Include postal place names for rural and unincorporated communities in all intersecting ZIPs.
for p in postal:
 if p['zip'] not in selected:continue
 key=(p['state'],''.join(c for c in p['name'].casefold() if c.isalnum()))
 if key not in towns:
  distance=Point(project(p['lon'],p['lat'])).distance(Point(0,0))/1609.344
  towns[key]={'name':p['name'],'state':p['state'],'stateName':names[p['state']],'zipCodes':[],'latitude':p['lat'],'longitude':p['lon'],'centerMiles':round(distance,1),'kind':'Postal community','counties':[]}
 t=towns[key];t['zipCodes']=sorted(set(t['zipCodes']+[p['zip']]))
 if p['county']:t['counties']=sorted(set(t['counties']+[p['county']]))
# Post-office-only ZIPs lack Census polygons; retain those associated with listed towns.
national=cache/'gazetteer.zip'
if not national.exists():national.write_bytes(urllib.request.urlopen('https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_Gaz_zcta_national.zip',timeout=60).read())
gaz=zipfile.ZipFile(national)
all_geographic={line.split('|')[0].strip() for line in gaz.read(gaz.namelist()[0]).decode().splitlines()[1:]}
extra=set()
for p in postal:
 key=(p['state'],''.join(c for c in p['name'].casefold() if c.isalnum()))
 if key in towns and p['zip'] not in all_geographic:
  towns[key]['zipCodes']=sorted(set(towns[key]['zipCodes']+[p['zip']]))
  extra.add(p['zip'])
ordered=sorted(towns.values(),key=lambda t:(t['state'],t['name']))
import re,unicodedata
for t in ordered:t['slug']=re.sub('[^a-z0-9]+','-',unicodedata.normalize('NFKD',t['name']).encode('ascii','ignore').decode().lower()).strip('-')+'-'+t['state'].lower()
assert len(set(t['slug'] for t in ordered))==len(ordered)
output={'origin':{'name':'Farragut, Iowa','latitude':lat,'longitude':lon,'censusGeoid':origin['GEOID']},'radiusMiles':60,'method':'Any intersection of a 60-mile azimuthal-equidistant radius with 2020 Census ZIP Code Tabulation Area geometry. Census places and postal community names associated with those areas are included. Additional non-ZCTA postal codes associated with included town names are listed for lead intake, not asserted to have polygon overlap.','sources':[base+'/2',base+'/28',base+'/30','https://download.geonames.org/export/zip/US.zip'],'geographicZipCodes':sorted(selected),'additionalPostalCodes':sorted(extra),'towns':ordered}
(Path(__file__).resolve().parents[1]/'content'/'coverage.json').write_text(json.dumps(output,indent=2)+'\n')
print('towns',len(ordered),'additional postal codes',len(extra),'uniqueZIP',len(selected|extra),flush=True)
for state in ['IA','NE','MO','KS']:
 print(state,[t['name'] for t in ordered if t['state']==state],flush=True)
print('ZIPs without names',selected-{p['zip'] for p in postal},flush=True)
