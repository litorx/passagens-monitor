// Gera docs/grupos.html a partir de data/wa-offers.json (ofertas lidas dos grupos de WhatsApp).
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

// R$ por 1.000 milhas, só para estimar quando o grupo não informa o preço em reais
const MILHEIRO = { smiles: 15, azul: 14, tudoazul: 14, latam: 23, aeroplan: 70, aadvantage: 90, iberia: 40, flying: 45, virgin: 35 };
const milheiro = (p) => { const k = Object.keys(MILHEIRO).find((x) => (p || '').toLowerCase().replace(/\s/g, '').includes(x)); return k ? MILHEIRO[k] : 25; };

function paraItem(o) {
  const mi = (o.milhasIda || 0) + (o.ehIV ? (o.milhasVolta || 0) : 0);
  let brl = null, como = '', trecho = o.ehIV ? 'ida e volta' : 'um trecho';
  if (o.tipo === 'dinheiro') { brl = o.brl; como = 'em dinheiro'; }
  else if (o.ivRS != null && (o.fonte === 'emissao' || o.fonte === 'secreta')) { brl = o.ivRS; como = 'emissão pelo grupo'; }
  else if (o.ivRS != null) { brl = o.ivRS; como = 'em milhas, ida e volta'; trecho = 'ida e volta'; }
  else if (o.brlViaMilhas != null) { brl = o.brlViaMilhas + (o.taxas || 0) * 0; como = 'em milhas, só a ida'; }
  else { brl = Math.round((mi / 1000) * milheiro(o.prog) + (o.taxas || 0) + (o.ehIV ? (o.taxasVolta || 0) : 0)); como = o.ehIV ? 'em milhas, ida e volta (estimado)' : 'em milhas, só a ida (estimado)'; }
  const datas = { ida: (o.ida || []).filter(Boolean), volta: (o.volta || []).filter(Boolean) };
  return { g: o.grupo.replace(/[\u{1F000}-\u{1FFFF}☀-➿️⚠⚡]/gu, '').replace(/\s+/g, ' ').trim(), t: o.t, oc: o.oc, od: o.od, dc: o.dc, dn: o.dn, cia: o.cia || '', prog: o.prog || '', mi, brl, como, trecho, ida: datas.ida, volta: datas.volta, normal: o.normal || null, link: o.link || '', obs: o.obs || '', econ: true };
}

function main() {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'wa-offers.json'), 'utf8'));
  const hoje = new Date().toISOString().slice(0, 10);
  const items = src.offers.map(paraItem).filter((x) => x.brl != null && x.brl > 0)
    // some oferta cujas datas já passaram todas
    .filter((x) => !(x.ida.length && x.ida.every((d) => d < hoje)));
  const lido = new Date(src.lidoEm);
  const p = (n) => String(n).padStart(2, '0');
  const quando = p(lido.getDate()) + '/' + p(lido.getMonth() + 1) + ' às ' + p(lido.getHours()) + ':' + p(lido.getMinutes());
  const tpl = fs.readFileSync(path.join(__dirname, 'grupos-template.html'), 'utf8');
  const html = tpl.replace('__ITEMS__', () => JSON.stringify(items).replace(/</g, '\\u003c')).replace('__LIDO__', () => 'Lido em ' + quando).replace('__SITE__', () => cfg.siteUrl || './');
  fs.writeFileSync(path.join(__dirname, 'docs', 'grupos.html'), html);
  fs.writeFileSync(path.join(__dirname, 'docs', 'index.html'), html); // sem o agregador, a pagina principal e a dos grupos
  const BR = new Set('GRU CGH VCP SAO GIG SDU BSB CNF PLU SSA REC FOR NAT MCZ AJU JPA SLZ BEL MAO CWB POA FLN NVT JOI IGU UDI GYN CGB CGR VIX BPS IOS THE PMW SJP LDB MGF PFB BYO CAC AAX RAO LEC FEN STM PVH RBR MCP BVB MII MOC IMP CFB PHB IZA GVR VDC CXJ CPV JDF XAP PNZ BAU OPS CKS ATM MVF'.split(' '));
  const BRN = /florian|salvador|recife|fortaleza|natal|macei|aracaju|jo[aã]o pessoa|s[aã]o lu[ií]s|bel[eé]m|manaus|curitiba|porto alegre|navegantes|joinville|foz|uberl|goi[aâ]nia|cuiab|campo grande|vit[oó]ria|porto seguro|ilh[eé]us|teresina|londrina|maring|bras[ií]lia|belo horizonte|rio de janeiro|bonito|noronha|jericoacoara|petrolina|ribeir|chapec|caldas|maca[pé]|boa vista|santar|palmas|imperatriz|montes claros|juiz de fora|caxias|campina grande|chapec|petrolina/i;
  const nac = (x) => (x.dc ? BR.has(x.dc) : BRN.test(x.dn || ''));
  const ord = items.slice().sort((a, b) => a.brl - b.brl);
  fs.writeFileSync(path.join(__dirname, 'data', 'grupos-top.json'), JSON.stringify({ lidoEm: src.lidoEm, nacionais: ord.filter(nac).slice(0, 5), internacionais: ord.filter((x) => !nac(x)).slice(0, 5) }));
  console.log('OK docs/grupos.html', items.length, 'ofertas de grupos');
}
main();



