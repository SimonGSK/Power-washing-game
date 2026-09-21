  /* =========================================================
     GRIME ENGINE — layered, cell based (2×2 scene pixels per cell)
     ========================================================= */
  var grime = null, jitter = null, gCols = 0, gRows = 0;
  var REF_CELLS = 2100;   /* a driveway's worth of cells (≈92×92 px): the dirt budget every job is sized to */
  var grimeTotal = 0, grimeLeft = 0;

  function makeNoise(w,h,scale,rng){
    var cw = Math.max(2, Math.ceil(w/scale)+1), ch = Math.max(2, Math.ceil(h/scale)+1);
    var coarse = new Float32Array(cw*ch);
    for(var i=0;i<coarse.length;i++) coarse[i] = rng();
    var out = new Float32Array(w*h);
    for(var y=0;y<h;y++){
      var fy=y/scale, y0=Math.min(ch-1,Math.floor(fy)), y1=Math.min(ch-1,y0+1), ty=fy-y0;
      for(var x=0;x<w;x++){
        var fxv=x/scale, x0=Math.min(cw-1,Math.floor(fxv)), x1=Math.min(cw-1,x0+1), tx=fxv-x0;
        var a=coarse[y0*cw+x0], b=coarse[y0*cw+x1], c=coarse[y1*cw+x0], d=coarse[y1*cw+x1];
        out[y*w+x] = lerp(lerp(a,b,tx), lerp(c,d,tx), ty);
      }
    }
    return out;
  }

  function buildGrime(rng){
    var a = job.area, def = job.def, type = job.grime;
    gCols = Math.ceil(a.w/CELL); gRows = Math.ceil(a.h/CELL);
    grime = new Float32Array(gCols*gRows);
    jitter = new Float32Array(gCols*gRows);
    var n1 = makeNoise(gCols,gRows, 9, rng);
    var n2 = makeNoise(gCols,gRows, 3, rng);
    var edgeN = makeNoise(gCols,gRows, 5, rng);
    var drips = []; if(def.vertical){ for(var d=0; d<Math.round(gCols/6); d++) drips.push({ c: Math.floor(rng()*gCols), w: 1 + Math.floor(rng()*2), len: 0.3 + rng()*0.7 }); }
    var types = job.types.filter(function(t){ return !t.graffiti; }), hasGraffiti = job.types.some(function(t){ return t.graffiti; });
    cellType = new Uint8Array(gCols*gRows);
    cellColor = null;
    var typeNoise = types.map(function(){ return makeNoise(gCols,gRows, 7, rng); });
    var layers = types.length ? Math.max.apply(null, types.map(function(t){ return t.layers; })) : type.layers;
    var margin = def.ragged === false ? 0 : Math.max(3, Math.round(Math.min(gCols, gRows) * 0.16));
    grimeTotal = 0;
    if(!types.length){ buildGraffiti(rng, job.types.indexOf(job.types.filter(function(t){ return t.graffiti; })[0])); return; }
    /* scattered patches instead of one field: always on the tower, sometimes elsewhere */
    var nPatches = def.patches || (def.patchChance && rng() < def.patchChance ? 3 + Math.floor(rng()*3) : 0);
    var patches = [];
    for(var pi=0; pi<nPatches; pi++) patches.push({ x: 0.1 + rng()*0.8, y: 0.1 + rng()*0.8, r: 0.14 + rng()*0.16, sx: 0.7 + rng()*0.8 });
    var patchN = nPatches ? makeNoise(gCols,gRows, 4, rng) : null;
    var pass = 0;
    while(true){
    grimeTotal = 0;
    for(var cy=0; cy<gRows; cy++){
      for(var cx=0; cx<gCols; cx++){
        var i = cy*gCols+cx;
        jitter[i] = rng();
        var px = a.x + cx*CELL + CELL/2, py = a.y + cy*CELL + CELL/2;
        if(def.mask && !def.mask(px,py,a)){ grime[i] = 0; continue; }
        var v = n1[i]*0.74 + n2[i]*0.26;
        /* which dirt sits here: the strongest of the type fields, first type favoured a little */
        var tBest = 0, tVal = -1;
        for(var tt=0; tt<types.length; tt++){ var tv = typeNoise[tt][i] * (tt === 0 ? 1.08 : 1); if(tv > tVal){ tVal = tv; tBest = tt; } }
        cellType[i] = job.types.indexOf(types[tBest]);
        var tLayers = types[tBest].layers;
        var hp = 0.70 + v * (tLayers - 0.30);
        if(nPatches){
          var inside = 0;
          for(var q=0;q<patches.length;q++){ var pq=patches[q]; var dd = Math.hypot((cx/gCols - pq.x)*pq.sx, (cy/gRows - pq.y)/pq.sx); inside = Math.max(inside, 1 - dd/pq.r); }
          inside += (patchN[i]-0.5)*0.5;
          if(inside < 0.05){ grime[i] = 0; continue; }
          hp *= Math.min(1, inside + 0.4);
        }
        /* ragged edge: near the border the dirt thins out and breaks up instead of stopping on a line */
        if(margin){
          var ed = Math.min(cx, cy, gCols-1-cx, gRows-1-cy) / margin;
          var keep = Math.min(1, ed) + (edgeN[i]-0.5)*0.9;
          if(keep < 0.35){ grime[i] = 0; continue; }
          hp *= Math.min(1, keep + 0.35);
        }
        /* gravity: a wall or window carries more at the bottom, with a few drip streaks */
        if(def.vertical){
          var ny = cy/(gRows-1);
          hp *= 0.55 + 0.7*ny;
          for(var k=0;k<drips.length;k++){ var dr=drips[k]; if(cx>=dr.c && cx<dr.c+dr.w && ny <= dr.len) hp += 0.9; }
        }
        hp = Math.min(tLayers, Math.max(0.40, hp));
        grime[i] = hp;
        grimeTotal += hp;
      }
    }
    /* the same amount of work every time, wherever the dirt sits — and however big the wall:
       the budget is sized for a normal job (REF_CELLS), so the tower doesn't get twice the dirt.
       Too little coverage → grow the patches; short → thicken; over budget → thin the whole field */
    var ref = Math.min(gCols*gRows, REF_CELLS);
    var target = ref * 0.78 * (0.7 + 0.5*(layers-0.3));
    var covered = 0; for(var cc=0; cc<grime.length; cc++) if(grime[cc] > 0) covered++;
    if(nPatches && covered < ref*0.42 && pass < 3){ pass++; patches.forEach(function(pq){ pq.r *= 1.3; }); continue; }
    /* a big surface spreads the dirt over far more cells, and every cell is a pass of the wand:
       drop the thinnest cells (the fringes) until it's a normal job's worth of ground to cover */
    var maxCover = Math.round(ref * 0.83);
    if(covered > maxCover){
      var vals = []; for(var cv=0; cv<grime.length; cv++) if(grime[cv] > 0) vals.push(grime[cv]);
      vals.sort(function(a,b){ return a-b; });
      var cutHp = vals[covered - maxCover];
      grimeTotal = 0;
      for(var cd=0; cd<grime.length; cd++){ if(grime[cd] > 0 && grime[cd] <= cutHp && jitter[cd] < 0.9) grime[cd] = 0; grimeTotal += grime[cd]; }
    }
    if(grimeTotal < target){
      var scale = Math.min(1.7, target/Math.max(1, grimeTotal));
      grimeTotal = 0;
      for(var sc=0; sc<grime.length; sc++){ if(grime[sc] > 0){ grime[sc] = Math.min(layers, grime[sc]*scale); grimeTotal += grime[sc]; } }
    } else if(grimeTotal > target*1.05){
      /* over budget: keep the shape, lighten everything to the budget */
      var cut = grimeTotal/target;
      grimeTotal = 0;
      for(var sd=0; sd<grime.length; sd++){ if(grime[sd] > 0){ grime[sd] = Math.max(0.40, grime[sd]/cut); grimeTotal += grime[sd]; } }
    }
    break;
    }
    if(hasGraffiti) buildGraffiti(rng, job.types.indexOf(job.types.filter(function(t){ return t.graffiti; })[0]), true);
    grimeLeft = grimeTotal;
    cellsTotal = 0; cellsClear = 0;
    for(var k=0;k<grime.length;k++) if(grime[k] > 0.03) cellsTotal++;
  }

  var cellColor = null, cellType = null;
  var GRAFFITI_WORDS = ["WASH","YO","SAL","PWC","BOO","ZAP","WOW","ACE","MAX","RAD","FLY","HI","SUDS","NOPE"];
  var GRAFFITI_INK = ["#d43d6a","#2f7fd8","#f2c12e","#3fbf6b","#f26d3d","#ffffff","#8f5fb5"];
  function buildGraffiti(rng, typeIdx, overTop){
    cellColor = cellColor || new Array(gCols*gRows);
    var layers = GRIME_TYPES.graffiti.layers, stamped = {};
    function setCell(cx,cy,col,hp){
      if(cx<0||cy<0||cx>=gCols||cy>=gRows) return; var i=cy*gCols+cx;
      if(stamped[i]) return;
      if(grime[i]>0){ if(!overTop) return; grimeTotal -= grime[i]; }
      grime[i]=hp; cellColor[i]=col; cellType[i]=typeIdx; stamped[i]=1; grimeTotal+=hp;
    }
    function tag(word, x0, y0, s, col, shadow){
      /* letters from the 3×5 font, s cells per pixel, with a one-cell drop shadow */
      for(var li=0; li<word.length; li++){
        var g = FONT[word[li]]; if(!g) continue;
        for(var k=0;k<15;k++){ if(g[k]!=="1") continue; var gx0 = x0 + li*4*s + (k%3)*s, gy0 = y0 + Math.floor(k/3)*s;
          for(var dy=0;dy<s;dy++) for(var dx=0;dx<s;dx++){ setCell(gx0+dx+1, gy0+dy+1, shadow, layers-1); }
        }
      }
      for(var li2=0; li2<word.length; li2++){
        var g2 = FONT[word[li2]]; if(!g2) continue;
        for(var k2=0;k2<15;k2++){ if(g2[k2]!=="1") continue; var gx1 = x0 + li2*4*s + (k2%3)*s, gy1 = y0 + Math.floor(k2/3)*s;
          for(var dy2=0;dy2<s;dy2++) for(var dx2=0;dx2<s;dx2++){ var i2=(gy1+dy2)*gCols+(gx1+dx2); if(gx1+dx2>=0&&gx1+dx2<gCols&&gy1+dy2>=0&&gy1+dy2<gRows){ if(stamped[i2]){ grimeTotal -= grime[i2]; grime[i2]=0; delete stamped[i2]; } setCell(gx1+dx2, gy1+dy2, col, layers); } }
        }
      }
    }
    function ring(cx,cy,r,col){ for(var a=0;a<64;a++){ var t=a/64*Math.PI*2; setCell(Math.round(cx+Math.cos(t)*r), Math.round(cy+Math.sin(t)*r*0.8), col, layers-1); setCell(Math.round(cx+Math.cos(t)*r)+1, Math.round(cy+Math.sin(t)*r*0.8), col, layers-1); } }
    function stroke(x0,y0,x1,y1,col){ var n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for(var i=0;i<=n;i++){ var x=Math.round(x0+(x1-x0)*i/n), y=Math.round(y0+(y1-y0)*i/n); setCell(x,y,col,layers-1); setCell(x+1,y,col,layers-1); setCell(x,y+1,col,layers-1); } }
    var nTags = 2 + Math.floor(rng()*2);
    for(var tI=0; tI<nTags; tI++){
      var word = GRAFFITI_WORDS[Math.floor(rng()*GRAFFITI_WORDS.length)];
      var s = 3 + Math.floor(rng()*2);
      var w = word.length*4*s, h = 5*s;
      if(w > gCols-4) { s = 3; w = word.length*4*s; h = 5*s; }
      var x0 = 2 + Math.floor(rng()*Math.max(1, gCols-w-4)), y0 = 2 + Math.floor(rng()*Math.max(1, gRows-h-4));
      var col = GRAFFITI_INK[Math.floor(rng()*GRAFFITI_INK.length)];
      tag(word, x0, y0, s, col, mix(col, "#000000", 0.55));
    }
    var doodles = 1 + Math.floor(rng()*3);
    for(var dI=0; dI<doodles; dI++){
      var col2 = GRAFFITI_INK[Math.floor(rng()*GRAFFITI_INK.length)];
      if(rng() < 0.5) ring(4+Math.floor(rng()*(gCols-8)), 4+Math.floor(rng()*(gRows-8)), 3+Math.floor(rng()*5), col2);
      else { var sx=Math.floor(rng()*gCols), sy=Math.floor(rng()*gRows); stroke(sx, sy, clamp(sx+Math.floor((rng()-0.5)*30),0,gCols-1), clamp(sy+Math.floor((rng()-0.5)*20),0,gRows-1), col2); }
    }
    if(!overTop){
      grimeLeft = grimeTotal;
      cellsTotal = 0; cellsClear = 0;
      for(var k3=0;k3<grime.length;k3++) if(grime[k3] > 0.03) cellsTotal++;
    }
  }

  /* a cell is a flat 2×2 square in one of the three layer shades;
     the last of the top coat erodes to a checker before it goes */
  function paintCell(cx,cy){
    var a = job.area, i = cy*gCols+cx, hp = grime[i];
    var px = a.x + cx*CELL, py = a.y + cy*CELL;
    var w = Math.min(CELL, a.x + a.w - px), h = Math.min(CELL, a.y + a.h - py);
    if(w<=0||h<=0) return;
    gx.clearRect(px,py,w,h);
    if(hp <= 0.03) return;
    var ct = job.types[cellType ? cellType[i] : 0] || job.grime;
    if(ct.graffiti && cellColor && cellColor[i]){
      /* graffiti fades: the paint lightens and breaks up as it comes off */
      var f = hp / ct.layers, gcol = mix(cellColor[i], "#ffffff", (1-f)*0.55);
      gx.fillStyle = shade(gcol);
      if(f > 0.75){ gx.fillRect(px, py, w, h); }
      else if(f > 0.5){ gx.fillRect(px, py, w, 1); gx.fillRect(px, py+1, 1, 1); }
      else if(f > 0.25){ gx.fillRect(px, py, 1, 1); gx.fillRect(px+1, py+1, 1, 1); }
      else { gx.fillRect(px, py, 1, 1); }
      return;
    }
    var shades = job.shadesByType[cellType ? cellType[i] : 0] || job.shadesByType[0];
    var idx = Math.min(4, Math.floor(hp)), f = hp - Math.floor(hp);
    var ca = shade(shades[idx]), cb = shade(shades[Math.min(4, idx+1)]);
    var odd = jitter[i] < 0.5 ? 0 : 1;
    if(idx === 0 && hp < 0.45){
      gx.fillStyle = ca; gx.fillRect(px+odd, py, 1, 1); gx.fillRect(px+1-odd, py+1, 1, 1);
    } else if(idx < 4 && f >= 0.85){
      gx.fillStyle = cb; gx.fillRect(px, py, w, h);
    } else if(idx < 4 && f > 0.35){
      gx.fillStyle = ca; gx.fillRect(px, py, w, h);
      gx.fillStyle = cb; gx.fillRect(px+odd, py, 1, 1); gx.fillRect(px+1-odd, py+1, 1, 1);
    } else {
      gx.fillStyle = ca; gx.fillRect(px, py, w, h);
    }
  }

  function drawAllGrime(){
    gx.clearRect(0,0,CW,CH);
    for(var cy=0; cy<gRows; cy++){
      for(var cx=0; cx<gCols; cx++) paintCell(cx,cy);
    }
  }

  function sprayGrime(x, y, radius, power, chemId){
    if(!grime) return 0;
    chemId = chemId || state.activeChem;
    var a = job.area;
    var c0 = Math.floor((x-radius-a.x)/CELL), c1 = Math.floor((x+radius-a.x)/CELL);
    var r0 = Math.floor((y-radius-a.y)/CELL), r1 = Math.floor((y+radius-a.y)/CELL);
    c0 = Math.max(0,c0); r0 = Math.max(0,r0);
    c1 = Math.min(gCols-1,c1); r1 = Math.min(gRows-1,r1);
    var removed = 0, rr2 = radius*radius;
    for(var cy=r0; cy<=r1; cy++){
      for(var cx=c0; cx<=c1; cx++){
        var i = cy*gCols+cx, hp = grime[i];
        if(hp <= 0) continue;
        var px = a.x + cx*CELL + CELL/2, py = a.y + cy*CELL + CELL/2;
        var dx = px-x, dy = py-y, d2 = dx*dx + dy*dy;
        if(d2 > rr2) continue;
        var fall = 1 - (Math.sqrt(d2)/radius)*coneEdge();
        var ct = job.types[cellType ? cellType[i] : 0] || job.grime;
        var eff = chemId === "auto" ? 1 : chemFactor(ct, chemId);
        var take = Math.min(hp, power*fall*eff / job.tough);
        var left = hp - take;
        if(left <= 0.2){ take = hp; left = 0; }          /* the last smear comes off with the pass */
        grime[i] = left;
        removed += take;
        if(hp > 0.03 && left <= 0.03) cellsClear++;
        paintCell(cx,cy);
      }
    }
    grimeLeft -= removed;
    return removed;
  }

  var cellsTotal = 0, cellsClear = 0;
  /* the contract zone: cells inside it, and how many are clear */
  function contractProgress(){
    if(!job || !job.contract || !grime) return 0;
    var z = job.contract, clear = 0;
    for(var cy=z.cy; cy<z.cy+z.ch; cy++) for(var cx=z.cx; cx<z.cx+z.cw; cx++){ if(z.mask[(cy-z.cy)*z.cw+(cx-z.cx)] && grime[cy*gCols+cx] <= 0.03) clear++; }
    return z.total ? clear/z.total : 1;
  }
  function makeContract(rng){
    var cw = Math.round(gCols*(0.32 + rng()*0.18)), ch = Math.round(gRows*(0.32 + rng()*0.18));
    var cx = Math.floor(rng()*(gCols-cw)), cy = Math.floor(rng()*(gRows-ch));
    var mask = [], total = 0;
    for(var y=cy; y<cy+ch; y++) for(var x=cx; x<cx+cw; x++){ var dirty = grime[y*gCols+x] > 0.03; mask.push(dirty ? 1 : 0); if(dirty) total++; }
    if(total < 12) return null;
    var a = job.area;
    return { cx:cx, cy:cy, cw:cw, ch:ch, mask:mask, total:total, x:a.x+cx*CELL, y:a.y+cy*CELL, w:cw*CELL, h:ch*CELL, bonus:0.30 };
  }
  function drawContract(){
    var z = job.contract; if(!z) return;
    var done = contractProgress() >= 0.999, col = done ? P.leafHi : P.sunHi;
    for(var x=z.x; x<z.x+z.w; x+=4){ FX(x, z.y-1, 2, 1, col); FX(x, z.y+z.h, 2, 1, col); }
    for(var y=z.y; y<z.y+z.h; y+=4){ FX(z.x-1, y, 1, 2, col); FX(z.x+z.w, y, 1, 2, col); }
    FX(z.x-2, z.y-2, 3, 3, col); FX(z.x+z.w-1, z.y-2, 3, 3, col); FX(z.x-2, z.y+z.h-1, 3, 3, col); FX(z.x+z.w-1, z.y+z.h-1, 3, 3, col);
  }
  function cleanliness(){
    if(!grimeTotal) return 1;
    var byHp = clamp(1 - grimeLeft/grimeTotal, 0, 1);
    var byCells = cellsTotal ? cellsClear/cellsTotal : 1;
    return clamp(byCells*0.7 + byHp*0.3, 0, 1);
  }

  /* =========================================================
     PARTICLES + CHARACTER FX — whole pixels, no alpha
     ========================================================= */
  var particles = [];
  function splash(x,y,color,n){
    n = n || 4;
    for(var i=0;i<n;i++){
      particles.push({
        x:x, y:y, vx:(Math.random()*2-1)*0.6, vy:-(0.2+Math.random()*0.6),
        life:1, size: Math.random()<0.3 ? 2 : 1,
        color: Math.random()<0.45 ? color : P.waterHi, type:"drop"
      });
    }
  }
  function burst(x,y,color){
    for(var i=0;i<26;i++){
      var a = Math.random()*Math.PI*2, sp = 0.45+Math.random()*1.05;
      particles.push({ x:x, y:y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-0.35, life:1, size:Math.random()<0.5?2:1, color:color, type:"drop" });
    }
  }
  function rainDrop(){
    particles.push({ x: Math.random()*CW, y:-3, vx:-0.15, vy:2+Math.random()*0.8, life:1, size:1, color:P.waterHi, type:"rain" });
  }
  function FX(x,y,w,h,c){ fx.fillStyle = shade(c); fx.fillRect(Math.round(x), Math.round(y), w, h); }

  function drawParticles(){
    for(var i=particles.length-1;i>=0;i--){
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if(p.type==="rain"){
        if(p.y > CH+3){ particles.splice(i,1); continue; }
        FX(p.x, p.y, 1, 3, p.color);
        continue;
      }
      p.vy += 0.055; p.life -= 0.035;
      if(p.life <= 0){ particles.splice(i,1); continue; }
      FX(p.x, p.y, p.life < 0.35 ? 1 : p.size, p.life < 0.35 ? 1 : p.size, p.color);
    }
  }

  /* stair-stepped line of 2×2 blocks (Bresenham) */
  function pxLine(x0,y0,x1,y1,c,t){
    t = t || 1;
    x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
    var dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx+dy;
    for(var n=0;n<400;n++){
      FX(x0,y0,t,t,c);
      if(x0===x1 && y0===y1) break;
      var e2=2*err;
      if(e2>=dy){ err+=dy; x0+=sx; }
      if(e2<=dx){ err+=dx; y0+=sy; }
    }
  }

  /* sprites: parts are drawn twice — first grown by one pixel in ink for a single silhouette
     outline, then in colour — so the figure reads as one body, not a pile of boxes */
  function sprite(parts){
    for(var i=0;i<parts.length;i++){ var p=parts[i]; FX(p[0]-1, p[1]-1, p[2]+2, p[3]+2, P.ink); }
    for(var j=0;j<parts.length;j++){ var q=parts[j]; FX(q[0], q[1], q[2], q[3], q[4]); }
  }
  /* The washer: 14×29, feet at (x,y); the wand snaps to one of 8 directions */
  function drawWasher(){
    var h = job.def.hero, x = h.x, y = h.y, ax = aim.x, ay = aim.y;
    var facing = ax >= x ? 1 : -1;
    var handX = x + facing*7, handY = y - 13;
    var ang = Math.atan2(ay - handY, ax - handX);
    ang = Math.round(ang / (Math.PI/4)) * (Math.PI/4);
    var hs = job.def.hose;
    var hx = x - facing*5;
    FX(Math.min(hs.x, hx), y+1, Math.abs(hx-hs.x)+1, 2, P.waterLo);
    FX(hx, y-12, 2, 14, P.waterLo);
    FX(x-7, y+2, 14, 1, P.g1);
    Sprites.draw(fx, "hero", "idle", x, y, facing < 0);
    pxLine(x + facing*5, y-14, handX, handY, P.water, 2);
    pxLine(handX, handY, handX + facing, handY, P.skin, 2);
    var wandLen = 10;
    var tipX = handX + Math.cos(ang)*wandLen, tipY = handY + Math.sin(ang)*wandLen;
    pxLine(handX, handY, tipX, tipY, P.ink, 2);
    pxLine(handX + Math.cos(ang), handY + Math.sin(ang), tipX - Math.cos(ang), tipY - Math.sin(ang), P.stone, 1);
    FX(tipX, tipY, 2, 2, P.sun);
    return { tipX:tipX, tipY:tipY, ang:ang };
  }

  /* Your son stands a few steps from you and plinks at the dirt near your aim */
  var son = { x:0, y:0, target:null, flash:0, acc:0 };
  function sonPos(){ return job.def.son || { x: job.def.hero.x - 24, y: job.def.hero.y - 16 }; }
  function sonTick(dt){
    if(!sonHired()) return;
    son.acc += dt;
    if(son.flash > 0) son.flash -= dt;
    if(son.acc < sonIntervalMs()) return;
    son.acc = 0;
    /* he looks for dirt on his own: a handful of random cells, the dirtiest wins */
    var a = job.area, best = null, bestHp = 0.2;
    for(var s=0; s<24 && grime; s++){
      var ci = Math.floor(Math.random()*grime.length);
      if(grime[ci] > bestHp){ bestHp = grime[ci]; best = ci; }
    }
    if(best === null) return;
    var tx = a.x + (best % gCols)*CELL + 1, ty = a.y + Math.floor(best/gCols)*CELL + 1;
    son.target = { x:tx, y:ty }; son.flash = 420;
    var removed = sprayGrime(tx, ty, sonRadius(), 0.32, state.activeChem);
    if(removed > 0.2) splash(tx, ty, job.grime.splash, 2);
    updateClean();
  }
  function drawSon(){
    if(!sonHired()) return;
    var p = sonPos(), x = p.x, y = p.y, tx = son.target ? son.target.x : aim.x, ty = son.target ? son.target.y : aim.y;
    var facing = tx >= x ? 1 : -1;
    FX(x-5, y+2, 10, 1, P.g1);
    Sprites.draw(fx, "son", "idle", x, y, facing < 0);
    /* a proper water gun: yellow body, green tank on top, orange muzzle, held out at chest height */
    var gx0 = facing>0 ? x+5 : x-5, gy0 = y-8;
    var gxl = facing>0 ? gx0 : gx0-9;
    FX(gxl-1, gy0-1, 11, 5, P.ink);                               /* outline */
    FX(gxl, gy0, 9, 3, P.sun); FX(gxl, gy0, 9, 1, P.sunHi);       /* body */
    FX(facing>0 ? gxl+2 : gxl+3, gy0-4, 4, 4, P.ink); FX(facing>0 ? gxl+3 : gxl+4, gy0-3, 2, 3, P.leaf); FX(facing>0 ? gxl+3 : gxl+4, gy0-3, 2, 1, P.leafHi); /* tank */
    FX(facing>0 ? gxl+9 : gxl-1, gy0+1, 1, 1, P.coral);           /* muzzle */
    FX(facing>0 ? gxl+1 : gxl+6, gy0+3, 3, 3, P.ink); FX(facing>0 ? gxl+2 : gxl+7, gy0+3, 1, 2, P.sunLo); /* grip */
    if(son.flash > 0 && son.target){
      /* a thin arc of single drops, like a real water gun */
      var sx = facing>0 ? gxl+10 : gxl-2, sy = gy0+1;
      var dx = tx - sx, dy = ty - sy, n = 22;
      for(var i=1;i<n;i++){ var t = i/n, arc = -Math.sin(t*Math.PI)*9; if(i%2===0) FX(sx + dx*t + (i%4===0 ? 1 : 0), sy + dy*t + arc, 1, 1, i%6===0 ? "#ffffff" : P.waterHi); }
      for(var k=0;k<5;k++){ var an = Math.random()*Math.PI*2, rr = sonRadius()*(0.4+Math.random()*0.6); FX(tx + Math.cos(an)*rr, ty + Math.sin(an)*rr, 1, 1, k&1 ? P.waterHi : "#ffffff"); }
    }
  }

  /* WashBot 3000: rides along, blasts the dirtiest spot it can find, any chemical */
  var bot = { target:null, flash:0, acc:0 };
  function botPos(){ var h = job.def.hero, a = job.area; var side = h.x > a.x + a.w/2 ? -1 : 1; return { x: clamp(h.x + side*26, 10, CW-10), y: h.y }; }
  function botTick(dt){
    if(!state.perks.washbot) return;
    bot.acc += dt; if(bot.flash > 0) bot.flash -= dt;
    if(bot.acc < 350) return;
    bot.acc = 0;
    var best = null, bestHp = 0.2;
    for(var s=0; s<40 && grime; s++){ var ci = Math.floor(Math.random()*grime.length); if(grime[ci] > bestHp){ bestHp = grime[ci]; best = ci; } }
    if(best === null) return;
    var a = job.area, tx = a.x + (best % gCols)*CELL + 1, ty = a.y + Math.floor(best/gCols)*CELL + 1;
    bot.target = { x:tx, y:ty }; bot.flash = 200;
    var removed = sprayGrime(tx, ty, 6, 1.4, "auto");
    if(removed > 0.2) splash(tx, ty, P.waterHi, 3);
    updateClean();
  }
  function drawBot(){
    if(!state.perks.washbot) return;
    var p = botPos(), x = p.x, y = p.y, tx = bot.target ? bot.target.x : x, ty = bot.target ? bot.target.y : y-8;
    FX(x-6, y+1, 12, 1, P.g1);
    Sprites.draw(fx, "bot", "idle", x, y, tx < x);
    var facing = tx >= x ? 1 : -1;
    FX(facing>0 ? x+5 : x-8, y-8, 3, 2, P.ink); FX(facing>0 ? x+8 : x-9, y-8, 1, 2, P.sun);
    if(bot.flash > 0 && bot.target){
      var sx = facing>0 ? x+9 : x-9, sy = y-7, dx = tx-sx, dy = ty-sy;
      for(var i=1;i<24;i++){ var t = i/24; FX(sx+dx*t, sy+dy*t + (i%2), 1, 1, i%3===0 ? "#ffffff" : P.waterHi); }
    }
  }

  function drawSprayCone(tip){
    var dx = aim.x - tip.tipX, dy = aim.y - tip.tipY;
    var len = Math.sqrt(dx*dx+dy*dy) || 1;
    var nx = dx/len, ny = dy/len, px = -ny, py = nx;
    var spread = sprayRadius()*0.6;
    /* drops along the jet, fanning out toward the target */
    for(var i=0;i<18;i++){
      var t = Math.random(), s = (Math.random()*2-1) * spread * t;
      FX(tip.tipX + nx*len*t + px*s, tip.tipY + ny*len*t + py*s, 1, 1, i&1 ? P.waterHi : "#ffffff");
    }
    /* impact: a loose ring of pixels */
    var r = sprayRadius()*0.7;
    for(var k=0;k<10;k++){
      var a = Math.random()*Math.PI*2, rr = r*(0.5+Math.random()*0.5);
      FX(aim.x + Math.cos(a)*rr, aim.y + Math.sin(a)*rr, 1, 1, k&1 ? P.waterHi : "#ffffff");
    }
  }

  /* =========================================================
     JOB LOOP
     ========================================================= */
  var job = null;
  var aim = { x:CW/2, y:CH/2 };
  var spraying = false, hovering = false, pressed = false, lastSprayPt = null, refilling = false;
  var rafId = null, lastTs = 0, sprayAcc = 0, foamAcc = 0, rainAcc = 0, refillT = 0;

  var forcedJob = null;   /* the test hook can pin a job */
  function pickJobDef(){
    if(forcedJob && JOBS[forcedJob]) return JOBS[forcedJob];
    var r = regionDef();
    var key = pick(r.jobs, state.jobsCompleted);
    return JOBS[key];
  }
  function pickGrimes(rng){
    var def = pickJobDef(), jobs = state.jobsCompleted;
    var pool = (def.grimes || regionDef().grimes).filter(function(id, i, arr){ return arr.indexOf(id) === i && DIRT_UNLOCK[id] <= jobs; });
    if(!pool.length) pool = ["dust"];
    var count = jobs < 6 ? 1 : (rng() < 0.45 ? 1 : (rng() < 0.6 ? 2 : 3));
    count = Math.min(count, pool.length);
    /* the newest dirt on the route is the most likely, so a new chemical matters right away */
    var picks = [], bag = pool.slice();
    while(picks.length < count && bag.length){
      var weights = bag.map(function(id){ return 1 + DIRT_UNLOCK[id]/10; }), sum = weights.reduce(function(a,b){ return a+b; }, 0), r = rng()*sum, k = 0;
      while(k < bag.length-1 && (r -= weights[k]) > 0) k++;
      picks.push(bag[k]); bag.splice(k,1);
    }
    if(def.graffitiChance && DIRT_UNLOCK.graffiti <= jobs && rng() < def.graffitiChance && picks.indexOf("graffiti") < 0) picks.push("graffiti");
    return picks.map(function(id){ return GRIME_TYPES[id]; });
  }

  function startJob(){
    var def = pickJobDef();
    var weather = WEATHERS[Math.floor(Math.random()*WEATHERS.length)];
    var seed = (state.jobsCompleted+1) * 2654435761 % 4294967296;
    var rng = makeRng(seed);
    var types = pickGrimes(rng);
    var type = types.reduce(function(best, t){ return t.pay > best.pay ? t : best; }, types[0]);   /* the dirtiest sets the pay */
    var shadesByType = types.map(function(t){ return t.shades.concat([mix(t.shades[2], PAL_FALLBACK.ink, 0.14), mix(t.shades[2], PAL_FALLBACK.ink, 0.28)]); });
    job = {
      def: def, area: def.area, grime: type, types: types, shadesByType: shadesByType, weather: weather, tough: grimeToughness(),
      duration: jobMs(), start: 0, tank: tankMax(), ended: false, started: false,
      region: state.region
    };

    showScreen("screen-job");
    $("jobName").textContent = def.name;
    $("jobSub").textContent = types.map(function(t){ return t.name; }).join(" + ") + " · " + regionDef().name + " · " + weather.name;
    /* after dark the scene paints itself dark (see NIGHT in props.js); only the weather tints */
    $("stageTint").style.background = NIGHT ? (weather.rain ? weather.tint : "transparent") : weather.tint;

    loadPalette();
    bx.clearRect(0,0,CW,CH);
    def.scene(def.area, rng);
    buildGrime(rng);
    job.contract = (contractsUnlocked() && rng() < contractChance()) ? makeContract(rng) : null;
    if(job.contract) job.contract.bonus = contractBonus();
    if(chemList().indexOf(state.activeChem) < 0) state.activeChem = "water";
    renderChemBar();
    job.tipMax = tipJarMax();
    drawAllGrime();
    fx.clearRect(0,0,CW,CH);
    particles = [];
    aim = { x: def.area.x + def.area.w/2, y: def.area.y + def.area.h/2 };
    spraying = false; hovering = false; pressed = false; lastSprayPt = null; refilling = false;
    sprayAcc = foamAcc = rainAcc = 0;
    son = { x:0, y:0, target:null, flash:0, acc:0 }; bot = { target:null, flash:0, acc:0 };
    setTank(job.tank); setClean(0); setTimer(job.duration);
    $("stageOverlay").classList.add("hidden");

    var fresh = types.filter(function(t){ return !state.info["dirt_"+t.id]; });
    var startIt = function(){ playIntro(function(){
      if(!job || job.ended) return;
      job.started = true;
      job.start = now();
      lastTs = 0;
      rafId = requestAnimationFrame(frame);
    }); };
    if(fresh.length){
      var t0 = fresh[0];
      tellInfo("dirt_"+t0.id, t0.icon, "New dirt: " + t0.name, t0.blurb + (t0.chem ? (chemOwned(t0.chem) ? " You have " + CHEMS[t0.chem].name + " — switch to it." : " <b>You don’t have " + CHEMS[t0.chem].name + " yet</b> — it’s in the Shop.") : ""), startIt);
    } else startIt();
  }

  function now(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }

  function playIntro(done){
    var r = regionDef();
    var el = document.createElement("div");
    el.id = "stageIntro";
    el.style.background = "linear-gradient(180deg,"+r.sky[0]+" 0%,"+r.sky[0]+" 55%,"+r.sky[1]+" 55%,"+r.sky[1]+" 100%)";
    var t = document.createElement("div");
    t.innerHTML = truckSVG();
    el.appendChild(t);
    stage.appendChild(el);
    var go = function(){ t.style.transform = "translateX(0)"; };
    if(window.requestAnimationFrame){ requestAnimationFrame(function(){ requestAnimationFrame(go); }); } else { go(); }
    setTimeout(function(){
      if(el.parentNode) el.parentNode.removeChild(el);
      done();
    }, 900);
  }

  function frame(ts){
    if(!job || job.ended){ rafId = null; return; }
    var dt = lastTs ? Math.min(80, ts - lastTs) : 16;
    lastTs = ts;

    var elapsed = now() - job.start;
    var left = job.duration - elapsed;
    setTimer(Math.max(0,left));
    if(left <= 0){ endJob("timeout"); return; }

    if(refilling){
      refillT += dt;
      var t = clamp(refillT / refillMs(), 0, 1);
      job.tank = lerp(refillFrom, tankMax(), t);
      setTank(job.tank);
      if(t >= 1){ refilling = false; job.tank = tankMax(); setTank(job.tank); $("stageOverlay").classList.add("hidden"); SFX.refill(); }
    }

    if(spraying && !refilling && job.tank > 0){
      sprayAcc += dt;
      while(sprayAcc >= 70){
        sprayAcc -= 70;
        sprayTick();
        if(job.tank <= 0){ beginRefill(); break; }
      }
    } else if(!spraying){
      sprayAcc = 0;
    }

    if(foamLevel() > 0){
      foamAcc += dt;
      var iv = Math.max(700, 1900 - foamLevel()*550);
      if(foamAcc >= iv){
        foamAcc = 0;
        var a = job.area;
        var fxp = a.x + 8 + Math.random()*(a.w-16), fyp = a.y + 8 + Math.random()*(a.h-16);
        sprayGrime(fxp, fyp, 10 + foamLevel()*2.5, 0.5, state.activeChem);
        splash(fxp, fyp, job.grime.splash, 5);
        job.tank = Math.max(0, job.tank - 8); setTank(job.tank);
        if(job.tank <= 0) beginRefill();
        updateClean();
      }
    }

    if(job.weather.rain){
      rainAcc += dt;
      if(rainAcc > 45){ rainAcc = 0; rainDrop(); rainDrop(); }
    }

    sonTick(dt); botTick(dt);

    fx.clearRect(0,0,CW,CH);
    if(job.def.over) job.def.over();
    drawContract();
    renderJobHud(left);
    if(job.def.props){ var keepBx = bx; bx = fx; job.def.props(job.area); bx = keepBx; }
    drawParticles();
    drawSon(); drawBot();
    var tip = drawWasher();
    var sprayingNow = spraying && !refilling && job.tank > 0;
    if(sprayingNow) drawSprayCone(tip);
    syncSpraySound(sprayingNow);

    rafId = requestAnimationFrame(frame);
  }

  function sprayTick(){
    var radius = sprayRadius();
    var power = sprayPower() * degreaserMult();
    var from = lastSprayPt || aim;
    var dx = aim.x - from.x, dy = aim.y - from.y;
    var dist = Math.sqrt(dx*dx+dy*dy);
    var steps = clamp(Math.round(dist/(radius*0.55)), 1, 6);
    /* the wand puts out a fixed amount per tick — sweeping spreads it thinner
       across more ground rather than multiplying it, so flailing the cursor
       doesn't out-clean a steady, deliberate pass */
    var per = power / Math.max(1, steps*0.75);
    var removed = 0;
    for(var i=1;i<=steps;i++){
      var t = steps === 1 ? 1 : i/steps;
      removed += sprayGrime(from.x + dx*t, from.y + dy*t, radius, per);
    }
    lastSprayPt = { x:aim.x, y:aim.y };
    job.tank = Math.max(0, job.tank - waterPerTick());
    setTank(job.tank);
    if(removed > 0.4) splash(aim.x, aim.y, job.grime.splash, 3);
    updateClean();
  }

  var refillFrom = 0;
  function beginRefill(){
    if(refilling) return;
    refilling = true; refillT = 0; refillFrom = job.tank;
    $("overlayText").textContent = "Refilling tank…";
    $("stageOverlay").classList.remove("hidden");
    shakeStage(); SFX.empty();
  }
  function shakeStage(){
    stage.classList.remove("is-shake");
    void stage.offsetWidth;
    stage.classList.add("is-shake");
  }

  function unitPct(pct){ return pct; }
  function setTank(v){
    var pct = clamp(v / tankMax() * 100, 0, 100);
    $("tankFill").style.width = pct + "%";
    $("tankLabel").textContent = Math.round(pct) + "%";
  }
  function setClean(frac){
    var pct = clamp(frac*100, 0, 100);
    $("cleanFill").style.width = pct + "%";
    $("cleanLabel").textContent = (pct >= 99.95 ? 100 : Math.floor(pct)) + "%";
  }
  function setTimer(ms){
    var pct = clamp(ms / job.duration * 100, 0, 100);
    var f = $("timerFill");
    f.style.width = pct + "%";
    f.parentNode.className = "pw-track pw-track--tall " + (pct < 25 ? "pw-track--bill" : "pw-track--gold");
    var secs = Math.max(0, Math.ceil(ms/1000));
    $("timeLabel").textContent = Math.floor(secs/60) + ":" + (secs%60 < 10 ? "0" : "") + (secs%60);
  }
  /* the chemical in the wand: buttons under the stage, keys 1–5 */
  function renderChemBar(){
    var bar = $("chemBar"); bar.innerHTML = "";
    var list = chemList();
    list.forEach(function(id, i){
      var b = document.createElement("button");
      b.className = "pw-btn pw-btn--small chem" + (state.activeChem === id ? " is-active" : "");
      b.style.setProperty("--face", CHEMS[id].color); b.style.setProperty("--face-hi", mix(CHEMS[id].color, "#ffffff", 0.4)); b.style.setProperty("--lift-c", mix(CHEMS[id].color, "#000000", 0.3));
      if(luma(CHEMS[id].color) < 0.45) b.style.color = "var(--parchment-hi)"; /* dark bottles get light text */
      b.innerHTML = ic(CHEMS[id].icon, "pw-btn__icon") + (i+1) + " · " + CHEMS[id].name;
      b.onclick = function(){ state.activeChem = id; save(); renderChemBar(); };
      bar.appendChild(b);
    });
    var need = job && job.types ? job.types.filter(function(t){ return t.chem && !chemOwned(t.chem); }) : [];
    $("chemHint").textContent = need.length ? "You don’t have " + need.map(function(t){ return CHEMS[t.chem].name; }).join(" or ") + " — that dirt will barely move. It’s in the Shop." : (job && job.types && job.types.some(function(t){ return t.chem; }) ? "Match the chemical to the dirt: the wrong one barely scratches it." : "Plain water handles this one.");
  }
  window.addEventListener("keydown", function(ev){
    if(!job || job.ended) return;
    var n = parseInt(ev.key, 10); if(!n) return;
    var list = chemList(); if(list[n-1]){ state.activeChem = list[n-1]; renderChemBar(); }
  });
  /* the tip you'd get right now: it shrinks as the customer waits */
  function tipJarMax(){ return 12 + Math.round(state.jobsCompleted*1.5) + Math.round(regionDef().pay*8); }
  function tipNow(msLeft){ if(lvl("tipjar") <= 0) return 0; return Math.round(job.tipMax * clamp(msLeft/job.duration, 0, 1)); }
  function renderJobHud(msLeft){
    var tipEl = $("tipBadge");
    if(lvl("tipjar") > 0){ tipEl.classList.remove("hidden"); $("tipVal").textContent = money(tipNow(msLeft)); }
    else tipEl.classList.add("hidden");
    if(job.contract){
      var pr = contractProgress();
      $("contractLine").classList.remove("hidden");
      $("contractVal").textContent = pr >= 0.999 ? "done" : Math.floor(pr*100) + "%";
      $("contractLine").classList.toggle("is-done", pr >= 0.999);
    } else $("contractLine").classList.add("hidden");
  }
  function updateClean(){
    var c = cleanliness();
    setClean(c);
    if(cellsTotal && cellsClear >= cellsTotal) endJob("complete");
  }

  /* pointer control — a mouse washes wherever it hovers; a finger or pen washes while held */
  function stagePoint(evt){
    var r = stage.getBoundingClientRect();
    if(!r.width || !r.height) return { x:aim.x, y:aim.y };
    var band = 6; /* the wood band sits inside the box */
    return {
      x: (evt.clientX - r.left - band) * (CW / (r.width - band*2)),
      y: (evt.clientY - r.top - band)  * (CH / (r.height - band*2))
    };
  }
  function updateSpraying(){
    var on = hovering && (pressed || lastPointerType === "mouse");
    if(on && !spraying){ lastSprayPt = { x:aim.x, y:aim.y }; sprayAcc = 70; }
    if(!on) lastSprayPt = null;
    spraying = on;
  }
  var sprayWasOn = false;
  function syncSpraySound(on){ if(on !== sprayWasOn){ sprayWasOn = on; if(on) SFX.sprayOn(); else SFX.sprayOff(); } }
  var lastPointerType = "mouse";
  stage.addEventListener("pointerenter", function(e){ lastPointerType = e.pointerType || "mouse"; hovering = true; aim = stagePoint(e); updateSpraying(); });
  stage.addEventListener("pointerleave", function(){ hovering = false; pressed = false; updateSpraying(); });
  stage.addEventListener("pointerdown", function(e){
    if(!job || job.ended || !job.started) return;
    e.preventDefault();
    lastPointerType = e.pointerType || "mouse";
    hovering = true; pressed = true; aim = stagePoint(e);
    updateSpraying();
  });
  window.addEventListener("pointermove", function(e){
    if(!job || job.ended) return;
    aim = stagePoint(e);
    if(e.pointerType && e.pointerType !== "mouse"){ hovering = pressed; }
  });
  window.addEventListener("pointerup", function(){ pressed = false; updateSpraying(); });
  window.addEventListener("pointercancel", function(){ pressed = false; hovering = false; updateSpraying(); });

  function stopJobLoop(){
    if(rafId && window.cancelAnimationFrame) cancelAnimationFrame(rafId);
    rafId = null; spraying = false; hovering = false; pressed = false; refilling = false;
    syncSpraySound(false);
  }
