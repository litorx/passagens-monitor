// Transforma data/raw.json em linhas prontas: nativas (mesmo card), dinheiro e cruzadas (ida + volta separadas).
const cfgDefault = require('./config.json');

function hojeISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

function compute(raw, cfg = cfgDefault, today = hojeISO()) {
  const cards = raw.cards;
  const D = raw.dates;
  const mm = {};
  cards.forEach((c) => { if (c.mil && c.prog) mm[c.prog] = +String(c.mil).replace(',', '.'); });
  const brl = (c) => (c.brl != null ? c.brl : c.miles && mm[c.prog] ? Math.round((c.miles / 1000) * mm[c.prog]) : null);
  const fut = (c, dir) => (((D[c.id] || {}).awardDates) || [])
    .filter((a) => a.direction === dir && a.date > today).map((a) => a.date);
  const prog = (s) => s.replace(/ · /g, '/');

  const outs = cards.filter((c) => c.kind === 'out' && cfg.origins.includes(c.oc) && c.vt === 'miles');
  const ins = cards.filter((c) => c.kind === 'in' && c.vt === 'miles' && cfg.returnAirports.includes(c.dc));

  // nativas: o próprio card traz datas de volta
  const nat = [];
  outs.forEach((c) => {
    const o = fut(c, 'outbound'), r = fut(c, 'return');
    if (o.length && r.length) nat.push({ oc: c.oc, dc: c.dc, prog: prog(c.prog), miles: c.miles, brl: brl(c), ida: o, volta: r, link: c.link || '' });
  });

  // dinheiro
  const cash = [];
  cards.filter((c) => c.kind === 'out' && cfg.origins.includes(c.oc) && c.vt === 'cash').forEach((c) => {
    const cp = (((D[c.id] || {}).cashPairs) || []).filter((p) => p.departure_date > today);
    if (cp.length && c.brl) cash.push({
      oc: c.oc, dc: c.dc, brl: c.brl, cia: c.cia || '', link: c.link || '',
      pairs: cp.map((p) => p.departure_date + '>' + (p.return_date || '')),
    });
  });

  // cruzadas
  const res = {};
  outs.forEach((o) => {
    const od = fut(o, 'outbound');
    if (!od.length) return;
    ins.forEach((r) => {
      if (r.oc !== o.dc) return;
      const rd = fut(r, 'outbound');
      if (!rd.length) return;
      const combos = [];
      od.forEach((a) => rd.forEach((b) => {
        const n = days(a, b);
        if (n >= cfg.minStay && n <= cfg.maxStay) combos.push([a, b]);
      }));
      if (!combos.length) return;
      const bo = brl(o), br = brl(r);
      const row = {
        oc: o.oc, dc: o.dc, rc: r.dc, po: prog(o.prog), pr: prog(r.prog),
        mo: o.miles, mr: r.miles, bo, br,
        tot: bo != null && br != null ? bo + br : null,
        n: combos.length,
        ex: combos.slice(0, 3).map((x) => x[0] + '>' + x[1]),
        lo: o.link || '', lr: r.link || '',
      };
      const key = [row.oc, row.dc, row.rc, row.po, row.pr].join('|');
      const old = res[key];
      if (!old || (row.tot != null && (old.tot == null || row.tot < old.tot))) res[key] = row;
    });
  });
  const cross = Object.values(res);

  const num = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : a - b);
  nat.sort((a, b) => num(a.brl, b.brl));
  cash.sort((a, b) => a.brl - b.brl);
  cross.sort((a, b) => num(a.tot, b.tot));
  return { nat, cash, cross, today };
}

// Link do Google Flights com rota e datas exatas (ida e volta, ou só ida)
function gf(o, d, dep, ret) {
  const q = 'Flights from ' + o + ' to ' + d + ' on ' + dep + (ret ? ' through ' + ret : ' one way');
  return 'https://www.google.com/travel/flights?q=' + encodeURIComponent(q) + '&hl=pt-BR&gl=BR&curr=BRL';
}
// links de uma oferta: [{t, u}]
function linksNat(x, par) { const [a, b] = par.split('>'); return { gf: gf(x.oc, x.dc, a, b), prog: x.link || '' }; }
function linksCross(x, par) {
  const [a, b] = par.split('>');
  return { gfIda: gf(x.oc, x.dc, a), gfVolta: gf(x.dc, x.rc, b), progIda: x.lo || '', progVolta: x.lr || '' };
}

// Top N mais baratas, no máximo uma por origem+destino
function top(rows, n = 5) {
  const all = [];
  rows.cash.forEach((x) => all.push({
    oc: x.oc, dc: x.dc, tipo: 'Dinheiro', brl: x.brl, miles: null, desc: x.cia, datas: x.pairs[0],
    links: { gf: x.link || gf(x.oc, x.dc, x.pairs[0].split('>')[0], x.pairs[0].split('>')[1]), prog: '' },
  }));
  rows.nat.forEach((x) => {
    if (x.brl == null) return;
    // primeira ida com uma volta depois dela
    let par = null;
    for (const a of x.ida) { const b = x.volta.find((v) => v > a); if (b) { par = a + '>' + b; break; } }
    if (!par) return;
    all.push({ oc: x.oc, dc: x.dc, tipo: 'Milhas (mesmo card)', brl: x.brl, miles: x.miles, desc: x.prog, datas: par, links: linksNat(x, par) });
  });
  rows.cross.forEach((x) => x.tot != null && all.push({
    oc: x.oc, dc: x.dc, tipo: 'Milhas (ida + volta separadas)', brl: x.tot, miles: x.mo + x.mr,
    desc: x.po === x.pr ? x.po : x.po + ' + ' + x.pr, volta: x.rc, datas: x.ex[0], links: linksCross(x, x.ex[0]),
  }));
  all.sort((a, b) => a.brl - b.brl);
  const seen = new Set(), out = [];
  for (const a of all) {
    const k = a.oc + a.dc;
    if (seen.has(k)) continue;
    seen.add(k); out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

module.exports = { compute, top, hojeISO, gf, linksNat, linksCross };
