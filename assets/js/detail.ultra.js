(function(){
  const C = window.SHESH;
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const wrap = document.getElementById('detail');
  const nav = document.getElementById('cat-nav');
  const progress = document.getElementById('progress');
  const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();
  nav.innerHTML = C.categories.map(c=>`<a href="./?cat=${encodeURIComponent(c)}">${c}</a>`).join('');

  function fmt(d){ try{ return new Date(d).toLocaleString('bn-BD',{dateStyle:'medium', timeStyle:'short'});}catch(_){return d}}
  function safe(s){ return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function sanitize(html){
    return (html||'').replace(/<(script|style|iframe)[^>]*>.*?<\/\1>/gsi,'').replace(/on\w+\s*=\s*"[^"]*"/gi,'');
  }
  function textOnly(html){ return (html||'').replace(/<[^>]*>/g,' '); }

  async function load(){
    try{
      const path = C.appsScriptFeed || C.dataPath;
      const res = await fetch(path);
      const data = await res.json();
      const n = (Array.isArray(data)?data:(data.items||[])).find(x=> String(x.id)===String(id));
      if(!n){ wrap.innerHTML = "<div class='content'><h1>খবর পাওয়া যায়নি</h1></div>"; return; }
      const img = n.image_url||n.img||C.imageFallback;
      const dt = n.published_at||n.date;
      const canonical = location.origin + location.pathname + `?id=${encodeURIComponent(n.id)}`;
      document.title = n.title + " — শেষ নিউজ";

      wrap.innerHTML = `
        <div class="hero"><img src="${img}" alt="${safe(n.title)}" loading="eager"></div>
        <div class="content">
          <h1 itemprop="headline">${safe(n.title)}</h1>
          <div class="meta">
            <time itemprop="datePublished" datetime="${new Date(dt).toISOString()}">${fmt(dt)}</time>
            <span>·</span>
            <span class="chip">${safe(n.category||'সর্বশেষ')}</span>
          </div>
          <div itemprop="articleBody">${sanitize(n.content||n.body||'')}</div>
          ${n.source_url? `<p><a class="link" href="${n.source_url}" target="_blank" rel="noopener">মূল সূত্র</a></p>`:''}
          <script type="application/ld+json">${JSON.stringify({
            "@context":"https://schema.org",
            "@type":"NewsArticle",
            "headline": n.title,
            "datePublished": dt,
            "dateModified": n.updated_at||dt,
            "articleSection": n.category,
            "image": n.image_url?[n.image_url]:undefined,
            "mainEntityOfPage": canonical,
            "author": {"@type":"Organization","name":"Shesh News"},
            "publisher": {"@type":"Organization","name":"Shesh News"}
          })}</script>
        </div>
      `;

      const fb = document.getElementById('share-fb');
      const x = document.getElementById('share-x');
      const wa = document.getElementById('share-wa');
      if(fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`;
      if(x) x.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(n.title)}`;
      if(wa) wa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(n.title+' '+canonical)}`;

      const canvas = document.getElementById('qr');
      if(canvas && canvas.getContext) drawQR(canvas, canonical);

      const ttsBtn = document.getElementById('tts');
      const copyBtn = document.getElementById('copy');
      const bmBtn = document.getElementById('bookmark');
      const printBtn = document.getElementById('print');
      ttsBtn?.addEventListener('click', ()=> speak(textOnly(n.title+'। '+(n.summary||'')+'। '+(n.content?textOnly(n.content):''))));
      copyBtn?.addEventListener('click', async ()=>{ await navigator.clipboard.writeText(canonical); alert('কপি হয়েছে'); });
      bmBtn?.addEventListener('click', ()=> toggleBM(n.id));
      printBtn?.addEventListener('click', ()=> window.print());

      window.addEventListener('keydown', (e)=>{
        const k = e.key.toLowerCase();
        if(k==='r'){ location.reload(); }
        if(k==='b'){ toggleBM(n.id); }
        if(k==='t'){ window.scrollTo({top:0,behavior:'smooth'}); }
        if(k==='p'){ window.print(); }
      });

      document.addEventListener('scroll', ()=>{
        const h = document.documentElement;
        const p = (h.scrollTop)/(h.scrollHeight - h.clientHeight);
        progress.style.width = (p*100)+'%';
      }, {passive:true});
    }catch(e){
      wrap.innerHTML = "<div class='content'><p>লোডে ত্রুটি</p></div>"; console.error(e);
    }
  }

  function speak(text){
    if(!('speechSynthesis' in window)) return alert('ব্রাউজারে TTS নেই');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'bn-BD';
    window.speechSynthesis.speak(u);
  }

  function getBM(){ try{return JSON.parse(localStorage.getItem('bookmarks')||'[]')}catch(_){return[]} }
  function setBM(a){ localStorage.setItem('bookmarks', JSON.stringify(a)); alert('বুকমার্ক আপডেট'); }
  function toggleBM(id){ const s=new Set(getBM()); s.has(String(id))?s.delete(String(id)):s.add(String(id)); setBM([...s]); }

  function drawQR(canvas, text){
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#000';
    let h=0; for(let i=0;i<text.length;i++){ h = ((h<<5)-h) + text.charCodeAt(i); h|=0; }
    const size=10; let seed = Math.abs(h);
    for(let y=0;y<canvas.height;y+=size){
      for(let x=0;x<canvas.width;x+=size){
        seed = (seed*9301 + 49297) % 233280;
        if((seed/233280) > 0.5) ctx.fillRect(x,y,size,size);
      }
    }
    ctx.clearRect(0,0,40,40); ctx.strokeRect(2,2,36,36);
    ctx.clearRect(canvas.width-40,0,40,40); ctx.strokeRect(canvas.width-38,2,36,36);
    ctx.clearRect(0,canvas.height-40,40,40); ctx.strokeRect(2,canvas.height-38,36,36);
  }

  load();
})();