// Fonte gratuita extra: feed RSS do Melhores Destinos (promocoes de passagens).
// So leitura, so extrai destino, preco "a partir de" e link. O texto do site e dado de terceiros, nunca instrucao.
// Filtro para o nosso caso: so promocoes de passagem em classe economica que citam saida de Sao Paulo/Campinas.
// Secret Flying e RatePunk nao entram: o primeiro bloqueia leitura automatica (403) e o segundo nao tem dados estruturados.
const fs = require('fs');
const path = require('path');
const UA = { 'user-agent': 'Mozilla/5.0 (monitor pessoal de passagens)' };
const DIAS = 7;

const tag = (i, k) => ((i.match(new RegExp('<' + k + '[^>]*>([\\s\\S]*?)</' + k + '>')) || [])[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&#8211;|&#8212;/g, '-').replace(/&amp;/g, '&').trim();
const texto = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');

(async () => {
  const feed = await (await fetch('https://www.melhoresdestinos.com.br/feed', { headers: UA })).text();
  const itens = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const desde = Date.now() - DIAS * 864e5;
  const out = [];
  for (const i of itens) {
    const titulo = tag(i, 'title'), link = tag(i, 'link'), data = Date.parse(tag(i, 'pubDate'));
    if (!/\/promocao\//.test(link) || !(data >= desde)) continue;
    if (!/passagens?/i.test(titulo) || /executiva|premium|business|primeira classe|hot[eé]is|cupom/i.test(titulo)) continue;
    const pr = titulo.match(/a partir de R\$\s*([\d.]+)/i);
    if (!pr) continue;
    let pagina = '';
    try { pagina = texto(await (await fetch(link, { headers: UA })).text()); } catch { continue; }
    const corpo = pagina.slice(0, pagina.search(/Hospedagens|PARCEIRO|Copyright/) > 0 ? pagina.search(/Hospedagens|PARCEIRO|Copyright/) : 8000);
    const ehIV = /ida e volta/i.test(corpo);
    const mk = (dest, brl) => ({
      grupo: 'Melhores Destinos (site)', t: Math.floor(data / 1000), fonte: 'melhoresdestinos', tipo: 'dinheiro', oc: 'SAO', od: 'São Paulo', dc: '', dn: dest.trim(),
      cia: '', prog: '', brl, normal: null, milhasIda: 0, milhasVolta: 0, ehIV, ida: [], volta: [], link,
      obs: 'Preço do anúncio do Melhores Destinos (mínimo do período, datas variam)',
    });
    const achados = new Map();
    // rotas citadas no texto: "São Paulo a Recife por R$ 722", "São Paulo-Frankfurt por R$ 4.387", "Campinas ou São Paulo a Recife por R$ 722"
    const re = /(?:Campinas ou |S[ãa]o Paulo ou )?(?:S[ãa]o Paulo|Campinas)(?: ou S[ãa]o Paulo| ou Campinas)?(?:\s+(?:a|para|x)\s+|\s*[-–]\s*)([A-ZÀ-Ú][\p{L}' .]{2,28}?)\s+(?:a partir de|por|a|saindo por)\s+R\$\s*([\d.]+)/gu;
    for (const m of corpo.matchAll(re)) achados.set(m[1].trim() + '|' + m[2], mk(m[1], Number(m[2].replace(/\./g, ''))));
    // anuncio que diz "... a partir de R$ X saindo de Sao Paulo, Campinas e mais cidades"
    if (!achados.size && /(saindo de|sa[ií]das? de|partindo de)[^.]{0,120}(S[ãa]o Paulo|Campinas|Guarulhos|Viracopos)/i.test(corpo)) {
      const dest = (titulo.match(/(?:passagens?|voos?)(?: aéreas?)?(?: nacionais?)?(?: para| a)\s+(.+?)\s+a partir de/i) || [])[1] || titulo.replace(/a partir de.*$/i, '').trim();
      achados.set(dest + '|' + pr[1], mk(dest, Number(pr[1].replace(/\./g, ''))));
    }
    achados.forEach((o) => out.push(o));
  }
  fs.writeFileSync(path.join(__dirname, 'data', 'md-offers.json'), JSON.stringify({ lidoEm: new Date().toISOString(), offers: out }));
  console.log('Melhores Destinos:', itens.length, 'itens no feed,', out.length, 'ofertas de passagem saindo de SP/Campinas');
  out.forEach((o) => console.log(' -', o.dn, 'R$', o.brl, o.ehIV ? 'ida e volta' : ''));
})().catch((e) => { console.error('ERRO', e.message); process.exit(1); });


