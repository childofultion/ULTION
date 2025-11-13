/* ========= Elements & sounds ========= */
const startBtn       = document.getElementById('start-btn');
const startMenu      = document.getElementById('start-menu');
const shutdownBtn    = document.getElementById('shutdown');
const shutdownScreen = document.getElementById('shutdown-screen');
const shutdownOK     = document.getElementById('shutdown-ok');

const bgMusic  = document.getElementById('bg-music');
const sfxClick = document.getElementById('sfx-click');
const sfxOpen  = document.getElementById('sfx-open');
const sfxClose = document.getElementById('sfx-close');

const icons        = document.querySelectorAll('.icon');
const windowsEls   = document.querySelectorAll('.window');
const taskbarTasks = document.getElementById('taskbar-tasks');
const clockEl      = document.getElementById('clock');

let zTop = 1000;

/* ========= Clock ========= */
function tick() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
tick();
setInterval(tick, 1000);

/* ========= Start Menu ========= */
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  try{sfxClick.play();}catch(_){}
  startMenu.style.display = startMenu.style.display === 'flex' ? 'none' : 'flex';
});
document.addEventListener('click', (e) => {
  if (!startMenu.contains(e.target) && e.target !== startBtn) startMenu.style.display = 'none';
});

/* ========= Taskbar ========= */
function addTask(appId, iconSrc, label) {
  if (document.getElementById('task-' + appId)) return;
  const btn = document.createElement('button');
  btn.id = 'task-' + appId;
  btn.className = 'task open';
  btn.innerHTML = `<img src="${iconSrc}" /><span>${label}</span>`;
  btn.addEventListener('click', () => {
    const win = document.getElementById(appId);
    if (!win) return;
    if (win.classList.contains('active')) {
      win.classList.remove('active');
      btn.classList.remove('open');
    } else {
      openWindow(win);
      btn.classList.add('open');
    }
  });
  taskbarTasks.appendChild(btn);
}
function removeTask(id) {
  const t = document.getElementById('task-' + id);
  if (t) t.remove();
}

/* ========= Windows ========= */
function openWindow(win) {
  try{sfxOpen.play();}catch(_){}
  win.classList.add('active');
  win.style.zIndex = ++zTop;

  const icon = document.querySelector(`.icon[data-window="${win.id}"] img`);
  addTask(win.id, icon ? icon.src : "", win.id.toUpperCase());
}

/* ========= Close buttons ========= */
document.querySelectorAll('.close-btn').forEach(btn => {
  btn.addEventListener('click', (e)=>{
    try{sfxClose.play();}catch(_){}
    const w = e.target.closest('.window');
    w.classList.remove('active');
    removeTask(w.id);
  });
});

/* ========= Handle icon clicks ========= */
icons.forEach(ic =>
  ic.addEventListener('click', () => handleLaunch(ic.dataset.window))
);

document.querySelectorAll('.menu-app').forEach(b =>
  b.addEventListener('click', () => handleLaunch(b.dataset.window))
);

/* ========= Launcher (updated STORE logic) ========= */
function handleLaunch(id) {
  try{sfxClick.play();}catch(_){}

  // ⭐ STORE NOW OPENS THE POPUP
  if (id === "store-window") {
    openWindow(document.getElementById("store-window"));
    return;
  }

  // Otherwise: open app window
  const win = document.getElementById(id);
  if (win) openWindow(win);
  startMenu.style.display = 'none';
}

/* ========= Draggable windows ========= */
windowsEls.forEach(win => {
  const bar = win.querySelector('.title-bar');
  if (!bar) return;

  let dragging = false, offX = 0, offY = 0;

  bar.addEventListener('mousedown', (e)=>{
    dragging = true;
    offX = e.clientX - win.offsetLeft;
    offY = e.clientY - win.offsetTop;
    win.style.zIndex = ++zTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e)=>{
    if (!dragging) return;
    win.style.left = Math.max(0, Math.min(e.clientX - offX, window.innerWidth - win.offsetWidth)) + "px";
    win.style.top  = Math.max(0, Math.min(e.clientY - offY, window.innerHeight - win.offsetHeight - 36)) + "px";
  });

  document.addEventListener('mouseup', ()=>{
    dragging = false;
    document.body.style.userSelect = '';
  });
});

/* ========= Shutdown ========= */
shutdownBtn.addEventListener('click', ()=>{
  try{sfxClick.play();}catch(_){}
  shutdownScreen.style.display = 'flex';
  requestAnimationFrame(()=> shutdownScreen.classList.add('show'));
});

/* ========= Shutdown OK ========= */
shutdownOK.addEventListener('click', ()=>{
  window.location.href = "https://liveoffsilence.com";
});