import json, re, unicodedata, shutil
from pathlib import Path
from collections import defaultdict
import openpyxl

root = Path(__file__).resolve().parents[2]
out = root / 'dashboard' / 'dist'
def norm(s):
    return re.sub(r'[^а-яa-z0-9]', '', unicodedata.normalize('NFC', s).lower().replace('ё', 'е'))
images = {norm(re.sub(r'^\d+_', '', p.stem)): p for p in (root/'items').iterdir() if p.suffix.lower() in ('.jpg','.png','.jpeg')}
rows = list(openpyxl.load_workbook(next(root.glob('*.xlsx')), data_only=True, read_only=True).active.values)[1:]
products = {}
records = []
missing = []
(out/'items').mkdir(exist_ok=True)
for r in rows:
    if not r[0] or r[2] != 'доставлен': continue
    name = r[6]
    if name not in products:
        pid = len(products)
        img = images.get(norm(name))
        target = f'items/{pid}{img.suffix.lower()}' if img else None
        if img: shutil.copyfile(img, out/target)
        else: missing.append(name)
        products[name] = {'id':pid,'name':name,'category':r[7],'image':target}
    assert abs(r[9]*r[11]-r[12]) < .02
    records.append([r[0],r[1].strftime('%Y-%m-%d'),products[name]['id'],r[8],r[9],r[11],r[12]])
payload = {'products':list(products.values()),'records':records,'coverage':[min(r[1] for r in rows if r[0]).strftime('%Y-%m-%d'),max(r[1] for r in rows if r[0]).strftime('%Y-%m-%d')]}
(out/'data.js').write_text('window.PURCHASES='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';',encoding='utf8')
print(json.dumps({'delivered_rows':len(records),'products':len(products),'matched_images':len(products)-len(missing),'missing':missing},ensure_ascii=False))
