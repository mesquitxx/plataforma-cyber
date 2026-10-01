# ROADMAP — Plataforma de Cibersegurança

Este roteiro descreve as **11 fases de construção** da plataforma (engenharia).
Não confundir com as **8 trilhas** do currículo (conteúdo de estudo), descritas
em [`docs/CURRICULO.md`](docs/CURRICULO.md).

- **Fases (0 a 10):** etapas de desenvolvimento do software.
- **Trilhas (0 a 7):** o material de aprendizado que a plataforma entrega.

Cada fase termina com um commit. Antes de mudanças grandes, um plano curto é
apresentado para aprovação (ver [`CLAUDE.md`](CLAUDE.md)).

---

## Fase 0 — Fundação & Documentação ✅
**Entrega:** a documentação-mestre e o esqueleto do repositório.
- `CLAUDE.md` (fonte de verdade do projeto).
- `ROADMAP.md` (este arquivo).
- `docs/CURRICULO.md` (currículo detalhado, módulo a módulo).
- `docs/MODELO-DE-DADOS.md` (entidades e relações, nível de projeto).
- Estrutura de pastas base, vazia, pronta para a Fase 2.
- **Ainda não** há aplicação nem conteúdo real.

## Fase 1 — Prova de fogo do laboratório ✅
**Entrega:** a pilha de laboratório validada nos 16 GB, ainda sem site.
- Docker Compose com Apache Guacamole (guacamole + guacd + PostgreSQL),
  attack box Kali com XFCE acessível pelo navegador e DVWA como alvo.
- Rede de laboratório interna, sem internet; alvo sem acesso ao host.
- Única porta publicada: Guacamole em `127.0.0.1`.
- Consumo real de RAM medido e documentado (ocioso, uso típico e pico).
- Roteiro de subir/descer o ambiente e de validar o isolamento, com script.
- Documentação: [`docs/LABORATORIO.md`](docs/LABORATORIO.md) e
  [`docs/MEDICOES-RAM.md`](docs/MEDICOES-RAM.md).

## Fase 2 — Esqueleto da aplicação ✅
**Entrega:** a casca do app rodando localmente, sem conteúdo real.
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui inicializados.
- SQLite conectado via Drizzle ORM + better-sqlite3 (arquivo local, sem servidor).
- Schema inicial completo e primeira migração versionada (antecipado da Fase 4).
- Layout base, tema escuro "laboratório" e navegação com páginas provisórias.
- Servidor (dev e produção) escutando apenas em `127.0.0.1:3000`, com checagem
  do cabeçalho `Host` contra DNS rebinding.

## Fase 3 — Homepage e navegação ✅
**Entrega:** a casca navegável do currículo, com dados de exemplo (seed).
- Seed do currículo real (8 trilhas, 49 módulos, pré-requisitos e labs) com
  *upsert* por slug — os mesmos slugs que os MDX usarão na Fase 4.
- Progresso de demonstração opcional (`npm run db:seed:demo`), descartável.
- Homepage: progresso geral, "continuar de onde parei" e as 8 trilhas.
- Página de trilha: módulos com estados concluído, em andamento, disponível e
  bloqueado (calculado pelos pré-requisitos; bloqueio suave, só com aviso).
- Página de módulo: área de conteúdo ainda com placeholder.

## Fase 4 — Ingestão de conteúdo
**Entrega:** o banco alimentado a partir dos arquivos MDX.
- Formato do front-matter MDX (pré-requisitos, tarefas, flags, glossário).
- Pipeline que lê os módulos MDX de `content/` e faz *upsert* por slug em
  trilhas/módulos/tarefas/flags/labs/glossário, sem apagar o estado do usuário.
- Hash das flags (algoritmo e normalização).
- Leitura do conteúdo MDX na página do módulo.
- Novas migrações, se o schema precisar evoluir.

## Fase 5 — Progresso, flags e glossário
**Entrega:** a experiência de estudo utilizável.
- Marcação de progresso por módulo e por tarefa (substitui o progresso de
  demonstração).
- Submissão e validação de flags.
- Glossário automático (termos técnicos explicados na primeira ocorrência).

## Fase 6 — Orquestração de laboratórios
**Entrega:** ligar/desligar alvos com segurança, um por vez.
- Integração com Docker Compose a partir da plataforma, reaproveitando a pilha
  validada na Fase 1 (separar base Guacamole + Kali de um arquivo por alvo).
- Iniciar/parar **um laboratório ativo por vez** (regra de RAM).
- Regras de isolamento aplicadas e verificadas: bind em `127.0.0.1`, rede
  interna sem internet, alvos sem acesso ao host.
- Painel de status do lab (rodando/parado, portas locais).
- Definir os labs que ainda não cabem em `LAB_TARGETS` (rede interna de alvos,
  contêiner Linux, máquinas boot2root), com migração do schema.

## Fase 7 — Primeiras trilhas de conteúdo
**Entrega:** Trilhas 0–2 escritas com labs reais.
- Conteúdo MDX das Trilhas 0 (Pré-Segurança), 1 (Fundamentos e Ética) e 2
  (Kit do Pentester).
- Primeiros labs integrados: DVWA e Juice Shop.

## Fase 8 — Trilhas intermediárias
**Entrega:** Trilhas 3–4 escritas com labs.
- Trilha 3 (Hacking Web / OWASP Top 10): DVWA, Juice Shop, WebGoat.
- Trilha 4 (Redes e Serviços): Vulhub, Metasploit, CVEs reais.

## Fase 9 — Trilhas avançadas
**Entrega:** Trilhas 5–6.
- Trilha 5 (Escalação de Privilégios): labs Linux em contêiner; Windows como
  teoria + walkthrough guiado (respeitando a regra de 1 lab/16 GB).
- Trilha 6 (Active Directory): conceitos + walkthrough guiado; lab enxuto.

## Fase 10 — Consolidação & polimento
**Entrega:** Trilha 7 e o fechamento do projeto.
- Trilha 7 (Consolidação): máquinas estilo CTF e relatório de pentest.
- Testes de interface com Playwright.
- Hardening final das regras de isolamento (incluindo restringir a saída de
  internet do contêiner web do Guacamole).
- Backup e versionamento no GitHub privado.
