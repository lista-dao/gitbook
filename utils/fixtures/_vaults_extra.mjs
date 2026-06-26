// One-off: merges the "1.1 Vaults" sub-page (BSC table) into the moolah-bsc fixture
// for offline --verify. Run once: node utils/fixtures/_vaults_extra.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'utils/fixtures/notion-contracts.json';
const fx = JSON.parse(readFileSync(F, 'utf8'));
const vaults = {
  '0x57134a64b7cd9f9eb72f8255a671f5bf2fe3e2d0': 'MoolahVault(WBNB)',
  '0xfa27f172e0b6ebcef9c51abf817e2cb142fbe627': 'MoolahVault(USD1)',
  '0xe46b8e65006e6450bdd8cb7d3274ab4f76f4c705': 'MoolahVault (BTCB)',
  '0x6d6783c146f2b0b2774c1725297f1845dc502525': 'MoolahVault (USDT)',
  '0xd5cfc0f894ba77e95e3325aa53eb3e6cbbb5a81e': 'MoolahVault (MEV WBNB)',
  '0x6402d64f035e18f9834591d3b994dfe41a0f162d': 'MoolahVault (MEV USDT)',
  '0x02a5ca3a749855d1002a78813e679584a96646d0': 'MoolahVault (Re7 USDT)',
  '0xab251dc87dc313649d024bd69b34c8e7690ce1fc': 'MoolahVault (Loop WBNB)',
  '0x2fa11fc42e7fdff98e1d043992db5e10123a41b0': 'MoolahVault (Puffer)',
  '0xeb4f6ffb1038e1cca701e7d53083b37ec5b6ba33': 'MoolahVault(Pangolins USDT)',
  '0x60eed309f259050b40b234d105329a4fd2f91163': 'MoolahVault(AB)',
  '0xe27433ee40cfc59b4881b3c37b8e908ea0550aa7': 'MoolahVault(B)',
  '0xee161d34f7a12ea3edea853aa849783d4b51b5b5': 'MoolahVault(B2)',
  '0xb798bb56898a86b6fd49fc1eca4150efdc3ee6ea': 'MoolahVault(Solv WBNB)',
  '0xd61dd125016728dd284cf5dba8a3b7c27c5058f2': 'MoolahVault(Solv USD1)',
  '0x8703d3abea5ccf31c6e13b9c05558b1f4666f183': 'MoolahVault(SPA)',
  '0x34a436478d34cee558db242e7a0f1676bd84ca45': 'MoolahVault(OIK)',
  '0x52844a906c9a5103ee99c293a2ee181ce16a6743': 'MoolahVault(EGL1)',
  '0xf21308b903f96592b6d6988c646dc2a3028f39fd': 'MoolahVault(Aster)',
  '0x384729e442b7636709896e9a3bef63ef70c22fb0': 'MoolahVault(CDL)',
  '0x68e83ca4c2869fc6e92774e549ff9d547eae24ab': 'MoolahVault(Take)',
  '0x2cb60a0e6c2a5ff4249eb890e267b660c6676cc6': 'MoolahVault(APRO)',
  '0x9a17fd5cb8efc25d11567e713ae795a89775a759': 'MoolahVault(U)',
};
let added = 0;
for (const [a, n] of Object.entries(vaults)) if (!fx['moolah-bsc'][a]) { fx['moolah-bsc'][a] = n; added++; }
writeFileSync(F, JSON.stringify(fx, null, 0));
console.log(`merged ${added} vault(s); moolah-bsc now ${Object.keys(fx['moolah-bsc']).length} entries`);
