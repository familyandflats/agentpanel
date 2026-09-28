(function(){
  const root=document.querySelector('[data-hero-slider]');
  if(!root)return;
  const slides=[...root.querySelectorAll('[data-hero-slide]')];
  const counter=root.querySelector('.ff-premium-hero-counter');
  let visible=slides.map((_,i)=>i), pos=0;
  function show(){
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===visible[pos]));
    if(counter)counter.textContent=(pos+1)+' / '+visible.length;
  }
  function move(delta){ if(!visible.length)return; pos=(pos+delta+visible.length)%visible.length; show(); }
  root.querySelector('.ff-premium-hero-prev')?.addEventListener('click',()=>move(-1));
  root.querySelector('.ff-premium-hero-next')?.addEventListener('click',()=>move(1));

  document.querySelectorAll('[data-hero-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    const category=btn.getAttribute('data-hero-filter')||'All';
    document.querySelectorAll('[data-hero-filter]').forEach(x=>{x.classList.remove('is-active');x.setAttribute('aria-pressed','false');});
    btn.classList.add('is-active');btn.setAttribute('aria-pressed','true');
    visible=slides.map((s,i)=>({s,i})).filter(x=>category==='All'||x.s.getAttribute('data-category')===category).map(x=>x.i);
    pos=0;show();
  }));
  document.querySelectorAll('.ff-transaction-tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.ff-transaction-tab').forEach(x=>{x.classList.remove('is-active');x.setAttribute('aria-selected','false');});
    btn.classList.add('is-active');btn.setAttribute('aria-selected','true');
    const input=document.querySelector('#ff-project-finder input[name="transaction"]');
    if(input)input.value=btn.getAttribute('data-transaction')||'buy';
  }));
  document.querySelector('#ff-project-finder')?.addEventListener('submit',e=>{
    e.preventDefault(); const form=new FormData(e.currentTarget); const q=new URLSearchParams();
    for(const [k,v] of form.entries()) if(String(v).trim()) q.set(k,String(v));
    location.href='/search?'+q.toString();
  });
  show();
})();
(function(){
  const slides=[...document.querySelectorAll('.ff-gallery-slide')];
  const thumbs=[...document.querySelectorAll('.ff-gallery-thumb')];
  const filters=[...document.querySelectorAll('.ff-gallery-filter')];
  const count=document.querySelector('.ff-gallery-count');
  const prev=document.querySelector('.ff-gallery-prev');
  const next=document.querySelector('.ff-gallery-next');
  let visible=slides.map((_,i)=>i), pos=0;

  function setGallery(index){
    if(!visible.length)return;
    pos=(index+visible.length)%visible.length;
    const activeIndex=visible[pos];
    slides.forEach((s,i)=>s.classList.toggle('is-active',i===activeIndex));
    thumbs.forEach((t,i)=>t.classList.toggle('is-active',i===activeIndex));
    if(count)count.textContent=(pos+1)+' / '+visible.length;
    const activeThumb=thumbs[activeIndex];
    if(activeThumb)activeThumb.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }
  function step(delta){setGallery(pos+delta);}
  prev?.addEventListener('click',()=>step(-1));
  next?.addEventListener('click',()=>step(1));
  thumbs.forEach((t,i)=>t.addEventListener('click',()=>{const p=visible.indexOf(i);if(p>=0)setGallery(p);}));
  filters.forEach(btn=>btn.addEventListener('click',()=>{
    const category=btn.getAttribute('data-category')||'All';
    filters.forEach(x=>{x.classList.remove('is-active');x.setAttribute('aria-pressed','false');});
    btn.classList.add('is-active');btn.setAttribute('aria-pressed','true');
    visible=slides.map((s,i)=>({s,i})).filter(x=>category==='All'||x.s.getAttribute('data-category')===category).map(x=>x.i);
    setGallery(0);
  }));

  const lightbox=document.getElementById('ff-lightbox');
  const lbImg=lightbox?.querySelector('.ff-lightbox-image');
  const lbCat=lightbox?.querySelector('.ff-lightbox-category');
  const lbCount=lightbox?.querySelector('.ff-lightbox-count');
  let lbPos=0;
  function openLightbox(index){
    if(!lightbox||!lbImg)return;
    const p=visible.indexOf(index);
    lbPos=p>=0?p:0;
    renderLightbox();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
  }
  function renderLightbox(){
    const index=visible[lbPos];
    const slide=slides[index];
    if(!slide||!lbImg)return;
    lbImg.src=slide.getAttribute('data-full')||slide.querySelector('img')?.src||'';
    lbImg.alt=slide.getAttribute('data-alt')||'Mahindra Luminare';
    if(lbCat)lbCat.textContent=slide.getAttribute('data-category')||'';
    if(lbCount)lbCount.textContent=(lbPos+1)+' / '+visible.length;
  }
  function moveLightbox(delta){if(!visible.length)return;lbPos=(lbPos+delta+visible.length)%visible.length;renderLightbox();}
  slides.forEach((s,i)=>s.addEventListener('click',()=>openLightbox(i)));
  document.querySelector('.ff-gallery-open-all')?.addEventListener('click',()=>openLightbox(visible[pos]||0));
  lightbox?.querySelector('.ff-lightbox-close')?.addEventListener('click',()=>{lightbox.classList.remove('is-open');lightbox.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';});
  lightbox?.querySelector('.ff-lightbox-prev')?.addEventListener('click',()=>moveLightbox(-1));
  lightbox?.querySelector('.ff-lightbox-next')?.addEventListener('click',()=>moveLightbox(1));
  lightbox?.addEventListener('click',e=>{if(e.target===lightbox){lightbox.classList.remove('is-open');lightbox.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';}});
  document.addEventListener('keydown',e=>{if(!lightbox?.classList.contains('is-open'))return;if(e.key==='Escape'){lightbox.classList.remove('is-open');lightbox.setAttribute('aria-hidden','true');document.documentElement.style.overflow='';}if(e.key==='ArrowRight')moveLightbox(1);if(e.key==='ArrowLeft')moveLightbox(-1);});
  setGallery(0);
})();