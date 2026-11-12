// Texto legivel de uma candidata do ranking (WhatsApp e site usam o mesmo conteudo).
const { awardLink } = require('./compute');
const PROGSTR = { smiles: 'GOL/Smiles', latam: 'LATAM Pass', azul: 'Azul Fidelidade' };
const ORIG = { GRU: 'SÃO PAULO (GRU)', CGH: 'SÃO PAULO (CGH)', VCP: 'CAMPINAS (VCP)', SAO: 'SÃO PAULO' };
const nf = (n) => Number(n).toLocaleString('pt-BR');
const dm = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '');
const bonito = (s) => (s || '').toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Do|Da|Dos|Das|Del|E)\b/g, (x) => x.toLowerCase());
const titulo = (c) => (ORIG[c.oc] || 'SÃO PAULO') + ' → ' + bonito(c.dest);

function descTrecho(l) {
  if (l.miles) {
    const real = l.milesReal && l.milesReal !== l.miles;
    return l.prog.replace(/\s*\(.*\)/, '') + ' ' + nf(l.milesReal || l.miles) + ' milhas' + (l.taxes ? ' + R$ ' + nf(l.taxes) + ' de taxas' : '') + (l.conf === 'ok' ? ' ✅ conferido' + (real ? ' (o grupo anunciava ' + nf(l.miles) + ')' : '') : ' ⚠️ não conferido');
  }
  return 'R$ ' + nf(l.cash || 0) + ' em dinheiro';
}
const linkTrecho = (l) => l.link || (l.plat ? awardLink(PROGSTR[l.plat], '', l.from, l.to, l.date) : '');

// linhas estruturadas: { cab, preco, selo, itens:[texto], links:[[rotulo,url]], grupos, nota }
function estruturar(c) {
  const selo = c.conf === 'ok' ? 'conferido nos programas ✅' : c.conf === 'parcial' ? 'conferido só em parte ⚠️' : c.conf === 'na' ? 'preço do alerta em dinheiro (não passa por conferência)' : (c.estimado ? 'valor estimado, ainda não conferido ⚠️' : 'preço do grupo, ainda não conferido ⚠️');
  const itens = [], links = [];
  const iv = c.kind === 'dinheiro_iv';
  if (iv) {
    itens.push('🛫🛬 Ida e volta em dinheiro' + (c.normal ? ' (normal: R$ ' + nf(c.normal) + ')' : ''));
    const r = (c.links || []).find((x) => x.u); if (r) links.push(['Ver oferta', r.u]);
  } else if (c.kind === 'milhas_iv') {
    c.legs.forEach((l, i) => itens.push((i ? '🛬 Volta ' : '🛫 Ida ') + dm(l.date) + ' · ' + descTrecho(l)));
    const l0 = c.legs[0], r = (c.links || []).find((x) => x.u);
    links.push(['Ida e volta', (r && r.u) || linkTrecho(l0)]);
  } else {
    c.legs.forEach((l, i) => { itens.push((i ? '🛬 Volta ' : '🛫 Ida ') + dm(l.date) + ' · ' + descTrecho(l)); links.push([i ? 'Volta' : 'Ida', linkTrecho(l)]); });
    itens.push('↔️ Dois bilhetes separados (cada trecho em uma oferta)');
  }
  return { cab: titulo(c), preco: 'R$ ' + nf(c.total), selo, datas: dm(c.ida) + (c.volta ? ' → ' + dm(c.volta) : ''), itens, links: links.filter((x) => x[1]), grupos: (c.grupos || []).map((g) => g.replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, '').replace(/#\d+.*?-\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 40)), nota: c.prime ? 'Oferta do grupo PRIME: só dá para comprar dentro do grupo.' : '' };
}
module.exports = { estruturar, titulo, nf, dm };
