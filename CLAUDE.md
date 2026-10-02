# Plataforma de Cibersegurança — CLAUDE.md

Este arquivo é a fonte de verdade do projeto. Claude Code (e qualquer pessoa)
deve lê-lo antes de trabalhar no repositório.

## Objetivo
Plataforma pessoal no estilo TryHackMe para o MESQUITA aprender pentest
(segurança ofensiva) do zero ao avançado, unindo teoria e laboratórios práticos.

## Ambiente
- 100% local, sem nuvem.
- Windows com WSL2 (Ubuntu). Todo o projeto vive dentro do Ubuntu.
- 16 GB de RAM; 50 a 150 GB de disco em SSD.
- Regra de RAM: **um laboratório ativo por vez**.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
- SQLite como banco (arquivo local, sem servidor, sem login).
- Conteúdo dos módulos em MDX, versionado no repositório.
- Docker Compose orquestra os laboratórios.

## Regras de isolamento (segurança — inegociáveis)
- Tudo escuta apenas em `127.0.0.1`. Nada acessível por outros aparelhos na rede.
- A rede dos laboratórios é interna e sem internet; os alvos não enxergam o PC.
- Só a plataforma controla o Docker, e só localmente: sempre por
  `scripts/lab.sh`, com uma lista fechada de labs e ações (Fase 6). Nenhum
  contêiner monta `docker.sock` ou roda `privileged`, e a plataforma não roda
  em contêiner. Ligar um lab nunca usa a internet (`--pull never --no-build`);
  baixar imagens (`lab.sh pull`) e apagar o `/home/kali` (`lab.sh purge`) só
  pelo terminal.
- Alvos vêm de projetos vulneráveis-por-design consagrados (DVWA, Juice Shop,
  WebGoat, Vulhub). **Nunca** exploit ou malware escrito sob medida.
- **Sandboxes de prática** são permitidos: contêineres sem nenhuma
  vulnerabilidade e **sem rede** (`network_mode: none`), usuário sem
  privilégios, sem portas publicadas, só para treinar comandos (ex.:
  `labs/linux-sandbox`). Não são alvos de ataque e também contam na regra de
  um lab por vez.

## Currículo (foco ofensivo, do zero, 9 trilhas)
- **Trilha 0 — Pré-Segurança:** redes, terminal Linux, Windows básico, scripting.
- **Trilha 1 — Fundamentos e Ética:** metodologia, escopo, lei brasileira.
- **Trilha 2 — Kit do Pentester:** Kali, OSINT, engenharia social, nmap, Burp,
  Wireshark, netcat.
- **Trilha 3 — Criptografia:** encoding, hashes, cifras, TLS, pós-quântica.
- **Trilha 4 — Hacking Web:** OWASP Top 10 e APIs na prática.
- **Trilha 5 — Redes e Serviços:** enumeração, Metasploit, CVEs reais.
- **Trilha 6 — Escalação de Privilégios:** Linux, Windows e pós-exploração.
- **Trilha 7 — Active Directory:** conceitos e lab enxuto.
- **Trilha 8 — Consolidação:** máquinas estilo CTF e relatório de pentest.

A Trilha 3 e os módulos de OSINT, engenharia social, APIs e pós-exploração
entraram na Fase 6 (as trilhas seguintes foram renumeradas).

O detalhamento módulo a módulo está em [`docs/CURRICULO.md`](docs/CURRICULO.md).

## Padrão de módulo (requisito, não sugestão)
- **Antes de escrever qualquer módulo**, leia inteiro
  [`docs/PADRAO-DE-MODULO.md`](docs/PADRAO-DE-MODULO.md): 10 seções na ordem,
  extensões mínimas, verificação de fatos em fonte primária, lab executado de
  verdade e o checklist final. Um módulo que não cumpre o padrão não está pronto.
- Parta de [`docs/TEMPLATE-MODULO.mdx`](docs/TEMPLATE-MODULO.mdx). O módulo
  0.3 (`content/trilha-0/terminal-linux/`) é o exemplo de referência.

## Idioma e convenções
- **Interface e conteúdo em português.** Termos técnicos em inglês, explicados na
  primeira vez (a plataforma monta um Glossário automático).
