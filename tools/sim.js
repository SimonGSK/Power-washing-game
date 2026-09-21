// Economy + difficulty simulator built from the game's formulas.
// A "decent human" player: sweeps at 60% of a perfect robot's efficiency, buys upgrades by priority,
// keeps enough cash for the next bill, moves region when unlocked and when their last job there went well.
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const K = {
  toughPerJob: +(args.tough ?? 0.02), toughCap: +(args.cap ?? 3.0), region: { grove: 1, city: +(args.city ?? 1.1), harbor: +(args.harbor ?? 1.2) },
  basePay: +(args.base ?? 140), payPerJob: +(args.ppj ?? 6), payExp: +(args.exp ?? 1.15), payFloor: +(args.floor ?? 0.30),
  eff: +(args.eff ?? 0.6), robot: 0.77, seed: +(args.seed ?? 1), jobs: +(args.jobs ?? 45), verbose: !!args.v,
  wages: args.wages !== '0', son: !!args.son, radius: +(args.radius ?? 6), geo: args.geo ? +args.geo : 0, billMode: args.bills || 'region', p: args.p ? +args.p : 0.65, start: +(args.start ?? 0.85), progCap: +(args.pcap ?? 1.9), billGrow: +(args.bgrow ?? 0.04), billLife: +(args.blife ?? 0), billMul: +(args.bmul ?? 1), share: +(args.share ?? 0), reserveFrac: +(args.reserve ?? 1), priceMul: +(args.price ?? 1), perks: !!args.perks,
};
let seed = K.seed; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const REGIONS = { grove: { pay: 1.0, unlock: 0, jobs: ['driveway','patio','deck','fence'], grimes: ['dust','mud','moss','grease','grease'] },
  city: { pay: 1.55, unlock: 12, jobs: ['windows','storefront','garage'], grimes: ['dust','soot','grease','soot','grease'] },
  harbor: { pay: 2.30, unlock: 30, jobs: ['hull','dock','shack'], grimes: ['moss','salt','salt','grease','salt'] } };
const GRIME = { dust: [3,1.00], mud: [4,1.14], moss: [4,1.24], grease: [4,1.36], soot: [4,1.42], salt: [5,1.58] };
const AREA = { driveway: 98*87, patio: 94*82, deck: 100*76, fence: 182*50, windows: 120*82*0.84, storefront: 120*62, garage: 118*72, hull: 128*46*0.72, dock: 90*78, shack: 120*66 };
const GEAR = { pressure: [110,290,640], nozzle: [90,240,520], tank: [80,210,480], refill: [90,230,470], pay: [100,260,560], patience: [80,210,460], cone: [130,320,700], flow: [100,260,560],
  powercore: [150], tankcore: [150], bizcore: [150], surge: [1500], bigrig: [1500], empire: [1700],
  prowasher: [900], degreaser: [220,460], foamcannon: [260,540], tipjar: [190], permit: [340], lease: [300,700,1500] };
// what a sensible player buys, in order
const PRIORITY = ['nozzle','powercore','pressure','nozzle','pressure','tank','patience','nozzle','pressure','degreaser','tank','refill','flow','prowasher','pay','patience','tank','refill','cone','patience','pay','pay','flow','degreaser','tankcore','bizcore','refill','cone','permit','lease','foamcannon','tipjar','flow','cone','surge','bigrig','empire','lease','lease'];

