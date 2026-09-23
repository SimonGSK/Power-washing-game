  /* =========================================================
     PIXEL PROP LIBRARY — flat rects only, whole pixels only
     ========================================================= */
  /* NIGHT — every colour that goes through R/FX/the grime painter/the sprite rasteriser is pulled
     toward a deep blue after dark, except inside lit(): lamps, windows and glows keep their colour.
     The dither in glow*() stands in for alpha, which the design system doesn't allow. */
  var NIGHT = false, LIT = false, nightCache = {};
  var NIGHT_INK = "#121838";
  function setNight(on){ NIGHT = !!on; nightCache = {}; }
  /* where the lamps throw light: the grime painter reads this so dirt under a lamp is lit too */
  var LIGHT = null;
  function resetLight(){ LIGHT = NIGHT ? new Uint8Array(CW*CH) : null; }
  function markLight(x, y){ if(LIGHT && x>=0 && y>=0 && x<CW && y<CH) LIGHT[y*CW+x] = 1; }
  function lightAt(x, y){ return !!(LIGHT && x>=0 && y>=0 && x<CW && y<CH && LIGHT[y*CW+x]); }
  function shade(c){
    if(!NIGHT || LIT || !c || c.charAt(0) !== "#") return c;
    var k = nightCache[c]; if(k) return k;
    var v = hex(c), l = (0.299*v[0]+0.587*v[1]+0.114*v[2])/255;
    k = mix(c, NIGHT_INK, 0.46 + 0.2*l);     /* bright colours drop further, so lit things pop */
    nightCache[c] = k; return k;
  }
  function lit(fn){ var was = LIT; LIT = true; fn(); LIT = was; }
  var PROPREC = null;   /* set while measuring a job's props: every rect they'd draw */
  function R(x,y,w,h,c){ if(PROPREC){ PROPREC.push([Math.round(x),Math.round(y),Math.round(w),Math.round(h)]); return; } if(AUDIT && bx === AUDIT.ctx) auditRect(x,y,w,h); bx.fillStyle = shade(c); bx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  /* the prop audit (tests only): which prop drew each rect into the scene, by the calling function's name */
  var AUDIT = null, AUDIT_SKIP = { R:1, box:1, dither:1, blob:1, auditRect:1, auditCaller:1, lit:1, Error:1, raster:1, draw:1, drawAt:1, glowCone:1, glowDisc:1, shade:1, mix:1, ellipseRows:1, pxText:1 };
  function auditCaller(){
    var lines = (new Error().stack || "").split("\n");
    for(var i=1;i<lines.length;i++){ var m = /at (?:Object\.)?([A-Za-z_$][\w$]*) \(/.exec(lines[i]); if(m && !AUDIT_SKIP[m[1]]) return m[1]; }
    return "?";
  }
  /* surface painters: what they draw inside the wash area IS the thing being washed */
  var AUDIT_SURFACE = { startJob:1, paintArea:1, sky:1, stars:1, moon:1, cloud:1, grassField:1, fireflies:1, waterField:1, pavement:1, towerSlab:1, skyline:1, pillar:1, pipes:1, winPane:1, glowCone:1, glowDisc:1 };
  /* scenes that paint their surface by hand mark where it ends, for the audit */
  function surfaceDone(){ if(AUDIT) AUDIT.list.push({ x:0, y:0, w:0, h:0, by:"paintArea" }); }
  function auditRect(x,y,w,h){ AUDIT.list.push({ x:Math.round(x), y:Math.round(y), w:Math.round(w), h:Math.round(h), by:auditCaller() }); }
  /* a lamp's throw: a widening checkerboard of warm pixels under a light (x = centre of the top edge) */
  function glowCone(x, y, topW, bottomW, h, col){
    if(!NIGHT) return;
    lit(function(){
      col = col || "#b89a58";
      for(var r=0;r<h;r++){ var w = topW + (bottomW-topW)*r/Math.max(1,h-1), x0 = Math.round(x-w/2), x1 = Math.round(x+w/2);
        for(var px=x0; px<x1; px++){ markLight(px, y+r); if(((px + y + r) & 1) === 0) R(px, y+r, 1, 1, col); } }
    });
  }
  /* a soft pool of light around a bulb */
  function glowDisc(cx, cy, rx, ry, col){
    if(!NIGHT) return;
    lit(function(){
      col = col || "#b89a58";
      for(var yy=-ry; yy<=ry; yy++){ var hw = Math.round(rx*Math.sqrt(Math.max(0, 1 - (yy*yy)/(ry*ry))));
        for(var xx=-hw; xx<=hw; xx++){ markLight(cx+xx, cy+yy); if(((cx+xx + cy+yy) & 1) === 0) R(cx+xx, cy+yy, 1, 1, col); } }
    });
  }
  function stars(horizon){
    lit(function(){
      for(var i=0;i<52;i++){ var sx = (i*97 + 13) % CW, sy = (i*53 + 5) % Math.max(4, horizon-6);
        var c = (i%5===0) ? "#ffffff" : (i%3===0 ? "#cfd8ff" : "#8d99cf"); R(sx,sy,1,1,c);
        if(i%11===0){ R(sx-1,sy,1,1,"#6f7cb5"); R(sx+1,sy,1,1,"#6f7cb5"); R(sx,sy-1,1,1,"#6f7cb5"); R(sx,sy+1,1,1,"#6f7cb5"); } }
    });
  }
  function moon(x,y){
    lit(function(){
      var rows = ellipseRows(11, 11, false);
      blob(x, y, rows, function(r, dx){ return (r===3 && dx===1) || (r===6 && dx===-2) || (r===7 && dx===2) ? "#d8d4b8" : "#f6f2d8"; }, "#8d99cf");
      /* the dark side */
      for(var r=0;r<11;r++){ var bite = Math.round(4*Math.sqrt(Math.max(0, 1 - Math.pow((r-5)/5.5,2)))); if(bite>0) R(x+2-bite, y+r, bite, 1, NIGHT_INK); }
    });
  }
  function box(x,y,w,h,fill,hi,lo){
    R(x,y-1,w,1,P.ink); R(x,y+h,w,1,P.ink); R(x-1,y,1,h,P.ink); R(x+w,y,1,h,P.ink);
    R(x,y,w,h,fill);
    if(hi) R(x+1,y,w-2,1,hi); if(lo) R(x+1,y+h-1,w-2,1,lo);
  }
  function dither(x,y,w,h,a,b){
    for(var j=0;j<h;j++) for(var i=0;i<w;i++) R(x+i,y+j,1,1,((i+j)&1)?a:b);
  }
  function mix(a,b,t){
    var pa=hex(a), pb=hex(b);
    return "#"+[0,1,2].map(function(i){ var v=Math.round(pa[i]+(pb[i]-pa[i])*t); return (v<16?"0":"")+v.toString(16); }).join("");
  }
  function hex(h){ h=h.replace("#",""); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
  function luma(c){ var v=hex(c); return (0.299*v[0]+0.587*v[1]+0.114*v[2])/255; }
  /* a stepped blob: hws[i] is the half-width of row i; colorAt(row, dx) paints the inside,
     outline gets drawn where an inside pixel touches the outside */
  function blob(cx, top, hws, colorAt, outline){
    var H = hws.length;
    function inside(r, dx){ return r>=0 && r<H && dx >= -hws[r] && dx < hws[r]; }
    for(var r=0;r<H;r++){
      for(var dx=-hws[r]; dx<hws[r]; dx++){
        var edge = !inside(r-1,dx) || !inside(r+1,dx) || !inside(r,dx-1) || !inside(r,dx+1);
        R(cx+dx, top+r, 1, 1, edge && outline !== null ? (outline||P.ink) : colorAt(r, dx));
      }
    }
  }
  function ellipseRows(w, h, flatBottom){
    var rows = [];
    for(var i=0;i<h;i++){ var t=(i-(h-1)/2)/((h-1)/2); rows.push(Math.max(1, Math.round(w/2*Math.sqrt(Math.max(0,1-t*t))))); }
    if(flatBottom){ var cut = Math.round(h*0.8); rows = rows.slice(0, cut); }
    return rows;
  }
  function sky(top, bottom, horizon){
    if(NIGHT){
      lit(function(){ var t = "#0b1030", b = "#2a3d70", m = mix(t, b, 0.5), h1 = Math.round(horizon*0.5), h2 = Math.round(horizon*0.82);
        R(0,0,CW,h1,t); dither(0,h1,CW,2,t,m); R(0,h1+2,CW,h2-h1-2,m); dither(0,h2,CW,2,m,b); R(0,h2+2,CW,horizon-h2-2,b); });
      stars(horizon); moon(218, 6);
      return;
    }
    var mid = mix(top, bottom, 0.5);
    var h1 = Math.round(horizon*0.45), h2 = Math.round(horizon*0.8);
    R(0,0,CW,h1,top); dither(0,h1,CW,2,top,mid); R(0,h1+2,CW,h2-h1-2,mid); dither(0,h2,CW,2,mid,bottom); R(0,h2+2,CW,horizon-h2-2,bottom);
  }
  function sun(x,y){ if(NIGHT) return; R(x,y,10,10,P.sun); R(x+2,y-2,6,14,P.sun); R(x-2,y+2,14,6,P.sun); R(x+2,y+2,4,4,P.sunHi); R(x+3,y-4,4,1,P.sunHi); R(x+3,y+13,4,1,P.sunHi); R(x-4,y+3,1,4,P.sunHi); R(x+13,y+3,1,4,P.sunHi); }
  function cloud(x,y,w){
    var h = Math.max(4, Math.round(w/4));
    var rows = ellipseRows(w, h*2, true);
    blob(x, y, rows, function(r,dx){ return r >= rows.length-1 ? P.c4 : "#ffffff"; }, null);
    /* a second lobe for a puffier top */
    var rows2 = ellipseRows(Math.round(w*0.5), h+2, true);
    blob(x+Math.round(w*0.1), y-Math.round(h*0.5), rows2, function(){ return "#ffffff"; }, null);
  }
  function fireflies(x,y,w,h,rng){ if(!NIGHT) return; lit(function(){ for(var i=0;i<Math.round(w*h/900);i++){ var fx0=x+Math.floor(rng()*w), fy0=y+Math.floor(rng()*h); R(fx0,fy0,1,1,"#e8ff8a"); if(i&1) R(fx0+1,fy0,1,1,"#9ab84a"); } }); }
  function grassField(x,y,w,h,rng){
    R(x,y,w,h,P.g3);
    /* mowing stripes */
    var stripe = mix(P.g3, P.g4, 0.18);
    for(var sy=y+((y/6)&1)*6; sy<y+h; sy+=12) R(x, sy, w, Math.min(6, y+h-sy), stripe);
    /* darker patches */
    for(var p=0;p<Math.round(w*h/2600);p++){ var pw=6+Math.floor(rng()*10), ph=3+Math.floor(rng()*3); var px=x+Math.floor(rng()*(w-pw)), py=y+Math.floor(rng()*(h-ph)); R(px+1,py,pw-2,ph,mix(P.g3,P.g2,0.5)); R(px,py+1,pw,ph-2,mix(P.g3,P.g2,0.5)); }
    var n = Math.round(w*h/120);
    for(var i=0;i<n;i++){ var tx=x+Math.floor(rng()*w), ty=y+Math.floor(rng()*(h-2)); R(tx,ty,1,2,(i&3)?P.g2:P.g4); if((i&7)===0) R(tx+1,ty+1,1,1,P.g2); }
    for(var f=0;f<Math.round(w*h/900);f++){ var fxp=x+Math.floor(rng()*w), fyp=y+Math.floor(rng()*(h-2)); R(fxp,fyp,1,1,(f&1)?P.parchHi:P.sun); R(fxp,fyp+1,1,1,P.g2); }
  }
  function hedgeRow(x,y,w,h){
    R(x,y,w,h,P.g1); R(x,y+1,w,h-2,P.g2);
    for(var i=0;i<w;i+=6){ R(x+i+((i/6)&1)*2, y-2, 3, 2, P.g2); R(x+i+1, y+2, 2, 1, P.g4); if((i/6)%3===0) R(x+i+3, y+h-3, 2, 1, P.g1); }
    R(x,y+h-1,w,1,P.g1);
  }
  function tree(cx,cy,s){
    s=s||1; var th=Math.round(13*s), r=Math.round(13*s), H=Math.round(28*s);
    R(cx-r+2, cy+1, 2*r-4, 1, P.g1);
    var tw = Math.max(4, Math.round(5*s));
    R(cx-tw/2-1,cy-th,tw+2,1,P.ink); R(cx-tw/2,cy-th,tw,th,P.p2); R(cx-tw/2,cy-th,1,th,P.p1); R(cx+tw/2-1,cy-th,1,th,P.p3); R(cx-tw/2-1,cy-th,1,th,P.ink); R(cx+tw/2,cy-th,1,th,P.ink);
    R(cx-tw/2-2, cy-1, tw+4, 1, P.p1); R(cx-tw/2-2, cy, tw+4, 1, P.ink);
    var top = cy-th-H+2, rows = ellipseRows(2*r, H, false);
    blob(cx, top, rows, function(row, dx){
      if(row > H*0.66) return (dx + row) % 5 === 0 ? P.g2 : P.g1;
      if(row < H*0.45 && dx < -r*0.15 && dx > -r*0.8 && (row+dx) % 3 !== 0) return P.g4;
      return ((row*7+dx*3) % 11 === 0) ? P.g1 : P.g2;
    });
  }
  function bush(cx,cy,s){
    s=s||1; var w=Math.round(14*s), h=Math.round(9*s);
    R(cx-w/2+1, cy+h/2+1, w-2, 1, P.g1);
    var rows = ellipseRows(w, h, true);
    blob(cx, cy-h/2, rows, function(row, dx){
      if(row > rows.length*0.6) return P.g1;
      if(row < rows.length*0.5 && dx < 0 && (row+dx) % 3 !== 0) return P.g4;
      return P.g2;
    });
  }
  function rock(cx,cy,w){
    var rows = ellipseRows(w, Math.round(w*0.6), true);
    blob(cx, cy-Math.round(w*0.3), rows, function(row, dx){ return row < rows.length*0.4 && dx < 0 ? P.c4 : (row > rows.length*0.7 ? P.c1 : P.c3); });
  }
  function flowerBed(x,y,w,h,rng){
    R(x-1,y-1,w+2,h+2,P.s1); R(x,y,w,h,P.s2); R(x,y,w,1,P.s3);
    for(var d=0; d<Math.round(w*h/40); d++) R(x+Math.floor(rng()*w), y+1+Math.floor(rng()*(h-1)), 1, 1, P.s1);
    var cols=[P.berry,P.sun,P.parchHi,P.coral];
    for(var i=0;i<Math.round(w*h/22);i++){
      var fxp=x+1+Math.floor(rng()*(w-3)), fyp=y+1+Math.floor(rng()*(h-4));
      R(fxp,fyp+2,1,1,P.g2); R(fxp-1,fyp+1,3,1,P.g2); R(fxp,fyp,2,2,cols[i&3]); R(fxp,fyp,1,1,mix(cols[i&3],"#ffffff",0.4));
    }
  }
  function picketFence(x,y,w){
    for(var px=x; px<x+w; px+=6){ R(px,y,4,16,P.parchHi); R(px+1,y-2,2,2,P.parchHi); R(px,y,1,16,P.parchLo); R(px,y+15,4,1,P.parchLo); R(px+1,y-3,2,1,P.ink); }
    R(x,y+4,w,2,P.parchLo); R(x,y+11,w,2,P.parchLo); R(x,y+16,w,1,P.g1);
  }
  function houseFacade(x,y,w,h,wall,roof){
    wall = wall||P.parch; roof = roof||P.coral;
    box(x,y+8,w,h-8,wall,mix(wall,"#ffffff",0.5),mix(wall,"#000000",0.25));
    for(var sy=y+13; sy<y+h-2; sy+=4) R(x+1, sy, w-2, 1, mix(wall,"#000000",0.12));
    /* roof, overhanging by 6, with shingle rows and a chimney */
    var roofLo = mix(roof,"#000000",0.35), roofHi = mix(roof,"#ffffff",0.35);
    R(x-7,y-1,w+14,10,P.ink); R(x-6,y,w+12,8,roof); R(x-6,y,w+12,1,roofHi);
    for(var rr=1; rr<8; rr+=2){ for(var rx=x-6+((rr/2)&1)*3; rx<x+w+6; rx+=6) R(rx, y+rr, 3, 1, roofLo); }
    R(x-6,y+7,w+12,1,roofLo); R(x-7,y+9,w+14,1,mix(wall,"#000000",0.3));
    box(x+w-16, y-6, 6, 6, P.s3, P.s4, P.s1); R(x+w-17, y-8, 8, 2, P.c2); R(x+w-17,y-8,8,1,P.c4);
    /* brick base course, a drainpipe, a light by the door */
    for(var bxx=x; bxx<x+w; bxx+=4){ R(bxx, y+h-3, 3, 2, ((bxx/4)&1) ? P.s3 : P.s2); }
    R(x+2, y+9, 2, h-11, mix(wall,"#000000",0.3)); R(x+2, y+9, 1, h-11, mix(wall,"#ffffff",0.2)); R(x+1, y+9, 4, 1, P.ink);
  }
  function shutters(x,y,w,h){ R(x-4,y,3,h,P.leafLo); R(x-4,y,3,1,P.leaf); R(x+w+1,y,3,h,P.leafLo); R(x+w+1,y,3,1,P.leaf); for(var r=y+2;r<y+h-1;r+=3){ R(x-3,r,1,1,P.leaf); R(x+w+2,r,1,1,P.leaf); } }
  function windowBox(x,y,w,rng){ R(x-1,y,w+2,3,P.s2); R(x-1,y,w+2,1,P.s3); R(x-2,y+3,w+4,1,P.ink); for(var i=0;i<w;i+=3){ R(x+i,y-2,2,2,[P.berry,P.sun,P.coral][(i/3)%3]); R(x+i+1,y-1,1,1,P.g2); } }
  function smoke(x,y){ R(x,y+8,2,2,P.c4); R(x+2,y+5,2,2,P.c4); R(x+1,y+2,3,2,"#ffffff"); R(x+4,y,3,2,"#ffffff"); }
  function laundryLine(x,y,w){ R(x,y-12,1,14,P.p1); R(x+w,y-12,1,14,P.p1); R(x,y-10,w,1,P.c1); var cols=[P.water,P.parchHi,P.coral,P.leafHi]; for(var i=0;i<4;i++){ var cx=x+4+i*Math.round((w-8)/3); R(cx,y-9,5,6,cols[i]); R(cx,y-9,5,1,mix(cols[i],"#000000",0.25)); R(cx+1,y-10,1,1,P.ink); R(cx+3,y-10,1,1,P.ink); } }
  function dog(x,y){ R(x-8,y+1,16,1,P.g1); Sprites.draw(bx, "dog", "idle", x, y, false); }
  function ball(x,y){ R(x-1,y-4,4,1,P.coral); R(x-2,y-3,6,3,P.coral); R(x-1,y,4,1,P.coralLo); R(x-1,y-3,2,1,"#ffffff"); R(x,y-2,2,2,"#ffffff"); R(x-2,y+1,6,1,P.g1); }
  function sprinkler(x,y){ R(x-1,y-4,2,4,P.stoneLo); R(x-2,y-5,4,1,P.ink); for(var i=0;i<5;i++){ R(x-6+i*3, y-8-((i&1)*2), 1, 1, P.waterHi); R(x-5+i*3, y-11-((i&1)*2), 1, 1, "#ffffff"); } R(x-3,y,6,1,P.g1); }
  function birdbath(x,y){ R(x-1,y-6,2,6,P.c2); R(x-4,y-8,8,2,P.c3); R(x-4,y-8,8,1,P.c4); R(x-5,y-9,10,1,P.ink); R(x-3,y-8,6,1,P.waterHi); R(x-3,y,6,1,P.g1); bird(x+1,y-11,P.berry); }
  function winPane(x,y,w,h){
    shutters(x,y,w,h);
    var on = NIGHT && ((x*7 + y*3) % 5) !== 0;   /* most windows glow after dark; a few are asleep */
    var paint = function(){
      box(x,y,w,h, on ? "#ffd57a" : P.waterHi, on ? "#fff0c4" : "#ffffff", null);
      if(!on) R(x,y,w,2,"#ffffff"); else R(x+2,y+2,2,2,"#fff0c4");
      R(x+Math.floor(w/2)-1,y,2,h,P.ink); R(x,y+Math.floor(h/2)-1,w,2,P.ink);
      R(x,y,2,h,P.parchLo); R(x+w-2,y,2,h,P.parchLo);              /* curtains */
    };
    if(on) lit(paint); else paint();
    R(x-2,y+h+1,w+4,2,P.parchLo); R(x-2,y+h+3,w+4,1,P.ink);       /* sill */
    if(on) glowCone(x+w/2, y+h+4, w+2, w+10, 6, "#8a7448");
  }
  function doorway(x,y,w,h,col){
    col = col||P.p2;
    var dark = mix(col,"#000000",0.28), light = mix(col,"#ffffff",0.3);
    R(x-2,y-2,w+4,h+3,P.parchLo); R(x-3,y-3,w+6,1,P.ink); R(x-3,y-3,1,h+4,P.ink); R(x+w+2,y-3,1,h+4,P.ink);   /* frame */
    box(x,y,w,h,col,light,dark);
    lit(function(){ R(x+2,y+2,w-4,3,NIGHT ? "#ffd57a" : P.waterHi); R(x+2,y+2,w-4,1,NIGHT ? "#fff0c4" : "#ffffff"); }); R(x+Math.floor(w/2),y+2,1,3,P.ink);                /* fanlight */
    R(x+2,y+7,Math.floor(w/2)-3,Math.round(h*0.32),dark); R(x+Math.floor(w/2)+1,y+7,w-Math.floor(w/2)-3,Math.round(h*0.32),dark);   /* upper panels */
    R(x+3,y+8,Math.floor(w/2)-5,1,light); R(x+Math.floor(w/2)+2,y+8,w-Math.floor(w/2)-5,1,light);
    var py0 = y+9+Math.round(h*0.32);
    R(x+2,py0,Math.floor(w/2)-3,h-(py0-y)-5,dark); R(x+Math.floor(w/2)+1,py0,w-Math.floor(w/2)-3,h-(py0-y)-5,dark);          /* lower panels */
    R(x+w-4,y+Math.round(h*0.52),2,2,P.sun); R(x+w-4,y+Math.round(h*0.52),1,1,P.sunHi);                                          /* knob */
    R(x+1,y+h-3,w-2,2,P.stone); R(x+1,y+h-3,w-2,1,P.c4);                                                                          /* kick plate */
    R(x-2,y+h+1,w+4,2,P.c3); R(x-2,y+h+3,w+4,1,P.c1); R(x+2,y+h+1,w-4,1,P.coral);                                                  /* step + mat */
    R(x+w+4,y+3,4,3,P.parchHi); R(x+w+4,y+3,4,1,P.ink); R(x+w+5,y+4,1,1,P.ink); R(x+w+7,y+4,1,1,P.ink);                            /* number plate */
    porchLight(x-6, y-1);
  }
  function glassDoor(x,y,w,h,frame){
    frame = frame||"#4d7f6f";
    box(x,y,w,h,frame,mix(frame,"#ffffff",0.3),mix(frame,"#000000",0.3));
    lit(function(){ R(x+2,y+2,w-4,h-6,NIGHT ? "#ffd57a" : P.waterHi); R(x+2,y+2,w-4,2,NIGHT ? "#fff0c4" : "#ffffff"); }); R(x+Math.floor(w/2)-1,y+2,1,h-6,frame);
    if(NIGHT) glowCone(x+w/2, y+h+1, w, w+12, 8, "#8a7448");
    R(x+w-4,y+Math.round(h*0.5),1,4,P.sun); R(x+3,y+Math.round(h*0.5),1,4,P.sun);
    R(x-2,y+h+1,w+4,2,P.c3); R(x-2,y+h+3,w+4,1,P.c1);
  }
  function cafeTable(x,y){
    R(x-6,y-9,12,2,P.p3); R(x-6,y-9,12,1,P.p4); R(x-7,y-10,14,1,P.ink); R(x-6,y-7,12,1,P.ink);
    R(x-1,y-6,2,6,P.ink); R(x-4,y,8,1,P.ink);
    R(x-2,y-14,4,4,P.parchHi); R(x-2,y-14,4,1,P.ink); R(x-3,y-13,1,3,P.ink); R(x+2,y-13,1,3,P.ink); R(x-1,y-13,1,1,P.coral); /* a vase */
  }
  function cafeChair(x,y,flip){
    var bx0 = flip ? x-3 : x+1;
    R(x-3,y-6,7,2,P.p2); R(x-3,y-6,7,1,P.p3); R(x-4,y-7,9,1,P.ink); R(x-3,y-4,7,1,P.ink);
    R(bx0-1,y-13,3,7,P.p2); R(bx0-1,y-13,3,1,P.ink); R(flip ? bx0-2 : bx0+2, y-13, 1, 7, P.ink);
    R(x-3,y-4,1,4,P.ink); R(x+3,y-4,1,4,P.ink);
  }
  function porchLight(x,y){
    R(x-1,y,2,3,P.ink);
    if(NIGHT){ glowDisc(x, y+8, 9, 7, "#8a7448"); lit(function(){ box(x-2,y+3,4,4,"#fff0c4","#ffffff",null); R(x-3,y+8,6,1,"#ffe08a"); }); }
    else { box(x-2,y+3,4,4,P.sun,P.sunHi,null); R(x-3,y+8,6,1,P.sunHi); }
  }
  function pavement(x,y,w,h,base){
    base = base||P.c3;
    R(x,y,w,h,base);
    for(var gy=y+6; gy<y+h; gy+=7) R(x,gy,w,1,P.c2);
    for(var gx0=x+18; gx0<x+w; gx0+=36) R(gx0,y,1,h,mix(base,P.c2,0.6));
    for(var k=0;k<Math.round(w/40);k++){ var cx=x+8+k*40, cy=y+3+((k*5)%(h-5)); R(cx,cy,3,1,P.c2); R(cx+3,cy+1,2,1,P.c2); R(cx+5,cy+2,3,1,P.c2); }
  }
  function waterField(x,y,w,h,rng,a,b){
    a=a||P.w3; b=b||P.w2;
    R(x,y,w,h,a); var hh=Math.round(h*0.4);
    dither(x,y+h-hh-2,w,2,a,b); R(x,y+h-hh,w,hh,b);
    for(var i=0;i<Math.round(w*h/180);i++){ var wx=x+Math.floor(rng()*(w-6)), wy=y+1+Math.floor(rng()*(h-3)); R(wx,wy,4,1,P.w4); R(wx+1,wy-1,2,1,P.w4); if(i&1) R(wx+4,wy+1,2,1,mix(a,P.w1,0.4)); }
    for(var j=0;j<Math.round(w/30);j++){ var rx=x+Math.floor(rng()*(w-8)), ry=y+Math.floor(rng()*(h-2)); R(rx,ry,6,1,P.w1); }
    if(NIGHT) lit(function(){ for(var gy=y+2; gy<y+h; gy+=2){ var spread = 6 + (gy-y)*0.5; for(var k=0;k<3;k++){ var gx0 = 218 + Math.round((rng()-0.5)*spread*2); if(gx0>=x && gx0<x+w) R(gx0, gy, 2 + (k===0 ? 1 : 0), 1, (gy&2) ? "#cfd8ff" : "#8d99cf"); } } });
  }
  function car(x,y,col){
    R(x-20,y+8,40,1,P.g1);
    box(x-22,y-2,44,8,col,mix(col,"#ffffff",0.35),mix(col,"#000000",0.3));
    box(x-12,y-9,24,7,col,mix(col,"#ffffff",0.35),null);
    R(x-10,y-8,8,5,P.waterHi); R(x+2,y-8,8,5,P.waterHi); R(x-10,y-8,8,1,"#ffffff"); R(x+2,y-8,8,1,"#ffffff"); R(x-1,y-8,2,5,mix(col,"#000000",0.3));
    R(x-13,y-3,26,1,mix(col,"#000000",0.25)); R(x-1,y-2,1,6,mix(col,"#000000",0.25)); R(x+3,y+1,2,1,P.stoneLo);
    [x-14,x+13].forEach(function(wx){ R(wx-4,y+4,9,5,P.ink); R(wx-3,y+5,7,3,"#4a3a30"); R(wx-1,y+6,3,1,P.parchLo); });
    R(x-22,y+1,2,2,P.sun); R(x+20,y+1,2,2,P.coral); R(x-21,y+6,42,1,mix(col,"#000000",0.3));
  }
  function towerSlab(x,y,w,h,col,winCol){
    col = col||P.c3;
    box(x,y,w,h,col,P.c4,P.c1);
    for(var fl=y+9; fl<y+h; fl+=8) R(x,fl-1,w,1,mix(col,P.c1,0.35));
    for(var wy=y+3; wy<y+h-5; wy+=8){ for(var wx=x+3; wx<x+w-5; wx+=7){ var on = NIGHT ? ((wx*3+wy)%5)!==0 : ((wx*3+wy)%5)===0; (function(wx,wy,on){ lit(function(){ R(wx,wy,4,5,on ? (NIGHT ? "#ffd57a" : P.sunHi) : (winCol||P.waterHi)); R(wx,wy,4,1,on && NIGHT ? "#fff0c4" : "#ffffff"); }); })(wx,wy,on); R(wx,wy+4,4,1,P.waterLo); } }
    R(x+Math.round(w/2)-2, y-4, 4, 4, P.c2); R(x+Math.round(w/2)-1, y-7, 2, 3, P.c1);
  }
  function streetLamp(x,y){
    glowCone(x+4, y-40, 8, 44, 40, "#8a7448");
    R(x-1,y-38,2,38,P.stoneLo); R(x-2,y-38,1,38,P.ink); R(x+1,y-38,1,38,P.ink); R(x-1,y-40,6,2,P.ink); R(x+3,y-40,1,4,P.ink); R(x,y-44,8,4,P.ink);
    lit(function(){ R(x+1,y-43,6,2,NIGHT ? "#fff0c4" : P.sunHi); R(x+1,y-41,6,1,NIGHT ? "#ffe08a" : P.sun); });
    R(x-3,y,8,1,P.c1); R(x-3,y-3,6,3,P.stoneLo); R(x-3,y-3,6,1,P.stone);
  }
  function hydrant(x,y){ box(x-3,y-8,6,8,P.coral,P.coralHi,P.coralLo); R(x-4,y-6,8,2,P.coralLo); R(x-2,y-10,4,2,P.coral); R(x-2,y-10,4,1,P.coralHi); R(x-3,y,6,1,P.c1); }
  function bin(x,y){ box(x-4,y-9,8,9,"#4d7f6f","#6a9c8c","#3c6a5c"); R(x-5,y-11,10,2,"#3c6a5c"); R(x-5,y-11,10,1,"#6a9c8c"); R(x-2,y-6,4,1,"#3c6a5c"); R(x-4,y,8,1,P.c1); }
  function dumpster(x,y){ box(x-14,y-14,28,14,"#4d7f6f","#6a9c8c","#3c6a5c"); R(x-15,y-17,30,3,"#3c6a5c"); R(x-15,y-17,30,1,"#6a9c8c"); R(x-12,y,3,2,P.ink); R(x+9,y,3,2,P.ink); R(x-7,y-11,14,4,P.c4); R(x-5,y-10,10,1,P.ink); R(x-14,y-5,28,1,"#3c6a5c"); }
  function cone(x,y){ R(x-1,y-6,2,1,P.coral); R(x-2,y-5,4,2,P.coral); R(x-2,y-4,4,1,P.parchHi); R(x-3,y-3,6,2,P.coral); R(x-4,y-1,8,1,P.ink); }
  function awning(x,y,w,h,a,b){
    R(x-1,y-1,w+2,h+2,P.ink);
    for(var i=0;i<w;i+=6) R(x+i,y,Math.min(6,w-i),h,((i/6)&1)?(b||P.parchHi):(a||P.coral));
    for(var j=0;j<w;j+=6) R(x+j+2,y+h,2,1,P.ink);
    R(x,y+h-1,w,1,mix(a||P.coral,"#000000",0.3));
  }
  function crate(x,y,s){ s=s||10; box(x-s/2,y-s/2,s,s,P.p3,P.p4,P.p1); R(x-s/2,y-1,s,2,P.p2); R(x-1,y-s/2,2,s,P.p2); R(x-s/2+1,y-s/2+1,1,1,P.p1); R(x+s/2-2,y+s/2-2,1,1,P.p1); }
  function barrel(x,y){ box(x-4,y-11,8,12,P.p2,P.p3,P.p1); R(x-4,y-8,8,1,P.p4); R(x-4,y-3,8,1,P.p4); R(x-3,y-11,1,12,P.p3); }
  function buoy(x,y){ box(x-3,y-3,6,6,P.coral,P.coralHi,P.coralLo); R(x-3,y-1,6,2,P.parchHi); R(x-1,y-6,2,3,P.ink); R(x-3,y+4,6,1,P.w1); }
  function ropeCoil(x,y){ R(x-5,y-3,10,6,P.p4); R(x-3,y-2,6,4,P.s3); R(x-1,y-1,2,2,P.p4); R(x-5,y+3,10,1,P.p1); R(x-5,y-3,1,6,P.s3); }
  function seagull(x,y){ R(x-3,y,2,1,P.ink); R(x-1,y-1,2,1,P.ink); R(x+1,y,2,1,P.ink); }
  function bird(x,y,col){ R(x-2,y,5,2,col||P.berry); R(x+3,y,1,1,P.sun); R(x-1,y-1,2,1,col||P.berry); R(x,y+2,1,1,P.ink); }
  function sailboat(x,y){ R(x-6,y,12,2,P.p1); R(x-5,y-1,10,1,P.parchHi); R(x,y-9,1,9,P.ink); for(var i=0;i<7;i++) R(x+1,y-8+i,1+Math.round(i*0.7),1,"#ffffff"); }
  function lighthouse(x,y,h){
    if(NIGHT){ /* the beam sweeps left, a flat wedge of dithered light */
      lit(function(){ for(var r=0;r<9;r++){ var len = 26 + r*4, yy = y-h-8+r; for(var px=x-5-len; px<x-5; px++) if(((px+yy)&1)===0 && ((x-5-px) % 3) !== 0) R(px, yy, 1, 1, r===4 ? "#c9b46a" : "#8a7448"); } });
    }
    box(x-4,y-h,8,h,P.parchHi,"#ffffff",P.parchLo);
    for(var s=y-h+4; s<y-3; s+=8) R(x-4,s,8,3,P.coral);
    box(x-5,y-h-5,10,5,P.stoneLo,P.stone,null); lit(function(){ R(x-3,y-h-4,6,3,NIGHT ? "#fff6c4" : P.sunHi); }); R(x-2,y-h-7,4,2,P.ink);
  }
  function boatSide(x,y,col){
    R(x-30,y+8,60,1,P.w1);
    box(x-32,y-4,64,10,col,mix(col,"#ffffff",0.35),mix(col,"#000000",0.3));
    R(x-30,y+6,58,1,P.ink); R(x-26,y+7,52,1,P.ink); R(x-18,y+8,40,1,P.ink);
    R(x-32,y-5,64,2,P.parchHi); R(x-32,y-6,64,1,P.ink);
    for(var p=x-28; p<x+30; p+=8) R(p,y-2,3,1,mix(col,"#000000",0.3));
    box(x-8,y-16,20,10,P.parch,P.parchHi,P.parchLo); R(x-5,y-13,5,4,P.waterHi); R(x+3,y-13,5,4,P.waterHi);
    R(x+14,y-14,1,8,P.ink); R(x+15,y-14,4,2,P.coral);
    for(var t=x-30; t<x+30; t+=6) R(t,y-8,2,1,P.parchLo);
  }
  function lobsterTrap(x,y){ box(x-6,y-4,12,7,P.p3,P.p4,P.p1); for(var i=-4;i<=4;i+=3) R(x+i,y-4,1,7,P.p2); R(x-6,y-1,12,1,P.p2); }
  function pillar(x,y,w,h){ box(x,y,w,h,P.c2,P.c4,P.c1); R(x,y+h-9,w,3,P.sun); R(x,y+h-6,w,2,P.ink); R(x+1,y+2,1,h-12,P.c4); R(x+w-2,y+2,1,h-12,P.c1); }
  function pipes(x,y,w){ R(x,y-1,w,3,P.stone); R(x,y-1,w,1,P.c4); R(x,y+1,w,1,P.stoneLo); for(var i=6;i<w;i+=16) R(x+i,y-2,2,5,P.ink); R(x,y+4,w,2,P.coralLo); R(x,y+4,w,1,P.coral); }
  function netHang(x,y,w,h){ for(var j=0;j<h;j+=3) for(var i=((j/3)&1)?1:0;i<w;i+=3) R(x+i,y+j,1,1,P.s1); for(var k=0;k<4;k++) R(x+2+k*Math.round(w/4), y-1, 1, 2, P.ink); }
  function pot(x,y){
    blob(x, y-8, [2,3,4,4,4,3], function(r,dx){ return r<2 && dx<0 ? P.g4 : (r>3 ? P.g1 : P.g2); });
    R(x-1,y-7,2,1,P.coral); R(x+1,y-5,1,1,P.sun);
    R(x-5,y-3,10,1,P.ink); R(x-4,y-2,8,2,P.s4); R(x-4,y-1,8,1,P.s3); R(x-5,y-2,1,2,P.ink); R(x+4,y-2,1,2,P.ink);
    R(x-3,y,6,4,P.s3); R(x-4,y,1,4,P.ink); R(x+3,y,1,4,P.ink); R(x-3,y+3,6,1,P.s1); R(x-3,y+4,6,1,P.ink); R(x-5,y+5,10,1,P.g1);
  }
  function bench(x,y){ box(x-11,y-6,22,3,P.p3,P.p4,P.p1); box(x-11,y-1,22,3,P.p3,P.p4,P.p1); R(x-9,y+2,2,4,P.p1); R(x+7,y+2,2,4,P.p1); R(x-10,y+6,20,1,P.g1); }
  function grill(x,y){ box(x-6,y-6,12,5,"#3b3b42","#5a5a63",null); R(x-7,y-8,14,2,"#5a5a63"); R(x-7,y-8,14,1,"#7a7a83"); R(x-4,y,2,5,"#3b3b42"); R(x+2,y,2,5,"#3b3b42"); R(x+5,y-10,2,2,P.coral); R(x-6,y+5,12,1,P.g1); }
  function mailbox(x,y){ R(x-1,y-4,2,10,P.p1); box(x-4,y-9,8,5,P.water,P.waterHi,P.waterLo); R(x+4,y-8,1,3,P.coral); R(x-2,y+6,4,1,P.g1); }
  function gnome(x,y){ R(x,y-7,1,1,P.coral); R(x-1,y-6,3,2,P.coral); R(x-2,y-4,5,1,P.coralLo); R(x-1,y-3,3,2,P.skin); R(x-1,y-2,1,1,P.ink); R(x+1,y-2,1,1,P.ink); R(x-1,y-1,3,1,P.parchHi); R(x-1,y,3,1,P.water); R(x-2,y+1,5,1,P.g1); }
  function hoseReel(x,y){ box(x-5,y-8,10,8,P.parch,P.parchHi,P.parchLo); R(x-3,y-6,6,4,P.waterLo); R(x-1,y-5,2,2,P.parchLo); R(x-6,y,12,1,P.g1); R(x+5,y-3,4,1,P.waterLo); }
  function bike(x,y){ R(x-9,y-7,7,7,P.ink); R(x-8,y-6,5,5,P.stone); R(x-7,y-5,3,3,P.stoneLo); R(x+2,y-7,7,7,P.ink); R(x+3,y-6,5,5,P.stone); R(x+4,y-5,3,3,P.stoneLo); R(x-5,y-9,9,1,P.coral); R(x-1,y-12,1,4,P.coral); R(x-5,y-8,1,4,P.coral); R(x+3,y-8,1,4,P.coral); R(x-3,y-13,4,1,P.ink); R(x+2,y-11,4,1,P.ink); R(x-9,y+1,18,1,P.g1); }
  function cat(x,y){ R(x-6,y+1,13,1,P.g1); Sprites.draw(bx, "cat", "idle", x, y, false); }
  function stones(x,y,n){ for(var i=0;i<n;i++){ var sx=x+i*9, sy=y+((i&1)*2); R(sx,sy,6,3,P.c3); R(sx,sy,6,1,P.c4); R(sx,sy+3,6,1,P.c1); } }
  function crosswalk(x,y,w){ for(var i=0;i<w;i+=8) R(x+i,y,5,6,P.parchHi); }
  function manhole(x,y){ R(x-3,y-1,6,3,P.c1); R(x-2,y,4,1,P.c2); }
  function acUnit(x,y){ box(x,y,7,5,P.c3,P.c4,P.c1); R(x+1,y+1,5,1,P.c1); R(x+1,y+3,5,1,P.c1); }
  var FONT = { A:"010101111101101", B:"110101110101110", C:"011100100100011", D:"110101101101110", E:"111100110100111", F:"111100110100100", G:"011100101101011", H:"101101111101101", I:"111010010010111", L:"100100100100111", M:"101111111101101", N:"110101101101101", O:"010101101101010", P:"110101110100100", R:"110101110101101", S:"011100010001110", T:"111010010010010", U:"101101101101111", V:"101101101101010", X:"101101010101101", Y:"101101010010010", "0":"010101101101010", "1":"010110010010111", "2":"110001010100111", "3":"110001010001110", "5":"111100110001110", " ":"000000000000000" };
  function pxText(x,y,str,col,s){
    s = s||1;
    for(var i=0;i<str.length;i++){
      var g = FONT[str[i].toUpperCase()]; if(!g){ continue; }
      for(var k=0;k<15;k++) if(g[k]==="1") R(x + i*4*s + (k%3)*s, y + Math.floor(k/3)*s, s, s, col);
    }
  }
  function sign(x,y,w,text){ box(x,y,w,7,P.p1,P.p2,null); for(var i=0;i<Math.floor((w-4)/4);i++) R(x+3+i*4,y+3,2,1,text||P.sunHi); }
  /* a lantern on a short post at the pier edge; lit after dark */
  function pierLamp(x,y){
    if(NIGHT) glowDisc(x, y-14, 10, 8, "#8a7448");
    R(x-1,y-20,2,20,P.p1); R(x-1,y-20,1,20,P.p2); R(x-2,y-21,4,1,P.ink); R(x-3,y-1,6,1,P.ink);
    R(x-3,y-19,6,1,P.ink); R(x-3,y-18,1,5,P.ink); R(x+2,y-18,1,5,P.ink); R(x-3,y-13,6,1,P.ink);
    lit(function(){ R(x-2,y-18,4,5, NIGHT ? "#fff0c4" : P.parchHi); R(x-1,y-17,2,3, NIGHT ? "#ffe08a" : P.sunHi); });
  }
  function bollard(x,y){ R(x-2,y-6,4,6,P.p1); R(x-2,y-6,1,6,P.p2); R(x-3,y-7,6,1,P.ink); R(x-1,y-4,2,1,P.p3); }
  function ladder(x,y,h){ R(x,y,1,h,P.stone); R(x+4,y,1,h,P.stone); for(var r=2;r<h;r+=3) R(x+1,y+r,3,1,P.stoneLo); }
  function lifeRing(x,y){ R(x-3,y-3,6,6,P.coral); R(x-2,y-2,4,4,P.parchHi); R(x-1,y-1,2,2,P.w2); R(x-3,y-1,1,2,P.parchHi); R(x+2,y-1,1,2,P.parchHi); }
  function parkedRig(x,y){
    /* the player's rig from the side, a real pickup's size next to a 29 px person */
    var p = TIER_PAINT[rigTier()];
    R(x-26,y+5,56,1,P.g1);
    box(x-28,y-4,56,4,P.p1,P.p2,null);
    box(x-26,y-18,24,14,p.body,"#ffffff",p.trim); R(x-19,y-16,1,12,p.trim); R(x-10,y-16,1,12,p.trim); R(x-16,y-14,5,7,P.waterHi); R(x-16,y-10,5,3,P.water);
    box(x-2,y-13,8,9,"#d8b26a","#ffffff","#a8843e"); R(x,y-10,3,3,P.wood);
    box(x-1,y-20,7,6,P.parch,P.parchHi,P.parchLo); R(x+1,y-18,3,2,P.waterLo);
    box(x+7,y-17,21,13,p.body,"#ffffff",p.trim); R(x+9,y-16,7,6,P.waterHi); R(x+9,y-16,7,1,"#ffffff"); R(x+19,y-16,7,6,P.waterHi); R(x+26,y-13,2,4,P.ink);
    R(x+17,y-16,1,12,P.ink); R(x+27,y-9,2,2,P.sun); R(x+25,y-4,4,2,P.stone);
    R(x-26,y-7,54,2,p.trim);
    [x-18,x+18].forEach(function(wx){ R(wx-4,y,9,6,P.ink); R(wx-3,y+1,7,4,"#4a3a30"); R(wx-1,y+2,3,2,P.parchLo); });
  }
  /* map-scale props: a house is ~22 px on the map, so a car is 10 and a tree 12 */
  function miniCar(x,y,col){ R(x-5,y-2,10,3,col); R(x-3,y-4,6,2,col); R(x-2,y-4,2,2,P.waterHi); R(x+1,y-4,2,2,P.waterHi); R(x-4,y+1,2,1,P.ink); R(x+2,y+1,2,1,P.ink); R(x-5,y-2,10,1,mix(col,"#ffffff",0.35)); }
  function miniBoat(x,y,col){ R(x-10,y+3,20,1,P.w1); R(x-11,y-1,22,4,P.ink); R(x-10,y-1,20,3,col); R(x-10,y-1,20,1,mix(col,"#ffffff",0.35)); R(x-4,y-5,10,4,P.parch); R(x-4,y-6,10,1,P.ink); R(x-2,y-4,2,2,P.waterHi); R(x+2,y-4,2,2,P.waterHi); R(x+5,y-9,1,4,P.ink); R(x+6,y-9,3,2,P.coral); }
  /* a pier seen from the side: a plank deck on poles that go down into the water */
  function pier(x,y,w,h){
    R(x,y,w,h,P.p3); R(x,y,w,1,P.p4); for(var px=x+7; px<x+w; px+=8) R(px,y,1,h,P.p2);
    R(x,y+h-1,w,1,P.p1); R(x,y+h,w,1,P.ink); R(x,y-1,w,1,P.ink);
    for(var pole=x+6; pole<x+w-2; pole+=24){
      R(pole,y+h+1,4,CH-(y+h+1),P.p1); R(pole,y+h+1,1,CH-(y+h+1),P.p2); R(pole+3,y+h+1,1,CH-(y+h+1),P.ink);
      R(pole-1,y+h+9,6,2,P.c3); R(pole-1,y+h+11,6,1,P.g1);          /* tide line + weed */
      for(var ry=y+h+16; ry<CH; ry+=4) R(pole+1,ry,2,2,P.w1);          /* reflection */
    }
  }
  function foamLine(x,y,w){ for(var i=0;i<w;i+=5){ R(x+i,y,3,1,"#ffffff"); R(x+i+2,y+1,2,1,P.w4); } }
  function miniHouse(x,y,w,h,wall,roof){
    R(x-2,y-1,w+4,1,P.ink); R(x-1,y,w+2,3,roof); R(x-1,y,w+2,1,mix(roof,"#ffffff",0.35)); R(x-2,y+3,w+4,1,mix(roof,"#000000",0.35));
    R(x,y+4,w,h,wall); R(x-1,y+4,1,h,P.ink); R(x+w,y+4,1,h,P.ink); R(x,y+4+h,w,1,P.ink);
    lit(function(){ R(x+2,y+6,3,3,NIGHT ? "#ffd57a" : P.waterHi); }); R(x+w-4,y+6,2,4,P.p1); R(x+w-4,y+6,2,1,P.p3);
    if(NIGHT) glowDisc(x+3, y+9, 4, 2, "#8a7448");
    R(x+w-5,y-3,2,3,P.s3);
  }
  function antenna(x,y,h){ R(x,y-h,1,h,P.ink); R(x-2,y-h+3,5,1,P.ink); R(x-1,y-h+6,3,1,P.ink); R(x,y-h-1,1,1,P.coral); }
  function miniTree(cx,cy){ R(cx-1,cy-4,2,4,P.p1); blob(cx, cy-12, [2,4,5,6,6,6,5,4], function(r,dx){ return r<3 && dx<0 ? P.g4 : (r>5 ? P.g1 : P.g2); }); }
