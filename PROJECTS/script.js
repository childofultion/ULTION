/* 360° carousel + video lightbox + responsive geometry */
(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;
  const stepDeg = 360 / total;

  // ---------- Responsive 3D geometry ----------
  function makeConfig() {
    if (window.matchMedia('(max-width: 600px)').matches) {
      return { RADIUS: 420, SPREAD: 0.54, ROT: 0.36, SCALE_F: 0.26 };
    }
    if (window.matchMedia('(max-width: 1024px)').matches) {
      return { RADIUS: 520, SPREAD: 0.56, ROT: 0.42, SCALE_F: 0.26 };
    }
    // desktop
    return { RADIUS: 560, SPREAD: 0.58, ROT: 0.48, SCALE_F: 0.26 };
  }
  let CFG = makeConfig();
  window.addEventListener('resize', () => { CFG = makeConfig(); });

  // ---------- Interaction tuning ----------
  const SENSITIVITY = 0.0036;  // px -> index
  const LERP        = 0.18;
  const FRICTION    = 0.95;
  const SNAP        = 0.14;
  const IDLE_DELAY_MS = 4000;
  const AUTO_SPEED    = 0.003;

  // ---------- State ----------
  let current = 0, target = 0;
  let dragging = false, startX = 0, startIndex = 0, lastX = 0;
  let velocity = 0, movedPx = 0, suppressClick = false;

  // ---------- Lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');
  const isLightboxOpen = () => lightbox.classList.contains('active');

  function openVideo(url){
    if(!url) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url; videoEl.currentTime = 0; videoEl.pause();
    idle = false;
  }
  function closeVideo(){
    videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  // ---------- Helpers ----------
  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a; if (d > total/2) d -= total; if (d < -total/2) d += total; return d;
  };

  function setTransitions(on){
    const t = on
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  function render(idx){
    for (let k=0;k<total;k++){
      const angleDeg = (k * stepDeg) - (idx * stepDeg);
      const rad = angleDeg * Math.PI / 180;

      const x = Math.sin(rad) * CFG.RADIUS * CFG.SPREAD;
      const z = Math.cos(rad) * CFG.RADIUS;
      const rotY = angleDeg * CFG.ROT;

      // subtle size based on depth
      const scale = 1 - ((z - (-CFG.RADIUS)) / (2 * CFG.RADIUS)) * CFG.SCALE_F;

      const card = cards[k];
      card.style.transform =
        `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      // state classes
      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total/2) deltaSlots = total - deltaSlots;

      card.classList.remove('center','side','far');
      if      (deltaSlots < 0.5) card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  // ---------- Idle autorotate ----------
  let idle = false, idleTimer = null;
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }

  // ---------- Pointer input ----------
  carousel.addEventListener('pointerdown', (e)=>{
    dragging = true; suppressClick = false; movedPx = 0;
    startX = lastX = e.clientX; startIndex = target; velocity = 0;
    setTransitions(false); carousel.classList.add('dragging');
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault(); bumpActivity();
  }, {passive:false});

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

  // ---------- Click to center / open ----------
  cards.forEach((card, i)=>{
    card.addEventListener('click', ()=>{
      if (suppressClick) return;
      const nearest = Math.round(current);
      const centered = wrapIndex(i) === wrapIndex(nearest);
      if (!centered) {
        target = i;                       // first click: center
      } else {
        const url = card.getAttribute('data-video'); if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // ---------- Keyboard (desktop) ----------
  window.addEventListener('keydown', (e)=>{
    if (isLightboxOpen()) { if (e.key==='Escape') closeVideo(); return; }
    if (e.key==='ArrowRight') target += 1;
    if (e.key==='ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // ---------- Animation loop ----------
  function tick(){
    if(!dragging && !isLightboxOpen()){
      if(idle){
        target += AUTO_SPEED;
      }else{
        target += velocity; velocity *= FRICTION;
        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * SNAP;

        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){
          target = nearest; velocity = 0;
        }
      }
      const d = shortestDelta(current, target);
      current += d * LERP;
      render(wrapIndex(current));
    }
    requestAnimationFrame(tick);
  }

  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

/* Back link: always go home */
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});