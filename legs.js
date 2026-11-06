// Descartável: lista os trechos das melhores opções por destino (Campinas ou SP) com link de resgate.
const fs = require('fs');
const cfg = require('./config.json');
const { compute, filtrar } = require('./compute');
const raw = JSON.parse(fs.readFileSync('data/raw.json', 'utf8'));
const { rows } = filtrar(compute(raw, cfg), cfg);
const grupo = process.argv[2] || 'VCP';
const lim = +process.argv[3] || 14;
const g = (o) => (o === 'VCP' ? 'VCP' : 'SP');
const por = {};
rows.cross.filter((x) => g(x.oc) === grupo && x.tot != null).forEach((x) => { if (!por[x.dc] || x.tot < por[x.dc].tot) por[x.dc] = x; });
const { awardLink } = require('./compute');
const lista = Object.values(por).sort((a, b) => a.tot - b.tot).slice(0, lim);
const out = [];
lista.forEach((x, i) => {
  const [a, b] = x.ex[0].split('>');
  out.push({ i: i + 1, dest: x.dc, tot: x.tot, ida: { prog: x.po, de: x.oc, para: x.dc, data: a, mi: x.mo, brl: x.bo, url: awardLink(x.po, x.lo, x.oc, x.dc, a) }, volta: { prog: x.pr, de: x.dc, para: x.rc, data: b, mi: x.mr, brl: x.br, url: awardLink(x.pr, x.lr, x.dc, x.rc, b) } });
});
fs.writeFileSync('data/legs-' + grupo + '.json', JSON.stringify(out, null, 1));
out.forEach((o) => console.log(o.i, o.dest, 'R$' + o.tot, '| ida', o.ida.prog, o.ida.de + '>' + o.ida.para, o.ida.data, o.ida.mi + 'mi', '| volta', o.volta.prog, o.volta.de + '>' + o.volta.para, o.volta.data, o.volta.mi + 'mi'));
