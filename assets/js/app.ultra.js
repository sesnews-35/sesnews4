(function(){
  const C = window.SHESH;
  const q=(s,r=document)=>r.querySelector(s);
  const grid = q('#grid'); const nav = q('#cat-nav'); const info=q('#filter-info');
  const search=q('#q'); const refresh=q('#refresh'); const yearEl=q('#year');
  const themeBtn=q('#theme'); const fontPlus=q('#font+'); const fontMinus=q('#font-');
  const bookmarksBox=q('#bookmarks'); const ticker=q('#ticker'); const clock=q('#clock');
  const sentinel=q('#sentinel'); const contrast=q('#contrast'); const motion=q('#motion');
  const layoutRadios=[...document.querySelectorAll('input[name="layout"]')];

  if(yearEl) yearEl.textContent = new Date().getFullYear();

  const THEMES = ['theme-dark','theme-light'];
  function setTheme(t){ document.body.classList.remove(...THEMES); document.body.classList.add(t); localStorage.setItem('theme',t); }
  setTheme(localStorage.getItem('theme')||'theme-dark');
  themeBtn?.addEventListener('click',()=> setTheme(document.body.classList.contains('theme-dark')?'theme-light':'theme-dark'));

  function toggleHC(){ document.body.classList.toggle('hc'); localStorage.setItem('hc', document.body.classList.contains('hc')?'1':''); }
  if(localStorage.getItem('hc')) document.body.classList.add('hc');
  contrast?.addEventListener('click', toggleHC);

  function toggleMotion(){ document.body.classList.toggle('no-motion'); localStorage.setItem('nomotion', document.body.classList.contains('no-motion')?'1':''); }
  if(localStorage.getItem('nomotion')) document.body.classList.add('no-motion');
  motion?.addEventListener('click', toggleMotion);

  function setFont(delta){ const cur = parseFloat(getComputedStyle(document.documentElement).fontSize)||16; document.documentElement.style.fontSize=(cur+delta)+'px'; }
  fontPlus?.addEventListener('click',()=>setFont(1));
  fontMinus?.addEventListener('click',()=>setFont(-1));

  nav.innerHTML = C.categories.map(c=>`<a href="./?cat=${encodeURIComponent(c)}">${c}</a>`).join('');
  const params = new URLSearchParams(location.search);
  const urlCat=params.get('cat'); if(urlCat){ [...nav.children].forEach(a=>{ if(a.textContent===urlCat) a.classList.add('active'); }); }

  let etag=null, cache=[], filtered=[], page=0, loading=false, ended=false;

  function skel(n=9){ grid.insertAdjacentHTML('beforeend', Array.from({length:n}).map(_=>`<div class="skeleton skel-card"></div>`).join('')); }
  function fmt(d){ try{ return new Date(d).toLocaleString('bn-BD',{dateStyle:'medium', timeStyle:'short'});}catch(_){return d}}
  function safe(s){ return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function textOnly(html){ return (html||'').replace(/<[^>]*>/g,' '); }

  function driveView(url){
    const m = url && url.match(C.driveIdRegex);
    if(!m) return url;
    const id = m[1];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }

  async function getNews(){
    const path = C.appsScriptFeed || C.dataPath;
    const headers = etag ? {'If-None-Match': etag} : {};
    const res = await fetch(path,{headers});
    if(res.status===304) return cache;
    if(!res.ok) throw new Error('লোড ব্যর্থ');
    etag = res.headers.get('ETag') || etag;
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.items||[]);
    cache = list.map(n=>({ ...n, image_url: n.image_url?driveView(n.image_url):n.image_url }));
    cache.sort((a,b)=> new Date(b.published_at||b.date) - new Date(a.published_at||a.date));
    return cache;
  }

  function applyFilters(reset=true){
    const qv=(search?.value||'').trim();
    let items=cache;
    if(urlCat && urlCat!=='সর্বশেষ') items = items.filter(n=> (n.category||'')===urlCat);
    if(qv) items = items.filter(n=> (n.title||'').includes(qv) || (n.summary||'').includes(qv));
    filtered = items.slice(0, C.maxHomeItems?Math.max(items.length, C.maxHomeItems):items.length);
    if(reset){ page=0; ended=false; grid.innerHTML=''; }
    info.textContent = `${urlCat?('ক্যাটাগরি: '+urlCat+' · '):''}${qv?('সার্চ: '+qv+' · '):''}${items.length} ফলাফল`;
  }

  function card(n, layout='cards'){
    const id = encodeURIComponent(n.id);
    const img = n.image_url||n.img||C.imageFallback;
    const dt = n.published_at||n.date;
    const excerpt = textOnly(n.summary||n.content||n.body||'').slice(0,200) + (((n.summary||n.content||'').length>200)?'…':'');
    const bookmarked = isBookmarked(n.id);
    const media = `<a class="media" href="./news.html?id=${id}" aria-label="${safe(n.title)}"><img loading="lazy" src="${img}" alt="${safe(n.title)}" srcset="${img} 1x, ${img} 2x"></a>`;
    const body = `
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span class="chip" itemprop="articleSection">${safe(n.category||'সর্বশেষ')}</span>
          <button class="btn btn-outline bm" data-id="${id}" aria-label="বুকমার্ক">${bookmarked?'★':'☆'}</button>
        </div>
        <h2 itemprop="headline"><a class="link" href="./news.html?id=${id}">${safe(n.title)}</a></h2>
        <p>${safe(excerpt)}</p>
      </div>`;
    const foot = `
      <div class="card-footer">
        <time class="time" datetime="${new Date(dt).toISOString()}" itemprop="datePublished">${fmt(dt)}</time>
        <a class="link" href="./news.html?id=${id}">বিস্তারিত</a>
      </div>`;
    if(layout==='list'){
      return `<article class="card" data-id="${id}" style="flex-direction:row;gap:12px">
        <div style="flex:0 0 320px">${media}</div>
        <div style="flex:1;display:flex;flex-direction:column">${body}${foot}</div>
      </article>`;
    }
    return `<article class="card" data-id="${id}">${media}${body}${foot}</article>`;
  }

  function renderNext(){
    if(loading||ended) return;
    loading=true; skel(6);
    const start = page*C.pageSize, end = start + C.pageSize;
    const slice = filtered.slice(start,end);
    const layout = document.body.classList.contains('list') ? 'list' : 'cards';
    setTimeout(()=>{
      const skels = grid.querySelectorAll('.skel-card'); skels.forEach(s=>s.remove());
      grid.insertAdjacentHTML('beforeend', slice.map(n=>card(n, layout)).join(''));
      attachBookmarkHandlers();
      page++; loading=false;
      if(end>=filtered.length) ended=true;
      renderBM();
    }, 40);
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) renderNext(); });
  }, {root:null, rootMargin:'600px'});
  io.observe(sentinel);

  function getBM(){ try{return JSON.parse(localStorage.getItem('bookmarks')||'[]')}catch(_){return[]} }
  function setBM(a){ localStorage.setItem('bookmarks', JSON.stringify(a)); renderBM(); }
  function isBookmarked(id){ return getBM().includes(String(id)); }
  function toggleBM(id){ const s=new Set(getBM()); s.has(String(id))?s.delete(String(id)):s.add(String(id)); setBM([...s]); }
  function attachBookmarkHandlers(){
    grid.querySelectorAll('.bm').forEach(b=> b.onclick = ()=>{ toggleBM(b.getAttribute('data-id')); b.textContent = isBookmarked(b.getAttribute('data-id'))?'★':'☆'; });
  }
  function renderBM(){
    const ids = getBM();
    if(!ids.length){ bookmarksBox.classList.add('hidden'); bookmarksBox.innerHTML=''; return; }
    const items = cache.filter(n=> ids.includes(String(n.id)));
    bookmarksBox.classList.remove('hidden');
    bookmarksBox.innerHTML = `<h3>বুকমার্ক</h3>` + items.slice(0,10).map(n=>`<a class="link" href="./news.html?id=${encodeURIComponent(n.id)}">${n.title}</a>`).join(' · ');
  }

  function renderTicker(){
    const items = cache.slice(0, C.tickerCount).map(n=>`<a class="link" href="./news.html?id=${encodeURIComponent(n.id)}">${n.title}</a>`);
    ticker.innerHTML = items.join(' | ');
  }

  function tickClock(){
    const now = new Date();
    const bd = new Intl.DateTimeFormat('bn-BD',{dateStyle:'medium', timeStyle:'medium', timeZone:'Asia/Dhaka'}).format(now);
    clock.textContent = bd;
  }
  setInterval(tickClock,1000); tickClock();

  search?.addEventListener('input',()=>{ applyFilters(); renderNext(); });
  refresh?.addEventListener('click', ()=>{ etag=null; load(true); });

  const notifyBtn = document.getElementById('notify');
  if(!C.enablePush && notifyBtn){ notifyBtn.style.display='none'; }
  notifyBtn?.addEventListener('click', async ()=>{
    try{
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if(perm!=='granted') return alert('পুশ পারমিশন দেওয়া হয়নি');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(C.vapidPublicKey) });
      console.log('Push subscription:', JSON.stringify(sub));
      alert('পুশ সাবস্ক্রাইব সম্পন্ন (সার্ভার-সাইড এন্ডপয়েন্ট কনফিগ দরকার)');
    }catch(e){ console.error(e); alert('পুশ সাবস্ক্রাইবে সমস্যা'); }
  });
  function urlBase64ToUint8Array(base64String){const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);const arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;++i){arr[i]=raw.charCodeAt(i);}return arr;}

  layoutRadios.forEach(r=> r.addEventListener('change', ()=>{
    if(r.checked){
      document.body.classList.toggle('list', r.value==='list');
      applyFilters(true); renderNext();
    }
  }));

  async function load(initial=false){
    try{
      await getNews();
      applyFilters(true);
      renderTicker();
      if(initial) grid.innerHTML='';
      renderNext();
    }catch(e){ console.error(e); grid.innerHTML="<p class='muted'>খবর লোডে সমস্যা হচ্ছে।</p>"; }
  }

  load(true);
  setInterval(()=> getNews().then(()=>{ applyFilters(false); renderTicker(); }).catch(()=>{}), C.pollMs);
})();