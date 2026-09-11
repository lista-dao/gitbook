import re,os,sys
root=sys.argv[1]; os.chdir(root)
def anch(p):
    o=set()
    for l in open(p,encoding='utf-8'):
        if l.startswith('#'):
            o.add(re.sub(r'[^\w\s-]','',l.lstrip('#').strip().lower()).replace(' ','-'))
    return o
md=[]
for dp,dn,fn in os.walk('.'):
    if '.git' in dp: continue
    md += [os.path.join(dp,f) for f in fn if f.endswith('.md')]

bad=[]
for f in md:
    d=os.path.dirname(f); s=open(f,encoding='utf-8').read()
    for m in re.finditer(r'\]\((?!https?:|mailto:)([^)#]*)(#[^)]*)?\)',s):
        t,a=m.group(1),m.group(2)
        if t and ('<' in t or ' ' in t): continue
        tgt=os.path.normpath(os.path.join(d,t)) if t else f
        if t and not os.path.exists(tgt): bad.append((f,'MISSING',t)); continue
        if a and tgt.endswith('.md') and os.path.exists(tgt) and a[1:] not in anch(tgt):
            bad.append((f,'ANCHOR',t+a))
print('link/anchor issues:',len(bad))
for b in bad[:15]: print('  ',*b)

sep=re.compile(r'^\s*\|[\s:|-]+\|\s*$')
def cols(l): return len(re.sub(r'\\\|','',l).strip().strip('|').split('|'))
tb=[]; orphan=[]
for f in md:
    L=open(f,encoding='utf-8').read().split('\n'); i=0; intable=False; ncol=0; fence=False
    while i<len(L):
        line=L[i]
        if line.lstrip().startswith('```'):
            fence = not fence; intable=False; i+=1; continue
        if fence:
            i+=1; continue
        if line.strip().startswith('|') and i+1<len(L) and sep.match(L[i+1]):
            ncol=cols(line); intable=True; i+=2; continue
        if intable:
            if line.strip().startswith('|'):
                if cols(line)!=ncol: tb.append((f,i+1,cols(line),ncol))
                i+=1; continue
            intable=False
        # ORPHAN ROW: a pipe row with no header above it
        if line.strip().startswith('|') and not sep.match(line):
            prev=L[i-1].strip() if i>0 else ''
            if not prev.startswith('|'):
                orphan.append((f,i+1,line.strip()[:50]))
        i+=1
print('table column mismatches:',len(tb))
for b in tb[:10]: print('  ',*b)
print('ORPHANED table rows (header lost — renders as literal text):',len(orphan))
for b in orphan[:15]: print('  ',*b)

# --- external links (opt-in: --external) -----------------------------------
if '--external' in sys.argv:
    import urllib.request, urllib.error
    ext={}
    for f in md:
        for m in re.finditer(r'\]\((https?://[^)\s]+)\)', open(f,encoding='utf-8').read()):
            ext.setdefault(m.group(1).rstrip('.,'), set()).add(f)
    print(f'external links: {len(ext)} unique')
    dead=[]
    for u,srcs in sorted(ext.items()):
        try:
            rq=urllib.request.Request(u, method='HEAD', headers={'User-Agent':'Mozilla/5.0'})
            urllib.request.urlopen(rq, timeout=12)
        except urllib.error.HTTPError as e:
            if e.code in (403,405,429):
                continue          # bot-walls / HEAD not allowed — inconclusive, not dead
            dead.append((u, e.code, sorted(srcs)))
        except Exception as e:
            dead.append((u, type(e).__name__, sorted(srcs)))
    print('dead external links:', len(dead))
    for u,why,srcs in dead: print('  ', why, u, '<-', ', '.join(srcs))
