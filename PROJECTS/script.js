// 360° carousel + video lightbox (mobile+desktop tuned)
// - Natural front scaling (no CSS transform override)
// - Desktop: slightly smaller & pushed left via CSS vars
// - Mobile: centered, fully visible, good drag feel

(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // ---- Feel tuning (per viewport) ----
  function getConfig() {
    const w = window.innerWidth;
    // radius = wheel depth; xSpread = horizontal spread factor
    if (w <= 380)  return { R: 360, xSpread: 0.43, tilt: 0.36 };
    if (w <= 600)  return { R: 400, xSpread: 0.46, tilt: 0.38 };
    if (w <= 900)  return { R: 460, xSpread: 0.50, tilt: 0.42 };
    return { R: 520, xSpread: 0.54, tilt: 0.45 }; // desktop
  }
  let { R: RADIUS, xSpread: XSPREAD, tilt: TILT } = getConfig();

  const SENSITIVITY = 0.0036; // px -> index
  const LERP        = 0.18;
  const FRICTION    = 0.95;
  const SNAP        = 0.14;

  const IDLE_DELAY_MS = 4000;
  const AUTO_SPEED    = 0.003;

  const stepDeg = 360 / total;
  let current = 0, target = 0, dragging = false;
  let startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;

  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  let idle = false, idleTimer = null;
  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => { let d=b-a; if(d>total/2)d-=total; if(d<-total/2)d+=total; return d; };

  function render(idx){
    for(let k=0;k<total;k++){
      const angleDeg = (k*stepDeg) - (idx*stepDeg);
      const rad = angleDeg * Math.PI/180;

      const x = Math.sin(rad) * RADIUS * XSPREAD;
      const z = Math.cos(rad) * RADIUS;
      const rotY = angleDeg * TILT;

      // scale: 0 at back, 1 at front -> map to [0.86 .. 1.12]
      const s01 = (z + RADIUS) / (2*RADIUS);
      const scale = 0.86 + s01 * 0.26;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px, -10px, ${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 5000);

      // visual class by angular distance
      let d = ((k - idx) % total + total) % total;
      if (d > total/2) d = total - d;
      card.classList.remove('center','side','far');
      if (d < 0.5)      card.classList.add('center');
      else if (d < 1.5) card.classList.add('side');
      else              card.classList.add('far');
    }
  }

  function setTransitions(on){
    const t = on ? 'filter 200ms, opacity 200ms' : 'filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  function isLightboxOpen(){ return lightbox.classList.contains('active'); }
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }

  // Pointer (mouse + touch)
  carousel.addEventListener('pointerdown', (e)=>{
    dragging = true; suppressClick = false; movedPx = 0;
    startX = lastX = e.clientX; startIndex = target; velocity = 0;
    setTransitions(false); carousel.classList.add('dragging');
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault(); bumpActivity();
  });
  window.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    const dx = e.clientX - startX;
    movedPx += Math.abs(e.clientX - lastX);
    target = startIndex - dx * SENSITIVITY;
    current = target;
    velocity = -(e.clientX - lastX) * SENSITIVITY;
    lastX = e.clientX;
    suppressClick = true;
    render(wrapIndex(current)); bumpActivity();
  }, {passive:false});
  window.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    dragging = false; setTransitions(true); carousel.classList.remove('dragging');
    if(movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // Click to center/open
  cards.forEach((card,i)=>{
    card.addEventListener('click', ()=>{
      if(suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if(!isCentered) target = i; else {
        const url = card.getAttribute('data-video'); if(url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // Keyboard
  window.addEventListener('keydown', (e)=>{
    if(isLightboxOpen()){ if(e.key==='Escape') closeVideo(); return; }
    if(e.key==='ArrowRight') target += 1;
    if(e.key==='ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // Lightbox
  function openVideo(url){
    lightbox.classList.add('active'); lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url; videoEl.currentTime = 0; videoEl.pause(); idle = false;
  }
  function closeVideo(){
    videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load();
    lightbox.classList.remove('active'); lightbox.setAttribute('aria-hidden','true'); bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  // Idle / momentum loop
  function tick(){
    if(!dragging && !isLightboxOpen()){
      if(idle) target += AUTO_SPEED;
      else{
        target += velocity; velocity *= FRICTION;
        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * SNAP;
        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){ target = nearest; velocity = 0; }
      }
      const d = shortestDelta(current, target); current += d * LERP;
      render(wrapIndex(current));
    }
    requestAnimationFrame(tick);
  }

  // Recompute geometry on resize/orientation
  function resize(){
    ({ R: RADIUS, xSpread: XSPREAD, tilt: TILT } = getConfig());
    render(wrapIndex(current));
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  // init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();