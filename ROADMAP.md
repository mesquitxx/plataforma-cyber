# ROADMAP — Plataforma de Cibersegurança

Este roteiro descreve as **12 fases de construção** da plataforma (engenharia).
Não confundir com as **9 trilhas** do currículo (conteúdo de estudo), descritas
em [`docs/CURRICULO.md`](docs/CURRICULO.md).

- **Fases (0 a 11):** etapas de desenvolvimento do software (eram 11, de 0 a
  10, até a Fase 8 de endurecimento ser inserida; as fases de conteúdo foram
  renumeradas para 9–11).
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

## Fase 7 — Expansão do catálogo de alvos ✅
**Entrega:** toda a infraestrutura de labs de alvo desta expansão, pronta para
as fases de conteúdo; nenhum módulo MDX novo. (Reescopo aprovado pelo MESQUITA:
antes esta fase era "Primeiras trilhas de conteúdo"; os labs que estavam
espalhados entre as fases 7 e 8 foram concentrados aqui, e as fases seguintes
passam a focar **só o conteúdo MDX**, usando labs já prontos.)
- **OWASP Juice Shop** (`juice-shop`) — alvo web moderno (Node.js).
- **OWASP WebGoat** (`webgoat`) — aulas guiadas de falhas web em Java.
- **Vulhub** (`vulhub`) — alvo com uma CVE real. **Provisório:** Apache 2.4.49
  (CVE-2021-41773), o candidato mais leve e didático; a CVE final é decisão do
  MESQUITA (três candidatos em [`docs/CURRICULO.md`](docs/CURRICULO.md)).
- **Rede de alvos** (`rede-de-alvos`) — DVWA + Juice Shop na mesma rede interna
  para o nmap e a enumeração (opção 3a, sem pivoting dedicado por ora).
- **Active Directory — decisão:** **adiar** (opção C). A Trilha 7 segue como
  teoria + walkthrough guiado, como já decidido na Fase 0; nenhum lab de AD é
  construído, para respeitar os 16 GB. Comparação das opções (GOAD-Mini, VM de
  domínio único e adiar) registrada em [`docs/LABORATORIO.md`](docs/LABORATORIO.md).
- Cada lab ligado aos seus módulos no catálogo (`lib/labs/catalog.ts`) e no
  registro fechado (`scripts/lab-common.sh`); `scripts/lab.sh verify` estendido
  aos novos alvos; medições de RAM feitas após o `pull` (terminal).
- **Pendente:** a validação do isolamento e a RAM dos labs novos dependem do
  `pull` das imagens (internet, terminal). O `scripts/audit.sh` da Fase 8 os
  marca como PENDENTE até lá.

## Fase 8 — Endurecimento e polimento ✅
**Entrega:** o projeto auditado, com backup, rotina de disco e acabamento.
(Fase inserida a pedido do MESQUITA; antes, estes itens estavam no fim da
antiga Fase 10. Decisões D0–D5 e trocas T8–T10 em
[`docs/LABORATORIO.md`](docs/LABORATORIO.md) e
[`docs/MANUTENCAO.md`](docs/MANUTENCAO.md).)
- **Auditoria do isolamento** (`scripts/audit.sh`): host/WSL (todas as portas
  em escuta, daemon Docker só por socket Unix, permissões), Windows
  (`.wslconfig`, `portproxy`, portas só em loopback, sonda pela rede local) e
  todos os labs, um por vez. Verificação estendida a UDP, ICMP, IPv6, proxy no
  ambiente e à infraestrutura do Guacamole; "teste do teste" automatizado
  (`--self-test`). Relatórios datados em `docs/auditorias/`.
- **Hardening:** proxy nginx (`guac-proxy`) na frente do Guacamole, que passa
  a viver só em rede interna, sem internet (T8; resíduo T8b documentado e
  medido); `frame-ancestors` no Guacamole (T9, fecha a troca T2); cabeçalhos
  de segurança na plataforma (T10).
- **Resultado:** `kali` 123/123, `dvwa` 173/173, `linux-sandbox` 17/17, 0 FAIL
  ([relatório](docs/auditorias/2026-10-02-fase-8.md)); os labs da Fase 7 seguem
  pendentes do `pull`.
- **Backup e restauração** do SQLite (`npm run db:backup` / `db:restore`), com
  cópia no Windows, backup diário automático ao rodar `npm run dev`, e backup do
  `/home/kali` e do `labs/.env` (`scripts/lab.sh backup-home`).
- **Manutenção de disco:** `scripts/disk-cleanup.sh` (WSL/Docker) e
  `scripts/windows/compact-wsl.ps1` (VHDX esparso ou compactação manual).
- **Acabamento:** telas de erro e carregamento, títulos de página, acessibilidade
  e teste automático de consistência dos documentos.

## Fase 9 — Conteúdo: Trilhas 0–2
**Entrega:** Trilhas 0–2 escritas em MDX, com os labs já prontos.
- Trilha 0 (Pré-Segurança), Trilha 1 (Fundamentos e Ética) e Trilha 2 (Kit do
  Pentester, agora com OSINT e engenharia social).
- Labs usados: `linux-sandbox`, `kali`, `dvwa`, `rede-de-alvos` e `juice-shop`.
- Andamento: 0.1 "Como usar esta plataforma" (sem lab; duas missões de
  reconhecimento e verificação do isolamento), 0.2 "Redes TCP/IP na prática"
  (sem lab; inspeção do próprio WSL, cálculo de escopo em CIDR e decodificação
  de um pacote real capturado no lab `dvwa`) e 0.3 (piloto da Fase 4) escritos.

## Fase 10 — Conteúdo: Trilhas 3–5
**Entrega:** Trilhas 3–5 escritas em MDX, com os labs já prontos.
- Trilha 3 (Criptografia): `kali` sem alvo e `juice-shop` (JWT).
- Trilha 4 (Hacking Web / OWASP Top 10 e APIs): `dvwa`, `juice-shop`, `webgoat`
  e o alvo de APIs/GraphQL (candidato DVGA, decidido nesta fase se necessário).
- Trilha 5 (Redes e Serviços): `vulhub`, Metasploit, CVEs reais (incluindo a
  escolha da CVE final do lab `vulhub`).

## Fase 11 — Conteúdo: Trilhas 6–8 e consolidação
**Entrega:** Trilhas 6–8 e o fechamento do projeto.
- Trilha 6 (Escalação de Privilégios e pós-exploração): lab Linux em contêiner
  (definido aqui, com o conteúdo); Windows como teoria + walkthrough guiado.
- Trilha 7 (Active Directory): conceitos + walkthrough guiado; sem lab local.
- Trilha 8 (Consolidação): máquinas estilo CTF (boot2root, definido aqui) e
  relatório de pentest.
- Testes de interface com Playwright.
- Repetir a auditoria (`scripts/audit.sh`) e o passe de consistência com o
  conteúdo novo (o hardening, o backup e a rotina de disco vieram na Fase 8).
