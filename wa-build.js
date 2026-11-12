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

function rankingHtml() {
  let r; try { r = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ranking.json'), 'utf8')); } catch { return ''; }
  const { estruturar } = require('./fmt-rank');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const card = (c, i) => {
    const e = estruturar(c);
    const ok = c.conf === 'ok';
    return '<article class="rk"><div class="rk-top"><span class="rk-n">' + (i + 1) + '</span><div><h3>' + esc(e.cab) + '</h3><p class="rk-d">' + esc(e.datas) + ' · ida e volta</p></div><div class="rk-p">' + esc(e.preco) + '<span class="' + (ok ? 'rk-ok' : 'rk-w') + '">' + esc(e.selo) + '</span></div></div>'
      + '<ul>' + e.itens.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>'
      + '<div class="rk-a">' + e.links.map(([r2, u]) => '<a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(r2) + '</a>').join('') + '</div>'
      + '<p class="rk-g">' + esc(e.grupos.join(' + ')) + (e.nota ? ' · ' + esc(e.nota) : '') + '</p></article>';
  };
  const css = '<style>.rkwrap{margin:0 0 1.5rem}.rkwrap h2{font-size:1.125rem;margin:1.25rem 0 .5rem}.rk{border:1px solid var(--line);border-radius:var(--r-md,10px);padding:1rem;margin:0 0 .75rem;background:#fff}.rk-top{display:grid;grid-template-columns:auto 1fr auto;gap:.75rem;align-items:start}.rk-n{font-weight:700;color:var(--ink-3)}.rk h3{margin:0;font-size:1rem}.rk-d{margin:.125rem 0 0;color:var(--ink-2);font-size:.875rem}.rk-p{text-align:right;font-weight:700;font-size:1.25rem}.rk-p span{display:block;font-size:.75rem;font-weight:400}.rk-ok{color:#0a6b3b}.rk-w{color:var(--warn)}.rk ul{margin:.5rem 0;padding-left:1.1rem;font-size:.875rem}.rk-a{display:flex;flex-wrap:wrap;gap:.5rem}.rk-g{margin:.5rem 0 0;color:var(--ink-3);font-size:.8125rem}@media(max-width:560px){.rk-top{grid-template-columns:auto 1fr}.rk-p{grid-column:1/-1;text-align:left}}</style>';
  const sec = (t, l) => (l && l.length ? '<h2>' + t + '</h2>' + l.map(card).join('') : '');
  return css + '<section class="rkwrap"><h2 style="margin-top:0">Melhores ida e volta (cruzando os grupos)</h2><p class="meta" style="margin:0 0 .5rem">Ida e volta somados, saindo de São Paulo ou Campinas. ✅ = conferido hoje no site do programa.</p>' + sec('Nacionais', r.nacionais) + sec('Internacionais', r.internacionais) + '</section><h2 style="font-size:1.125rem">Todas as ofertas lidas</h2>';
}
function main() {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'wa-offers.json'), 'utf8'));
  let extra = [];
  try { extra = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'md-offers.json'), 'utf8')).offers || []; } catch {}
  const hoje = new Date().toISOString().slice(0, 10);
  const items = src.offers.concat(extra).filter((o) => o.dir !== 'in').map(paraItem).filter((x) => x.brl != null && x.brl > 0)
    // some oferta cujas datas já passaram todas
    .filter((x) => !(x.ida.length && x.ida.every((d) => d < hoje)));
  const lido = new Date(src.lidoEm);
  const p = (n) => String(n).padStart(2, '0');
  const quando = p(lido.getDate()) + '/' + p(lido.getMonth() + 1) + ' às ' + p(lido.getHours()) + ':' + p(lido.getMinutes());
  const tpl = fs.readFileSync(path.join(__dirname, 'grupos-template.html'), 'utf8');
  const html = tpl.replace('__ITEMS__', () => JSON.stringify(items).replace(/</g, '\\u003c')).replace('__RANKING__', () => rankingHtml()).replace('__LIDO__', () => 'Lido em ' + quando).replace('__SITE__', () => cfg.siteUrl || './');
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





