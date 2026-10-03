# Currículo — Plataforma de Cibersegurança

Currículo de segurança ofensiva do zero ao avançado, organizado em **9 trilhas**
(Trilha 0 a Trilha 8). Cada trilha reúne módulos; cada módulo traz título,
pré-requisitos, objetivos de aprendizado e, quando houver, o laboratório (lab)
com o alvo usado.

## Convenções
- **Idioma:** conteúdo em português; termos técnicos em inglês, explicados na
  primeira ocorrência (alimentam o Glossário automático).
- **Alvos de lab:** apenas projetos vulneráveis-por-design consagrados —
  DVWA, OWASP Juice Shop, OWASP WebGoat, Vulhub. Nunca exploit/malware sob medida.
- **Sandboxes de prática:** contêineres sem nenhuma vulnerabilidade e sem rede
  (ex.: `linux-sandbox`), só para treinar comandos. São permitidos; não são
  alvos de ataque.
- **Isolamento:** todo lab escuta só em `127.0.0.1`, em rede interna sem internet,
  com **um laboratório ativo por vez** (ver [`../CLAUDE.md`](../CLAUDE.md)).
- **Labs:** o nome entre parênteses é o slug do catálogo de labs
  (`lib/labs/catalog.ts`). Labs marcados como **previstos** já estão no
  catálogo, mas só podem ser ligados na fase indicada. Detalhes em
  [`LABORATORIO.md`](LABORATORIO.md).
- **Padrão de qualidade:** todo módulo segue
  [`PADRAO-DE-MODULO.md`](PADRAO-DE-MODULO.md) (10 seções e checklist final) e
  parte do modelo [`TEMPLATE-MODULO.mdx`](TEMPLATE-MODULO.mdx).
- **Decisões de escopo (aprovadas na Fase 0):**
  - **PrivEsc Windows (6.4, 6.5):** teoria + walkthrough guiado, sem lab local
    pesado, para respeitar a regra de 1 lab/16 GB.
  - **Active Directory (Trilha 7):** conceitos + walkthrough guiado; lab enxuto.
- **Decisão da Fase 4:** o antigo "0.3 Terminal Linux essencial" foi dividido em
  0.3 (primeiros passos) e 0.4 (processos, pacotes e edição). Tudo que exigia o
  antigo 0.3 passou a exigir o 0.4, que por sua vez exige o 0.3.
- **Expansão da Fase 6 (aprovada pelo MESQUITA):**
  - Nova **Trilha 3 — Criptografia** (5 módulos), entre o Kit do Pentester e o
    Hacking Web. As trilhas seguintes foram renumeradas: Hacking Web = 4,
    Redes e Serviços = 5, Escalação de Privilégios = 6, Active Directory = 7,
    Consolidação = 8.
  - Quatro módulos novos: **2.2 OSINT** e **2.3 Engenharia social** (antes do
    nmap), **4.9 Segurança de APIs e GraphQL** (depois do OWASP básico) e
    **6.7 Pós-exploração e persistência** (fecha a Trilha 6).
  - Pré-requisitos são por slug: a renumeração não os quebrou e o progresso
    foi preservado (*upsert* por slug). O currículo tem agora **59 módulos**.
  - Os módulos novos entram sem corpo; o conteúdo é escrito nas fases de
    conteúdo, seguindo o padrão de módulo.
- **Labs decididos na Fase 6:** 2.1 usa o Kali sozinho (`kali`); 2.6
  (Wireshark) e 2.7 (netcat) usam o DVWA, com Kali e DVWA como as duas pontas,
  **sem** contêiner "parceiro" feito sob medida (que não seria alvo consagrado
  nem sandbox sem rede); o nmap (2.4) usa a `rede-de-alvos` (DVWA + Juice Shop).
  Os labs das trilhas 6 a 8 (contêiner Linux de PrivEsc, boot2root) são
  decididos na Fase 11, junto com o conteúdo.
