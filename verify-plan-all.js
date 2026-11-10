// Plano completo da Smiles: cobre TODOS os trechos (ida e volta) de todas as ofertas, pulando o que ja foi conferido
// e usando o calendario da Smiles (7 dias por pagina) para conferir varias datas de uma vez.
//   node verify-plan-all.js   -> data/verify-plan-smiles.json   (e node verify-chunk-cal.js <ini> <fim> <tabId>)
const fs = require('fs');
const cfg = require('./config.json');
const { compute, filtrar, awardLink } = require('./compute');
const raw = JSON.parse(fs.readFileSync('data/raw.json', 'utf8'));
const { rows } = filtrar(compute(raw, cfg), cfg);
const last = (p) => String(p || '').split('/').pop();
const isSm = (p) => last(p) === 'Smiles';
let ver = {};
try { ver = JSON.parse(fs.readFileSync('data/verified.json', 'utf8')); } catch {}
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
const fresco = (k) => ver[k] && Date.now() - new Date(ver[k].at).getTime() < validade && !['login', 'bloqueado', 'nd'].includes(ver[k].status);
const need = {}; // rota -> {datas, prog, home}
const add = (prog, home, de, para, data) => {
  if (!isSm(prog) || !data) return;
  const key = ['smiles', de, para, data].join('|');
  if (fresco(key)) return;
  const r = (need[de + '|' + para] = need[de + '|' + para] || { de, para, prog, home, datas: new Set() });
  r.datas.add(data);
};
rows.cross.forEach((x) => x.ex.forEach((par) => { const [a, b] = par.split('>'); add(x.po, x.lo, x.oc, x.dc, a); add(x.pr, x.lr, x.dc, x.rc, b); }));
const hoje = new Date().toISOString().slice(0, 10);
const dia = (s) => Date.parse(s + 'T12:00:00Z') / 864e5;
const tarefas = [];
Object.values(need).forEach((r) => {
  const ds = [...r.datas].filter((d) => d >= hoje).sort();
  while (ds.length) {
    const ini = ds[0], centro = new Date((dia(ini) + 3) * 864e5).toISOString().slice(0, 10);
    const cobre = ds.filter((d) => dia(d) <= dia(ini) + 6);
    ds.splice(0, cobre.length);
    tarefas.push({ de: r.de, para: r.para, centro, cobre, url: awardLink(r.prog, r.home, r.de, r.para, centro) });
  }
});
tarefas.sort((a, b) => a.de.localeCompare(b.de) || a.para.localeCompare(b.para) || a.centro.localeCompare(b.centro));
fs.writeFileSync('data/verify-plan-smiles.json', JSON.stringify({ geradoEm: new Date().toISOString(), tarefas }, null, 1));
console.log('rotas:', Object.keys(need).length, '| paginas a ler:', tarefas.length, '| ~' + Math.round(tarefas.length * 10 / 60) + ' min');
