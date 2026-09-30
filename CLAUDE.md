# Plataforma de Cibersegurança — CLAUDE.md

Este arquivo é a fonte de verdade do projeto. Claude Code (e qualquer pessoa)
deve lê-lo antes de trabalhar no repositório.

## Objetivo
Plataforma pessoal no estilo TryHackMe para o MESQUITA aprender pentest
(segurança ofensiva) do zero ao avançado, unindo teoria e laboratórios práticos.

## Ambiente
- 100% local, sem nuvem.
- Windows com WSL2 (Ubuntu). Todo o projeto vive dentro do Ubuntu.
- 16 GB de RAM; 50 a 150 GB de disco em SSD.
- Regra de RAM: **um laboratório ativo por vez**.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
- SQLite como banco (arquivo local, sem servidor, sem login).
- Conteúdo dos módulos em MDX, versionado no repositório.
- Docker Compose orquestra os laboratórios.

## Regras de isolamento (segurança — inegociáveis)
- Tudo escuta apenas em `127.0.0.1`. Nada acessível por outros aparelhos na rede.
- A rede dos laboratórios é interna e sem internet; os alvos não enxergam o PC.
- Só a plataforma controla o Docker, e só localmente.
- Alvos vêm de projetos vulneráveis-por-design consagrados (DVWA, Juice Shop,
  WebGoat, Vulhub). **Nunca** exploit ou malware escrito sob medida.

## Currículo (foco ofensivo, do zero, 8 trilhas)
- **Trilha 0 — Pré-Segurança:** redes, terminal Linux, Windows básico, scripting.
- **Trilha 1 — Fundamentos e Ética:** metodologia, escopo, lei brasileira.
- **Trilha 2 — Kit do Pentester:** Kali, nmap, Burp, Wireshark, netcat.
- **Trilha 3 — Hacking Web:** OWASP Top 10 na prática.
- **Trilha 4 — Redes e Serviços:** enumeração, Metasploit, CVEs reais.
- **Trilha 5 — Escalação de Privilégios:** Linux e depois Windows.
- **Trilha 6 — Active Directory:** conceitos e lab enxuto.
- **Trilha 7 — Consolidação:** máquinas estilo CTF e relatório de pentest.

O detalhamento módulo a módulo está em [`docs/CURRICULO.md`](docs/CURRICULO.md).

## Idioma e convenções
- **Interface e conteúdo em português.** Termos técnicos em inglês, explicados na
  primeira vez (a plataforma monta um Glossário automático).
- **Código em inglês:** nomes de variáveis, funções, arquivos e mensagens de
  commit sempre em inglês.

## Ferramentas
- Claude Code (dentro do WSL) faz o trabalho pesado: Docker, arquivos, testes.
- GitHub privado para versionamento e backup.
- Context7 (MCP) para documentação atualizada das bibliotecas.
- Playwright para o MESQUITA testar a interface local sozinho.

## Como trabalhar
- Antes de qualquer mudança grande, apresente um plano curto e espere aprovação.
- Trabalhe em passos pequenos e verificáveis; commit ao fim de cada fase.
- Priorize qualidade sobre velocidade. Tempo não é problema.

## Documentos do projeto
- [`ROADMAP.md`](ROADMAP.md) — as 9 fases de construção da plataforma.
- [`docs/CURRICULO.md`](docs/CURRICULO.md) — currículo detalhado, módulo a módulo.
- [`docs/MODELO-DE-DADOS.md`](docs/MODELO-DE-DADOS.md) — entidades e relações.
