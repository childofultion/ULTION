// 3D carousel (drag + momentum + idle drift) with smart spacing and video lightbox
(() => {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // ---- Feel / physics ----
  const ROT_Y_FACTOR = 0.45;    // card yaw amount
  const X_SCALE      = 0.56;    // horizontal spread factor used in radius math
  const LERP         = 0.18;    // ease current -> target (0..1)
  const FRICTION     = 0.95;    // momentum decay
  const SNAP         = 0.14;    // attraction to nearest slot
  const IDLE_DELAY   = 4000;    // ms before idle drift starts
  const IDLE_SPEED   = 0.003;   // slots/frame during idle

  let radius = 480;             // computed dynamically (see computeRadius)
  let current = 0, target = 0;
  let dragging = false, startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;

  // Lightbox refs
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  // Helpers
  const stepDeg = () => 360 / total;
  const wrap = (n) => ((n % total) + total) % total;
  const shortest = (a,b) => {
    let d = b - a;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  // --- SPACING: compute radius so side cards sit close (no big gaps) ---
  function getCardWidthPx() {
    const first = cards[0];
    return first ? first.getBoundingClientRect().width : 260;
    // relies on CSS size; works after layout
  }

  function computeRadius() {
    const w = getCardWidthPx();

    // Desired horizontal center-to-center spacing of adjacent cards.
    // Slightly tighter on phones.
    const isMobile = window.innerWidth <= 600;
    const spacing = w * (isMobile ? 0.70 : 0.78); // tweak 0.65..0.80 to taste

    // Geometry: projected spacing near the front ≈ sin(step) * X_SCALE * radius
    // => radius = spacing / (sin(step) * X_SCALE)
    const sinStep = Math.sin((stepDeg() * Math.PI) / 180);
    const r = spacing / Math.max(0.001, sinStep * X_SCALE);

    // Clamp radius to keep overall wheel in view
    const minR = w * 1.2;
    const maxR = Math.min(1400, w * 6.5);
    radius = Math.max(minR, Math.min(maxR, r));
  }

  // Initial radius + recompute on resize/orientation changes
  computeRadius();
  window.addEventListener('resize', () => {
    computeRadius();
    render(current);
  });

  // --- RENDER ---
  function render(idx) {
    const deg = stepDeg();
    for (let i = 0; i < total; i++) {
      const angle = (i * deg) - (idx * deg);
      const rad = angle * Math.PI / 180;

      const x = Math.sin(rad) * radius * X_SCALE;
      const z = Math.cos(rad) * radius;
      const yaw = angle * ROT_Y_FACTOR;

      // subtle perspective scaling based on depth
      const scale = 1 - ((z - (-radius)) / (2 * radius)) * 0.28;

      const el = cards[i];
      el.style.transform =
        `translate3d(${x}px,0,${z}px) rotateY(${yaw}deg) scale(${scale})`;
      el.style.zIndex = Math.round(z + 3000);

      // visual state by distance
      let ds = ((i - idx) % total + total) % total;
      if (ds > total / 2) ds = total - ds;
      el.classList.remove('center', 'side', 'far');
      if (ds < 0.5)      el.classList.add('center');
      else if (ds < 1.5) el.classList.add('side');
      else               el.classList.add('far');
    }
  }

  function setTransitions(on){
    const t = on
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  // --- Idle drift ---
  let idle = false, idleTimer = null;
  const isLightboxOpen = () => lightbox.classList.contains('active');
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY);
  }

  // --- Pointer interactions (mouse + touch) ---
  carousel.addEventListener('pointerdown', (e) => {
    dragging = true;
    suppressClick = false;
    movedPx = 0;
    startX = lastX = e.clientX;
    startIndex = target;
    velocity = 0;
    setTransitions(false);
    carousel.classList.add('dragging');
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    bumpActivity();
  }, { passive:false });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    movedPx += Math.abs(e.clientX - lastX);

    // convert pixel drag to index units (scale by card width so it feels consistent)
    const w = Math.max(1, getCardWidthPx());
    const sensitivity = 0.9 / w; // 1 card width drag ≈ move ~0.9 slots
    target = startIndex - dx * sensitivity;
    current = target;
    velocity = -(e.clientX - lastX) * sensitivity;
    lastX = e.clientX;
    suppressClick = true;

    render(wrap(current));
    bumpActivity();
  }, { passive:false });

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    setTransitions(true);
    carousel.classList.remove('dragging');

    if (movedPx < 5) target = Math.round(target); // treat as click-tap
    bumpActivity();
  });

  // Click to center / open video (if already centered)
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrap(i) === wrap(nearest));
      if (!isCentered) {
        target = i;
      } else {
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // Keyboard (desktop convenience)
  window.addEventListener('keydown', (e) => {
    if (isLightboxOpen()) { if (e.key === 'Escape') closeVideo(); return; }
    if (e.key === 'ArrowRight') target += 1;
    if (e.key === 'ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // --- Lightbox ---
  function openVideo(url){
    if (!url) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause();             // let user press play
    idle = false;
  }
  function closeVideo(){
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  // --- Animation loop ---
  function tick(){
    if (!dragging && !isLightboxOpen()){
      if (idle) {
        target += IDLE_SPEED;        // slow drift
      } else {
        // momentum + snap
        target += velocity;
        velocity *= FRICTION;

        const nearest = Math.round(target);
        const pull = shortest(target, nearest);
        target += pull * SNAP;

        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){
          target = nearest; velocity = 0;
        }
      }
      const d = shortest(current, target);
      current += d * LERP;
      render(wrap(current));
    }
    requestAnimationFrame(tick);
  }

  // init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

// Back link → hard redirect home
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});