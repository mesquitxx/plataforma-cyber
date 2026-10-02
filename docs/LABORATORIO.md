# Laboratório — ligar, desligar e validar o isolamento

Desde a Fase 6, a **plataforma** liga, desliga e reseta os labs, sempre **um
ativo por vez**. Por baixo, tudo passa por um único executor,
`scripts/lab.sh`, que o terminal também usa.

| Lab | Tipo | O que é |
|---|---|---|
| `kali` | desktop | Só o Kali (XFCE) no navegador, via Apache Guacamole, sem alvo na rede. |
| `dvwa` | desktop | O Kali + o DVWA como alvo: a pilha da Fase 1. |
| `linux-sandbox` | sandbox | Contêiner Debian sem rede para treinar o terminal (módulo 0.3). O shell abre no WSL. |
| `juice-shop` | desktop | O Kali + o OWASP Juice Shop (Node.js), alvo web moderno. *(Fase 7)* |
| `rede-de-alvos` | desktop | O Kali + DVWA + Juice Shop na mesma rede interna, para nmap e enumeração. *(Fase 7)* |
| `webgoat` | desktop | O Kali + o OWASP WebGoat (Java), aulas guiadas de falhas web. *(Fase 7)* |
| `vulhub` | desktop | O Kali + um alvo Vulhub com CVE real. **Provisório:** Apache 2.4.49 / CVE-2021-41773. *(Fase 7)* |

O lab **previsto** `dvga` (Damn Vulnerable GraphQL Application) já está no
catálogo (`lib/labs/catalog.ts`) e aparece na interface, mas só pode ser ligado
na fase que o traz (candidato de APIs/GraphQL, decidido na fase de conteúdo da
Trilha 4).

Os labs da Fase 7 (`juice-shop`, `rede-de-alvos`, `webgoat`, `vulhub`) usam
imagens que **ainda não estão baixadas**: na primeira vez, rode
`scripts/lab.sh pull <lab>` no terminal (único momento com internet). O `vulhub`
é **construído localmente**, como o Kali.

## Pela plataforma (o jeito normal)

1. Rode o app: `npm run dev` e abra **http://127.0.0.1:3000**.
2. Abra um módulo com lab (ex.: 2.6 Wireshark) ou **Laboratórios** no menu.
3. No painel **Laboratório**, clique em **Iniciar**. O log aparece ao vivo; o
   lab `dvwa` leva cerca de 10 s para subir quando as imagens já existem.
4. Com um lab de desktop rodando, o **desktop do Kali** aparece no próprio
   painel, já logado. Clique nele para o teclado ir para o Kali.
   - **Tela cheia**, **Nova aba** e **Reconectar** ficam acima do desktop.
   - `Ctrl+Alt+Shift` abre o menu do Guacamole (área de transferência).
5. Botões com o lab no ar:
   - **Parar** desliga o lab (os dados ficam).
   - **Resetar** (pede confirmação) recria o alvo do zero. O DVWA volta ao
     estado de fábrica; o `/home/kali` **nunca** é apagado pela interface.
   - **Verificar isolamento** roda os testes da seção "Validar o isolamento" e
     mostra o resultado.
6. Se outro lab estiver rodando, o botão vira **Trocar para este lab**: ele
   desliga o atual (com confirmação) e liga o novo.

A barra superior mostra o lab ativo em todas as páginas.

**O que a plataforma não faz, de propósito:**
- **Não usa a internet.** Ela sobe os labs com `--pull never --no-build`; se
  faltar uma imagem, recusa e mostra o comando para baixar no terminal.
- **Não apaga o `/home/kali`** nem o banco do Guacamole: o `purge` só existe
  no terminal.
- **Não tem terminal web.** O sandbox abre no WSL, com `npm run lab:sandbox`.

## Pelo terminal

```bash
scripts/lab.sh list              # labs que o executor aceita
scripts/lab.sh status            # contêineres Compose e a que lab pertencem
scripts/lab.sh up dvwa           # liga (recusa se outro lab estiver rodando)
scripts/lab.sh down dvwa         # desliga; os dados ficam
scripts/lab.sh switch kali       # desliga o lab atual e liga o kali
scripts/lab.sh reset dvwa        # recria o alvo (o /home/kali fica)
scripts/lab.sh verify dvwa       # prova o isolamento (código 0 só se tudo passar)
# Só no terminal (a plataforma recebe recusa, código 6):
scripts/lab.sh pull dvwa         # baixa/constrói as imagens (usa internet)
scripts/lab.sh rebuild dvwa      # reconstrói o Kali com pacotes novos (internet)
scripts/lab.sh purge dvwa        # desliga e apaga os volumes, inclusive /home/kali
```

Atalhos antigos, que continuam valendo: `scripts/lab-up.sh` (= `up dvwa`;
`--rebuild` reconstrói antes), `scripts/lab-down.sh` (= `down`; `--purge` =
`purge`) e `npm run lab:sandbox` (sobe o sandbox se preciso e abre o shell).

