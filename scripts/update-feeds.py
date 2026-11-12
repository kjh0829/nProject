"""Collect RSS titles/links only; retain each source's last successful snapshot."""
import json
import os
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

OUTPUT = Path(__file__).resolve().parents[1] / 'docs' / 'feeds.json'
SOURCES = [
    ('fire', 'Google 뉴스 · FIRE/경제적 자유', 'https://news.google.com/rss/search?q=FIRE%20%EA%B2%BD%EC%A0%9C%EC%A0%81%EC%9E%90%EC%9C%A0%20when%3A30d&hl=ko&gl=KR&ceid=KR:ko', 3),
    ('discovery', 'NASA · Image of the Day (영문)', 'https://www.nasa.gov/feeds/iotd-feed/', 1),
]

def parse_feed(raw, count):
    root = ET.fromstring(raw)
    result = []
    for item in root.findall('./channel/item'):
        title = ' '.join((item.findtext('title') or '').split())
        link = (item.findtext('link') or '').strip()
        if not title or urlparse(link).scheme not in ('https', 'http'):
            continue
        source = item.findtext('source') or ''
        result.append({'title': title[:300], 'url': link, 'publisher': source[:100],
                       'published': (item.findtext('pubDate') or '')[:100]})
        if len(result) == count:
            break
    if not result:
        raise ValueError('RSS has no valid entries')
    return result


def main():
    try:
        previous = json.loads(OUTPUT.read_text())
    except (OSError, ValueError):
        previous = {}
    now = datetime.now(timezone.utc).isoformat()
    data = {'attemptedAt': now, 'sources': {}}
    successes = 0
    for key, name, url, count in SOURCES:
        old = previous.get('sources', {}).get(key, {})
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'TeumRSSReader/1.0 (+https://kjh0829.github.io/nProject/)'})
            with urllib.request.urlopen(request, timeout=25) as response:
                raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise ValueError('Feed exceeds size limit')
            items = parse_feed(raw, count)
            data['sources'][key] = {'name': name, 'feedUrl': url, 'updatedAt': now, 'stale': False, 'items': items}
            successes += 1
            print(f'{key}: collected {len(items)} entries')
        except Exception as error:
            data['sources'][key] = {**old, 'name': name, 'feedUrl': url, 'stale': True, 'items': old.get('items', [])}
            print(f'{key}: fetch failed ({type(error).__name__}); retained previous entries')
    if not successes and not any(s['items'] for s in data['sources'].values()):
        raise SystemExit('All sources failed; no content to publish')
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
