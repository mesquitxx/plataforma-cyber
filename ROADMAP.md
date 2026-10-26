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
  de um pacote real capturado no lab `dvwa`), 0.3 (piloto da Fase 4), 0.4
  "Linux: processos, pacotes e edição" (sem lab; três missões no `linux-sandbox` do
  0.3 e walkthrough de `apt` e `vim` no WSL), 0.6 "Scripting: Bash" (sem lab; três
  missões de script no `linux-sandbox`, com dados fictícios gerados no próprio
  sandbox, e walkthrough do ShellCheck no WSL), 0.7 "Scripting: Python para segurança"
  (sem lab; um servidor de treino só com a stdlib, que escuta só em `127.0.0.1`, e três
  missões no WSL: o resumo de uma varredura XML fictícia do nmap com parser, um connect
  scan com banner grabbing e um cliente de protocolo de linha que aguenta mensagens
  partidas, e um coletor HTTP que faz login, pagina e respeita 429 e 500 sem mentir na
  contagem, e walkthrough de venv, `requests` e Bandit numa ferramenta suspeita) e 0.8 "Git e versionamento básico"
  (sem lab; três missões no WSL sobre repositórios fictícios gerados com autor e
  datas fixos, flags derivadas de hashes, e walkthroughs de merge, remote local e
  GitHub privado) escritos. Trilha 1: 1.1 "O que é pentest e tipos de teste" (sem lab;
  três missões no WSL sobre pedidos de clientes, o diário de um pentest e a saída de um
  scanner, todos fictícios, e walkthrough de relatórios públicos), 1.2 "Metodologia"
  (sem lab; três missões no WSL sobre a kill chain de uma invasão, a cobertura de um
  plano do OWASP WSTG e o mapeamento de uma cadeia para o MITRE ATT&CK, todos fictícios,
  e walkthrough das páginas do ATT&CK e do WSTG), 1.3 "Escopo, regras de engajamento e
  autorização" (sem lab; três missões no WSL sobre quem pode autorizar cada ativo, a
  auditoria de uma minuta de autorização e as decisões de parar, continuar ou pedir adendo
  durante um teste, todas fictícias, o `preflight.sh` que confere IPs e nomes contra o
  escopo, e walkthrough das regras públicas da AWS, do PTES e do NIST) e 1.4 "Lei brasileira
  e ética" (sem lab; três missões no WSL sobre o enquadramento de condutas no Código Penal,
  a auditoria LGPD de uma pasta de evidências com `grep` e os dilemas de um teste em
  andamento, todas fictícias, e walkthrough do texto compilado das leis no Planalto e das
  decisões da ANPD) e 1.5 "Documentação e anotações de pentest" (sem lab; três missões no
  WSL sobre a linha do tempo de um engajamento em UTC a partir de três fusos, a auditoria da
  cadeia de custódia de uma pasta de evidências versionada no Git e a triagem de notas de
  achado contra critérios de pronto, todas fictícias, e walkthrough do caderno-modelo com
  `script`/`scriptreplay` e Git) escritos. Trilha 2: 2.1 "Kali Linux e organização do
  ambiente" (lab `kali`; três missões no próprio Kali: o inventário da attack box e o serviço
  que ela expõe, a bancada de um engajamento fictício conferida por um hash das pastas e
  permissões, e a prova de dentro do isolamento pelos nomes que o Kali resolve) e 2.4
  "Reconhecimento e nmap" (lab `rede-de-alvos`; três missões contra o DVWA e o Juice Shop na
  `lab_net`, com a `desktop_net` fora do escopo: a descoberta de hosts, os serviços e versões,
  inclusive um que o nmap não reconhece, e os scripts NSE forçados contra a portrule, e
  walkthrough do rastro da varredura no log do Apache), 2.5 "Burp Suite" (lab `juice-shop`;
  três missões contra o OWASP Juice Shop: o proxy e o escopo lendo a API que a SPA chama
  sozinha, o Repeater enviando um feedback de 0 estrelas que a interface proíbe, e o Intruder
  descobrindo a senha fraca do admin por status e tamanho da resposta, e walkthrough do rastro
  do ataque nos logs do contêiner) e 2.6 "Wireshark e análise de tráfego" (lab `dvwa`; três
  missões sobre a captura, no Kali, do próprio login no DVWA: as versões que o servidor anuncia
  nos cabeçalhos, a senha e o token anti-CSRF no POST em texto claro, e o maior arquivo da
  página remontado pelo Export Objects e provado por SHA-256, e walkthrough do reuso do cookie de
  sessão capturado, no espírito do Firesheep) escritos.

## Fase 10 — Conteúdo: Trilhas 3–5
**Entrega:** Trilhas 3–5 escritas em MDX, com os labs já prontos.
- Trilha 3 (Criptografia): `kali` sem alvo e `juice-shop` (JWT).
- Trilha 4 (Hacking Web / OWASP Top 10 e APIs): `dvwa`, `juice-shop`, `webgoat`
  e o alvo de APIs/GraphQL (`dvga`, decidido e montado nesta fase, com o 4.9).
- Trilha 5 (Redes e Serviços): `vulhub`, Metasploit, CVEs reais (incluindo a
  escolha da CVE final do lab `vulhub`).
- Andamento: Trilha 3: 3.1 "Fundamentos de criptografia" (sem lab; três missões no WSL
  sobre artefatos fictícios: classificar encoding, hash e cifra num pentest e recuperar o que
  é recuperável, achar com HMAC os arquivos adulterados de uma release cujo `sha256sum -c`
  diz tudo OK, e quebrar com texto claro conhecido uma cifra XOR caseira, e walkthrough de
  `gpg --symmetric` detectando adulteração) escrito. 3.3 "Criptografia simétrica" (lab `kali`;
  três missões offline sobre arquivos de uma empresa fictícia em `/opt/lab-3.3`, sem nenhuma
  chave na imagem: ler o texto de uma imagem BMP cifrada em AES-ECB, decifrar um arquivo
  restrito por reuso de nonce no AES-CTR e forjar um token `role=admin` trocando bits do IV de
  um AES-CBC, e walkthrough de AES-GCM recusando a mesma forja e de um padding oracle contra
  um servidor de brinquedo com chave própria) escrito. 3.4 "Criptografia assimétrica e TLS"
  (lab `juice-shop`; duas missões de forja de JWT, por `alg:none` e por confusão de chaves
  RS256→HS256) escrito. 3.5 "Criptografia pós-quântica" (sem lab; três missões no WSL: fatorar
  uma chave RSA de brinquedo com a receita do Shor, o inventário quântico de uma empresa
  fictícia a partir de certificados, varreduras e políticas, e um handshake TLS 1.3 híbrido
  X25519MLKEM768 com certificado ML-DSA capturado num servidor só em `127.0.0.1`, e walkthrough
  de ML-KEM e ML-DSA com o `openssl` 3.5) escrito. Trilha 4: 4.1 "Como a web funciona por dentro"
  (sem lab; um servidor de treino em `127.0.0.1` que espelha o HTTP, com três missões no WSL:
  montar à mão com `curl`/`nc` um pedido que chega exatamente como o servidor exige, prever e
  conferir no pote de cookies do `curl` para onde cada `Set-Cookie` volta, e ver no navegador a
  same-origin policy e o CORS agindo — o que é enviado, o que leva cookie, o que exige preflight
  e o que o JavaScript lê —, e walkthrough da decodificação dupla do IIS num filtro de caminho)
  escrito.

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
