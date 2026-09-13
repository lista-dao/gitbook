# Cross-checks every Solidity function signature quoted in the docs against the
# contract sources: the name must exist, and the parameter count must match.
# Catches the arity class (a documented 2-arg call whose selector does not exist).
#
#   python3 utils/check-sigs.py . \
#     ~/src/moolah/src ~/src/lista-v3 ~/src/lista-v2 \
#     ~/src/lista-dao-contracts ~/src/lista-new-contracts \
#     ~/src/lista-token ~/src/synclub-contracts
#
# Pass every contract repo the docs reference; an unlisted repo shows up as a
# false "not found".
import re,os,sys,glob

docs=sys.argv[1]; srcs=sys.argv[2:]

def split_args(a):
    d=0; cur=''; out=[]
    for c in a:
        if c in '([': d+=1
        elif c in ')]': d-=1
        if c==',' and d==0: out.append(cur); cur=''
        else: cur+=c
    if cur.strip(): out.append(cur)
    return [x.strip() for x in out if x.strip()]

# name -> set of arities found in source
src={}
for s in srcs:
    for f in glob.glob(os.path.join(s,'**','*.sol'),recursive=True):
        if '/test/' in f or '/mock' in f.lower() or '/lib/forge-std/' in f: continue
        try: t=open(f,encoding='utf-8',errors='ignore').read()
        except OSError: continue
        t=re.sub(r'//[^\n]*','',t)
        # public state vars generate getters: mappings take one arg per key,
        # arrays take an index.
        for m in re.finditer(r'^\s*(mapping\s*\(.*?\)|[\w\[\]\.]+)\s+public\s+(?:constant\s+|immutable\s+|override\s+)*(\w+)\s*[;=]',t,re.M):
            ty,n=m.group(1),m.group(2)
            src.setdefault(n,set()).add(ty.count('=>') if ty.startswith('mapping') else (1 if ty.endswith('[]') else 0))
        for m in re.finditer(r'\bfunction\s+(\w+)\s*\(',t):
            n=m.group(1); i=m.end()-1; d=0
            for j in range(i,min(i+4000,len(t))):
                if t[j]=='(': d+=1
                elif t[j]==')':
                    d-=1
                    if d==0: src.setdefault(n,set()).add(len(split_args(t[i+1:j]))); break

md=[]
for dp,dn,fn in os.walk(docs):
    if '.git' in dp: continue
    md+=[os.path.join(dp,f) for f in fn if f.endswith('.md')]

miss=[]; arity=[]
for f in md:
    txt=open(f,encoding='utf-8').read()
    for blk in re.finditer(r'```solidity\n(.*?)```',txt,re.S):
        body=blk.group(1)
        line0=txt[:blk.start()].count('\n')+2
        for m in re.finditer(r'\bfunction\s+(\w+)\s*\(',body):
            n=m.group(1); i=m.end()-1; d=0
            for j in range(i,len(body)):
                if body[j]=='(': d+=1
                elif body[j]==')':
                    d-=1
                    if d==0:
                        a=len(split_args(body[i+1:j])); break
            else: continue
            ln=line0+body[:m.start()].count('\n')
            if n not in src: miss.append((f,ln,n))
            elif a not in src[n]: arity.append((f,ln,n,a,sorted(src[n])))

print('signatures not found in source:',len(miss))
for x in miss: print('   %s:%d  %s(' % x)
print('ARITY MISMATCH (documented call may not exist):',len(arity))
for f,ln,n,a,s in arity: print('   %s:%d  %s  doc=%d args, source=%s' % (f,ln,n,a,s))