- **Decisões da Fase 7 — Expansão do catálogo de alvos (MESQUITA):**
  - **Labs construídos e disponíveis:** `juice-shop`, `webgoat`, `vulhub`
    (provisório) e `rede-de-alvos`. Toda a infraestrutura de labs de alvo foi
    concentrada nesta fase; as fases seguintes focam só o conteúdo MDX.
  - **Rede de alvos (opção 3a):** DVWA + Juice Shop na mesma rede interna, sem
    um contêiner de *pivoting* dedicado por ora.
  - **Active Directory (opção C — adiar):** nenhum lab de AD é construído. A
    Trilha 7 segue como teoria + walkthrough guiado (como na Fase 0). A
    comparação das opções (GOAD-Mini, VM de domínio único, adiar) e o porquê
    estão em [`LABORATORIO.md`](LABORATORIO.md).
  - **Vulhub — CVE provisória e candidatos (decisão pendente do MESQUITA):** o
    lab `vulhub` já compila com a opção **mais leve e didática**; a escolha
    final fica para a Fase 5 de conteúdo (Trilha 5). Candidatos:
    1. **CVE-2021-41773 — Apache httpd 2.4.49** (*path traversal* → RCE).
       Imagem oficial `httpd:2.4.49` (~145 MB). Encaixa em **5.1** (enumeração
       do serviço/versão), **5.4** (reproduzir a CVE; exploração didática por
       `curl`) e **5.3** (há módulo no Metasploit). **← provisório atual.**
    2. **CVE-2017-7494 — Samba "SambaCry"** (RCE em SMB). Imagem maior
       (~300–400 MB). Encaixa em **5.2** (serviços SMB) e **5.3** (módulo
       `is_known_pipename` no Metasploit).
    3. **CVE-2017-5638 — Apache Struts2 S2-045** (RCE via header `Content-Type`).
       Imagem com Tomcat/JVM (~400–600 MB). Encaixa forte em **5.4** e **5.3**
       (módulo `struts2_code_exec_jakarta`); boa para **5.6** (ponta a ponta).

---

## Trilha 0 — Pré-Segurança
Base para quem começa do zero: como usar a plataforma, redes, terminais e
scripting. Sem labs de ataque; prática guiada no próprio ambiente.

### 0.1 — Como usar esta plataforma
- **Pré-requisitos:** nenhum.
- **Objetivos:** navegar trilhas e módulos; entender progresso, flags e o
  Glossário; conhecer as regras de isolamento, a regra de 1 lab por vez e o
  painel de laboratórios.
- **Lab:** não.

### 0.2 — Redes TCP/IP na prática
- **Pré-requisitos:** 0.1.
- **Objetivos:** modelo TCP/IP; endereços IP e sub-redes; portas; DNS; como uma
  requisição HTTP viaja da ponta ao servidor.
- **Lab:** não (exercícios guiados de inspeção).

### 0.3 — Linux: primeiros passos no terminal
- **Pré-requisitos:** 0.1.
- **Objetivos:** terminal, shell e prompt; anatomia de um comando e como pedir
  ajuda; sistema de arquivos e navegação; criar, copiar, mover e apagar;
  ler e procurar arquivos; pipes e redirecionamento; ler e alterar permissões.
- **Lab:** sim — **Sandbox Linux** (`linux-sandbox`, contêiner de prática sem rede).
- **Módulo-piloto** da Fase 4: referência de qualidade para os demais.

### 0.4 — Linux: processos, pacotes e edição
- **Pré-requisitos:** 0.3.
- **Objetivos:** processos (`ps`, `top`, sinais, `kill`, jobs); usuários e
  grupos; variáveis de ambiente e `PATH`; gerenciador de pacotes (`apt`);
  edição no terminal (`nano` e noções de `vim`).