**Códigos de saída do `lab.sh`:** 0 ok · 1 falha · 2 uso inválido ·
3 imagem ausente · 4 outra operação em andamento · 5 outro lab rodando ·
6 comando só de terminal.

**Na primeira vez** (máquina nova): `scripts/lab.sh pull dvwa` e
`scripts/lab.sh pull linux-sandbox` baixam as imagens e constroem o Kali e o
sandbox (vários minutos; é o **único momento** com internet). O `up` cria o
`labs/.env` com senhas aleatórias se ele não existir.

**Login manual no Guacamole** (fora da plataforma, raramente necessário):
**http://127.0.0.1:8080/guacamole/** como `guacadmin`, com a senha
`GUAC_ADMIN_PASSWORD` do `labs/.env` (`grep GUAC_ADMIN labs/.env`). A senha
padrão `guacadmin` **não** funciona.

## Arquitetura

```
 Navegador (Windows) ──► http://127.0.0.1:3000  (plataforma, Next.js)
        │                       │ Server Action (POST, Origin local)
        │                       ▼
        │                scripts/lab.sh ──► docker compose (lista fechada)
        │
        └── iframe ──► http://127.0.0.1:8080/guacamole/
                              │
                    ┌─────────▼─────────┐  guac_front (única rede não interna,
                    │ guac-proxy (nginx)│  exigida pelo Docker para publicar porta;
                    └─────────┬─────────┘  sem NAT/masquerade desde a Fase 8)
                   guac_edge  │  (interna)
                    ┌─────────▼─────────┐
                    │ guacamole (web)   │
                    └───┬───────────────┘
            guac_back   │  (interna)
          ┌─────────────┼──────────────┐
    ┌─────▼─────┐  ┌────▼────┐
    │ guac-db   │  │ guacd   │
    │ (Postgres)│  └────┬────┘
    └───────────┘       │ desktop_net (interna)
                   ┌────▼─────────────┐
                   │ kali (XFCE+VNC)  │
                   └────┬─────────────┘
                        │ lab_net (interna)
                   ┌────▼────┐   dvwa_back (interna)   ┌──────────┐
                   │  dvwa   │─────────────────────────│ dvwa-db  │
                   └─────────┘                         └──────────┘
```

**Arquivos Compose (Fase 6):** `labs/base/compose.yaml` traz Guacamole + Kali e
as redes `guac_front`, `guac_edge` (Fase 8), `guac_back`, `desktop_net` e `lab_net`. Sozinho, ele é o
lab `kali`. `labs/dvwa/compose.yaml` entra por cima (segundo `-f`) com o DVWA,
o banco e a `dvwa_back`. Todos usam o projeto Compose `cyberlab`, com os mesmos
nomes de rede, bridge e volume da Fase 1: os dados antigos continuaram valendo.
Os arquivos dos alvos previstos seguem o mesmo padrão.

**Como a plataforma sabe qual lab está rodando:** pelo rótulo
`com.docker.compose.project.config_files`, que o Compose grava em cada
contêiner com os arquivos usados. O estado vem sempre do Docker, nunca da
memória do app.

| Serviço | Papel | Redes |
|---|---|---|
| `guac-proxy` | **(Fase 8)** nginx sem root: única porta publicada (`127.0.0.1:8080`), repassa `/guacamole/` e acrescenta `frame-ancestors` | `guac_front`, `guac_edge` |
| `guacamole` | Interface web (Tomcat) — o que aparece no iframe | `guac_edge`, `guac_back` |
| `guacd` | Proxy que converte VNC para o protocolo do Guacamole | `guac_back`, `desktop_net` |
| `guac-db` | PostgreSQL com usuários e conexões do Guacamole | `guac_back` |
| `kali` | Attack box: XFCE + TigerVNC + nmap, Burp, sqlmap, Wireshark, Firefox | `desktop_net`, `lab_net` |
| `dvwa` | Alvo vulnerável-por-design (só no lab `dvwa`) | `lab_net`, `dvwa_back` |
| `dvwa-db` | MariaDB do DVWA (só no lab `dvwa`) | `dvwa_back` |

**Garantias de isolamento (Fase 1, reconfirmadas na Fase 6):**
- **Redes internas** (`internal: true`): não têm gateway nem NAT, então o
  contêiner não tem rota para fora. Isso vale para Kali, DVWA e os bancos.
- **`inhibit_ipv4`** nas bridges internas: o host não ganha IP nessas redes,
  então nem o "IP de gateway" da bridge serve como porta para o PC.
- **Uma única porta publicada:** `127.0.0.1:8080`, no `guac-proxy` desde a
  Fase 8 (antes, no próprio Guacamole). O VNC (5901), o DVWA (80), o Tomcat
  do Guacamole e os bancos não são publicados. A plataforma escuta só em
  `127.0.0.1:3000`.
- **Segmentação:** o DVWA não enxerga `guacd`, `guac-db` nem `guacamole` (nem
  resolve os nomes). O Kali enxerga o `guacd` (necessário para a tela), mas
  não os bancos nem a interface web.
