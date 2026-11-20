export function hashSeed(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function rng(seed){let s=hashSeed(seed);return()=>{s|=0;s=s+0x6d2b79f5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function pick(random,list){return list[Math.floor(random()*list.length)]}
// Perf pack (dungeons D7): a hashed order. The generators sort candidates with comparators that hashed both sides at every
// comparison (`(a, b) => hashSeed(key(a)) - hashSeed(key(b))`): a sort of n cells built and hashed about 2n·log n strings.
// byHash(key) is that comparator with each element's hash worked out once, so every comparison, and the order, is the same.
export function byHash(keyOf){const memo=new Map(),k=(v)=>{let h=memo.get(v);if(h===undefined){h=hashSeed(keyOf(v));memo.set(v,h)}return h};return(a,b)=>k(a)-k(b)}
