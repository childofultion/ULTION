// ------- PROJECTS Carousel: full 360° ring (no gaps) + mobile centering -------
(() => {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  // Ensure at least 7 panels so the ring looks full even if you only author 3-5.
  const MIN_CARDS = 7;
  const originals = Array.from(carousel.children);
  while (carousel.children.length < MIN_CARDS) {
    const clone = originals[(carousel.children.length) % originals.length].cloneNode(true);
    clone.classList.add('clone');
    carousel.appendChild(clone);
  }

  let cards = Array.from(carousel.children);
  let total = cards.length;

  // Lightbox refs
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  // ---- Feel / physics (desktop vs mobile tuned in getConfig()) ----
  let cfg = getConfig();

  function getConfig() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // radius based on viewport; tuned for no clipping and nice perspective
    const RADIUS = Math.max(280, Math.min(520, Math.min(w, 980) * 0.58)); // 58% of width

    // scale boost for the center card (visual pop)
    const CENTER_BOOST = w < 600 ? 0.16 : 0.12;

    return {
      RADIUS,
      CENTER_BOOST,
      SENSITIVITY: 0.0036,
      LERP: 0.18,
      FRICTION: 0.95,
      SNAP: 0.14,
      AUTO_SPEED: 0.003,
      IDLE_DELAY_MS: 4000
    };
  }

  // Derived
  let stepDeg = 360 / total;
  let current = 0;
  let target  = 0;
  let velocity = 0;

  // drag state
  let dragging = false, startX = 0, lastX = 0, startIndex = 0, movedPx = 0, suppressClick = false;

  // idle autorotate
  let idle = false, idleTimer = null;
  function isLightboxOpen(){ return lightbox && lightbox.classList.contains('active'); }
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, cfg.IDLE_DELAY_MS);
  }

  const wrap = (n, m) => ((n % m) + m) % m;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total/2) d -= total;
    if (d < -total/2) d += total;
    return d;
  };

  // Position + style each card for index "idx"
  function render(idx) {
    for (let k = 0; k < total; k++) {
      const angleDeg = (k * stepDeg) - (idx * stepDeg);
      const rad = angleDeg * Math.PI / 180;

      const x = Math.sin(rad) * cfg.RADIUS * 0.55; // horizontal spread
      const z = Math.cos(rad) * cfg.RADIUS;        // depth
      const rotY = angleDeg * 0.45;                // slight twist

      // scale: cards forward appear bigger
      // normalize z from [-RADIUS .. +RADIUS]  =>  0..1 forwardness
      const t = (z + cfg.RADIUS) / (2 * cfg.RADIUS);
      const scale = 1 + cfg.CENTER_BOOST * t;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = (2000 + Math.round(z));

      // class states for subtle styling
      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total/2) deltaSlots = total - deltaSlots;
      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  // enable/disable transitions while dragging
  function setTransitions(on){
    const t = on
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  // Pointer input
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
    target = startIndex - dx * cfg.SENSITIVITY;
    current = target;
    velocity = -(e.clientX - lastX) * cfg.SENSITIVITY;
    lastX = e.clientX;
    suppressClick = true;
    render(wrap(current, total));
  }, {passive:false});

  window.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    dragging = false; setTransitions(true); carousel.classList.remove('dragging');
    if(movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // Click poster: first centers it; if already centered, opens video
  cards.forEach((card, i) => {
    card.addEventListener('click', ()=>{
      if (suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = wrap(i, total) === wrap(nearest, total);
      if (!isCentered) {
        target = i;
      } else {
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // Keyboard arrows (desktop)
  window.addEventListener('keydown', (e)=>{
    if (isLightboxOpen()){ if(e.key==='Escape') closeVideo(); return; }
    if (e.key === 'ArrowRight') target += 1;
    if (e.key === 'ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // Lightbox
  function openVideo(url){
    if (!lightbox || !videoEl) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause(); // let user press play; avoids autoplay policies
    idle = false;
  }
  function closeVideo(){
    if (!lightbox || !videoEl) return;
    videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }
  closeBtn?.addEventListener('click', closeVideo);
  backdrop?.addEventListener('click', closeVideo);

  // Animation loop: momentum + snap + idle drift
  function tick(){
    if(!dragging && !isLightboxOpen()){
      if (idle) {
        target += cfg.AUTO_SPEED;
      } else {
        target += velocity;
        velocity *= cfg.FRICTION;

        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * cfg.SNAP;

        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){
          target = nearest;
          velocity = 0;
        }
      }

      const d = shortestDelta(current, target);
      current += d * cfg.LERP;
      render(wrap(current, total));
    }
    requestAnimationFrame(tick);
  }

  // Handle resize/orientation change — recompute geometry
  function onResize(){
    cfg = getConfig();
    stepDeg = 360 / total;
    render(wrap(current, total));
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

// Back link → hard redirect home (black label “← home”)
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});