- **Sem `privileged` e sem `docker.sock`** em nenhum contêiner; todos, exceto
  o Kali, rodam com `no-new-privileges`. A plataforma **não** roda em contêiner.
- **`restart: "no"`:** o lab nunca sobe sozinho com o Windows.

**Garantias novas da Fase 8:**
- **Nenhum contêiner tem internet**, nem a infraestrutura do Guacamole: o
  Guacamole saiu da `guac_front`, e o `guac-proxy`, único contêiner nela, não
  tem NAT (`enable_ip_masquerade: false`) nem resolvedor externo (`dns:
  127.0.0.1`). Resíduo medido e aceito: T8b.
- **Só a plataforma embute o Guacamole** (`frame-ancestors`, T9) e **ninguém
  embute a plataforma** (`X-Frame-Options: DENY`, T10).
- **Auditoria reexecutável** do host, do Windows e de todos os labs:
  `scripts/audit.sh` (ver "Auditoria completa" abaixo).

**Garantias novas da Fase 6:**
- **Lista fechada:** o `lab.sh` só aceita os labs do registro em
  `scripts/lab-common.sh`. A plataforma só envia ações de `LAB_ACTIONS` e slugs
  de labs disponíveis, validados com zod. O `npm test` exige que o catálogo e
  o registro batam.
- **Uma operação por vez:** `flock` em `data/lab.lock` (terminal e plataforma).
- **Um lab por vez:** o `up` recusa (código 5) se houver contêiner de outro lab
  ou de fora da plataforma rodando.
- **Sem internet ao ligar:** `--pull never --no-build`.

## Validar o isolamento

Com um lab de desktop no ar, pela plataforma (**Verificar isolamento**) ou:

```bash
scripts/lab.sh verify dvwa    # ou: verify kali
```

O script faz **tentativas reais de conexão** e imprime PASS/FAIL. A coluna
`EXPECT` diz se a tentativa **deve funcionar** (`ok`) ou **deve falhar**
(`blocked`). Ele só termina com código 0 se todos os testes passarem. Os testes
do alvo só rodam quando o lab tem alvo (no `kali`, as tentativas de chegar ao
Windows partem do próprio Kali).

| ID | O que prova | Como |
|---|---|---|
| 0 | **Controles das sondas** | As ferramentas de sonda funcionam em cada contêiner (TCP, DNS, ICMP, consulta DNS por UDP ao DNS embutido do Docker `127.0.0.11`) e o canário UDP do host recebe datagramas do próprio host |
| 1 | Sem internet (TCP, UDP, ICMP, IPv6) | **Todos** os contêineres (alvos, bancos, Kali, `guacd`, `guac-db`, `guacamole`, `guac-proxy`) tentam `1.1.1.1:443`, `8.8.8.8:53`, uma consulta DNS por UDP direto a `1.1.1.1:53`, `ping 1.1.1.1` (onde há `ping`) e `[2606:4700:4700::1111]:443` |
| 2 | Sem internet por DNS (sem exfiltração via DNS) | `getent hosts example.com` |
| 3 | Sem rota de saída | Nenhuma rota padrão em `/proc/net/route` (exceto o `guac-proxy`, cuja rota não tem NAT); nenhum IPv6 fora do loopback; nenhuma variável `*_proxy`; bridges internas sem IPv4 no host |
| 4 | Alvo não alcança o PC | **Canário** TCP e UDP: o script abre uma porta no IP `eth0` do WSL e no gateway da `guac_front`. O próprio host conecta (controle); alvos, bancos, Kali, `guacd`, `guac-db` e `guacamole` não. Também testa `docker0` e o DNS do WSL (`10.255.255.254`). **(Fase 8)** O resíduo T8b do `guac-proxy` é medido e impresso como `INFO` (não conta). |
| 5 | Alvo não alcança o Windows | Portas 135/445/3389 do IP do Windows |
| 7 | Alvo não enxerga a infraestrutura | DVWA não resolve `guacamole`, `guac-proxy`, `guacd`, `guac-db`, `host.docker.internal`; Kali não resolve os bancos, o proxy nem a interface web; **(Fase 8)** o `guac-proxy` resolve só o `guacamole` (não o `guacd`, os bancos, o Kali nem os alvos) |
| 8 | Redes marcadas como internas | `docker network inspect` → `Internal: true`; **(Fase 8)** `guac_front` com masquerade desligado |
| 9 | Só loopback | Única porta publicada é `127.0.0.1:8080`, e ela é do `guac-proxy`; nada em `0.0.0.0:8080` no WSL; a 8080 não responde no IP `eth0` do WSL; no Windows, a 8080 só escuta em `127.0.0.1`/`::1`; **(Fase 6)** nada em `0.0.0.0:3000` (a plataforma); **(Fase 8)** a 8080 envia `Content-Security-Policy: frame-ancestors` só da plataforma e `nosniff` |
| 10 | **(Fase 6)** Nenhum contêiner perigoso | Nenhum contêiner do lab é `privileged` nem monta `docker.sock` |
| 11 | **Controle positivo:** o lab funciona | Kali acessa `http://dvwa/` (lab `dvwa`) |
| 12 | **Controle positivo:** a tela funciona | Guacamole responde; `guacd` alcança o VNC do Kali; login com a senha do `.env` funciona e com `guacadmin/guacadmin` falha (por último: é um login errado, ver T8c); **(Fase 8, 12e)** a tela **de verdade**: `scripts/guac-screen-probe.py` loga como `plataforma`, abre o túnel WebSocket e exige `size` e imagens do desktop |
| 13 | **(Fase 6)** Usuário `plataforma` restrito | Loga; vê só a conexão "Kali (attack box)"; **não** lê os parâmetros dela (senha VNC), **não** cria conexão nem usuário |

