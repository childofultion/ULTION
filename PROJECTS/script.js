// 360° carousel + video lightbox with responsive geometry (desktop + iOS Safari)
(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // ---- State ----
  let current = 0;              // rendered index (fractional)
  let target  = 0;              // desired index (fractional)
  let dragging = false;
  let startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;

  // Idle auto-rotate
  const IDLE_DELAY_MS = 4000;
  const AUTO_SPEED    = 0.003;

  // Tunables (most are recomputed responsively)
  let stepDeg = 360 / total;
  let RADIUS_X = 500;           // horizontal spread
  let RADIUS_Z = 560;           // depth spread
  let LIFT_Z   = 420;           // how far front card pops
  let ROT_GAIN = 0.5;           // Y rotation multiplier
  let SCALE_GAIN = 0.12;        // how much front card scales
  let SENSITIVITY = 0.0036;     // px -> index
  let FRICTION = 0.95;
  let SNAP = 0.14;

  // Lightbox refs
  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  function isLightboxOpen(){ return lightbox.classList.contains('active'); }

  // === Responsive geometry ===
  function recomputeGeometry(){
    // live card size
    const rect = cards[0].getBoundingClientRect();
    const cw = rect.width || 260;
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(320, window.innerHeight);

    // horizontal/vertical spreads (ellipse helps remove "gap" with fewer cards)
    RADIUS_X = Math.min(vw * 0.32, cw * (total <= 5 ? 2.05 : 2.4));   // tighter for 5 items
    RADIUS_Z = RADIUS_X * 1.15;

    // pop of the center card
    LIFT_Z   = RADIUS_Z * 0.95;

    // rotation & scale feelings
    ROT_GAIN   = 0.48;
    SCALE_GAIN = 0.12;

    // drag sensitivity scales with viewport so mobile isn’t crazy
    SENSITIVITY = (0.65 * 900 / vw) * 0.0036;

    // slightly stronger snap on mobile for crisp centering
    SNAP = vw < 700 ? 0.18 : 0.14;

    stepDeg = 360 / total;
  }

  // classify distance to center (for state classes)
  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  function render(idx){
    for (let k = 0; k < total; k++) {
      const angleDeg = (k * stepDeg) - (idx * stepDeg);
      const rad = angleDeg * Math.PI / 180;

      const x = Math.sin(rad) * RADIUS_X;
      const z = Math.cos(rad) * RADIUS_Z;

      // scale grows as z approaches the front
      const t = 1 - ((z + RADIUS_Z) / (2 * RADIUS_Z));   // 0..1
      const scale = 1 + t * SCALE_GAIN;

      const card = cards[k];
      card.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${angleDeg * ROT_GAIN}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      // visual states
      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total / 2) deltaSlots = total - deltaSlots;
      card.classList.remove('center','side','far');
      if (deltaSlots < 0.5)      card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else                       card.classList.add('far');
    }

    // lift the closest card slightly forward (extra depth pop)
    const nearest = Math.round(idx);
    const c = cards[wrapIndex(nearest)];
    if (c){
      c.style.transform += ` translateZ(${LIFT_Z}px)`;
    }
  }

  // transitions toggle (snappier while dragging)
  function setTransitions(on){
    const t = on ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
                 : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  // idle logic
  let idle = false, idleTimer = null;
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, IDLE_DELAY_MS);
  }

  // Pointer interactions
  carousel.addEventListener('pointerdown', (e)=>{
    dragging = true; suppressClick = false; movedPx = 0;
    startX = lastX = e.clientX; startIndex = target; velocity = 0;
    setTransitions(false);
    carousel.classList.add('dragging');
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault();
    bumpActivity();
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
    render(wrapIndex(current));
    bumpActivity();
  }, {passive:false});

  window.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    dragging = false;
    setTransitions(true);
    carousel.classList.remove('dragging');
    if (movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // Click to center/open
  cards.forEach((card,i)=>{
    card.addEventListener('click', ()=>{
      if(suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if(!isCentered){
        target = i;                         // first click centers
      }else{
        const url = card.getAttribute('data-video');
        if(url) openVideo(url);              // already centered → open
      }
      bumpActivity();
    });
  });

  // Keyboard (desktop)
  window.addEventListener('keydown', (e)=>{
    if(isLightboxOpen()){ if(e.key==='Escape') closeVideo(); return; }
    if(e.key==='ArrowRight') target += 1;
    if(e.key==='ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // Lightbox
  function openVideo(url){
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause();             // user taps play; keeps autoplay rules happy
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

  // Animation loop (momentum + snap + idle drift)
  function tick(){
    if(!dragging && !isLightboxOpen()){
      if(idle){
        target += AUTO_SPEED;
      }else{
        target += velocity;
        velocity *= FRICTION;

        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * SNAP;

        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){
          target = nearest;
          velocity = 0;
        }
      }

      const d = shortestDelta(current, target);
      current += d * 0.18;        // LERP
      render(wrapIndex(current));
    }
    requestAnimationFrame(tick);
  }

  // Resize/orientation → recompute geometry
  const onResize = () => { recomputeGeometry(); render(wrapIndex(current)); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // init
  recomputeGeometry();
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();