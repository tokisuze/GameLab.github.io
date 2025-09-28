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

/* ==== DISCO PATCH v1 (safe) ==== */
(function(){
  // кнопки, которые уже есть у тебя в шапке
  const armedBtn   = document.getElementById('armedToggle');
  const mysteryBtn = document.getElementById('mysteryBtn');


  // если вдруг на этой странице их нет — выходим тихо
  if(!mysteryBtn) return;


  // лёгкая "жизнь" Armed Mode, чтобы не ломать логику
  if (armedBtn && !armedBtn.dataset._patched) {
    armedBtn.dataset._patched = '1';
    armedBtn.addEventListener('click', () => {
      const on = armedBtn.dataset.on === '1';
      armedBtn.dataset.on = on ? '0' : '1';
      armedBtn.textContent = on ? '🔫 Armed Mode' : '🔫 Armed Mode (on)';
    });
  }


  // === Disco ===
  const audioPath = 'assets/energy_fm.mp3';   // ← твой трек
  const ball = document.getElementById('discoBall');
  const audio = new Audio(audioPath);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.9;


  let discoOn = false;
  let bpm = 123;                               // ← поставь точный BPM
  setBeat(bpm);


  function setBeat(v){
    const sec = 60 / Math.max(1, v);
    document.body.style.setProperty('--beat', `${sec}s`);
  }


  function fadeOut(a, ms=600){
    const v0 = a.volume, t0 = performance.now();
    function step(){
      const k = Math.min(1, (performance.now() - t0)/ms);
      a.volume = Math.max(0, v0*(1-k));
      if(k < 1) requestAnimationFrame(step); else { a.pause(); a.volume = v0; }
    }
    requestAnimationFrame(step);
  }


  async function toggleDisco(){
    discoOn = !discoOn;
    document.body.classList.toggle('disco', discoOn);
    if (discoOn) {
      try { audio.currentTime = 0; await audio.play(); } catch(e) { /* ok */ }
    } else {
      fadeOut(audio, 600);
    }
  }


  mysteryBtn.addEventListener('click', toggleDisco);


  // ПКМ по Mystery — задать BPM (чтобы «плясали в бит»)
  mysteryBtn.addEventListener('contextmenu', (e)=>{
    e.preventDefault();
    const v = +prompt('BPM трека?', bpm);
    if (v && v > 40 && v < 260) { bpm = v; setBeat(bpm); }
  });


  console.log('%cMystery: ЛКМ — диско, ПКМ — задать BPM', 'color:#8ac7ff');
})();

