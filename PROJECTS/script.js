// 360° carousel with auto-radius (no gaps), momentum, snap, idle rotate + lightbox
(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // Feel
  const LERP        = 0.18;
  const FRICTION    = 0.95;
  const SNAP        = 0.14;
  const SENSITIVITY = 0.0036;
  const IDLE_DELAY_MS = 4000;
  const AUTO_SPEED    = 0.003;

  // State
  const stepDeg = 360 / total;
  let current = 0, target = 0;
  let dragging = false, startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;
  let idle = false, idleTimer = null;

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  /* ------- Helpers ------- */
  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };
  const isLightboxOpen = () => lightbox.classList.contains('active');
  const setTransitions = (on) => {
    const t = on
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => (c.style.transition = t));
  };
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }

  // Compute radius from card width + count so the chord ~= cardW * spacing
  function computeRadius() {
    const rect = cards[0].getBoundingClientRect();
    const cardW = rect.width;
    const delta = 2 * Math.PI / total;
    const onPhone = window.matchMedia('(max-width: 600px)').matches;

    // spacing < 1 => small overlap; >1 => small gap
    const spacing = onPhone ? 0.92 : 1.02;                 // tune
    const chord = cardW * spacing;
    const R = chord / (2 * Math.sin(delta / 2));

    // Horizontal squash (visual perspective)
    const horiz = onPhone ? 0.62 : 0.56;

    // Bounds to avoid extremes
    const minR = cardW * 1.1;
    const maxR = cardW * 7;

    return { R: Math.max(minR, Math.min(R, maxR)), horiz };
  }

  let geo = computeRadius();
  let RADIUS = geo.R, HORIZ = geo.horiz;

  function render(idx){
    for (let k = 0; k < total; k++) {
      const angleDeg = (k * stepDeg) - (idx * stepDeg);
      const rad = angleDeg * Math.PI / 180;

      const x = Math.sin(rad) * RADIUS * HORIZ;
      const z = Math.cos(rad) * RADIUS;
      const rotY = angleDeg * 0.45;
      const scale = 1 - ((z - (-RADIUS)) / (2 * RADIUS)) * 0.28;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      // visual state
      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total / 2) deltaSlots = total - deltaSlots;
      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  /* ------- Interactions ------- */
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

  // Click to center / open video
  cards.forEach((card,i)=>{
    card.addEventListener('click', ()=>{
      if(suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if(!isCentered) target = i;
      else {
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
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

  /* ------- Lightbox ------- */
  function openVideo(url){
    if(!url) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause();
    idle = false;
  }
  function closeVideo(){
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  /* ------- Loop ------- */
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

  // Recompute geometry on resize/rotate (fixes mobile weirdness)
  function recompute(){
    geo = computeRadius();
    RADIUS = geo.R; HORIZ = geo.horiz;
    render(wrapIndex(current));
  }
  window.addEventListener('resize', () => { recompute(); });
  window.addEventListener('orientationchange', () => {
    setTimeout(recompute, 250);
  });

  // Init
  setTransitions(true);
  recompute();
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

/* Back link: prefer history, else hard home */
(() => {
  const el = document.getElementById('back-link');
  if (!el) return;
  el.addEventListener('click', (e) => {
    if (history.length > 1) { e.preventDefault(); history.back(); }
    // else let the href (liveoffsilence.com) do its thing
  });
})();