const s = { cash: 120, jobs: 0, sinceBill: 0, billN: 1, streak: 0, region: 'grove', gear: {}, lifetime: 0, repos: 0, loan: 0, lastPct: 100 };
const lvl = k => s.gear[k] || 0;
const sprayPower = () => (0.5 + lvl('pressure')*0.3 + (lvl('prowasher')?0.42:0) + (lvl('powercore')?0.12:0) + (lvl('surge')?0.4:0)) * (1 - lvl('cone')*0.04 - lvl('flow')*0.03);
const sprayRadius = () => K.radius + lvl('nozzle')*1.25 + (lvl('prowasher')?2:0) + (lvl('surge')?1.5:0);
const tankMax = () => 260 + [0,110,240,400][Math.min(3,lvl('tank'))] + (lvl('tankcore')?70:0) + (lvl('bigrig')?200:0);
const refillMs = () => { const t = Math.max(550, 1700 - lvl('refill')*400); return lvl('bigrig') ? t*0.7 : t; };
const jobMs = () => 40000 + lvl('patience')*10000 + (lvl('empire')?12000:0);
const degreaser = () => [1,1.18,1.32][Math.min(2,lvl('degreaser'))];
const payMult = () => 1 + lvl('pay')*0.12 + (lvl('bizcore')?0.06:0) + (lvl('empire')?0.2:0);
const billEvery = () => 3 + (lvl('permit')?1:0);
const leaseMult = () => [1,0.9,0.8,0.7][Math.min(3,lvl('lease'))];
const gearMult = () => (sprayPower()/0.5) * Math.pow(sprayRadius()/K.radius, 2) * degreaser() * (jobMs()/40000);
const tough = () => {
  if(K.p){ return Math.min(K.progCap, K.start + s.jobs*K.toughPerJob) * K.region[s.region] * Math.pow(gearMult(), K.p) * (1 + lvl('pay')*0.04); }
  return (K.geo ? Math.pow(K.geo, s.jobs) : (1 + Math.min(K.toughCap, s.jobs*K.toughPerJob))) * K.region[s.region];
};
const streakMult = () => 1 + Math.min(10, s.streak)*0.03;
const cleanPay = c => c < K.payFloor ? 0 : Math.pow((c-K.payFloor)/(1-K.payFloor), K.payExp);
const costOf = (k, l) => Math.round(GEAR[k][l] * K.priceMul);
const recentPays = [];
function overhead(n){
  if(K.share){ const base = { grove: 95, city: 190, harbor: 340 }[s.region]; const last = recentPays.slice(-6); const avg = last.length ? last.reduce((a,b)=>a+b,0)/last.length : 0; return Math.round(Math.max(base, K.share * avg * billEvery()) * leaseMult()); }
  if(K.billMode === 'region'){ const base = { grove: 95, city: 190, harbor: 340 }[s.region]; return Math.round((base * K.billMul * (K.billGrow >= 1 ? Math.pow(K.billGrow, Math.min(n,25)-1) : (1 + K.billGrow*(Math.min(n,25)-1))) + s.lifetime * K.billLife) * leaseMult()); }
  const capped = Math.min(n,14); let amt = 95*Math.pow(1.15,capped-1); if(n>14) amt += (n-14)*45; return Math.round(amt*leaseMult()); }

// cleaning model: hp removed per second by a perfect robot with the base rig on job 1 = 127 (from playtest)
function cleanFraction(jobKey, grime, eff){
  const [layers] = GRIME[grime];
  const cells = AREA[jobKey]/4, avgHp = 0.7 + 0.5*(layers-0.3), H = cells*avgHp;
  const areaMult = Math.pow(sprayRadius()/5.5, 2);
  const ratePerSec = 127 * (sprayPower()/0.5) * areaMult * degreaser() / tough();
  const T = jobMs()/1000;
  const waterTick = 1.2 * Math.pow(sprayRadius()/K.radius, 1.2) * Math.pow(sprayPower()/0.5, 0.3) * (1 - lvl('flow')*0.15) * (lvl('prowasher') ? 1.2 : 1);
  const refillEff = refillMs() * (1 + lvl('tank')*0.10);
  const ticksPerSec = 1000/70, refills = Math.floor(T*ticksPerSec*waterTick / tankMax());
  const usable = T - refills*refillEff/1000;
  // foam cannon + son add a little on top
  let extra = 0;
  if(lvl('foamcannon')) extra += usable/ (Math.max(0.7, 1.9-lvl('foamcannon')*0.55)) * Math.PI*Math.pow(10+lvl('foamcannon')*2.5,2)/4 * 0.5*0.75 / tough();
  if(K.son) extra += usable/0.7 * Math.PI*3.5*3.5/4 * 0.32*0.75 / tough();
  const C = ratePerSec*usable*eff*1.1 + extra;   // 1.1: calibrated so a 0.77-efficiency robot lands on the measured 89% (job 1, base rig)
  const raw = C/H;
  // diminishing returns past ~85%: the last cells are the ones you keep missing
  const hpFrac = Math.min(1, raw <= 0.85 ? raw : 0.85 + (raw-0.85)*0.5);
  // the clean bar is 70% "cells fully clear" + 30% "layers stripped"; cells clear later than layers do
  return 0.7*Math.pow(hpFrac, 1.5) + 0.3*hpFrac;
}