- **Lab:** não (exercícios no `linux-sandbox` do 0.3 e no próprio WSL, sem lab novo).
- Criado na Fase 4, ao dividir o antigo "Terminal Linux essencial" em dois.

### 0.5 — Windows para quem vem do Linux
- **Pré-requisitos:** 0.4.
- **Objetivos:** conceitos de Windows (usuários, serviços, registro); `cmd` e
  noções de PowerShell; diferenças relevantes para pentest.
- **Lab:** não.

### 0.6 — Scripting: Bash
- **Pré-requisitos:** 0.4.
- **Objetivos:** variáveis, condicionais, loops, funções; automação de tarefas
  comuns de recon; boas práticas de scripts.
- **Lab:** não (exercícios de script).

### 0.7 — Scripting: Python para segurança
- **Pré-requisitos:** 0.6.
- **Objetivos:** sintaxe essencial; requisições HTTP; sockets; parsing de saída;
  pequenas ferramentas de apoio ao pentest.
- **Lab:** não (exercícios de script).

### 0.8 — Git e versionamento básico
- **Pré-requisitos:** 0.4.
- **Objetivos:** clone, commit, branch, diff; por que versionar anotações e
  evidências; fluxo com repositório privado.
- **Lab:** não.

---

## Trilha 1 — Fundamentos e Ética
Metodologia, escopo e a base legal e ética do pentest no Brasil.

### 1.1 — O que é pentest e tipos de teste
- **Pré-requisitos:** Trilha 0.
- **Objetivos:** diferenciar pentest de outras avaliações; black/grey/white-box;
  fases de um engajamento.
- **Lab:** não.

### 1.2 — Metodologia
- **Pré-requisitos:** 1.1.
- **Objetivos:** PTES, OWASP Testing Guide e cyber kill chain; como uma
  metodologia guia o trabalho do recon ao relatório.
- **Lab:** não.

### 1.3 — Escopo, regras de engajamento e autorização
- **Pré-requisitos:** 1.1.
- **Objetivos:** definir escopo; rules of engagement; autorização por escrito;
  limites e cuidados; por que testar só o que é seu ou autorizado.
- **Lab:** não.

### 1.4 — Lei brasileira e ética
- **Pré-requisitos:** 1.3.
- **Objetivos:** Lei 12.737/2012 (Carolina Dieckmann), Marco Civil da Internet,
  LGPD; responsabilidade legal; ética profissional.
- **Lab:** não.

### 1.5 — Documentação e anotações de pentest
- **Pré-requisitos:** 1.2.
- **Objetivos:** registrar evidências, comandos e achados; estrutura de notas
  reaproveitável no relatório final.
- **Lab:** não.

---

## Trilha 2 — Kit do Pentester
As ferramentas de base e como operá-las com segurança em labs isolados.

### 2.1 — Kali Linux e organização do ambiente
- **Pré-requisitos:** Trilha 0; 1.3.
- **Objetivos:** conhecer o Kali e suas ferramentas; organizar diretórios de
  trabalho; entender como a plataforma isola os alvos.
- **Lab:** sim — **Kali sem alvo** (`kali`).

### 2.2 — OSINT e reconhecimento passivo *(novo na Fase 6)*
- **Pré-requisitos:** 2.1; 1.4.
- **Objetivos:** o que é OSINT e onde termina o reconhecimento passivo;
  fontes abertas (DNS, WHOIS, certificados públicos, buscadores, metadados);
  organizar o que se descobre; limites legais e éticos (LGPD, escopo).
- **Lab:** não. A plataforma não tem internet nos labs; os exercícios usam
  dados de exemplo e a própria documentação da plataforma, nunca pessoas ou
  empresas reais fora de escopo.

### 2.3 — Engenharia social e phishing *(novo na Fase 6)*
- **Pré-requisitos:** 2.2; 1.4.
- **Objetivos:** princípios de persuasão explorados por atacantes; pretexting,
  vishing e phishing; anatomia de um e-mail de phishing e seus indicadores;
  como campanhas autorizadas são conduzidas e medidas.
