// Plano de conferência: escolhe as melhores ofertas de cada origem e, para cada trecho, gera o link do programa
// e o código que lê o preço real na página. Quem executa o plano é o Chrome do usuário (ver CONFERIR.md).
//   node verify-plan.js [--top 15]
const fs = require('fs');
const cfg = require('./config.json');
const { compute, filtrar, awardLink } = require('./compute');

const top = +((process.argv.indexOf('--top') > -1 && process.argv[process.argv.indexOf('--top') + 1]) || (cfg.conferencia && cfg.conferencia.topPorGrupo) || 15);
const raw = JSON.parse(fs.readFileSync('data/raw.json', 'utf8'));
const { rows } = filtrar(compute(raw, cfg), cfg);
const grupo = (o) => (o === 'VCP' ? 'VCP' : 'SP');
const last = (p) => String(p || '').split('/').pop();
const plataforma = (p) => ({ 'Azul Fidelidade': 'azul', Smiles: 'smiles', 'LATAM Pass': 'latam' }[last(p)] || 'nv');
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const snippet = (pl, key, date) => { const [y, m, d] = date.split('-'); return fs.readFileSync('verify-snippets/' + pl + '.js', 'utf8').replace(/__KEY__/g, key).replace(/__ALVO__/g, d + ' ' + MES[+m - 1]); };

// melhor oferta de milhas por destino, por origem
const cand = {};
rows.cross.filter((x) => x.tot != null).forEach((x) => {
  const k = grupo(x.oc) + '|' + x.dc;
  if (!cand[k] || x.tot < cand[k].tot) cand[k] = x;
});
const lista = {};
Object.values(cand).forEach((x) => { const g = grupo(x.oc); (lista[g] = lista[g] || []).push(x); });
const escolhidas = [];
Object.keys(lista).forEach((g) => lista[g].sort((a, b) => a.tot - b.tot).slice(0, top).forEach((x) => escolhidas.push(x)));

let jaConferidos = {};
try { jaConferidos = JSON.parse(fs.readFileSync('data/verified.json', 'utf8')); } catch {}
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
const fresco = (k) => jaConferidos[k] && Date.now() - new Date(jaConferidos[k].at).getTime() < validade && !['login', 'bloqueado'].includes(jaConferidos[k].status);
const tarefas = new Map();
// só o par mais próximo e o mais distante: datas distantes são as que mais costumam existir
const extremos = (ex) => [...new Set([ex[0], ex[ex.length - 1]])];
escolhidas.forEach((x) => extremos(x.ex).forEach((par) => {
  const [a, b] = par.split('>');
  [[x.po, x.oc, x.dc, a, x.mo, x.lo], [x.pr, x.dc, x.rc, b, x.mr, x.lr]].forEach(([prog, de, para, data, mi, home]) => {
    const pl = plataforma(prog);
    const key = [pl, de, para, data].join('|');
    if (tarefas.has(key) || fresco(key)) return;
    const t = { key, platform: pl, from: de, to: para, date: data, adv: mi, prog, label: de + '>' + para + ' ' + data };
    if (pl !== 'nv') { t.url = awardLink(prog, home, de, para, data); t.js = snippet(pl, key, data); }
    tarefas.set(key, t);
  });
}));
const todas = [...tarefas.values()];
const ordem = { azul: 0, smiles: 1, latam: 2, nv: 3 };
todas.sort((a, b) => ordem[a.platform] - ordem[b.platform]);
fs.writeFileSync('data/verify-plan.json', JSON.stringify({ geradoEm: new Date().toISOString(), ofertas: escolhidas.length, tarefas: todas }, null, 1));
const cont = {};
todas.forEach((t) => { cont[t.platform] = (cont[t.platform] || 0) + 1; });
console.log('ofertas a conferir:', escolhidas.length, '| trechos:', todas.length, JSON.stringify(cont), '→ data/verify-plan.json');
