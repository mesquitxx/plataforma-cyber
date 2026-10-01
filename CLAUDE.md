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
- Só a plataforma controla o Docker, e só localmente.
- Alvos vêm de projetos vulneráveis-por-design consagrados (DVWA, Juice Shop,
  WebGoat, Vulhub). **Nunca** exploit ou malware escrito sob medida.
- **Sandboxes de prática** são permitidos: contêineres sem nenhuma
  vulnerabilidade e **sem rede** (`network_mode: none`), usuário sem
  privilégios, sem portas publicadas, só para treinar comandos (ex.:
  `labs/linux-sandbox`). Não são alvos de ataque e também contam na regra de
  um lab por vez.

## Currículo (foco ofensivo, do zero, 8 trilhas)
- **Trilha 0 — Pré-Segurança:** redes, terminal Linux, Windows básico, scripting.
- **Trilha 1 — Fundamentos e Ética:** metodologia, escopo, lei brasileira.
- **Trilha 2 — Kit do Pentester:** Kali, nmap, Burp, Wireshark, netcat.
- **Trilha 3 — Hacking Web:** OWASP Top 10 na prática.
- **Trilha 4 — Redes e Serviços:** enumeração, Metasploit, CVEs reais.
- **Trilha 5 — Escalação de Privilégios:** Linux e depois Windows.
- **Trilha 6 — Active Directory:** conceitos e lab enxuto.
- **Trilha 7 — Consolidação:** máquinas estilo CTF e relatório de pentest.

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
- `db/seed/` — currículo de exemplo (Fase 3) e progresso de demonstração;
  `npm run db:seed` (só conteúdo) e `npm run db:seed:demo` (substitui o
  progresso). Slugs iguais aos que os MDX usarão.
- `db/queries/` — leitura do banco para as páginas (`server-only`).
  `lib/curriculum-state.ts` — regras puras (estados dos módulos, progresso,
  "continuar"), testadas com `npm test` (executor nativo do Node via `tsx`).
- Rotas do currículo: `/trilhas`, `/trilhas/[trackSlug]`,
  `/trilhas/[trackSlug]/[moduleSlug]`.
- `content/trilha-N/<slug>/index.mdx` — módulos (front-matter YAML + MDX) e
  `img/` ao lado. A página do módulo importa o MDX (`@next/mdx`);
  `mdx-components.tsx` registra os componentes de `components/content/`
  (Callout, CodeBlock, Figure, FlagInput, GlossaryTerm, Hint/Solution, Quiz,
  ModuleGlossary). O seed continua dono de título, trilha, pré-requisitos e
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
  `127.0.0.1:3000`/`localhost:3000` (proteção contra DNS rebinding).
- Os scripts `dev`/`start` fixam `-H 127.0.0.1 -p 3000`; o padrão do Next.js é
  `0.0.0.0`, então **nunca** rode `next dev` sem esses parâmetros.
- Docs do Next.js da versão instalada: `node_modules/next/dist/docs/`. Consulte
  lá (ou no Context7) antes de usar APIs do Next.js; a versão 16 tem mudanças
  grandes (ex.: `middleware` virou `proxy`).
- `next.config.ts` usa `agentRules: false` para o `next dev` não escrever
  blocos próprios neste arquivo.

## Documentos do projeto
- [`ROADMAP.md`](ROADMAP.md) — as 11 fases (0 a 10) de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.
- [`docs/LABORATORIO.md`](docs/LABORATORIO.md) — como subir, descer e validar o
  isolamento do laboratório.
- [`docs/MEDICOES-RAM.md`](docs/MEDICOES-RAM.md) — consumo real de RAM medido.
- [`docs/PADRAO-DE-MODULO.md`](docs/PADRAO-DE-MODULO.md) — régua obrigatória de
  qualidade de todo módulo.
- [`docs/TEMPLATE-MODULO.mdx`](docs/TEMPLATE-MODULO.mdx) — modelo reutilizável
  de módulo, com o checklist final.
