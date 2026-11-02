"""Export visible user/assistant text from one explicitly selected local session.

Excludes developer/system instructions, reasoning records, tool calls, tool output,
internal metadata and browser context blocks. Does not modify the source session.
The result is a filtered conversation transcript, not a complete raw session log.
"""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--out', type=Path, default=Path('docs/private/codex-conversation.md'))
args = parser.parse_args()
lines = ['# Codex conversation — filtered visible text', '',
         'Exported from a local session. Reasoning, system/developer messages, tools, '
         'internal metadata and ambient browser context are excluded. '
         'Keep the original session for provenance; this file is not a raw log.', '']
count = 0
for raw in args.source.open(encoding='utf-8'):
    try:
        record = json.loads(raw)
    except json.JSONDecodeError:
        continue
    item = record.get('payload', {})
    if record.get('type') != 'response_item' or item.get('type') != 'message':
        continue
    role = item.get('role')
    if role not in ('user', 'assistant'):
        continue
    text = '\n'.join(c.get('text', '') for c in item.get('content', [])
                     if c.get('type') in ('input_text', 'output_text'))
    text = re.sub(r'<in-app-browser-context\b[^>]*>[\s\S]*?</in-app-browser-context>', '', text)
    if role == 'user' and text.lstrip().startswith(('<environment_context>', '<external_codex_apps_open_page>')):
        continue
    text = text.strip()
    if not text:
        continue
    count += 1
    lines.extend([f'## {count}. {role}', '', text, ''])
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text('\n'.join(lines), encoding='utf-8')
print(f'Exported {count} visible messages to {args.out.resolve()}')
