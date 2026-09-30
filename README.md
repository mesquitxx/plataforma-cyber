# Plataforma de Cibersegurança

Plataforma pessoal, local e offline, no estilo TryHackMe, para aprender pentest
(segurança ofensiva) do zero ao avançado — teoria + laboratórios isolados.

> **Status:** Fase 1 (Prova de fogo do laboratório). Ainda não há aplicação;
> o laboratório já sobe com `scripts/lab-up.sh` (ver
> [`docs/LABORATORIO.md`](docs/LABORATORIO.md)).

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
