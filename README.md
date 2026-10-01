# Plataforma de Cibersegurança

Plataforma pessoal, local e offline, no estilo TryHackMe, para aprender pentest
(segurança ofensiva) do zero ao avançado — teoria + laboratórios isolados.

> **Status:** Fase 2 (Esqueleto da aplicação). O app Next.js roda em
> `http://127.0.0.1:3000` com layout, tema e banco SQLite, ainda sem conteúdo.
> O laboratório sobe com `scripts/lab-up.sh` (ver
> [`docs/LABORATORIO.md`](docs/LABORATORIO.md)).

## Rodando a aplicação
Requer Node.js 20.9+ (testado com Node 22) dentro do WSL.

```bash
npm install          # dependências
npm run db:migrate   # cria data/plataforma.db e aplica as migrações
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

## Documentação-mestre
- [`CLAUDE.md`](CLAUDE.md) — fonte de verdade do projeto (objetivo, stack, regras
  de isolamento, convenções).
- [`ROADMAP.md`](ROADMAP.md) — as 10 fases (0 a 9) de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.

## Segurança
Uso exclusivamente local. Todo laboratório escuta apenas em `127.0.0.1`, em rede
interna sem internet, com **um laboratório ativo por vez**. Alvos vêm somente de
projetos vulneráveis-por-design consagrados (DVWA, Juice Shop, WebGoat, Vulhub).
Ver [`CLAUDE.md`](CLAUDE.md) para as regras completas.

O app web segue as mesmas regras: escuta só em `127.0.0.1:3000`, recusa (403)
requisições com cabeçalho `Host` estranho, usa fontes locais e não envia
telemetria. As únicas conexões externas são as do `npm install`.

**Alerta conhecido do `npm audit`:** 4 avisos moderados vêm de uma versão
antiga do `esbuild` usada internamente pelo `drizzle-kit` (ferramenta de
desenvolvimento). A falha afeta o servidor de desenvolvimento do esbuild, que o
`drizzle-kit` não abre. O "fix" sugerido rebaixaria o `drizzle-kit` e o quebraria,
então não foi aplicado.
