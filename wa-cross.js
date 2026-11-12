// Cruza as ofertas dos grupos (e do Melhores Destinos) para achar a MELHOR IDA E VOLTA saindo de SP/Campinas.
//   - ofertas que ja sao ida e volta (mesmo bilhete) viram candidatas direto;
//   - trechos soltos de ida (SP->X) sao cruzados com trechos soltos de volta (X->SP) de qualquer grupo (bilhetes separados);
//   - aplica data/verified.json (conferencia nos programas): troca milhas pelo valor real e descarta datas esgotadas;
//   - escreve data/ranking.json (nacionais, internacionais, todos) e data/fila-conferencia.json (trechos a conferir antes do alerta).
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');
const { awardLink } = require('./compute');

const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8').replace(/^﻿/, '')); } catch { return d; } };
const MILHEIRO = { smiles: 15, azul: 14, tudoazul: 14, latam: 23, aeroplan: 70, aadvantage: 90, iberia: 40, flying: 45, virgin: 35 };
const milheiro = (p) => { const k = Object.keys(MILHEIRO).find((x) => (p || '').toLowerCase().replace(/\s/g, '').includes(x)); return k ? MILHEIRO[k] : 25; };
const plat = (p) => { const s = (p || '').toLowerCase(); return /smiles/.test(s) ? 'smiles' : /latam/.test(s) ? 'latam' : /azul/.test(s) ? 'azul' : null; };
const PROGSTR = { smiles: 'GOL/Smiles', latam: 'LATAM Pass', azul: 'Azul Fidelidade' };
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
const BR = new Set('GRU CGH VCP SAO GIG SDU BSB CNF PLU SSA REC FOR NAT MCZ AJU JPA SLZ BEL MAO CWB POA FLN NVT JOI IGU UDI GYN CGB CGR VIX BPS IOS THE PMW SJP LDB MGF PFB BYO CAC AAX RAO LEC FEN STM PVH RBR MCP BVB MII MOC IMP CFB PHB IZA GVR VDC CXJ CPV JDF XAP PNZ BAU OPS CKS ATM MVF'.split(' '));
const BRN = /florian|salvador|recife|fortaleza|natal|macei|aracaju|joao pessoa|sao luis|belem|manaus|curitiba|porto alegre|navegantes|joinville|foz|uberl|goiania|cuiab|campo grande|vitoria|porto seguro|ilheus|teresina|londrina|maring|brasilia|belo horizonte|rio de janeiro|bonito|noronha|jericoacoara|petrolina|ribeir|chapec|caldas|macap|boa vista|santar|palmas|imperatriz|montes claros|juiz de fora|caxias|campina grande|passo fundo|sao jose do rio preto|parnaiba/i;
const dia = (s) => Date.parse(s + 'T12:00:00Z') / 864e5;
const hoje = new Date().toISOString().slice(0, 10);

const src = (rd('wa-offers.json', { offers: [] }).offers || []).concat((rd('md-offers.json', { offers: [] }).offers) || []);
const ver = rd('verified.json', {});
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
const tentou = (pl, de, para, d) => { const v = ver[[pl, de, para, d].join('|')]; return !!v && Date.now() - new Date(v.at).getTime() < validade && ['ok', 'esgotado', 'bloqueado', 'nd'].includes(v.status); };
const vget = (pl, de, para, d) => { const v = ver[[pl, de, para, d].join('|')]; return v && Date.now() - new Date(v.at).getTime() < validade && !['login', 'bloqueado', 'nd'].includes(v.status) ? v : null; };

// codigo IATA por nome de destino, aprendido das ofertas que trazem os dois
const code = {};
src.forEach((o) => { if (o.dc && o.dn) code[norm(o.dn)] = o.dc; });
const destKey = (o) => o.dc || code[norm(o.dn)] || norm(o.dn);
const destCode = (o) => o.dc || code[norm(o.dn)] || '';
const ehNac = (o) => (destCode(o) ? BR.has(destCode(o)) : BRN.test(norm(o.dn)));

// custo em R$ de um trecho (ou do pacote ida+volta no mesmo bilhete)
function custoMilhas(prog, milhas, taxas) { return Math.round((milhas / 1000) * milheiro(prog) + (taxas || 0)); }
function custoTrecho(o) {
  if (o.tipo === 'dinheiro') return o.brl;
  if (o.fonte === 'emissao' || o.fonte === 'secreta') { if (o.ivRS != null) return o.ivRS; }
  if (o.brlViaMilhas != null) return o.brlViaMilhas;
  return custoMilhas(o.prog, o.milhasIda, o.taxas);
}

