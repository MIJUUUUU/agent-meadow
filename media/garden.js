/* Hand-drawn pixel sprites; no network assets or image dependencies. */
(() => {
  const api=typeof acquireVsCodeApi==='function'?acquireVsCodeApi():{postMessage:()=>{}};
  const root=document.getElementById('pets'), models=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible=true,last=0,layoutWidth=-1;
  function spread(){
    const width=root.clientWidth, size=Math.min(136,width);
    const available=Math.max(0,width-size);
    const existing=[...models.values()].filter(m=>m.positioned);
    const occupied=existing.map(m=>Math.max(0,Math.min(available,m.x)));
    let i=0;
    for(const m of models.values()){
      if(!m.positioned){
        if(!existing.length)m.x=models.size===1?available/2:available*i/(models.size-1);
        else {
          const sorted=[...occupied].sort((a,b)=>a-b);
          const candidates=[0,available,...sorted.slice(1).map((x,j)=>(x+sorted[j])/2)];
          m.x=candidates.reduce((best,x)=>Math.min(...sorted.map(p=>Math.abs(p-x)))>Math.min(...sorted.map(p=>Math.abs(p-best)))?x:best,0);
        }
        occupied.push(m.x);m.target=m.x;m.velocity=0;m.pause=.4+Math.random()*2.4;
        m.y=(i%3)*3;m.positioned=true;
      }else{
        // Membership changes never restart another companion's walk.
        m.x=Math.max(0,Math.min(available,m.x));
        m.target=Math.max(0,Math.min(available,m.target));
      }
      m.el.style.width=size+'px';m.el.style.bottom=m.y+'px';
      m.el.style.transform=`translateX(${m.x}px)`;
      i++;
    }
    layoutWidth=width;root.scrollLeft=0;
  }
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
  document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>api.postMessage({type:'command',command:b.dataset.command})));
  function draw(canvas, provider, state, time, character, moving) {
    const c=canvas.getContext('2d'); c.clearRect(0,0,40,44);c.imageSmoothingEnabled=false;
    const frame=reduced?0:Math.floor(time/240)%2;
    const rabbit=(character|| (provider==='codex'?'rabbit':'cat'))==='rabbit', asleep=state==='sleeping', walk=moving;
    const fur=rabbit?'#f5e7e7':'#edc4a0',shade=rabbit?'#d7bbc9':'#c9987d',edge='#655366',pink='#e99eae';
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    rect(9,39,23,2,'#11121a44');
    c.save();c.translate(0,(walk||state==='working')?frame:0);
    if(character==='penguin'){
      const ink='#39465e', blue='#617898', cream='#f4ecdf', beak='#efb477';
      if(asleep){
        rect(8,29,25,9,ink);rect(11,26,18,12,blue);rect(12,30,15,8,cream);
        rect(27,33,7,3,beak);rect(9,35,6,3,blue);rect(20,32,4,1,ink);
        rect(10,38,6,2,beak);rect(5,35,4,2,blue);
        c.fillStyle='#cbb9db';c.font='7px monospace';c.fillText('z',28,23-frame);c.fillText('Z',33,16-frame);
      }else{
        rect(12,10,16,3,ink);rect(9,13,22,23,ink);rect(11,12,18,25,blue);
        rect(14,9,5,3,blue);rect(18,7,3,4,blue);
        rect(12,17,7,9,cream);rect(22,17,6,9,cream);rect(14,24,13,13,cream);rect(12,29,16,6,cream);
        const blink=Math.floor(time/160)%31===0;
        rect(15,21,2,blink?1:3,ink);rect(24,21,2,blink?1:3,ink);
        rect(18,25,6,2,beak);rect(20,27,2,1,beak);
        rect(12,25,3,2,pink);rect(26,25,3,2,pink);
        rect(11,37,7,3,beak);rect(23,37+(walk?frame:0),7,3,beak);
        rect(10,29,20,2,'#a6cbbc');rect(24,30,3,5,'#a6cbbc');
        rect(6,27+(walk?frame:0),5,8,blue);
        rect(30,state==='waiting'?21-frame*2:27,5,8,blue);
        if(state==='working'){rect(9,32,23,6,'#6e7c90');rect(11,33,19,4,'#b9c5cf');rect(8,38,25,2,'#8d99ad');rect(19,34,3,2,cream);}
        if(state==='waiting'){rect(35,9,2,6,pink);rect(35,17,2,2,pink);}
        if(state==='thinking')for(let i=0;i<3;i++)rect(14+i*5,2,2,2,i===Math.floor(time/350)%3?cream:'#87758e');
        if(state==='done'){rect(30,4,2,2,pink);rect(34,4,2,2,pink);rect(29,6,8,2,pink);rect(31,8,4,2,pink);rect(32,10,2,1,pink);}
      }
      c.restore();return;
    }
    if(character==='dog'||character==='hamster'){
      const dog=character==='dog', coat=dog?'#e5c6a1':'#e9bc80', dark=dog?'#a17c67':'#bb8d60', cream='#fff0d8';
      if(asleep){
        rect(8,29,25,9,edge);rect(10,27,20,11,coat);rect(12,32,17,6,cream);
        if(dog){rect(7,27,6,10,dark);rect(30,30,5,3,dark);rect(33,27+frame,3,5,dark);rect(23,32,5,3,cream);rect(26,32,3,2,edge);}
        else{rect(11,24,6,6,dark);rect(12,25,4,4,pink);rect(24,25,5,5,coat);rect(9,33,5,3,pink);rect(25,34,5,3,pink);}
        rect(16,32,4,1,edge);rect(22,32,3,1,edge);rect(17,38,6,2,pink);
        c.fillStyle='#cbb9db';c.font='7px monospace';c.fillText('z',29,23-frame);c.fillText('Z',33,16-frame);
      }else{
        // Round silhouette and low, soft ears distinguish both from the cat.
        if(dog){
          rect(30,29,5,5,dark);rect(33,26+(walk?frame:0),4,5,dark);
          rect(8,13,24,20,edge);rect(10,12,20,22,coat);
          rect(5,15,7,15,dark);rect(6,16,4,11,'#bc9478');rect(28,15,7,15,dark);rect(30,17,3,10,'#bc9478');
          rect(11,29,18,9,coat);rect(15,31,10,6,cream);
          rect(14,24,13,7,cream);rect(18,25,5,3,edge);rect(20,28,1,2,edge);rect(19,30,3,2,pink);
          rect(11,31,18,2,'#9dc4c9');rect(19,33,3,3,'#e9c884');
        }else{
          rect(10,10,7,8,dark);rect(11,11,5,6,coat);rect(12,12,3,3,pink);
          rect(24,10,7,8,dark);rect(25,11,5,6,coat);rect(26,12,3,3,pink);
          rect(9,16,22,21,edge);rect(7,22,26,11,edge);rect(10,15,20,22,coat);rect(8,23,24,9,coat);
          rect(13,25,15,12,cream);rect(10,28,5,6,cream);rect(26,28,5,6,cream);
          rect(9,26,6,4,pink);rect(26,26,5,4,pink);rect(19,25,3,2,dark);
          rect(19,28,3,3,'#fffaf0');rect(20,28,1,3,'#d3baa0');
        }
        const blink=Math.floor(time/160)%31===0;
        rect(14,21,2,blink?1:3,edge);rect(25,21,2,blink?1:3,edge);
        rect(12,37,6,2,dog?dark:pink);rect(23,37+(walk?frame:0),6,2,dog?dark:pink);
        if(state==='working'){rect(9,32,23,6,'#6e7c90');rect(11,33,19,4,'#b9c5cf');rect(8,38,25,2,'#8d99ad');rect(19,34,3,2,cream);}
        else if(state==='waiting'){rect(30,25-frame*2,4,6,coat);rect(35,8,2,6,pink);rect(35,16,2,2,pink);}
        else {rect(10,32,4,4,coat);rect(27,32,4,4,coat);}
        if(state==='thinking')for(let i=0;i<3;i++)rect(15+i*5,3,2,2,i===Math.floor(time/350)%3?cream:'#87758e');
        if(state==='done'){rect(31,3,2,2,pink);rect(35,3,2,2,pink);rect(30,5,8,2,pink);rect(32,7,4,2,pink);rect(33,9,2,1,pink);}
      }
      c.restore();return;
    }
    if(asleep){
      rect(10,28,21,10,shade);rect(8,30,25,7,shade);rect(11,27,18,10,fur);rect(9,30,23,6,fur);
      rect(13,33,14,5,'#fff3e7');rect(12,37,6,2,shade);rect(24,37,5,2,shade);
      if(rabbit){
        rect(7,23,17,4,shade);rect(8,23,15,3,fur);rect(10,24,10,1,pink);
        rect(10,26,15,3,fur);rect(11,27,9,1,pink);rect(31,30,5,5,'#fff6f0');
      }else{
        rect(11,24,5,6,shade);rect(12,25,3,5,fur);rect(22,25,4,5,fur);
        rect(18,28,2,3,shade);rect(22,28,2,3,shade);
        rect(28,30,7,7,shade);rect(27,31,7,5,fur);rect(26,34,6,3,fur);rect(26,34,3,3,'#fff0d8');
      }
      rect(13,32,4,1,edge);rect(21,32,4,1,edge);rect(18,34,2,1,pink);rect(10,34,3,1,'#e9b0ba');
      c.fillStyle='#cbb9db';c.font='7px monospace';c.fillText('z',29,21-frame*2);c.fillText('Z',33,14-frame*2);
    }else{
      // Soft stepped silhouettes, shaded edges and asymmetric ears.
      if(rabbit){
        rect(11,4,6,15,shade);rect(12,3,4,15,fur);rect(13,6,2,10,'#efb6c9');
        rect(24,6,6,13,shade);rect(25,5,4,13,fur);rect(26,8,2,8,'#efb6c9');
        rect(28,5,4,3,fur);rect(29,8,3,3,shade);rect(29,8,2,2,pink);
        rect(27,34,4,3,shade);rect(28,33,2,4,fur);rect(27,34,4,2,fur);
      }else{
        rect(9,12,7,9,shade);rect(10,10,3,10,fur);rect(11,13,3,5,pink);
        rect(25,12,7,9,shade);rect(28,10,3,10,fur);rect(27,13,3,5,pink);
        // Low curled tail grows from the hip, below the front paws.
        rect(27,35,5,3,shade);rect(30,36,6,3,shade);
        rect(34,34,4,4,shade);rect(33,33,4,2,shade);
        rect(28,35,4,2,fur);rect(31,36,5,2,fur);
        rect(35,34,2,3,fur);rect(33,34,3,1,'#fff0d8');
      }
      rect(12,28,16,10,shade);rect(11,31,18,5,shade);rect(13,28,14,9,fur);
      rect(14,31,12,6,rabbit?'#b5cdb8':'#bcb3d7');
      rect(11,17,18,14,shade);rect(8,20,24,8,shade);rect(10,18,20,12,fur);rect(9,21,22,6,fur);
      rect(12,16,16,3,fur);
      // Small plain eyes and a quiet face, matching the hamster and penguin.
      if(!rabbit){rect(18,17,2,2,shade);rect(22,17,2,2,shade);}
      const blink=Math.floor(time/160)%31===0;
      rect(14,22,2,blink?1:3,edge);rect(25,22,2,blink?1:3,edge);
      rect(11,26,3,2,pink);rect(27,26,3,2,pink);
      rect(20,26,2,1,edge);rect(19,28,4,1,pink);
      rect(16,30,10,2,rabbit?'#b5cdb8':'#bcb3d7');
      rect(12,37,6,2,shade);rect(13,37,4,1,fur);rect(23,37+(walk?frame:0),6,2,shade);rect(24,37+(walk?frame:0),4,1,fur);
      if(state==='working') {rect(9,31,22,7,'#6e7c90');rect(11,32,18,4,'#b9c5cf');rect(8,38,25,2,'#8d99ad');rect(18,33,4,2,'#eee0cd');}
      else{
        // Both front paws rest on the belly, inside the body's silhouette.
        rect(14,31,3,4,fur);rect(15,34,2,1,shade);
        const lift=state==='waiting'?1+frame:0;
        rect(23,31-lift,3,4,fur);rect(23,34-lift,2,1,shade);
        if(state==='waiting'){rect(34,7,2,6,'#f0c4d3');rect(34,15,2,2,'#f0c4d3');}
      }
      if(state==='thinking'){for(let i=0;i<3;i++)rect(15+i*5,0,2,2,i===Math.floor(time/350)%3?'#ead5e5':'#87758e');}
      if(state==='done'){rect(31,3,2,2,pink);rect(35,3,2,2,pink);rect(30,5,8,2,pink);rect(32,7,4,2,pink);rect(33,9,2,1,pink);}
    }
    c.restore();
  }
  function sync(pets){
    const changed=pets.length!==models.size||pets.some(p=>!models.has(p.id));
    const ids=new Set(pets.map(p=>p.id));
    for(const [id,m] of models)if(!ids.has(id)){m.cancelDrag?.();m.el.remove();models.delete(id);}
    for(const [i,p] of pets.entries()){
      let m=models.get(p.id);
      if(!m){
        const el=document.createElement('div'), bubble=document.createElement('button'), canvas=document.createElement('canvas'), name=document.createElement('span');
        let lastMenu=-Infinity;
        const openMenu=e=>{
          e.preventDefault();e.stopPropagation();
          const now=Date.now();if(now-lastMenu<500)return;lastMenu=now;
          api.postMessage({type:'desktopMenu',id:p.id});
        };
        // Handle the secondary press before the host's default context menu.
        el.addEventListener('pointerdown',e=>{if(e.button===2||(e.button===0&&e.ctrlKey))openMenu(e);},true);
        el.addEventListener('contextmenu',openMenu,true);
        el.addEventListener('click',e=>{if(e.ctrlKey){e.preventDefault();e.stopPropagation();}},true);
        bubble.className='bubble';canvas.width=40;canvas.height=44;canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','캐릭터 변경');canvas.title='클릭: 캐릭터 변경 · 꾹 눌러 드래그: 옮기기';name.className='name';el.append(bubble,canvas,name);root.append(el);
        const inspect=()=>{api.postMessage({type:'inspect',id:p.id});};bubble.addEventListener('click',inspect);
        const change=()=>api.postMessage({type:'character',id:p.id});canvas.addEventListener('click',e=>{if(Date.now()<(m.suppressClickUntil||0)){e.preventDefault();return;}change();});canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change();}});
        m={el,bubble,canvas,name,x:0,target:0,velocity:0,pause:0,direction:i%2?-1:1,speed:12+Math.random()*12,phase:Math.random()*4000,data:p};models.set(p.id,m);
        const maxY=()=>Math.max(0,(root.clientHeight||240)-(el.offsetHeight||150));
        let holdTimer;
        const lift=()=>{
          if(!m.grab)return;
          m.grab.lifted=true;m.velocity=0;
          el.classList.add('dragging');api.postMessage({type:'dragging',active:true});
        };
        const finish=()=>{
          clearTimeout(holdTimer);
          if(!m.grab)return;
          const {pointerId,lifted}=m.grab;m.grab=null;
          if(lifted){m.placed=true;m.suppressClickUntil=Date.now()+500;m.target=m.x;m.pause=2;api.postMessage({type:'dragging',active:false});}
          el.classList.remove('dragging');
          if(canvas.hasPointerCapture?.(pointerId))canvas.releasePointerCapture(pointerId);
        };
        m.cancelDrag=finish;
        canvas.addEventListener('pointerdown',e=>{
          if(e.button!==0||e.ctrlKey||m.grab)return;
          m.grab={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:m.x,y:m.y??(m.index%3)*3,lifted:false};
          canvas.setPointerCapture(e.pointerId);holdTimer=setTimeout(lift,240);
        });
        canvas.addEventListener('pointermove',e=>{
          const g=m.grab;if(!g||g.pointerId!==e.pointerId)return;
          const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
          if(!g.lifted&&Math.hypot(dx,dy)>5){clearTimeout(holdTimer);lift();}
          if(!g.lifted)return;
          e.preventDefault();
          m.x=Math.max(0,Math.min(Math.max(0,root.clientWidth-Math.min(136,root.clientWidth)),g.x+dx));
          m.y=Math.max(0,Math.min(maxY(),g.y-dy));m.velocity=0;
          el.style.transform=`translateX(${m.x}px)`;el.style.bottom=m.y+'px';
        });
        canvas.addEventListener('pointerup',finish);
        canvas.addEventListener('pointercancel',finish);
        canvas.addEventListener('lostpointercapture',finish);

      }
      m.index=i;m.data=p;m.el.className='pet '+p.state+(p.observed?' observed':'')+(m.grab?.lifted?' dragging':'');m.bubble.textContent=p.message;const title=document.createElement('span'), task=document.createElement('span');title.className='agent-title';task.className='agent-task';title.textContent=p.name;task.textContent=p.task||'';m.name.replaceChildren(title,task);m.name.title=p.name+(p.task?' · '+p.task:'');
      m.bubble.setAttribute('aria-label',p.name+': '+p.message+' · 작업 확인');
    }
    document.getElementById('empty').style.display=pets.length?'none':'flex';
    const waiting=pets.filter(p=>p.state==='waiting').length;
    document.getElementById('count').textContent=pets.length?`${pets.length}명의 작은 동료${waiting?' · '+waiting+'명이 확인을 기다려요':''}`:'아직 연결된 동료가 없어요';
    if(changed)spread();
  }
  function frame(t){
    const dt=Math.min((t-last)/1000,.1);last=t;
    if(root.clientWidth!==layoutWidth)spread();
    if(visible)for(const m of models.values()){
      const max=Math.max(0,root.clientWidth-Math.min(136,root.clientWidth));
      const roaming=['idle','done'].includes(m.data.state);
      if(!m.grab&&roaming&&!reduced&&!m.el.matches(':hover, :focus-within')&&max>0){
        if(m.pause>0){
          m.pause=Math.max(0,m.pause-dt);m.velocity=0;
          if(m.pause===0){
            // Pick a fresh destination, including short strolls and mid-garden turns.
            const travel=Math.min(max,30+Math.random()*160);
            let direction=Math.random()<.5?-1:1;
            if(m.x<12)direction=1;else if(m.x>max-12)direction=-1;
            m.target=Math.max(0,Math.min(max,m.x+direction*travel));
            m.speed=12+Math.random()*14;
          }
        }else{
          const distance=m.target-m.x;
          if(Math.abs(distance)<1.2){m.velocity=0;m.pause=.8+Math.random()*3.2;}
          else{
            // Slow down before arriving; accelerate gently when starting again.
            const desired=Math.sign(distance)*Math.min(m.speed,Math.abs(distance)*2);
            m.velocity+=(desired-m.velocity)*(1-Math.exp(-5*dt));
            const step=m.velocity*dt;
            m.x+=Math.abs(step)>Math.abs(distance)?distance:step;
            if(Math.abs(m.velocity)>1)m.direction=Math.sign(m.velocity);
          }
        }
      }else{
        m.velocity=0;
      }
      if(m.y!==undefined){m.y=Math.max(0,Math.min(Math.max(0,(root.clientHeight||240)-(m.el.offsetHeight||150)),m.y));m.el.style.bottom=m.y+'px';}
      m.x=Math.max(0,Math.min(max,m.x));m.el.style.transform=`translateX(${m.x}px)`;
      m.canvas.style.transform=roaming&&m.direction<0?'scaleX(-1)':'none';
      draw(m.canvas,m.data.provider,m.data.state,t+m.phase,m.data.character,Math.abs(m.velocity)>1);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('message',e=>{if(e.data?.type==='state'&&Array.isArray(e.data.pets))sync(e.data.pets);});
  api.postMessage({type:'ready'});requestAnimationFrame(frame);
})();