Os controles positivos (11, 12, 13a/b e as sondas do grupo 0) são essenciais.
Sem eles, "tudo bloqueado" poderia significar apenas que a rede está quebrada
ou que falta uma ferramenta no contêiner.

**Resultado na Fase 6:** `dvwa` 66/66 PASS (também pela interface), `kali`
43/43 PASS, `linux-sandbox` 17/17 PASS (também pela interface).

**Resultado na Fase 8** (verificação estendida, depois do hardening): ver o
relatório em [`auditorias/2026-10-01-fase-8.md`](auditorias/2026-10-01-fase-8.md).
Antes do hardening, a mesma verificação dava 139 PASS e 6 FAIL no `dvwa`:
Guacamole com internet (TCP, UDP e DNS) e sem `frame-ancestors`
([linha de base](auditorias/2026-10-01-linha-de-base.txt)).

### Teste do teste
Para ver o script **pegar** uma quebra de isolamento, com o `dvwa` no ar:

```bash
scripts/audit.sh --self-test
```

Ele liga o DVWA de propósito à rede padrão do Docker (que tem internet), exige
que o `verify` falhe nos testes do DVWA, **sempre** desfaz (mesmo com Ctrl+C) e
exige que tudo volte a passar. Na Fase 8: 11 FAILs pegos (internet por TCP,
UDP, ICMP e DNS, rota, canários TCP/UDP, DNS do WSL) e tudo PASS depois.
(Nas fases 1 e 6 o teste era manual e deu 7 FAILs.)

## Auditoria completa (Fase 8)

```bash
scripts/audit.sh                    # tudo: host, Windows, todos os labs, npm audit
scripts/audit.sh --no-labs          # sem ligar labs (A, B e D)
scripts/audit.sh --labs "dvwa kali" # só alguns labs
scripts/audit.sh --self-test        # teste do teste (precisa do dvwa no ar)
```

Só pelo terminal; exige que nenhum lab esteja rodando (exceto com
`--no-labs`/`--self-test`), porque liga e desliga cada lab, um por vez. Rode
com a plataforma no ar (`npm run dev`) para incluir os testes A6 e a sonda da
porta 3000.

| Bloco | O que prova |
|---|---|
| **A. Host (WSL)** | A1: **todo** socket TCP/UDP em escuta no WSL é loopback (o único fora de `127.0.0.0/8` é o DNS do próprio WSL, `10.255.255.254`, que fica na interface `lo`). A2: o daemon Docker não tem endpoint TCP (2375/2376), só o socket Unix. A3: `docker.sock` é `660 root:docker` e só o seu usuário está no grupo `docker`. A4: `labs/.env` com modo `600`; `labs/.env` e `data/` fora do git. A5: `dev`/`start` presos a `127.0.0.1:3000`. A6: com a plataforma no ar, cabeçalhos do T10 e recusa (403) de `Host` e `Origin` estranhos. |
| **B. Windows** | B1: `networkingMode` do `.wslconfig` é NAT (no modo `mirrored`, um socket em `0.0.0.0` no WSL vira um socket da rede local). B2: nenhuma regra `netsh portproxy`. B3: 3000/8080 escutam só em loopback no Windows. B4: **sonda pela rede**: o Windows tenta abrir as portas nos seus próprios IPs de rede (Wi-Fi, Ethernet **e VPNs**, como o Radmin VPN) — devem estar fechadas; controle: a mesma sonda vê a porta aberta em `127.0.0.1`. |
| **C. Labs** | Cada lab do registro: `up` → `verify` → sonda da 8080 pela rede → `down`. Lab sem imagem baixada = **PENDENTE**, nunca PASS. |
| **D. Dependências** | `npm audit --omit=dev`: nenhum alerta crítico/alto nas dependências de produção (envia a lista de dependências ao registro do npm, como o `npm install`; autorizado pelo MESQUITA). |

A sonda B4 **não substitui** o teste do celular: o Windows conectando no próprio
IP não passa pelo firewall como um aparelho de fora passaria. Ela pega o erro
mais provável (algo escutando em `0.0.0.0`), e o celular dá a prova final.

### Testes da plataforma (Fase 6)
Feitos com o app no ar, de ponta a ponta num Chromium headless (Playwright
temporário, fora do repositório):
- Iniciar, resetar (com confirmação), verificar (66/66) e parar o `dvwa` pela
  interface; o Kali abre no iframe **sem** tela de login, e "Nova aba" também.
