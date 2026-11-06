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
// Busca de resgate já preenchida no site do programa (testado: Azul, Smiles; LATAM exige login).
// Programas sem formato conhecido caem no link da página inicial que o site já traz.
function awardLink(progStr, home, o, d, dep, ret) {
  const p = (progStr || '').split('/').pop();
  const us = (iso) => { const [y, m, dd] = iso.split('-'); return m + '/' + dd + '/' + y; };
  if (p === 'Azul Fidelidade') {
    let q = 'c%5B0%5D.ds=' + o + '&c%5B0%5D.std=' + us(dep) + '&c%5B0%5D.as=' + d;
    if (ret) q += '&c%5B1%5D.ds=' + d + '&c%5B1%5D.std=' + us(ret) + '&c%5B1%5D.as=' + o;
    return 'https://www.voeazul.com.br/br/pt/home/selecao-voo?' + q + '&p%5B0%5D.t=ADT&p%5B0%5D.c=1&p%5B0%5D.cp=false&f.dl=3&f.dr=3&cc=PTS';
  }
  if (p === 'Smiles') {
    const ep = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return Date.UTC(y, m - 1, dd, 12); };
    return 'https://www.smiles.com.br/mfe/emissao-passagem/?adults=1&cabin=ECONOMIC&children=0&departureDate=' + ep(dep) +
      '&infants=0&isElegible=false&isFlexibleDateChecked=false' + (ret ? '&returnDate=' + ep(ret) : '') +
      '&searchType=g3&segments=1&tripType=' + (ret ? 1 : 2) + '&originAirport=' + o + '&originCity=&originCountry=&originAirportIsAny=false' +
      '&destinationAirport=' + d + '&destinCity=&destinCountry=&destinAirportIsAny=false&novo-resgate-first-access=true';
  }
  if (p === 'LATAM Pass') {
    const t = (iso) => encodeURIComponent(iso + 'T12:00:00.000Z');
    return 'https://www.latamairlines.com/br/pt/oferta-voos?origin=' + o + '&outbound=' + t(dep) + '&destination=' + d +
      (ret ? '&inbound=' + t(ret) : '') + '&adt=1&chd=0&inf=0&trip=' + (ret ? 'RT' : 'OW') + '&cabin=Economy&redemption=true&sort=RECOMMENDED';
  }
  return home || '';
}
// links de uma oferta
function linksNat(x, par) { const [a, b] = par.split('>'); return { gf: gf(x.oc, x.dc, a, b), prog: awardLink(x.prog, x.link, x.oc, x.dc, a, b) }; }
function linksCross(x, par) {
  const [a, b] = par.split('>');
  return {
    gfIda: gf(x.oc, x.dc, a), gfVolta: gf(x.dc, x.rc, b),
    progIda: awardLink(x.po, x.lo, x.oc, x.dc, a), progVolta: awardLink(x.pr, x.lr, x.dc, x.rc, b),
  };
}

// Top N mais baratas, no máximo uma por origem+destino
function top(rows, n = 5) {
  const all = [];
  rows.cash.forEach((x) => all.push({
    oc: x.oc, dc: x.dc, tipo: 'Dinheiro', brl: x.brl, miles: null, desc: x.cia, datas: x.pairs[0],
    links: { gf: x.link || gf(x.oc, x.dc, x.pairs[0].split('>')[0], x.pairs[0].split('>')[1]), prog: '' },
  }));
  // Cards "mesmo card" NÃO entram no ranking: o preço deles vale por UM trecho (confirmado no
  // resgate da LATAM: 9.649 mi era só a volta). Total de viagem só vem de dinheiro ou de ida + volta somadas.
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

// ---- filtro de promoções ----
// Mantém só ofertas que (1) estão perto do menor preço do mesmo destino e (2) ficam abaixo de um teto
// de preço "normal" para a região. Os tetos são referência do projeto, editáveis em config.json.
const NACIONAL = new Set('SDU GIG BEL MCZ SSA REC FOR POA FLN BSB MCP IGU BYO BPS NVT MII LDB JOI CNF CWB NAT SLZ GYN CGB VIX MAO THE AJU JPA CGR PMW SAO GRU CGH VCP'.split(' '));
const SUL = new Set('EZE AEP SCL MVD ASU FTE LIM BOG UIO GYE'.split(' '));
const NORTE = new Set('MCO FLL MIA JFK EWR IAD LAX LAS ORD CHO ATL BOS SFO CUN PUJ ADZ PTY MEX SJO'.split(' '));
function regiao(dc) {
  if (NACIONAL.has(dc)) return 'nacional';
  if (SUL.has(dc)) return 'americaDoSul';
  if (NORTE.has(dc)) return 'americaNorteCaribe';
  return 'europaOutros';
}

function filtrar(rows, cfg = cfgDefault) {
  const f = cfg.filtro || {};
  if (!f.ativo) return { rows, escondidas: 0 };
  const teto = f.tetoIdaVoltaReais || {};
  const tol = f.tolerancia || 1.6;
  // menor total de ida e volta por destino (dinheiro + soma de dois trechos em milhas)
  const min = {};
  const consider = (dc, v) => { if (v != null && (min[dc] == null || v < min[dc])) min[dc] = v; };
  rows.cash.forEach((x) => consider(x.dc, x.brl));
  rows.cross.forEach((x) => consider(x.dc, x.tot));
  const ok = (dc, v) => v != null && v <= (teto[regiao(dc)] ?? Infinity) && v <= (min[dc] ?? v) * tol;
  const before = rows.cash.length + rows.cross.length + rows.nat.length;
  const out = {
    ...rows,
    cash: rows.cash.filter((x) => ok(x.dc, x.brl)),
    cross: rows.cross.filter((x) => ok(x.dc, x.tot)),
    // card de um trecho: o preço de ida e volta seria pelo menos o dobro
    nat: rows.nat.filter((x) => x.brl != null && x.brl * 2 <= (teto[regiao(x.dc)] ?? Infinity)),
  };
  const after = out.cash.length + out.cross.length + out.nat.length;
  return { rows: out, escondidas: before - after };
}

module.exports = { compute, top, hojeISO, gf, awardLink, linksNat, linksCross, filtrar, regiao };
