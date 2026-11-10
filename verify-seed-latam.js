// Fila da LATAM: todos os trechos LATAM Pass ainda nao conferidos. Gera data/seed-latam.js (guarda fila + leitor no localStorage da LATAM).
//   node verify-seed-latam.js ; depois aplicar com: node verify-apply.js data/verify-latam.txt
const fs = require('fs');
const cfg = require('./config.json');
const { compute, filtrar } = require('./compute');
const raw = JSON.parse(fs.readFileSync('data/raw.json', 'utf8'));
const { rows } = filtrar(compute(raw, cfg), cfg);
const last = (p) => String(p || '').split('/').pop();
let ver = {};
try { ver = JSON.parse(fs.readFileSync('data/verified.json', 'utf8')); } catch {}
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
const fresco = (k) => ver[k] && Date.now() - new Date(ver[k].at).getTime() < validade && ver[k].status !== 'login';
const hoje = new Date().toISOString().slice(0, 10);
const set = new Set();
rows.cross.forEach((x) => x.ex.forEach((par) => {
  const [a, b] = par.split('>');
  [[x.po, x.oc, x.dc, a], [x.pr, x.dc, x.rc, b]].forEach(([p, de, pa, d]) => {
    if (last(p) !== 'LATAM Pass' || !d || d < hoje) return;
    if (!fresco(['latam', de, pa, d].join('|'))) set.add(de + '>' + pa + '>' + d);
  });
}));
const q = [...set].sort().join(',');
const R = `async()=>{const q=localStorage.q.split(','),i=+localStorage.i||0;if(i>=q.length)return 'FIM';const [a,b,d]=q[i].split('>');const K='latam|'+a+'|'+b+'|'+d,s=m=>new Promise(r=>setTimeout(r,m));let t='',v=[];for(let k=0;k<20;k++){await s(1000);t=document.body.innerText;v=[...t.matchAll(/(\\d{1,3}(\\.\\d{3})+)\\s*milhas/gi)].map(m=>+m[1].replace(/\\./g,'')).filter(n=>n>=1e3);if(v.length>=1&&k>=5)break;if(/Nenhum voo|n[\\u00e3a]o encontramos|sem voos/i.test(t)&&k>=6)break;if(/auth\\.latamairlines/i.test(location.host)||/Ingresa a tu cuenta|Iniciar sess/i.test(t.slice(0,800)))break}const lg=/auth\\.latamairlines/i.test(location.host)||/Ingresa a tu cuenta|Iniciar sess/i.test(t.slice(0,800));const l=lg?K+'|login|0|0':v.length?K+'|ok|'+Math.min(...v)+'|'+v.length:/Nenhum voo|n[\\u00e3a]o encontramos|sem voos/i.test(t)?K+'|esgotado|0|0':K+'|nd|0|0';localStorage.res=(localStorage.res||'')+l+'\\n';localStorage.i=i+1;return i+' '+l.slice(6)}`;
const N = `()=>{const q=localStorage.q.split(','),i=+localStorage.i||0;if(i>=q.length)return;const [a,b,d]=q[i].split('>');location.href='https://www.latamairlines.com/br/pt/oferta-voos?origin='+a+'&outbound='+d+'T12%3A00%3A00.000Z&destination='+b+'&adt=1&chd=0&inf=0&trip=OW&cabin=Economy&redemption=true&sort=RECOMMENDED'}`;
new Function('return ' + R); new Function('return ' + N);
const seed = 'localStorage.q=' + JSON.stringify(q) + ';localStorage.i=0;localStorage.res="";localStorage.r=' + JSON.stringify(R) + ';localStorage.n=' + JSON.stringify(N) + ';localStorage.q.split(",").length+" tarefas"';
fs.writeFileSync('data/seed-latam.js', seed);
console.log(set.size + ' trechos, ' + seed.length + ' chars');