- Trocar do `dvwa` para o sandbox pelo módulo 0.3 (com confirmação),
  verificar (17/17) e parar.
- Lab previsto (`rede-de-alvos`, no módulo 2.4) aparece sem nenhum botão.
- Entradas forjadas na Server Action (`../../etc/passwd`, `kali; id`, o lab
  previsto `juice-shop`, as ações `pull` e `purge`) recusadas com "Ação ou
  laboratório inválido", sem nenhum contêiner criado.
- `proxy.ts`: `Host` estranho, `X-Forwarded-Host` forjado e POST sem `Origin`
  ou com `Origin` de outro site recebem 403.

### Teste manual (outro aparelho)
1. No Windows, descubra o IP da rede local: `ipconfig` (ex.: `192.168.0.10`).
2. Do celular, na mesma Wi-Fi, abra `http://192.168.0.10:8080/guacamole/` e
   `http://192.168.0.10:3000/`.
3. **Esperado:** nenhuma das duas carrega.

### Testes manuais extras (de dentro do Kali)

```bash
ping -c 2 1.1.1.1            # "Network is unreachable"
curl -m 5 https://example.com  # falha de DNS
nmap -sV dvwa                # funciona: 80/tcp aberto
```

## Dicas de uso do Kali
- **nmap:** sem `sudo`, faz *connect scan* (`-sT`, inclusive com `-sV`).
  Varreduras que exigem raw socket (`-sS`, `-O`) pedem `sudo nmap ...`, como em
  qualquer Linux. Diferente do Kali "de fábrica", o binário não tem file
  capabilities: elas exigiriam dar `NET_ADMIN` ao contêiner.
- **Wireshark:** rode `sudo wireshark` no terminal (captura exige root).
- **Burp Suite:** na primeira execução, ele mostra os termos de uso da
  PortSwigger. Aceitar é decisão sua. A escolha fica salva em `/home/kali`.
- **Firefox:** o aviso "Some of Firefox's security features may offer less
  protection" é esperado. Dentro do contêiner, o sandbox do Firefox não usa
  user namespaces. Ver "Trocas de segurança" abaixo.
- **Arquivos:** o que ficar em `/home/kali` persiste entre sessões e entre labs
  (volume `kali_home`), inclusive depois de **Resetar**.
- **Atualizar as ferramentas do Kali:** `scripts/lab.sh rebuild dvwa`, no
  terminal. O Kali não tem internet em execução, então `apt install` dentro
  dele não funciona.

## Solução de problemas
- **"Outro laboratório está rodando" (código 5):** pare o outro lab ou use
  **Trocar para este lab**. Contêineres de fora da plataforma precisam ser
  parados no terminal.
- **"Faltam imagens deste lab" (código 3):** rode no terminal
  `scripts/lab.sh pull <lab>` (usa internet).
- **"Outra operação de laboratório está em andamento" (código 4):** espere a
  operação do terminal (ou de outra aba) terminar.
- **"Não foi possível ler o Docker":** o Docker não está rodando no WSL
  (`sudo service docker start` ou abra o Ubuntu de novo).
- **O Kali não abre no painel:** clique em **Reconectar**. Se persistir, veja o
  terminal do `npm run dev` e rode `scripts/lab.sh verify <lab>` (teste 13).
- **Login do Guacamole falha depois de trocar o `.env`:** rode
  `scripts/lab.sh purge dvwa` e suba de novo (apaga o `/home/kali`).
- **Tela preta no Kali:** `docker logs cyberlab-kali-1`; em
  geral basta `scripts/lab.sh reset dvwa` (ou `reset kali`).
- **DVWA pede "Create / Reset Database":** use **Resetar** ou abra
  `http://dvwa/setup.php` no Kali e clique no botão.

## Trocas de segurança aceitas

### Fase 1
- **Kali construído com internet e executado sem ela:** atualizar exige rebuild.
- ~~**O contêiner web do Guacamole tem saída para a internet**~~ —
  **resolvida na Fase 8 (T8):** ele saiu da rede não interna.
- **O `guacd` faz ponte entre `guac_back` e `desktop_net`:** o Kali (que é seu)
  alcança o `guacd`; o DVWA não.
- **VNC sem TLS:** o tráfego fica dentro da `desktop_net` interna.
- **`sudo` sem senha dentro do Kali:** o sandbox é o contêiner (sem
  `privileged`, sem `NET_ADMIN`, sem `docker.sock`).
- **Credenciais padrão do DVWA:** fazem parte do exercício; só o Kali alcança.
- **Sandbox do Firefox reduzido:** sem user namespaces no contêiner. O Firefox
  só navega em alvos do lab (não há internet), e o contêiner continua sendo a
  barreira.
- **nmap sem file capabilities:** preferimos `sudo nmap` a dar `NET_ADMIN` ao
  contêiner inteiro.

