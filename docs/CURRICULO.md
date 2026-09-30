# Currículo — Plataforma de Cibersegurança

Currículo de segurança ofensiva do zero ao avançado, organizado em **8 trilhas**
(Trilha 0 a Trilha 7). Cada trilha reúne módulos; cada módulo traz título,
pré-requisitos, objetivos de aprendizado e, quando houver, o laboratório (lab)
com o alvo usado.

## Convenções
- **Idioma:** conteúdo em português; termos técnicos em inglês, explicados na
  primeira ocorrência (alimentam o Glossário automático).
- **Alvos de lab:** apenas projetos vulneráveis-por-design consagrados —
  DVWA, OWASP Juice Shop, OWASP WebGoat, Vulhub. Nunca exploit/malware sob medida.
- **Isolamento:** todo lab escuta só em `127.0.0.1`, em rede interna sem internet,
  com **um laboratório ativo por vez** (ver [`../CLAUDE.md`](../CLAUDE.md)).
- **Decisões de escopo (aprovadas na Fase 0):**
  - **PrivEsc Windows (5.4, 5.5):** teoria + walkthrough guiado, sem lab local
    pesado, para respeitar a regra de 1 lab/16 GB.
  - **Active Directory (Trilha 6):** conceitos + walkthrough guiado; lab enxuto.

---

## Trilha 0 — Pré-Segurança
Base para quem começa do zero: como usar a plataforma, redes, terminais e
scripting. Sem labs de ataque; prática guiada no próprio ambiente.

### 0.1 — Como usar esta plataforma
- **Pré-requisitos:** nenhum.
- **Objetivos:** navegar trilhas e módulos; entender progresso, flags e o
  Glossário; conhecer as regras de isolamento e a regra de 1 lab por vez.
- **Lab:** não.

### 0.2 — Redes TCP/IP na prática
- **Pré-requisitos:** 0.1.
- **Objetivos:** modelo TCP/IP; endereços IP e sub-redes; portas; DNS; como uma
  requisição HTTP viaja da ponta ao servidor.
- **Lab:** não (exercícios guiados de inspeção).

### 0.3 — Terminal Linux essencial
- **Pré-requisitos:** 0.1.
- **Objetivos:** navegação de arquivos, permissões, pipes e redirecionamento,
  processos, pacotes; edição no terminal.
- **Lab:** não (prática no próprio WSL/Ubuntu).

### 0.4 — Windows para quem vem do Linux
- **Pré-requisitos:** 0.3.
- **Objetivos:** conceitos de Windows (usuários, serviços, registro); `cmd` e
  noções de PowerShell; diferenças relevantes para pentest.
- **Lab:** não.

### 0.5 — Scripting: Bash
- **Pré-requisitos:** 0.3.
- **Objetivos:** variáveis, condicionais, loops, funções; automação de tarefas
  comuns de recon; boas práticas de scripts.
- **Lab:** não (exercícios de script).

### 0.6 — Scripting: Python para segurança
- **Pré-requisitos:** 0.5.
- **Objetivos:** sintaxe essencial; requisições HTTP; sockets; parsing de saída;
  pequenas ferramentas de apoio ao pentest.
- **Lab:** não (exercícios de script).

### 0.7 — Git e versionamento básico
- **Pré-requisitos:** 0.3.
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
- **Lab:** não (preparação de ambiente).

### 2.2 — Reconhecimento e nmap
- **Pré-requisitos:** 0.2; 2.1.
- **Objetivos:** host discovery; varredura de portas; detecção de serviço e
  versão; NSE básico; leitura de resultados.
- **Lab:** sim — **rede interna de alvos** (contêineres na rede isolada).

### 2.3 — Burp Suite
- **Pré-requisitos:** 0.2; 2.1.
- **Objetivos:** proxy e intercepção; Repeater; Intruder; escopo; noções de
  fluxo de teste web.
- **Lab:** sim — **OWASP Juice Shop**.

### 2.4 — Wireshark e análise de tráfego
- **Pré-requisitos:** 0.2; 2.1.
- **Objetivos:** captura e filtros; seguir fluxos TCP; identificar protocolos e
  credenciais em texto claro.
- **Lab:** sim — **captura na rede interna** de laboratórios.

### 2.5 — netcat, shells e transferência de arquivos
- **Pré-requisitos:** 0.3; 2.1.
- **Objetivos:** bind vs reverse shell; ouvir e conectar; transferir arquivos;
  noções de upgrade de shell.
- **Lab:** sim — **contêiner simples** na rede isolada.

