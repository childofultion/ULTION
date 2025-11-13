/* ========= Elements & sounds ========= */
const startBtn       = document.getElementById('start-btn');
const startMenu      = document.getElementById('start-menu');
const shutdownBtn    = document.getElementById('shutdown');
const shutdownScreen = document.getElementById('shutdown-screen');
const shutdownOK     = document.getElementById('shutdown-ok');

const bgMusic  = document.getElementById('bg-music');
const sfxClick = document.getElementById('sfx-click');
const sfxOpen  = document.getElementById('sfx-open');
const sfxClose = document.getElementById('sfx-close');

const icons        = document.querySelectorAll('.icon');
const windowsEls   = document.querySelectorAll('.window');
const taskbarTasks = document.getElementById('taskbar-tasks');
const clockEl      = document.getElementById('clock');

/* ====== URLs you wanted ====== */
const MUSIC_URL = "https://google.com";                  // placeholder
const STORE_URL = "https://store.liveoffsilence.com";    // real store
const HOME_URL  = "https://liveoffsilence.com";                                   // shutdown -> home page

let zTop = 1000;

/* ========= Clock (right) ========= */
function tick() {
  const now = new Date();
  if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 1000);

/* ========= Start menu toggle ========= */
if (startBtn && startMenu) {
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    try { sfxClick.play(); } catch (_) {}
    const shown = startMenu.style.display === 'flex';
    startMenu.style.display = shown ? 'none' : 'flex';
  });
  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) startMenu.style.display = 'none';
  });
}

/* ========= Taskbar buttons ========= */
function addTask(appId, iconSrc, label) {
  if (document.getElementById('task-' + appId)) return; // no duplicates
  const btn = document.createElement('button');
  btn.id = 'task-' + appId;
  btn.className = 'task open';
  btn.innerHTML = `<img src="${iconSrc}" alt="" /> <span>${label}</span>`;
  btn.addEventListener('click', () => {
    const win = document.getElementById(appId);
    if (!win) return;
    const visible = win.classList.contains('active');
    if (visible) {
      win.classList.remove('active');      // minimize
      btn.classList.remove('open');
    } else {
      openWindow(win);                      // restore
      btn.classList.add('open');
    }
  });
  taskbarTasks.appendChild(btn);
}
function removeTask(appId) {
  const t = document.getElementById('task-' + appId);
  if (t) t.remove();
}

/* ========= Windows ========= */
function openWindow(win) {
  if (!win) return;
  try { sfxOpen.play(); } catch (_) {}
  win.classList.add('active');
  win.style.zIndex = ++zTop;

  const iconEl = document.querySelector(`.icon[data-window="${win.id}"] img`);
  const label  = win.id.toUpperCase();
  addTask(win.id, iconEl ? iconEl.src : 'images/tenebrous.png', label);
  const tb = document.getElementById('task-' + win.id);
  if (tb) tb.classList.add('open');
}

/* Close buttons inside windows */
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    try { sfxClose.play(); } catch (_) {}
    const win = e.target.closest('.window');
    if (!win) return;
    win.classList.remove('active');
    removeTask(win.id);
  });
});

/* ========= Desktop icons / Start menu items ========= */
function handleLaunch(id) {
  try { sfxClick.play(); } catch (_) {}

  // Your requested redirects
  if (id === 'music' && MUSIC_URL) {
    window.location.href = MUSIC_URL;
    return;
  }
  if (id === 'store' && STORE_URL) {
    window.location.href = STORE_URL;
    return;
  }

  // Otherwise open a window if it exists
  const win = document.getElementById(id);
  if (win) openWindow(win);
  if (startMenu) startMenu.style.display = 'none';
}

icons.forEach(ic => ic.addEventListener('click', () => handleLaunch(ic.dataset.window)));
document.querySelectorAll('.menu-app').forEach(btn =>
  btn.addEventListener('click', () => handleLaunch(btn.dataset.window))
);

/* ========= Draggable windows (title bar only) ========= */
windowsEls.forEach(win => {
  const bar = win.querySelector('.title-bar');
  if (!bar) return;
  let dragging = false, offX = 0, offY = 0;

  bar.addEventListener('mousedown', (e) => {
    dragging = true;
    offX = e.clientX - win.offsetLeft;
    offY = e.clientY - win.offsetTop;
    win.style.zIndex = ++zTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    let x = e.clientX - offX;
    let y = e.clientY - offY;
    const maxX = window.innerWidth - win.offsetWidth;
    const maxY = window.innerHeight - win.offsetHeight - 36; // above taskbar
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));
    win.style.left = x + 'px';
    win.style.top  = y + 'px';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
});

