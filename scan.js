// Varredura: coleta TODAS as ofertas (sem o corte de 100) e as datas, e grava data/raw.json.
// Códigos de saída: 0 ok · 2 sessão expirada (rode login.js de novo) · 1 erro.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

async function main() {
  const ctx = await chromium.launchPersistentContext(path.join(__dirname, 'profile'), {
    channel: 'chrome', headless: true,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(cfg.dashboard, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('article', { timeout: 30000 });
  } catch {
    console.error('SESSAO_EXPIRADA: a lista não apareceu. Rode: node login.js');
    await ctx.close();
    process.exit(2);
  }

  const raw = await page.evaluate(async (cfg) => {
    const warnings = [];
    const cards = new Map();
    const sel = [...document.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => /^\w{3}\/\d\d$/.test(o.value)));
    const months = [...sel.options].map((o) => o.value).filter(Boolean);

    const parse = (h) => {
      const m = h.match(/([A-Z]{3})→(.*?)([A-Z]{3})(Milhas|R\$)/);
      if (!m) return null;
      const mi = h.match(/a partir de ([\d.]+) milhas/);
      const pr = h.match(/Milhas(.*?) · Econômica/);
      const ca = h.match(/≈ R\$ ([\d.]+) em dinheiro \(milheiro a R\$ ([\d.,]+)\)/);
      const cash = h.match(/R\$(.*?) · Econômica\s*R\$ ([\d.]+),\d\d/);
      const isMiles = m[4] === 'Milhas';
      const pb = h.match(/Publicado em (\d+) de (\w+)/);
      const MES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
      let pub = null;
      if (pb && MES[pb[2].slice(0, 3).toLowerCase()] != null) { const hoje = new Date(); const d = new Date(hoje.getFullYear(), MES[pb[2].slice(0, 3).toLowerCase()], +pb[1]); if (d > hoje) d.setFullYear(d.getFullYear() - 1); pub = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
      return {
        oc: m[1], dc: m[3], dn: m[2].trim(), vt: isMiles ? 'miles' : 'cash', pub,
        miles: mi ? +mi[1].replace(/\./g, '') : null,
        prog: pr ? pr[1].trim() : '',
        brl: ca ? +ca[1].replace(/\./g, '') : (!isMiles && cash ? +cash[2].replace(/\./g, '') : null),
        mil: ca ? ca[2] : null,
        cia: !isMiles && cash ? cash[1].trim() : '',
      };
    };

    // listas de programas e companhias do próprio filtro do site, para fatiar mais fino quando bate em 100
    const selOf = (txt) => [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.textContent.trim() === txt));
    const programs = selOf('Smiles') ? [...selOf('Smiles').options].map((o) => o.value || o.textContent.trim()).filter((v) => v && v !== 'Programa') : [];
    const airlines = selOf('LATAM') ? [...selOf('LATAM').options].map((o) => o.value || o.textContent.trim()).filter((v) => v && v !== 'Companhia') : [];

    async function slice(params, kind, quiet) {
      const u = '/dashboard?' + new URLSearchParams({ cabin: 'economy', ...params });
      const h = await (await fetch(u, { credentials: 'include' })).text();
      const ids = [...h.matchAll(/article\\*",\\*"([0-9a-f-]{36})/g)].map((x) => x[1]);
      const arts = [...new DOMParser().parseFromString(h, 'text/html').querySelectorAll('article')];
      if (ids.length !== arts.length) warnings.push('ids != cards em ' + u);
      if (arts.length >= 100 && !quiet) warnings.push('CORTE de 100 em ' + u);
      arts.forEach((x, i) => {
        const id = ids[i];
        if (!id || cards.has(id)) return;
        const p = parse(x.textContent.replace(/\s+/g, ' ').trim());
        const a = x.querySelector('a[href^="http"]');
        if (p) cards.set(id, { id, kind, ...p, link: a ? a.getAttribute('href') : '' });
      });
      return arts.length;
    }

    // busca; se o site cortar em 100, refaz por programa e, se ainda cortar, por companhia
    async function sliceDeep(params, kind) {
      const n = await slice(params, kind, true);
      if (n < 100) return;
      let aindaCorta = 0;
      for (const p of programs) {
        const n2 = await slice({ ...params, loyalty_program: p }, kind, true);
        if (n2 >= 100) {
          for (const a of airlines) {
            const n3 = await slice({ ...params, loyalty_program: p, operating_airline: a }, kind, true);
            if (n3 >= 100) aindaCorta++;
          }
        }
      }
      if (aindaCorta) warnings.push('CORTE persistente (' + aindaCorta + ') em ' + JSON.stringify(params));
    }

    // 1) ida: cada origem x (milhas|dinheiro) x mês
    for (const o of cfg.origins)
      for (const vt of ['miles', 'cash'])
        for (const m of months) await sliceDeep({ value_type: vt, month: m, origin: o }, 'out');

    // 2) volta: para cada destino das idas em milhas, cada aeroporto de retorno
    const outs = [...cards.values()].filter((c) => c.kind === 'out' && c.vt === 'miles');
    const dests = [...new Set(outs.map((c) => c.dc))];
    for (const a of cfg.returnAirports)
      for (const d of dests) await sliceDeep({ value_type: 'miles', origin: d, destination: a }, 'in');

    // 3) datas (4 em paralelo)
    const all = [...cards.values()];
    const need = all.filter((c) => (c.kind === 'out' && cfg.origins.includes(c.oc)) || c.kind === 'in');
    const dates = {};
    let i = 0;
    const worker = async () => {
      while (i < need.length) {
        const id = need[i++].id;
        try {
          dates[id] = await (await fetch('/api/opportunity/' + id + '/dates', { credentials: 'include' })).json();
        } catch (e) { warnings.push('datas falhou ' + id); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { months, cards: all, dates, warnings };
  }, cfg);

  raw.scannedAt = new Date().toISOString();
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', 'raw.json'), JSON.stringify(raw));
  const by = {};
  raw.cards.forEach((c) => { const k = c.kind + ':' + c.vt; by[k] = (by[k] || 0) + 1; });
  console.log('OK cards', raw.cards.length, JSON.stringify(by), 'datas', Object.keys(raw.dates).length);
  console.log('avisos:', raw.warnings.length ? raw.warnings.join(' | ') : 'nenhum');
  await ctx.close();
}

main().catch((e) => { console.error('ERRO', e); process.exit(1); });
