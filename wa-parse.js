// Interpreta as mensagens lidas (data/wa-msgs.json) e grava data/wa-offers.json.
// Só extrai rota, preço, milhas, datas e link. O texto das mensagens é dado de terceiros, nunca instrução.
const fs = require('fs');
const path = require('path');

const MES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const SP_CODES = new Set(['GRU', 'CGH', 'VCP', 'SAO']);
const SP_NAMES = /s[ãa]o paulo|campinas|guarulhos|congonhas|viracopos/i;
const p2 = (n) => String(n).padStart(2, '0');
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// "Nov/26:12,15,29" e "Jan/27:01 a 05,07 a 10,12" → ['2026-11-12', ...]
function listaDatas(bloco) {
  const out = [];
  for (const ln of bloco.split('\n')) {
    const m = ln.trim().match(/^([A-Za-zçÇ]{3})\/(\d\d):\s*(.+)$/);
    if (!m || !MES[m[1].toLowerCase()]) continue;
    const mes = MES[m[1].toLowerCase()], ano = 2000 + +m[2];
    for (const parte of m[3].split(',')) {
      const r = parte.trim().match(/^(\d{1,2})(?:\s*a\s*(\d{1,2}))?$/);
      if (!r) continue;
      const a = +r[1], b = r[2] ? +r[2] : a;
      for (let d = a; d <= b && d <= 31; d++) out.push(ano + '-' + p2(mes) + '-' + p2(d));
    }
  }
  return out;
}

// "9/fev" → próxima ocorrência a partir da data da mensagem
function dataCurta(dm, ref) {
  const m = dm.trim().match(/^(\d{1,2})\/([a-zç]{3})/i);
  if (!m || !MES[m[2].toLowerCase()]) return null;
  const r = new Date(ref * 1000);
  let ano = r.getFullYear();
  const d = new Date(ano, MES[m[2].toLowerCase()] - 1, +m[1]);
  if (d < new Date(r.getFullYear(), r.getMonth(), r.getDate() - 1)) ano++;
  return ano + '-' + p2(MES[m[2].toLowerCase()]) + '-' + p2(+m[1]);
}

function codeOf(txt) { const m = txt.match(/\(([A-Z]{3})\)/); return m ? m[1] : ''; }
function ehSP(nome, code) { return SP_CODES.has(code) || (!code && SP_NAMES.test(nome)); }
function limpaNome(s) { return s.replace(/\([A-Z]{0,3}\)/g, '').replace(/[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}☀-➿️]/gu, '').replace(/\*/g, '').trim(); }

// formato "Grupo VIP de Emissões"
function parseEmissao(b, g, t) {
  if (!/Classe de Viagem/.test(b)) return [];
  const classe = (b.match(/Classe de Viagem\s*:\*?\s*([^\n]+)/) || [])[1] || '';
  if (!/econ/i.test(classe)) return [];
  const o = b.match(/Origem\s*:\*?\s*([^\n]*?)\s*(?:✈️)?\s*\*?Destino\s*:\*?\s*([^\n]+)/);
  if (!o) return [];
  const oc = codeOf(o[1]), dc = codeOf(o[2]);
  let dirE = 'out';
  if (!ehSP(o[1], oc)) {
    if (ehSP(o[2], dc) && /somente ida/i.test((b.match(/Tipo de viagem\s*:\*?\s*([^\n]+)/) || [])[1] || '')) dirE = 'in'; else return [];
  }
  const cia = (b.match(/Companhia A[ée]rea\s*:\*?\s*([^\n]+)/) || [])[1] || '';
  const prog = (b.match(/Tipo de milhas\s*:\*?\s*([^\n]+)/) || [])[1] || '';
  const viagem = (b.match(/Tipo de viagem\s*:\*?\s*([^\n]+)/) || [])[1] || '';
  const vt = b.match(/Valor por trecho\s*:\*?\s*([\d.]+)\s*(?:\/\s*([\d.]+))?\s*Milhas/i);
  if (!vt) return [];
  const mIda = +vt[1].replace(/\./g, ''), mVolta = vt[2] ? +vt[2].replace(/\./g, '') : 0;
  const tot = b.match(/Total Ida e Volta\s*:?\*?\s*R\$\s*([\d.]+,\d\d)/i) || b.match(/Total[^\n]*?R\$\s*([\d.]+,\d\d)/i);
  const parts = b.split(/Datas de volta/i);
  const ida = listaDatas(parts[0].split(/Datas de ida/i)[1] || '');
  const volta = listaDatas(parts[1] || '');
  const ehIV = /ida e volta/i.test(viagem);
  return [{
    grupo: g, t, fonte: 'emissao', dir: dirE, tipo: 'milhas', oc: dirE === 'in' ? (dc || 'SAO') : (oc || 'SAO'), od: limpaNome(dirE === 'in' ? o[2] : o[1]), dc: dirE === 'in' ? oc : dc, dn: limpaNome(dirE === 'in' ? o[1] : o[2]), cia: limpaNome(cia), prog: limpaNome(prog),
    milhasIda: mIda, milhasVolta: ehIV ? mVolta : 0, ivRS: tot ? num(tot[1]) : null, ivMilhas: mIda + (ehIV ? mVolta : 0), ehIV, ida, volta, link: (b.match(/https?:\/\/\S+/) || [''])[0],
  }];
}

