// ← HOME behavior (same-tab; prefer back if available)
(() => {
  const el = document.getElementById('back-link');
  if (!el) return;
  const HOME_URL = "../index.html";
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (history.length > 1) history.back();
    else window.location.href = HOME_URL;
  });
})();

// === Typewriter for your manifesto (no delete; page scrolls naturally) ===
(() => {
  const out = document.getElementById('output');

  const MANIFESTO = `ULTION: THE MANIFESTO 

I. THE QUIET
BUILT IN SILENCE, FORMED THROUGH PATIENCE. POWER DOES NOT ANNOUNCE ITSELF. GROWTH DOES NOT SEEK APPROVAL. IN STILLNESS, GOD SPEAKS. IN STILLNESS, STRENGTH IS FORGED.

II. THE PURPOSE
ULTION IS NOT A PERSON. IT IS A PRINCIPLE. A MOVEMENT OF DISCIPLINE, FAITH, AND REDEMPTION. CREATED FROM STRUGGLE, SHARED THROUGH PEACE.

III. THE PEOPLE
THIS IS FOR THOSE WHO WORK IN THE DARK, WHO CARRY WEIGHT WITHOUT PRAISE, WHO CHOOSE PURPOSE OVER ATTENTION. EVERY QUIET BUILDER, EVERY HIDDEN FIGHTER, EVERY SOUL SEEKING LIGHT THROUGH SHADOW.

IV. THE MEANING
ULTION IS NOT REVENGE. IT IS RENEWAL. IT IS THE TURNING OF PAIN INTO WISDOM, AND WISDOM INTO ACTION. IT IS THE REMINDER THAT REBIRTH DOESN’T NEED AN AUDIENCE.

V. THE CREED
MOVE WITH GRACE.
WORK WITH HONESTY.
SPEAK WITH TRUTH.
LIVE WITH FAITH.

VI. THE PRAYER
MAY GOD GUIDE EVERY STEP, AND MAY EVERY SILENCE GROW INTO SOMETHING HOLY.

THIS IS ULTION — BORN FROM THE QUIET, BELONGING TO ALL.`;

  const BASE = 22;   // ms per char
  const BOOST = 70;  // pauses on punctuation/newlines
  const PUNCT = /[.,;:!?—–-]/;
  const NEWLINE = /\n/;

  let i = 0;
  function typeNext() {
    if (i >= MANIFESTO.length) return;
    const ch = MANIFESTO[i++];
    out.textContent += ch;

    // Keep newest lines in view by scrolling the window (not an inner box)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });

    let delay = BASE;
    if (PUNCT.test(ch)) delay += BOOST;
    if (NEWLINE.test(ch)) delay += BOOST + 50;

    setTimeout(typeNext, delay);
  }

  window.addEventListener('load', () => setTimeout(typeNext, 140));
})();
