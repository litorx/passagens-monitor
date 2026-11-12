// Alerta no WhatsApp com o top 5.
//   node notify.js --dry      mostra a mensagem, não envia
//   node notify.js --setup    abre o WhatsApp Web para você escanear o QR e lista seus grupos
//   node notify.js            envia o top 5 para o grupo de config.json (whatsappGroup)
//   node notify.js --text "x" envia um texto avulso (usado para avisar que a sessão expirou)
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WA_VERSION = process.env.WA_VERSION || '2.3000.1053430300-alpha';
const ORIGEM = { VCP: 'Campinas', SAO: 'São Paulo', GRU: 'São Paulo (Guarulhos)', CGH: 'São Paulo (Congonhas)' };
const CITY = { FLL: 'Fort Lauderdale', OPO: 'Porto', NVT: 'Navegantes', MAD: 'Madri', FLN: 'Florianópolis', LIS: 'Lisboa', MCZ: 'Maceió', BEL: 'Belém', POA: 'Porto Alegre', SSA: 'Salvador', MCO: 'Orlando', MCP: 'Macapá', IAD: 'Washington', REC: 'Recife', FOR: 'Fortaleza', JFK: 'Nova York', MIA: 'Miami', CUN: 'Cancún', EZE: 'Buenos Aires', PUJ: 'Punta Cana', LAX: 'Los Angeles', ADZ: 'San Andrés', FTE: 'El Calafate', IGU: 'Foz do Iguaçu', BSB: 'Brasília', BYO: 'Bonito', LAS: 'Las Vegas', VCE: 'Veneza', SDU: 'Rio de Janeiro', BPS: 'Porto Seguro' };
const nf = (n) => Number(n).toLocaleString('pt-BR');
const dm = (s) => { const p = s.split('-'); return p[p.length - 1] + '/' + p[p.length - 2]; };
const par = (s) => { const [a, b] = s.split('>'); return b ? dm(a) + ' → ' + dm(b) : dm(a); };
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function buildMessage(rows, scannedAt, siteUrl) {
  const d = new Date(scannedAt), p = (n) => String(n).padStart(2, '0');
  const linhas = ['✈️ *Top 5 passagens mais baratas* (econômica)', 'Atualizado em ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' às ' + p(d.getHours()) + ':' + p(d.getMinutes()), ''];
  rows.forEach((t, i) => {
    const dest = CITY[t.dc] || t.dn || t.dc;
    const valor = 'Ida e volta a partir de ' + (t.miles != null ? 'R$ ' + nf(t.brl) + ' · ' + nf(t.miles) + ' milhas' : 'R$ ' + nf(t.brl));
    const como = t.tipo === 'Dinheiro' ? 'em dinheiro' + (t.desc ? ', ' + t.desc : '')
      : t.tipo.startsWith('Milhas (mesmo') ? t.desc.replace('/', ' · ') + ', mesmo bilhete'
      : t.desc.replace(/\//g, ' · ') + ', ida + volta separadas (volta por ' + t.volta + ')';
    linhas.push(NUM[i] + ' *' + dest + '* saindo de ' + (ORIGEM[t.oc] || t.oc));
    linhas.push('💰 ' + valor);
    const conf = t.vs === 'ok' ? '✅ Conferido no programa hoje' : t.vs === 'parcial' ? '⚠️ Conferido só em parte' : (t.tipo === 'Dinheiro' ? '' : '⚠️ Ainda não conferido no programa');
    if (conf) linhas.push(conf);
    linhas.push('📅 ' + par(t.datas) + ' · ' + como);
    const L = t.links || {};
    if (t.tipo === 'Dinheiro') linhas.push('🔗 Ver voo: ' + L.gf);
    else if (t.tipo.startsWith('Milhas (mesmo')) {
      linhas.push('🔗 Ver voo: ' + L.gf);
      if (L.prog) linhas.push('🎫 Resgatar em: ' + L.prog);
    } else {
      const [da, db] = t.datas.split('>');
      linhas.push('🛫 *Ida* ' + t.oc + '→' + t.dc + ' · ' + dm(da));
      linhas.push('✈️ Voo: ' + L.gfIda);
      if (L.progIda) linhas.push('🎫 Resgatar: ' + L.progIda);
      linhas.push('🛬 *Volta* ' + t.dc + '→' + t.volta + ' · ' + dm(db));
      linhas.push('✈️ Voo: ' + L.gfVolta);
      if (L.progVolta) linhas.push('🎫 Resgatar: ' + L.progVolta);
    }
    linhas.push('');
  });
  linhas.push('ℹ️ Em milhas é a soma de ida + volta, cada trecho no preço mínimo (pode valer para outra data do calendário). Confira no programa antes de contar com o valor.');
  linhas.push('');
  linhas.push('🔗 Todas as ofertas: ' + (siteUrl || '(site ainda não configurado)'));
  return linhas.join('\n');
}

function buildMessageGrupos(r, siteUrl) {
  const d = new Date(r.lidoEm), p = (n) => String(n).padStart(2, '0');
  const L = ['✈️ *Ofertas dos grupos de passagens*', 'Lido em ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' às ' + p(d.getHours()) + ':' + p(d.getMinutes()), ''];
  const bloco = (titulo, lista) => {
    if (!lista || !lista.length) return;
    L.push(titulo);
    lista.forEach((t, i) => {
      const dest = CITY[t.dc] || t.dn || t.dc;
      L.push(NUM[i] + ' *' + dest + '* saindo de ' + (ORIGEM[t.oc] || t.oc));
      L.push('💰 R$ ' + nf(t.brl) + (t.mi ? ' · ' + nf(t.mi) + ' milhas' : '') + ' (' + t.como + ')');
      const datas = (t.ida || []).slice(0, 3).map((x) => dm(x)).join(', ');
      if (datas) L.push('📅 Ida: ' + datas + (t.volta && t.volta.length ? ' · Volta: ' + t.volta.slice(0, 3).map((x) => dm(x)).join(', ') : ''));
      L.push('👥 ' + t.g + (/mestre/i.test(t.g) ? ' (oferta PRIME)' : ''));
      if (t.link) L.push('🔗 ' + t.link);
      L.push('');
    });
  };
  bloco('🇧🇷 *Top 5 nacionais*', r.nacionais);
  bloco('🌎 *Top 5 internacionais*', r.internacionais);
  L.push('⚠️ Ofertas lidas dos grupos, ainda não conferidas nos programas. Confirme antes de contar com o valor.');
  L.push('');
  L.push('🔗 Todas as ofertas: ' + (siteUrl || ''));
  return L.join('\n');
}

function loadMessage() {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'grupos-top.json'), 'utf8'));
  return buildMessageGrupos(r, cfg.siteUrl);
}
async function client(headless) {
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: { executablePath: CHROME, headless, args: ['--no-sandbox'] },
    // fixa uma versão do WhatsApp Web que a biblioteca consegue injetar (cópias mantidas pelo wppconnect)
    webVersion: WA_VERSION,
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html' },
  });
  let precisaQR = false;
  c.on('qr', () => { precisaQR = true; if (headless) { console.error('SEM_SESSAO: rode node notify.js --setup'); process.exit(3); } else console.log('Escaneie o QR na janela do WhatsApp Web (Aparelhos conectados).'); });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout esperando o WhatsApp ficar pronto')), 5 * 60 * 1000);
    c.on('ready', () => { clearTimeout(t); res(); });
    c.on('auth_failure', (m) => rej(new Error('auth_failure ' + m)));
    c.initialize().catch(rej);
  });
  return c;
}