// pares de datas validos (ida antes da volta, viagem de 3 a 30 dias); escolhe o mais proximo de 7 dias
function melhorPar(idas, voltas, okIda, okVolta) {
  let best = null;
  (idas || []).filter((d) => d >= hoje && okIda(d)).forEach((a) => (voltas || []).filter((d) => okVolta(d)).forEach((b) => {
    const g = dia(b) - dia(a); if (g < 3 || g > 30) return;
    const sc = Math.abs(g - 7) * 10 + dia(a) / 1e3;
    if (!best || sc < best.sc) best = { a, b, sc };
  }));
  return best;
}
const semData = (voltas) => !voltas || !voltas.length;

const cands = [];
const sp = (o) => o.oc === 'SAO' ? 'GRU' : o.oc;
const mkLeg = (o, dir, date, miles, taxes, cash) => {
  const pl = plat(o.prog) || plat(o.cia);
  return { dir, prog: o.prog || o.cia || '', plat: miles ? pl : null, from: dir === 'out' ? sp(o) : destCode(o), to: dir === 'out' ? destCode(o) : sp(o), date, miles: miles || 0, taxes: taxes || 0, cash: cash || null, link: o.link || '', linkDin: o.linkDin || '', grupo: o.grupo };
};

const outs = src.filter((o) => o.dir !== 'in');
const ins = src.filter((o) => o.dir === 'in');

outs.forEach((o) => {
  const dst = destKey(o); if (!dst) return;
  // 1) cash IV (grupo ou site): ja e ida e volta
  if (o.tipo === 'dinheiro' && o.ehIV) {
    cands.push({ kind: 'dinheiro_iv', dest: o.dn, dk: dst, dc: destCode(o), nac: ehNac(o), total: o.brl, ida: (o.ida || [])[0] || '', volta: (o.volta || [])[0] || '', legs: [], conf: 'na', refs: [o], normal: o.normal || null, prime: o.fonte === 'mestre', fonte: o.fonte });
    return;
  }
  // 2) milhas com volta no mesmo pacote (emissao/secreta/alerta com volta)
  if (o.tipo === 'milhas' && o.milhasVolta && !semData(o.volta)) {
    const pl = plat(o.prog);
    const par = melhorPar(o.ida, o.volta, (d) => !pl || !vget(pl, sp(o), destCode(o), d) || vget(pl, sp(o), destCode(o), d).status === 'ok', (d) => !pl || !vget(pl, destCode(o), sp(o), d) || vget(pl, destCode(o), sp(o), d).status === 'ok');
    if (!par) return;
    const l1 = mkLeg(o, 'out', par.a, o.milhasIda, o.taxas), l2 = mkLeg(o, 'in', par.b, o.milhasVolta, o.taxasVolta);
    cands.push({ kind: 'milhas_iv', dest: o.dn, dk: dst, dc: destCode(o), nac: ehNac(o), total: o.ivRS != null ? o.ivRS : custoMilhas(o.prog, o.milhasIda + o.milhasVolta, (o.taxas || 0) + (o.taxasVolta || 0)), ida: par.a, volta: par.b, legs: [l1, l2], conf: 'nao', refs: [o], fonte: o.fonte, estimado: o.ivRS == null });
    return;
  }
  // 3) so ida: cruza com trechos de volta de qualquer grupo
  if (o.tipo === 'milhas' || o.tipo === 'dinheiro') {
    ins.filter((i) => destKey(i) === dst).forEach((i) => {
      const plO = o.tipo === 'milhas' ? plat(o.prog) : null, plI = i.tipo === 'milhas' ? plat(i.prog) : null;
      const par = melhorPar(o.ida, i.ida, (d) => !plO || !vget(plO, sp(o), destCode(o), d) || vget(plO, sp(o), destCode(o), d).status === 'ok', (d) => !plI || !vget(plI, destCode(i), sp(i), d) || vget(plI, destCode(i), sp(i), d).status === 'ok');
      if (!par) return;
      const l1 = mkLeg(o, 'out', par.a, o.tipo === 'milhas' ? o.milhasIda : 0, o.taxas, o.tipo === 'dinheiro' ? o.brl : null);
      const l2 = mkLeg(i, 'in', par.b, i.tipo === 'milhas' ? i.milhasIda : 0, i.taxas, i.tipo === 'dinheiro' ? i.brl : null);
      cands.push({ kind: 'cruzado', dest: o.dn, dk: dst, dc: destCode(o), nac: ehNac(o), total: custoTrecho(o) + custoTrecho(i), ida: par.a, volta: par.b, legs: [l1, l2], conf: 'nao', refs: [o, i], fonte: o.fonte + '+' + i.fonte, estimado: true });
    });
  }
});

