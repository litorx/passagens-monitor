// Lê data/raw.json, calcula as linhas e escreve docs/index.html (o site).
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');
const { compute, top } = require('./compute');

function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'raw.json'), 'utf8'));
  const rows = compute(raw, cfg);
  const s = (v) => (v == null ? '' : String(v));
  const md = (d) => d.slice(5);
  const lines = [];
  rows.nat.forEach((x) => lines.push(['N', x.oc, x.dc, x.prog, x.miles, s(x.brl), x.ida.map(md).join(' '), x.volta.map(md).join(' ')].join(';')));
  rows.cash.forEach((x) => lines.push(['C', x.oc, x.dc, x.brl, x.pairs.join(' '), x.cia].join(';')));
  rows.cross.forEach((x) => lines.push(['X', x.oc, x.dc, x.rc, x.po, x.pr, x.mo, x.mr, s(x.bo), s(x.br), x.n, x.ex.join(' ')].join(';')));

  const when = new Date(raw.scannedAt);
  const p = (n) => String(n).padStart(2, '0');
  const fmt = p(when.getDate()) + '/' + p(when.getMonth() + 1) + '/' + when.getFullYear() + ' às ' + p(when.getHours()) + ':' + p(when.getMinutes());
  const today = rows.today.split('-').reverse().join('/');

  let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  html = html.replace('__DATA__', () => lines.join('\n'))
    .replace('__SCANNED__', () => 'Atualizado em ' + fmt + ' · Secret Flight Deals · classe econômica')
    .replace('__TODAY__', () => today);
  fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), html);
  fs.writeFileSync(path.join(__dirname, 'data', 'rows.json'), JSON.stringify({ rows, top5: top(rows, 5), scannedAt: raw.scannedAt }));
  const c = (o) => ['nat', 'cash', 'cross'].map((k) => rows[k].filter((x) => x.oc === o).length).join('/');
  console.log('OK docs/index.html', html.length, 'bytes | VCP nat/cash/cross', c('VCP'), '| SAO', c('SAO'));
}
main();
