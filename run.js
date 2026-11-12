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
  // roda no logon do Windows: se hoje já deu certo, não repete (FORCE=1 ignora)
  const okFile = path.join(dir, 'logs', 'ok-' + new Date().toISOString().slice(0, 10));
  if (fs.existsSync(okFile) && !process.env.FORCE) { log('já rodou hoje com sucesso, nada a fazer'); process.exit(0); }
  log('--- início');
  // fonte única: grupos de WhatsApp (somente leitura). O agregador Secret Flight Deals foi removido do processo.
  const lr = node('wa-ler.js');
  log('wa-ler exit=' + lr.status + ' ' + (lr.stdout || lr.stderr || '').trim().split('\n').slice(-4).join(' | '));
  if (lr.status !== 0) { avisar('⚠️ Monitor de passagens: não consegui ler os grupos do WhatsApp hoje. Veja logs/ no PC.'); process.exit(1); }
  const pr = node('wa-parse.js'); log('wa-parse exit=' + pr.status + ' ' + (pr.stdout || pr.stderr || '').trim());
  const md = node('md-ler.js'); log('md-ler exit=' + md.status + ' ' + (md.stdout || md.stderr || '').trim().split('\n')[0]); // fonte gratuita extra, falha nao derruba o resto
  const wb = node('wa-build.js'); log('wa-build exit=' + wb.status + ' ' + (wb.stdout || wb.stderr || '').trim());
  if (pr.status !== 0 || wb.status !== 0) { avisar('⚠️ Monitor de passagens: falha ao gerar o site.'); process.exit(1); }

  // publica: só commita se o site mudou
  sh('git', ['add', 'docs/index.html', 'docs/grupos.html']);
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
  fs.writeFileSync(okFile, new Date().toISOString());
  log('--- fim ok');
})();

