(() => {
  const bridge=window.webkit.messageHandlers.meadow;
  setInterval(()=>{
    const boxes=[...document.querySelectorAll('.pet canvas,.pet .bubble,.pet .name')].map(el=>{
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    });
    bridge.postMessage({type:'bounds',boxes});
  },80);
})();