- **Ética e legalidade (seção reforçada):** só com autorização por escrito e
  escopo definido; Lei 12.737/2012, LGPD e crimes de fraude; nada de alvos
  reais nem de kits de phishing.
- **Lab:** não (análise de exemplos fictícios).

### 2.4 — Reconhecimento e nmap
- **Pré-requisitos:** 0.2; 2.1; 2.2.
- **Objetivos:** host discovery; varredura de portas; detecção de serviço e
  versão; NSE básico; leitura de resultados.
- **Lab:** sim — **Rede de alvos** (`rede-de-alvos`: DVWA + Juice Shop na rede
  interna; disponível desde a Fase 7).

### 2.5 — Burp Suite
- **Pré-requisitos:** 0.2; 2.1.
- **Objetivos:** proxy e intercepção; Repeater; Intruder; escopo; noções de
  fluxo de teste web.
- **Lab:** sim — **OWASP Juice Shop** (`juice-shop`, disponível desde a Fase 7).

### 2.6 — Wireshark e análise de tráfego
- **Pré-requisitos:** 0.2; 2.1.
- **Objetivos:** captura e filtros; seguir fluxos TCP; identificar protocolos e
  credenciais em texto claro.
- **Lab:** sim — **DVWA** (`dvwa`): captura, no Kali, do tráfego Kali ↔ DVWA na
  rede interna (ex.: o login HTTP em claro).

### 2.7 — netcat, shells e transferência de arquivos
- **Pré-requisitos:** 0.4; 2.1.
- **Objetivos:** bind vs reverse shell; ouvir e conectar; transferir arquivos;
  noções de upgrade de shell.
- **Lab:** sim — **DVWA** (`dvwa`): o Kali e o DVWA são as duas pontas; sem
  contêiner "parceiro" sob medida.

### 2.8 — Wordlists e fuzzing
- **Pré-requisitos:** 2.4.
- **Objetivos:** wordlists comuns; descoberta de diretórios e arquivos com
  ffuf/gobuster; interpretar respostas.
- **Lab:** sim — **DVWA** (`dvwa`).

---

## Trilha 3 — Criptografia *(nova na Fase 6)*
O que protege (e o que não protege) os dados: encoding, hashes, cifras
simétricas e assimétricas, TLS e a transição pós-quântica.

### 3.1 — Fundamentos de criptografia
- **Pré-requisitos:** Trilha 2.
- **Objetivos:** encoding vs hashing vs encryption (e por que Base64 não
  protege nada); confidencialidade, integridade e autenticidade; o princípio
  de Kerckhoffs; por que não inventar a própria criptografia.
- **Lab:** não.

### 3.2 — Hashing, senhas e quebra de hashes
- **Pré-requisitos:** 3.1.
- **Objetivos:** funções de hash e suas propriedades; salt; hashes rápidos vs
  lentos (bcrypt, scrypt, Argon2); identificar tipos de hash; quebra offline
  com hashcat e John the Ripper usando wordlists e regras.
- **Lab:** sim — **Kali sem alvo** (`kali`), com um arquivo de hashes de exercício.

### 3.3 — Criptografia simétrica
- **Pré-requisitos:** 3.1.
- **Objetivos:** cifras de bloco e de fluxo; AES; modos de operação (ECB, CBC,
  CTR, GCM) e o perigo do ECB; IV/nonce e o que acontece quando se repetem;
  criptografia autenticada.
- **Lab:** sim — **Kali sem alvo** (`kali`), com OpenSSL e Python.

### 3.4 — Criptografia assimétrica e TLS
- **Pré-requisitos:** 3.2; 3.3.
- **Objetivos:** RSA, Diffie-Hellman e curvas elípticas (ECC); assinaturas
  digitais; certificados e cadeias de confiança; como o TLS combina tudo;
  ataques a JWT fraco (algoritmo `none`, segredo fraco, confusão de chaves).
