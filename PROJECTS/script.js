const reel = document.querySelector('.reel');

reel.addEventListener('wheel', (e) => {
  e.preventDefault();
  reel.scrollLeft += e.deltaY;
}, { passive:false });
