/* 360° carousel + momentum + snap + idle drift + video lightbox
   - Clones first 2 cards to give a “full ring” (no visible gap) when you only have 5
   - Sizes/radius adapt to viewport so mobile fits cleanly
*/

(() => {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  // ---------- Clone extra cards so the ring feels full ----------
  const ORIGINAL_COUNT = carousel.children.length;
  const CLONES = Math.min(2, ORIGINAL_COUNT); // add up to 2
  for (let i = 0; i < CLONES; i++) {
    const c = carousel.children[i].cloneNode(true);
    c.classList.add('ghost');              // purely visual duplicate
    carousel.appendChild(c);
  }

  // After cloning, recompute nodes
  let cards = Array.from(carousel.children);
  let total = cards.length;

  // ---------- Elements for lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  // ---------- Feel tuning ----------
  const mqlMobile = window.matchMedia('(max-width: 600px)');

  // these update on resize to keep proportions good
  function computeFeel() {
    const W = window.innerWidth;
    const isMobile = mqlMobile.matches;

    // Radius & transforms scale by viewport
    RADIUS      = isMobile ? Math.min(420, Math.max(340, W * 0.66)) : Math.min(560, Math.max(440, W * 0.35));
    X_FACTOR    = isMobile ? 0.50 : 0.55;  // how wide the ring fans out
    ROT_FACTOR  = 0.45;                    // how much each card y-rotates
    SCALE_DEPTH = 0.28;                    // perspective scaling amount
  }
  let RADIUS, X_FACTOR, ROT_FACTOR, SCALE_DEPTH;
  computeFeel();

  const SENSITIVITY = 0.0036; // px -> index
  const LERP        = 0.18;
  const FRICTION    = 0.95;
  const SNAP        = 0.14;

  const IDLE_DELAY_MS = 4000;
  const AUTO_SPEED    = 0.003;

  // ---------- State ----------
  let stepDeg = 360 / total;
  let current = 0, target = 0, dragging = false;
  let startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;

  let idle = false, idleTimer = null;

  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total/2) d -= total;
    if (d < -total/2) d += total;
    return d;
  };

  function setTransitions(on){
    const t = on
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  function render(idx){
    for (let k = 0; k < total; k++) {
      const angleDeg = (k * stepDeg) - (idx * stepDeg);
      const rad = angleDeg * Math.PI / 180;

      const x    = Math.sin(rad) * RADIUS * X_FACTOR;
      const z    = Math.cos(rad) * RADIUS;
      const rotY = angleDeg * ROT_FACTOR;
      const scale = 1 - ((z - (-RADIUS)) / (2 * RADIUS)) * SCALE_DEPTH;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total/2) deltaSlots = total - deltaSlots;

      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  function isLightboxOpen(){ return lightbox.classList.contains('active'); }
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }

  // ---------- Pointer (mouse + touch) ----------
  carousel.addEventListener('pointerdown', (e) => {
    dragging = true; suppressClick = false; movedPx = 0;
    startX = lastX = e.clientX; startIndex = target; velocity = 0;
    setTransitions(false); carousel.classList.add('dragging');
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault(); bumpActivity();
  }, {passive:false});

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    movedPx += Math.abs(e.clientX - lastX);
    target = startIndex - dx * SENSITIVITY;
    current = target;
    velocity = -(e.clientX - lastX) * SENSITIVITY;
    lastX = e.clientX;
    suppressClick = true;
    render(wrapIndex(current)); bumpActivity();
  }, {passive:false});

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false; setTransitions(true); carousel.classList.remove('dragging');
    if (movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // ---------- Click to center / open video ----------
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if (!isCentered) {
        target = i;      // first click: center it
      } else {
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // ---------- Keyboard ----------
  window.addEventListener('keydown', (e) => {
    if (isLightboxOpen()){ if(e.key==='Escape') closeVideo(); return; }
    if (e.key === 'ArrowRight') target += 1;
    if (e.key === 'ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // ---------- Lightbox ----------
  function openVideo(url){
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause();       // let user press play
    idle = false;
  }
  function closeVideo(){
    videoEl.pause();
    videoEl.removeAttribute('src'); videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  // ---------- Loop ----------
  function tick(){
    if (!dragging && !isLightboxOpen()){
      if (idle) {
        target += AUTO_SPEED;
      } else {
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

  // ---------- Resize handling ----------
  const onResize = () => {
    computeFeel();
    stepDeg = 360 / total;
    render(wrapIndex(current));
  };
  window.addEventListener('resize', onResize);
  mqlMobile.addEventListener?.('change', onResize);

  // init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

/* Back link: hard redirect (keeps it simple & predictable) */
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  // anchor already points to liveoffsilence.com; this just ensures full-page nav
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});