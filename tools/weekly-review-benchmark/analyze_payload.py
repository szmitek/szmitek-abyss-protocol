"""Offline W01 ZIP audit. Requires tiktoken==0.14.0 and its cached o200k_base vocabulary.
No model call. o200k_base is a proxy: tiktoken has no GPT-6 Astra mapping.
Usage: python analyze_payload.py path/to/original-artifact.zip
"""
import copy
import hashlib
import json
import sys
import zipfile
import tiktoken

archive = zipfile.ZipFile(sys.argv[1])
def read(suffix):
    names = [n for n in archive.namelist() if n.endswith(suffix)]
    if len(names) != 1:
        raise ValueError('Expected exactly one W01 artifact member')
    return json.loads(archive.read(names[0]))
def compact(x):
    return json.dumps(x, ensure_ascii=False, separators=(',', ':'))
enc = tiktoken.get_encoding('o200k_base')
def tokens(x):
    return len(enc.encode(x if isinstance(x, str) else compact(x), disallowed_special=()))
request = read('.request.json')
result = read('.result.json')
payload = json.loads(request['input'][1]['content'])
review = payload['review']
base = tokens(request['input'][0]['content']) + tokens(request['input'][1]['content']) + tokens(request['text']['format']['schema'])
sections = {'systemPrompt': tokens(request['input'][0]['content']), 'responseSchema': tokens(request['text']['format']['schema']), 'userMessage': tokens(request['input'][1]['content']), 'snapshot': tokens(review), 'evidenceRegistry': tokens(payload['evidence'])}
breakdown = {}
for scope_name, scope in [('week', review), ('history', review['historyContext'])]:
    breakdown[scope_name] = {k: tokens(v) for k,v in scope.items() if k != 'historyContext'}
paragraphs = request['input'][0]['content'].splitlines()
mutations = {}
p = copy.deepcopy(payload)
p['evidence'] = [{k:v for k,v in e.items() if k not in ['title','detail']} for e in p['evidence']]
mutations['compactEvidenceIndex'] = {'savedProxyTokens':tokens(payload)-tokens(p), 'userProxyTokens':tokens(p)}
# Estimates only. The following candidates are NOT implemented.
p = copy.deepcopy(payload)
for key, week_values in review.items():
    if isinstance(week_values, list) and isinstance(p['review']['historyContext'].get(key), list):
        ids = {v.get('id') for v in week_values if isinstance(v,dict)}
        p['review']['historyContext'][key] = [v for v in p['review']['historyContext'][key] if not isinstance(v,dict) or v.get('id') not in ids]
for key in ['body','tests']:
    ids = {v['id'] for v in review[key]['records']}
    p['review']['historyContext'][key]['records'] = [v for v in p['review']['historyContext'][key]['records'] if v['id'] not in ids]
mutations['removeRepeatedWeekRecordsFromHistory_ESTIMATE_ONLY'] = {'savedProxyTokens':tokens(payload)-tokens(p)}
p = copy.deepcopy(payload)
for scope in [p['review'],p['review']['historyContext']]:
    for fact in scope['facts']: fact.pop('period',None)
mutations['factorRepeatedFactPeriods_ESTIMATE_ONLY'] = {'savedProxyTokens':tokens(payload)-tokens(p)}
evidence_kinds = {}
for kind in sorted({e['kind'] for e in payload['evidence']}):
    evidence_kinds[kind] = tokens([e for e in payload['evidence'] if e['kind']==kind])
print(json.dumps({'artifactSha256':hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest(), 'tokenizer':'tiktoken 0.14.0 / o200k_base proxy, NOT verified Astra tokenizer', 'reportedInputTokens':result['usage']['input_tokens'], 'visibleProxyTotal':base, 'unattributedDifference':result['usage']['input_tokens']-base, 'sections':sections, 'systemParagraphTokens':list(map(tokens,paragraphs)), 'snapshotBreakdown':breakdown, 'evidenceByKind':evidence_kinds, 'candidateReductions':mutations, 'note':'Nested numbers overlap. Independently tokenized fragments are not perfectly additive. Difference includes tokenizer/serialization/provider overhead; do not label it known hidden tokens.'},indent=2))
