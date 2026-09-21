  /* =========================================================
     SPRITES — text-grid pixel art rendered through offscreen canvases.
     A sprite: { w, h, palette: { letter: paletteKey | "#hex" }, frames: { name: [rows…] } }.
     Rows use "." for transparent. Palette keys refer to P (the theme palette), so sprites
     recolour with the theme. Edit them in tools/pixel-editor.html, which exports this format.
     ========================================================= */
  var SPRITES = __SPRITES__;
  var Sprites = (function(){
    var cache = {};
    function colorOf(spec){ return spec.charAt(0) === "#" ? spec : (P[spec] || PAL_FALLBACK[spec] || spec); }
    function raster(name, frame, flip){
      var key = name + "/" + frame + (flip ? "/f" : "");
      if(cache[key]) return cache[key];
      var s = SPRITES[name]; if(!s) return null;
      var rows = s.frames[frame] || s.frames[Object.keys(s.frames)[0]];
      var cv = document.createElement("canvas"); cv.width = s.w; cv.height = s.h;
      var c = cv.getContext("2d");
      for(var y=0; y<rows.length; y++){
        var row = rows[y];
        for(var x=0; x<row.length; x++){
          var ch = row[x]; if(ch === ".") continue;
          var spec = s.palette[ch]; if(!spec) continue;
          c.fillStyle = colorOf(spec);
          c.fillRect(flip ? s.w-1-x : x, y, 1, 1);
        }
      }
      cache[key] = cv;
      return cv;
    }
    return {
      /* draw with the sprite's bottom-centre at (x, y) — feet on the ground */
      draw: function(ctx, name, frame, x, y, flip){
        var cv = raster(name, frame, flip); if(!cv) return;
        ctx.drawImage(cv, Math.round(x - cv.width/2), Math.round(y - cv.height + 1));
      },
      /* draw with the top-left at (x, y) */
      drawAt: function(ctx, name, frame, x, y, flip){
        var cv = raster(name, frame, flip); if(!cv) return;
        ctx.drawImage(cv, Math.round(x), Math.round(y));
      },
      size: function(name){ var s = SPRITES[name]; return s ? { w:s.w, h:s.h } : null; },
      raster: raster,
      /* the theme changed: throw the rasters away */
      reset: function(){ cache = {}; }
    };
  })();