// aplica a conferencia: milhas reais e status por trecho
cands.forEach((c) => {
  let ok = 0, tot = 0, esg = false;
  c.legs.forEach((l) => {
    if (!l.plat) return; tot++;
    const v = vget(l.plat, l.from, l.to, l.date);
    if (v && v.status === 'ok') { l.conf = 'ok'; l.milesReal = v.mi; ok++; } else if (v && v.status === 'esgotado') esg = true;
  });
  if (esg) c.descartar = true;
  if (tot && ok === tot) {
    c.conf = 'ok';
    const prog = (c.legs.find((l) => l.plat) || {}).prog;
    if (c.kind === 'milhas_iv' || c.kind === 'cruzado') {
      // recalcula o total com milhas reais dos trechos conferidos
      c.total = c.legs.reduce((s, l) => s + (l.miles ? custoMilhas(l.prog, l.milesReal || l.miles, l.taxes) : (l.cash || 0)), 0);
      c.estimado = false; c.baseReal = true;
    }
  } else if (ok) c.conf = 'parcial';
  else if (!tot) c.conf = 'na';
});

// melhor candidata por destino (a mais barata; quando ha empate, a conferida)
const melhor = new Map();
cands.filter((c) => !c.descartar && c.total > 0).forEach((c) => {
  const k = c.dk + '|' + (c.nac ? 'n' : 'i');
  const a = melhor.get(k);
  const peso = (x) => x.total - (x.conf === 'ok' ? 0.5 : 0);
  if (!a || peso(c) < peso(a)) melhor.set(k, c);
});
const rank = [...melhor.values()].sort((a, b) => a.total - b.total);
const slim = (c) => ({ kind: c.kind, oc: c.refs[0].oc, dest: c.dest, dc: c.dc, nac: c.nac, total: c.total, ida: c.ida, volta: c.volta, conf: c.conf, estimado: !!c.estimado, normal: c.normal || null, prime: !!c.prime, fonte: c.fonte, grupos: [...new Set(c.refs.map((r) => r.grupo))], legs: c.legs, links: c.refs.map((r) => ({ g: r.grupo, u: r.link || '', din: r.linkDin || '' })), obs: c.refs.map((r) => r.obs || '').filter(Boolean)[0] || '' });
const nacionais = rank.filter((c) => c.nac).slice(0, 5).map(slim), internacionais = rank.filter((c) => !c.nac).slice(0, 5).map(slim);
fs.writeFileSync(path.join(__dirname, 'data', 'ranking.json'), JSON.stringify({ geradoEm: new Date().toISOString(), nacionais, internacionais, todos: rank.slice(0, 80).map(slim) }));

// fila de conferencia: trechos de milhas das 8 melhores de cada lista que ainda nao estao conferidos
const fila = new Map();
[...rank.filter((c) => c.nac).slice(0, 8), ...rank.filter((c) => !c.nac).slice(0, 8)].forEach((c) => c.legs.forEach((l) => {
  if (!l.plat || tentou(l.plat, l.from, l.to, l.date)) return;
  const key = [l.plat, l.from, l.to, l.date].join('|');
  if (!fila.has(key)) fila.set(key, { key, platform: l.plat, from: l.from, to: l.to, date: l.date, adv: l.miles, url: awardLink(PROGSTR[l.plat], '', l.from, l.to, l.date) });
}));
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const snippet = (pl, key, date) => { const [y, m, d] = date.split('-'); return fs.readFileSync(path.join(__dirname, 'verify-snippets', pl + '.js'), 'utf8').replace(/__KEY__/g, key).replace(/__ALVO__/g, d + ' ' + MES[+m - 1]); };
fila.forEach((t) => { t.js = snippet(t.platform, t.key, t.date); });
const ordem = { azul: 0, smiles: 1, latam: 2 };
const lista = [...fila.values()].sort((a, b) => ordem[a.platform] - ordem[b.platform]);
fs.writeFileSync(path.join(__dirname, 'data', 'fila-conferencia.json'), JSON.stringify({ geradoEm: new Date().toISOString(), tarefas: lista }, null, 1));
const por = {}; lista.forEach((t) => { por[t.platform] = (por[t.platform] || 0) + 1; });
console.log('candidatas:', cands.length, '| destinos no ranking:', rank.length, '| conferidas (top):', [...nacionais, ...internacionais].filter((c) => c.conf === 'ok').length + '/' + (nacionais.length + internacionais.length), '| a conferir:', lista.length, JSON.stringify(por));



