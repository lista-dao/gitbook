# Audits the deployed-address tables: every address must be a contract on the
# chain its page/link implies, and its label must not contradict what the
# contract answers. Also flags one name used for two addresses, and one address
# labelled two ways.
#
#   python3 utils/check-addrs.py .
#
# Explorer host in the link decides the chain; otherwise the page name does.
import re,os,sys,json,subprocess,collections

root=sys.argv[1]; os.chdir(root)
RPC={'bsc':'https://bsc-dataseed.binance.org','eth':'https://ethereum-rpc.publicnode.com'}

from concurrent.futures import ThreadPoolExecutor

def rpc(chain,method,params):
    r=subprocess.run(['curl','-s','-X','POST','-H','Content-Type: application/json','--max-time','20',
        '-d',json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}),RPC[chain]],
        capture_output=True,text=True)
    try: return json.loads(r.stdout)
    except Exception: return {}

def code(chain,a): return rpc(chain,'eth_getCode',[a,'latest']).get('result','0x')
def call(chain,a,sel):
    return rpc(chain,'eth_call',[{'to':a,'data':sel},'latest']).get('result')

def dec_str(hexdata):
    if not hexdata or len(hexdata)<130: return None
    try:
        b=bytes.fromhex(hexdata[2:]); n=int.from_bytes(b[32:64],'big')
        return b[64:64+n].decode('utf-8','replace').strip('\x00') or None
    except Exception: return None

SEL={'symbol()':'0x95d89b41','name()':'0x06fdde03','decimals()':'0x313ce567',
     'MAX_BORROW_RATE()':'0x6e553f65'}
# discriminators: label substring -> (selector, must_answer)
PROBES=[('interestratemodel','0x'+ 'a1b2',None)]

rows=[]
ADDR=re.compile(r'(?<![0-9a-fA-F])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])')   # exactly 40: a 64-char market id must not match

for dp,dn,fn in os.walk('for-developer'):
    for f in fn:
        if not f.endswith('.md'): continue
        p=os.path.join(dp,f)
        txt=open(p,encoding='utf-8').read()
        for i,line in enumerate(txt.split('\n'),1):
            # a one-line HTML table holds every row; split so each row is its own unit
            for unit in (re.split(r'</tr>',line) if '<tr' in line else [line]):
                for m in ADDR.finditer(unit):
                    a=m.group(0)
                    host=re.search(r'(bscscan|etherscan)\.[a-z]+/address/'+a,unit,re.I)
                    if host: chain='eth' if 'ether' in host.group(1).lower() else 'bsc'
                    elif 'ethereum' in p.lower(): chain='eth'
                    else: chain=None          # unknown: probe both, only flag if absent on both
                    lab=None
                    md=re.match(r'\s*\|([^|]+)\|',unit)
                    if md: lab=md.group(1).strip().strip('`*')
                    h=re.findall(r'<td>([^<]*)</td>',unit)
                    if h and not lab: lab=h[0].strip()
                    if lab: lab=re.sub(r'\s+',' ',lab).strip() or None
                    rows.append((p,i,a,lab,chain))

seen={}; uniq=[]
for r in rows:
    k=(r[2].lower(),r[4])
    if k not in seen: seen[k]=r; uniq.append(r)

print('addresses found: %d  (unique addr/chain pairs: %d)'%(len(rows),len(uniq)))

def probe(r):
    p,i,a,lab,chain=r
    chains=[chain] if chain else ['bsc','eth']
    for ch in chains:
        c=code(ch,a)
        if c not in (None,'0x',''):
            return (p,i,a,lab,ch), c, dec_str(call(ch,a,SEL['symbol()']))
    return (p,i,a,lab,chains[0]), '0x', None

with ThreadPoolExecutor(max_workers=12) as ex:
    results=list(ex.map(probe,uniq))

notcontract=[]; mismatch=[]
for (p,i,a,lab,chain),c,sym in results:
    if c in (None,'0x',''):
        notcontract.append((p,i,a,lab,chain)); continue
    if not lab: continue
    if sym:
        l=re.sub(r'[^a-z0-9]','',lab.lower()); s=re.sub(r'[^a-z0-9]','',sym.lower())
        # only flag when the label looks like a token name and disagrees
        if s and s not in l and l not in s and len(l)<28:
            mismatch.append((p,i,a,lab,sym,chain))

print('\nNOT A CONTRACT on the stated chain: %d'%len(notcontract))
for p,i,a,lab,ch in notcontract: print('   %s:%d  %s  [%s]  label=%r'%(p,i,a,ch,lab))

print('\nlabel vs on-chain symbol() disagreement: %d  (review — many are legitimately not tokens)'%len(mismatch))
for p,i,a,lab,sym,ch in mismatch: print('   %s:%d  %s  label=%r  symbol()=%r'%(p,i,a,lab,sym))

byname=collections.defaultdict(set); byaddr=collections.defaultdict(set)
for p,i,a,lab,chain in rows:
    if not lab or len(lab)>60: continue
    byname[lab.lower()].add(a.lower()); byaddr[a.lower()].add(lab)
dupn={k:v for k,v in byname.items() if len(v)>1}
dupa={k:v for k,v in byaddr.items() if len(v)>1}
print('\nONE NAME -> SEVERAL ADDRESSES: %d'%len(dupn))
for k,v in sorted(dupn.items()): print('   %-42s %s'%(k,', '.join(sorted(v))))
print('\none address -> several labels: %d'%len(dupa))
for k,v in sorted(dupa.items()): print('   %-44s %s'%(k,' | '.join(sorted(v))))
