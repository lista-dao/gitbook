# Flags the claim shapes that have actually been wrong on this project, so they
# can be justified or removed rather than re-reviewed every round.
#
#   python3 utils/check-claims.py .
#
# These are not defects by themselves. Each one is a claim that cannot be checked
# by a script and has a track record of being written backwards. Keep it only if a
# reader cannot act without it; otherwise name the getter and let them read it.
import re, os, sys, glob, collections

os.chdir(sys.argv[1])
PATTERNS = [
 ('ABSOLUTE',   r'\b(there is no|there are no|the only|only way|never|always|cannot be|no other|nothing else)\b'),
 ('DIRECTION',  r'\b(under-?quote|over-?quote|under-?state|over-?state|under-?report|over-?report|more than|less than|at least|at most|before anything|after everything|rolling)\b'),
 ('ORDINAL',    r'\b(the first|the last|first statement|last statement|comes first|happens first)\b'),
 ('LIVE STATE', r'\b(currently|today|at present|right now|as of|is empty|is disabled|is enabled|is paused)\b'),
 ('DERIVED',    r'^\s*[`a-zA-Z_]+\s*=\s*.*[×*/+-].*$'),
]
hits = collections.defaultdict(list)
for f in sorted(glob.glob('for-developer/**/*.md', recursive=True)):
    infence = False
    for i, line in enumerate(open(f, encoding='utf-8'), 1):
        if line.lstrip().startswith('```'):
            infence = not infence; continue
        if infence: continue
        for name, pat in PATTERNS:
            if re.search(pat, line, re.I):
                hits[name].append((f, i, line.strip()[:120]))

total = sum(len(v) for v in hits.values())
print('unscriptable claims flagged: %d\n' % total)
for name, _ in PATTERNS:
    v = hits[name]
    print('%s: %d' % (name, len(v)))
    for f, i, t in v:
        print('   %s:%d  %s' % (f, i, t))
    print()
