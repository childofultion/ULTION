// Full 360° disc carousel — 1:1 drag feel, momentum, snap, idle auto-rotate, and video lightbox
(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // ---- Feel tuning ----
  const RADIUS      = 480;    // wheel depth
  const SENSITIVITY = 0.0036; // px -> index (higher = faster)
  const LERP        = 0.18;   // ease after release (0..1)
  const FRICTION    = 0.95;   // momentum decay (closer to 1 = longer glide)
  const SNAP        = 0.14;   // attraction to nearest slot

  // Idle auto-rotate
  const IDLE_DELAY_MS = 4000;     // wait after last interaction
  const AUTO_SPEED    = 0.003;    // index units per frame when idling

  // ---- State ----
  const stepDeg = 360 / total; // degrees per slot
  let current = 0;             // rendered index (fractional)
  let target  = 0;             // desired index (fractional)
  let dragging = false;
  let startX = 0, startIndex = 0;
  let lastX = 0;
  let velocity = 0;            // index units per frame
  let movedPx = 0;
  let suppressClick = false;

  let idle = false;
  let idleTimer = null;
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  carousel.style.touchAction = 'none';

  function setTransitions(enable) {
    const t = enable
      ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
      : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  function render(idx) {
    for (let k = 0; k < total; k++) {
      const angleDeg = (k * stepDeg) - (idx * stepDeg);  // FULL 360° ring
      const rad = angleDeg * Math.PI / 180;

      const x = Math.sin(rad) * RADIUS * 0.55;
      const z = Math.cos(rad) * RADIUS;
      const rotY = angleDeg * 0.45;
      const scale = 1 - ((z - (-RADIUS)) / (2 * RADIUS)) * 0.28;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      // visual state by nearest distance
      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total / 2) deltaSlots = total - deltaSlots;

      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }
  }

  // --- Idle handling ---
  function bumpActivity() {
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }
  function isLightboxOpen() {
    return lightbox.classList.contains('active');
  }

  // ----- Interactions -----
  carousel.addEventListener('pointerdown', (e) => {
    dragging = true;
    suppressClick = false;
    movedPx = 0;
    startX = lastX = e.clientX;
    startIndex = target;
    velocity = 0;
    setTransitions(false);
    carousel.classList.add('dragging');
    e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    idle = false;
    bumpActivity();
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    movedPx += Math.abs(e.clientX - lastX);

    // 1:1 follow while dragging
    target = startIndex - dx * SENSITIVITY;
    current = target; // render instantly
    velocity = -(e.clientX - lastX) * SENSITIVITY;
    lastX = e.clientX;

    suppressClick = true;
    render(wrapIndex(current));
    bumpActivity();
  });

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    setTransitions(true);
    carousel.classList.remove('dragging');

    if (movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // Click to center / open video (if already centered)
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (suppressClick) return;

      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));

      if (!isCentered) {
        target = i;        // first click: center it
      } else {
        // already centered -> open video
        const url = card.getAttribute('data-video');
        if (url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // Keyboard arrows
  window.addEventListener('keydown', (e) => {
    if (isLightboxOpen()) {
      if (e.key === 'Escape') closeVideo();
      return;
    }
    if (e.key === 'ArrowRight') target += 1;
    if (e.key === 'ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // ----- Lightbox logic -----
  function openVideo(url) {
    if (!url) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');

    // Load video fresh each time to ensure correct start
    videoEl.src = url;
    videoEl.currentTime = 0;
    // Autoplay: some browsers require muted to start; we’ll start paused and let the user press play
    videoEl.pause();

    idle = false; // stop auto-rotate while open
  }
  function closeVideo() {
    videoEl.pause();
    videoEl.removeAttribute('src'); // stop network
    videoEl.load();
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden','true');
    bumpActivity();
  }
  closeBtn.addEventListener('click', closeVideo);
  backdrop.addEventListener('click', closeVideo);

  // ----- Animation loop (momentum + snap after release + idle autorotate) -----
  function tick() {
    if (!dragging && !isLightboxOpen()) {
      if (idle) {
        // slow, constant drift when idle
        target += AUTO_SPEED;
      } else {
        // momentum
        target += velocity;
        velocity *= FRICTION;

        // snap toward nearest slot
        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * SNAP;

        // settle threshold
        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005) {
          target = nearest;
          velocity = 0;
        }
      }

      // ease current toward target
      const d = shortestDelta(current, target);
      current += d * LERP;

      render(wrapIndex(current));
    }

    requestAnimationFrame(tick);
  }

  // init
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();
// Back behavior: prefer history back; otherwise go to your homepage
(() => {
  const btn = document.getElementById('back-link');
  if (!btn) return;

  // set this if you want a fixed fallback (adjust the path if needed)
  const HOME_URL = "../index.html";   // e.g. from /projects/ to site root

  btn.addEventListener('click', () => {
    // if there’s somewhere to go back to, use it
    if (history.length > 1) {
      history.back();
    } else if (HOME_URL) {
      window.location.href = HOME_URL;
    }
  });
})();
// minimal back behavior: prefer history, else go home
(() => {
  const el = document.getElementById('back-link');
  if (!el) return;
  const HOME_URL = "../index.html";   // adjust if your path differs
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (history.length > 1) history.back();
    else window.location.href = HOME_URL;
  });
})();
