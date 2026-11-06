// Abre o Chrome do robô (perfil separado em ./profile) para você entrar UMA vez no site.
// A sessão fica salva no perfil. O script nunca vê nem guarda sua senha.
const { chromium } = require('playwright-core');
const path = require('path');
const cfg = require('./config.json');

(async () => {
  const ctx = await chromium.launchPersistentContext(path.join(__dirname, 'profile'), {
    channel: 'chrome', headless: false, viewport: { width: 1200, height: 850 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(cfg.dashboard);
  console.log('Faça login na janela que abriu. Quando a lista de ofertas aparecer, eu detecto e fecho sozinho.');
  try {
    await page.waitForSelector('article', { timeout: 15 * 60 * 1000 });
    console.log('LOGIN OK: sessão salva em ./profile');
  } catch {
    console.log('Tempo esgotado sem detectar a lista de ofertas.');
    process.exitCode = 1;
  }
  await ctx.close();
})();