- **Lab:** sim — **OWASP Juice Shop** (`juice-shop`, desafios de JWT; disponível
  desde a Fase 7).

### 3.5 — Criptografia pós-quântica
- **Pré-requisitos:** 3.4.
- **Objetivos:** a intuição do algoritmo de Shor contra RSA e ECC (sem a
  matemática pesada); *harvest now, decrypt later*; criptografia pós-quântica
  (PQC) e os padrões publicados pelo NIST em 2024; o que muda para quem testa
  sistemas.
- **Lab:** não.

---

## Trilha 4 — Hacking Web (OWASP Top 10)
As principais classes de falha web, na prática, em alvos consagrados.

### 4.1 — Como a web funciona por dentro (revisão aplicada)
- **Pré-requisitos:** Trilha 2; 3.1.
- **Objetivos:** HTTP a fundo; cookies e sessões; mesma-origem; encodings que
  aparecem na web; onde as falhas costumam nascer.
- **Lab:** não.

### 4.2 — Injeção: SQL Injection
- **Pré-requisitos:** 4.1; 2.5.
- **Objetivos:** identificar e explorar SQLi; in-band e blind; extração de dados;
  noções de remediação.
- **Lab:** sim — **DVWA** (`dvwa`).

### 4.3 — Cross-Site Scripting (XSS)
- **Pré-requisitos:** 4.1.
- **Objetivos:** XSS refletido, armazenado e DOM; impacto; payloads básicos;
  remediação.
- **Lab:** sim — **DVWA** (`dvwa`); o conteúdo também usa o Juice Shop.

### 4.4 — Autenticação e sessões quebradas
- **Pré-requisitos:** 4.1.
- **Objetivos:** falhas de login; gestão de sessão; força bruta guiada; fixação
  e roubo de sessão.
- **Lab:** sim — **OWASP Juice Shop** (`juice-shop`).

### 4.5 — Broken Access Control e IDOR
- **Pré-requisitos:** 4.1.
- **Objetivos:** controle de acesso quebrado; IDOR; escalonamento horizontal e
  vertical.
- **Lab:** sim — **OWASP Juice Shop** (`juice-shop`).

### 4.6 — Command Injection e upload de arquivos
- **Pré-requisitos:** 4.2.
- **Objetivos:** injeção de comandos; uploads inseguros; caminho até execução.
- **Lab:** sim — **DVWA** (`dvwa`).

### 4.7 — CSRF e SSRF
- **Pré-requisitos:** 4.1.
- **Objetivos:** CSRF e defesas (tokens); SSRF e alcance de rede interna.
- **Lab:** sim — **OWASP WebGoat** (`webgoat`, disponível desde a Fase 7).

### 4.8 — Componentes vulneráveis e desserialização
- **Pré-requisitos:** 4.1.
- **Objetivos:** componentes desatualizados; noções de desserialização insegura;
  como CVEs de biblioteca viram falha da aplicação.
- **Lab:** sim — **OWASP WebGoat** (`webgoat`).

### 4.9 — Segurança de APIs e GraphQL *(novo na Fase 6)*
- **Pré-requisitos:** 4.4; 4.5; 3.4.
- **Objetivos:** como APIs REST e GraphQL expõem dados; OWASP API Security Top
  10 (BOLA, autenticação quebrada, exposição excessiva de dados, falta de
  limite de taxa); introspecção e consultas abusivas em GraphQL; JWT em APIs.
- **Lab:** sim — alvo próprio de APIs. **Candidato:** DVGA (Damn Vulnerable
  GraphQL Application, `dvga`) para GraphQL, com a parte REST no Juice Shop.
  A escolha final sai na Fase 10, junto com o conteúdo da Trilha 4.

