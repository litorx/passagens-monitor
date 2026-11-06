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
const ORIGEM = { VCP: 'Campinas', SAO: 'São Paulo' };
const CITY = { FLL: 'Fort Lauderdale', OPO: 'Porto', NVT: 'Navegantes', MAD: 'Madri', FLN: 'Florianópolis', LIS: 'Lisboa', MCZ: 'Maceió', BEL: 'Belém', POA: 'Porto Alegre', SSA: 'Salvador', MCO: 'Orlando', MCP: 'Macapá', IAD: 'Washington', REC: 'Recife', FOR: 'Fortaleza', JFK: 'Nova York', MIA: 'Miami', CUN: 'Cancún', EZE: 'Buenos Aires', PUJ: 'Punta Cana', LAX: 'Los Angeles', ADZ: 'San Andrés', FTE: 'El Calafate', IGU: 'Foz do Iguaçu', BSB: 'Brasília', BYO: 'Bonito', LAS: 'Las Vegas', VCE: 'Veneza', SDU: 'Rio de Janeiro', BPS: 'Porto Seguro' };
const nf = (n) => Number(n).toLocaleString('pt-BR');
const dm = (s) => { const p = s.split('-'); return p[p.length - 1] + '/' + p[p.length - 2]; };
const par = (s) => { const [a, b] = s.split('>'); return b ? dm(a) + ' → ' + dm(b) : dm(a); };
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function buildMessage(rows, scannedAt, siteUrl) {
  const d = new Date(scannedAt), p = (n) => String(n).padStart(2, '0');
  const linhas = ['✈️ *Top 5 passagens mais baratas* (econômica)', 'Atualizado em ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' às ' + p(d.getHours()) + ':' + p(d.getMinutes()), ''];
  rows.forEach((t, i) => {
    const dest = CITY[t.dc] || t.dc;
    const valor = t.miles != null ? 'R$ ' + nf(t.brl) + ' · ' + nf(t.miles) + ' milhas' : 'R$ ' + nf(t.brl);
    const como = t.tipo === 'Dinheiro' ? 'em dinheiro' + (t.desc ? ', ' + t.desc : '')
      : t.tipo.startsWith('Milhas (mesmo') ? t.desc.replace('/', ' · ') + ', mesmo bilhete'
      : t.desc.replace(/\//g, ' · ') + ', ida + volta separadas (volta por ' + t.volta + ')';
    linhas.push(NUM[i] + ' *' + dest + '* saindo de ' + (ORIGEM[t.oc] || t.oc));
    linhas.push('💰 ' + valor);
    linhas.push('📅 ' + par(t.datas) + ' · ' + como);
    const L = t.links || {};
    if (t.tipo === 'Dinheiro') linhas.push('🔗 Ver voo: ' + L.gf);
    else if (t.tipo.startsWith('Milhas (mesmo')) {
      linhas.push('🔗 Ver voo: ' + L.gf);
      if (L.prog) linhas.push('🎫 Resgatar em: ' + L.prog);
    } else {
      linhas.push('🔗 Ida: ' + L.gfIda);
      linhas.push('🔗 Volta: ' + L.gfVolta);
      const progs = [...new Set([L.progIda, L.progVolta].filter(Boolean))];
      if (progs.length) linhas.push('🎫 Resgatar em: ' + progs.join(' e '));
    }
    linhas.push('');
  });
  linhas.push('🔗 Todas as ofertas: ' + (siteUrl || '(site ainda não configurado)'));
  return linhas.join('\n');
}

function loadMessage() {
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rows.json'), 'utf8'));
  return buildMessage(r.top5, r.scannedAt, cfg.siteUrl);
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
