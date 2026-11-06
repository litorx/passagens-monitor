// Gera template.html a partir da página do artefato (rodar só quando o visual mudar).
const fs = require('fs');
const src = process.argv[2];
let h = fs.readFileSync(src, 'utf8');

const iScript = h.indexOf('<script>');
let head = h.slice(0, h.indexOf('<div class="wrap">'));
let body = h.slice(h.indexOf('<div class="wrap">'), iScript);
let js = h.slice(iScript);

head = head.replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
const titleTag = head.match(/<title>[\s\S]*?<\/title>/)[0];
head = head.replace(titleTag, '');

js = js.replace(/var DATA = `[\s\S]*?`;/, 'var DATA = `__DATA__`;');
js = js.replace(/\/\* companhias[\s\S]*?\nvar CIA = \{[\s\S]*?\n\};\n/, '');
js = js.replace("var cia = CIA[x.o + x.brl] || '';", "var cia = x.cia || '';");
js = js.split("(CIA[x.o+x.brl]||'')").join("(x.cia||'')");
js = js.replace("cash.push({o:f[1],d:f[2],brl:+f[3],pairs:f[4].split(' ').filter(Boolean)});",
  "cash.push({o:f[1],d:f[2],brl:+f[3],pairs:f[4].split(' ').filter(Boolean),cia:f[5]||''});");

body = body.replace('Consulta em 06/11/2026 · Secret Flight Deals · classe econômica', '__SCANNED__');
body = body.replace('Só aparecem datas depois de 06/11/2026.', 'Só aparecem datas depois de __TODAY__.');
body = body.replace(/<li>O site corta a lista[\s\S]*?<\/li>/,
  '<li>A página é refeita todo dia por um robô. Ele fatia as buscas por mês para passar do corte de 100 resultados do site.</li>');

if (js.includes('CIA[')) throw new Error('sobrou referência a CIA');
const out = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
  '<meta name="robots" content="noindex,nofollow">\n' + titleTag + '\n' + head + '</head>\n<body>\n' + body + js + '\n</body>\n</html>\n';
fs.writeFileSync(__dirname + '/template.html', out);
console.log('template.html', out.length, 'bytes');
