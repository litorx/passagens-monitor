// Gera data/seed.js: codigo que guarda no localStorage da Smiles a fila de paginas e o leitor.
// Depois cada lote do Chrome so chama eval(localStorage.n)() / await eval(localStorage.r)().
//   node verify-seed.js
const fs = require('fs');
const p = require('./data/verify-plan-smiles.json').tarefas;
const q = p.map((t) => t.de + '>' + t.para + '>' + t.centro).join(',');
const R = `async()=>{const q=localStorage.q.split(','),i=+localStorage.i||0;if(i>=q.length)return 'FIM';const [a,b,d]=q[i].split('>');const s=m=>new Promise(r=>setTimeout(r,m)),D=/^(Dom|Seg|Ter|Qua|Qui|Sex|S[\\u00e1a]b),? (\\d+) (\\w{3})/i,B=()=>/Valida[\\u00e7c][\\u00e3a]o de seg/i.test(document.title);let L=[];for(let k=0;k<25;k++){L=document.body.innerText.split('\\n').map(x=>x.trim()).filter(Boolean);if(B()||L.some(x=>/^\\d{1,3}(\\.\\d{3})* milhas/.test(x)||/Sem voos/i.test(x)))break;await s(1000)}const o=[];if(B())o.push('BLOQ');else for(let k=0;k<L.length-1;k++){const m=L[k].match(D);if(m){const p=L[k+1].match(/^(\\d{1,3}(\\.\\d{3})*) milhas/);if(p)o.push(m[2].padStart(2,'0')+m[3].toLowerCase()+'>'+p[1].replace(/\\./g,''));else if(/Sem voos/i.test(L[k+1]))o.push(m[2].padStart(2,'0')+m[3].toLowerCase()+'>E')}}const l='CAL|'+a+'|'+b+'|'+d+'|'+(o.join(' ')||'VAZIO');localStorage.res=(localStorage.res||'')+l+'\\n';localStorage.i=i+1;return i+' '+l.slice(4,60)}`;
const N = `()=>{const q=localStorage.q.split(','),i=+localStorage.i||0;if(i>=q.length)return;const [a,b,d]=q[i].split('>');location.href='https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ECONOMIC&children=0&departureDate='+Date.parse(d+'T12:00:00Z')+'&infants=0&isElegible=false&isFlexibleDateChecked=false&searchType=g3&segments=1&tripType=2&originAirport='+a+'&originCity=&originCountry=&originAirportIsAny=false&destinationAirport='+b+'&destinCity=&destinCountry=&destinAirportIsAny=false&novo-resgate-first-access=true'}`;
new Function('return ' + R); new Function('return ' + N);
const seed = 'localStorage.q=' + JSON.stringify(q) + ';localStorage.i=0;localStorage.res="";localStorage.r=' + JSON.stringify(R) + ';localStorage.n=' + JSON.stringify(N) + ';localStorage.q.split(",").length+" tarefas; eval:"+(()=>{try{return typeof eval(localStorage.n)}catch(e){return "BLOQUEADO "+e.message}})()';
fs.writeFileSync('data/seed.js', seed);
console.log(seed.length + ' chars');
