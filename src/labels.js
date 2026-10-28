'use strict';
function taskLabel(text, fallback='작업 대기') {
  if(typeof text!=='string') return fallback;
  const line=text.split(/\r?\n/).map(s=>s.trim()).find(Boolean);
  if(!line) return fallback;
  const compact=line.replace(/[\x00-\x1f\x7f]/g,'').replace(/\s+/g,' ').trim();
  return [...compact].length>24 ? [...compact].slice(0,24).join('')+'…' : compact;
}
module.exports={taskLabel};
