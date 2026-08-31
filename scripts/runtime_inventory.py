import re
from collections import Counter, defaultdict
from pathlib import Path

catalog_text = Path('/home/ubuntu/AngelMind/server/tool-catalog-data.ts').read_text()
runtime_text = Path('/home/ubuntu/AngelMind/server/tool-runtime.ts').read_text()
blocks = re.findall(r'\{\n\s+"toolKey": "([^"]+)",\n\s+"name": "([^"]+)",\n\s+"category": "([^"]+)",\n\s+"riskClass": "([^"]+)",\n\s+"approvalGate": "([^"]+)",\n\s+"verificationStatus": "([^"]+)",\n\s+"disposition": "([^"]+)",\n\s+"enabledByDefault": (true|false)\n\s+\}', catalog_text)
adapters = set(re.findall(r'toolKey: "([^"]+)"', runtime_text))
entries = [dict(zip(('key','name','category','risk','gate','verification','disposition','enabled'), b)) for b in blocks]
print('catalog_total', len(entries))
print('adapter_total', len(adapters))
print('enabled_total', sum(e['enabled'] == 'true' for e in entries))
print('verification_counts', dict(Counter(e['verification'] for e in entries)))
print('disposition_counts', dict(Counter(e['disposition'] for e in entries)))
print('category_counts')
for category, count in sorted(Counter(e['category'] for e in entries).items()):
    print(f'  {category}: {count}')
print('enabled_without_adapter', sorted(e['key'] for e in entries if e['enabled'] == 'true' and e['key'] not in adapters))
print('adapter_without_enabled_catalog', sorted(k for k in adapters if not any(e['key'] == k and e['enabled'] == 'true' for e in entries)))
print('safe_unverified_candidates_by_category')
for category, count in sorted(Counter(e['category'] for e in entries if e['verification'] != 'verified' and e['disposition'].startswith('candidate')).items()):
    print(f'  {category}: {count}')
print('high_risk_or_review')
for e in entries:
    if e['risk'] in {'high','critical'} or e['disposition'] == 'disabled_review_required':
        pass
print('sample_pending_safe')
for e in entries:
    if e['verification'] != 'verified' and e['disposition'] in {'candidate_offline_or_artifact','candidate_passive_review'}:
        print(f"  {e['key']} | {e['name']} | {e['category']} | {e['disposition']}")
        if sum(1 for x in entries if x['verification'] != 'verified' and x['disposition'] in {'candidate_offline_or_artifact','candidate_passive_review'}) >= 40:
            pending = sum(1 for x in entries if x['verification'] != 'verified' and x['disposition'] in {'candidate_offline_or_artifact','candidate_passive_review'})
            if pending > 40:
                break
