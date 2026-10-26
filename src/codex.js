'use strict';
const {spawn} = require('node:child_process');
const {createInterface} = require('node:readline');
class Codex {
  constructor(binary, cwd, event, log, spawnProcess = spawn) {
    this.seq = 0; this.pending = new Map(); this.closed = false;
    this.process = spawnProcess(binary, ['app-server'], {cwd, stdio:['pipe','pipe','pipe']});
    this.process.stdin.on('error', () => {});
    this.process.stderr.on('data', x => log(String(x)));
    createInterface({input:this.process.stdout}).on('line', line => {
      let msg; try { msg = JSON.parse(line); } catch { return; }
      if (msg.method) event(msg);
      else if (this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id); this.pending.delete(msg.id); clearTimeout(p.timer);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      }
    });
    const close = error => {
      if (this.closed) return; this.closed = true;
      for (const p of this.pending.values()) {clearTimeout(p.timer); p.reject(error);}
      this.pending.clear(); event({method:'meadow/disconnected',params:{message:error.message}});
    };
    this.process.on('error', close); this.process.on('exit', () => close(new Error('Codex 연결이 종료됐어요')));
  }
  send(msg) { if (this.closed) throw new Error('Codex가 연결되어 있지 않아요'); this.process.stdin.write(JSON.stringify(msg)+'\n'); }
  request(method, params) {
    return new Promise((resolve,reject) => {
      const id = ++this.seq;
      const timer = setTimeout(() => {this.pending.delete(id); reject(new Error(method+' 응답 시간 초과'));}, 60000);
      this.pending.set(id,{resolve,reject,timer});
      try {this.send({id,method,params});} catch(e) {clearTimeout(timer);this.pending.delete(id);reject(e);}
    });
  }
  async init() { await this.request('initialize',{clientInfo:{name:'agent_meadow',title:'Agent Meadow',version:'0.1.0'}}); this.send({method:'initialized',params:{}}); }
  dispose() {this.process.kill();}
}
module.exports = {Codex};
