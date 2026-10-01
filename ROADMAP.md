# ROADMAP — Plataforma de Cibersegurança

Este roteiro descreve as **11 fases de construção** da plataforma (engenharia).
Não confundir com as **9 trilhas** do currículo (conteúdo de estudo), descritas
em [`docs/CURRICULO.md`](docs/CURRICULO.md).

- **Fases (0 a 10):** etapas de desenvolvimento do software.
- **Trilhas (0 a 8):** o material de aprendizado que a plataforma entrega
  (eram 8 trilhas, de 0 a 7, até a expansão aprovada na Fase 6).

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
- Seed do currículo real (8 trilhas, 49 módulos — 50 desde a Fase 4 —,
  pré-requisitos e labs) com
  *upsert* por slug — os mesmos slugs que os MDX usarão na Fase 4.
- Progresso de demonstração opcional (`db:seed:demo`), descartável (removido na Fase 5).
- Homepage: progresso geral, "continuar de onde parei" e as 8 trilhas.
- Página de trilha: módulos com estados concluído, em andamento, disponível e
  bloqueado (calculado pelos pré-requisitos; bloqueio suave, só com aviso).
- Página de módulo: área de conteúdo ainda com placeholder.

## Fase 4 — Motor de conteúdo ✅
**Entrega:** MDX com componentes interativos, o módulo-piloto e o template.
(Antes chamada "Ingestão de conteúdo"; ampliada na aprovação do plano.)
- MDX no App Router (`@next/mdx`), renderizado na página do módulo.
- Componentes de conteúdo: Quiz, FlagInput, CodeBlock, Callout, GlossaryTerm,
  Figure e dicas/soluções recolhidas.
- Front-matter dos módulos (pré-requisitos, tarefas, flags, glossário) e
  ingestão `npm run content:ingest`, com *upsert* por slug sem apagar estado.
- Hash das flags (scrypt) e **validação de flag** por Server Action, com
  registro das tentativas (adiantado da Fase 5).
- Lab `linux-sandbox` (contêiner de prática sem rede).
- Divisão do antigo 0.3 em dois módulos (currículo com 50 módulos).
- Módulo-piloto 0.3 "Linux: primeiros passos no terminal", seguindo
  [`docs/PADRAO-DE-MODULO.md`](docs/PADRAO-DE-MODULO.md).
- Modelo reutilizável [`docs/TEMPLATE-MODULO.mdx`](docs/TEMPLATE-MODULO.mdx).

## Fase 5 — Progresso e glossário ✅
**Entrega:** a experiência de estudo utilizável.
- Progresso por tarefa e por módulo, persistido no SQLite (substitui o
  progresso de demonstração; `npm run progress:reset -- --yes` zera tudo).
- Flag correta conclui a tarefa (hash scrypt, decidido na Fase 4); o módulo
  se conclui quando todas as tarefas estão concluídas.
- Quiz como tarefa `type: quiz` no front-matter, corrigido no servidor (o
  gabarito não vai ao navegador); aprovação padrão de 70%.
- Painel `/painel`: progresso geral e por trilha, flags, quizzes, sequência
  de dias de estudo, atividade recente e 18 conquistas derivadas do estado.
- Página do Glossário `/glossario`, montada dos termos marcados nos módulos,
  com o módulo que introduz cada termo e onde mais ele aparece.

## Fase 6 — Orquestração de laboratórios ✅
**Entrega:** a plataforma liga e desliga os labs com segurança, um por vez, e
mostra o desktop do Kali na página. Decisões e trocas de segurança (T1 a T5) em
[`docs/LABORATORIO.md`](docs/LABORATORIO.md).
- Compose separado em base (Guacamole + Kali, `labs/base/`) e um arquivo por
  alvo (`labs/dvwa/`), com os mesmos nomes de rede, bridge e volume da Fase 1.
- Executor único `scripts/lab.sh` (terminal e plataforma): lista fechada de
  labs, `flock`, um lab por vez, sem internet ao ligar, reset por lab que
  preserva o `/home/kali`; `pull`, `rebuild` e `purge` só no terminal.
- A plataforma controla o Docker só localmente: Server Actions validadas com
  zod, `proxy.ts` conferindo `Host`, `X-Forwarded-Host` e `Origin`, rota de
  status só de leitura.
- Desktop do Kali embutido (iframe do Guacamole), logado por um usuário
  restrito (`plataforma`, só `READ` na conexão do Kali).
- Página `/laboratorios`, painel de lab em cada módulo e lab ativo na barra
  superior.
- Catálogo de labs em código (`lib/labs/catalog.ts`): `kali` (novo), `dvwa` e
  `linux-sandbox` disponíveis; `juice-shop`, `rede-de-alvos`, `webgoat`,
  `vulhub` e `dvga` previstos. Cada lab ligado aos seus módulos.
- Isolamento revalidado: `dvwa` 66/66, `kali` 43/43, `linux-sandbox` 17/17, com
  testes novos (porta da plataforma, `privileged`/`docker.sock`, usuário
  restrito).
- **Expansão do currículo** (aprovada pelo MESQUITA): nova Trilha 3
  Criptografia, módulos de OSINT, engenharia social, APIs/GraphQL e
  pós-exploração, trilhas 3+ renumeradas para 4–8 (59 módulos), na mesma
  migração (0003), com o progresso preservado.

## Fase 7 — Primeiras trilhas de conteúdo
**Entrega:** Trilhas 0–2 escritas com labs reais.
- Conteúdo MDX das Trilhas 0 (Pré-Segurança), 1 (Fundamentos e Ética) e 2
  (Kit do Pentester, agora com OSINT e engenharia social).
- Labs novos: Juice Shop e a rede de alvos (DVWA + Juice Shop) para o nmap.

## Fase 8 — Trilhas intermediárias
**Entrega:** Trilhas 3–5 escritas com labs.
- Trilha 3 (Criptografia): labs no Kali sem alvo e no Juice Shop (JWT).
- Trilha 4 (Hacking Web / OWASP Top 10 e APIs): DVWA, Juice Shop, WebGoat e o
  alvo de APIs/GraphQL (candidato: DVGA, decidido nesta fase).
- Trilha 5 (Redes e Serviços): Vulhub, Metasploit, CVEs reais.

## Fase 9 — Trilhas avançadas
**Entrega:** Trilhas 6–7.
- Trilha 6 (Escalação de Privilégios e pós-exploração): labs Linux em
  contêiner; Windows como teoria + walkthrough guiado (respeitando a regra de
  1 lab/16 GB).
- Trilha 7 (Active Directory): conceitos + walkthrough guiado; lab enxuto.

## Fase 10 — Consolidação & polimento
**Entrega:** Trilha 8 e o fechamento do projeto.
- Trilha 8 (Consolidação): máquinas estilo CTF e relatório de pentest.
- Testes de interface com Playwright.
- Hardening final das regras de isolamento (incluindo restringir a saída de
  internet do contêiner web do Guacamole e, se possível, `frame-ancestors` no
  Guacamole).
- Backup e versionamento no GitHub privado.
