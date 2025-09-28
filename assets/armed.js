(function(){
  const byId = (id)=>document.getElementById(id);
  const overlay  = byId('armedOverlay');
  const cross    = byId('cross');
  const toggle   = byId('armedToggle');
  const repairBtn= byId('repairBtn');
  const banner   = byId('armedBanner');
  const hudIdle  = byId('doomHud');
  const hudFire  = byId('doomFire');

  if(!overlay || !cross || !toggle) return;

  // ===== Shot SFX (короткий «бах») =====
  const AC = window.AudioContext || window.webkitAudioContext;
  let sctx = null;
  function ensureAudio(){ if(!sctx) sctx = new AC(); if(sctx.state==='suspended'){ sctx.resume().catch(()=>{}); } }
  function sfxShot(){
    try{
      ensureAudio();
      const t = sctx.currentTime;

      // triangle blip
      const o = sctx.createOscillator(); o.type='triangle';
      const g = sctx.createGain(); g.gain.setValueAtTime(0.28,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);
      o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(80,t+0.07);
      o.connect(g).connect(sctx.destination); o.start(t); o.stop(t+0.09);

      // noise burst
      const len=0.06, b=sctx.createBuffer(1, Math.max(1,(sctx.sampleRate*len)|0), sctx.sampleRate);
      const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
      const n=sctx.createBufferSource(); n.buffer=b;
      const gn=sctx.createGain(); gn.gain.setValueAtTime(0.25,t); gn.gain.exponentialRampToValueAtTime(0.0001,t+len);
      n.connect(gn).connect(sctx.destination); n.start(t); n.stop(t+len);
    }catch(e){}
  }

  // ===== State =====
  let armed=false, ready=false;          // ready=false => стрелять нельзя (идёт «взвод»)
  let armTimer=null, lastShot=0, lastHitTime=0, combo=0;
  const ARM_DELAY_MS = 9000;             // 9 секунд
  const AUTO_REPAIR_MS = 10000;
  const hp=new WeakMap(), timers=new WeakMap();

  // ===== Panic (бегство кнопок) =====
  let panicking=false;
  const PANIC_TAG = 'data-panic';
  function injectPanicCSS(){
    if(document.getElementById('panicStyles')) return;
    const st=document.createElement('style'); st.id='panicStyles';
    st.textContent = `
      @keyframes panicMove {
        from { transform: translate(var(--dx,0), var(--dy,0)); }
        to   { transform: translate(calc(var(--dx,0) * -1), calc(var(--dy,0) * -1)); }
      }
      .panic-run {
        position: relative !important;
        will-change: transform;
        animation-name: panicMove;
        animation-iteration-count: infinite;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
      }`;
    document.head.appendChild(st);
  }
  function rand(min,max){ return Math.random()*(max-min)+min; }
  function isVisible(el){
    const r=el.getBoundingClientRect();
    return r.width>0 && r.height>0 && getComputedStyle(el).visibility!=='hidden';
  }
  function interactiveList(){
    return Array.from(document.querySelectorAll(
      'a,button,input,select,textarea,[role=button],[role=link],[role=switch],[tabindex]'
    )).filter(el=>{
      const ti=el.getAttribute('tabindex'); if(ti!==null && +ti<0) return false;
      if(el.closest('#armedOverlay')) return false;
      return isVisible(el);
    });
  }
  function startPanic(){
    injectPanicCSS();
    panicking=true;
    interactiveList().forEach(el=>{
      // уже сломанные — тоже пусть бегают; если мешает, можно исключить .broken
      el.classList.add('panic-run');
      el.style.setProperty('--dx', `${Math.round(rand(-120,120))}px`);
      el.style.setProperty('--dy', `${Math.round(rand(-80,80))}px`);
      el.style.animationDuration = `${rand(0.9,1.6).toFixed(2)}s`;
      el.setAttribute(PANIC_TAG,'1');
    });
  }
  function stopPanic(){
    panicking=false;
    document.querySelectorAll(`[${PANIC_TAG}]`).forEach(el=>{
      el.classList.remove('panic-run');
      el.style.removeProperty('--dx'); el.style.removeProperty('--dy');
      el.style.removeProperty('animation-duration');
      el.removeAttribute(PANIC_TAG);
    });
  }

  // ===== Utils =====
  function setBanner(txt, show=true){
    if(!banner) return;
    banner.textContent = txt;
    banner.style.display = show ? 'block' : 'none';
  }

  function isInteractive(el){
    if(!el || el===document.body) return false;
    const t=(el.tagName||'').toLowerCase();
    if(['a','button','input','select','textarea','summary','details'].includes(t)) return true;
    const r=el.getAttribute && el.getAttribute('role');
    if(r==='button'||r==='link'||r==='switch') return true;
    const ti=el.getAttribute && el.getAttribute('tabindex');
    return (ti!==null && +ti>=0);
  }
  function isShootable(el){
    if(!el || el===document.body) return false;
    if(el.id==='armedOverlay'||(overlay&&overlay.contains(el))) return false;
    const rect = el.getBoundingClientRect();
    if(rect.width<=0 || rect.height<=0) return false;
    if(getComputedStyle(el).visibility==='hidden') return false;
    if(isInteractive(el)) return true;
    const txt=(el.textContent||'').trim();
    return txt.length>0;
  }
  const getHP=(el)=> hp.get(el) ?? (isInteractive(el)?3:2);
  const setHP=(el,v)=> hp.set(el,v);

  function flash(x,y){
    const d=document.createElement('div');
    d.className='hitflash';
    d.style.left=x+'px'; d.style.top=y+'px';
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),140);
  }

  function breakEl(el){
    if(isInteractive(el)){
      el.classList.add('broken');
      if(el.tagName==='A'){
        if(!el.dataset.origHref) el.dataset.origHref=el.getAttribute('href')||'';
        el.setAttribute('href','#');
      }
      if('disabled'in el) el.disabled=true;
      el.setAttribute('aria-disabled','true');
    } else {
      el.classList.add('broken-text');
    }
    if(el!==repairBtn){
      clearTimeout(timers.get(el));
      timers.set(el, setTimeout(()=>repairEl(el), AUTO_REPAIR_MS));
    }
  }
  function repairEl(el){
    el.classList.remove('broken','broken-text','hit');
    if(el.getAttribute&&el.getAttribute('aria-disabled')==='true') el.removeAttribute('aria-disabled');
    if('disabled'in el) el.disabled=false;
    if(el.tagName==='A'&&el.dataset&&'origHref'in el.dataset) el.setAttribute('href',el.dataset.origHref);
    setHP(el, isInteractive(el)?3:2);
  }

  function findTarget(x,y){
    const els=document.elementsFromPoint(x,y);
    for(const el of els){
      if(isShootable(el)) return el;
      const t=el.closest&&el.closest('[data-target],a,button,input,select,textarea,[tabindex],[role=button],[role=link],[role=switch]');
      if(t&&isShootable(t)) return t;
    }
    return null;
  }
  function damage(t,dmg){
    let cur=getHP(t)-dmg; setHP(t,cur);
    t.classList.add('hit'); setTimeout(()=>t.classList.remove('hit'),150);
    const now=performance.now();
    combo=(now-lastHitTime<700)?(combo+1):1; lastHitTime=now;
    if(cur<=0) breakEl(t);
  }

  // ===== Warm-up (9s) =====
  function startWarmup(){
    ready=false;
    const start = performance.now();
    function tick(){
      const elapsed = performance.now() - start;
      const rest = Math.max(0, ARM_DELAY_MS - elapsed);
      const sec = Math.ceil(rest/1000);
      setBanner(`Взвод... ${sec} сек`, true);
      cross.style.opacity = 0.5;
      if(rest > 0 && armed){
        armTimer = requestAnimationFrame(tick);
      } else if (armed) {
        ready = true;
        cross.style.opacity = '';
        setBanner('Armed Mode включён. Esc/Q/ПКМ — выход.', true);
        startPanic(); // ← запускаем бегство после взвода
      }
    }
    armTimer && cancelAnimationFrame(armTimer);
    armTimer = requestAnimationFrame(tick);
  }
  function cancelWarmup(){
    armTimer && cancelAnimationFrame(armTimer);
    armTimer = null;
    ready = false;
    cross.style.opacity = '';
  }

  // ===== Show/Hide Armed Mode =====
  function show(v){
    armed = v;
    overlay.style.display = v ? 'block' : 'none';
    document.body.style.cursor = v ? 'none' : '';

    // HUD visibility
    if (hudIdle) hudIdle.style.display = v ? 'block' : 'none';
    if (hudFire) hudFire.style.display = 'none';

    if(v){
      window.__music && window.__music.start && window.__music.start();
      startWarmup();
    }else{
      window.__music && window.__music.stop && window.__music.stop();
      cancelWarmup();
      stopPanic(); // ← останавливаем бегство
      setBanner('', false);
    }
  }

  // ===== Toggle & quick repair =====
  toggle.addEventListener('click', ()=>show(!armed));
  if(repairBtn) repairBtn.addEventListener('click', ()=>{
    document.querySelectorAll('.broken,.broken-text').forEach(repairEl);
  });

  // ===== Pointer =====
  document.addEventListener('mousemove', (e)=>{
    if(!armed) return;
    cross.style.left=e.clientX+'px';
    cross.style.top=e.clientY+'px';
    const t=findTarget(e.clientX,e.clientY);
    cross.classList.toggle('target', !!t && ready);
  });

  // ===== Full block UI in Armed + shooting only when ready =====
  document.addEventListener('mousedown', (e)=>{
    if(!armed) return;
    if(e.button===2){ e.preventDefault(); show(false); return; }

    // Блокируем действия по интерфейсу всегда
    e.preventDefault(); e.stopPropagation();

    if(!ready) return; // ещё «взводится»

    const now=performance.now(); if(now-lastShot<110) return; lastShot=now;
    ensureAudio(); sfxShot(); flash(e.clientX,e.clientY);

    // Меняем HUD: idle -> fire -> idle
    if (hudIdle && hudFire){
      hudIdle.style.display = 'none';
      hudFire.style.display = 'block';
      clearTimeout(hudFire._t);
      hudFire._t = setTimeout(()=>{
        hudFire.style.display = 'none';
        hudIdle.style.display = 'block';
      }, 120);
    }

    const t=findTarget(e.clientX,e.clientY); if(t) damage(t,1);
  }, true);

  ['click','auxclick','contextmenu'].forEach(type=>{
    document.addEventListener(type, (e)=>{
      if(armed){ e.preventDefault(); e.stopPropagation(); }
    }, true);
  });

  document.addEventListener('keydown', (e)=>{
    const k=e.key.toLowerCase();
    if(armed){
      if(k==='enter'||k===' '){ e.preventDefault(); e.stopPropagation(); return; }
      if(k==='escape'||k==='esc'||k==='q'){ show(false); }
    } else if(k==='j'){
      document.querySelectorAll('.broken,.broken-text').forEach(repairEl);
    }
  });
})();
