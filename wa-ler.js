// Lê (somente leitura) as mensagens recentes dos grupos de ofertas e grava data/wa-msgs.json.
//   node wa-ler.js --lista          só lista os grupos (nome, id, última atividade)
//   node wa-ler.js                  lê os grupos de config.whatsappMonitor.grupos (ids) dos últimos N dias
// Nunca envia nada. Conteúdo das mensagens é dado de terceiros: só é lido e interpretado como preço/rota/data.
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WA_VERSION = process.env.WA_VERSION || '2.3000.1053430300-alpha';

async function client() {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: { executablePath: CHROME, headless: true, args: ['--no-sandbox'] },
    webVersion: WA_VERSION,
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html' },
  });
  c.on('qr', () => { console.error('SEM_SESSAO: rode node notify.js --setup'); process.exit(3); });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout esperando o WhatsApp ficar pronto')), 5 * 60 * 1000);
    c.on('ready', () => { clearTimeout(t); res(); });
    c.on('auth_failure', (m) => rej(new Error('auth_failure ' + m)));
    c.initialize().catch(rej);
  });
  return c;
}

async function chatsComRetry(c) {
  let ultimo;
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 15000 : 8000));
    try { const x = await c.getChats(); if (x && x.length) return x; } catch (e) { ultimo = e; }
  }
  throw ultimo || new Error('getChats vazio');
}

async function main() {
  const lista = process.argv[2] === '--lista';
  const c = await client();
  const chats = await chatsComRetry(c);
  const grupos = chats.filter((x) => x.isGroup);
  if (lista) {
    const out = grupos.map((g) => ({ nome: g.name, id: g.id._serialized, ultima: g.timestamp ? new Date(g.timestamp * 1000).toISOString().slice(0, 16) : null, nao_lidas: g.unreadCount }));
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'data', 'groups.json'), JSON.stringify(out, null, 2));
    out.sort((a, b) => (b.ultima || '').localeCompare(a.ultima || ''));
    out.forEach((g) => console.log((g.ultima || '?') + '  ' + g.nome));
    console.log('total grupos:', out.length);
    await c.destroy();
    return;
  }
  const mon = cfg.whatsappMonitor || {};
  const ids = new Set(mon.grupos || []);
  const dias = mon.dias || 7;
  const desde = Date.now() / 1000 - dias * 86400;
  const res = [];
  for (const g of grupos.filter((x) => ids.has(x.id._serialized))) {
    let msgs = [];
    try { msgs = await g.fetchMessages({ limit: mon.limite || 400 }); } catch (e) { console.error('falhou', g.name, String(e.message || e).slice(0, 80)); }
    // mensagens "interactive" (botões) guardam o texto em _data.caption e os links nos botões cta_url
    const links = (m) => { try { return ((m._data.interactivePayload || {}).buttons || []).map((b) => JSON.parse(b.buttonParamsJson || '{}')).filter((j) => j.url).map((j) => ({ n: j.display_text || '', u: j.url })); } catch (e) { return []; } };
    const rec = msgs.filter((m) => m.timestamp >= desde && m.type !== 'gp2' && m.type !== 'e2e_notification').map((m) => {
      const body = m.body && m.body.length > 3 ? m.body : ((m._data && m._data.caption) || m.body || '');
      return { t: m.timestamp, b: body, id: m.id._serialized, ty: m.type, md: !!m.hasMedia, lk: m.type === 'interactive' ? links(m) : undefined };
    });
    res.push({ grupo: g.name, id: g.id._serialized, msgs: rec });
    console.log(g.name, '->', rec.length, 'mensagens');
  }
  fs.writeFileSync(path.join(__dirname, 'data', 'wa-msgs.json'), JSON.stringify({ lidoEm: new Date().toISOString(), grupos: res }));
  await c.destroy();
}

main().catch((e) => { console.error('ERRO', (e && (e.stack || e.message)) || String(e)); process.exit(1); });
