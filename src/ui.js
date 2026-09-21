  /* =========================================================
     SCORING + END OF JOB
     ========================================================= */
  /* stars follow how clean you left it: finished = 3, 85%+ = 2, 60%+ = 1 */
  function starsFor(mode, elapsed, pct){
    if(mode === "complete" || pct >= 100) return 3;
    if(pct >= 85) return 2;
    if(pct >= 60) return 1;
    return 0;
  }
  function starsHTML(n){
    for(var si=0; si<n; si++) (function(k){ setTimeout(function(){ SFX.star(k); }, 250 + k*150); })(si);
    var s = '<div class="pw-stars">';
    for(var i=0;i<3;i++) s += ic("star", i < n ? "is-on" : "is-off");
    return s + '</div>';
  }
  /* modal building blocks */
  function mHead(icon, title, copy, plate){
    return (plate ? '<span class="pw-modal__plate">'+plate+'</span>' : '') +
      ic(icon, "pw-modal__hero") +
      '<h2 class="pw-modal__title">'+title+'</h2>' +
      (copy ? '<p class="pw-body pw-modal__copy">'+copy+'</p>' : '');
  }
  function mRow(key, val, cls){
    return '<li class="pw-stats__row"><span class="pw-stats__key">'+key+'</span><span class="pw-stats__val'+(cls?' '+cls:'')+'">'+val+'</span></li>';
  }
  function mRows(rows){ return '<ul class="pw-stats">'+rows.join('')+'</ul>'; }
  function mNote(text){ return '<p class="pw-small pw-soft" style="margin-top:8px;">'+text+'</p>'; }

  function endJob(mode){
    if(!job || job.ended) return;
    if(paused){ job.start += now() - pausedAt; }   /* the pause never counted */
    job.ended = true;
    stopJobLoop();

    var elapsed = now() - job.start;
    var c = cleanliness();
    var pct = (mode === "complete" || c >= 0.9995) ? 100 : Math.floor(c*100);
    var stars = starsFor(mode, elapsed, pct);

    var base = 140 + state.jobsCompleted*6;
    var pay = base * cleanPayFactor(c) * payMult() * job.grime.pay * REGIONS[job.region].pay * streakMult();
    if(mode === "complete"){
      var leftFrac = Math.max(0, (job.duration-elapsed)/job.duration);
      pay *= 1 + Math.min(0.35, leftFrac*0.35);
    }
    if(state.perks.sunday && job.weather.sun) pay *= 1.06;
    pay = Math.round(pay);

    var leftMs = Math.max(0, job.duration - elapsed);
    var tip = (lvl("tipjar") > 0 && pct >= 80) ? tipNow(leftMs) : 0;
    var contractMet = !!(job.contract && contractProgress() >= 0.999);
    var contractBonus = contractMet ? Math.round(pay * job.contract.bonus) : 0;
    pay += contractBonus;
    var crew = crewIncomeToday();
    var cut = state.loan > 0 ? Math.min(state.loan, Math.round(pay * LENDER.cut)) : 0;
    if(cut > 0 && state.loan - cut <= 0) lenderJustPaid = true;
    state.loan -= cut;
    var total = pay + tip + crew - cut;

    state.cash += total;
    state.cashSinceRepo += total;
    state.lifetimeEarnings += total;
    state.stats.crewEarnings += crew;
    state.jobsCompleted += 1;
    state.jobsSinceBill += 1;
    state.stats[job.region] = (state.stats[job.region]||0) + 1;
    if(mode === "complete" || pct >= 75){ state.streak = Math.min(STREAK_MAX, state.streak + 1); } else { state.streak = 0; }
    if(pct > state.stats.bestClean) state.stats.bestClean = pct;
    if(state.streak > state.stats.longestStreak) state.stats.longestStreak = state.streak;
    save(); renderTop();

    if(mode === "complete" && stars === 3){ burst(CW/2, CH/2, P.sunHi); shakeStage(); }
    if(mode === "timeout" && pct < 60) SFX.fail(); else SFX.done();
    if(contractMet) state.rep += 1; else if(job.contract) state.rep = Math.max(0, state.rep - 1);
    fx.clearRect(0,0,CW,CH); drawParticles();

    state.recentPays.push(pay); if(state.recentPays.length > 6) state.recentPays = state.recentPays.slice(-6);
    var heads = mode === "timeout"
      ? ["Out of time","Out of time","So close!"]
      : (mode === "early" ? ["Packed up","Packed up","Packed up","Packed up"] : ["Job done","Nice work!","Spotless!","Spotless!"]);
    var icon = mode === "timeout" ? "clock" : (stars === 3 ? "sparkle" : "wand");
    var rows = [
      mRow(ic("sparkle")+"Cleanliness", pct+"%"),
      mRow(ic("coin")+"Job pay", "+"+money(pay), "pw-stats__val--up")
    ];
    if(contractMet) rows.push(mRow(ic("bill")+"Contract met", "+"+money(contractBonus), "pw-stats__val--up"));
    else if(job.contract) rows.push(mRow(ic("bill")+"Contract missed", Math.floor(contractProgress()*100)+"% — −1 reputation", "pw-stats__val--down"));
    if(tip>0)  rows.push(mRow(ic("jar")+"Tip for speed", "+"+money(tip), "pw-stats__val--up"));
    else if(lvl("tipjar") > 0) rows.push(mRow(ic("jar")+"Tip", pct >= 80 ? "too slow — nothing" : "under 80% — nothing", "pw-stats__val--down"));
    if(crew>0) rows.push(mRow(ic("hardhat")+"Crew jobs", "+"+money(crew), "pw-stats__val--up"));
    else if(crewIncome()>0) rows.push(mRow(ic("hardhat")+"Crew", "off — it’s the weekend"));
    if(state.streak>1) rows.push(mRow(ic("flame")+"Streak", "×"+state.streak+(state.streak>=STREAK_MAX ? " (max)" : "")+" · pay +"+Math.round((streakMult()-1)*100)+"%"));
    if(cut>0) rows.push(mRow(ic("coin")+LENDER.name+"’s cut", "−"+money(cut)+(state.loan>0 ? " · "+money(state.loan)+" left" : " · square"), "pw-stats__val--down"));
    if(pay === 0) rows.push(mRow(ic("bill")+"Under 30% clean", "no pay", "pw-stats__val--down"));

    var body = mHead(icon, heads[stars] || heads[0], null, mode === "timeout" ? "Time's up" : (mode === "early" ? "Called it" : "100% clean")) +
      starsHTML(stars) + mRows(rows) +
      (mode==="timeout" ? mNote(pct >= 75 ? "Not finished, but good enough to keep the streak." : "Under 75% — streak broken, back to zero.") : '');

    showModal(body, [{ label:"Continue", cls:"pw-btn--primary pw-btn--big", icon:"arrow-right", action: afterJob }]);
  }

  /* every dirt type a route's jobs can throw at you, in unlock order */
  function regionDirt(regionId){
    var seen = {}, out = [];
    REGIONS[regionId].jobs.forEach(function(key){
      var d = JOBS[key], list = (d.grimes || REGIONS[regionId].grimes).slice();
      if(d.graffitiChance) list.push("graffiti");
      list.forEach(function(id){ if(!seen[id]){ seen[id] = 1; out.push(GRIME_TYPES[id]); } });
    });
    return out.sort(function(a, b){ return DIRT_UNLOCK[a.id] - DIRT_UNLOCK[b.id]; });
  }
  function dirtRows(types){
    return mRows(types.map(function(t){
      var need = t.chem ? CHEMS[t.chem].name + (chemOwned(t.chem) ? "" : " · in the Shop") : "plain water";
      return mRow(ic(t.icon) + t.name, (t.chem ? ic(CHEMS[t.chem].icon) : ic("drop")) + need, t.chem && !chemOwned(t.chem) ? "pw-stats__val--down" : "");
    }));
  }
  /* the dirt the next job will have, without starting it (same seed as startJob) */
  function peekJobTypes(){
    var seed = (state.jobsCompleted+1) * 2654435761 % 4294967296;
    return pickGrimes(makeRng(seed));
  }

  var lenderJustPaid = false;
  function afterJob(){
    job = null;
    if(!state.story.firstJob && state.jobsCompleted === 1){ return tellStory("firstJob", afterJob2); }
    if(lenderJustPaid){ lenderJustPaid = false; return runDialogue(STORY.lenderPaid, afterJob2); }
    afterJob2();
  }
  function afterJob2(){
    var unlocked = null;
    REGION_ORDER.forEach(function(id){
      if(id === "grove") return;
      if(state.jobsCompleted >= REGIONS[id].unlock && !state.story[id+"Unlock"]) unlocked = id;
    });
    if(unlocked){
      return tellStory(unlocked+"Unlock", function(){
        showModal(
          mHead(REGIONS[unlocked].icon, REGIONS[unlocked].name+' unlocked!', REGIONS[unlocked].tag, "New route") +
          mRows([mRow("Pay rate", "×"+REGIONS[unlocked].pay.toFixed(2), "pw-stats__val--up")]) +
          '<div class="pw-label" style="margin-top:10px">Dirt on this route</div>' + dirtRows(regionDirt(unlocked)) +
          mNote("Each chemical cuts one kind of dirt; the rest is plain water. Stock the rack in the Shop before you drive out. Switch routes any time from the map."),
          [{ label:"Nice", cls:"pw-btn--primary", action: afterJob3 }]
        );
      });
    }
    afterJob3();
  }
  function afterJob3(){
    if(!state.ownedOutright && state.cash >= BUYOUT_TARGET) return offerBuyout(advanceDay);
    advanceDay();
  }
  function offerBuyout(then){
    showModal(
      mHead("trophy", "You can buy the business", "You’ve got <b>"+money(BUYOUT_TARGET)+"</b> in hand — enough to pay off every cent Uncle Lenny’s company ever owed and own Power Wash Co. outright.", "The big one") +
      mRows([mRow(ic("coin")+"You have", money(state.cash), "pw-stats__val--up"), mRow(ic("bill")+"Buyout", money(BUYOUT_TARGET))]),
      [ { label:"Buy it out", cls:"pw-btn--primary", icon:"trophy", action:function(){ state.cash -= BUYOUT_TARGET; doBuyout(); } },
        { label:"Not yet", cls:"pw-btn--ghost", action:then } ]
    );
  }
  /* a job takes a day; Friday night and Saturday night you choose; Sunday night the payment is due */
  function advanceDay(){
    state.day += 1; save();
    if(state.day === 5 || state.day === 6){
      var dayName = state.day === 5 ? "Saturday" : "Sunday";
      var due = overheadAmount(state.billNumber), canRest = state.cash >= due;
      var go = function(){
        showModal(
          mHead("clock", "It’s the weekend", "Sunday night the weekly payment of <b>"+money(due)+"</b> is due. "+(crewWorksToday() ? "" : "Your crew don’t work weekends"+(lvl("overtime") ? " yet" : "")+".")+(canRest ? " You can afford it — rest, or squeeze in a job." : " You can’t cover it yet — better work "+dayName+"."), "Week "+state.week) +
          mRows([mRow(ic("coin")+"You have", money(state.cash), canRest ? "pw-stats__val--up" : "pw-stats__val--down"), mRow(ic("bill")+"Due Sunday", money(due))]),
          [ { label:"Work "+dayName, cls:"pw-btn--primary", icon:"wand", action:function(){ showScreen("screen-home"); } },
            canRest ? { label:"Rest until Monday", cls:"pw-btn--ghost", action:function(){ state.day = 7; save(); advanceDay(); } }
                    : { label:"Can’t rest — you’d miss the payment", cls:"pw-btn--ghost", disabled:true } ]
        );
      };
      return tellInfo("weekend", "clock", "Weekends", "Each job takes a day. Crew work Monday to Friday; on the weekend you can rest — if you can afford Sunday’s payment — or keep washing. The payment covers water, power, the lease and your crew’s wages, and it grows with the business: about 55% of what your last six jobs paid, for the five working days.", go);
    }
    if(state.day >= 7){
      state.day = 0; state.week += 1; save();
      return triggerBill();
    }
    showScreen("screen-home");
  }

  function doBuyout(){
    state.ownedOutright = true;
    state.rep += 20;
    save(); renderTop();
    tellStory("buyout", function(){
      showModal(
        mHead("trophy", "You own it — outright!", "Every cent Uncle Lenny’s business ever owed is paid off. Power Wash Co. is yours, free and clear.", "Debt free") +
        mRows([mRow(ic("star")+"Legacy earned", "+20", "pw-stats__val--up")]) +
        mNote("Overhead is pocket change from here. Keep washing — it’s all profit now."),
        [{ label:"Back to work", cls:"pw-btn--primary", action:function(){
            if(state.jobsSinceBill >= billEvery()) triggerBill(); else showScreen("screen-home");
        } }]
      );
    });
  }

  /* =========================================================
     BILLS, LOANS, REPOSSESSION
     ========================================================= */
  function triggerBill(){
    var amount = overheadAmount(state.billNumber);
    state.billNumber += 1;
    state.jobsSinceBill = 0;
    var weekLabel = "Week " + (state.week-1) + " payment";
    if(state.loan > 0) state.loan = Math.round(state.loan * 1.12);

    var gain = Math.max(1, Math.round(amount/100)) + (state.perks.wordofmouth ? 2 : 0);   /* a star per $100 paid */
    if(state.cash >= amount){
      state.cash -= amount;
      state.rep += gain;
      save(); renderTop(); SFX.bill();
      var go = function(){
        showModal(
          mHead("bill", "Payment made", "Water, power and the lease — handled. Every payment buys a little reputation.", weekLabel) +
          mRows([mRow(ic("truck")+"Water, power, lease", money(overheadBase(state.billNumber-1)))]
            .concat(crewSalary()>0 ? [mRow(ic("hardhat")+"Crew wages", money(crewSalary()))] : [])
            .concat([mRow(ic("coin")+"Total", money(amount), "pw-stats__val--down"), mRow(ic("star")+"Reputation earned", "+"+gain, "pw-stats__val--up")])),
          [{ label:"Back to the garage", cls:"pw-btn--primary", action:function(){ showScreen("screen-home"); } }]
        );
      };
      if(!state.story.firstBill) tellStory("firstBill", go); else go();
    } else if(state.loan <= 0){
      /* the lender covers it — at a price — or the van goes */
      runDialogue(STORY.lender, function(){
        showModal(
          mHead("coin", LENDER.name+"’s offer", "He covers the <b>"+money(amount)+"</b> payment now. You’ll owe him <b>"+money(Math.round(amount*LENDER.markup))+"</b>, paid back as "+Math.round(LENDER.cut*100)+"% of every job.", "Short on cash") +
          mRows([mRow("Bill", money(amount)), mRow("You have", money(state.cash), "pw-stats__val--down"), mRow("You’d owe", money(Math.round(amount*LENDER.markup)))]),
          [{ label:"Take "+LENDER.name+"’s money", cls:"pw-btn--primary", action:function(){
              state.loan = Math.round(amount*LENDER.markup); state.rep += gain; save(); renderTop();
              showScreen("screen-home");
            } },
           { label:"Let them take the van", cls:"pw-btn--ghost", action:function(){ repossess(amount); } }]
        );
      });
    } else {
      repossess(amount);
    }
  }

  function repossess(amount){
    var gain = Math.max(1, Math.floor(state.cashSinceRepo/90));   /* a star per $90 earned on this rig */
    state.rep += gain;
    state.cashSinceRepo = 0;
    state.streak = 0;
    state.stats.repoCount += 1;
    state.billNumber = Math.max(1, Math.round(state.billNumber*0.6));
    var fresh = defaultState().gear;
    if(state.perks.headstart) fresh.pressure = 1;
    if(state.perks.franchise){ fresh.powercore = 1; fresh.tankcore = 1; }
    state.gear = fresh;
    if(state.perks.oldmoney) state.cash = Math.max(state.cash, 1000);
    var kept = {};
    if(state.perks.severance){
      for(var i=0;i<CREW.length;i++){
        if(crewHired(CREW[i].id)){ kept[CREW[i].id] = state.crew[CREW[i].id]; break; }
      }
    }
    var lostCrew = Object.keys(state.crew).length - Object.keys(kept).length;
    state.crew = kept;
    state.recentPays = [];
    state.legacyAvailable = true;
    save(); renderTop();

    var go = function(){
      showModal(
        mHead("truck", "Van repossessed", "Couldn’t cover the "+money(amount)+" bill — the rig got stripped back to basics.", "Bad news") +
        mRows([mRow(ic("star")+"Legacy earned", "+"+gain, "pw-stats__val--up")]) +
        (lostCrew>0 ? mNote(lostCrew+' crew member'+(lostCrew>1?'s':'')+' walked — no rig, no work.') : '') +
        (state.loan>0 ? mNote(LENDER.name+'’s tab doesn’t vanish with the rig — you still owe '+money(state.loan)+'.') : '') +
        '<p class="pw-body" style="margin-top:8px;">Spend your stars, then it’s back to easy dirt while you rebuild.</p>',
        [{ label:"Spend Legacy stars", cls:"pw-btn--primary", icon:"star", action:function(){ showScreen("screen-legacy"); } }]
      );
    };
    if(!state.story.firstRepo) tellStory("firstRepo", go); else go();
  }

  /* the fourth home panel: the lender's tab while you owe him, otherwise what's coming next */
  /* the route picture: the next job on the route, painted clean */
  function paintRoute(){
    var canvas = $("routeCanvas"), rc = canvas.getContext("2d"); rc.imageSmoothingEnabled = false;
    var r = regionDef(), def = pickJobDef();
    var keep = bx; bx = rc;
    var wasJob = job; job = null;
    def.scene(def.area, makeRng(7 + REGION_ORDER.indexOf(r.id) + state.jobsCompleted));
    job = wasJob; bx = keep;
    sizeRoute();
    requestAnimationFrame(function(){ requestAnimationFrame(sizeRoute); });
  }
  /* fit the picture to the room the panel has (the locked home layout gives it a fixed height) */
  function sizeRoute(){
    var panel = $("routePanel"), canvas = $("routeCanvas"), row = panel.querySelector(".pw-row");
    if(!document.body.classList.contains("at-home") || getComputedStyle(panel).flexGrow !== "1"){ canvas.style.width = ""; return; }
    canvas.style.width = "120px"; void panel.offsetHeight;   /* collapse first so the panel shows its real share */
    var cs = getComputedStyle(panel);
    var availH = panel.clientHeight - row.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 16;
    var availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var w = Math.max(160, Math.floor(Math.min(availW, availH * 1.6) / 3) * 3);
    canvas.style.width = w + "px";
  }
  window.addEventListener("resize", function(){ if(!$("screen-home").classList.contains("hidden")) sizeRoute(); });

  /* =========================================================
     MODALS + DIALOGUE
     ========================================================= */
  var modalDismissible = false;
  /* one-time explainers: shown the first time something new turns up */
  function tellInfo(key, icon, title, html, done){
    if(state.info[key]){ if(done) done(); return; }
    state.info[key] = 1; save();
    showModal(mHead(icon, title, html, "Heads up"), [{ label:"Got it", cls:"pw-btn--primary", action: done }]);
  }
  function openSettings(){
    var themeLabel = themePref === "auto" ? "Theme: follows the clock (" + effectiveTheme() + " now)" : (themePref === "day" ? "Theme: always day" : "Theme: always night");
    var nextPref = themePref === "auto" ? "day" : (themePref === "day" ? "night" : "auto");
    showModal(mHead("wrench", "Settings", null, "Options"),
      [ { label: SFX.isOn() ? "Sound: on" : "Sound: off", cls:"pw-btn--ghost", action:function(){ SFX.setOn(!SFX.isOn()); openSettings(); } },
        { label: themeLabel, cls:"pw-btn--ghost", action:function(){ applyTheme(nextPref); if(!$("screen-home").classList.contains("hidden")) renderHome(); if(!$("screen-map").classList.contains("hidden")) renderMap(); openSettings(); } },
        { label:"Replay the story", cls:"pw-btn--ghost", icon:"book", action:function(){ runDialogue(STORY.intro, null); } },
        { label:"Back to the title screen", cls:"pw-btn--ghost", action:function(){ showScreen("screen-title"); renderTitle(); } },
        { label:"Reset save", cls:"pw-btn--ghost", action:function(){
            showModal(mHead("truck", "Reset everything?", "All cash, gear, crew and stars are wiped. This can’t be undone.", "Careful"),
              [{ label:"Yes, wipe it", cls:"pw-btn--primary", action:function(){ state = defaultState(); save(); renderTop(); showScreen("screen-title"); renderTitle(); } },
               { label:"Cancel", cls:"pw-btn--ghost" }], { dismissible:true });
        } },
        { label:"Close", cls:"pw-btn--ghost" } ], { dismissible:true });
  }
  function showModal(html, buttons, opts){
    modalDismissible = !!(opts && opts.dismissible);
    $("modalCard").innerHTML = html + '<div class="pw-modal__actions" style="margin-top:12px" id="modalBtns"></div>';
    var wrap = $("modalBtns");
    (buttons||[{label:"OK",cls:"pw-btn--primary"}]).forEach(function(b){
      var btn = document.createElement("button");
      btn.className = "pw-btn pw-btn--block " + (b.cls || "pw-btn--primary");
      btn.disabled = !!b.disabled;
      btn.innerHTML = (b.icon ? ic(b.icon, "pw-btn__icon") : "") + b.label;
      btn.onclick = function(){ hideModal(); if(b.action) b.action(); };
      wrap.appendChild(btn);
    });
    $("modalWrap").classList.remove("hidden");
  }
  function hideModal(){ $("modalWrap").classList.add("hidden"); modalDismissible = false; }
  $("modalWrap").addEventListener("click", function(e){
    if(e.target === $("modalWrap") && modalDismissible) hideModal();
  });
  window.addEventListener("keydown", function(e){
    if(e.key === "Escape" && modalDismissible && !$("modalWrap").classList.contains("hidden")) hideModal();
  });

  __STORY__

  STORY.lender = [
    { who:"sal",   text:"Heard you came up short. Bills don’t wait, kid — but I do. For a price." },
    { who:"you",   text:"What kind of price?" },
    { who:"sal",   text:"I cover the bill today. You owe me the bill plus thirty-five, and I take a quarter of every job till we’re square." },
    { who:"you",   text:"And if I say no?" },
    { who:"sal",   text:"Then the bank takes the van. Your call. I’m easy either way." }
  ];
  STORY.lenderPaid = [
    { who:"sal",   text:"That’s us square, kid. Pleasure doing business. Try not to need me again." }
  ];
  var dlgQueue = [], dlgDone = null, dlgTimer = null;
  function tellStory(key, done){
    if(!STORY[key]){ if(done) done(); return; }
    state.story[key] = 1; save();
    runDialogue(STORY[key], done);
  }
  function runDialogue(lines, done){
    dlgQueue = lines.slice(); dlgDone = done;
    $("dlgWrap").classList.remove("hidden");
    nextLine();
  }
  var dlgFull = "", dlgShown = 0;
  function nextLine(){
    /* a tap while a line is still typing shows the whole line first */
    if(dlgTimer && dlgShown < dlgFull.length){ clearInterval(dlgTimer); dlgTimer = null; $("dlgText").textContent = dlgFull; dlgShown = dlgFull.length; return; }
    if(!dlgQueue.length){
      $("dlgWrap").classList.add("hidden");
      var d = dlgDone; dlgDone = null;
      if(d) d();
      return;
    }
    var l = dlgQueue.shift();
    $("dlgPortrait").innerHTML = portraitSVG(l.who);
    $("dlgName").textContent = l.who === "lenny" ? "Uncle Lenny" : (l.who === "sal" ? LENDER.name : "You");
    $("dlgNextLabel").textContent = dlgQueue.length ? "Next" : "Got it";
    dlgFull = l.text; dlgShown = 0; $("dlgText").textContent = "";
    if(dlgTimer) clearInterval(dlgTimer);
    dlgTimer = setInterval(function(){
      dlgShown = Math.min(dlgFull.length, dlgShown + 2);
      if(dlgShown % 6 === 0) SFX.blip();
      $("dlgText").textContent = dlgFull.slice(0, dlgShown);
      if(dlgShown >= dlgFull.length){ clearInterval(dlgTimer); dlgTimer = null; }
    }, 16);
  }
  $("dlgNext").onclick = nextLine;
  $("dlgWrap").addEventListener("click", function(e){ if(e.target === $("dlgWrap") || e.target.closest && e.target.closest(".pw-dialogue__box")) nextLine(); });

  /* =========================================================
     SCREENS
     ========================================================= */
  var SCREENS = ["screen-title","screen-home","screen-map","screen-job","screen-upgrades","screen-shop","screen-crew","screen-legacy","screen-stats"];
  function showScreen(id){
    if(id !== "screen-job"){ stopJobLoop(); if(job && !job.ended){ job.ended = true; job = null; } }
    if(id !== "screen-legacy" && state.legacyAvailable && $("screen-legacy") && !$("screen-legacy").classList.contains("hidden")){ state.legacyAvailable = false; save(); }
    SCREENS.forEach(function(s){ $(s).classList.toggle("hidden", s !== id); });
    document.body.classList.toggle("at-home", id === "screen-home");
    $("chrome").classList.toggle("hidden", id === "screen-title" || id === "screen-job");
    document.body.classList.toggle("at-job", id === "screen-job");
    if(id !== "screen-job"){ syncClockTheme(); syncScene(); }
    Array.prototype.slice.call(document.querySelectorAll("#tabs .tab")).forEach(function(t){ t.classList.toggle("is-active", t.getAttribute("data-screen") === id); });
    if(id === "screen-home") renderHome();
    if(id === "screen-map") renderMap();
    if(id === "screen-upgrades") renderTree();
    if(id === "screen-shop") renderShop();
    if(id === "screen-crew") renderCrew();
    if(id === "screen-legacy") renderLegacy();
    if(id === "screen-stats") renderStats();
    window.scrollTo(0,0);
  }

  var lastCash = null;
  function renderTop(){
    $("cashBadge").textContent = money(state.cash);
    if(lastCash !== null && lastCash !== state.cash){
      var c = $("cashBadge").parentNode; c.classList.remove("is-bump"); void c.offsetWidth; c.classList.add("is-bump");
      SFX.coin();
    }
    lastCash = state.cash;
    $("repBadge").textContent = state.rep;
    var sb = $("streakBadge");
    if(state.streak > 1){ sb.classList.remove("hidden"); $("streakVal").textContent = state.streak; }
    else sb.classList.add("hidden");
    var cb = $("crewBadge"), ci = crewIncome();
    if(ci > 0){ cb.classList.remove("hidden"); $("crewVal").textContent = money(ci) + "/job"; }
    else cb.classList.add("hidden");
  }

  function meterHTML(icon, label, value, fillCls, pct, valueCls){
    return '<div class="pw-meter"><div class="pw-meter__row"><span>'+ic(icon)+label+'</span><span class="pw-label'+(valueCls?' '+valueCls:'')+'">'+value+'</span></div>' +
      '<div class="pw-track '+fillCls+'"><div class="pw-track__fill" style="width:'+clamp(pct,0,100)+'%"></div></div></div>';
  }

  function renderHome(){
    var t = TIERS[rigTier()];
    $("tierName").textContent = t[0];
    $("tierSub").textContent = t[1];
    $("truckArt").innerHTML = truckSVG();
    wireTruckTips();
    $("heroMascot").innerHTML = mascotSVG();
    paintRoute();
    var nextDef = pickJobDef();
    $("routeNote").textContent = "Next job: " + nextDef.name;
    $("homeGreeting").textContent = state.jobsCompleted === 0 ? "Grab the wand. Make it shine. Repeat." :
      (state.streak >= 3 ? "On a roll — " + state.streak + " good jobs in a row." : state.jobsCompleted + " jobs done. The van's still yours.");
    var areaMult = Math.pow(sprayRadius()/BASE_RADIUS, 2);
    $("rigStats").innerHTML = mRows([
      mRow(ic("bolt")+"Spray power", sprayPower().toFixed(2)),
      mRow(ic("wand")+"Spray area", "×"+areaMult.toFixed(1)),
      mRow(ic("barrel")+"Tank", tankMax()+" L"),
      mRow(ic("clock")+"Refill", (refillMs()/1000).toFixed(2)+" s"),
      mRow(ic("hourglass")+"Patience", Math.round(jobMs()/1000)+" s"),
      mRow(ic("coin")+"Pay bonus", "+"+Math.round((payMult()-1)*100)+"%"),
      mRow(ic("drop")+"Water use", waterPerSecond().toFixed(1)+" L/s"),
      mRow(ic("hardhat")+"Crew per job", money(crewIncome()))
    ]);
    $("regionName").textContent = regionDef().name;

    var due = overheadAmount(state.billNumber), daysLeft = 7 - state.day;
    $("billPanel").innerHTML = meterHTML("bill", "Sunday payment", money(due), "pw-track--bill", state.day/7*100) +
      '<p class="pw-small pw-soft">Due '+(daysLeft===1 ? 'tonight' : (daysLeft===2 ? 'tomorrow night' : 'in '+daysLeft+' days'))+' — water, power, the lease'+(crewSalary()>0 ? ' and wages' : '')+'.</p>';
    if(state.cash < due) $("billPanel").querySelector(".pw-label").style.color = "var(--danger-text)";
    var cal = $("calendar"); cal.innerHTML = '<span class="pw-caption cal-week">Week '+state.week+'</span>' + DAYS.map(function(d, i){
      return '<span class="cal-day'+(i === state.day ? ' is-today' : '')+(i >= 5 ? ' is-weekend' : '')+(i === 6 ? ' is-payday' : '')+(i < state.day ? ' is-past' : '')+'">'+d+(i === 6 ? ic("coin") : '')+'</span>';
    }).join('');
    $("btnStartJob").innerHTML = ic("wand","pw-btn__icon") + (state.day >= 5 ? "Work " + (state.day === 5 ? "Saturday" : "Sunday") : "Start Next Job");

    /* money: what you have, and what Sunday leaves you (or what Sal is still owed) */
    var after = state.cash - due;
    $("cashPanel").innerHTML =
      '<div class="pw-panel__head"><span class="pw-heading">'+ic("coin","pw-icon--24")+' Cash</span><span class="pw-label'+(after < 0 ? '" style="color:var(--danger-text)' : '')+'">'+money(state.cash)+'</span></div>' +
      (state.loan > 0
        ? '<p class="pw-small pw-soft">'+LENDER.name+'’s tab: <b>'+money(state.loan)+'</b> — he takes '+Math.round(LENDER.cut*100)+'% of every job until it’s square.</p>'
        : '<p class="pw-small pw-soft">'+(after >= 0 ? 'After Sunday’s payment you keep <b>'+money(after)+'</b>.' : '<b>'+money(-after)+' short</b> of Sunday’s payment — keep washing.')+'</p>');
    /* the next thing worth buying */
    var rec = recommendBuy();
    $("advicePanel").innerHTML = rec
      ? '<div class="pw-panel__head"><span class="pw-heading">'+ic(rec.icon,"pw-icon--24")+' Recommended</span><span class="pw-label '+(rec.afford ? 'pw-tag--ok' : '')+'">'+money(rec.cost)+'</span></div>' +
        '<p class="pw-small pw-soft"><b>'+rec.title+'</b>'+(rec.level ? ' lv.'+rec.level : '')+' — '+rec.why+(rec.afford ? '' : ' Save up '+money(rec.cost - state.cash)+' more.')+'</p>'
      : '<div class="pw-panel__head"><span class="pw-heading">'+ic("check","pw-icon--24")+' Rig complete</span></div><p class="pw-small pw-soft">Nothing left to buy — it’s all profit now.</p>';
    $("advicePanel").onclick = rec ? function(){ showScreen(rec.screen); } : null;
    $("advicePanel").style.cursor = rec ? "pointer" : "";

    if(state.ownedOutright){
      $("buyoutPanel").innerHTML =
        '<div class="pw-panel__head"><span class="pw-heading">'+ic("trophy","pw-icon--24")+' Owned outright</span><span class="pw-label pw-tag--ok">Debt free</span></div>' +
        '<p class="pw-small pw-soft">Every cent paid off. The weekly bills are pocket change now.</p>';
    } else {
      var shown = Math.min(state.cash, BUYOUT_TARGET);
      $("buyoutPanel").innerHTML = meterHTML("trophy", "Buyout", money(shown)+' / '+money(BUYOUT_TARGET), "pw-track--gold pw-track--segmented", shown/BUYOUT_TARGET*100);
      if(state.cash >= BUYOUT_TARGET){
        var bb = document.createElement("button"); bb.className = "pw-btn pw-btn--small pw-btn--block"; bb.style.marginTop = "8px";
        bb.innerHTML = ic("trophy","pw-btn__icon") + "Buy the business"; bb.onclick = function(){ offerBuyout(function(){ renderHome(); }); };
        $("buyoutPanel").appendChild(bb);
      }
    }
  }
  /* What to buy next: a chemical for dirt already on your route comes first, then the tree in a
     sensible order (spray, tank, patience, pay…), shop gear when it's the cheapest big win. */
  var BUY_ORDER = ["powercore","nozzle","pressure","tankcore","tank","bizcore","patience","nozzle","refill","pressure","flow","pay","cone","tank","tipjar","nozzle","pressure","refill","patience","pay","foamcannon","contracts","lease","prowasher","cone","flow","tank","refill","patience","pay","contracts","cone","flow","lease","foamcannon","contracts","lease","surge","bigrig","empire"];
  function recommendBuy(){
    var jobs = state.jobsCompleted;
    var dirt = regionDirt(state.region).filter(function(t){ return t.chem && !chemOwned(t.chem) && DIRT_UNLOCK[t.id] <= jobs + 2; });
    if(dirt.length){ var ch = dirt[0].chem, cc = costOf(ch, 0); return { key:ch, title:SHOP[ch].title, icon:SHOP[ch].icon, cost:cc, afford:state.cash >= cc, level:0, screen:"screen-shop", why:dirt[0].name + " is on this route and only " + SHOP[ch].title + " cuts it." }; }
    var want = {};
    for(var i=0;i<BUY_ORDER.length;i++){
      var k = BUY_ORDER[i], def = GEAR[k] || SHOP[k]; want[k] = (want[k] || 0) + 1;
      var level = want[k] - 1;
      if(lvl(k) !== level || level >= def.costs.length) continue;      /* not the next step for this one */
      if(GEAR[k] && treeGate(k, level)) continue;                       /* locked behind the tree */
      var cost = costOf(k, level);
      return { key:k, title:def.title, icon:def.icon, cost:cost, afford:state.cash >= cost, level:def.costs.length > 1 ? level+1 : 0, screen: GEAR[k] ? "screen-upgrades" : "screen-shop", why: def.desc[level].split(".")[0] + "." };
    }
    return null;
  }

  /* hover the rig's parts for what they are and what level they're at */
  function partInfo(part){
    switch(part){
      case "tank": return "Tank" + (lvl("tank") ? " lv." + lvl("tank") : "") + (lvl("bigrig") ? " + Big Rig" : "") + " — " + tankMax() + " L";
      case "pump": return (lvl("prowasher") ? "Pro Pressure Washer" : "Pressure washer") + (lvl("powercore") ? " with Pump Core" : "") + " — spray power " + sprayPower().toFixed(2) + (lvl("pressure") ? " (Pressure lv." + lvl("pressure") + ")" : "") + (lvl("cone") ? ", Even Cone lv." + lvl("cone") : "");
      case "reel": return "Hose reel — nozzle " + sprayRadius().toFixed(2) + " px" + (lvl("nozzle") ? " (Nozzle lv." + lvl("nozzle") + ")" : "") + ", refill " + (refillMs()/1000).toFixed(2) + " s";
      case "unit": return lvl("prowasher") ? "Pro Pressure Washer — +0.42 power, +2 px nozzle" : "Pressure washer — the stock unit";
      case "chems": var owned = chemList().filter(function(c){ return c !== "water"; }); return "Chemicals — " + (owned.length ? owned.map(function(c){ return CHEMS[c].name; }).join(", ") : "none yet (Shop)");
      case "tipjar": return "Tip Jar — customers tip for speed; watch it drain top-right during a job";
      case "foam": return "Foam Cannon lv." + lvl("foamcannon") + " — auto-cleans a spot every " + (lvl("foamcannon") >= 2 ? "0.8" : "1.35") + " s";
      case "cab": return TIERS[rigTier()][0] + (lvl("lease") ? " · Cheaper Lease lv." + lvl("lease") : "");
    }
    return "";
  }
  function wireTruckTips(){
    var svg = $("truckArt").querySelector("svg"), tip = $("truckTip");
    if(!svg) return;
    Array.prototype.slice.call(svg.querySelectorAll(".hit")).forEach(function(h){
      h.addEventListener("mouseenter", function(){ tip.textContent = partInfo(h.getAttribute("data-part")); tip.classList.remove("hidden"); });
      h.addEventListener("mouseleave", function(){ tip.classList.add("hidden"); });
    });
  }

  /* ---- the route map: a 240×100 pixel painting + chip markers ---- */
  var MARKERS = { grove:[15,58], city:[49,74], harbor:[80,36] };
  /* the coast: the sea fills the bottom-right corner; land is everything left of shoreX(y) */
  function shoreX(y){ return y < 40 ? 240 : 236 - Math.round((y-40)*1.4) + Math.round(Math.sin(y/7)*2); }
  function paintMap(){
    var mc = $("mapCanvas").getContext("2d"); mc.imageSmoothingEnabled = false;
    var keep = bx; bx = mc;
    var rng = makeRng(99);
    sky("#bfe6f4", "#e9f4da", 34); sun(214, 4);
    cloud(40, 8, 22); cloud(120, 12, 16); cloud(176, 6, 18);
    blob(30, 24, ellipseRows(70, 22, true), function(r){ return r < 3 ? P.g3 : P.g2; }, P.g1);
    blob(96, 26, ellipseRows(56, 18, true), function(r){ return r < 3 ? P.g3 : P.g2; }, P.g1);
    blob(150, 28, ellipseRows(50, 14, true), function(r){ return r < 2 ? P.g3 : P.g2; }, P.g1);
    grassField(0, 34, 240, 66, rng);
    /* the sea, with a sandy shoreline */
    for(var sy=40; sy<100; sy++){ var sx0 = shoreX(sy); if(sx0 >= 240) continue; R(sx0, sy, 240-sx0, 1, sy < 70 ? P.w3 : P.w2); R(sx0-1, sy, 2, 1, P.parchHi); R(sx0-2, sy, 1, 1, P.parchLo); }
    for(var w=0;w<16;w++){ var wy=44+Math.floor(rng()*54), wx=shoreX(wy)+4+Math.floor(rng()*Math.max(4, 236-shoreX(wy))); R(wx,wy,4,1,P.w4); R(wx+1,wy-1,2,1,P.w4); }
    if(NIGHT) lit(function(){ for(var gy=46; gy<100; gy+=2){ var gx0 = 214 + Math.round((rng()-0.5)*(6+(gy-46)*0.4)); if(gx0 > shoreX(gy)) R(gx0, gy, 2, 1, (gy&2) ? "#cfd8ff" : "#8d99cf"); } });
    /* the river, from the hills down to the sea, with a bridge on the road */
    for(var ry=30; ry<100; ry++){ var rx = 84 + Math.round(Math.sin(ry/9)*3) + Math.round((ry-30)*0.12); R(rx, ry, 8, 1, ry%7===0 ? P.w4 : P.w3); R(rx, ry, 1, 1, P.w1); R(rx+7, ry, 1, 1, P.w1); }
    /* suburb (a house is ~22 px, a car 10, a tree 12) */
    miniHouse(14, 44, 14, 8, P.parch, P.coral); miniHouse(40, 40, 12, 7, P.parchLo, P.berry);
    miniHouse(24, 62, 14, 8, P.parchHi, "#4d7f6f"); miniHouse(54, 58, 12, 7, P.parch, P.coral);
    for(var fx=8; fx<40; fx+=3){ R(fx, 80, 2, 3, P.parchHi); } R(8,81,32,1,P.parchLo);
    miniTree(8, 60); miniTree(70, 52); miniTree(48, 78); bush(66, 82, 0.5);

    /* downtown, inland east of the river — towers dwarf the houses */
    towerSlab(100, 28, 10, 34, P.c3, P.waterHi); towerSlab(112, 36, 8, 26, P.c4, P.waterHi); towerSlab(122, 20, 11, 42, P.c2, P.waterHi); towerSlab(135, 34, 9, 28, P.c3, P.waterHi);
    antenna(127, 20, 7);
    R(96, 64, 52, 3, P.c3); R(96, 64, 52, 1, P.c4); crosswalk(104, 64, 20);
    /* harbour, up the coast: a quay along the shore, a pier into the sea, boats, the lighthouse on the point */
    var qx = shoreX(54);
    R(qx-28, 50, 28, 4, P.c3); R(qx-28, 50, 28, 1, P.c4);
    box(qx-3, 58, 26, 3, P.p3, P.p4, P.p1); R(qx+1,61,2,6,P.p1); R(qx+11,61,2,6,P.p1); R(qx+20,61,2,6,P.p1);
    miniBoat(shoreX(86)+24, 86, P.coral); miniBoat(shoreX(72)+40, 72, "#4d7f6f"); sailboat(shoreX(96)+50, 96); sailboat(shoreX(66)+18, 66);
    lighthouse(230, 40, 14); buoy(shoreX(78)+6, 78); seagull(170, 44); seagull(190, 40); seagull(224, 36);
    if(NIGHT){ lit(function(){ R(qx-24, 46, 1, 4, P.stoneLo); R(qx-25, 45, 3, 1, "#fff0c4"); R(qx-8, 46, 1, 4, P.stoneLo); R(qx-9, 45, 3, 1, "#fff0c4"); }); glowDisc(qx-23, 50, 6, 3, "#8a7448"); glowDisc(qx-7, 50, 6, 3, "#8a7448"); }
    /* the road: suburb → bridge → downtown, then it winds up the coast to the quay, keeping to the land.
       A smooth curve through waypoints, stamped as a band: dark edges, grey top, a broken centre line */
    var way = [[-4,93],[30,90],[60,91],[89,90],[118,91],[142,89],[158,82],[170,72],[184,62],[198,54],[qx-4,49]];
    var pts = [];
    for(var w0=0; w0<way.length-1; w0++){
      var p0 = way[Math.max(0,w0-1)], p1 = way[w0], p2 = way[w0+1], p3 = way[Math.min(way.length-1,w0+2)];
      for(var tt=0; tt<1; tt+=0.04){ var t2=tt*tt, t3=t2*tt;   /* Catmull-Rom */
        pts.push([ 0.5*((2*p1[0]) + (-p0[0]+p2[0])*tt + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                   0.5*((2*p1[1]) + (-p0[1]+p2[1])*tt + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3) ]); }
    }
    pts.forEach(function(q){ R(q[0]-2, q[1]-2, 5, 5, P.c1); });
    pts.forEach(function(q){ R(q[0]-1, q[1]-1, 3, 3, P.c3); });
    pts.forEach(function(q, i){ if((i % 10) < 4) R(q[0], q[1], 1, 1, P.parchHi); });
    var roadY = function(x){ var best = pts[0]; pts.forEach(function(q){ if(Math.abs(q[0]-x) < Math.abs(best[0]-x)) best = q; }); return Math.round(best[1]) - 1; };
    box(82, 86, 14, 6, P.p3, P.p4, P.p1); R(82,84,14,1,P.p1); R(82,93,14,1,P.p1);
    miniCar(40, roadY(40)+1, P.coral); miniCar(112, roadY(112)+1, P.sun); miniCar(176, roadY(176)+1, P.water);
    bx = keep;
  }
  function renderMap(){
    paintMap();
    var art = $("mapArt");
    Array.prototype.slice.call(art.querySelectorAll(".map-marker")).forEach(function(el){ el.remove(); });
    var cur = state.region;
    REGION_ORDER.forEach(function(id){
      var r = REGIONS[id], open = regionUnlocked(id), active = cur===id && open;
      var m = document.createElement("div");
      m.className = "map-marker" + (active ? " is-active" : "") + (open ? "" : " is-locked");
      m.style.left = MARKERS[id][0] + "%"; m.style.top = MARKERS[id][1] + "%";
      m.innerHTML = '<span class="pw-chip">'+ic(open ? r.icon : "lock", "pw-chip__icon")+r.name+'</span>';
      if(open) m.onclick = function(){ state.region = id; save(); renderTop(); renderMap(); };
      art.appendChild(m);
    });
    var grid = $("regionGrid");
    grid.innerHTML = "";
    REGION_ORDER.forEach(function(id){
      var r = REGIONS[id], open = regionUnlocked(id), active = state.region === id;
      var card = document.createElement("div");
      card.className = "pw-card region-card" + (active && open ? " pw-card--selected" : "") + (open ? "" : " pw-card--locked");
      card.innerHTML =
        '<div class="pw-card__title">'+ic(open ? r.icon : "lock")+'<h3 class="pw-heading">'+r.name+'</h3></div>' +
        '<p class="pw-small pw-card__body">'+r.tag+'</p>' +
        '<div class="pw-caption pw-soft">Pay ×'+r.pay.toFixed(2)+' · dirt per job ×'+(r.dirt||1).toFixed(1)+'</div>' +
        '<div class="pw-card__foot"><span class="pw-label pw-tag pw-tag--price">'+ic("coin")+'×'+r.pay.toFixed(2)+' pay</span>' +
        '<span class="pw-caption pw-tag'+(open && active ? ' pw-tag--ok' : '')+'">'+(open ? (active ? ic("check")+"Current route" : "Tap to switch") : "Unlocks at "+r.unlock+" jobs")+'</span></div>';
      if(open){
        card.onclick = function(){ state.region = id; save(); renderTop(); renderMap(); };
      }
      grid.appendChild(card);
    });
  }

  /* ---- skill tree: trunks at the bottom, two straight branches each, a capstone on top ---- */
  var treeTip = null, lastTapped = null;
  function renderTree(){
    var wrap = $("treeWrap");
    wrap.innerHTML = "";
    wrap.classList.toggle("is-4", limbsNow().length > 3);
    treeTip = document.createElement("div");
    treeTip.className = "tree-tip hidden";
    function seg(x,y,w,h,live){
      var d = document.createElement("div");
      d.className = "pw-tree__edge " + (w ? "pw-tree__edge--h" : "pw-tree__edge--v") + (live ? " pw-tree__edge--owned" : "");
      d.style.left = x+"%"; d.style.top = y+"%";
      if(w) d.style.width = w+"%"; else d.style.height = h+"%";
      wrap.appendChild(d);
    }
    /* an L: up from a to the joint row, across, then up to b */
    function elbow(a, b, joint, live){
      seg(a[0], Math.min(a[1], joint), 0, Math.abs(a[1]-joint), live);
      if(a[0] !== b[0]) seg(Math.min(a[0],b[0]), joint, Math.abs(a[0]-b[0]), 0, live);
      seg(b[0], Math.min(b[1], joint), 0, Math.abs(b[1]-joint), live);
    }
    function nodeInfo(key, level){
      var def = GEAR[key], have = lvl(key), multi = def.costs.length > 1;
      var gate = treeGate(key, level);
      var status = have > level ? { text:"Installed", cls:"pw-tag--ok" }
        : gate ? { text:gate, cls:"pw-soft" }
        : { text:"Buy for " + money(costOf(key, level)), cls: state.cash >= costOf(key, level) ? "pw-tag--price" : "pw-tag--cannot" };
      return { title: def.title + (multi ? " · Lv " + (level+1) : ""), desc: def.desc[level], status: status };
    }
    function addNode(x, y, cls, key, level, badge){
      var n = document.createElement("button");
      n.className = "pw-node " + cls;
      n.style.left = x + "%"; n.style.top = y + "%";
      n.innerHTML = ic(GEAR[key].icon);
      if(badge){ var bd = document.createElement("span"); bd.className = "pw-node__lvl"; bd.textContent = badge; n.appendChild(bd); }
      n.onclick = function(e){
        var touch = e && e.pointerType === "touch";
        if(touch && n !== lastTapped){ lastTapped = n; show(); return; }   /* first tap on touch: read, second: buy */
        var gate = treeGate(key, level), cost = costOf(key, level);
        if(lvl(key) > level || gate || state.cash < cost){ show(); n.classList.remove("is-nope"); void n.offsetWidth; n.classList.add("is-nope"); return; }
        buyGear(key, cost); SFX.buy();
        if(key === "contracts" && level === 0) tellInfo("contracts", "bill", "Contracts", "Some customers now mark a patch they care about — a dashed outline on the job. Leave every cell inside it spotless and you earn a bonus on top of the pay, plus reputation. The header shows how close you are.");
        var again = wrap.querySelector('[data-key="'+key+'"][data-level="'+level+'"]');
        if(again){ again.classList.add("is-bought"); }
      };
      n.setAttribute("data-key", key); n.setAttribute("data-level", level);
      var show = function(){
        var info = nodeInfo(key, level);
        treeTip.innerHTML = '<div class="pw-heading">'+info.title+'</div><p class="pw-small">'+info.desc+'</p><p class="pw-caption '+info.status.cls+'">'+info.status.text+'</p>';
        treeTip.classList.remove("hidden");
        var W = wrap.clientWidth, H = wrap.clientHeight;
        var left = Math.max(0, Math.min(W - 220, x/100*W - 110));
        var top = y/100*H + 30;
        if(top + 96 > H) top = y/100*H - 30 - 96;
        treeTip.style.left = left + "px"; treeTip.style.top = top + "px";
      };
      n.onmouseenter = show; n.onfocus = show;
      n.onmouseleave = function(){ treeTip.classList.add("hidden"); };
      n.onblur = function(){ treeTip.classList.add("hidden"); };
      wrap.appendChild(n);
    }
    function addLabel(x, y, text){
      var l = document.createElement("span");
      l.className = "pw-tree__label";
      l.style.left = x + "%"; l.style.top = y + "%";
      l.textContent = text;
      wrap.appendChild(l);
    }

    limbsNow().forEach(function(limb){
      var coreOwned = lvl(limb.core) > 0;
      seg(limb.x, limb.y, 0, 100-limb.y, coreOwned);
      limb.twigs.forEach(function(twig){
        var def = GEAR[twig.key], prev = [limb.x, limb.y];
        twig.pts.forEach(function(pt, i){
          var owned = lvl(twig.key) > i;
          if(i === 0) elbow(prev, pt, (limb.y + pt[1])/2, owned);
          else seg(pt[0], pt[1], 0, prev[1]-pt[1], owned);
          prev = pt;
        });
      });
      var maxed = lvl(limb.twigs[0].key) >= 3 && lvl(limb.twigs[1].key) >= 3;
      var leafOwned = lvl(limb.leaf.key) > 0;
      var top0 = limb.twigs[0].pts[2], top1 = limb.twigs[1].pts[2];
      elbow(top0, [limb.leaf.x, limb.leaf.y], (top0[1] + limb.leaf.y)/2, leafOwned);
      elbow(top1, [limb.leaf.x, limb.leaf.y], (top1[1] + limb.leaf.y)/2, leafOwned);
    });
    limbsNow().forEach(function(limb){
      var coreOwned = lvl(limb.core) > 0;
      var coreGated = !!treeGate(limb.core, 0);
      addNode(limb.x, limb.y, "pw-node--core " + (coreOwned ? "pw-node--owned" : (coreGated ? "pw-node--locked" : ("pw-node--available" + (state.cash < costOf(limb.core, 0) ? " is-poor" : "")))), limb.core, 0, null);
      addLabel(limb.x, limb.y + 9, limb.label);
      limb.twigs.forEach(function(twig){
        twig.pts.forEach(function(pt, i){
          var owned = lvl(twig.key) > i;
          var cls = owned ? (i === 2 ? "pw-node--maxed" : "pw-node--owned") : ((coreOwned && lvl(twig.key) === i) ? "pw-node--available" : "pw-node--locked");
          if(cls === "pw-node--available" && state.cash < costOf(twig.key, i)) cls += " is-poor";
          addNode(pt[0], pt[1], cls, twig.key, i, i+1);
        });
      });
      var maxed = lvl(limb.twigs[0].key) >= 3 && lvl(limb.twigs[1].key) >= 3;
      var leafOwned = lvl(limb.leaf.key) > 0;
      addNode(limb.leaf.x, limb.leaf.y, leafOwned ? "pw-node--maxed" : (maxed ? ("pw-node--available" + (state.cash < costOf(limb.leaf.key, 0) ? " is-poor" : "")) : "pw-node--locked"), limb.leaf.key, 0, null);
    });
    wrap.appendChild(treeTip);
    $("treeHint").textContent = crewUnlocked() ? "Hover a node to see what it does. Dirt gets tougher with every job — keep the rig ahead of it." : "Hover a node to see what it does. The Crew limb opens once you hire someone.";
  }


  function buyGear(key, cost){
    if(state.cash < cost) return;
    state.cash -= cost;
    state.gear[key] = (state.gear[key]||0) + 1;
    save(); renderTop();
    if(!$("screen-upgrades").classList.contains("hidden")) renderTree();
    if(!$("screen-shop").classList.contains("hidden")) renderShop();
    if(!$("screen-home").classList.contains("hidden")) renderHome();
  }

  function openGearModal(key, level){
    var def = GEAR[key] || SHOP[key];
    var multi = def.costs.length > 1;
    var head = mHead(def.icon, def.title+(multi ? ' — Lv '+(level+1) : ''), def.desc[level], GEAR[key] ? "Upgrade" : "Shop");
    var closeBtn = { label:"Close", cls:"pw-btn--ghost" };

    if(lvl(key) > level){
      return showModal(head + '<p class="pw-caption pw-tag pw-tag--ok" style="justify-content:center">'+ic("check")+'Already installed</p>',
        [closeBtn], { dismissible:true });
    }
    var gate = treeGate(key, level);
    if(gate){
      return showModal(head + '<p class="pw-small pw-soft" style="margin-top:8px;">'+ic("lock")+' ' + gate + '</p>',
        [closeBtn], { dismissible:true });
    }
    var cost = costOf(key, level), afford = state.cash >= cost;
    showModal(
      head + mRows([mRow(ic("coin")+"Cost", money(cost), afford ? "" : "pw-stats__val--down"), mRow("You have", money(state.cash))]),
      [ afford
          ? { label:"Buy for "+money(cost), cls:"pw-btn--primary", action:function(){ buyGear(key, cost); } }
          : { label:"Need "+money(cost - state.cash)+" more", cls:"pw-btn--ghost" },
        { label:"Not now", cls:"pw-btn--ghost" } ],
      { dismissible:true }
    );
  }

  function cardEl(icon, title, body, sub, cls){
    var card = document.createElement("div");
    card.className = "pw-card" + (cls ? " " + cls : "");
    card.innerHTML = '<div class="pw-card__title">'+ic(icon)+'<h3 class="pw-heading">'+title+'</h3></div>' +
      '<p class="pw-small pw-card__body">'+body+'</p>' + (sub ? '<div class="pw-caption pw-soft">'+sub+'</div>' : '');
    return card;
  }
  function footEl(){ var f = document.createElement("div"); f.className = "pw-card__foot"; return f; }
  function okTag(text){ return '<span class="pw-caption pw-tag pw-tag--ok">'+ic("check")+text+'</span>'; }

  function renderShop(){
    var grid = $("shopGrid");
    grid.innerHTML = "";
    Object.keys(SHOP).forEach(function(key){
      var def = SHOP[key], l = lvl(key), maxed = l >= def.costs.length;
      var card = cardEl(def.icon, def.title, maxed ? def.desc[def.desc.length-1] : def.desc[l],
        def.costs.length>1 ? 'Level '+l+' / '+def.costs.length : '', maxed ? "pw-card--owned" : "");
      var foot = footEl();
      if(maxed){
        foot.innerHTML = okTag(def.costs.length>1 ? "Maxed" : "Installed");
      } else {
        var cost = costOf(key, l);
        foot.innerHTML = '<span class="pw-label pw-tag '+(state.cash < cost ? 'pw-tag--cannot' : 'pw-tag--price')+'">'+ic("coin")+money(cost)+'</span>';
        var btn = document.createElement("button");
        btn.className = "pw-btn pw-btn--small";
        btn.textContent = "Buy";
        btn.disabled = state.cash < cost;
        btn.onclick = function(){
          buyGear(key, cost); SFX.buy();
          if(key === "tipjar") tellInfo("tipjar", "jar", "The Tip Jar", "Customers tip for <b>speed</b>. On every job the jar starts full and drains as the timer runs — you’ll see it counting down in the top-right corner. Finish at least 80% clean and what’s left in the jar is yours.");
          else if(def.chem) tellInfo("chem_"+key, "flask", def.title, "It’s in the wand now. During a job, switch between water and your chemicals with the buttons under the stage or the number keys. Dirt that needs a chemical barely moves under the wrong one.");
        };
        foot.appendChild(btn);
      }
      card.appendChild(foot);
      grid.appendChild(card);
    });
  }

  function renderCrew(){
    var ci = crewIncome();
    $("crewSummary").innerHTML =
      '<div class="pw-panel__head"><span class="pw-heading">'+ic("hardhat","pw-icon--24")+' Crew income</span><span class="pw-label pw-tag--ok">'+money(ci)+' per job</span></div>' +
      '<p class="pw-small pw-soft">Scales with your current route ('+regionDef().name+', ×'+regionDef().pay.toFixed(2)+')'+(crewMult()>1 ? ' and crew upgrades (×'+crewMult().toFixed(2)+')' : '')+'. Wages of '+money(crewSalary())+' come off every overhead bill.</p>';
    var grid = $("crewGrid");
    grid.innerHTML = "";
    /* your son */
    (function(){
      var hired = sonHired();
      var card = document.createElement("div");
      card.className = "pw-card" + (hired ? " pw-card--owned" : "");
      card.innerHTML = '<div class="pw-card__title">'+portraitSVG("son").replace('pw-portrait__art','pw-icon--32')+'<h3 class="pw-heading">'+SON.name+'</h3></div>' +
        '<p class="pw-small pw-card__body">'+SON.blurb+'</p>' +
        '<div class="pw-caption pw-soft">'+(hired ? 'On every job with you · water gun radius '+sonRadius().toFixed(1)+' px' : 'No income — he sprays beside you on every job · pocket money '+money(SON.wage)+' per bill')+'</div>';
      var foot = footEl();
      if(!hired){
        foot.innerHTML = '<span class="pw-label pw-tag '+(state.cash < SON.hire ? 'pw-tag--cannot' : 'pw-tag--price')+'">'+ic("coin")+money(SON.hire)+'</span>';
        var b = document.createElement("button");
        b.className = "pw-btn pw-btn--small pw-btn--leaf";
        b.textContent = "Hire";
        b.disabled = state.cash < SON.hire;
        b.onclick = function(){
          if(state.cash < SON.hire) return;
          state.cash -= SON.hire; state.son = 1;
          save(); renderTop();
          if(!state.story.crewFirst) tellStory("crewFirst", renderCrew); else renderCrew();
        };
        foot.appendChild(b);
      } else {
        foot.innerHTML = okTag("Hired") + '<span class="pw-caption pw-soft">Upgrade his gun in the Crew limb</span>';
      }
      card.appendChild(foot);
      grid.appendChild(card);
    })();
    CREW.forEach(function(c){
      var hired = crewHired(c.id), l = crewLevel(c.id);
      var rate = Math.round(c.rate * (1 + l*0.6) * regionDef().pay * crewMult());
      var card = document.createElement("div");
      card.className = "pw-card" + (hired ? " pw-card--owned" : "");
      card.innerHTML = '<div class="pw-card__title">'+portraitSVG(c.id).replace('pw-portrait__art','pw-icon--32')+'<h3 class="pw-heading">'+c.name+'</h3></div>' +
        '<p class="pw-small pw-card__body">'+c.blurb+'</p>' +
        '<div class="pw-caption pw-soft">'+(c.id === "mimi" ? 'Works jobs on her own' : 'Works jobs on his own')+' — every weekday you finish a job, so does '+c.name.split(" ")[0]+'.</div>' +
        '<div class="pw-caption pw-soft">'+(hired ? 'Level '+(l+1)+' · brings in '+money(rate)+' per job · wages '+money(Math.round(c.rate*0.5*(1+l*0.6)))+' per bill' : 'Brings in '+money(Math.round(c.rate*regionDef().pay*crewMult()))+' per job · wages '+money(Math.round(c.rate*0.5))+' per bill')+'</div>';
      var foot = footEl();
      if(!hired){
        foot.innerHTML = '<span class="pw-label pw-tag '+(state.cash < c.hire ? 'pw-tag--cannot' : 'pw-tag--price')+'">'+ic("coin")+money(c.hire)+'</span>';
        var b = document.createElement("button");
        b.className = "pw-btn pw-btn--small pw-btn--leaf";
        b.textContent = "Hire";
        b.disabled = state.cash < c.hire;
        b.onclick = function(){
          if(state.cash < c.hire) return;
          state.cash -= c.hire;
          state.crew[c.id] = 0;
          save(); renderTop();
          if(!state.story.crewFirst) tellStory("crewFirst", renderCrew); else renderCrew();
        };
        foot.appendChild(b);
      } else if(l < c.ups.length){
        var cost = Math.round(c.ups[l] * (state.perks.discount ? 0.85 : 1));
        foot.innerHTML = okTag("Hired");
        var ub = document.createElement("button");
        ub.className = "pw-btn pw-btn--small";
        ub.textContent = "Train · " + money(cost);
        ub.disabled = state.cash < cost;
        ub.onclick = function(){
          if(state.cash < cost) return;
          state.cash -= cost;
          state.crew[c.id] = l + 1;
          save(); renderTop(); renderCrew();
        };
        foot.appendChild(ub);
      } else {
        foot.innerHTML = okTag("Fully trained");
      }
      card.appendChild(foot);
      grid.appendChild(card);
    });
  }

  function renderLegacy(){
    var can = !!state.legacyAvailable;
    $("legacyStatus").textContent = can
      ? "Spend your stars now — this window closes when you leave this screen."
      : "Stars are locked until your next repossession. When you lose the rig, this is what you keep.";
    var grid = $("perkGrid");
    grid.innerHTML = "";
    Object.keys(PERKS).forEach(function(k){
      var def = PERKS[k], owned = !!state.perks[k];
      var card = cardEl(def.icon, def.title, def.desc, "", owned ? "pw-card--owned" : "");
      var foot = footEl();
      if(owned){
        foot.innerHTML = okTag("Owned");
      } else {
        foot.innerHTML = '<span class="pw-label pw-tag pw-tag--rep">'+ic("star")+def.cost+'</span>';
        var b = document.createElement("button");
        b.className = "pw-btn pw-btn--small";
        b.textContent = can ? "Take it" : "Locked";
        b.disabled = !can || state.rep < def.cost;
        b.onclick = function(){
          if(!state.legacyAvailable || state.rep < def.cost) return;
          state.rep -= def.cost; state.perks[k] = true;
          save(); renderTop(); renderLegacy();
          if(k === "washbot") tellInfo("washbot", "truck", "WashBot 3000", "It rides along on every job and blasts the dirtiest spot it can find three times a second, with the right chemical built in. Enjoy retirement.");
        };
        foot.appendChild(b);
      }
      card.appendChild(foot);
      grid.appendChild(card);
    });
  }

  function renderStats(){
    $("statsPanel").innerHTML = mRows([
      mRow(ic("coin")+"Lifetime earned", money(state.lifetimeEarnings)),
      mRow(ic("wand")+"Jobs finished", state.jobsCompleted),
      mRow(ic("hardhat")+"Earned by the crew", money(state.stats.crewEarnings)),
      mRow(ic("sparkle")+"Best cleanliness", Math.round(state.stats.bestClean)+"%"),
      mRow(ic("flame")+"Current streak", state.streak),
      mRow(ic("flame")+"Longest streak", state.stats.longestStreak),
      mRow(ic("truck")+"Times repossessed", state.stats.repoCount, state.stats.repoCount ? "pw-stats__val--down" : ""),
      mRow(ic("map")+"Jobs by route", ic("house")+' '+(state.stats.grove||0)+' · '+ic("city")+' '+(state.stats.city||0)+' · '+ic("anchor")+' '+(state.stats.harbor||0))
    ]);
    var grid = $("achieveGrid");
    grid.innerHTML = "";
    ACHIEVEMENTS.forEach(function(a){
      var got = a.cond(state);
      var card = cardEl(got ? a.icon : "lock", a.title, a.desc, "", got ? "pw-card--owned" : "pw-card--locked");
      if(got){ var f = footEl(); f.innerHTML = okTag("Done"); card.appendChild(f); }
      grid.appendChild(card);
    });
  }

  /* =========================================================
     THEME
     ========================================================= */
  var THEME_KEY = "pwco_theme";
  /* "auto" follows the clock: night from 19:00 to 06:00. "day"/"night" pin it. */
  var themePref = "auto";
  function clockTheme(){ var h = new Date().getHours(); return (h >= 19 || h < 6) ? "night" : "day"; }
  function effectiveTheme(){ return themePref === "auto" ? clockTheme() : themePref; }
  function applyTheme(pref){
    themePref = pref === "day" || pref === "night" ? pref : "auto";
    try{ localStorage.setItem(THEME_KEY, themePref); }catch(e){}
    var t = effectiveTheme();
    document.documentElement.setAttribute("data-theme", t);
    if(!(job && !job.ended)) syncScene();   /* a running job keeps its painted scene; the next one follows */
  }
  function syncScene(){ var n = effectiveTheme() === "night"; if(n !== NIGHT || !P.ink){ setNight(n); loadPalette(); Sprites.reset(); } }
  /* the clock moves on: switch when it does, but never in the middle of a job (the scene is painted) */
  function syncClockTheme(){
    if(themePref !== "auto" || (job && !job.ended)) return;
    if(document.documentElement.getAttribute("data-theme") === effectiveTheme()) return;
    applyTheme("auto");
    if(!$("screen-home").classList.contains("hidden")) renderHome();
    if(!$("screen-map").classList.contains("hidden")) renderMap();
  }
  setInterval(syncClockTheme, 60000);
  try{ applyTheme(localStorage.getItem(THEME_KEY) || "auto"); }catch(e){ applyTheme("auto"); }


  /* =========================================================
     NAV WIRING
     ========================================================= */
  $("btnStartJob").onclick = function(){
    /* no chemical for the dirt out there? offer the shop first */
    var missing = peekJobTypes().filter(function(t){ return t.chem && !chemOwned(t.chem); });
    if(!missing.length) return startJob();
    var names = missing.map(function(t){ return CHEMS[t.chem].name; }).join(" and ");
    showModal(
      mHead(CHEMS[missing[0].chem].icon, "Missing " + names, "Today’s job has " + missing.map(function(t){ return t.name; }).join(" and ") + ". Without the right chemical that dirt barely moves — you’d be paid for the rest, if there is any.", "Before you go") +
      dirtRows(missing) +
      mNote(missing.map(function(t){ return CHEMS[t.chem].name + " is " + money(costOf(t.chem, 0)); }).join(", ") + " in the Shop. You have " + money(state.cash) + "."),
      [ { label:"Go to the Shop", cls:"pw-btn--primary", icon:"flask", action:function(){ showScreen("screen-shop"); } },
        { label:"Start anyway", cls:"pw-btn--ghost", action:function(){ startJob(); } } ],
      { dismissible:true }
    );
  };
  $("btnMapQuick").onclick = function(){ showScreen("screen-map"); };
  Array.prototype.slice.call(document.querySelectorAll("#tabs .tab")).forEach(function(t){
    t.onclick = function(){ showScreen(t.getAttribute("data-screen")); };
  });
  $("btnSettings").onclick = openSettings;
  $("btnJobSettings").onclick = function(){ pauseJob(); openSettings(); };
  $("btnTitleSettings").onclick = openSettings;
  /* packing up ends the job as it stands: paid for what's clean */
  $("btnQuitJob").onclick = function(){
    if(job && job.started && !job.ended){ endJob("early"); return; }
    stopJobLoop();
    if(job) job.ended = true;
    job = null;
    showScreen("screen-home");
  };
  function renderTitle(){
    $("titleMascot").innerHTML = mascotSVG();
    var hasSave = state.jobsCompleted > 0 || !!state.story.intro;
    $("btnContinue").classList.toggle("hidden", !hasSave);
    $("btnNewGame").className = "pw-btn pw-btn--block " + (hasSave ? "" : "pw-btn--primary pw-btn--big");
    $("btnNewGame").innerHTML = (hasSave ? "" : ic("wand","pw-btn__icon")) + (hasSave ? "New game" : "Start");
  }
  $("btnContinue").onclick = function(){ showScreen("screen-home"); };
  $("btnNewGame").onclick = function(){
    var go = function(){ state = defaultState(); save(); renderTop(); showScreen("screen-home"); tellStory("intro", null); };
    if(state.jobsCompleted > 0 || state.story.intro){
      showModal(mHead("truck", "Start over?", "Your current save — cash, gear, crew and stars — is wiped.", "New game"),
        [{ label:"Yes, new game", cls:"pw-btn--primary", action:go }, { label:"Cancel", cls:"pw-btn--ghost" }], { dismissible:true });
    } else go();
  };

  /* =========================================================
     BOOT
     ========================================================= */
  renderTop();
  renderTitle();
  showScreen("screen-title");

  /* =========================================================
     TEST HOOK — the Playwright suite in tests/ drives the game through this.
     Everything here is a thin door into the closure; nothing in the game calls it.
     ========================================================= */
  window.PowerWashDebug = {
    get state(){ return state; },
    get job(){ return job; },
    reset: function(){ state = defaultState(); save(); renderTop(); renderTitle(); showScreen("screen-title"); return state; },
    /* shallow-merge a patch into state (nested objects like gear/perks merge one level down) */
    patch: function(p){
      Object.keys(p).forEach(function(k){
        var v = p[k];
        state[k] = (v && typeof v === "object" && !Array.isArray(v)) ? Object.assign(state[k] || {}, v) : v;
      });
      save(); renderTop();
      if(!$("screen-home").classList.contains("hidden")) renderHome();
      return state;
    },
    show: showScreen,
    startJob: function(key){ if(job){ stopJobLoop(); job.ended = true; job = null; } hideModal(); forcedJob = key || null; startJob(); forcedJob = null; },
    endJob: endJob,
    /* clear the first `frac` (0–1) of dirty cells outright, as if washed */
    wash: function(frac){
      if(!job || !grime) return 0;
      var dirty = [];
      for(var i=0;i<grime.length;i++) if(grime[i] > 0.03) dirty.push(i);
      var n = Math.round(dirty.length * clamp(frac == null ? 1 : frac, 0, 1));
      for(var k=0;k<n;k++){ var idx = dirty[k]; grimeLeft -= grime[idx]; grime[idx] = 0; cellsClear++; paintCell(idx % gCols, Math.floor(idx / gCols)); }
      updateClean();
      return n;
    },
    spray: function(x, y, radius, power, chem){ return sprayGrime(x, y, radius, power, chem); },
    pause: pauseJob, resume: resumeJob, paused: function(){ return paused; },
    cleanliness: cleanliness,
    advanceDay: advanceDay,
    triggerBill: triggerBill,
    buyGear: buyGear,
    formulas: {
      costOf: costOf, tankMax: tankMax, sprayPower: sprayPower, sprayRadius: sprayRadius, waterPerTick: waterPerTick, waterPerSecond: waterPerSecond,
      refillMs: refillMs, jobMs: jobMs, overheadAmount: overheadAmount, crewSalary: crewSalary, contractBonus: contractBonus, grimeToughness: grimeToughness,
      rigMult: rigMult, progressToughness: progressToughness, chemFactor: chemFactor, starsFor: starsFor, cleanPayFactor: cleanPayFactor, payMult: payMult,
      overheadMult: overheadMult, leaseMult: leaseMult
    },
    data: { GEAR: GEAR, SHOP: SHOP, PERKS: PERKS, CHEMS: CHEMS, GRIME_TYPES: GRIME_TYPES, JOBS: JOBS, REGIONS: REGIONS, LIMB_DEFS: LIMB_DEFS, DIRT_UNLOCK: DIRT_UNLOCK, WRONG_CHEM: WRONG_CHEM, icons: Object.keys(ICONS) },
    grimeStats: function(){ var n = 0, hp = 0; if(grime) for(var i=0;i<grime.length;i++){ if(grime[i] > 0.03){ n++; hp += grime[i]; } } return { cells: n, hp: hp, cols: gCols, rows: gRows }; },
    night: function(){ return NIGHT; },
    theme: function(){ return { pref: themePref, effective: effectiveTheme() }; }, applyTheme: applyTheme,
    Sprites: Sprites,
    SPRITES: SPRITES
  };

})();
</script>
</body>
</html>
