// 360° carousel + video lightbox (desktop + mobile tuned)
(function () {
  const carousel = document.getElementById('carousel');
  const cards = Array.from(carousel.children);
  const total = cards.length;

  // Config that adapts to viewport
  const cfg = {
    radiusDesktop: 460,   // slightly smaller than before (brings cards closer, less gap)
    radiusMobile: 410,    // tighter on mobile so neighbours sit closer
    sideScale: 0.52,      // horizontal spread factor (lower = tighter)
    rotFactor: 0.42,      // Y-rotation strength
    autoSpeed: 0.003,
    sensitivity: 0.0036,
    friction: 0.95,
    lerp: 0.18,
    snap: 0.14,
    idleDelay: 4000
  };

  const mql = window.matchMedia('(max-width: 600px)');
  let RADIUS = mql.matches ? cfg.radiusMobile : cfg.radiusDesktop;
  const setRadius = () => (RADIUS = mql.matches ? cfg.radiusMobile : cfg.radiusDesktop);
  mql.addEventListener('change', setRadius);

  const stepDeg = 360 / total;
  let current = 0, target = 0, dragging = false;
  let startX = 0, startIndex = 0, lastX = 0, velocity = 0, movedPx = 0, suppressClick = false;

  const lightbox = document.getElementById('lightbox');
  const videoEl  = document.getElementById('lightboxVideo');
  const closeBtn = document.getElementById('closeVideo');
  const backdrop = document.getElementById('backdrop');

  let idle = false, idleTimer = null;

  const wrapIndex = n => ((n % total) + total) % total;
  const shortestDelta = (a,b) => {
    let d = b - a;
    if (d >  total/2) d -= total;
    if (d < -total/2) d += total;
    return d;
  };

  function render(idx){
    for(let k=0;k<total;k++){
      const angleDeg = (k*stepDeg) - (idx*stepDeg);
      const rad = angleDeg * Math.PI/180;

      const x = Math.sin(rad) * RADIUS * cfg.sideScale;
      const z = Math.cos(rad) * RADIUS;
      const rotY = angleDeg * cfg.rotFactor;
      const scale = 1 - ((z - (-RADIUS)) / (2*RADIUS)) * 0.28;

      const card = cards[k];
      card.style.transform =
        `translate3d(${x}px,0,${z}px) rotateY(${rotY}deg) scale(${scale})`;
      card.style.zIndex = Math.round(z + 2000);

      let deltaSlots = ((k - idx) % total + total) % total;
      if (deltaSlots > total/2) deltaSlots = total - deltaSlots;

      card.classList.remove('center','side','far');
      if (deltaSlots < .5) card.classList.add('center');
      else if (deltaSlots < 1.5) card.classList.add('side');
      else card.classList.add('far');
    }
  }

  function setTransitions(on){
    const t = on ? 'transform 300ms cubic-bezier(.2,.85,.2,1), filter 200ms, opacity 200ms'
                 : 'transform 0s, filter 0s, opacity 0s';
    cards.forEach(c => c.style.transition = t);
  }

  const isLightboxOpen = () => lightbox.classList.contains('active');
  function bumpActivity(){
    idle = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!dragging && !isLightboxOpen()) idle = true; }, cfg.idleDelay);
  }

  // pointer
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
    target   = startIndex - dx * cfg.sensitivity;
    current  = target;
    velocity = -(e.clientX - lastX) * cfg.sensitivity;
    lastX = e.clientX;
    suppressClick = true;
    render(wrapIndex(current));
    bumpActivity();
  }, {passive:false});
  window.addEventListener('pointerup', ()=>{
    if(!dragging) return;
    dragging = false; setTransitions(true); carousel.classList.remove('dragging');
    if(movedPx < 5) target = Math.round(target);
    bumpActivity();
  });

  // click to center / open
  cards.forEach((card,i)=>{
    card.addEventListener('click', ()=>{
      if(suppressClick) return;
      const nearest = Math.round(current);
      const isCentered = (wrapIndex(i) === wrapIndex(nearest));
      if(!isCentered) target = i;
      else {
        const url = card.getAttribute('data-video');
        if(url) openVideo(url);
      }
      bumpActivity();
    });
  });

  // keys
  window.addEventListener('keydown', (e)=>{
    if(isLightboxOpen()){ if(e.key==='Escape') closeVideo(); return; }
    if(e.key==='ArrowRight') target += 1;
    if(e.key==='ArrowLeft')  target -= 1;
    bumpActivity();
  });

  // lightbox
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

  // loop
  function tick(){
    if(!dragging && !isLightboxOpen()){
      if(idle) target += cfg.autoSpeed;
      else{
        target += velocity; velocity *= cfg.friction;
        const nearest = Math.round(target);
        const pull = shortestDelta(target, nearest);
        target += pull * cfg.snap;
        if (Math.abs(velocity) < 0.00005 && Math.abs(pull) < 0.0005){ target = nearest; velocity = 0; }
      }
      const d = shortestDelta(current, target); current += d * cfg.lerp;
      render(wrapIndex(current));
    }
    requestAnimationFrame(tick);
  }

  // init
  setRadius();
  setTransitions(true);
  render(0);
  bumpActivity();
  requestAnimationFrame(tick);
})();

// Back link: hard redirect to homepage
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});