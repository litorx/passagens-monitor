// Gera um lote de acoes do Chrome para ler o calendario da Smiles.  node verify-chunk-cal.js <ini> <fim> <tabId>
const fs = require('fs');
const [ini, fim, tab] = [+process.argv[2], +process.argv[3], +process.argv[4]];
const plan = JSON.parse(fs.readFileSync('data/verify-plan-smiles.json', 'utf8'));
const fatia = plan.tarefas.slice(ini, fim);
const js = (t) => "const s=m=>new Promise(r=>setTimeout(r,m)),D=/^(Dom|Seg|Ter|Qua|Qui|Sex|S[\\u00e1a]b),? (\\d+) (\\w{3})/i;let L=[];for(let i=0;i<25;i++){L=document.body.innerText.split('\\n').map(x=>x.trim()).filter(Boolean);if(/Valida[\\u00e7c][\\u00e3a]o de seg/i.test(document.title)||L.some(x=>/^\\d{1,3}(\\.\\d{3})* milhas/.test(x)||/Sem voos/i.test(x)))break;await s(1000)}const o=[];if(/Valida[\\u00e7c][\\u00e3a]o de seg/i.test(document.title))o.push('BLOQ');else for(let i=0;i<L.length-1;i++){const m=L[i].match(D);if(m){const p=L[i+1].match(/^(\\d{1,3}(\\.\\d{3})*) milhas/);if(p)o.push(m[2].padStart(2,'0')+m[3].toLowerCase()+'>'+p[1].replace(/\\./g,''));else if(/Sem voos/i.test(L[i+1]))o.push(m[2].padStart(2,'0')+m[3].toLowerCase()+'>E')}}'CAL|" + t.de + '|' + t.para + '|' + t.centro + "|'+(o.join(' ')||'VAZIO')";
const acoes = [];
fatia.forEach((t) => {
  acoes.push({ name: 'navigate', input: { url: t.url, tabId: tab } }, { name: 'computer', input: { action: 'wait', duration: 7, tabId: tab } }, { name: 'javascript_tool', input: { action: 'javascript_exec', tabId: tab, text: js(t) } });
});
for (const a of acoes) if (a.name === 'javascript_tool') { try { new Function('return (async()=>{' + a.input.text + '})')(); } catch (e) { console.error('SINTAXE INVALIDA', e.message); process.exit(1); } }
console.error('paginas ' + ini + ' a ' + (ini + fatia.length) + ' de ' + plan.tarefas.length);
console.log(JSON.stringify(acoes));
