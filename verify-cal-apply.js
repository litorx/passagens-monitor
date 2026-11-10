// Aplica as linhas CAL|de|para|centro|01dez>93000 02dez>E ...  (arquivo data/verify-cal.txt) em data/verified.json.
// Cada pagina do calendario vale ~7 datas: todas viram "conferidas". E = esgotado.
const fs = require('fs');
const cfg = require('./config.json');
const arq = process.argv[2] || 'data/verify-cal.txt';
const MES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
let v = {};
try { v = JSON.parse(fs.readFileSync('data/verified.json', 'utf8')); } catch {}
Object.keys(v).forEach((k) => { if (Date.now() - new Date(v[k].at).getTime() > validade) delete v[k]; });
const st = { paginas: 0, datas: 0, bloq: 0, vazio: 0 };
fs.readFileSync(arq, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('CAL|')).forEach((l) => {
  const [, de, para, centro, resto] = l.split('|');
  if (resto === 'BLOQ' || /^BLOQ/.test(resto)) { st.bloq++; return; }
  if (!resto || resto === 'VAZIO') { st.vazio++; return; }
  st.paginas++;
  const cy = +centro.slice(0, 4), cm = +centro.slice(5, 7);
  resto.split(' ').forEach((e) => {
    const m = e.match(/^(\d\d)([a-z]{3})>(\w+)$/); if (!m) return;
    const mes = MES[m[2]]; if (!mes) return;
    const ano = mes - cm > 6 ? cy - 1 : cm - mes > 6 ? cy + 1 : cy;
    const data = ano + '-' + String(mes).padStart(2, '0') + '-' + m[1];
    v['smiles|' + de + '|' + para + '|' + data] = m[3] === 'E' ? { status: 'esgotado', mi: 0, n: 0, extra: '', at: new Date().toISOString() } : { status: 'ok', mi: +m[3], n: 0, extra: '', at: new Date().toISOString() };
    st.datas++;
  });
});
fs.writeFileSync('data/verified.json', JSON.stringify(v, null, 1));
console.log(JSON.stringify(st), '| total no cache:', Object.keys(v).length);
