'use strict';
const {spawn} = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');
class Desktop {
  constructor(root, onMessage, onClose, log) {Object.assign(this,{root,onMessage,onClose,log});}
  start() {
    if(this.child)return this.starting;
    if(process.platform!=='darwin')return Promise.reject(new Error('바탕화면 동료는 macOS에서 사용할 수 있어요.'));
    const app = process.execPath.match(/^.*?\.app(?=\/)/)?.[0];
    const child=spawn(path.join(this.root,'desktop/AgentMeadow'),[path.join(this.root,'media')],{env:{...process.env,MEADOW_EDITOR_APP:app||''},stdio:['pipe','pipe','pipe']});
    this.child=child;
    this.starting=new Promise((resolve,reject)=>{
      let ready=false;
      const timer=setTimeout(()=>{reject(new Error('바탕화면 앱이 응답하지 않아요.'));child.kill();},10000);
      const lines=readline.createInterface({input:child.stdout});
      lines.on('line',line=>{try {const m=JSON.parse(line);if(m.type==='ready'){ready=true;clearTimeout(timer);resolve();}else this.onMessage(m);}catch(e){this.log(e.message);}});
      child.stderr.on('data',data=>this.log(String(data)));
      child.stdin.on('error',e=>this.log(e.message));
      child.once('error',e=>{clearTimeout(timer);reject(e);});
      child.once('close',()=>{clearTimeout(timer);lines.close();if(this.child===child)this.child=undefined;if(!ready)reject(new Error('바탕화면 앱을 실행하지 못했어요.'));this.onClose();});
    });
    return this.starting;
  }
  publish(pets) {if(this.child?.stdin.writable)this.child.stdin.write(JSON.stringify({type:'state',pets})+'\n');}
  dispose() {this.child?.kill();}
}
module.exports={Desktop};
