# Plataforma de Cibersegurança

Plataforma pessoal, local e offline, no estilo TryHackMe, para aprender pentest
(segurança ofensiva) do zero ao avançado — teoria + laboratórios isolados.

> **Status:** Fase 6 (Orquestração de laboratórios). O app roda em
> `http://127.0.0.1:3000` com homepage, 9 trilhas e 59 módulos navegáveis. Os
> módulos são escritos em MDX, com flags e quizzes corrigidos no servidor,
> dicas recolhidas e glossário. O progresso fica salvo no SQLite local; há um
> painel com conquistas (`/painel`) e o Glossário automático (`/glossario`).
> A plataforma liga, desliga e reseta os labs (um por vez) em
> `/laboratorios` e no painel de cada módulo, com o desktop do Kali embutido
> na página (ver [`docs/LABORATORIO.md`](docs/LABORATORIO.md)). O primeiro
> módulo completo é o 0.3, "Linux: primeiros passos no terminal", com o lab
> `linux-sandbox`.

## Rodando a aplicação
Requer Node.js 20.9+ (testado com Node 22) dentro do WSL.

```bash
npm install          # dependências
npm run db:migrate   # cria data/plataforma.db e aplica as migrações
npm run db:seed      # carrega o currículo (trilhas, módulos, pré-requisitos, labs)
npm run content:ingest # lê os módulos MDX de content/ (tarefas, flags, quizzes, glossário)
npm run dev          # http://127.0.0.1:3000 (só local)
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `127.0.0.1:3000` |
| `npm run build` / `npm run start` | Build de produção e servidor em `127.0.0.1:3000` |
| `npm run lint` / `npm run typecheck` | ESLint e checagem de tipos TypeScript |
| `npm run db:generate` | Gera uma nova migração SQL a partir de `db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações pendentes ao banco local |
| `npm run db:check` | Relatório de saúde do banco (tabelas, *foreign keys*, migrações) |
| `npm run db:seed` | Carrega/atualiza o currículo (trilhas, módulos, pré-requisitos, labs); não mexe no progresso |
| `npm run content:ingest` | Valida e grava no banco os módulos de `content/` (tarefas, flags, quizzes, glossário), sem apagar progresso |
| `npm run progress:reset -- --yes` | **Apaga todo o progresso** (módulos, tarefas, tentativas de flag e de quiz); mantém o conteúdo |
| `npm run flag:hash -- 'FLAG{...}'` | Gera o hash e o salt de uma flag para o front-matter do módulo |
| `scripts/lab.sh <comando> <lab>` | Executor dos labs: `up`, `down`, `switch`, `reset`, `verify`; só no terminal: `pull`, `rebuild`, `purge` (ver `docs/LABORATORIO.md`) |
| `npm run lab:sandbox` | Sobe o `linux-sandbox` e abre um shell nele (`-- reset`, `-- down`, `-- verify`, `-- rebuild`) |
| `npm test` | Testes das regras do currículo, do progresso, das conquistas, do glossário, do seed, do hash de flags, do catálogo e do status dos labs, e de todos os módulos de `content/` |

## Documentação-mestre
- [`CLAUDE.md`](CLAUDE.md) — fonte de verdade do projeto (objetivo, stack, regras
  de isolamento, convenções).
- [`ROADMAP.md`](ROADMAP.md) — as 11 fases (0 a 10) de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.
- [`docs/PADRAO-DE-MODULO.md`](docs/PADRAO-DE-MODULO.md) — régua de qualidade de
  todo módulo; [`docs/TEMPLATE-MODULO.mdx`](docs/TEMPLATE-MODULO.mdx) — o modelo.

## Segurança
Uso exclusivamente local. Todo laboratório escuta apenas em `127.0.0.1`, em rede
interna sem internet, com **um laboratório ativo por vez**. Alvos vêm somente de
projetos vulneráveis-por-design consagrados (DVWA, Juice Shop, WebGoat, Vulhub);
sandboxes de prática (sem vulnerabilidade e sem rede, como o `linux-sandbox`) são
permitidos.
Ver [`CLAUDE.md`](CLAUDE.md) para as regras completas.

O app web segue as mesmas regras: escuta só em `127.0.0.1:3000`, recusa (403)
requisições com cabeçalho `Host` estranho e POSTs sem `Origin` local, usa
fontes locais e não envia telemetria. Ele controla o Docker só por
`scripts/lab.sh`, com uma lista fechada de labs e ações, e nunca baixa nada ao
ligar um lab. As únicas conexões externas são as do `npm install` e as de
`scripts/lab.sh pull`, rodado à mão no terminal.

**Alerta conhecido do `npm audit`:** 4 avisos moderados vêm de uma versão
antiga do `esbuild` usada internamente pelo `drizzle-kit` (ferramenta de
desenvolvimento). A falha afeta o servidor de desenvolvimento do esbuild, que o
`drizzle-kit` não abre. O "fix" sugerido rebaixaria o `drizzle-kit` e o quebraria,
então não foi aplicado.
