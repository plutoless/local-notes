#!/usr/bin/env python3
"""Replay delivered organization/conflict journeys with issue 37 evidence isolation."""
from pathlib import Path
import sys

kind = sys.argv[1]
probes = {'organization': ('native-organization-design.py', '35'), 'conflict': ('native-sync-review.py', '36')}
filename, issue = probes[kind]
path = Path(__file__).with_name(filename)
source = path.read_text().replace('docs/validation/issue' + issue, 'docs/validation/issue37/' + kind)
source = source.replace('native-issue' + issue, 'native-issue37-' + kind)
source = source.replace('dev.localnotes.validation.issue' + issue, 'dev.localnotes.validation.issue37.' + kind)
Path('docs/validation/issue37', kind).mkdir(parents=True, exist_ok=True)
exec(compile(source, str(path), 'exec'), {'__name__': '__main__', '__file__': str(path)})
