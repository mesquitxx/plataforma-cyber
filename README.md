# Plataforma de Cibersegurança

Plataforma pessoal, local e offline, no estilo TryHackMe, para aprender pentest
(segurança ofensiva) do zero ao avançado — teoria + laboratórios isolados.

> **Status:** Fase 8 (Endurecimento e polimento) concluída; as próximas
> fases (9 a 11) escrevem o conteúdo das trilhas. O app roda em
> `http://127.0.0.1:3000` com homepage, 9 trilhas e 59 módulos navegáveis. Os
> módulos são escritos em MDX, com flags e quizzes corrigidos no servidor,
> dicas recolhidas e glossário. O progresso fica salvo no SQLite local; há um
> painel com conquistas (`/painel`) e o Glossário automático (`/glossario`).
> A plataforma liga, desliga e reseta os labs (um por vez) em
> `/laboratorios` e no painel de cada módulo, com o desktop do Kali embutido
> na página (ver [`docs/LABORATORIO.md`](docs/LABORATORIO.md)). O primeiro
> módulo completo é o 0.3, "Linux: primeiros passos no terminal", com o lab
> `linux-sandbox`. Desde a Fase 8: auditoria de isolamento reexecutável,
> backup diário do progresso (com cópia no Windows) e rotina de disco
> (ver [`docs/MANUTENCAO.md`](docs/MANUTENCAO.md)).

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
| `npm run dev` | Servidor de desenvolvimento em `127.0.0.1:3000` (antes, faz o backup diário do banco se o último tiver 24 h ou mais) |
| `npm run build` / `npm run start` | Build de produção e servidor em `127.0.0.1:3000` |
| `npm run lint` / `npm run typecheck` | ESLint e checagem de tipos TypeScript |
| `npm run db:generate` | Gera uma nova migração SQL a partir de `db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações pendentes ao banco local |
| `npm run db:check` | Relatório de saúde do banco (tabelas, *foreign keys*, migrações) |
| `npm run db:seed` | Carrega/atualiza o currículo (trilhas, módulos, pré-requisitos, labs); não mexe no progresso |
| `npm run content:ingest` | Valida e grava no banco os módulos de `content/` (tarefas, flags, quizzes, glossário), sem apagar progresso |
| `npm run db:backup` | Backup do banco agora (`-- --windows` copia para o Windows; `-- --list` lista) |
| `npm run db:restore -- <arquivo> --yes` | Restaura um backup (com a plataforma parada; salva o banco atual antes) |
| `npm run progress:reset -- --yes` | **Apaga todo o progresso** (módulos, tarefas, tentativas de flag e de quiz); mantém o conteúdo |
| `npm run flag:hash -- 'FLAG{...}'` | Gera o hash e o salt de uma flag para o front-matter do módulo |
| `scripts/lab.sh <comando> <lab>` | Executor dos labs: `up`, `down`, `switch`, `reset`, `verify`; só no terminal: `pull`, `rebuild`, `purge`, `backup-home`, `restore-home` (ver `docs/LABORATORIO.md`) |
| `scripts/audit.sh` | Auditoria completa do isolamento: host, Windows, todos os labs e `npm audit` (`--no-labs`, `--labs "..."`, `--self-test`) |
| `scripts/disk-cleanup.sh` | Mostra o que ocupa disco; `--apply`/`--deep` limpa Docker e caches sem tocar em volumes nem nas imagens dos labs |
| `scripts/windows/compact-wsl.ps1` | (PowerShell do Windows) devolve ao Windows o espaço liberado no WSL: disco esparso ou compactação (`-Check` só olha) |
| `npm run lab:sandbox` | Sobe o `linux-sandbox` e abre um shell nele (`-- reset`, `-- down`, `-- verify`, `-- rebuild`) |
| `npm test` | Testes das regras do currículo, do progresso, das conquistas, do glossário, do seed, do hash de flags, do catálogo e do status dos labs, do backup, da consistência dos documentos e de todos os módulos de `content/` |

## Documentação-mestre
- [`CLAUDE.md`](CLAUDE.md) — fonte de verdade do projeto (objetivo, stack, regras
  de isolamento, convenções).
- [`ROADMAP.md`](ROADMAP.md) — as 12 fases (0 a 11) de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.
- [`docs/LABORATORIO.md`](docs/LABORATORIO.md) — labs, isolamento, auditoria e
  trocas de segurança.
- [`docs/MANUTENCAO.md`](docs/MANUTENCAO.md) — backup, restauração e espaço em
  disco.
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
requisições com cabeçalho `Host` estranho e POSTs sem `Origin` local, não pode
ser embutido por outro site (`X-Frame-Options: DENY`), usa
fontes locais e não envia telemetria. Ele controla o Docker só por
`scripts/lab.sh`, com uma lista fechada de labs e ações, e nunca baixa nada ao
ligar um lab. As únicas conexões externas são as do `npm install` e as de
`scripts/lab.sh pull`, rodado à mão no terminal.

**`npm audit` (Fase 8):** nenhum alerta nas dependências de produção
(`npm audit --omit=dev`, conferido pelo `scripts/audit.sh`). Alertas restritos
a ferramentas de desenvolvimento, como o `esbuild` antigo usado internamente
pelo `drizzle-kit`, não chegam ao app que roda.