### 2.6 — Wordlists e fuzzing
- **Pré-requisitos:** 2.2.
- **Objetivos:** wordlists comuns; descoberta de diretórios e arquivos com
  ffuf/gobuster; interpretar respostas.
- **Lab:** sim — **DVWA**.

---

## Trilha 3 — Hacking Web (OWASP Top 10)
As principais classes de falha web, na prática, em alvos consagrados.

### 3.1 — Como a web funciona por dentro (revisão aplicada)
- **Pré-requisitos:** Trilha 2.
- **Objetivos:** HTTP a fundo; cookies e sessões; mesma-origem; onde as falhas
  costumam nascer.
- **Lab:** não.

### 3.2 — Injeção: SQL Injection
- **Pré-requisitos:** 3.1; 2.3.
- **Objetivos:** identificar e explorar SQLi; in-band e blind; extração de dados;
  noções de remediação.
- **Lab:** sim — **DVWA**.

### 3.3 — Cross-Site Scripting (XSS)
- **Pré-requisitos:** 3.1.
- **Objetivos:** XSS refletido, armazenado e DOM; impacto; payloads básicos;
  remediação.
- **Lab:** sim — **DVWA / Juice Shop**.

### 3.4 — Autenticação e sessões quebradas
- **Pré-requisitos:** 3.1.
- **Objetivos:** falhas de login; gestão de sessão; força bruta guiada; fixação
  e roubo de sessão.
- **Lab:** sim — **Juice Shop**.

### 3.5 — Broken Access Control e IDOR
- **Pré-requisitos:** 3.1.
- **Objetivos:** controle de acesso quebrado; IDOR; escalonamento horizontal e
  vertical.
- **Lab:** sim — **Juice Shop**.

### 3.6 — Command Injection e upload de arquivos
- **Pré-requisitos:** 3.2.
- **Objetivos:** injeção de comandos; uploads inseguros; caminho até execução.
- **Lab:** sim — **DVWA**.

### 3.7 — CSRF e SSRF
- **Pré-requisitos:** 3.1.
- **Objetivos:** CSRF e defesas (tokens); SSRF e alcance de rede interna.
- **Lab:** sim — **WebGoat**.

### 3.8 — Componentes vulneráveis e desserialização
- **Pré-requisitos:** 3.1.
- **Objetivos:** componentes desatualizados; noções de desserialização insegura;
  como CVEs de biblioteca viram falha da aplicação.
- **Lab:** sim — **WebGoat**.

### 3.9 — Mini-projeto web: encadear falhas
- **Pré-requisitos:** 3.2–3.8.
- **Objetivos:** combinar vulnerabilidades para um objetivo; documentar o
  caminho de ataque.
- **Lab:** sim — **Juice Shop**.

---

## Trilha 4 — Redes e Serviços
Do recon de serviços à exploração de CVEs reais com ferramentas de mercado.

### 4.1 — Enumeração de serviços em profundidade
- **Pré-requisitos:** 2.2.
- **Objetivos:** enumerar serviços e versões; banners; mapear superfície de
  ataque de um host.
- **Lab:** sim — **Vulhub**.

### 4.2 — Ataque a serviços comuns
- **Pré-requisitos:** 4.1; 2.5.
- **Objetivos:** FTP, SSH, SMB e web; configurações inseguras; acesso inicial.
- **Lab:** sim — **Vulhub**.

### 4.3 — Metasploit Framework do zero
- **Pré-requisitos:** 4.1.
- **Objetivos:** módulos, payloads e sessions; uso responsável em lab; fluxo
  search → use → set → run.
- **Lab:** sim — **Vulhub**.

### 4.4 — Explorando CVEs reais com Vulhub
- **Pré-requisitos:** 4.3.
- **Objetivos:** reproduzir CVEs conhecidas em ambiente isolado; entender causa
  e correção.
- **Lab:** sim — **Vulhub**.

### 4.5 — Ataques a senhas
- **Pré-requisitos:** 4.2.
- **Objetivos:** hydra (online), john e hashcat (offline); tipos de hash;
  boas práticas de wordlist.
- **Lab:** sim — **serviço interno** na rede isolada.

### 4.6 — Mini-projeto: comprometer um serviço ponta a ponta
- **Pré-requisitos:** 4.1–4.5.
- **Objetivos:** do recon ao acesso; registrar evidências e caminho de ataque.
- **Lab:** sim — **Vulhub**.

---

## Trilha 5 — Escalação de Privilégios
De um acesso inicial ao controle total do host — Linux primeiro, Windows depois.