### Fase 6 (aprovadas pelo MESQUITA antes da implementação)
- **T1 — O servidor da plataforma controla o Docker.** O Next.js roda como o
  seu usuário, que está no grupo `docker` (no WSL, equivale a root). Uma
  requisição HTTP para `127.0.0.1:3000` pode, então, ligar e desligar labs.
  **Mitigações:**
  - só o `scripts/lab.sh`, executado sem shell (`spawn`), com argumentos de
    uma lista fechada (zod no servidor e no próprio script);
  - nenhum caminho ou comando vem do banco ou do navegador;
  - ambiente mínimo com `CYBERLAB_CALLER=platform`, que faz o script recusar
    `pull`, `rebuild` e `purge`;
  - Server Actions só por POST, com o `Origin` conferido pelo Next.js e pelo
    `proxy.ts`;
  - `X-Forwarded-Host` precisa ser igual ao `Host` (o Next.js o define
    sozinho), e `Host` estranho recebe 403 (DNS rebinding);
  - a rota de status só lê e não tem segredos.

  **Risco que sobra:** uma execução remota de código no próprio Next daria
  acesso ao Docker, mas ela já daria acesso ao seu usuário, que já tem o Docker.
- **T2 — Kali embutido por iframe.** *(Resolvida na Fase 8 pelo T9: o
  `guac-proxy` envia `frame-ancestors`, e outro site não consegue mais embutir
  o Guacamole. O texto abaixo fica como histórico.)* O Guacamole 1.6.0 não envia
  `X-Frame-Options` nem CSP (verificado), então **outro site aberto no
  navegador também poderia embuti-lo** (*clickjacking*). Restringir com
  `frame-ancestors` exigiria mexer no Tomcat da imagem oficial. O filtro
  nativo do Tomcat só oferece `SAMEORIGIN`, que bloquearia a própria
  plataforma (porta 3000 ≠ 8080).

  **Por que o risco é baixo:**
  - o navegador isola o armazenamento do iframe pelo site da aba principal,
    então a sessão aberta na plataforma não existe num iframe dentro de outro
    site (lá só aparece a tela de login);
  - a senha é aleatória;
  - o iframe da plataforma usa `sandbox` (sem navegação da aba principal) e
    `referrerPolicy="no-referrer"`.
- **T3 — Login automático com um usuário restrito.** O servidor lê a senha do
  usuário `plataforma` no `labs/.env` (`PLATFORM_GUAC_PASSWORD`, nunca enviada
  ao navegador), pede um token à API do Guacamole e o põe na URL do iframe
  (`?token=`, aceito pelo webapp 1.6, verificado no código-fonte e na
  prática).
  - O usuário `plataforma` só tem `READ` na conexão do Kali: não lê a senha
    VNC, não cria conexões nem usuários (teste 13).
  - Ele é recriado a cada `up`, sem `--purge`.
  - A senha vai ao `psql` pelo stdin, nunca pela linha de comando.

  **Troca:** o token aparece na URL do iframe (e da "Nova aba") e pode ficar no
  histórico. Ele vale só para esse usuário restrito, expira por inatividade e
  morre quando o lab desce.
- **T4 — Sem terminal web.** O sandbox continua só no terminal do WSL; a
  plataforma só o liga, reseta e desliga.
- **T5 — Verificar o isolamento pela interface.** Roda o mesmo script, que abre
  por alguns segundos uma porta canário no IP `eth0` do WSL; só muda quem o
  dispara.

### Fase 8 (aprovadas pelo MESQUITA antes da implementação)
- **T8 — Proxy na frente do Guacamole, sem NAT.** O Docker só publica porta a
  partir de uma rede **não** interna (confirmado de novo na Fase 8 com o Docker
  29.8: uma rede `--internal` não publica, e o modo de gateway `isolated` exige
  rede interna). Então um contêiner mínimo, o `guac-proxy`
  (`nginxinc/nginx-unprivileged`, oficial da NGINX, fixado por digest), é o
  **único** na `guac_front`. O Guacamole (Tomcat, que guarda a senha do banco)
  foi para a `guac_edge` interna, que só o proxy compartilha. O proxy roda como
  uid 101, com sistema de arquivos só de leitura, `cap_drop: ALL`,
  `no-new-privileges` e `mem_limit: 64m` (usa ~3 MB).
  **Masquerade desligado** (`com.docker.network.bridge.enable_ip_masquerade:
  "false"`): sem NAT, os pacotes do proxy não voltam da internet, e a porta
  publicada continua funcionando, porque o `docker-proxy` conecta a partir do
  host. Era a condição do MESQUITA ("se a tela continuar funcionando"), e foi
  provada pelo teste 12e e pelo navegador (desktop do Kali no iframe, 1024×576).
  **DNS:** o DNS embutido do Docker encaminha nomes desconhecidos pelo
  resolvedor do host, então o proxy resolvia `example.com` mesmo sem NAT. O
  resolvedor externo dele aponta para `127.0.0.1` do próprio contêiner (onde
  nada responde): `guacamole` continua resolvendo e nomes de fora não.
