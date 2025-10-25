// Terminal home: link fixer + optional typewriter
document.addEventListener('DOMContentLoaded', () => {
  // --- Detect base path so it works on GitHub Pages (…/ULTION/) and your future domain (/)
  const parts = location.pathname.split('/').filter(Boolean);
  const base = parts.length > 0 ? `/${parts[0]}/` : '/';

  // --- Ensure the four links point to the right folders
  const map = { ABOUT: 'ABOUT/', PROJECTS: 'PROJECTS/', STORE: 'STORE/', TENEBROUS: 'TENEBROUS/' };
  const nav = document.querySelector('.commands');

  if (nav) {
    nav.querySelectorAll('a').forEach(a => {
      const label = a.textContent.trim().toUpperCase();
      if (map[label]) a.href = base + map[label];
    });
  }

  // --- OPTIONAL: typewriter for an element <span id="type"></span>
  const typeEl = document.getElementById('type');
  if (typeEl) {
    const text = 'WELCOME TO ULTION';
    let i = 0;
    const type = () => {
      if (i <= text.length) {
        typeEl.textContent = text.slice(0, i++);
        setTimeout(type, 60);
      } else {
        setTimeout(backspace, 700); // remove if you DON'T want it to backspace
      }
    };
    const backspace = () => {
      if (i >= 0) {
        typeEl.textContent = text.slice(0, i--);
        setTimeout(backspace, 30);
      }
    };
    type();
  }
});
