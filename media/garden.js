/* Hand-drawn pixel sprites; no network assets or image dependencies. */
(() => {
  const api=typeof acquireVsCodeApi==='function'?acquireVsCodeApi():{postMessage:()=>{}};
  const root=document.getElementById('pets'), models=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible=true,last=0;
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
  document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>api.postMessage({type:'command',command:b.dataset.command})));
  function draw(canvas, provider, state, time, character) {
    const c=canvas.getContext('2d'); c.clearRect(0,0,40,44);c.imageSmoothingEnabled=false;
    const frame=reduced?0:Math.floor(time/240)%2;
    const rabbit=(character|| (provider==='codex'?'rabbit':'cat'))==='rabbit', asleep=state==='sleeping', walk=state==='idle';
    const fur=rabbit?'#f5e7e7':'#edc4a0',shade=rabbit?'#d7bbc9':'#c9987d',edge='#655366',pink='#e99eae';
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    rect(9,39,23,2,'#11121a44');
    c.save();c.translate(0,(walk||state==='working')?frame:state==='done'?-frame*3:0);
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
    if(asleep){
      rect(8,29,25,9,edge);rect(9,27,21,10,fur);rect(7,30,7,6,fur);rect(27,31,7,6,fur);
      if(rabbit){rect(11,23,12,3,shade);rect(13,26,12,3,fur);}else{rect(11,25,4,6,fur);rect(22,25,4,6,fur);}
      rect(13,32,4,1,edge);rect(21,32,4,1,edge);rect(17,35,3,1,pink);
      c.fillStyle='#cbb9db';c.font='7px monospace';c.fillText('z',29,21-frame*2);c.fillText('Z',33,14-frame*2);
    }else{
      // Ears.
      if(rabbit){rect(10,4,6,16,edge);rect(11,3,4,16,fur);rect(12,6,2,9,pink);rect(24,4,6,16,edge);rect(25,3,4,16,fur);rect(26,6,2,9,pink);}
      else{rect(8,12,7,10,edge);rect(9,10,3,11,fur);rect(10,14,3,5,pink);rect(25,12,7,10,edge);rect(28,10,3,11,fur);rect(27,14,3,5,pink);rect(31,31,5,3,shade);rect(34,27,3,6,fur);}
      // Body, face, cheeks and tiny feet.
      rect(11,27,18,11,edge);rect(12,27,16,11,fur);rect(15,29,10,7,rabbit?'#c3d4bf':'#c0b9db');
      rect(8,18,24,12,edge);rect(10,16,20,16,edge);rect(9,19,22,10,fur);rect(11,17,18,14,fur);
      const blink=Math.floor(time/160)%31===0;
      rect(13,22,2,blink?1:3,edge);rect(25,22,2,blink?1:3,edge);
      rect(10,26,4,2,pink);rect(27,26,3,2,pink);rect(19,26,2,1,edge);rect(18,28,4,1,pink);
      rect(12,37,6,2,shade);rect(23,37+(walk?frame:0),6,2,shade);
      if(state==='working') {rect(9,31,22,7,'#6e7c90');rect(11,32,18,4,'#b9c5cf');rect(8,38,25,2,'#8d99ad');rect(18,33,4,2,'#eee0cd');}
      else if(state==='waiting'){rect(29,25-frame*2,4,6,fur);rect(30,24-frame*2,3,2,shade);rect(34,7,2,6,'#f0c4d3');rect(34,15,2,2,'#f0c4d3');}
      else{rect(9,31,4,4,fur);rect(28,31,3,4,fur);}
      if(state==='thinking'){for(let i=0;i<3;i++)rect(15+i*5,0,2,2,i===Math.floor(time/350)%3?'#ead5e5':'#87758e');}
      if(state==='done'){rect(31,3,2,2,pink);rect(35,3,2,2,pink);rect(30,5,8,2,pink);rect(32,7,4,2,pink);rect(33,9,2,1,pink);}
    }
    c.restore();
  }
  function sync(pets){
    const ids=new Set(pets.map(p=>p.id));
    for(const [id,m] of models)if(!ids.has(id)){m.el.remove();models.delete(id);}
    for(const [i,p] of pets.entries()){
      let m=models.get(p.id);
      if(!m){
        const el=document.createElement('div'), bubble=document.createElement('button'), canvas=document.createElement('canvas'), name=document.createElement('span');
        bubble.className='bubble';canvas.width=40;canvas.height=44;canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','캐릭터 변경');canvas.title='클릭해서 캐릭터 변경';name.className='name';el.append(bubble,canvas,name);root.append(el);
        const inspect=()=>{api.postMessage({type:'inspect',id:p.id});};bubble.addEventListener('click',inspect);
        const change=()=>api.postMessage({type:'character',id:p.id});canvas.addEventListener('click',change);canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();change();}});
        m={el,bubble,canvas,name,x:(i+.5)*root.clientWidth/Math.max(pets.length,1)-85,direction:i%2?1:-1,data:p};models.set(p.id,m);
      }
      m.index=i;m.data=p;m.el.className='pet '+p.state+(p.observed?' observed':'');m.bubble.textContent=p.message;const title=document.createElement('span'), task=document.createElement('span');title.className='agent-title';task.className='agent-task';title.textContent=p.name;task.textContent=p.task||'';m.name.replaceChildren(title,task);m.name.title=p.name+(p.task?' · '+p.task:'');
      m.bubble.setAttribute('aria-label',p.name+': '+p.message+' · 작업 확인');
    }
    document.getElementById('empty').style.display=pets.length?'none':'flex';
    const waiting=pets.filter(p=>p.state==='waiting').length;
    document.getElementById('count').textContent=pets.length?`${pets.length}명의 작은 동료${waiting?' · '+waiting+'명이 확인을 기다려요':''}`:'아직 연결된 동료가 없어요';
  }
  function frame(t){
    const dt=Math.min((t-last)/1000,.1);last=t;
    if(visible)for(const m of models.values()){
      const lane=Math.max(210,root.clientWidth/Math.max(1,models.size));
      const min=m.index*lane+15, max=(m.index+1)*lane-185;
      if(m.data.state==='idle'&&!reduced){m.x+=m.direction*dt*12;if(m.x<=min||m.x>=max)m.direction*=-1;}
      m.x=Math.max(min,Math.min(max,m.x));m.el.style.transform=`translateX(${m.x}px)`;
      draw(m.canvas,m.data.provider,m.data.state,t,m.data.character);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('message',e=>{if(e.data?.type==='state'&&Array.isArray(e.data.pets))sync(e.data.pets);});
  api.postMessage({type:'ready'});requestAnimationFrame(frame);
})();
