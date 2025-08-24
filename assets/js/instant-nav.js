(function(){
  const prefetch = (url)=>{
    const l = document.createElement('link');
    l.rel='prefetch'; l.href=url; document.head.appendChild(l);
  };
  document.addEventListener('mouseover', (e)=>{
    const a = e.target.closest('a[href]'); if(!a) return;
    if(a.href.endsWith('news.html') || a.href.includes('news.html?id=')) prefetch(a.href);
  }, {passive:true});
  document.addEventListener('touchstart', (e)=>{
    const a = e.target.closest('a[href]'); if(!a) return;
    if(a.href.includes('news.html')) prefetch(a.href);
  }, {passive:true});
})();