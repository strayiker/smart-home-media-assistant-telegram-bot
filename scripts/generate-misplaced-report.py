#!/usr/bin/env python3
import os,subprocess,re
from collections import defaultdict

def main():
    os.makedirs('audit', exist_ok=True)
    # tracked src files
    tracked = subprocess.check_output(['git','ls-files']).decode().splitlines()
    tracked = [l for l in tracked if l.startswith('src/')]
    # untracked src files
    untracked = subprocess.check_output(['git','ls-files','--others','--exclude-standard']).decode().splitlines()
    untracked = [l for l in untracked if l.startswith('src/')]
    # case collisions
    coll = defaultdict(list)
    for p in tracked:
        coll[p.lower()].append(p)
    collisions = {k:v for k,v in coll.items() if len(v)>1}
    # root-level files under src
    root_files = [p for p in tracked if p.count('/')==1]
    # class export/name mismatches
    class_pattern = re.compile(r"\bexport\s+(?:default\s+)?class\s+([A-Za-z0-9_]+)")
    class_mismatches = []
    pascal_without_class = []
    for p in tracked:
        if p.endswith('.ts') and not p.endswith('.d.ts'):
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    txt = f.read()
            except Exception:
                continue
            m = class_pattern.search(txt)
            base = os.path.splitext(os.path.basename(p))[0]
            if m:
                cls = m.group(1)
                if cls != base:
                    class_mismatches.append((p,cls,base))
            else:
                if base and base[0].isupper():
                    pascal_without_class.append(p)
    # compose report
    lines = []
    lines.append('Project file placement audit')
    lines.append('Tracked src files: %d' % len(tracked))
    lines.append('Untracked src files: %d' % len(untracked))
    lines.append('')
    lines.append('-- Root-level files under src (files directly in src/):')
    for p in sorted(root_files): lines.append(p)
    lines.append('')
    lines.append('-- Case collisions (paths differing only by case):')
    if collisions:
        for k in sorted(collisions.keys()):
            lines.append(k + ':')
            for v in collisions[k]: lines.append('  ' + v)
    else:
        lines.append('None')
    lines.append('')
    lines.append('-- Files where exported class name != filename:')
    if class_mismatches:
        for path,cls,base in class_mismatches:
            lines.append(f'{path} -> class {cls} != file {base}')
    else:
        lines.append('None')
    lines.append('')
    lines.append('-- Files with PascalCase filename but no exported class (candidate to rename to camelCase):')
    for p in pascal_without_class: lines.append(p)
    lines.append('')
    lines.append('-- Untracked src files:')
    for p in sorted(untracked): lines.append(p)
    with open('audit/misplaced-files.txt','w',encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('WROTE audit/misplaced-files.txt')

if __name__=='__main__':
    main()
