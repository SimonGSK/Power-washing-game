  /* =========================================================
     SCENES — each draws the world, leaving the wash area bare.
     Scale: a person is 29 px tall (≈1.8 m), so ~16 px per metre.
     ========================================================= */
  function paintArea(a, col){ R(a.x, a.y, a.w, a.h, col); }
  function areaFrame(a){ R(a.x-1,a.y-1,a.w+2,1,P.ink); R(a.x-1,a.y-1,1,a.h+2,P.ink); R(a.x+a.w,a.y-1,1,a.h+2,P.ink); R(a.x-1,a.y+a.h,a.w+2,1,P.ink); }
  function regionSky(horizon){ var r = REGIONS[job ? job.region : state.region]; sky(r.sky[0], r.sky[1], horizon); }
  function clouds(rng, horizon, n){ for(var i=0;i<n;i++){ cloud(20 + Math.floor(rng()*200), 3 + Math.floor(rng()*Math.max(3, horizon-14)), 16 + Math.floor(rng()*16)); } }
  function skyline(y, far){
    var xs = [0,18,30,52,66,90,108,124,150,166,186,204,222];
    for(var i=0;i<xs.length;i++){ var h = 8 + ((i*7)%14), w = 10 + ((i*5)%8); var c = far ? mix(P.c3, "#b0c3d0", 0.5) : (i&1 ? P.c2 : P.c3); R(xs[i], y-h, w, h, c); R(xs[i], y-h, w, 1, P.c4); for(var wy=y-h+2; wy<y-2; wy+=3) for(var wx=xs[i]+2; wx<xs[i]+w-1; wx+=3) if(NIGHT ? ((wx*3+wy)&3)!==0 : ((wx+wy)&3)===0) (function(wx,wy){ lit(function(){ R(wx,wy,1,1,NIGHT ? "#ffd57a" : (far ? "#ffffff" : P.sunHi)); }); })(wx,wy); }
  }
  function jetty(x,y,w,h){ box(x,y,w,h,P.p3,P.p4,P.p1); for(var px=x+6; px<x+w; px+=7) R(px,y,1,h,P.p2); R(x-1,y+h+1,w+2,1,P.w1); R(x+2,y+h,2,5,P.p1); R(x+w-4,y+h,2,5,P.p1); }

  function sceneDriveway(a, rng){
    regionSky(22); sun(220, 4); clouds(rng, 22, 3);
    grassField(0,22,CW,CH-22,rng); fireflies(0,60,CW,90,rng);
    hedgeRow(0, 20, CW, 5);
    houseFacade(50, 6, 150, 44, P.parch, P.coral);
    box(a.x+3, 18, a.w-6, 32, P.p3, P.p4, P.p1);
    for(var gy=24; gy<50; gy+=6){ R(a.x+3,gy,a.w-6,1,P.p2); R(a.x+3,gy+1,a.w-6,1,P.p4); }
    R(a.x+a.w/2-4, 44, 8, 2, P.stone);
    winPane(56, 22, 16, 13); winPane(178, 22, 16, 13); windowBox(56, 40, 16, rng); windowBox(178, 40, 16, rng);
    porchLight(a.x-1, 20); porchLight(a.x+a.w+1, 20);
    paintArea(a, P.c3); for(var yy=a.y+12; yy<a.y+a.h; yy+=12) R(a.x,yy,a.w,1,P.c2); R(a.x,a.y,a.w,1,P.c4);
    for(var k=0;k<5;k++){ var cx=a.x+6+Math.floor(rng()*(a.w-14)), cy=a.y+4+Math.floor(rng()*(a.h-8)); R(cx,cy,3,1,P.c2); R(cx+3,cy+1,2,1,P.c2); }
    R(a.x, a.y+a.h, a.w, CH-(a.y+a.h), P.c4); R(a.x,a.y+a.h,a.w,1,P.c2); R(a.x+a.w/2-1, a.y+a.h+2, 2, 8, P.c3);
    R(a.x-1,a.y,1,CH-a.y,P.ink); R(a.x+a.w,a.y,1,CH-a.y,P.ink);
    tree(22, 60, 1); bush(48, 74, 0.9); rock(64, 66, 6);
    gnome(66, 104); hoseReel(62, 82);
    stones(36, 134, 3);
    picketFence(186, 76, 54); cat(216, 74); bush(200, 56, 1); tree(226, 60, 0.9);
    mailbox(190, 122); flowerBed(186, 96, 48, 14, rng); bike(226, 138);
    laundryLine(196, 58, 40); dog(14, 144); ball(64, 128); sprinkler(210, 140); smoke(184, 4);
    bird(120, 12, P.berry); bird(60, 8, P.water);
  }

  function scenePatio(a, rng){
    regionSky(14); clouds(rng, 14, 2);
    grassField(0,14,CW,CH-14,rng); fireflies(0,60,CW,90,rng);
    hedgeRow(0, 12, CW, 14);
    houseFacade(72, -2, 98, 54, P.parchLo, P.p2);
    winPane(88, 22, 22, 14); windowBox(88, 41, 22, rng); doorway(130, 18, 18, 34, P.water);
    R(74, 52, 94, 2, P.c3); R(74,54,94,1,P.c1);
    paintArea(a, P.s3);
    var bw=14, bh=7;
    for(var y=a.y; y<a.y+a.h; y+=bh){
      var off = (Math.floor((y-a.y)/bh)%2)*7;
      R(a.x, y, a.w, 1, P.s2);
      for(var x=a.x-bw+off; x<a.x+a.w; x+=bw){ if(x>a.x) R(x, y, 1, bh, P.s2); if(x+2>a.x && x+2<a.x+a.w-2) R(x+2, y+2, 3, 1, P.s4); }
    }
    pot(30, 62); pot(16, 100); bench(36, 132); hoseReel(24, 86);
    grill(206, 64); pot(214, 106); rock(228, 128, 8);
    tree(16, 46, 0.85); flowerBed(190, 118, 42, 16, rng); bush(178, 30, 0.9); bush(62, 134, 0.8);
    stones(186, 88, 3); cat(18, 110); birdbath(200, 88); ball(48, 144); smoke(154, -2);
    bird(200, 6, P.water); bird(24, 4, P.berry);
  }

  function sceneDeck(a, rng){
    regionSky(12); clouds(rng, 12, 2);
    grassField(0,12,CW,CH-12,rng); fireflies(0,60,CW,90,rng);
    houseFacade(50, -6, 140, 55, P.parch, "#4d7f6f");
    winPane(74, 18, 20, 14); winPane(146, 18, 20, 14);
    doorway(110, 14, 20, 35, P.p2);
    paintArea(a, P.p3);
    for(var py=a.y+7; py<a.y+a.h; py+=8){ R(a.x,py,a.w,1,P.p2); R(a.x,py+1,a.w,1,P.p4); }
    for(var px=a.x+16; px<a.x+a.w; px+=32){ R(px,a.y,1,a.h,P.p2); R(px+1,a.y+3,1,1,P.p1); }
    R(a.x-4, a.y+a.h+1, a.w+8, 3, P.p3); R(a.x-4, a.y+a.h+1, a.w+8, 1, P.p4); R(a.x-4,a.y+a.h+4,a.w+8,1,P.ink);
    for(var rx=a.x-2; rx<a.x+a.w+4; rx+=10){ R(rx, a.y+a.h+4, 2, 8, P.p3); R(rx+1, a.y+a.h+4, 1, 8, P.p2); }
    R(a.x-4, a.y+a.h+12, a.w+8, 1, P.g1);
    pot(16, 82); grill(30, 120); bench(208, 84); pot(216, 128);
    tree(18, 48, 0.8); bush(222, 44, 1); rock(230, 64, 6); bush(40, 142, 0.9);
    stones(196, 100, 3); cat(20, 98); laundryLine(196, 60, 36); dog(214, 144); smoke(174, -2);
  }

  function sceneFence(a, rng){
    regionSky(10); sun(14, 4); clouds(rng, 10, 1);
    grassField(0,10,CW,CH-10,rng); fireflies(0,50,CW,100,rng);
    hedgeRow(0, 10, CW, 36);
    tree(36, 46, 1.1); tree(200, 44, 0.95); bush(228, 98, 0.9);
    paintArea(a, P.p4);
    for(var px=a.x+5; px<a.x+a.w; px+=6){ R(px,a.y,1,a.h,P.p2); if(((px/6)&3)===0) R(px+3,a.y+Math.round(a.h*0.4),1,1,P.p1); }
    R(a.x, a.y+Math.round(a.h*0.22), a.w, 2, P.p2); R(a.x, a.y+Math.round(a.h*0.72), a.w, 2, P.p2);
    for(var t=a.x+2; t<a.x+a.w; t+=6) R(t, a.y-2, 2, 2, P.p4);
    R(a.x-1, a.y+a.h+1, a.w+2, 1, P.g1);
    flowerBed(6, 116, 30, 16, rng); flowerBed(166, 118, 62, 18, rng);
    bush(106, 128, 1.1); gnome(132, 134); pot(26, 100); rock(150, 110, 6);
    stones(96, 108, 4); bird(60, 6, P.coral); cat(128, 116); birdbath(14, 104); ball(44, 142); sprinkler(150, 140);
  }

  function sceneWindows(a, rng){
    /* high on a tower: sky on both sides, one uniform facade in the middle; the dirt marks the area */
    sky("#8fbfdc", "#c9e3ef", CH); clouds(rng, 60, 3);
    skyline(CH, true); skyline(CH+10, true);
    var fx0 = 36, fw = 168;
    R(fx0-1, 0, fw+2, CH, P.ink); R(fx0, 0, fw, CH, P.c3);
    for(var band=4; band<CH; band+=26){
      R(fx0, band, fw, 6, P.c4); R(fx0, band, fw, 1, "#ffffff"); R(fx0, band+5, fw, 1, P.c2);
      R(fx0, band+6, fw, 20, P.waterHi); R(fx0, band+6, fw, 2, "#ffffff");
      for(var mx=fx0; mx<fx0+fw; mx+=12) R(mx, band+6, 2, 20, "#6d7b86");
      R(fx0, band+24, fw, 2, "#6d7b86");
      if(NIGHT){ (function(band){ lit(function(){ for(var wx=fx0+2; wx<fx0+fw-2; wx+=12) if(((wx*7+band)%5)!==0){ R(wx, band+7, 8, 18, "#ffd57a"); R(wx+1, band+8, 2, 2, "#fff0c4"); } }); })(band); }
      else for(var lit0=fx0+4; lit0<fx0+fw; lit0+=24) if(((lit0+band)&5)===0) R(lit0, band+9, 6, 8, P.sunHi);
      for(var cx=fx0+8; cx<fx0+fw; cx+=36) if(((cx+band)&7)===0) R(cx, band+12, 5, 3, P.parchLo);   /* a blind, half down */
    }
    R(fx0, 0, 1, CH, P.c4); R(fx0+fw-1, 0, 1, CH, P.c1);
    /* the cradle: cables from the roof, a platform, a bucket, a cone */
    var py = a.y + a.h + 12;
    var a2 = { x: 60, y: 0, w: 120, h: 0 }; a = { x: 60, y: a.y + a.h - 82, w: 120, h: 82 };  /* the cradle keeps its old span under the wider area */
    R(a.x+12, 0, 1, py, P.ink); R(a.x+a.w-12, 0, 1, py, P.ink); R(a.x+13, 0, 1, py, P.c1); R(a.x+a.w-11, 0, 1, py, P.c1);
    box(a.x+2, py, a.w-4, 5, P.sun, P.sunHi, P.sunLo);
    for(var st=a.x+6; st<a.x+a.w-6; st+=8) R(st, py+1, 4, 1, P.ink);
    box(a.x+2, py-9, 3, 9, P.stone, P.c4, null); box(a.x+a.w-5, py-9, 3, 9, P.stone, P.c4, null);
    R(a.x+2, py-10, a.w-4, 1, P.stoneLo);
    box(a.x+a.w-22, py-7, 8, 6, P.water, P.waterHi, P.waterLo); R(a.x+a.w-21,py-9,6,1,P.ink);
    cone(a.x+a.w-34, py);
    seagull(14, 40); seagull(226, 30); seagull(20, 90);
  }

  function sceneStorefront(a, rng){
    R(0,0,CW,CH,"#b6bcc0");
    R(0,0,CW,14,"#9aa2a8"); R(0,14,CW,1,P.c1); skyline(14);
    pavement(0, 108, CW, 42, P.c3); R(0,108,CW,1,P.c4);
    R(0,134,CW,16,P.c1); R(0,134,CW,1,P.c2); crosswalk(60, 138, 60); manhole(190, 142);
    box(28, 8, 184, 104, P.parchLo, P.parchHi, P.s3);
    for(var by=14; by<108; by+=5) R(29, by, 182, 1, mix(P.parchLo,"#000000",0.1));
    paintArea(a, P.waterHi); R(a.x,a.y,a.w,2,"#ffffff");
    R(a.x, a.y+Math.round(a.h*0.5)-1, a.w, 3, P.p2);
    for(var rx=a.x+4; rx<a.x+a.w-4; rx+=16) R(rx, a.y+3, 1, 6, "#ffffff");
    awning(30, 24, 180, 12);
    glassDoor(172, 66, 20, 42, "#4d7f6f");
    lit(function(){ box(173, 70, 18, 7, NIGHT ? "#ffd57a" : P.parchHi, null, null); pxText(175, 71, "OPEN", NIGHT ? "#c0392b" : P.leafLo, 1); });
    box(84, 10, 72, 11, P.p1, P.p2, null); lit(function(){ pxText(98, 13, "CAFE", NIGHT ? "#fff0c4" : P.sunHi, 1); R(88,13,3,5,NIGHT ? "#ff9a6a" : P.coral); R(89,12,1,1,NIGHT ? "#ff9a6a" : P.coral); R(145,13,3,5,NIGHT ? "#ff9a6a" : P.coral); R(146,12,1,1,NIGHT ? "#ff9a6a" : P.coral); });
    if(NIGHT){ lit(function(){ for(var lx=36; lx<204; lx+=12) R(lx, 36, 3, 1, "#fff0c4"); }); glowCone(120, 37, 172, 176, 10, "#8a7448"); }
    flowerBed(36, 100, 30, 8, rng);
    streetLamp(22, 118); hydrant(222, 118); bin(234, 124); dumpster(18, 134); cone(64, 130);
    R(44,118,6,12,P.p3); R(45,116,4,2,P.p3); R(44,118,1,12,P.p1); R(49,118,1,12,P.p1); R(46,121,2,3,P.parchHi);
    cafeChair(78, 130, true); cafeTable(92, 130); cafeChair(106, 130, false);
    cafeChair(124, 132, true); cafeTable(138, 132); cafeChair(152, 132, false);
    cat(120, 106);
    seagull(72, 30); bird(150, 6, P.sun);
  }

  function sceneGarage(a, rng){
    /* an underground level, seen from the front: ceiling, block wall, floor with bays */
    R(0,0,CW,CH,P.c2);
    R(0,0,CW,16,P.c1); R(0,15,CW,1,P.ink); pipes(0, 6, CW);
    lit(function(){ R(50,10,24,3,NIGHT ? "#fff6d0" : P.sunHi); R(50,13,24,1,NIGHT ? "#ffe08a" : P.c4); R(166,10,24,3,NIGHT ? "#fff6d0" : P.sunHi); R(166,13,24,1,NIGHT ? "#ffe08a" : P.c4); }); R(58,4,8,6,P.stoneLo); R(174,4,8,6,P.stoneLo);
    glowCone(62, 14, 26, 70, 94, "#7d6a44"); glowCone(178, 14, 26, 70, 94, "#7d6a44");
    /* block wall */
    for(var by=16; by<108; by+=8){ R(0,by,CW,1,P.c1); var off = ((by/8)&1)*10; for(var bxx=off; bxx<CW; bxx+=20) R(bxx,by,1,8,P.c1); }
    R(0,107,CW,1,P.ink);
    lit(function(){ R(100,20,40,9,NIGHT ? "#ffd24a" : P.sun); R(100,20,40,1,NIGHT ? "#fff0c4" : P.sunHi); }); R(101,23,4,3,P.ink); R(107,23,4,3,P.ink); R(113,23,4,3,P.ink); R(119,23,4,3,P.ink); R(127,22,6,5,P.ink); R(129,24,2,1,P.sun);
    pillar(12, 16, 16, 92); pillar(212, 16, 16, 92);
    /* the wash section is just more of the same wall; the yellow line runs right through it */
    R(0,60,CW,3,P.sun); R(0,63,CW,1,P.sunLo);
    /* floor with bay lines */
    pavement(0, 108, CW, 42, P.c3);
    for(var bay=30; bay<CW; bay+=50){ R(bay, 112, 2, 30, P.sunHi); }
    R(0,108,CW,1,P.c4); manhole(120, 144);
    car(200, 130, P.water); cone(176, 140); cone(140, 132);
    dumpster(18, 138); bin(94, 142);
    box(32, 70, 24, 9, "#4d7f6f", "#6a9c8c", "#3c6a5c"); for(var i=0;i<4;i++) R(35+i*5, 73, 3, 3, P.parchHi); R(52,72,3,5,P.parchHi);
    R(196, 100, 24, 12, P.c1); R(198, 102, 20, 8, P.c4); for(var g=0; g<3; g++) R(200+g*6, 104, 4, 4, [P.coral, P.water, P.sun][g]);
  }

  function sceneHull(a, rng){
    /* a fishing boat moored alongside the pier, floating: the waterline is the bottom of the job */
    var wl = a.y + a.h;                                   /* the waterline */
    regionSky(wl); clouds(rng, 50, 3);
    lighthouse(216, wl, 26); sailboat(30, wl-1);
    waterField(0, wl, CW, CH-wl, rng);
    var deck = a.y, bowX = a.x + a.w, sternX = a.x;
    /* wheelhouse on the stern half, a mast amidships with a boom and a pennant */
    var cabX = a.x + 14, cabW = 40;
    box(cabX, deck-26, cabW, 26, P.parch, P.parchHi, P.parchLo);
    R(cabX-2, deck-27, cabW+4, 2, "#4d7f6f"); R(cabX-2, deck-28, cabW+4, 1, P.ink);
    winPane(cabX+4, deck-21, 12, 8); winPane(cabX+22, deck-21, 12, 8);
    lifeRing(cabX+cabW-6, deck-6); R(cabX+cabW+2, deck-16, 6, 4, P.stoneLo); R(cabX+cabW+2, deck-16, 6, 1, P.stone);   /* a vent */
    var mastX = a.x + Math.round(a.w*0.62);
    R(mastX, deck-58, 2, 58, P.ink); R(mastX+1, deck-58, 1, 58, P.p2);
    R(mastX-10, deck-40, 22, 2, P.ink); R(mastX-9, deck-40, 20, 1, P.p3);              /* the boom */
    for(var i=0;i<7;i++){ R(mastX+2, deck-57+i, Math.round(12 - Math.abs(i-3)*3)+2, 1, P.coral); }
    if(NIGHT) lit(function(){ R(mastX-1, deck-61, 4, 2, "#ffffff"); }); if(NIGHT) glowDisc(mastX+1, deck-60, 5, 3, "#8a7448");
    /* bulwark: the rail that runs along the deck edge, capped in wood */
    R(sternX-2, deck-5, a.w+4, 5, P.c4); R(sternX-2, deck-5, a.w+4, 1, P.p3); R(sternX-2, deck-6, a.w+4, 1, P.ink); R(sternX-2, deck-1, a.w+4, 1, P.c2);
    for(var st=sternX+6; st<bowX-4; st+=10) R(st, deck-4, 1, 3, P.c2);
    /* the hull side: a stepped silhouette from the mask, pale above, a red boot-top at the waterline */
    for(var py=a.y; py<wl; py++) for(var px=a.x; px<bowX; px++){
      if(!maskHull(px+0.5,py+0.5,a)) continue;
      var edge = !maskHull(px-0.5,py+0.5,a) || !maskHull(px+1.5,py+0.5,a);
      var col = py >= wl-4 ? P.berry : (py >= wl-5 ? P.ink : (py < a.y+3 ? P.c3 : P.c4));
      R(px,py,1,1, edge ? P.ink : col);
    }
    for(var pl=a.y+6; pl<wl-8; pl+=5) for(var px2=a.x+6; px2<bowX-10; px2+=2) if(maskHull(px2+0.5,pl+0.5,a) && maskHull(px2+6,pl+0.5,a)) R(px2,pl,1,1,P.c3);
    for(var ph=a.x+22; ph<bowX-30; ph+=22){ R(ph, a.y+8, 5, 5, P.ink); R(ph+1, a.y+9, 3, 3, NIGHT ? "#ffd57a" : P.waterHi); }   /* portholes */
    pxText(a.x+8, a.y+18, "MARY B", P.waterLo, 1);
    /* the boat sits in the water: foam along the hull, its dark reflection underneath */
    foamLine(a.x-2, wl, a.w+4);
    for(var rr=wl+2; rr<wl+14; rr+=2){ var inset = Math.round((rr-wl)*1.6); R(a.x+4+inset, rr, a.w-8-inset*2, 1, mix(P.w2, P.ink, 0.35)); }
    R(a.x+a.w-30, wl+3, 3, 1, "#ffffff"); R(a.x+12, wl+4, 3, 1, "#ffffff");
    /* mooring: a line from the bow cleat down to the quay bollard */
    R(sternX-8, deck-2, 8, 1, P.p1); R(sternX-14, deck-1, 7, 1, P.p1); R(sternX-18, deck, 5, 1, P.p1);
    /* the pier you stand on, and the far end of the quay */
    pier(0, 104, 72, 6); pier(196, 104, 44, 6);
    pierLamp(60, 104); pierLamp(232, 104);
    bollard(22, 104); crate(50, 102, 8); ropeCoil(10, 102);
    barrel(212, 104); buoy(228, 92); lobsterTrap(224, 106);
    seagull(48, 24); seagull(64, 18); seagull(192, 28); seagull(120, 12);
  }

  function sceneDock(a, rng){
    /* a fishing pier from the side: the moss-green railing boards are the job */
    regionSky(64); clouds(rng, 44, 2); sun(20, 6);
    lighthouse(222, 64, 22); sailboat(120, 62); sailboat(60, 63);
    waterField(0, 64, CW, 86, rng);
    boatSide(200, 84, P.coral);
    /* railing: vertical boards with a top rail and a bottom rail */
    R(a.x-4, a.y-4, a.w+8, 4, P.p2); R(a.x-4, a.y-4, a.w+8, 1, P.p4); R(a.x-5, a.y-5, a.w+10, 1, P.ink);
    paintArea(a, P.p3);
    for(var bx0=a.x+5; bx0<a.x+a.w; bx0+=6){ R(bx0, a.y, 1, a.h, P.p1); R(bx0+1, a.y, 1, a.h, P.p4); }
    R(a.x, a.y+Math.round(a.h*0.5), a.w, 2, P.p2);
    R(a.x-4, a.y+a.h, a.w+8, 3, P.p2); R(a.x-4, a.y+a.h, a.w+8, 1, P.p4);
    /* the deck across the whole pier, on poles */
    pier(0, 104, CW, 7);
    pierLamp(30, 104); pierLamp(212, 104);
    lifeRing(a.x-14, a.y+8); R(a.x-15, a.y+2, 1, 6, P.ink);
    ropeCoil(14, 102); bollard(28, 104); lobsterTrap(216, 106); crate(232, 102, 8);
    seagull(105, 16); seagull(125, 24); seagull(70, 10);
  }

  function sceneShack(a, rng){
    /* the shack stands on the pier over the water */
    regionSky(74); clouds(rng, 40, 2);
    lighthouse(226, 74, 30); sailboat(30, 72);
    waterField(0, 74, CW, 76, rng);
    /* roof: stepped gable with shingle rows */
    for(var i=0;i<14;i++){ var rw = Math.round((a.w+36) * (i+1)/14); var rx0 = a.x + Math.round(a.w/2) - Math.round(rw/2); R(rx0, a.y-28+i*2, rw, 2, i===0 ? P.ink : "#4d7f6f"); if(i>0 && (i&1)) for(var sx=rx0+2; sx<rx0+rw-2; sx+=5) R(sx, a.y-28+i*2, 2, 1, "#3c6a5c"); }
    R(a.x-18, a.y-1, a.w+36, 1, P.ink); R(a.x-16, a.y-3, a.w+32, 1, "#3c6a5c");
    R(a.x+Math.round(a.w/2)-1, a.y-32, 2, 5, P.c1); R(a.x+Math.round(a.w/2)-2, a.y-33, 4, 1, P.ink);
    paintArea(a, P.p4);
    for(var py=a.y+6; py<a.y+a.h; py+=7){ R(a.x,py,a.w,1,P.p3); }
    for(var k=0;k<6;k++){ R(a.x+3+Math.floor(rng()*(a.w-6)), a.y+2+Math.floor(rng()*(a.h-4)), 1, 3, P.p2); }
    netHang(a.x+8, a.y+10, 30, 38);
    buoy(a.x+a.w-18, a.y+22); buoy(a.x+a.w-30, a.y+35); lifeRing(a.x+a.w-12, a.y+50);
    sign(a.x+a.w/2-20, a.y+4, 40, P.parchHi);
    if(NIGHT){ lit(function(){ R(a.x+a.w/2-22, a.y+2, 2, 1, "#fff0c4"); R(a.x+a.w/2+20, a.y+2, 2, 1, "#fff0c4"); }); glowCone(a.x+a.w/2, a.y+3, 44, 52, 8, "#8a7448"); }
    pier(0, 106, CW, 6);
    pierLamp(40, 106); pierLamp(200, 106);
    bollard(12, 106); lobsterTrap(228, 108); crate(214, 104, 9); ropeCoil(24, 104);
    seagull(a.x+Math.round(a.w*0.5), a.y-40); seagull(60, 30); seagull(200, 40);
  }
