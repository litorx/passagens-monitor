// Junta os resultados da conferência em data/verified.json.
//   Cada linha do arquivo de resultados: chave|status|milhas|voos|extra
//   status: ok | esgotado | login | bloqueado | nd
//   node verify-apply.js [arquivo]   (padrão: data/verify-results.txt)
const fs = require('fs');
const cfg = require('./config.json');
const arq = process.argv[2] || 'data/verify-results.txt';
const validade = ((cfg.conferencia && cfg.conferencia.validadeHoras) || 30) * 3600e3;
let atual = {};
try { atual = JSON.parse(fs.readFileSync('data/verified.json', 'utf8')); } catch {}
const agora = Date.now();
Object.keys(atual).forEach((k) => { if (agora - new Date(atual[k].at).getTime() > validade) delete atual[k]; });
const linhas = fs.readFileSync(arq, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => /^(azul|smiles|latam)\|/.test(l));
let n = 0;
linhas.forEach((l) => {
  const [p, de, para, data, status, mi, voos, extra] = l.split('|');
  if (!status) return;
  atual[[p, de, para, data].join('|')] = { status, mi: +mi || 0, n: +voos || 0, extra: extra || '', at: new Date().toISOString() };
  n++;
});
fs.writeFileSync('data/verified.json', JSON.stringify(atual, null, 1));
const por = {};
Object.entries(atual).forEach(([k, v]) => { const c = k.split('|')[0] + ':' + v.status; por[c] = (por[c] || 0) + 1; });
console.log('linhas lidas:', n, '| trechos conferidos válidos:', Object.keys(atual).length, JSON.stringify(por));
