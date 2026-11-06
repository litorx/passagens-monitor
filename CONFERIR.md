# Conferir ofertas

A rotina completa está na skill `conferir-ofertas` (em `~/.claude/skills/conferir-ofertas/SKILL.md`). Resumo:

1. `node scan.js` (nova bateria)
2. `node verify-plan.js` (escolhe as melhores ofertas e monta os links e o código de leitura)
3. Pelo Chrome do usuário, uma plataforma por vez: Azul, Smiles, LATAM (a LATAM pede login, feito pelo usuário)
4. `node verify-apply.js` e `node build.js`
5. publicar `docs/index.html`

A Azul e a Smiles bloqueiam robôs, por isso a leitura não roda sozinha às 07:00.
