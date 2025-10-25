// PROJECTS — full JS
// 360° carousel with drag, momentum, snap, idle auto-rotate, and a video lightbox.
// Also includes a solid "back" handler that always returns to the homepage.

(() => {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;

  const cards = Array.from(carousel.children);
  const total = cards.length;
  if (!total) return;

  // ---------- Config (mobile-aware) ----------
  const mql = window.matchMedia('(max-width: 600px)');
  const CONFIG = {
    sensitivity: 0.0036,   // px -> index
    lerp:       0.18,      // ease toward target
    friction:   0.95,      // momentum decay
    snap:       0.14,      // attraction to nearest slot
    idleDelay:  4000,      // ms of inactivity before auto-rotate
    autoSpeed:  0.003      // index units per frame while idling
  };
  let radius = mql.matches ? 360 : 480; // smaller ring on phones
  const updateRadius = () => { radius = mql.matches ? 360 : 480; render(wrapIndex(current)); };
  mql.addEventListener?.('change', updateRadius);
  window.addEventListener('resize', updateRadius);

  // ---------- State ----------
  const stepDeg = 360 / total;
  let current = 0;                 // rendered index (fractional)
  let target  = 0;                 // desired index (fractional)
  let dragging = false;
  let startX = 0, startIndex = 0, lastX = 0;
  let velocity = 0, movedPx = 0, suppressClick = false;

  // Idle auto-rotate
  let idle = false, idleTimer = null;

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  // Helpers
  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };
  const isLightboxOpen = () => lightbox?.classList.contains('active');

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

      const x = Math.sin(rad) * radius * 0.55;
      const z = Math.cos(rad) * radius;
      const rotY = angleDeg * 0.45;
      const scale = 1 - ((z - (-radius)) / (2 * radius)) * 0.28;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total / 2) deltaSlots = total - deltaSlots;

      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, CONFIG.idleDelay);
  }

  // ---------- Pointer interactions ----------
  carousel.style.touchAction = 'pan-y';

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
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    movedPx += Math.abs(e.clientX - lastX);

    target = startIndex - dx * CONFIG.sensitivity;
    current = target; // render immediately during drag
    velocity = -(e.clientX - lastX) * CONFIG.sensitivity;
    lastX = e.clientX;

    suppressClick = true;
    render(wrapIndex(current));
    bumpActivity();
  }, { passive:false });

  function endPointer(){
    if (!dragging) return;
    dragging = false;
    setTransitions(true);
    carousel.classList.remove('dragging');
    if (movedPx < 5) target = Math.round(target); // tap -> snap
    bumpActivity();
  }
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);

  // ---------- Click to center or open video ----------
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if (!isCentered) {
        target = i;
      } else {
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // ---------- Keyboard (desktop nicety) ----------
  window.addEventListener('keydown', (e) => {
    if (isLightboxOpen()) { if (e.key === 'Escape') closeVideo(); return; }
    if (e.key === 'ArrowRight') target += 1;
    if (e.key === 'ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // ---------- Lightbox ----------
  function openVideo(url){
    if (!lightbox || !videoEl) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');

    // fresh load to ensure start at 0
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause(); // user presses play; avoids autoplay blocks

    idle = false;
  }

  function closeVideo(){
    if (!lightbox || !videoEl) return;
    videoEl.pause();
    videoEl.removeAttribute('src'); // stop network
    videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }

  closeBtn?.addEventListener('click', closeVideo);
  backdrop?.addEventListener('click', closeVideo);

  // ---------- Animation loop ----------
  function tick(){
    if (!dragging && !isLightboxOpen()) {
      if (idle) {
        // gentle drift
        target += CONFIG.autoSpeed;
      } else {
        // momentum + snap
        target += velocity;
        velocity *= CONFIG.friction;

        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * CONFIG.snap;

        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005) {
          target = nearest; velocity = 0;
        }
      }

      const d = shortestDelta(current, target);
      current += d * CONFIG.lerp;
      render(wrapIndex(current));
    }
    requestAnimationFrame(tick);
  }

  // Init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

// ---------- Back link: always go home ----------
document.getElementById('back-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});