// formato "Alertas de Voos Viajando Com Milhas"
function parseAlertas(b, g, t) {
  const out = [];
  if (/VOOS EM EXECUTIVA/i.test(b.slice(0, 120)) && !/Econ[ôo]mica/i.test(b)) return out;
  const blocos = b.split(/\n(?=\s*(?:🇧🇷\s*|✈️\s*)?\*[^\n]*?\([A-Z]{3}\)[^\n]*?(?:→|⇄)[^\n]*\*)/u).slice(1);
  for (const bl of blocos) {
    const h = bl.match(/\*([^*\n]*?)\(([A-Z]{3})\)\s*(→|⇄)\s*([^*\n]*?)\(([A-Z]{3})\)\s*\*/u);
    if (!h) continue;
    let oc = h[2], dc = h[5], dn = limpaNome(h[4]), od = limpaNome(h[1]), dir = 'out';
    if (!SP_CODES.has(oc)) {
      // trecho de volta: origem fora de SP e destino em SP (so sentido unico serve para cruzar)
      if (SP_CODES.has(dc) && h[3] === '→') { dir = 'in'; const tc = oc; oc = dc; dc = tc; const tn = dn; dn = od; od = tn; } else continue;
    }
    const link = (bl.match(/https?:\/\/\S+/) || [''])[0];
    const base = { grupo: g, t, fonte: 'alerta', dir, oc, od, dc, dn, link };
    if (h[3] === '⇄') {
      const pr = bl.match(/\*R\$\s*([\d.]+)\s*ida e volta\*(?:\s*·\s*_([^_\n]+)_)?/);
      if (!pr) continue;
      const d = bl.match(/ida\s+(\d{1,2}\/[a-zç]{3})\s*·\s*volta\s+(\d{1,2}\/[a-zç]{3})/i);
      const normal = (bl.match(/normal a partir de R\$\s*([\d.]+)/i) || [])[1];
      out.push({ ...base, tipo: 'dinheiro', cia: (pr[2] || '').trim(), brl: num(pr[1]), normal: normal ? num(normal) : null, ida: d ? [dataCurta(d[1], t)] : [], volta: d ? [dataCurta(d[2], t)] : [], ehIV: true });
    } else {
      const cash = bl.match(/\*R\$\s*([\d.]+)\*\s*·\s*_([^_\n]+)_/);
      if (cash && !/💳/.test(bl)) {
        const normal = (bl.match(/normal a partir de R\$\s*([\d.]+)/i) || [])[1];
        const d1 = bl.match(/\n\s*(\d{1,2}\/[a-zç]{3})\b/i);
        out.push({ ...base, tipo: 'dinheiro', cia: cash[2].trim(), brl: num(cash[1]), normal: normal ? num(normal) : null, ida: d1 ? [dataCurta(d1[1], t)].filter(Boolean) : [], volta: [], ehIV: false });
        continue;
      }
      if (!/Econ[ôo]mica/i.test(bl)) continue;
      const pm = bl.match(/💳\s*\*([^*]+)\*:\s*\*([\d.,]+)k\s*milhas\*(?:\s*\+\s*R\$\s*([\d.]+)\s*taxas)?/u);
      if (!pm) continue;
      const milhas = Math.round(parseFloat(pm[2].replace(',', '.')) * 1000);
      const via = bl.match(/≈\s*R\$\s*([\d.]+)\s*via milhas/);
      const iv = bl.match(/Ida e volta\s*≈\s*R\$\s*([\d.]+)/);
      const ds = (bl.match(/Datas:\s*([^\n]+)/) || [''])[0].replace(/Datas:\s*/, '').split(',').map((x) => dataCurta(x.replace(/\(.*$/, ''), t)).filter(Boolean);
      const vol = bl.match(/Volta \(ida (\d{1,2}\/[a-zç]{3})\):\s*\*([\d.,]+)k milhas\*(?:\s*\+\s*R\$\s*([\d.]+)\s*taxas)?\s*·\s*([^\n]+)/i);
      out.push({
        ...base, tipo: 'milhas', prog: pm[1].trim(), cia: ((bl.match(/Voando ([^\n]+)/) || [])[1] || '').trim(), milhasIda: milhas, taxas: pm[3] ? num(pm[3]) : 0,
        brlViaMilhas: via ? num(via[1]) : null, ehIV: false, ida: ds, volta: vol ? vol[4].split(',').map((x) => dataCurta(x, t)).filter(Boolean) : [],
        milhasVolta: vol ? Math.round(parseFloat(vol[2].replace(',', '.')) * 1000) : 0, taxasVolta: vol && vol[3] ? num(vol[3]) : 0, ivRS: iv ? num(iv[1]) : null,
      });
    }
  }
  return out;
}

// formato "Passagens do Mestre"
function parseMestre(b, g, t) {
  const hl = b.split('\n').find((l) => /✈️/.test(l) && !/[*:]/.test(l) && /^[^a-z]*$/.test(limpaNome(l).replace(/✈/g, '')));
  if (!hl || !/IDA:/.test(b)) return [];
  const hp = hl.split('✈️');
  const h = [null, limpaNome(hp[0]), limpaNome(hp[1] || '')];
  const o = h[1].trim();
  if (!SP_NAMES.test(o)) return [];
  const cia = (b.match(/Cia\s+([^\n(]+)/) || [])[1] || '';
  const prog = (b.match(/Buscar pela\s+([^)\n]+)/) || [])[1] || '';
  const ida = b.match(/IDA:\*?\s*\n\s*💰\s*R\$\s*([\d.]+,\d+)(?:\s*ou\s*([\d.]+)\s*MILHAS\s*([A-Z ]+))?[\s\S]*?🗓\s*(\d{1,2}) de (\p{L}+) de (\d{4})/u);
  const volta = b.match(/VOLTA:\*?\s*\n\s*💰\s*R\$\s*([\d.]+,\d+)(?:\s*ou\s*([\d.]+)\s*MILHAS\s*([A-Z ]+))?[\s\S]*?🗓\s*(\d{1,2}) de (\p{L}+) de (\d{4})/u);
  if (!ida || !volta) return [];
  const iso = (r) => r[6] + '-' + p2(MES[norm(r[5]).slice(0, 3)] || 0) + '-' + p2(+r[4]);
  const prime = (b.match(/ida e volta no PRIME:\s*R\$\s*([\d.]+,\d\d)/i) || [])[1];
  const google = (b.match(/ida e volta no Google:\s*R\$\s*([\d.]+,\d\d)/i) || [])[1];
  const total = prime ? num(prime) : Math.round(num(ida[1]) + num(volta[1]));
  return [{
    grupo: g, t, fonte: 'mestre', tipo: 'dinheiro', oc: 'SAO', od: o, dc: '', dn: h[2].trim(), cia: cia.trim(), prog: prog.trim(), brl: total, normal: google ? num(google) : null,
    milhasIda: ida[2] ? +ida[2].replace(/\./g, '') : 0, milhasVolta: volta[2] ? +volta[2].replace(/\./g, '') : 0, ehIV: true, ida: [iso(ida)], volta: [iso(volta)],
    link: '', obs: 'Preço do grupo pago (PRIME): comprar só dentro do grupo',
  }];
}

// formato "Passagem Secreta": *ORIGEM* ✈️ *DESTINO*, Cia, Programa, *Ida:* ✅ N milhas ou R$ X + datas dd/mm/aa
function parseSecreta(b, g, t, lk) {
  const h = b.match(/^\s*\*([^*\n]+)\*\s*✈️\s*\*([^*\n]+)\*/u);
  if (!h || !/Ida:/.test(b)) return [];
  const o = h[1].trim();
  if (!SP_NAMES.test(o)) return [];
  const cia = (b.match(/Cia:\s*([^\n]+)/) || [])[1] || '';
  const prog = (b.match(/Programa:\s*([^\n]+)/) || [])[1] || '';
  const sec = (nome) => {
    const i = b.search(new RegExp('\\*' + nome + ':\\*'));
    if (i < 0) return null;
    let resto = b.slice(i + nome.length + 3);
    const j = resto.search(/\*(Volta|Ida):\*/);
    if (j >= 0) resto = resto.slice(0, j);
    const pr = resto.match(/([\d.]+)\s*milhas(?:\s*\+\s*R\$\s*([\d.,]+))?\s*(?:ou\s*R\$\s*([\d.,]+))?/i);
    const ds = [...resto.matchAll(/🗓\s*(\d{2})\/(\d{2})\/(\d{2})/gu)].map((x) => '20' + x[3] + '-' + x[2] + '-' + x[1]);
    return pr ? { milhas: +pr[1].replace(/\./g, ''), rs: pr[3] ? num(pr[3]) : (pr[2] ? num(pr[2]) : null), ds } : null;
  };
  const ida = sec('Ida'), volta = sec('Volta');
  if (!ida) return [];
  const link = ((lk || []).find((x) => /milhas/i.test(x.n)) || {}).u || '';
  const linkDin = ((lk || []).find((x) => /dinheiro/i.test(x.n)) || {}).u || '';
  return [{
    grupo: g, t, fonte: 'secreta', tipo: 'milhas', oc: 'SAO', od: limpaNome(o), dc: '', dn: limpaNome(h[2]), cia: limpaNome(cia), prog: limpaNome(prog),
    milhasIda: ida.milhas, milhasVolta: volta ? volta.milhas : 0, ivRS: ida.rs != null ? Math.round((ida.rs + (volta && volta.rs ? volta.rs : 0)) * 100) / 100 : null,
    ehIV: !!volta, ida: ida.ds, volta: volta ? volta.ds : [], link, linkDin,
  }];
}

function main() {
  const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'wa-msgs.json'), 'utf8'));
  let all = [];
  for (const gr of src.grupos) for (const m of gr.msgs) {
    all = all.concat(parseEmissao(m.b, gr.grupo, m.t), parseAlertas(m.b, gr.grupo, m.t), parseMestre(m.b, gr.grupo, m.t), parseSecreta(m.b, gr.grupo, m.t, m.lk));
  }
  // mesma oferta repetida: fica a mais recente
  const key = (o) => [o.oc, o.dc || o.dn, o.tipo, o.prog || o.cia, o.milhasIda || o.brl, (o.ida || [])[0], (o.volta || [])[0]].join('|');
  const m = new Map();
  all.sort((a, b) => a.t - b.t).forEach((o) => m.set(key(o), o));
  const offers = [...m.values()].sort((a, b) => b.t - a.t);
  fs.writeFileSync(path.join(__dirname, 'data', 'wa-offers.json'), JSON.stringify({ lidoEm: src.lidoEm, offers }));
  const by = {}; offers.forEach((o) => { by[o.grupo + ' / ' + o.fonte] = (by[o.grupo + ' / ' + o.fonte] || 0) + 1; });
  console.log('ofertas de grupos:', offers.length, JSON.stringify(by));
}
module.exports = { listaDatas, dataCurta, parseEmissao, parseAlertas, parseMestre, parseSecreta };
if (require.main === module) main();