// getChats falha se chamado cedo demais depois do ready: espera e repete
async function chatsComRetry(c) {
  let ultimo;
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 15000 : 8000));
    try { const x = await c.getChats(); if (x && x.length) return x; } catch (e) { ultimo = e; }
  }
  throw ultimo || new Error('getChats vazio');
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--dry') { console.log(loadMessage()); return; }
  if (arg === '--setup') {
    const c = await client(false);
    const chats = await chatsComRetry(c);
    const grupos = chats.filter((x) => x.isGroup).map((x) => ({ nome: x.name, id: x.id._serialized }));
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'data', 'groups.json'), JSON.stringify(grupos, null, 2));
    console.log('SESSAO OK. ' + grupos.length + ' grupos:');
    grupos.forEach((g) => console.log(' - ' + g.nome));
    await c.destroy();
    return;
  }
  const texto = arg === '--text' ? process.argv[3] : loadMessage();
  if (!cfg.whatsappGroup) { console.error('whatsappGroup vazio em config.json'); process.exit(4); }
  const c = await client(true);
  const chats = await chatsComRetry(c);
  // compara sem emojis nem espaços; exige exatamente um grupo
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  const alvo = norm(cfg.whatsappGroup);
  const achados = chats.filter((x) => x.isGroup && norm(x.name) === alvo);
  if (achados.length !== 1) { console.error('Grupo "' + cfg.whatsappGroup + '": ' + achados.length + ' encontrados (precisa ser 1)'); await c.destroy(); process.exit(5); }
  const g = achados[0];
  await c.sendMessage(g.id._serialized, texto);
  console.log('ENVIADO para o grupo "' + g.name + '"');
  await new Promise((r) => setTimeout(r, 4000));
  await c.destroy();
}

module.exports = { buildMessage };
if (require.main === module) main().catch((e) => { console.error('ERRO', (e && (e.stack || e.message)) || String(e)); process.exit(1); });


