// Gera um lote de ações do navegador para a conferência.  node verify-chunk.js <azul|smiles|latam> <início> <fim> <tabId>
const fs = require('fs');
const [pl, ini, fim, tab] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5]];
const plan = JSON.parse(fs.readFileSync('data/verify-plan.json', 'utf8'));
const tarefas = plan.tarefas.filter((t) => t.platform === pl);
const fatia = tarefas.slice(ini, fim);
const mini = (js) => js.replace(/\s*\n\s*/g, ' ').trim();
const acoes = [];
fatia.forEach((t) => {
  acoes.push({ name: 'navigate', input: { url: t.url, tabId: tab } });
  if (pl === 'smiles') acoes.push({ name: 'computer', input: { action: 'wait', duration: 7, tabId: tab } });
  acoes.push({ name: 'javascript_tool', input: { action: 'javascript_exec', tabId: tab, text: mini(t.js) } });
});
for (const a of acoes) if (a.name === 'javascript_tool') { try { new Function('return (async()=>{' + a.input.text + '})')(); } catch (e) { console.error('SINTAXE INVÁLIDA', e.message); process.exit(1); } }
console.error('plataforma ' + pl + ': ' + tarefas.length + ' trechos no total; este lote: ' + ini + ' a ' + (ini + fatia.length) + '  [' + fatia.map((t) => t.from + '>' + t.to + ' ' + t.date.slice(5)).join(', ') + ']');
console.log(JSON.stringify(acoes));
