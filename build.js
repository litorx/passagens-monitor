// Lê data/raw.json, calcula as linhas e escreve docs/index.html (o site).
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');
const { compute, top, gf, linksNat, linksCross, filtrar } = require('./compute');

function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'raw.json'), 'utf8'));
  const { rows, escondidas } = filtrar(compute(raw, cfg), cfg);
  const s = (v) => (v == null ? '' : String(v));
  const md = (d) => d.slice(5);
  const u = (v) => (v || '').replace(/;/g, '%3B').replace(/\s/g, '%20');
  const sp = (p) => { const [a, b] = p.split('>'); return md(a) + '>' + (b ? md(b) : ''); };
  const firstPar = (x) => { for (const a of x.ida) { const b = x.volta.find((v) => v > a); if (b) return a + '>' + b; } return x.ida[0] + '>' + x.volta[0]; };
  const lines = [];
  rows.nat.forEach((x) => { const l = linksNat(x, firstPar(x)); lines.push(['N', x.oc, x.dc, x.prog, x.miles, s(x.brl), x.ida.map(md).join(' '), x.volta.map(md).join(' '), u(l.gf), u(l.prog)].join(';')); });
  rows.cash.forEach((x) => { const [a, b] = x.pairs[0].split('>'); lines.push(['C', x.oc, x.dc, x.brl, x.pairs.map(sp).join(' '), x.cia, u(x.link || gf(x.oc, x.dc, a, b))].join(';')); });
  rows.cross.forEach((x) => { const l = linksCross(x, x.ex[0]); lines.push(['X', x.oc, x.dc, x.rc, x.po, x.pr, x.mo, x.mr, s(x.bo), s(x.br), x.n, x.ex.map(sp).join(' '), u(l.gfIda), u(l.gfVolta), u(l.progIda), u(l.progVolta)].join(';')); });

  const when = new Date(raw.scannedAt);
  const p = (n) => String(n).padStart(2, '0');
  const fmt = p(when.getDate()) + '/' + p(when.getMonth() + 1) + '/' + when.getFullYear() + ' às ' + p(when.getHours()) + ':' + p(when.getMinutes());
  const today = rows.today.split('-').reverse().join('/');

  // nomes de cidade como o site escreve (código IATA → nome), para destinos que o template não conhece
  const cidades = {};
  raw.cards.forEach((c) => { if (c.dc && c.dn && !cidades[c.dc]) cidades[c.dc] = c.dn; });
  const T = cfg.filtro.tetoIdaVoltaReais;
  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  html = html.replace('__CITIES__', () => JSON.stringify(cidades).replace(/</g, '\\u003c'))
    .replace('__DATA__', () => lines.join('\n'))
    .replace('__SCANNED__', () => 'Atualizado em ' + fmt)
    .replace('__TODAY__', () => today)
    .replace('__ESCONDIDAS__', () => escondidas + ' ofertas com preço normal ou alto foram escondidas: ficam de fora as que passam de ' + cfg.filtro.tolerancia + ' vezes o menor preço do mesmo destino ou do teto de ida e volta da região (nacional R$ ' + T.nacional + ', América do Sul R$ ' + T.americaDoSul + ', América do Norte e Caribe R$ ' + T.americaNorteCaribe + ', Europa R$ ' + T.europaOutros + ', Ásia, África e Oceania R$ ' + T.longaDistancia + ').');
  fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), html);
  fs.writeFileSync(path.join(__dirname, 'data', 'rows.json'), JSON.stringify({ rows, top5: top(rows, 5), scannedAt: raw.scannedAt }));
  const c = (f) => ['nat', 'cash', 'cross'].map((k) => rows[k].filter((x) => f(x.oc)).length).join('/');
  console.log('OK docs/index.html', html.length, 'bytes | Campinas nat/cash/cross', c((o) => o === 'VCP'), '| São Paulo', c((o) => o !== 'VCP'), '| escondidas', escondidas);
}
main();
