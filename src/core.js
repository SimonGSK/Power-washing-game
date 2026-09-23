(function(){
  "use strict";

  /* =========================================================
     SAVE / STATE
     ========================================================= */
  var SAVE_KEY = "pwco_save_v3";

  function defaultState(){
    return {
      cash: 120,
      rep: 0,
      loan: 0,
      jobsCompleted: 0,
      jobsSinceBill: 0,
      billNumber: 1,
      cashSinceRepo: 0,
      streak: 0,
      lifetimeEarnings: 0,
      ownedOutright: false,
      legacyAvailable: false,
      region: "grove",
      gear: { powercore:0, tankcore:0, bizcore:0,
              pressure:0, nozzle:0, tank:0, refill:0, pay:0, patience:0,
              surge:0, bigrig:0, empire:0,
              tipjar:0, prowasher:0, foamcannon:0, degreaser:0, lease:0,
              crewcore:0, morale:0, watergun:0, family:0,
              cone:0, flow:0, contracts:0, overtime:0,
              mosskiller:0, rustremover:0, stripper:0 },
      perks: {},
      crew: {},
      son: 0,
      recentPays: [], sinceContract: 0,
      day: 0, week: 1, activeChem: "water", info: {},
      stats: { bestClean:0, longestStreak:0, repoCount:0, crewEarnings:0, grove:0, city:0, harbor:0 },
      story: {}
    };
  }

  var state = loadState();

  function loadState(){
    try{
      var raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var d = defaultState();
      parsed.gear   = Object.assign(d.gear,   parsed.gear   || {});
      parsed.perks  = Object.assign(d.perks,  parsed.perks  || {});
      parsed.stats  = Object.assign(d.stats,  parsed.stats  || {});
      parsed.crew   = Object.assign(d.crew,   parsed.crew   || {});
      parsed.story  = Object.assign(d.story,  parsed.story  || {});
      if(!Array.isArray(parsed.recentPays)) parsed.recentPays = [];
      parsed.info = Object.assign({}, parsed.info || {});
      return Object.assign(d, parsed);
    }catch(e){ return defaultState(); }
  }
  function save(){
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){}
  }

  /* =========================================================
     CONFIG
     ========================================================= */
  var BUYOUT_TARGET = 40000;
  var LENDER = { name:"Sal", markup:1.35, cut:0.25 };   /* owes bill × 1.35, repaid with 25% of every job's pay */
  var OVERHEAD_CAP = 14;

  var REGIONS = {
    grove: {
      id:"grove", name:"Maple Grove", icon:"house",
      tag:"Quiet suburb. Driveways, patios, decks — where every washer starts.",
      dirt:1.00, pay:1.00, unlock:0,
      jobs:["driveway","patio","deck","fence"],
      grimes:["dust","mud","moss","grease","grease"],
      sky:["#a8dcef","#e9f4da"]
    },
    city: {
      id:"city", name:"Downtown", icon:"city",
      tag:"Glass towers and greasy loading bays. Pays well, notices streaks.",
      dirt:1.20, pay:1.55, unlock:12,
      jobs:["windows","storefront","garage"],
      grimes:["dust","soot","grease","soot","grease"],
      sky:["#9dc6e6","#f1e2ca"]
    },
    harbor: {
      id:"harbor", name:"Saltwick Harbor", icon:"anchor",
      tag:"Salt, barnacles and boat owners with deep pockets.",
      dirt:1.40, pay:2.30, unlock:30,
      jobs:["hull","dock","shack"],
      grimes:["moss","salt","salt","grease","salt"],
      sky:["#8fd2e2","#fce8bf"]
    }
  };
  var REGION_ORDER = ["grove","city","harbor"];

  /* Grime types: shades go [thin film, mid, deep crust]; layers 4 and 5 paint in darker
     versions of the crust shade. Layers are what the timer fights. */
  var GRIME_TYPES = {
    dust:   { id:"dust",   name:"Dust & Pollen",     layers:3, pay:1.00, shades:["#b09a6b","#8b7449","#665430"], splash:"#e6d8b4", chem:null,          icon:"dirtDust", blurb:"Plain water does the job. Thin coat, comes off with a steady pass." },
    mud:    { id:"mud",    name:"Caked Mud",         layers:4, pay:1.14, shades:["#9c7a52","#70522f","#4a351d"], splash:"#dcc5a2", chem:null,          icon:"dirtMud", blurb:"Plain water, but it's thick — thick patches need several passes." },
    moss:   { id:"moss",   name:"Moss & Algae",      layers:4, pay:1.24, shades:["#93b166","#61883b","#3d6425"], splash:"#c9e4a6", chem:"mosskiller",  icon:"dirtMoss", blurb:"Green growth that laughs at water. Switch to Moss Killer (Shop) or it barely moves." },
    grease: { id:"grease", name:"Grease & Grime",    layers:4, pay:1.36, shades:["#7f776a","#524c43","#2d2a24"], splash:"#d2ccbe", chem:"degreaser",   icon:"dirtGrease", blurb:"Oily film. Degreaser cuts it; water just smears it around." },
    soot:   { id:"soot",   name:"City Soot",         layers:4, pay:1.42, shades:["#8c8c93","#5d5d65","#34343b"], splash:"#d6d6de", chem:null,          icon:"dirtSoot", blurb:"Black soot from the traffic. Plain water takes it, but it sits thick — keep the wand on it." },
    salt:   { id:"salt",   name:"Salt & Barnacles",  layers:5, pay:1.58, shades:["#c0cdc5","#93a79d","#657a70"], splash:"#eaf3ed", chem:null,          icon:"dirtSalt", blurb:"Crusted salt and shell. Plain water, but it's the thickest crust on the coast — five layers deep." },
    rust:   { id:"rust",   name:"Rust & Weed",       layers:5, pay:1.62, shades:["#c98a5a","#9a5a2e","#6a3a18"], splash:"#e9c9a8", chem:"rustremover", icon:"dirtRust", blurb:"Rust bloom and weed. Rust Remover, and plenty of it." },
    graffiti:{ id:"graffiti", name:"Graffiti",       layers:3, pay:1.50, shades:["#d43d6a","#2f7fd8","#f2c12e"], splash:"#ffffff", chem:"stripper",    icon:"dirtGraffiti", blurb:"Spray paint. Paint Stripper lifts it; water only fades it a shade.", graffiti:true }
  };
  var CHEMS = {
    water:       { name:"Water",         icon:"drop",  color:"#58a6d8", cuts:[] },
    mosskiller:  { name:"Moss Killer",   icon:"flaskMoss",   color:"#61883b", cuts:["moss"] },
    degreaser:   { name:"Degreaser",     icon:"flaskGrease", color:"#524c43", cuts:["grease"] },
    stripper:    { name:"Paint Stripper",icon:"flaskPaint",  color:"#d43d6a", cuts:["graffiti"] },
    rustremover: { name:"Rust Remover",  icon:"flaskRust",   color:"#9a5a2e", cuts:["rust"] }
  };
  var WRONG_CHEM = 0.08;
  /* when each dirt starts turning up (jobs completed) */
  var DIRT_UNLOCK = { dust:0, mud:0, moss:6, grease:12, soot:12, graffiti:16, salt:30, rust:30 };   /* how much of a pass gets through when the chemical doesn't match */

  var WEATHERS = [
    { name:"Sunny",    tint:"transparent",           sun:true  },
    { name:"Overcast", tint:"rgba(92,102,112,0.12)", sun:false },
    { name:"Golden",   tint:"rgba(240,150,70,0.14)", sun:true  },
    { name:"Drizzle",  tint:"rgba(70,92,104,0.18)",  sun:false, rain:true }
  ];

  /* Skill tree: trunks that fork into two straight branches which rejoin at a capstone.
     Positions are computed at render time so a fourth limb (Crew) can slot in once you hire. */
  var LIMB_DEFS = [
    { core:"powercore", label:"Water",    twigs:["pressure","nozzle","cone"],       leaf:"surge" },
    { core:"tankcore",  label:"Tank",     twigs:["tank","refill","flow"],           leaf:"bigrig" },
    { core:"bizcore",   label:"Business", twigs:["pay","patience","contracts"],     leaf:"empire" },
    { core:"crewcore",  label:"Crew",     twigs:["morale","watergun","overtime"],   leaf:"family", needs:function(){ return crewUnlocked(); }, gateText:"Hire your first crew member (Jordan, Mimi or Rex) to open this limb." }
  ];
  function crewUnlocked(){ return Object.keys(state.crew).length > 0; }
  function limbsNow(){
    var defs = LIMB_DEFS;
    var n = defs.length, span = 100/n, gap = span*0.30;
    return defs.map(function(d, i){
      var x = Math.round((i+0.5)*span*10)/10, m = (d.twigs.length-1)/2;
      return { core:d.core, label:d.label, x:x, y:82,
        twigs: d.twigs.map(function(key, ti){ var tx = Math.round((x + (ti-m)*gap)*10)/10; return { key:key, x:tx, pts:[[tx,64],[tx,47],[tx,30]] }; }),
        leaf:{ key:d.leaf, x:x, y:12 } };
    });
  }
  var GEAR = {
    pressure:{ title:"Water Pressure", icon:"bolt", costs:[110,290,640],
      desc:["A stronger pump: grime strips faster.","Stronger still.","The strongest pump you can fit."] },
    nozzle:  { title:"Nozzle Width",   icon:"nozzle", costs:[90,240,520],
      desc:["A wider nozzle: more ground per pass.","Wider still.","The widest nozzle."] },
    tank:    { title:"Tank Capacity",  icon:"barrel", costs:[80,210,480],
      desc:["A bigger tank — it takes a little longer to fill.","A bigger tank.","The biggest tank."] },
    refill:  { title:"Refill Speed",   icon:"faucet", costs:[90,230,470],
      desc:["A faster pump at the hydrant.","Faster still.","The fastest refill."] },
    pay:     { title:"Money per Job",  icon:"coin", costs:[100,260,560],
      desc:["Pricier clients: more pay, 4% tougher dirt.","More pay, dirt +8% in total.","More pay, dirt +12% in total."] },
    patience:{ title:"Patience",       icon:"hourglass", costs:[80,210,460],
      desc:["Customers wait 10 s longer.","Another 10 s.","Another 10 s."] },
    morale:  { title:"Crew Morale",    icon:"heart", costs:[250,650,1500],
      desc:["Happier crew: income +15%, wages +5%.","Income +30% in total, wages +10%.","Income +45% in total, wages +15%."] },
    watergun:{ title:"Water Gun",      icon:"watergun", costs:[120,300,650],
      desc:["A bigger water gun for your son: wider and stronger. Pocket money +$5 a week.","Bigger still. +$5 a week.","The Super Soaker. +$5 a week."] },
    cone:    { title:"Even Cone",      icon:"cone", costs:[130,320,700],
      desc:["A flatter spray: the cone's edge strips 60% as hard as the centre (was 50%), the centre a bit softer.","Edge at 70%.","Edge at 80% — the whole cone works."] },
    flow:    { title:"Flow Control",   icon:"valve", costs:[100,260,560],
      desc:["Less water per pass, a touch less power.","Less again.","The tank lasts nearly twice as long."] },
    contracts:{ title:"Contracts",     icon:"scroll", costs:[200,450,900],
      desc:["Customers start offering contracts on about half your jobs: leave a marked patch spotless for +15% pay. Miss one and it costs a reputation star.","Contract bonus +20%.","Contract bonus +25%, and they come more often."] },
    overtime:{ title:"Overtime",       icon:"calendar", costs:[300,700,1500],
      desc:["Crew work Saturdays — even when you rest. Wages +15%.","Crew work Sundays too. Wages +10% more.","Weekend crew income +20%."] },

    /* trunks - each one opens the two branches above it */
    powercore:{ title:"Pump Core",    icon:"pump", costs:[150],
      desc:["Opens the Pressure, Nozzle and Cone branches."] },
    tankcore: { title:"Plumbing",     icon:"wrench", costs:[150],
      desc:["Opens the Capacity, Refill and Flow branches."] },
    bizcore:  { title:"Paperwork",    icon:"briefcase", costs:[150],
      desc:["Opens the Money, Patience and Contracts branches."] },
    crewcore: { title:"Crew Van",     icon:"hardhat", costs:[400],
      desc:["Opens the Morale, Water Gun and Overtime branches."] },

    /* capstones - each needs BOTH branches of its trunk maxed */
    surge:    { title:"Surge Lance",  icon:"lance", costs:[1500],
      desc:["The last word in lances. Needs all three water branches maxed."] },
    bigrig:   { title:"Big Rig Tank", icon:"truck", costs:[1500],
      desc:["A tank the size of a pool, and every refill 30% faster."] },
    empire:   { title:"Franchise",    icon:"crown", costs:[1700],
      desc:["Your name on other people's vans."] },
    family:   { title:"Family Business", icon:"family", costs:[2400],
      desc:["Everybody pitches in: your son fires a third more often."] }
  };
  var SHOP = {
    mosskiller: { title:"Moss Killer",  icon:"flaskMoss", costs:[150], chem:true,
      desc:["A chemical for the wand: cuts moss and algae at full strength — and only moss. Works like water on everything else. Switch to it mid-job (or press 2)."] },
    degreaser:  { title:"Degreaser",    icon:"flaskGrease", costs:[200], chem:true,
      desc:["Cuts grease and grime at full strength — and only grease. Switch to it mid-job (or press 3)."] },
    stripper:   { title:"Paint Stripper", icon:"flaskPaint", costs:[240], chem:true,
      desc:["Lifts spray paint — and only paint. Switch to it mid-job (or press 4)."] },
    rustremover:{ title:"Rust Remover", icon:"flaskRust", costs:[300], chem:true,
      desc:["Dissolves rust bloom — and only rust. Switch to it mid-job (or press 5)."] },
    prowasher: { title:"Pro Pressure Washer", icon:"wand", costs:[900],
      desc:["A commercial unit: much more power and a wider spray."] },
    foamcannon:{ title:"Foam Cannon", icon:"foam", costs:[260,540],
      desc:["Blasts foam onto the dirtiest patch it can see every 1.35 s. 5 L a shot from your tank.","Every 0.8 s, a wider, stronger blast."] },
    tipjar:    { title:"Tip Jar", icon:"jar", costs:[190],
      desc:["Customers tip for a clean job done fast. The tip grows as the job gets cleaner (from 50%) and shrinks as time passes — even a job that runs out of time can earn a little."] },
    lease:     { title:"Cheaper Lease", icon:"book", costs:[300,700,1500],
      desc:["A better deal on the van.","Better still.","The best deal in town."] }
  };
  /* Legacy perks: bought with reputation stars (earned on every bill you pay), permanent. */
  var PERKS = {
    coffee:      { title:"Coffee Break",   icon:"clock",   cost:5,   desc:"Tank refills 10% faster." },
    neighbourly: { title:"Neighbourly",    icon:"house",   cost:6,   desc:"Maple Grove dirt is 5% easier." },
    sunday:      { title:"Sunday Best",    icon:"sparkle", cost:8,   desc:"+6% pay on sunny jobs." },
    headstart:   { title:"Loyal Client",   icon:"bolt",    cost:12,   desc:"Every new rig starts with Water Pressure lvl.1 installed." },
    discount:    { title:"Bulk Soap Deal", icon:"flask",   cost:18,  desc:"All upgrades and shop gear cost 15% less." },
    basepay:     { title:"Regulars",       icon:"coin",    cost:22,  desc:"Earn an extra 20% cash on every job." },
    lowoverhead: { title:"Tax Write-off",  icon:"bill",    cost:22,  desc:"Overhead bills are 15% cheaper." },
    wordofmouth: { title:"Word of Mouth",  icon:"star",    cost:16,  desc:"+2 bonus reputation every time you pay a bill." },
    severance:   { title:"Severance Pay",  icon:"hardhat", cost:26,  desc:"Your first crew member stays on through a repossession." },
    franchise:   { title:"Franchise Van",  icon:"truck",   cost:55,  desc:"Every new rig starts with Pump Core and Plumbing installed." },
    oldmoney:    { title:"Old Money",      icon:"trophy",  cost:80,  desc:"After a repossession you restart with at least $1,000." },
    goldenhose:  { title:"Golden Hose",    icon:"wand",    cost:110,  desc:"Spray power +0.15, forever." },
    legend:      { title:"Local Legend",   icon:"crown",   cost:160, desc:"Crew income +25% and +10 s customer patience." },
    washbot:     { title:"WashBot 3000",   icon:"truck",   cost:450, desc:"A robot that rides along and blasts the dirtiest spot every third of a second with any chemical. The retirement plan." }
  };
  /* Crew work their own jobs (income per job you finish) and draw wages on every overhead bill. */
  var CREW = [
    { id:"jordan", name:"Jordan", icon:"p_jordan", hire:600,  rate:45,  ups:[400,900,2000],     blurb:"Your cousin. Shows up. Mostly." },
    { id:"mimi",   name:"Mimi",   icon:"p_mimi", hire:3200, rate:120, ups:[1600,3600,8000],   blurb:"Fast, thorough, headphones always in." },
    { id:"rex",    name:"Rex",    icon:"p_rex", hire:9000, rate:300, ups:[4500,10000,22000], blurb:"Ex-ferry mechanic. Fears no barnacle." }
  ];
  /* Your son: no income, but he stands next to you on every job with a water gun. */
  var SON = { id:"son", name:"Ollie (your son)", icon:"p_son", hire:150, wage:10,
    blurb:"Eight years old, deadly with a water gun. Wants pocket money and to help." };

  var ACHIEVEMENTS = [
    { icon:"wand", title:"First Splash",   desc:"Finish your first job.",            cond:function(s){ return s.jobsCompleted>=1; } },
    { icon:"sparkle", title:"Regular Route",  desc:"Finish 15 jobs.",                   cond:function(s){ return s.jobsCompleted>=15; } },
    { icon:"city", title:"Big Leagues",    desc:"Take a job downtown.",              cond:function(s){ return s.stats.city>=1; } },
    { icon:"anchor", title:"Sea Legs",       desc:"Take a job at the harbor.",         cond:function(s){ return s.stats.harbor>=1; } },
    { icon:"sparkle", title:"Spotless",       desc:"Finish a job at 99% clean.",        cond:function(s){ return s.stats.bestClean>=99; } },
    { icon:"flame", title:"On a Roll",      desc:"Reach a 10-job streak.",            cond:function(s){ return s.stats.longestStreak>=10; } },
    { icon:"hardhat", title:"Boss Energy",    desc:"Hire your first crew member.",      cond:function(s){ return Object.keys(s.crew).length>=1; } },
    { icon:"drop", title:"Take Your Kid to Work", desc:"Hire your son.",               cond:function(s){ return s.son>0; } },
    { icon:"city", title:"Whole Operation",desc:"Have all three crew on payroll.",   cond:function(s){ return Object.keys(s.crew).length>=3; } },
    { icon:"truck", title:"Rock Bottom",    desc:"Get the van repossessed once.",     cond:function(s){ return s.stats.repoCount>=1; } },
    { icon:"trophy", title:"Debt Free",      desc:"Own Power Wash Co. outright.",      cond:function(s){ return !!s.ownedOutright; } }
  ];

  /* =========================================================
     SMALL HELPERS
     ========================================================= */
  function $(id){ return document.getElementById(id); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function money(n){ return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pick(arr,i){ return arr[((i % arr.length)+arr.length) % arr.length]; }
  function polar(cx,cy,r,deg){ var a=deg*Math.PI/180; return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function rnd(a,b){ return a + Math.random()*(b-a); }

  /* Deterministic RNG so a job's scenery stays put while you wash it */
  function makeRng(seed){
    var s = seed >>> 0 || 1;
    return function(){
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }

  /* Rounded rect path (works without ctx.roundRect) */
  function rr(ctx,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }
  function fillRR(ctx,x,y,w,h,r,fill){ rr(ctx,x,y,w,h,r); ctx.fillStyle=fill; ctx.fill(); }

  /* =========================================================
     DERIVED STATS
     ========================================================= */
  function lvl(k){ return state.gear[k] || 0; }
  function gearDef(k){ return GEAR[k] || SHOP[k]; }
  function costOf(k, level){
    var d = gearDef(k);
    if(!d || level >= d.costs.length) return null;
    return Math.round(d.costs[level] * 1.25 * (state.perks.discount ? 0.85 : 1) / 10) * 10;
  }

  function tankMax(){
    return 260 + [0,110,240,400][Math.min(3, lvl("tank"))]
      + (lvl("tankcore")>0 ? 70 : 0)
      + (lvl("bigrig")>0 ? 200 : 0);
  }
  function sprayPower(){
    return (0.50 + lvl("pressure")*0.30 + (state.perks.goldenhose ? 0.15 : 0)
      + (lvl("prowasher")>0 ? 0.42 : 0)
      + (lvl("powercore")>0 ? 0.12 : 0)
      + (lvl("surge")>0 ? 0.40 : 0)) * (1 - lvl("cone")*0.04 - lvl("flow")*0.03);
  }
  /* scene pixels: the first nozzle is narrow on purpose — early jobs are a race against the timer */
  var BASE_RADIUS = 6;
  function sprayRadius(){
    return BASE_RADIUS + lvl("nozzle")*1.25 + (lvl("prowasher")>0 ? 2 : 0) + (lvl("surge")>0 ? 1.5 : 0);
  }
  /* How much harder each pass has to work. Two parts:
     - progress: a training ramp (0.85 → 1.0 by job 8) rising to 1.9 by job 52, times the region;
     - the rig itself: dirt keeps pace with most of the rig's cleaning multiplier, so a job is
       never a walk, but the player keeps RIG_KEEPS of every upgrade as felt progress.
     Tuned with a simulator and scripted playtests: a perfect sweep with the starting rig ends
     job 1 at ~84%; a human lands 10–15 points lower. RIG_KEEPS is the one knob to turn:
     higher = upgrades feel stronger and good players finish early more often. */
  var RIG_KEEPS = 0.35;
  var REGION_TOUGH = { grove:1.0, city:1.1, harbor:1.2 };
  function rigMult(){
    return (sprayPower()/0.5) * Math.pow(sprayRadius()/BASE_RADIUS, 2) * degreaserMult() * (jobMs()/40000);
  }
  function progressToughness(){ return Math.min(1.9, 0.85 + state.jobsCompleted * 0.02) * (REGION_TOUGH[state.region] || 1) * (state.perks.neighbourly && state.region === "grove" ? 0.95 : 1); }
  function grimeToughness(){ return progressToughness() * Math.pow(rigMult(), 1 - RIG_KEEPS) * (1 + lvl("pay")*0.04); }   /* pricier clients bring worse dirt */
  function sonHired(){ return state.son > 0; }
  function sonRadius(){ return 4.5 + lvl("watergun")*0.8; }
  function sonPower(){ return 1.1 + lvl("watergun")*0.08; }       /* per shot, before the dirt's toughness (he keeps pace with the job) */
  function foamPower(){ return foamLevel() >= 2 ? 0.55 : 0.7; }
  var FOAM_WATER = 5;                                                /* litres from your tank per foam shot */
  function sonIntervalMs(){ return lvl("family")>0 ? 520 : 700; }
  function crewMult(){ return 1 + lvl("crewcore")*0.10 + lvl("morale")*0.15 + lvl("family")*0.30 + (state.perks.legend ? 0.25 : 0); }
  /* wages drawn on every overhead bill */
  /* A worker's weekly wage: WAGE_DAYS days of what they bring in on this route (before crew
     upgrades), so wages keep pace with a better route. Morale and overtime add to it. */
  var WAGE_DAYS = 1.5;
  function wageMult(){ return 1 + lvl("morale")*0.05 + (lvl("overtime") >= 1 ? 0.15 : 0) + (lvl("overtime") >= 2 ? 0.10 : 0); }
  function crewWage(c, level){ return Math.round(c.rate * (1 + level*0.6) * regionDef().pay * WAGE_DAYS * wageMult()); }
  function crewSalary(){
    var s = 0;
    CREW.forEach(function(c){ if(crewHired(c.id)) s += crewWage(c, crewLevel(c.id)); });
    if(sonHired()) s += SON.wage + lvl("watergun")*5;
    return s;
  }

  function refillMs(){
    var t = Math.max(550, 1700 - lvl("refill")*400);
    if(lvl("bigrig")>0) t *= 0.7;
    t *= 1 + lvl("tank")*0.10;                       /* a bigger tank takes longer to fill */
    return state.perks.coffee ? t*0.9 : t;
  }
  function jobMs(){ return 40000 + lvl("patience")*10000 + (lvl("empire")>0 ? 12000 : 0) + (state.perks.legend ? 10000 : 0); }
  function degreaserMult(){ return 1; }
  function chemOwned(id){ return id === "water" || lvl(id) > 0; }
  function chemList(){ return Object.keys(CHEMS).filter(chemOwned); }
  /* how much of a pass gets through on this dirt with the chemical in the wand */
  function chemFactor(type, chemId){
    if(!type.chem) return 1;
    return chemId === type.chem ? 1 : WRONG_CHEM;
  }
  function coneEdge(){ return 0.5 - lvl("cone")*0.1; }             /* the cone's edge strips (1 - this) of the centre */
  /* a wider, harder spray drinks more: with the radius and pressure^0.3, minus Flow Control */
  function waterPerTick(){
    return 1.2 * (sprayRadius()/BASE_RADIUS) * Math.pow(sprayPower()/0.5, 0.3) * (1 - lvl("flow")*0.15) * (lvl("prowasher")>0 ? 1.1 : 1);
  }
  function waterPerSecond(){ return waterPerTick() * (1000/70); }
  function contractsUnlocked(){ return lvl("contracts") > 0; }
  function contractBonus(){ return [0, 0.15, 0.20, 0.25][Math.min(3, lvl("contracts"))]; }
  function contractChance(){ return lvl("contracts") >= 3 ? 0.55 : 0.40; }   /* plus a pity rule: never three in a row without */
  function foamLevel(){ return lvl("foamcannon"); }
  function tipChance(){ return lvl("tipjar")>0 ? 0.35 : 0; }
  function billEvery(){ return 5; }   /* five working days a week */
  var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  function isWeekend(d){ return d >= 5; }
  function crewWorksToday(){ var d = state.day; if(!isWeekend(d)) return true; if(d === 5) return lvl("overtime") >= 1; return lvl("overtime") >= 2; }
  function weekendCrewMult(){ return isWeekend(state.day) && lvl("overtime") >= 3 ? 1.2 : 1; }
  function leaseMult(){ return [1, 0.90, 0.80, 0.70][Math.min(3, lvl("lease"))]; }
  function overheadMult(){ return leaseMult() * (state.perks.lowoverhead ? 0.85 : 1); }
  function payMult(){
    var m = 1 + lvl("pay")*0.12 + (lvl("bizcore")>0 ? 0.06 : 0) + (lvl("empire")>0 ? 0.20 : 0);
    return m * (state.perks.basepay ? 1.2 : 1);
  }
  var STREAK_MAX = 10;
  function streakMult(){ return 1 + Math.min(STREAK_MAX, state.streak)*0.03; }
  /* pay falls away fast below a full clean: nothing under 30%, half at ~70%, all of it at 100% */
  function cleanPayFactor(c){ return c < 0.30 ? 0 : Math.pow((c-0.30)/0.70, 1.15); }
  function regionDef(){ return REGIONS[state.region] || REGIONS.grove; }

  /* The bill scales with the business: BILL_SHARE of what your last six jobs paid on average, times
     the five working days, with a floor per route. So it's the same squeeze for everyone — the
     suspense is whether you spent your reserve on upgrades. At 0.55 roughly 45% of a week's pay
     is left over for chemicals and gear. */
  var REGION_OVERHEAD = { grove:95, city:190, harbor:340 };
  var BILL_SHARE = 0.55;   /* a week's payment ≈ this share of a week's pay: the rest is yours for gear and chemicals */
  function recentPayAvg(){
    var r = state.recentPays.slice(-6);
    if(!r.length) return 0;
    return r.reduce(function(a,b){ return a+b; }, 0) / r.length;
  }
  function overheadBase(n){
    if(state.ownedOutright) return 25;
    var amt = Math.max(REGION_OVERHEAD[state.region] || 95, BILL_SHARE * recentPayAvg() * billEvery());
    return Math.round(amt * overheadMult());
  }
  function overheadAmount(n){ return overheadBase(n) + crewSalary(); }

  function gearScore(){
    var s=0; for(var k in state.gear){ s += state.gear[k]||0; } return s;
  }
  function rigTier(){
    var s = gearScore();
    if(s===0) return 0;
    if(s<=5) return 1;
    if(s<=12) return 2;
    if(s<=19) return 3;
    return 4;
  }
  var TIERS = [
    ["Rookie Rig","A hose, a dream and a little elbow grease."],
    ["Starter Rig","Getting the hang of this."],
    ["Solid Rig","The neighbours are starting to notice."],
    ["Pro Rig","This thing hums."],
    ["Elite Rig","People book you weeks in advance."]
  ];

  function crewHired(id){ return state.crew[id] != null; }
  function crewLevel(id){ return state.crew[id] || 0; }
  function crewIncome(){
    var total = 0;
    CREW.forEach(function(c){
      if(!crewHired(c.id)) return;
      total += c.rate * (1 + crewLevel(c.id)*0.6);
    });
    return Math.round(total * regionDef().pay * crewMult() * weekendCrewMult());
  }
  function crewIncomeToday(){ return crewWorksToday() ? crewIncome() : 0; }
  /* what the crew earn on a given day of the week, whether or not you work it yourself */
  function crewIncomeOn(d){ var keep = state.day; state.day = d; var v = crewIncomeToday(); state.day = keep; return v; }
  function regionUnlocked(id){
    return state.jobsCompleted >= REGIONS[id].unlock;
  }



  /* why a node can't be bought yet, or null if it can */
  function treeGate(key, level){
    for(var i=0;i<LIMB_DEFS.length;i++){
      var L = LIMB_DEFS[i];
      if(L.core === key) return (L.needs && !L.needs()) ? L.gateText : null;
      if(L.leaf === key){
        var allMax = L.twigs.every(function(t){ return lvl(t) >= 3; });
        if(allMax) return null;
        return "Needs " + L.twigs.map(function(t){ return GEAR[t].title; }).join(", ") + " all at level 3 \u2014 the branches have to meet.";
      }
      for(var t=0;t<L.twigs.length;t++){
        if(L.twigs[t] === key){
          if(L.needs && !L.needs()) return L.gateText;
          if(lvl(L.core) === 0) return "Install " + GEAR[L.core].title + " on the trunk first.";
          if(lvl(key) !== level) return "Install level " + level + " of this branch first.";
          return null;
        }
      }
    }
    return lvl(key) === level ? null : "Install level " + level + " first.";
  }
