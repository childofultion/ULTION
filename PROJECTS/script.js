// open/close video lightbox
const lightbox = document.getElementById('lightbox');
const videoEl  = document.getElementById('lightboxVideo');

document.querySelectorAll('.card').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const url = btn.getAttribute('data-video');
    if(!url) return;
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden','false');
    videoEl.setAttribute('playsinline','');
    videoEl.setAttribute('webkit-playsinline','');
    videoEl.controls = true;
    videoEl.src = url;
    videoEl.currentTime = 0;
    videoEl.pause();
  });
});

function closeVideo(){
  videoEl.pause();
  videoEl.controls = false;
  videoEl.removeAttribute('src'); videoEl.load();
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden','true');
}
document.getElementById('closeVideo').addEventListener('click', closeVideo);
document.getElementById('backdrop').addEventListener('click', closeVideo);

// back link hard redirect (works even w/ no history)
document.getElementById('back-link')?.addEventListener('click', (e)=>{
  if (e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  window.location.href = 'https://liveoffsilence.com';
});