- **T8b — Resíduo aceito: o proxy alcança os endereços do próprio WSL.** Como
  qualquer contêiner numa rede não interna, o `guac-proxy` alcança o IP `eth0`
  do WSL, o gateway da `guac_front` e o DNS do WSL (`10.255.255.254`, que fica
  na `lo` do WSL com escopo global e responde consultas de fora). Ou seja: um
  nginx comprometido ainda conseguiria resolver nomes (canal de DNS),
  embora não abra conexões para a internet. **Por que o risco é baixo:** o
  proxy só recebe tráfego do seu navegador em `127.0.0.1`, não guarda segredo
  nenhum, não alcança Kali, alvos, `guacd` nem bancos, e nada mais escuta fora
  do loopback no WSL (auditoria A1). Antes da Fase 8, o Guacamole inteiro tinha
  internet. **Como fechar de vez (decisão sua, não feita):**
  `dnsTunneling=false` na seção `[wsl2]` do `.wslconfig` (muda o DNS do WSL
  inteiro; testar VPN e `apt` depois) ou uma regra `iptables` no host (exige
  `sudo` a cada boot do WSL). A verificação imprime o estado como `INFO` em
  cada execução, então uma mudança aparece.
- **T8c — Janela de bloqueio do Guacamole em 60 s.** A extensão de força bruta
  do Guacamole bloqueia **o endereço** depois de 5 logins errados, e todas as
  requisições chegam de um só endereço (o proxy; antes, o `docker-proxy`). Cada
  verificação faz de propósito um login errado (12d), então cinco
  verificações em 5 min bloqueavam a própria plataforma. As 5 tentativas
  continuam; a janela e o bloqueio caíram de 300 para 60 s
  (`BAN_ADDRESS_DURATION`). Com senhas aleatórias de 20+ caracteres e acesso
  só por `127.0.0.1`, isso não muda o risco na prática.
- **T9 — `frame-ancestors` no Guacamole.** O `guac-proxy` envia
  `Content-Security-Policy: frame-ancestors http://127.0.0.1:3000
  http://localhost:3000`, mais `X-Content-Type-Options: nosniff` e
  `Referrer-Policy: no-referrer`. Testado num Chromium: uma página em outra
  origem (`127.0.0.1:9999`) não consegue embutir o Guacamole, e a plataforma
  continua mostrando o desktop. Fecha a T2.
- **T10 — Cabeçalhos de segurança na plataforma.** `next.config.ts` envia, em
  todas as rotas, `X-Frame-Options: DENY`, `Content-Security-Policy:
  frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer` e `Permissions-Policy` (câmera, microfone,
  localização, pagamento, USB desligados). Sem isso, uma página maliciosa
  poderia embutir a plataforma e induzir um clique em "Resetar" ou "Trocar
  lab" (*clickjacking*), e a Server Action sairia com o `Origin` legítimo.
- **T10b — CSP completa fica de fora.** Uma CSP com `script-src` por *nonce*
  exigiria gerar o nonce em cada requisição no `proxy.ts` e tornaria todas as
  páginas dinâmicas. Numa aplicação que só fala com `127.0.0.1` e não exibe
  conteúdo de terceiros, o ganho não paga o custo.

### Fase 7 (aprovadas pelo MESQUITA antes da implementação)
- **T6 — Imagens de terceiros adicionais (Juice Shop, WebGoat, Vulhub).** São
  projetos consagrados, vulneráveis-por-design. **Mitigações:** todas as imagens
  são **fixadas por digest** (`@sha256:`); os alvos ficam só na `lab_net`
  interna (sem internet, sem acesso ao host); nenhum publica porta; `restart:
  "no"` e `no-new-privileges`. O risco é equivalente ao do DVWA, já aceito.
- **T7 — Vulhub sem portas publicadas e porta interna 8080 do WebGoat.** O
  compose original do Vulhub publica portas no host; nós **as removemos** e
  expomos o alvo só na `lab_net`. O WebGoat usa a porta **8080 por dentro do
  contêiner** — o mesmo número do Guacamole —, mas **não** publica porta, então
  não há conflito no host: a única porta publicada continua sendo
  `127.0.0.1:8080` (Guacamole). O alvo provisório do `vulhub` é reconstruído
  **sobre a imagem oficial `httpd:2.4.49`** (fixada por digest), aplicando só as
  duas configurações erradas que a CVE-2021-41773 exige — não há exploit sob
  medida (ver `labs/vulhub/Dockerfile`).

## linux-sandbox (módulo 0.3)

Contêiner de prática **sem nenhuma vulnerabilidade**: só guarda os arquivos das
missões do módulo 0.3. Fica em `labs/linux-sandbox/` (projeto Compose
`cyberlab-sandbox`). Liga, reseta e desliga pela plataforma (painel do módulo
0.3 ou **Laboratórios**) ou pelo terminal:

```bash
npm run lab:sandbox             # sobe (se preciso) e abre um shell como "aluno"
npm run lab:sandbox -- reset    # descarta o contêiner e começa do zero
npm run lab:sandbox -- down     # desliga
npm run lab:sandbox -- verify   # prova o isolamento (17 testes)
npm run lab:sandbox -- rebuild  # reconstrói a imagem (usa internet)
```

