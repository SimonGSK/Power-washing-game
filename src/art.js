  /* =========================================================
     PIXEL ART — icons, mascot, portraits, truck
     (16- and 24-grid SVGs from the design system; shown at whole multiples)
     ========================================================= */
  var ICONS = __ICONS__;
  function ic(name, cls){
    var s = ICONS[name] || ICONS.sparkle;
    return s.replace('<svg ', '<svg class="' + (cls || 'pw-icon') + '" aria-hidden="true" ');
  }
  /* fill every <span class="ico" data-ic="…"> in the static markup */
  Array.prototype.slice.call(document.querySelectorAll('.ico[data-ic]')).forEach(function(el){
    var big = el.parentNode && el.parentNode.classList.contains('pw-counter');
    el.outerHTML = ic(el.getAttribute('data-ic'), el.classList.contains('pw-btn__icon') ? 'pw-btn__icon' : (big ? 'pw-counter__icon' : 'pw-icon'));
  });
  function mascotSVG(){ return ic("mascot", "pw-hero__mark"); }
  function portraitSVG(who){ return ic("p_" + who, "pw-portrait__art"); }

  /* design-system colours the canvas painters use (theme-aware) */
  var PAL_FALLBACK = {
    ink:"#3a2010", sun:"#f6c744", sunHi:"#ffe08a", sunLo:"#c8901a", parch:"#f8dc9c", parchHi:"#fff0c4", parchLo:"#e9c274",
    coral:"#e8744c", coralHi:"#f5a07e", coralLo:"#a03a1c", water:"#58a6d8", waterHi:"#a5dcf3", waterLo:"#26668f",
    leaf:"#74b247", leafHi:"#cfe6a8", leafLo:"#386a1b", berry:"#d980a4", stone:"#b9b4a6", stoneLo:"#6f6a60", wood:"#b46a2c", woodLo:"#7e451a",
    g1:"#2f6b2a", g2:"#4a8f34", g3:"#6fb043", g4:"#9ad35c",
    s1:"#4a2f1a", s2:"#6e4a2b", s3:"#9a6b3e", s4:"#c49560",
    p1:"#5a3416", p2:"#8a5a2b", p3:"#b8813f", p4:"#d9a962",
    w1:"#1f5a86", w2:"#2f7fb3", w3:"#4fa6d6", w4:"#8ed3f0",
    c1:"#6f6b66", c2:"#9a948c", c3:"#c2bcb2", c4:"#e6e1d8", c5:"#f4f0e8",
    skin:"#f2c9a0", white:"#ffffff"
  };
  var PAL_VARS = {
    ink:"--ink", sun:"--sun", sunHi:"--sun-hi", sunLo:"--sun-lo", parch:"--parchment", parchHi:"--parchment-hi", parchLo:"--parchment-lo",
    coral:"--coral", coralHi:"--coral-hi", coralLo:"--coral-lo", water:"--water", waterHi:"--water-hi", waterLo:"--water-lo",
    leaf:"--leaf", leafHi:"--leaf-hi", leafLo:"--leaf-lo", berry:"--berry", stone:"--stone", stoneLo:"--stone-lo", wood:"--wood", woodLo:"--wood-lo",
    g1:"--scene-grass-1", g2:"--scene-grass-2", g3:"--scene-grass-3", g4:"--scene-grass-4",
    s1:"--scene-soil-1", s2:"--scene-soil-2", s3:"--scene-soil-3", s4:"--scene-soil-4",
    p1:"--scene-plank-1", p2:"--scene-plank-2", p3:"--scene-plank-3", p4:"--scene-plank-4",
    w1:"--scene-sea-1", w2:"--scene-sea-2", w3:"--scene-sea-3", w4:"--scene-sea-4",
    c1:"--scene-concrete-1", c2:"--scene-concrete-2", c3:"--scene-concrete-3", c4:"--scene-concrete-4", c5:"--scene-concrete-5"
  };
  var P = {};
  function loadPalette(){
    var cs = getComputedStyle(document.documentElement);
    for(var k in PAL_FALLBACK){
      var v = PAL_VARS[k] ? cs.getPropertyValue(PAL_VARS[k]).trim() : "";
      P[k] = v || PAL_FALLBACK[k];
    }
  }
  loadPalette();

  var TIER_PAINT = [
    { body:"#d8d2c4", trim:"#a89d80" },
    { body:"#8fc4d8", trim:"#4a9cc4" },
    { body:"#4a9cc4", trim:"#2d7096" },
    { body:"#e8794a", trim:"#bb5527" },
    { body:"#f5c451", trim:"#cc9721" }
  ];

  /* The rig: a pickup with a cylindrical tank on the bed, drawn into a 104×44 pixel buffer and
     emitted as run-length SVG rects. Bought gear shows up on it. */
  function truckSVG(){
    var t = rigTier(), p = TIER_PAINT[t];
    var tw = 30 + lvl("tank")*6 + (lvl("bigrig")?6:0);
    var hasPro = lvl("prowasher")>0, hasTip = lvl("tipjar")>0, hasFoam = lvl("foamcannon")>0;
    var Gy = 44, bedX = 8, tankX = 10, unitX = tankX + tw + 3, cabX = unitX + 15, front = cabX + 34;
    var W = front + 8, H = 56, G = [];
    for(var y=0;y<H;y++){ G.push(new Array(W).fill(null)); }
    function px(x,y,w,h,c){ for(var yy=Math.round(y); yy<Math.round(y+h); yy++) for(var xx=Math.round(x); xx<Math.round(x+w); xx++) if(yy>=0&&yy<H&&xx>=0&&xx<W) G[yy][xx]=c; }
    function get(x,y){ return (y>=0&&y<H&&x>=0&&x<W) ? G[y][x] : null; }
    function outlineAll(){ /* ink around every painted pixel that touches empty */
      var edges=[]; for(var y=0;y<H;y++) for(var x=0;x<W;x++){ if(G[y][x]) continue; if(get(x-1,y)||get(x+1,y)||get(x,y-1)||get(x,y+1)) edges.push([x,y]); }
      edges.forEach(function(e){ G[e[1]][e[0]] = P.ink; });
    }
    function disc(cx,cy,r,c){ for(var y=-r;y<=r;y++) for(var x=-r;x<=r;x++) if(x*x+y*y <= r*r+r*0.5) px(cx+x,cy+y,1,1,c); }
    function text(x,y,str,c){ for(var i=0;i<str.length;i++){ var g=FONT[str[i]]; if(!g) continue; for(var k=0;k<15;k++) if(g[k]==="1") px(x+i*4+(k%3), y+Math.floor(k/3), 1, 1, c); } }
    var hi = mix(p.body, "#ffffff", 0.45), lo = mix(p.body, "#000000", 0.25);
    /* chassis + bed */
    px(bedX, Gy-8, cabX-bedX+2, 4, P.p1); px(bedX, Gy-8, cabX-bedX+2, 1, P.p2);
    px(bedX, Gy-16, cabX-bedX, 8, p.body); px(bedX, Gy-16, cabX-bedX, 1, hi); px(bedX, Gy-9, cabX-bedX, 1, lo);
    px(bedX+3, Gy-13, cabX-bedX-6, 1, p.trim);
    /* tank: a cylinder with rounded end caps, straps, a gauge and a filler */
    var th = 14 + lvl("tank")*2 + (lvl("bigrig")?3:0), ty = Gy-16-th;
    var rad = th/2;
    for(var r=0;r<th;r++){ var d=Math.abs(r-(th-1)/2), inset=Math.round(rad-Math.sqrt(Math.max(0,rad*rad-d*d))); var c = r<2 ? hi : (r<4 ? mix(p.body,"#ffffff",0.2) : (r>th-3 ? lo : p.body)); px(tankX+inset, ty+r, tw-inset*2, 1, c); }
    [0.24, 0.76].forEach(function(f){ var sx=tankX+Math.round(tw*f); px(sx, ty, 2, th, p.trim); px(sx, ty+th-1, 2, 2, P.stoneLo); });
    px(tankX+Math.round(tw*0.44), ty+4, 5, th-8, P.ink); px(tankX+Math.round(tw*0.44)+1, ty+5, 3, th-10, P.waterHi); px(tankX+Math.round(tw*0.44)+1, ty+5+Math.round((th-10)*0.45), 3, Math.round((th-10)*0.55), P.water);
    px(tankX+Math.round(tw*0.10), ty-3, 5, 3, P.stone); px(tankX+Math.round(tw*0.10), ty-3, 5, 1, P.c4);
    text(tankX+Math.round(tw*0.55), ty+Math.round(th/2)-2, "H2O", "#ffffff");
    for(var lv=0; lv<lvl("tank"); lv++) px(tankX+Math.round(tw*0.55)+lv*3, ty+th-4, 2, 2, P.sunHi);
    if(hasTip){ px(tankX+tw-9, ty-5, 5, 5, P.sun); px(tankX+tw-9, ty-5, 5, 1, P.sunHi); px(tankX+tw-8, ty-7, 3, 2, P.wood); }
    if(hasFoam){ px(tankX-3, ty+3, 4, 4, P.stoneLo); px(tankX-5, ty+4, 3, 2, P.stone); px(tankX-6, ty+4, 1, 2, "#ffffff"); }
    /* pressure washer unit with a pump, hose reel on top */
    px(unitX, Gy-28, 12, 12, hasPro ? "#e6e6e6" : "#d8b26a"); px(unitX, Gy-28, 12, 1, "#ffffff"); px(unitX, Gy-17, 12, 1, hasPro ? "#9a9a9a" : "#a8843e");
    px(unitX+3, Gy-24, 6, 5, hasPro ? P.berry : P.coral); px(unitX+3, Gy-24, 6, 1, mix(hasPro ? P.berry : P.coral, "#ffffff", 0.35)); px(unitX+5, Gy-22, 2, 1, P.ink);
    for(var k=0;k<lvl("pressure");k++) px(unitX+1+k*3, Gy-19, 2, 1, P.coral);
    disc(unitX+6, Gy-33, 5, P.parch); disc(unitX+6, Gy-33, 2, P.waterLo); px(unitX+6, Gy-35, 1, 1, P.parchHi);
    /* a rack of bottles for the chemicals you own */
    var chems = chemList().filter(function(id){ return id !== "water"; });
    if(chems.length){ px(unitX+12, Gy-16, 3+chems.length*4, 1, P.p1); }
    chems.forEach(function(id, i){ var bxp = unitX+13+i*4; px(bxp, Gy-22, 3, 6, CHEMS[id].color); px(bxp, Gy-22, 3, 1, mix(CHEMS[id].color,"#ffffff",0.4)); px(bxp+1, Gy-24, 1, 2, P.ink); });
    /* the wand, clipped to the bed side */
    px(bedX+4, Gy-11, 14, 1, P.stone); px(bedX+18, Gy-12, 2, 2, P.sun); px(bedX+3, Gy-12, 2, 2, P.ink);
    /* cab: roof, slanted windscreen, door, hood, grille, lights, bumper */
    px(cabX+2, Gy-31, 14, 3, p.body); px(cabX+2, Gy-31, 14, 1, hi);
    for(var rw=0; rw<9; rw++){ var fx1 = cabX+16+rw; px(cabX, Gy-28+rw, fx1-cabX, 1, p.body); px(cabX+8, Gy-28+rw, fx1-cabX-9, 1, P.waterHi); if(rw<2) px(cabX+8, Gy-28+rw, fx1-cabX-9, 1, "#ffffff"); px(fx1-1, Gy-28+rw, 1, 1, lo); }
    px(cabX, Gy-19, front-cabX, 11, p.body); px(cabX, Gy-19, front-cabX, 1, hi); px(cabX, Gy-9, front-cabX, 1, lo);
    px(cabX+1, Gy-26, 6, 6, P.waterHi); px(cabX+1, Gy-26, 6, 1, "#ffffff");            /* door window */
    px(cabX+7, Gy-28, 1, 20, lo); px(cabX+4, Gy-16, 3, 1, P.ink);                       /* door line + handle */
    px(cabX-2, Gy-25, 2, 3, P.ink); px(cabX-1, Gy-24, 1, 1, P.waterHi);                 /* mirror */
    px(cabX+2, Gy-13, front-cabX-4, 2, p.trim);                                         /* trim stripe */
    px(front-4, Gy-17, 4, 6, P.stoneLo); px(front-3, Gy-16, 1, 1, P.sunHi); px(front-3, Gy-14, 2, 1, P.stone); /* grille */
    px(front-1, Gy-18, 2, 3, P.sun); px(front-1, Gy-18, 2, 1, P.sunHi);                 /* headlight */
    px(front-5, Gy-9, 8, 3, P.stone); px(front-5, Gy-9, 8, 1, P.c4);                    /* bumper */
    px(bedX-2, Gy-9, 3, 3, P.stone);                                                    /* rear bumper */
    if(t>=3){ px(cabX+4, Gy-34, 10, 2, P.sun); px(cabX+4, Gy-34, 10, 1, P.sunHi); px(cabX+8, Gy-32, 2, 1, P.ink); }
    outlineAll();
    /* wheels last: tyre, rim, hub; the arches are cut by drawing over the body */
    [bedX+16, front-12].forEach(function(wx){
      disc(wx, Gy, 9, null); disc(wx, Gy, 8, "#2b2118"); disc(wx, Gy, 7, "#3d3128"); disc(wx, Gy, 4, P.parchLo); disc(wx, Gy, 2, P.stoneLo);
      px(wx-1, Gy-4, 2, 1, P.parchHi); px(wx-1, Gy+3, 2, 1, P.stoneLo);
    });
    px(bedX, Gy+9, front-bedX, 1, P.parchLo);
    /* emit run-length rects */
    var out = [];
    for(var y=0;y<H;y++){ var x=0; while(x<W){ var c=G[y][x]; if(!c){ x++; continue; } var x0=x; while(x<W && G[y][x]===c) x++; out.push('<rect x="'+x0+'" y="'+y+'" width="'+(x-x0)+'" height="1" fill="'+c+'"/>'); } }
    /* invisible hit areas for the tooltips */
    function hit(part,x,y,w,h){ out.push('<rect class="hit" data-part="'+part+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="transparent"/>'); }
    hit("tank", tankX-2, ty-4, tw+4, th+6);
    hit("pump", unitX-1, Gy-29, 14, 14);
    hit("reel", unitX, Gy-39, 13, 11);
    if(chems.length) hit("chems", unitX+11, Gy-25, 5+chems.length*4, 11);
    if(hasTip) hit("tipjar", tankX+tw-10, ty-8, 8, 8);
    if(hasFoam) hit("foam", tankX-7, ty+2, 8, 7);
    hit("cab", cabX, Gy-32, front-cabX, 24);

    var VW = 8 + 10 + (30+18+6) + 3 + 15 + 34 + 8;   /* the longest possible rig */
    /* a shorter rig sits centred in the same box, so the picture doesn't lean left */
    return '<svg viewBox="0 0 '+VW+' '+H+'" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g transform="translate('+Math.round((VW-W)/2)+' 0)">' + out.join('') + '</g></svg>';
  }

  /* =========================================================
     CANVAS SETUP — scenes are painted at 240×150 and shown at 4×
     ========================================================= */
  var CW = 240, CH = 150, CELL = 2;
  var bgCanvas = $("bgCanvas"), grimeCanvas = $("grimeCanvas"), fxCanvas = $("fxCanvas");
  var bx = bgCanvas.getContext("2d");
  var gx = grimeCanvas.getContext("2d");
  var fx = fxCanvas.getContext("2d");
  [bx,gx,fx].forEach(function(c){ c.imageSmoothingEnabled = false; });
  var stage = $("stage");

__PROPS__
__SCENES__
  /* =========================================================
     MASKS — which cells of the area actually hold grime
     ========================================================= */
  function maskWindows(px,py,a){
    var pc = 4, prow = 3;
    for(var i=1;i<pc;i++){ if(Math.abs(px-(a.x + a.w*i/pc)) < 2.5) return false; }
    for(var j=1;j<prow;j++){ if(Math.abs(py-(a.y + a.h*j/prow)) < 2.5) return false; }
    return true;
  }
  /* the side of a fishing boat, deck rail to waterline: the stem rakes forward at the bow (right),
     the stern is a rounded transom; below the waterline is the sea's business, not yours */
  function maskHull(px,py,a){
    var u = (px-a.x)/a.w, v = (py-a.y)/a.h;
    if(u<0||u>1||v<0||v>1) return false;
    var bowCut   = Math.pow(v, 1.35) * 0.20;          /* the stem leans back as it goes down */
    var sternCut = Math.pow(v, 2.2) * 0.07;           /* the transom tucks in a little */
    return u >= sternCut && u <= 1 - bowCut;
  }

  /* =========================================================
     JOB DEFINITIONS (scene pixels)
     ========================================================= */
  var JOBS = {
    driveway:  { name:"Driveway",        region:"grove",  scene:sceneDriveway,   area:{x:75,y:50,w:98,h:87},  hero:{x:44,y:116}, son:{x:22,y:112}, hose:{x:-8,y:124},
                 grimes:["dust","mud","mud","moss"], patchChance:0.35,
                 props:function(a){ ball(a.x+18, a.y+a.h-12); cone(a.x+a.w-14, a.y+a.h-4); } },
    patio:     { name:"Brick Patio",     region:"grove",  scene:scenePatio,      area:{x:75,y:52,w:94,h:82},  hero:{x:40,y:120}, son:{x:64,y:102}, hose:{x:-8,y:142},
                 grimes:["moss","mud","moss","mud"], patchChance:0.35,
                 props:function(a){ pot(a.x+12, a.y+a.h-8); cafeChair(a.x+a.w-16, a.y+a.h-4, true); } },
    deck:      { name:"Back Deck",       region:"grove",  scene:sceneDeck,       area:{x:72,y:50,w:100,h:76}, hero:{x:38,y:100}, son:{x:60,y:88},  hose:{x:-8,y:130},
                 grimes:["moss","moss","mud","moss"], patchChance:0.35,
                 props:function(a){ pot(a.x+12, a.y+a.h-8); grill(a.x+a.w-16, a.y+a.h-10); } },
    fence:     { name:"Garden Fence",    region:"grove",  scene:sceneFence,      area:{x:30,y:54,w:182,h:50}, hero:{x:48,y:132}, son:{x:76,y:132}, hose:{x:-8,y:148}, vertical:true,
                 grimes:["dust","moss","moss","mud"],
                 props:function(a){ bush(a.x+40, a.y+a.h+2, 0.8); cat(a.x+120, a.y-1); } },
    windows:   { name:"Tower Windows",   region:"city",   scene:sceneWindows,    area:{x:38,y:2,w:164,h:112}, hero:{x:75,y:124}, son:{x:104,y:124}, hose:{x:62,y:136}, vertical:true, patches:6,
                 grimes:["dust","soot","soot","grease"],
                 over:function(){ var cx0=60, cw=120, py=126; FX(cx0+12,0,1,py,P.ink); FX(cx0+13,0,1,py,P.c1); FX(cx0+cw-12,0,1,py,P.ink); FX(cx0+cw-11,0,1,py,P.c1); } },
    storefront:{ name:"Storefront Glass",region:"city",   scene:sceneStorefront, area:{x:43,y:46,w:120,h:62}, hero:{x:198,y:130}, son:{x:170,y:126}, hose:{x:248,y:140}, vertical:true,
                 grimes:["soot","grease","soot","soot"], graffitiChance:0.4,
                 props:function(a){ bike(a.x+34, a.y+a.h+6); } },
    garage:    { name:"Parking Garage",  region:"city",   scene:sceneGarage,     area:{x:59,y:30,w:118,h:76}, hero:{x:46,y:138}, son:{x:74,y:132}, hose:{x:-8,y:146}, vertical:true, patchChance:0.3,
                 grimes:["grease","soot","grease","soot"], graffitiChance:0.45,
                 props:function(a){ cone(a.x+18, a.y+a.h+2); bin(a.x+a.w-16, a.y+a.h+2); } },
    hull:      { name:"Boat Hull",       region:"harbor", scene:sceneHull,       area:{x:66,y:50,w:132,h:36}, hero:{x:36,y:104}, son:{x:14,y:104}, hose:{x:-8,y:106}, mask:maskHull, vertical:true, ragged:false,
                 grimes:["moss","rust","rust","salt","rust"],
                 props:function(a){ ladder(a.x+a.w-46, a.y+4, 30); } },
    dock:      { name:"Pier Railing",    region:"harbor", scene:sceneDock,       area:{x:60,y:60,w:120,h:44}, hero:{x:40,y:104}, son:{x:204,y:104}, hose:{x:-8,y:106}, vertical:true, patchChance:0.3,
                 grimes:["moss","salt","moss","salt"],
                 props:function(a){ lobsterTrap(a.x+14, a.y+a.h+2); ropeCoil(a.x+a.w-14, a.y+a.h+2); } },
    shack:     { name:"Fish Shack",      region:"harbor", scene:sceneShack,      area:{x:60,y:40,w:120,h:66}, hero:{x:38,y:106}, son:{x:194,y:106}, hose:{x:-8,y:108}, vertical:true, patchChance:0.3,
                 grimes:["salt","grease","salt","salt"],
                 props:function(a){ crate(a.x+16, a.y+a.h-6, 9); barrel(a.x+a.w-12, a.y+a.h-5); } }
  };


