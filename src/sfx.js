  /* =========================================================
     SOUND — tiny synthesized effects, no files (Web Audio)
     ========================================================= */
  var SFX = (function(){
    var ctx = null, on = true, sprayNode = null, sprayGain = null;
    try{ on = localStorage.getItem("pwco_sound") !== "off"; }catch(e){}
    function ac(){
      if(!ctx){ try{ ctx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ ctx = null; } }
      if(ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol, slideTo, delay){
      var c = ac(); if(!c || !on) return;
      var t0 = c.currentTime + (delay||0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
      if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol || 0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function noiseBurst(dur, vol, freq){
      var c = ac(); if(!c || !on) return;
      var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for(var i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1 - i/n);
      var s = c.createBufferSource(); s.buffer = buf;
      var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq || 1800; f.Q.value = 0.8;
      var g = c.createGain(); g.gain.value = vol || 0.08;
      s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    }
    return {
      isOn: function(){ return on; },
      setOn: function(v){ on = !!v; try{ localStorage.setItem("pwco_sound", on ? "on" : "off"); }catch(e){} if(!on) this.sprayOff(); },
      click: function(){ tone(520, 0.05, "square", 0.04, 380); },
      buy:   function(){ tone(660, 0.08, "square", 0.05); tone(990, 0.12, "square", 0.05, null, 0.07); },
      nope:  function(){ tone(220, 0.12, "square", 0.05, 160); },
      coin:  function(){ tone(1320, 0.07, "square", 0.04); tone(1760, 0.1, "square", 0.04, null, 0.06); },
      star:  function(i){ tone(880 * Math.pow(1.25, i||0), 0.16, "triangle", 0.07, null, 0); },
      bill:  function(){ noiseBurst(0.12, 0.12, 400); tone(140, 0.18, "square", 0.06, 90); },
      done:  function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone(f, 0.16, "square", 0.05, null, i*0.09); }); },
      fail:  function(){ tone(330, 0.2, "square", 0.05, 220); tone(220, 0.3, "square", 0.05, 150, 0.18); },
      blip:  function(){ tone(900 + Math.random()*200, 0.03, "square", 0.025); },
      empty: function(){ tone(200, 0.18, "square", 0.06, 120); noiseBurst(0.15, 0.06, 600); },
      refill:function(){ tone(440, 0.08, "triangle", 0.05, 660); tone(660, 0.12, "triangle", 0.05, 880, 0.08); },
      splash:function(){ noiseBurst(0.06, 0.05, 2600); },
      sprayOn: function(){
        var c = ac(); if(!c || !on || sprayNode) return;
        var n = c.sampleRate * 2, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
        for(var i=0;i<n;i++) d[i] = Math.random()*2-1;
        sprayNode = c.createBufferSource(); sprayNode.buffer = buf; sprayNode.loop = true;
        var f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.6;
        sprayGain = c.createGain(); sprayGain.gain.setValueAtTime(0.0001, c.currentTime); sprayGain.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 0.08);
        sprayNode.connect(f); f.connect(sprayGain); sprayGain.connect(c.destination); sprayNode.start();
      },
      sprayOff: function(){
        if(!sprayNode) return;
        var c = ctx, n = sprayNode, g = sprayGain; sprayNode = null; sprayGain = null;
        try{ g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12); n.stop(c.currentTime + 0.15); }catch(e){}
      }
    };
  })();
  /* every button clicks; a disabled one thuds */
  document.addEventListener("click", function(ev){
    var b = ev.target.closest && ev.target.closest(".pw-btn, .pw-node");
    if(!b) return;
    if(b.disabled) SFX.nope(); else if(!b.classList.contains("pw-node")) SFX.click();
  }, true);