- **Código em inglês:** nomes de variáveis, funções, arquivos e mensagens de
  commit sempre em inglês.

## Ferramentas
- Claude Code (dentro do WSL) faz o trabalho pesado: Docker, arquivos, testes.
- GitHub privado para versionamento e backup.
- Context7 (MCP) para documentação atualizada das bibliotecas.
- Playwright para o MESQUITA testar a interface local sozinho.

## Como trabalhar
- Antes de qualquer mudança grande, apresente um plano curto e espere aprovação.
- Trabalhe em passos pequenos e verificáveis; commit ao fim de cada fase.
- Priorize qualidade sobre velocidade. Tempo não é problema.

## Estrutura do app
- `app/` — rotas (App Router). `components/` — componentes; `components/ui/` é
  gerado pelo shadcn/ui. `lib/` — utilitários. `hooks/` — hooks React.
- `db/schema.ts` — schema Drizzle (fonte do banco). `db/migrations/` — SQL
  versionado, gerado por `npm run db:generate`; nunca editar à mão.
- `db/index.ts` — conexão do app (`server-only`). Scripts CLI usam
  `db/connection.ts`, porque `server-only` quebra fora do Next.
- `data/plataforma.db` — banco local, fora do git.
- `db/seed/` — currículo (Fase 3); `npm run db:seed` grava só conteúdo, nunca
  progresso. Slugs iguais aos dos MDX. `npm run progress:reset -- --yes` apaga
  todo o estado do usuário (só por linha de comando, nunca na interface).
- `db/queries/` — leitura e escrita do banco para as páginas (`server-only`);
  `db/queries/progress.ts` grava cada tentativa e atualiza tarefa e módulo
  numa única transação.
- Regras puras, testadas com `npm test` (executor nativo do Node via `tsx`):
  `lib/curriculum-state.ts` (estados dos módulos, "continuar"),
  `lib/progress-rules.ts` (conclusão de tarefas e módulos, nota do quiz),
  `lib/activity.ts` (dias de estudo e sequência), `lib/achievements.ts`
  (conquistas, derivadas do estado e nunca gravadas), `lib/dashboard.ts` e
  `lib/glossary.ts`.
- Rotas: `/trilhas`, `/trilhas/[trackSlug]`,
  `/trilhas/[trackSlug]/[moduleSlug]`, `/painel` (progresso e conquistas),
  `/glossario` e `/laboratorios`. As Server Actions do módulo ficam em `actions.ts` ao lado da
  página e validam toda entrada com zod.
- `content/trilha-N/<slug>/index.mdx` — módulos (front-matter YAML + MDX) e
  `img/` ao lado. A página do módulo importa o MDX (`@next/mdx`);
  `mdx-components.tsx` registra os componentes de `components/content/`
  (Callout, CodeBlock, Figure, FlagInput, GlossaryTerm, Hint/Solution, Quiz,
  ModuleGlossary). Quizzes são tarefas `type: quiz` no front-matter, ligadas
  por `<Quiz task="...">` e corrigidas no servidor: o gabarito nunca vai ao
  navegador. O seed continua dono de título, trilha, pré-requisitos e
  lab; o front-matter os repete e o `npm test` exige que batam.
- `lib/module-source.ts` — parser/validador do front-matter (usado pelo
  `npm test` e por `npm run content:ingest`). `lib/flag-hash.ts` — scrypt das
  flags. **Flags nunca em claro** no MDX, no banco ou no navegador: o
  front-matter guarda hash + salt (`npm run flag:hash`), a validação é uma
  Server Action, e só tentativas **erradas** guardam o valor digitado.
- `npm run db:migrate` desliga as *foreign keys* em volta do migrador: as
  migrações que recriam tabelas (drizzle-kit) disparariam `ON DELETE` em
  cascata dentro da transação.
- `proxy.ts` — recusa (403) requisições cujo `Host` não seja
  `127.0.0.1:3000`/`localhost:3000` (proteção contra DNS rebinding), cujo
  `X-Forwarded-Host` difira do `Host`, ou que não sejam GET/HEAD sem um
  `Origin` local (Fase 6).
