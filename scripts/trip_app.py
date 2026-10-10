"""Build the traveller UI from the authoritative itinerary and place data."""
import hashlib
import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path


class Element:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self):
        return ''.join(c.text() if isinstance(c, Element) else c for c in self.children).strip()

    def find(self, tag=None, cls=None):
        result = []
        for child in self.children:
            if isinstance(child, Element):
                if (tag is None or child.tag == tag) and (cls is None or cls in child.attrs.get('class', '').split()):
                    result.append(child)
                result.extend(child.find(tag, cls))
        return result

    def html(self):
        attrs = ''.join(f' {k}="{escape(v or "", quote=True)}"' for k, v in self.attrs.items())
        content = ''.join(c.html() if isinstance(c, Element) else escape(c) for c in self.children)
        return f'<{self.tag}{attrs}>{content}</{self.tag}>'


class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.root = Element()
        self.stack = [self.root]
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        el = Element(tag, attrs)
        self.stack[-1].children.append(el)
        if tag not in {'br', 'hr', 'img', 'input', 'meta', 'link'}:
            self.stack.append(el)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, text):
        self.stack[-1].children.append(text)


# Presentation metadata only. Times, statuses and instructions come from itinerary.md.
CONTEXT = {
    '1223': ('rome', 5, '로마 도착', '오늘은 이동과 회복에 집중해요.'),
    '1224': ('naples', 6, '나폴리', '열차를 타고 나폴리로. 오후에는 박물관을 둘러봐요.'),
    '1225': ('amalfi', 6, '아말피 해안', '해안 풍경을 만나는 날. 날씨에 따라 쉬어가도 좋아요.'),
    '1226': ('pompeii', 6, '폼페이', '옛 도시를 걸어보고, 오후에는 숙소에서 쉬어요.'),
    '1227': ('naples', 6, '나폴리', '지하도시에서 구시가지까지, 걸어서 만나는 나폴리.'),
    '1228': ('rome', 7, '로마', '로마로 돌아와 판테온과 광장을 천천히 둘러봐요.'),
    '1229': ('rome', 7, '로마', '바티칸을 둘러보고 쉬었다가, 저녁에는 각자의 시간을 보내요.'),
    '1230': ('civita', 7, '치비타 · 오르비에토', '차를 타고 두 소도시를 만나는 날.'),
    '1231': ('rome', 7, '로마', '분수와 광장을 걷고, 쉬었다가 새해를 맞이해요.'),
    '0101': ('rome', 7, '로마', '늦게 시작해도 괜찮아요. 행사나 산책 중에서 골라봐요.'),
    '0102': ('rome', 7, '로마 · 귀국', '마지막 관람 뒤에는 짐 수령과 공항 이동을 우선해요.'),
}


def build_data(root):
    places = json.loads((root / 'docs/assets/map/places.geojson').read_text())['features']
    days = []
    tree = Tree((root / 'docs/itinerary.md').read_text())
    for card in tree.root.find('div', 'day-card'):
        key = card.attrs['id'].removeprefix('day-')
        region, lodging, city, subtitle = CONTEXT[key]
        month, day = int(key[:2]), int(key[2:])
        date = f'{2026 if month == 12 else 2027}-{month:02}-{day:02}'
        marker = re.compile(rf'(?<!\d){month}/{day}(?!\d)')
        selected = [p['properties']['sort'] for p in places if p['properties']['group'] != 'lodging' and any(marker.search(d) for d in p['properties']['dates'])]
        title = card.find('h3')[0].text().split(' · ', 1)[-1]
        items = []
        for ul in [c for c in card.children if isinstance(c, Element) and c.tag == 'ul']:
            items.extend(c.text() for c in ul.children if isinstance(c, Element) and c.tag == 'li')
        # In the source, the car booking summary precedes the morning transfer.
        # Present those existing instructions in their execution order.
        if key == '1225':
            items = items[1:3] + items[:1] + items[3:]
        details = card.find('details')
        direct_notes = [c.text() for c in card.children if isinstance(c, Element) and c.tag == 'p' and not c.attrs.get('class')]
        days.append(dict(id=key, date=date, title=title, subtitle=subtitle, city=city, region=region, lodging=lodging,
                         meta=card.find('p', 'day-card__meta')[0].text(), places=selected, items=items,
                         statuses=[dict(kind=s.attrs['class'].split()[-1], text=s.text()) for s in card.find('span', 'status')],
                         details=''.join(d.html() for d in details), notes=direct_notes,
                         route=' '.join(p.text() for p in card.find('p', 'route'))))
    return dict(days=days, places=places)


def on_post_build(config, **kwargs):
    root = Path(config.config_file_path).parent
    output = Path(config.site_dir)
    (output / 'assets/trip-data.json').write_text(json.dumps(build_data(root), ensure_ascii=False, indent=2))
    extensions = {'.html', '.css', '.js', '.json', '.svg', '.png', '.ico', '.woff', '.woff2', '.webmanifest'}
    files = sorted(p for p in output.rglob('*') if p.is_file() and p.suffix in extensions and p.name != 'sw.js')
    version = hashlib.sha256(b''.join(p.relative_to(output).as_posix().encode() + p.read_bytes() for p in files)).hexdigest()[:16]
    urls = ['./'] + ['./' + p.relative_to(output).as_posix() for p in files]
    template = (root / 'scripts/sw-template.js').read_text()
    (output / 'sw.js').write_text(template.replace('__VERSION__', version).replace('__PRECACHE__', json.dumps(urls)))