### 5.1 — Conceitos de privilégio e superfícies de escalação
- **Pré-requisitos:** Trilha 4.
- **Objetivos:** modelo de privilégios em Linux e Windows; onde a escalação
  costuma acontecer.
- **Lab:** não.

### 5.2 — PrivEsc Linux: enumeração
- **Pré-requisitos:** 5.1; 0.3.
- **Objetivos:** enumeração manual e com linpeas; ler o resultado e priorizar
  vetores.
- **Lab:** sim — **contêiner Linux** na rede isolada.

### 5.3 — PrivEsc Linux: SUID, cron, sudo, capabilities
- **Pré-requisitos:** 5.2.
- **Objetivos:** explorar SUID, cron jobs, regras de sudo e capabilities;
  chegar a root.
- **Lab:** sim — **contêiner Linux** na rede isolada.

### 5.4 — PrivEsc Windows: enumeração
- **Pré-requisitos:** 5.1; 0.4.
- **Objetivos:** identificar vetores de escalação no Windows; ferramentas de
  enumeração.
- **Lab:** não — **teoria + walkthrough guiado** (sem lab local pesado).

### 5.5 — PrivEsc Windows: serviços, tokens, permissões
- **Pré-requisitos:** 5.4.
- **Objetivos:** serviços mal configurados; abuso de tokens; permissões de
  arquivo/registro; caminho até SYSTEM.
- **Lab:** não — **teoria + walkthrough guiado**.

### 5.6 — Mini-projeto: da shell ao root/SYSTEM
- **Pré-requisitos:** 5.2–5.5.
- **Objetivos:** encadear acesso inicial + escalação; documentar o caminho.
- **Lab:** sim — **contêiner Linux encadeado** (parte Windows como walkthrough).

---

## Trilha 6 — Active Directory
Conceitos de AD e os ataques clássicos, em um lab enxuto e guiado.

### 6.1 — O que é AD e por que importa
- **Pré-requisitos:** Trilha 5.
- **Objetivos:** domínio, floresta, usuários/grupos, GPO; por que AD é alvo
  central em redes corporativas.
- **Lab:** não.

### 6.2 — Enumeração de domínio
- **Pré-requisitos:** 6.1.
- **Objetivos:** enumerar usuários, grupos e relações; noções de BloodHound e
  ldapsearch.
- **Lab:** não — **walkthrough guiado** (lab enxuto).

### 6.3 — Ataques clássicos
- **Pré-requisitos:** 6.2.
- **Objetivos:** Kerberoasting, AS-REP roasting e pass-the-hash; quando cada um
  se aplica.
- **Lab:** não — **walkthrough guiado**.

### 6.4 — Movimento lateral e escalação no domínio
- **Pré-requisitos:** 6.3.
- **Objetivos:** reutilização de credenciais; movimento lateral; caminho até
  Domain Admin.
- **Lab:** não — **walkthrough guiado**.

### 6.5 — Mini-projeto: comprometer o domínio
- **Pré-requisitos:** 6.2–6.4.
- **Objetivos:** encadear enumeração → ataque → escalação; documentar o caminho.
- **Lab:** não — **walkthrough guiado** (lab enxuto).

---

## Trilha 7 — Consolidação
Juntar tudo: metodologia integrada, máquinas estilo CTF e o relatório final.

### 7.1 — Metodologia completa de ataque (revisão integrada)
- **Pré-requisitos:** Trilhas 2–6.
- **Objetivos:** revisar o fluxo recon → acesso → escalação → pós-exploração →
  relatório como um todo.
- **Lab:** não.

### 7.2 — Máquina CTF guiada
- **Pré-requisitos:** 7.1.
- **Objetivos:** resolver uma máquina boot2root com dicas; aplicar a metodologia
  ponta a ponta.
- **Lab:** sim — **máquina estilo boot2root** (alvo consagrado, isolado).

### 7.3 — Máquina CTF sem dicas
- **Pré-requisitos:** 7.2.
- **Objetivos:** resolver uma máquina sem dicas; autonomia total.
- **Lab:** sim — **máquina estilo boot2root**.

### 7.4 — Escrevendo o relatório de pentest
- **Pré-requisitos:** 1.5; 7.2.
- **Objetivos:** estrutura de relatório; descrição de findings; classificação de
  risco; recomendações de remediação.
- **Lab:** não.

### 7.5 — Projeto final: pentest completo + relatório
- **Pré-requisitos:** 7.1–7.4.
- **Objetivos:** conduzir um pentest do início ao fim em ambiente isolado e
  entregar o relatório completo.
- **Lab:** sim — **ambiente final** (alvo consagrado, isolado).
