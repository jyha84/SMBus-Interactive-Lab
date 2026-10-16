"""Extract exact Figure 6 vector geometry from the official SMBus 3.3 PDF.
Usage: python scripts/extract-figure6.py /path/to/SMBus_3_3_20240512.pdf
Requires PyMuPDF. Runtime app has no Python dependency.
Never change path data, transforms, glyphs, dash arrays, or arrow positions.
"""
import sys, json, re, hashlib, copy
from pathlib import Path
import xml.etree.ElementTree as ET
import fitz

ROOT = Path(__file__).resolve().parents[1]
SVG = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', XLINK)
pdf = Path(sys.argv[1])
assert hashlib.sha256(pdf.read_bytes()).hexdigest() == 'd109ff6956b2cbe832282da02b9be2bed72a6d6210cb283175f12ed78b578ce8', 'Source PDF changed; review geometry and path classifications before generating.'
page = fitz.open(pdf)[17]
source = ET.fromstring(page.get_svg_image(text_as_path=True))
drawings = page.get_drawings()
paths = [e for e in source if e.tag == f'{{{SVG}}}path']
assert len(paths) == len(drawings), 'Exporter changed: path mapping must be reviewed.'
path_info = {id(e):(i,d) for i,(e,d) in enumerate(zip(paths,drawings))}
bounds = (63,70.5,730.5,262.5)
labels = {
 'tBUF':(149,205,169,221), 'tHD:STA':(200,154,227,170),
 'tLOW':(222,86,242,103), 'tR':(260,76,316,92),
 'tHD:DAT':(267,154,294,170), 'tHIGH':(361,154,381,170),
 'tF':(370,76,426,92), 'tSU:DAT':(410,151,436,168),
 'tSU:STA':(448,154,474,170), 'tSU:STO':(654,154,680,170)}
ranges = {'tBUF':(465,471),'tHD:STA':(472,479),'tLOW':(480,486),
 'tR':(487,493),'tHD:DAT':(494,501),'tHIGH':(502,509),
 'tF':(510,516),'tSU:STA':(517,524),'tSU:STO':(525,532),'tSU:DAT':(537,544)}
def inside(r):
 return r[0]>=bounds[0] and r[1]>=bounds[1] and r[2]<=bounds[2] and r[3]<=bounds[3]
def origin(e):
 vals=[float(v) for v in re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',e.get('transform',''))]
 assert len(vals)==6
 return vals[-2:]
def glyphs(e):
 return [e] if e.tag==f'{{{SVG}}}use' else list(e.iter(f'{{{SVG}}}use'))
root=ET.Element(f'{{{SVG}}}svg',{'viewBox':'63 70.5 667.5 192','class':'f6-vector','role':'group','aria-label':'SMBus 3.3 Figure 6 원문 좌표의 벡터 파형. 파라미터를 선택하면 측정 구간과 규격을 표시합니다.'})
selected=[]; preserved=[]
for original in source:
 if original.tag==f'{{{SVG}}}defs':continue
 e=copy.deepcopy(original)
 if id(original) in path_info:
  i,d=path_info[id(original)]
  if not inside(d['rect']):continue
  preserved.append(i)
  if d['fill'] is not None:
   if min(d['fill'])>.99:cls='f6-mask'
   elif d['fill'][1]>d['fill'][0]:cls='f6-start-band'
   else:cls='f6-stop-band'
  elif (d['width'] or 0)>.9:
   if d['rect'].width>590:cls='f6-threshold'
   elif d['rect'].y1<140:cls='f6-clk'
   else:cls='f6-dat'
  else:cls='f6-dimension'
  e.set('class',cls)
  for param,(a,b) in ranges.items():
   if a<=i<=b:e.set('data-part',param)
  e.set('data-source-path',str(i))
 else:
  gs=glyphs(e)
  if not gs or not all(inside((*origin(g),*origin(g))) for g in gs):continue
  for g in gs:
   x,y=origin(g);cls='f6-letter'
   if 72<x<111 and 90<y<104:cls+=' f6-clk-label'
   if 72<x<111 and 157<y<171:cls+=' f6-dat-label'
   g.set('class',cls)
   for param,(x0,y0,x1,y1) in labels.items():
    if x0<=x<=x1 and y0<=y<=y1:g.set('data-part',param)
 selected.append(e)
# Keep only definitions referenced by the cropped figure, retaining exact font outlines.
defs=next(e for e in source if e.tag==f'{{{SVG}}}defs')
needed=set()
for e in selected:
 for child in e.iter():
  for key,v in child.attrib.items():
   if key.endswith('href') and v.startswith('#'):needed.add(v[1:])
   needed.update(re.findall(r'url\(#([^)]*)\)',v))
newdefs=ET.SubElement(root,f'{{{SVG}}}defs')
for e in defs:
 if e.get('id') in needed:newdefs.append(copy.deepcopy(e))
for e in selected:root.append(e)
# Avoid duplicate IDs with the rest of the app.
markup=ET.tostring(root,encoding='unicode')
for identifier in sorted(needed,key=len,reverse=True):
 markup=markup.replace('id="'+identifier+'"','id="f6v-'+identifier+'"').replace('#'+identifier+'"','#f6v-'+identifier+'"').replace('#'+identifier+')','#f6v-'+identifier+')')
# Coordinate preservation is a gate, including every glyph origin and drawing path.
for e in selected:
 if e.get('data-source-path'):
  original=paths[int(e.get('data-source-path'))]
  for attr in ('d','transform','stroke-dasharray','stroke-width'):
   assert e.get(attr)==original.get(attr),f'Geometry changed: {attr}'
assert len(preserved)==139, f'Expected all 139 figure paths, got {len(preserved)}'
assert '<image' not in markup
(ROOT/'dist/assets/smbus-3.3-figure6.svg').write_text(markup)
(ROOT/'dist/figure6-vector.js').write_text('/* Generated from original PDF paths. See scripts/extract-figure6.py. */\nwindow.SMB_FIGURE6_VECTOR = '+json.dumps(markup,ensure_ascii=False)+';\n')
print(json.dumps({'paths':len(preserved),'glyphs':sum(len(glyphs(e)) for e in selected),'bytes':len(markup),'source_sha256':hashlib.sha256(pdf.read_bytes()).hexdigest()}))
