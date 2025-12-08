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

/* ====== URLs ====== */
const STORE_URL = "https://liveoffsilence.com/COMING-SOON/";
const HOME_URL  = "https://liveoffsilence.com";

let zTop = 1000;

/* ========= Clock ========= */
function tick() {
  const now = new Date();
  if (clockEl) {
    clockEl.textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
tick();
setInterval(tick, 1000);

/* ========= Start menu toggle ========= */
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  try { sfxClick.play(); } catch (_) {}
  startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
});
document.addEventListener('click', (e) => {
  if (!startMenu.contains(e.target) && e.target !== startBtn)
    startMenu.style.display = 'none';
});

/* ========= Taskbar buttons ========= */
function addTask(appId, iconSrc, label) {
  if (document.getElementById('task-' + appId)) return;

  const btn = document.createElement('button');
  btn.id = 'task-' + appId;
  btn.className = 'task open';
  btn.innerHTML = `<img src="${iconSrc}" alt="" /> <span>${label}</span>`;

  btn.addEventListener('click', () => {
    const win = document.getElementById(appId);
    if (!win) return;

    const visible = win.classList.contains('active');
    if (visible) {
      win.classList.remove('active');
      btn.classList.remove('open');
    } else {
      openWindow(win);
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
  try { sfxOpen.play(); } catch (_) {}

  win.classList.add('active');
  win.style.zIndex = ++zTop;

  const iconEl = document.querySelector(`.icon[data-window="${win.id}"] img`);
  addTask(win.id, iconEl ? iconEl.src : 'images/tenebrous.png', win.id.toUpperCase());
}

document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    try { sfxClose.play(); } catch (_) {}
    const win = e.target.closest('.window');
    win.classList.remove('active');
    removeTask(win.id);
  });
});

/* ========= Launch icons ========= */
function handleLaunch(id) {
  try { sfxClick.play(); } catch (_) {}

  if (id === 'store') {
    window.location.href = STORE_URL;
    return;
  }
  const win = document.getElementById(id);
  if (win) openWindow(win);
  startMenu.style.display = 'none';
}

icons.forEach(ic =>
  ic.addEventListener('click', () => handleLaunch(ic.dataset.window))
);
document.querySelectorAll('.menu-app').forEach(btn =>
  btn.addEventListener('click', () => handleLaunch(btn.dataset.window))
);

/* ========= Draggable windows ========= */
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
    const maxY = window.innerHeight - win.offsetHeight - 36;

    win.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    win.style.top  = Math.max(0, Math.min(y, maxY)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    document.body.style.userSelect = '';
  });
});

/* ========= Audio fade-out ========= */
function fadeOutAudio(el, ms = 1200) {
  if (!el) return;
  const start = el.volume;
  const steps = 30;
  const stepMs = ms / steps;
  let i = 0;

  const t = setInterval(() => {
    i++;
    el.volume = Math.max(0, start * (1 - i / steps));
    if (i >= steps) {
      clearInterval(t);
      el.pause();
    }
  }, stepMs);
}

/* ========= Shutdown (FIXED) ========= */
shutdownBtn.addEventListener('click', () => {
  try { sfxClick.play(); } catch (_) {}

  // Show the shutdown overlay and let the CSS handle the fade-in
  shutdownScreen.style.display = 'flex';
  // force a reflow so the transition always applies
  void shutdownScreen.offsetWidth;
  shutdownScreen.classList.add('show');

  // Fade out the background music only
  fadeOutAudio(bgMusic, 1600);
});

/* ========= Shutdown OK ========= */
shutdownOK.addEventListener('click', () => {
  window.location.href = HOME_URL;
});

/* ========= Boot screen ========= */
(function initBoot(){
  const boot = document.getElementById('boot-screen');
  if (!boot) return;

  // bgMusic is already autoplaying muted; unmute it shortly after boot starts
  setTimeout(() => {
    try {
      bgMusic.volume = 1;
    } catch (_) {}
  }, 300);

  setTimeout(() => {
    boot.classList.add('hide');
    setTimeout(() => {
      boot.style.display = 'none';
    }, 600);
  }, 900);
})();
// ====== START MUSIC ON FIRST USER INTERACTION ======
function startBgMusic() {
  try {
    bgMusic.currentTime = 0;  // always start from the beginning
    bgMusic.volume = 1;
    bgMusic.play();
  } catch (_) {}

  document.removeEventListener('click', startBgMusic);
  document.removeEventListener('keydown', startBgMusic);
}

document.addEventListener('click', startBgMusic);
document.addEventListener('keydown', startBgMusic);
/* ========= MUSIC tabs ========= */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
  });
});

/* ========= GHOST PAGE ========= */
const ghostItem = document.getElementById("release-ghost");
const ghostPage = document.getElementById("ghost-page");
const musicMain = document.getElementById("music-main-view");
const ghostBack = document.getElementById("ghost-back");

ghostItem.addEventListener("click", () => {
  musicMain.classList.add("hidden");
  ghostPage.classList.remove("hidden");
});

ghostBack.addEventListener("click", () => {
  ghostPage.classList.add("hidden");
  musicMain.classList.remove("hidden");
});