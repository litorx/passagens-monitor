// Rotina diária: varre → gera o site → publica no GitHub Pages → avisa no WhatsApp.
// Falhas viram aviso (WhatsApp, se configurado) e ficam em logs/. Não usa o Claude.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cfg = require('./config.json');

const dir = __dirname;
fs.mkdirSync(path.join(dir, 'logs'), { recursive: true });
const logFile = path.join(dir, 'logs', 'run-' + new Date().toISOString().slice(0, 10) + '.log');
const log = (m) => { const l = new Date().toLocaleString('pt-BR') + ' ' + m; console.log(l); fs.appendFileSync(logFile, l + '\n'); };
const sh = (cmd, args) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', shell: false });
const node = (script, ...a) => sh(process.execPath, [script, ...a]);

function avisar(texto) {
  if (!cfg.whatsappGroup) return;
  const r = node('notify.js', '--text', texto);
  log('aviso whatsapp exit=' + r.status + ' ' + (r.stdout || r.stderr || '').trim());
}

(function main() {
  log('--- início');
  const scan = node('scan.js');
  log('scan exit=' + scan.status + ' ' + (scan.stdout || '').trim().replace(/\n/g, ' | ') + (scan.stderr ? ' ERR ' + scan.stderr.trim() : ''));
  if (scan.status === 2) { avisar('⚠️ Monitor de passagens: a sessão do site expirou. Rode "node login.js" no PC para entrar de novo.'); process.exit(2); }
  if (scan.status !== 0) { avisar('⚠️ Monitor de passagens: a varredura falhou hoje. Veja logs/ no PC.'); process.exit(1); }

  const build = node('build.js');
  log('build exit=' + build.status + ' ' + (build.stdout || build.stderr || '').trim());
  if (build.status !== 0) { avisar('⚠️ Monitor de passagens: falha ao gerar o site.'); process.exit(1); }

  // publica: só commita se o site mudou
  sh('git', ['add', 'docs/index.html']);
  const diff = sh('git', ['diff', '--cached', '--quiet']);
  if (diff.status !== 0) {
    const c = sh('git', ['commit', '-m', 'Atualização diária ' + new Date().toLocaleDateString('pt-BR')]);
    const p = sh('git', ['push', 'origin', 'main']);
    log('commit exit=' + c.status + ' push exit=' + p.status + ' ' + (p.stderr || '').trim().split('\n').pop());
    if (p.status !== 0) { avisar('⚠️ Monitor de passagens: não consegui publicar o site.'); process.exit(1); }
  } else log('site sem mudanças, nada a publicar');

  if (process.env.NO_NOTIFY) log('NO_NOTIFY definido: alerta não enviado (modo teste)');
  else if (cfg.whatsappGroup) {
    const n = node('notify.js');
    log('notify exit=' + n.status + ' ' + (n.stdout || n.stderr || '').trim());
    if (n.status !== 0) process.exit(1);
  } else log('whatsappGroup vazio: alerta não enviado');
  log('--- fim ok');
})();