/* ==== DISCO PATCH v2: WebAudio-анализ бита ==== */
(function(){
  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('WebAudio не поддерживается — будет только BPM-анимация.');
    return;
  }


  // пробуем найти уже созданные объекты из твоего кода
  const mysteryBtn = document.getElementById('mysteryBtn');


  // если нет Mystery — выходим
  if (!mysteryBtn) return;


  // перехватим существующий toggleDisco, если он в глобале
  let _toggleRef = null;
  try { _toggleRef = toggleDisco; } catch(_) {}


  // состояние аудиоанализа
  let ctx, src, analyser, data, rafId = 0;
  let lastKick = 0;


  function setupAnalyser(mediaEl){
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (!src) src = ctx.createMediaElementSource(mediaEl);
    if (!analyser){
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256; // маленький FFT хватит
      analyser.smoothingTimeConstant = 0.8;
      data = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(ctx.destination);
    }
  }


  function startLoop(){
    cancelAnimationFrame(rafId);
    const buttons = Array.from(document.querySelectorAll('.toolbar .btn'));


    const kickLowBin = 1;   // низкие частоты (0..3 — эксперименты)
    const kickHiBin  = 4;


    let smooth = 0;
    function loop(){
      rafId = requestAnimationFrame(loop);
      if (!analyser) return;


      analyser.getByteFrequencyData(data);


      // средняя энергия баса
      let sum = 0, n = 0;
      for (let i = kickLowBin; i <= kickHiBin; i++){ sum += data[i]; n++; }
      let energy = (n? sum/n : 0) / 255; // 0..1


      // сгладим + «инерция» на спад
      smooth = Math.max(energy, smooth * 0.92);


      // выставим CSS-переменную амплитуды (для свечения/фильтра)
      document.body.style.setProperty('--amp', smooth.toFixed(3));


      // Добавочный «пинок» кнопкам — делаем более заметный прыжок
      const kick = Math.max(0, smooth - 0.25) * 1.4; // чувствительность
      if (kick > 0.05){
        // слегка рандомный вектор, чтобы не синхронно
        buttons.forEach((btn, idx) => {
          const dir = idx % 2 === 0 ? 1 : -1;
          const dx = (Math.random()*2-1) * 2 * kick; // ±2px * kick
          const dy = -8 * kick;                      // вверх
          const rot= dir * 6 * kick;                 // градусы
          // применяем «удар» поверх текущей анимации
          btn.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${1 + 0.06 * kick})`;
          // плавно вернуть обратно за 90мс
          setTimeout(()=>{ btn.style.transform = ''; }, 90);
        });
        lastKick = performance.now();
      }
    }
    loop();
  }


  function stopLoop(){
    cancelAnimationFrame(rafId);
    rafId = 0;
    // чистим инлайн-стили
    document.querySelectorAll('.toolbar .btn').forEach(b => b.style.transform = '');
  }


  // Оборачиваем твой toggleDisco — добавляем запуск/остановку анализа
  if (_toggleRef){
    window.toggleDisco = async function(){
      const before = document.body.classList.contains('disco');
      await _toggleRef(); // вызвать твой


      const nowOn = document.body.classList.contains('disco');
      if (nowOn && window.disco && window.disco.audio){
        try {
          setupAnalyser(window.disco.audio);
          if (ctx.state === 'suspended') await ctx.resume();
          startLoop();
        } catch(e){ console.warn('Analyser error', e); }
      } else {
        stopLoop();
      }
    };
  } else {
    // если нет ссылки на старую функцию — просто подписываемся на кнопку
    mysteryBtn.addEventListener('click', () => {
      const nowOn = document.body.classList.contains('disco');
      if (nowOn && window.disco && window.disco.audio){
        try {
          setupAnalyser(window.disco.audio);
          startLoop();
        } catch(e){ console.warn('Analyser error', e); }
      } else {
        stopLoop();
      }
    });
  }
})();

/* ==== DISCO PATCH v3 (сильный удар + форс прозрачности) ==== */
(function(){
  const mysteryBtn = document.getElementById('mysteryBtn');
  const armedBtn   = document.getElementById('armedToggle');
  if (!mysteryBtn) return;


  // форсируем прозрачность на входе в диско (на случай, если стили перебиваются)
  function forceTransparent(on){
    [mysteryBtn, armedBtn].forEach(btn=>{
      if (!btn) return;
      if (on) {
        btn.style.background = 'transparent';
        btn.style.color = '#fff';
        btn.style.borderColor = 'rgba(255,255,255,.35)';
        btn.style.boxShadow = 'none';
      } else {
        // очищаем инлайны — вернутся твои исходные стили
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.boxShadow = '';
        btn.style.transform = '';
      }
    });
  }


  // перехватываем существующий toggleDisco (из прошлого патча), если есть
  let toggleRef = null;
  try { toggleRef = window.toggleDisco; } catch(_) {}


  // WebAudio-анализ для «удара»
  let ctx, analyser, data, src, raf = 0;
  function setupAnalyser(mediaEl){
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    if (!ctx) ctx = new AudioCtx();
    if (!src) src = ctx.createMediaElementSource(mediaEl);
    if (!analyser){
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      data = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(ctx.destination);
    }
    return true;
  }


  function startKick(){
    cancelAnimationFrame(raf);
    const targets = [mtery(mysteryBtn), mtery(armedBtn)].filter(Boolean);


    let smooth = 0;
    function loop(){
      raf = requestAnimationFrame(loop);
      if (!analyser) return;
      analyser.getByteFrequencyData(data);


      // берём нижние бины (бас)
      let sum = 0, n = 0;
      for (let i=1;i<=5;i++){ sum += data[i]; n++; }
      let energy = (n ? sum/n : 0) / 255; // 0..1
      // сглаживание с инерцией
      smooth = Math.max(energy, smooth * 0.9);


      // прокинем в CSS переменную для «свечения»
      document.body.style.setProperty('--amp', smooth.toFixed(3));


      // сильный «кик»: заметный сдвиг/поворот
      const kick = Math.max(0, smooth - 0.22) * 2.1; // чувствительность ↑
      if (kick > 0.04){
        targets.forEach((btn, idx)=>{
          const dir = idx % 2 ? -1 : 1;
          const dx = (Math.random()*6 - 3) * (4 + kick*18); // ± сильнее
          const dy = - (6 + kick*22);                       // вверх
          const rot= dir * (8 + kick*16);                   // градусов
          const scale = 1 + 0.07 * kick;
          btn.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`;
          setTimeout(()=>{ btn.style.transform = ''; }, 140); // дольше держим удар
        });
      }
    }
    loop();


    function mtery(el){ return el || null; }
  }


  function stopKick(){
    cancelAnimationFrame(raf);
    [mysteryBtn, armedBtn].forEach(b => b && (b.style.transform=''));
  }


  // Обёртка поверх твоего toggleDisco, чтобы включать/выключать анализ и прозрачность
  if (toggleRef){
    window.toggleDisco = async function(){
      const wasOn = document.body.classList.contains('disco');
      await toggleRef(); // вызвать твой оригинал
      const nowOn = document.body.classList.contains('disco');


      forceTransparent(nowOn);


      if (nowOn && window.disco && window.disco.audio && setupAnalyser(window.disco.audio)) {
        try { if (ctx.state === 'suspended') await ctx.resume(); } catch(_){}
        startKick();
      } else {
        stopKick();
      }
    };
  } else {
    // fallback: просто реагируем на клик и класс body.disco
    mysteryBtn.addEventListener('click', ()=>{
      const on = document.body.classList.contains('disco');
      forceTransparent(on);
      if (on && window.disco && window.disco.audio && setupAnalyser(window.disco.audio)) {
        startKick();
      } else {
        stopKick();
      }
    });
  }
})();