### 4.10 — Mini-projeto web: encadear falhas
- **Pré-requisitos:** 4.2–4.9.
- **Objetivos:** combinar vulnerabilidades para um objetivo; documentar o
  caminho de ataque.
- **Lab:** sim — **OWASP Juice Shop** (`juice-shop`).

---

## Trilha 5 — Redes e Serviços
Do recon de serviços à exploração de CVEs reais com ferramentas de mercado.

### 5.1 — Enumeração de serviços em profundidade
- **Pré-requisitos:** 2.4.
- **Objetivos:** enumerar serviços e versões; banners; mapear superfície de
  ataque de um host.
- **Lab:** sim — **Vulhub** (`vulhub`, disponível desde a Fase 7; alvo
  **provisório**: Apache 2.4.49 / CVE-2021-41773 — ver candidatos abaixo).

### 5.2 — Ataque a serviços comuns
- **Pré-requisitos:** 5.1; 2.7.
- **Objetivos:** FTP, SSH, SMB e web; configurações inseguras; acesso inicial.
- **Lab:** sim — **Vulhub** (`vulhub`).

### 5.3 — Metasploit Framework do zero
- **Pré-requisitos:** 5.1.
- **Objetivos:** módulos, payloads e sessions; uso responsável em lab; fluxo
  search → use → set → run.
- **Lab:** sim — **Vulhub** (`vulhub`).

### 5.4 — Explorando CVEs reais com Vulhub
- **Pré-requisitos:** 5.3.
- **Objetivos:** reproduzir CVEs conhecidas em ambiente isolado; entender causa
  e correção.
- **Lab:** sim — **Vulhub** (`vulhub`).

### 5.5 — Ataques a senhas
- **Pré-requisitos:** 5.2; 3.2.
- **Objetivos:** ataques online com hydra; password spraying e reutilização de
  credenciais; levar para a prática a quebra offline vista em 3.2 (hashes
  obtidos de um serviço); boas práticas de wordlist.
- **Lab:** sim — **Vulhub** (`vulhub`): um serviço com autenticação na rede isolada.

### 5.6 — Mini-projeto: comprometer um serviço ponta a ponta
- **Pré-requisitos:** 5.1–5.5.
- **Objetivos:** do recon ao acesso; registrar evidências e caminho de ataque.
- **Lab:** sim — **Vulhub** (`vulhub`).

---

## Trilha 6 — Escalação de Privilégios
De um acesso inicial ao controle total do host — Linux primeiro, Windows
depois — e o que vem depois dele.

### 6.1 — Conceitos de privilégio e superfícies de escalação
- **Pré-requisitos:** Trilha 5.
- **Objetivos:** modelo de privilégios em Linux e Windows; onde a escalação
  costuma acontecer.
- **Lab:** não.

### 6.2 — PrivEsc Linux: enumeração
- **Pré-requisitos:** 6.1; 0.4.
- **Objetivos:** enumeração manual e com linpeas; ler o resultado e priorizar
  vetores.
- **Lab:** sim — **contêiner Linux** na rede isolada (definido na Fase 11).

### 6.3 — PrivEsc Linux: SUID, cron, sudo, capabilities
- **Pré-requisitos:** 6.2.
- **Objetivos:** explorar SUID, cron jobs, regras de sudo e capabilities;
  chegar a root.
- **Lab:** sim — **contêiner Linux** na rede isolada (definido na Fase 11).

### 6.4 — PrivEsc Windows: enumeração
- **Pré-requisitos:** 6.1; 0.5.
- **Objetivos:** identificar vetores de escalação no Windows; ferramentas de
  enumeração.
- **Lab:** não — **teoria + walkthrough guiado** (sem lab local pesado).

### 6.5 — PrivEsc Windows: serviços, tokens, permissões
- **Pré-requisitos:** 6.4.
- **Objetivos:** serviços mal configurados; abuso de tokens; permissões de
  arquivo/registro; caminho até SYSTEM.