/* ========= Shutdown: fade to black then show dialog ========= */
if (shutdownBtn) {
  shutdownBtn.addEventListener('click', () => {
    try { sfxClick.play(); } catch (_) {}
    fadeOutAudio(bgMusic, 1600);

    shutdownScreen.style.display = 'flex';
    const desktop = document.getElementById('desktop');
    const taskbar = document.getElementById('taskbar');
    desktop.style.transition = 'opacity 1.4s ease';
    taskbar.style.transition  = 'opacity 1.4s ease';
    if (startMenu) startMenu.style.transition = 'opacity 0.6s ease';

    desktop.style.opacity = '0';
    taskbar.style.opacity  = '0';
    if (startMenu) startMenu.style.opacity = '0';

    requestAnimationFrame(() => { shutdownScreen.classList.add('show'); });

    setTimeout(() => {
      desktop.style.display = 'none';
      taskbar.style.display = 'none';
      if (startMenu) startMenu.style.display = 'none';
    }, 1500);
  });
}

/* ========= Notepad: Save / Clear ========= */
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'note-save') {
    const noteArea = document.getElementById('note-text');
    if (!noteArea) return;
    const blob = new Blob([noteArea.value || ''], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'note.txt';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
  }

  if (e.target && e.target.id === 'note-clear') {
    const noteArea = document.getElementById('note-text');
    if (noteArea) noteArea.value = '';
  }
});

/* ========= Shutdown OK -> redirect to home ========= */
if (shutdownOK) {
  shutdownOK.addEventListener('click', () => {
    if (HOME_URL) window.location.href = HOME_URL;
  });
}

/* ========= Audio helpers ========= */
function fadeOutAudio(el, ms = 1200) {
  if (!el) return;
  try {
    const start = typeof el.volume === 'number' ? el.volume : 1;
    const steps = 30;
    const stepMs = ms / steps;
    let i = 0;
    const t = setInterval(() => {
      i++;
      el.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) { clearInterval(t); el.pause(); }
    }, stepMs);
  } catch (_) {}
}

/* ========= Boot screen music handling ========= */
function primeBgMusicForAutoplay() {
  const a = bgMusic;
  if (!a) return;
  try {
    a.volume = 0;
    a.muted = true;
    a.play().catch(() => {
      const resume = () => { a.play().catch(()=>{}); document.removeEventListener('click', resume); };
      document.addEventListener('click', resume);
    });
  } catch (_) {}
}
function unmuteAndFadeBgMusic(targetVol = 0.25, fadeMs = 1200) {
  const a = bgMusic; if (!a) return;
  const steps = 30, dt = fadeMs / steps;
  a.muted = false;
  let i = 0; const from = typeof a.volume === 'number' ? a.volume : 0;
  const t = setInterval(() => {
    i++; a.volume = from + (targetVol - from) * (i/steps);
    if (i >= steps) clearInterval(t);
  }, dt);
}

/* ========= Boot screen timing ========= */
(function initBoot(){
  primeBgMusicForAutoplay();

  const boot = document.getElementById('boot-screen');
  if (!boot) return;

  const bgVideo = document.getElementById('bg-video');
  const MIN_SHOW = 900;
  const MAX_WAIT = 3000;
  const start = performance.now();

  let finished = false;
  function endBoot() {
    if (finished) return; finished = true;
    const elapsed = performance.now() - start;
    const delay = Math.max(0, MIN_SHOW - elapsed);
    setTimeout(() => {
      boot.classList.add('hide');
      setTimeout(() => {
        boot.style.display = 'none';
        unmuteAndFadeBgMusic(0.25, 1200);
      }, 650);
    }, delay);
  }

  if (bgVideo && typeof bgVideo.readyState === 'number') {
    if (bgVideo.readyState >= 2) {
      endBoot();
    } else {
      const onReady = () => { endBoot(); cleanup(); };
      const cleanup = () => {
        bgVideo.removeEventListener('canplay', onReady);
        bgVideo.removeEventListener('canplaythrough', onReady);
        clearTimeout(fallback);
      };
      bgVideo.addEventListener('canplay', onReady, { once:true });
      bgVideo.addEventListener('canplaythrough', onReady, { once:true });
      var fallback = setTimeout(() => { endBoot(); cleanup(); }, MAX_WAIT);
    }
  } else {
    setTimeout(endBoot, MIN_SHOW);
  }
})();