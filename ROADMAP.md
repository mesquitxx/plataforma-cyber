# ROADMAP — Plataforma de Cibersegurança

Este roteiro descreve as **9 fases de construção** da plataforma (engenharia).
Não confundir com as **8 trilhas** do currículo (conteúdo de estudo), descritas
em [`docs/CURRICULO.md`](docs/CURRICULO.md).

- **Fases (0 a 8):** etapas de desenvolvimento do software.
- **Trilhas (0 a 7):** o material de aprendizado que a plataforma entrega.

Cada fase termina com um commit. Antes de mudanças grandes, um plano curto é
apresentado para aprovação (ver [`CLAUDE.md`](CLAUDE.md)).

---

## Fase 0 — Fundação & Documentação
**Entrega:** a documentação-mestre e o esqueleto do repositório.
- `CLAUDE.md` (fonte de verdade do projeto).
- `ROADMAP.md` (este arquivo).
- `docs/CURRICULO.md` (currículo detalhado, módulo a módulo).
- `docs/MODELO-DE-DADOS.md` (entidades e relações, nível de projeto).
- Estrutura de pastas base, vazia, pronta para a Fase 2.
- **Ainda não** há aplicação nem conteúdo real.

## Fase 1 — Esqueleto da aplicação
**Entrega:** a casca do app rodando localmente, sem conteúdo real.
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui inicializados.
- SQLite conectado (arquivo local, sem servidor).
- Layout base, tema e navegação vazia.
- Servidor de desenvolvimento escutando apenas em `127.0.0.1`.

## Fase 2 — Modelo de dados & ingestão de conteúdo
**Entrega:** o banco implementado e alimentado a partir dos arquivos MDX.
- Schema SQLite implementado conforme `docs/MODELO-DE-DADOS.md`.
- Pipeline que lê os módulos MDX de `content/` e popula trilhas/módulos/tarefas.
- Seed inicial e migrações versionadas.

## Fase 3 — Navegação do currículo & progresso
**Entrega:** a experiência de estudo utilizável.
- Telas de trilhas e módulos, leitura de conteúdo MDX.
- Marcação de progresso por módulo e por tarefa.
- Submissão e validação de flags.
- Glossário automático (termos técnicos explicados na primeira ocorrência).

## Fase 4 — Orquestração de laboratórios
**Entrega:** ligar/desligar alvos com segurança, um por vez.
- Integração com Docker Compose a partir da plataforma.
- Iniciar/parar **um laboratório ativo por vez** (regra de RAM).
- Regras de isolamento aplicadas e verificadas: bind em `127.0.0.1`, rede
  interna sem internet, alvos sem acesso ao host.
- Painel de status do lab (rodando/parado, portas locais).

## Fase 5 — Primeiras trilhas de conteúdo
**Entrega:** Trilhas 0–2 escritas com labs reais.
- Conteúdo MDX das Trilhas 0 (Pré-Segurança), 1 (Fundamentos e Ética) e 2
  (Kit do Pentester).
- Primeiros labs integrados: DVWA e Juice Shop.

## Fase 6 — Trilhas intermediárias
**Entrega:** Trilhas 3–4 escritas com labs.
- Trilha 3 (Hacking Web / OWASP Top 10): DVWA, Juice Shop, WebGoat.
- Trilha 4 (Redes e Serviços): Vulhub, Metasploit, CVEs reais.

## Fase 7 — Trilhas avançadas
**Entrega:** Trilhas 5–6.
- Trilha 5 (Escalação de Privilégios): labs Linux em contêiner; Windows como
  teoria + walkthrough guiado (respeitando a regra de 1 lab/16 GB).
- Trilha 6 (Active Directory): conceitos + walkthrough guiado; lab enxuto.

## Fase 8 — Consolidação & polimento
**Entrega:** Trilha 7 e o fechamento do projeto.
- Trilha 7 (Consolidação): máquinas estilo CTF e relatório de pentest.
- Testes de interface com Playwright.
- Hardening final das regras de isolamento.
- Backup e versionamento no GitHub privado.