- **Lab:** não — **teoria + walkthrough guiado**.

### 6.6 — Mini-projeto: da shell ao root/SYSTEM
- **Pré-requisitos:** 6.2–6.5.
- **Objetivos:** encadear acesso inicial + escalação; documentar o caminho.
- **Lab:** sim — **contêiner Linux encadeado** (parte Windows como walkthrough;
  definido na Fase 11).

### 6.7 — Pós-exploração e persistência *(novo na Fase 6)*
- **Pré-requisitos:** 6.6.
- **Objetivos:** o que fazer depois do root/SYSTEM dentro do escopo: coleta de
  evidências, credenciais e informações do host; mecanismos de persistência
  (cron, serviços, chaves SSH, tarefas agendadas) e como detectá-los;
  limpeza e o compromisso de deixar o ambiente como estava.
- **Lab:** a definir na Fase 11 (junto com o contêiner Linux da trilha).

---

## Trilha 7 — Active Directory
Conceitos de AD e os ataques clássicos, em um lab enxuto e guiado.

### 7.1 — O que é AD e por que importa
- **Pré-requisitos:** Trilha 6.
- **Objetivos:** domínio, floresta, usuários/grupos, GPO; por que AD é alvo
  central em redes corporativas.
- **Lab:** não.

### 7.2 — Enumeração de domínio
- **Pré-requisitos:** 7.1.
- **Objetivos:** enumerar usuários, grupos e relações; noções de BloodHound e
  ldapsearch.
- **Lab:** não — **walkthrough guiado** (lab enxuto).

### 7.3 — Ataques clássicos
- **Pré-requisitos:** 7.2.
- **Objetivos:** Kerberoasting, AS-REP roasting e pass-the-hash; quando cada um
  se aplica.
- **Lab:** não — **walkthrough guiado**.

### 7.4 — Movimento lateral e escalação no domínio
- **Pré-requisitos:** 7.3.
- **Objetivos:** reutilização de credenciais; movimento lateral; caminho até
  Domain Admin.
- **Lab:** não — **walkthrough guiado**.

### 7.5 — Mini-projeto: comprometer o domínio
- **Pré-requisitos:** 7.2–7.4.
- **Objetivos:** encadear enumeração → ataque → escalação; documentar o caminho.
- **Lab:** não — **walkthrough guiado** (lab enxuto).

---

## Trilha 8 — Consolidação
Juntar tudo: metodologia integrada, máquinas estilo CTF e o relatório final.

### 8.1 — Metodologia completa de ataque (revisão integrada)
- **Pré-requisitos:** Trilhas 2–7.
- **Objetivos:** revisar o fluxo recon → acesso → escalação → pós-exploração →
  relatório como um todo.
- **Lab:** não.

### 8.2 — Máquina CTF guiada
- **Pré-requisitos:** 8.1.
- **Objetivos:** resolver uma máquina boot2root com dicas; aplicar a metodologia
  ponta a ponta.
- **Lab:** sim — **máquina estilo boot2root** (alvo consagrado, isolado;
  definido na Fase 11).

### 8.3 — Máquina CTF sem dicas
- **Pré-requisitos:** 8.2.
- **Objetivos:** resolver uma máquina sem dicas; autonomia total.
- **Lab:** sim — **máquina estilo boot2root** (definido na Fase 11).

### 8.4 — Escrevendo o relatório de pentest
- **Pré-requisitos:** 1.5; 8.2.
- **Objetivos:** estrutura de relatório; descrição de findings; classificação de
  risco; recomendações de remediação.
- **Lab:** não.

### 8.5 — Projeto final: pentest completo + relatório
- **Pré-requisitos:** 8.1–8.4.
- **Objetivos:** conduzir um pentest do início ao fim em ambiente isolado e
  entregar o relatório completo.
- **Lab:** sim — **ambiente final** (alvo consagrado, isolado; definido na Fase 11).