**Isolamento:**
- `network_mode: none`: só a interface de loopback. Sem internet, sem rede local,
  sem acesso ao host nem a outros contêineres; nenhuma porta publicada.
- Usuário `aluno` (UID 1000), **sem `sudo`** (nem instalado), todas as
  *capabilities* removidas (`cap_drop: ALL`), `no-new-privileges`, sem
  `privileged` e sem `docker.sock`.
- `mem_limit: 128m`, `pids_limit: 128`, `restart: "no"`.
- Descartável: o `reset` recria o contêiner a partir da imagem.
- Conta na regra de um lab por vez, como os outros.

**Imagem:** `debian:trixie-slim` fixada por digest. O Dockerfile devolve as man
pages que a variante slim remove, porque o módulo ensina `man`. As missões são
geradas no build por `missions/build-missions.sh`, de forma determinística (as
saídas citadas no módulo são sempre as mesmas).

**Troca aceita:** as flags do 0.3 estão em texto claro em
`labs/linux-sandbox/missions/build-missions.sh`, porque precisam existir dentro
do lab. A plataforma só guarda os hashes. Numa plataforma pessoal, o único risco
é "colar" de si mesmo.

**Validação:** 17/17 PASS na Fase 4 e de novo na Fase 6 (também pela interface).
Os controles positivos (bash roda, missões existem) garantem que os "blocked"
(internet, DNS, host Docker, `sudo`, `docker.sock`) são reais.

## Estratégia de Windows / Active Directory (decidida na Fase 7)

A Trilha 7 (Active Directory) foi analisada de novo na Fase 7, dentro do limite
de **16 GB** (VM do WSL com ~7,9 GB úteis; o pico do lab atual é ~1,5 GB).
**Decisão do MESQUITA: opção C — adiar.** Nenhum lab de AD é construído; a
trilha segue como **teoria + walkthrough guiado**, como já decidido na Fase 0.
As três opções comparadas:

| Opção | O que é | RAM (VM + Kali) | Veredito |
|---|---|---|---|
| **A — GOAD-Mini** | *Game of Active Directory* reduzido: ~2 VMs Windows (DC + servidor), lab de AD consagrado. | **~8–10 GB** só nas VMs + Kali → estoura os 16 GB. | **Desaconselhada.** Exige trocar Docker/Guacamole por VMs, muda as regras de isolamento e tem alto risco de *thrashing*. |
| **B — VM de domínio único** | Uma VM Windows Server como DC único, populada com usuários/SPNs vulneráveis; Kali ataca de fora. | **~6–6,5 GB** (VM ~4–5 GB + Kali ~1,5 GB). Cabe, apertado. | **Possível no futuro**, em fase própria. Cobre o essencial (Kerberoasting, AS-REP, pass-the-hash num DC), mas sem movimento lateral entre máquinas e ainda é VM (nova base de isolamento a documentar). |
| **C — Adiar (teoria + walkthrough)** ✅ | A decisão da Fase 0: conceitos + walkthrough guiado sobre dados de exemplo (dumps, saídas salvas, BloodHound sobre grafo fornecido). | **0 GB adicional.** | **Escolhida.** Sem risco de RAM, sem mudar a arquitetura; entrega a teoria completa de AD e concentra o esforço nos labs Docker que cabem com folga. |

**Troca aceita (futuro, se a opção B for adotada):** VMs passam a ser uma nova
base de isolamento, com seção própria neste documento (rede de VMs, não redes
Docker internas), teto de memória no `.wslconfig` e o AD rodando como lab
exclusivo. **Nada disso foi construído na Fase 7.**

## Validar o isolamento dos labs da Fase 7

Os novos labs entram no mesmo `scripts/lab.sh verify <lab>`, que foi estendido
para os seus alvos (controles positivos de HTTP por alvo e sondas de porta). Como
as imagens ainda não foram baixadas, a validação fica pendente do `pull`:

```bash
scripts/lab.sh pull juice-shop     # idem: webgoat, vulhub, rede-de-alvos
scripts/lab.sh up juice-shop
scripts/lab.sh verify juice-shop   # espera-se todos PASS, código 0
scripts/lab.sh down juice-shop
```

> **Pendente de execução no terminal (precisa de internet para o `pull`):** os
> resultados PASS/FAIL e as medições de RAM dos labs da Fase 7 serão anexados
> aqui e em [`MEDICOES-RAM.md`](MEDICOES-RAM.md) depois da primeira subida. Até
> lá, os números de RAM no catálogo são **estimativas**, não medições.

## Memória
Consumo medido e recomendações para o WSL: [`MEDICOES-RAM.md`](MEDICOES-RAM.md).
Resumo: cerca de 0,6 GB com o lab `dvwa` ocioso (0,45 GB no `kali`) e cerca de
1,5 GB no pico. O maior risco é o page cache do WSL depois de builds
(`wsl --shutdown` resolve).
