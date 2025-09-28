(function(){
  const byId = (id)=>document.getElementById(id);
  const mysteryBtn = byId('mysteryBtn');
  const themeBtn   = byId('themeBtn');
  const repairBtn  = byId('repairBtn');
  const consoleBtn = byId('consoleBtn');
  const statusEl   = byId('musicStatus');

  // =========================
  //  Theme toggle
  // =========================
  function applyTheme(light){
    if(light){
      document.documentElement.style.setProperty('--bg1','#f6f8fb');
      document.documentElement.style.setProperty('--bg2','#e9eef6');
      document.documentElement.style.setProperty('--panel','#ffffff');
      document.documentElement.style.setProperty('--card','#ffffff');
      document.documentElement.style.setProperty('--text','#0f1216');
      document.documentElement.style.setProperty('--muted','#3b4656');
    } else {
      ['--bg1','--bg2','--panel','--card','--text','--muted']
        .forEach(v=>document.documentElement.style.removeProperty(v));
    }
  }
  if(themeBtn) themeBtn.addEventListener('click', ()=>{
    const light = getComputedStyle(document.documentElement).getPropertyValue('--bg1')==='';
    applyTheme(light);
  });

  // =========================
  //  Mystery wobble
  // =========================
  if(mysteryBtn) mysteryBtn.addEventListener('click', ()=>{
    document.body.classList.toggle('wobble');
    mysteryBtn.textContent = document.body.classList.contains('wobble')
      ? '🌀 Mystery ON' : '❓ Mystery';
  });

  // =========================
  //  Console demo
  // =========================
  if(consoleBtn) consoleBtn.addEventListener('click', ()=> alert('Консоль (демо)'));

  // =========================
  //  Music: <audio> (локальный MP3) + WebAudio fallback, с плавным OFF
  // =========================
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx=null, musicOn=false, musicGain=null, musicSource=null,
      fallbackTimer=null, toggling=false,
      mediaEl=null; // <audio> для локального файла

  function status(on){
    if(!statusEl) return;
    statusEl.textContent='Music: ' + (on?'ON':'OFF');
    statusEl.classList.add('show');
    clearTimeout(statusEl._t);
    statusEl._t=setTimeout(()=>statusEl.classList.remove('show'), 900);
  }

  function ensureAudio(){
    if(!actx) actx=new AC();
    if(actx && actx.state==='suspended'){ actx.resume().catch(()=>{}); }
  }

  function clearFallback(){
    if(fallbackTimer){ clearInterval(fallbackTimer); fallbackTimer=null; }
  }

  function stopAll(){
    try{
      if(musicSource){
        try{ musicSource.onended=null; musicSource.stop(0);}catch(e){}
        try{ musicSource.disconnect(); }catch(e){}
      }
      if(musicGain){ try{ musicGain.disconnect(); }catch(e){} }
      if(mediaEl){
        try{ mediaEl.pause(); mediaEl.src=''; }catch(e){}
        mediaEl=null;
      }
    }catch(e){}
    musicSource=null; musicGain=null;
    clearFallback();
  }

  // Плавное выключение и для WebAudio, и для <audio>
  function stopMusic(){
    let fadeDonePromise = Promise.resolve();

    // WebAudio fade
    try{
      if(musicGain && actx){
        const now=actx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setValueAtTime(musicGain.gain.value, now);
        musicGain.gain.linearRampToValueAtTime(0.0001, now+0.6);
        fadeDonePromise = new Promise(res=> setTimeout(res, 640));
      }
    }catch(e){}

    // <audio> fade
    if(mediaEl){
      const startVol = mediaEl.volume ?? 1;
      const steps = 12, stepMs = 50;
      let i=0;
      fadeDonePromise = new Promise(res=>{
        const int = setInterval(()=>{
          i++;
          mediaEl.volume = Math.max(0, startVol * (1 - i/steps));
          if(i>=steps){
            clearInterval(int);
            try{ mediaEl.pause(); mediaEl.src=''; }catch(e){}
            mediaEl=null; res();
          }
        }, stepMs);
      });
    }

    fadeDonePromise.finally(()=>{
      stopAll();
      musicOn=false;
      status(false);
    });
  }

  // Локальный MP3 через <audio> (работает и при file://)
  async function tryLoad(){
    try{
      // Сначала тушим старое
      stopAll();

      // Затем создаём и запускаем локальный doom_theme.mp3
      mediaEl = new Audio('assets/doom_theme.mp3'); // положи свой файл сюда
      mediaEl.loop = true;
      mediaEl.volume = 0.20;
      await mediaEl.play(); // пользовательский клик/действие уже был (включение Armed Mode)

      musicOn = true;
      status(true);
      return true;
    }catch(e){
      mediaEl = null;
      return false;
    }
  }

  // Синтез-бит как запасной вариант
  function startFallback(){
    stopAll(); ensureAudio(); musicOn=true; status(true);
    const tempo=100, beat=60/tempo, step=beat/4; let i=0;

    function noise(len=0.05,gain=0.1){
      const b=actx.createBuffer(1, Math.max(1,(actx.sampleRate*len)|0), actx.sampleRate);
      const d=b.getChannelData(0);
      for(let k=0;k<d.length;k++) d[k]=(Math.random()*2-1)*Math.pow(1-k/d.length,2);
      const s=actx.createBufferSource(); s.buffer=b;
      const g=actx.createGain(); g.gain.value=gain;
      s.connect(g).connect(actx.destination);
      const now=actx.currentTime; s.start(now); s.stop(now+len);
    }
    function kick(){ const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
      o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.linearRampToValueAtTime(40,t+0.12);
      g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+0.22);
    }
    function bass(f,d){ const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
      o.type='sawtooth'; o.frequency.value=f; g.gain.value=0.06;
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+d);
    }

    clearFallback();
    fallbackTimer = setInterval(()=>{
      if(!musicOn){ clearFallback(); return; }
      const pos=i%16;
      if(pos===0||pos===8) kick();
      if(pos===4||pos===12) noise(0.12,0.22);
      if(pos%2===0) noise(0.05,0.1);
      if(pos===0) bass(55,1.5*beat);
      if(pos===8) bass(49,1.5*beat);
      i++;
    }, Math.max(30, step*1000));
  }

  // Публичное API для Armed Mode
  window.__music = {
    start: async () => {
      if (musicOn) return true;
      if (!(await tryLoad())) startFallback();
      return musicOn;
    },
    stop: () => {
      if (musicOn) stopMusic();
    }
  };

  // =========================
  //  Repair (чинит всё «сломанное»)
  // =========================
  if(repairBtn) repairBtn.addEventListener('click', ()=>{
    document.querySelectorAll('.broken,.broken-text').forEach(el=>{
      el.classList.remove('broken','broken-text','hit');
      if(el.getAttribute&&el.getAttribute('aria-disabled')==='true') el.removeAttribute('aria-disabled');
      if('disabled'in el) el.disabled=false;
      if(el.tagName==='A' && el.dataset && 'origHref'in el.dataset) el.setAttribute('href', el.dataset.origHref);
    });
    if(statusEl){
      statusEl.textContent='Repair: OK';
      statusEl.classList.add('show');
      clearTimeout(statusEl._t);
      statusEl._t=setTimeout(()=>statusEl.classList.remove('show'),900);
    }
  });

})();