const log = []; let minCash = 1e9, gearAt12 = 0, gearAt30 = 0, billsPaid = 0, tight = 0;
let unlockedCity = false, unlockedHarbor = false;
for(let n=0; n<K.jobs; n++){
  const r = REGIONS[s.region];
  const jobKey = r.jobs[s.jobs % r.jobs.length];
  const tier = (() => { const g = Object.values(s.gear).reduce((a,b)=>a+b,0); return g===0?0:g<=5?1:g<=12?2:g<=19?3:4; })();
  const grime = r.grimes[Math.min(r.grimes.length-1, tier + (s.jobs%3===2?1:0))];
  const f = cleanFraction(jobKey, grime, K.eff);
  const pct = Math.round(f*100);
  const complete = f >= 0.985;
  let pay = (K.basePay + s.jobs*K.payPerJob) * cleanPay(f) * payMult() * GRIME[grime][1] * r.pay * streakMult();
  if(complete) pay *= 1.35; // finished with time to spare (approximation of the early-finish bonus)
  pay = Math.round(pay);
  const tip = lvl('tipjar') && rnd()<0.35 ? 18 : 0;
  s.cash += pay + tip; s.lifetime += pay + tip; s.jobs++; s.sinceBill++; recentPays.push(pay);
  s.streak = (complete || pct >= 80) ? Math.min(10, s.streak+1) : 0;
  s.lastPct = pct;
  let note = '';
  // bill
  if(s.sinceBill >= billEvery()){
    const amt = overhead(s.billN) + (K.wages ? 0 : 0);
    s.billN++; s.sinceBill = 0;
    if(s.cash >= amt){ s.cash -= amt; billsPaid += amt; if(s.cash < amt*0.5) tight++; note += ` bill -$${amt}`; }
    else { s.repos++; s.gear = {}; s.billN = Math.max(1, Math.round(s.billN*0.6)); s.streak = 0; recentPays.length = 0; if(K.perks){ s.gear.pressure = 1; s.gear.powercore = 1; s.gear.tankcore = 1; s.cash = Math.max(s.cash, 400); } note += ` REPOSSESSED (bill $${amt})`; }
  }
  // shopping: buy by priority while keeping a reserve for the next bill
  const reserve = overhead(s.billN) * K.reserveFrac;
  let bought = [];
  for(const k of PRIORITY){
    const l = lvl(k); if(l >= GEAR[k].length) continue;
    // gates
    if(['pressure','nozzle'].includes(k) && !lvl('powercore')) continue;
    if(['tank','refill'].includes(k) && !lvl('tankcore')) continue;
    if(['pay','patience'].includes(k) && !lvl('bizcore')) continue;
    if(k==='surge' && !(lvl('pressure')>=3 && lvl('nozzle')>=3)) continue;
    if(k==='bigrig' && !(lvl('tank')>=3 && lvl('refill')>=3)) continue;
    if(k==='empire' && !(lvl('pay')>=3 && lvl('patience')>=3)) continue;
    const c = costOf(k,l);
    if(s.cash - c >= reserve){ s.cash -= c; s.gear[k] = l+1; bought.push(`${k}${l+1}`); }
    if(bought.length >= 2) break; // don't overspend in one go
  }
  // move region when unlocked, if the last job went decently
  if(s.jobs >= 12 && s.region==='grove' && pct >= 75){ s.region = 'city'; unlockedCity = true; note += ' → Downtown'; }
  if(s.jobs >= 30 && s.region==='city' && pct >= 75){ s.region = 'harbor'; unlockedHarbor = true; note += ' → Harbour'; }
  minCash = Math.min(minCash, s.cash); if(s.jobs===12) gearAt12 = Object.values(s.gear).reduce((a,b)=>a+b,0); if(s.jobs===30) gearAt30 = Object.values(s.gear).reduce((a,b)=>a+b,0);
  log.push({ n: s.jobs, region: s.region[0], job: jobKey, grime, tough: tough().toFixed(2), pct, pay, cash: s.cash, streak: s.streak, bought: bought.join(','), note });
}
if(K.verbose) for(const l of log) console.log(`#${String(l.n).padStart(2)} ${l.region} ${l.job.padEnd(10)} ${l.grime.padEnd(6)} dirt×${l.tough} clean ${String(l.pct).padStart(3)}%  pay $${String(l.pay).padStart(4)}  cash $${String(l.cash).padStart(5)} streak ${l.streak} ${l.bought}${l.note}`);
const pcts = log.map(l=>l.pct);
const avg = a => Math.round(a.reduce((x,y)=>x+y,0)/a.length);
console.log(`[eff ${K.eff} bills ${K.billMode} rad ${K.radius} tough ${K.p ? 'adaptive p='+K.p+' slope='+K.toughPerJob : (K.geo ? 'geo '+K.geo : K.toughPerJob+'/'+K.toughCap)} city ${K.region.city} harbor ${K.region.harbor} base ${K.basePay} exp ${K.payExp}]  avg clean: jobs1-12 ${avg(pcts.slice(0,12))}%  13-30 ${avg(pcts.slice(12,30))}%  31+ ${avg(pcts.slice(30))}%  | completes ${pcts.filter(p=>p>=98).length}/${pcts.length}  zero-pay ${log.filter(l=>l.pay===0).length}  repos ${s.repos}  bills ${Math.round(100*billsPaid/Math.max(1,s.lifetime))}% of income  tight ${tight}  cash end $${s.cash}  lifetime $${s.lifetime}  gear@12 ${gearAt12} gear@30 ${gearAt30} total ${Object.values(s.gear).reduce((a,b)=>a+b,0)}`);