- Labs (Fase 6) — `lib/labs/catalog.ts` é a fonte de verdade dos labs
  (disponíveis e previstos); o banco guarda só o slug. `scripts/lab.sh` é o
  único executor (registro fechado em `scripts/lab-common.sh`; o `npm test`
  confere que bate com o catálogo). `lib/labs/runner.ts` (`server-only`) o
  roda sem shell; `lib/labs/guacamole.ts` abre o Kali com o usuário restrito
  `plataforma`; `lib/labs/status.ts` e `jobs.ts` são puros e testados.
  Compose: `labs/base/` (Guacamole + Kali) + um arquivo por alvo
  (`labs/dvwa/`). Server Actions em `app/laboratorios/actions.ts`; status em
  `GET /api/labs/status` (só leitura). Interface: `/laboratorios`, painel do
  lab em cada módulo e lab ativo na barra superior. Detalhes e trocas de
  segurança em `docs/LABORATORIO.md`.
- Endurecimento (Fase 8) — `scripts/audit.sh` audita host, Windows, todos os
  labs e dependências; `scripts/lab-verify-isolation.sh` (o `verify`) cobre
  TCP/UDP/ICMP/IPv6 de todo contêiner e a tela de verdade
  (`scripts/guac-screen-probe.py`). A única porta de lab é do `guac-proxy`
  (nginx, `labs/base/guac-proxy/`), único contêiner em rede não interna, sem
  NAT; o Guacamole fica só em rede interna. `next.config.ts` envia os
  cabeçalhos anti-*clickjacking*. Trocas T8–T10 em `docs/LABORATORIO.md`.
- Backup (Fase 8) — `npm run db:backup`/`db:restore` (regras puras em
  `lib/backup.ts`; o migrador compartilhado fica em `db/migrate.ts`), `predev`
  faz o backup diário, `scripts/lab.sh backup-home`/`restore-home` cuidam do
  `/home/kali` e do `labs/.env`. Backups em `data/backups/` e em
  `Documentos\plataforma-cyber-backups\` no Windows. Disco:
  `scripts/disk-cleanup.sh` e `scripts/windows/compact-wsl.ps1`. Tudo em
  `docs/MANUTENCAO.md`.
- `lib/roadmap.ts` — fase e versão mostradas na barra lateral e a fase de
  conteúdo de cada trilha; `npm test` confere com `package.json` e
  `ROADMAP.md`, e `lib/docs-consistency.test.ts` confere links, contagens e
  documentos.
- Os scripts `dev`/`start` fixam `-H 127.0.0.1 -p 3000`; o padrão do Next.js é
  `0.0.0.0`, então **nunca** rode `next dev` sem esses parâmetros.
- Docs do Next.js da versão instalada: `node_modules/next/dist/docs/`. Consulte
  lá (ou no Context7) antes de usar APIs do Next.js; a versão 16 tem mudanças
  grandes (ex.: `middleware` virou `proxy`).
- `next.config.ts` usa `agentRules: false` para o `next dev` não escrever
  blocos próprios neste arquivo.

## Documentos do projeto
- [`ROADMAP.md`](ROADMAP.md) — as 12 fases (0 a 11) de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.
- [`docs/LABORATORIO.md`](docs/LABORATORIO.md) — como ligar, desligar e validar o
  isolamento dos labs (pela plataforma e pelo terminal) e as trocas de
  segurança aceitas.
- [`docs/MEDICOES-RAM.md`](docs/MEDICOES-RAM.md) — consumo real de RAM medido.
- [`docs/MANUTENCAO.md`](docs/MANUTENCAO.md) — backup e restauração do progresso
  e do `/home/kali`, limpeza de disco e compactação do disco do WSL.
- [`docs/PADRAO-DE-MODULO.md`](docs/PADRAO-DE-MODULO.md) — régua obrigatória de
  qualidade de todo módulo.
- [`docs/TEMPLATE-MODULO.mdx`](docs/TEMPLATE-MODULO.mdx) — modelo reutilizável
  de módulo, com o checklist final.
