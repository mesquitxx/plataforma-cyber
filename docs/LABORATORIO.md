# Laboratório — subir, descer e validar o isolamento

Dois laboratórios, sempre **um ativo por vez**:

- **Pilha da Fase 1** (Trilha 2 em diante): um desktop Kali no navegador, via
  Apache Guacamole, atacando o DVWA. Descrita a partir de "Arquitetura".
- **`linux-sandbox`** (Fase 4, módulo 0.3): um contêiner Debian sem rede para
  treinar o terminal. Descrito em "linux-sandbox", no fim deste documento.

## Arquitetura

```
 Navegador (Windows) ──► http://127.0.0.1:8080/guacamole/
                              │
                    ┌─────────▼─────────┐  guac_front (única rede não interna,
                    │ guacamole (web)   │  exigida pelo Docker para publicar porta)
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

| Serviço | Papel | Redes |
|---|---|---|
| `guacamole` | Interface web (Tomcat) — o que você abre no navegador | `guac_front`, `guac_back` |
| `guacd` | Proxy que converte VNC para o protocolo do Guacamole | `guac_back`, `desktop_net` |
| `guac-db` | PostgreSQL com usuários e conexões do Guacamole | `guac_back` |
| `kali` | Attack box: XFCE + TigerVNC + nmap, Burp, sqlmap, Wireshark, Firefox | `desktop_net`, `lab_net` |
| `dvwa` | Alvo vulnerável-por-design | `lab_net`, `dvwa_back` |
| `dvwa-db` | MariaDB do DVWA | `dvwa_back` |

**Garantias de isolamento:**
- **Redes internas** (`internal: true`): não têm gateway nem NAT, então o
  contêiner não tem rota para fora. Isso vale para Kali, DVWA e os bancos.
- **`inhibit_ipv4`** nas bridges internas: o host não ganha IP nessas redes,
  então nem o "IP de gateway" da bridge serve como porta para o PC.
- **Uma única porta publicada:** `127.0.0.1:8080` (Guacamole). O VNC (5901), o
  DVWA (80) e os bancos não são publicados.
- **Segmentação:** o DVWA não enxerga `guacd`, `guac-db` nem `guacamole` (nem
  resolve os nomes). O Kali enxerga o `guacd` (necessário para a tela), mas
  não os bancos nem a interface web.
- **Sem `privileged` e sem `docker.sock`** em nenhum contêiner; todos, exceto
  o Kali, rodam com `no-new-privileges`.
- **`restart: "no"`:** o lab nunca sobe sozinho com o Windows.

## Pré-requisitos
- Docker Engine e Docker Compose v2 dentro do WSL (testado com Engine 29.8.1 e
  Compose v5.5.1).
- Cerca de 8 GB livres em disco para as imagens (a do Kali é a maior).
- Nenhum outro laboratório rodando (o `lab-up.sh` recusa subir se houver).

## Subir

```bash
scripts/lab-up.sh
```

**Na primeira vez:**
1. gera `labs/.env` com senhas aleatórias (arquivo fora do git);
2. constrói a imagem do Kali (vários minutos; é o **único momento** com
   internet);
3. sobe tudo e espera os healthchecks;
4. cria as tabelas do DVWA.

**Depois:**
1. Abra **http://127.0.0.1:8080/guacamole/** no navegador do Windows.
2. Faça login como `guacadmin`, com a senha `GUAC_ADMIN_PASSWORD` do `labs/.env`
   (`grep GUAC_ADMIN labs/.env`). A senha padrão `guacadmin` **não** funciona.
3. Clique em **"Kali (attack box)"**.
4. No Kali, abra o Firefox em **http://dvwa/** e entre com `admin` / `password`.

**Dicas:**
- **Área de transferência:** `Ctrl+Alt+Shift` abre o menu do Guacamole.
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
- **Arquivos:** o que ficar em `/home/kali` persiste entre sessões (volume
  `kali_home`).
- **Atualizar as ferramentas do Kali:** `scripts/lab-up.sh --rebuild`. O Kali
  não tem internet em execução, então `apt install` dentro dele não funciona.

## Descer

```bash
scripts/lab-down.sh           # para e remove contêineres e redes; mantém os dados
scripts/lab-down.sh --purge   # também apaga os volumes (bancos e /home/kali)
```

Use `--purge` depois de trocar senhas no `labs/.env`: os bancos só leem as
senhas na primeira inicialização.

## Validar o isolamento

Com o lab no ar:

```bash
scripts/lab-verify-isolation.sh
```

O script faz **tentativas reais de conexão** e imprime PASS/FAIL. A coluna
`EXPECT` diz se a tentativa **deve funcionar** (`ok`) ou **deve falhar**
(`blocked`). Ele só termina com código 0 se todos os testes passarem.

| ID | O que prova | Como |
|---|---|---|
| 1 | Sem internet por TCP | DVWA e Kali tentam `1.1.1.1:443` e `8.8.8.8:53` |
| 2 | Sem internet por DNS (sem exfiltração via DNS) | `getent hosts example.com` |
| 3 | Sem rota de saída | Nenhuma rota padrão em `/proc/net/route`; bridges internas sem IPv4 no host |
| 4 | Alvo não alcança o PC | **Canário**: o script abre uma porta no IP `eth0` do WSL e no gateway da `guac_front`. O próprio host conecta (controle); DVWA e Kali não. Também testa `docker0` e o DNS do WSL (`10.255.255.254`). |
| 5 | Alvo não alcança o Windows | DVWA tenta portas 135/445/3389 do IP do Windows |
| 7 | Alvo não enxerga a infraestrutura | DVWA não resolve `guacamole`, `guacd`, `guac-db`, `host.docker.internal`; Kali não resolve os bancos nem a interface web |
| 8 | Redes marcadas como internas | `docker network inspect` → `Internal: true` |
| 9 | Só loopback | Única porta publicada é `127.0.0.1:8080`; nada em `0.0.0.0:8080` no WSL; a 8080 não responde no IP `eth0` do WSL; no Windows, a 8080 só escuta em `127.0.0.1`/`::1` |
| 11 | **Controle positivo:** o lab funciona | Kali acessa `http://dvwa/` |
| 12 | **Controle positivo:** a tela funciona | Guacamole responde; `guacd` alcança o VNC do Kali; login com a senha do `.env` funciona e com `guacadmin/guacadmin` falha |

Os controles positivos (11 e 12, mais as sondas do grupo 0) são essenciais.
Sem eles, "tudo bloqueado" poderia significar apenas que a rede está quebrada
ou que falta uma ferramenta no contêiner.

### Teste do teste (opcional)
Para ver o script **pegar** uma quebra de isolamento, ligue o DVWA de propósito
à rede padrão do Docker (que tem internet), rode o script e desfaça:

```bash
docker network connect bridge cyberlab-dvwa-1
scripts/lab-verify-isolation.sh      # esperado: FAILs no DVWA, código 1
docker network disconnect bridge cyberlab-dvwa-1
```

Na Fase 1, esse teste deu 7 FAILs (internet, DNS, rota e canários) e voltou a
48/48 depois de desfeito.

### Teste manual (outro aparelho)
1. No Windows, descubra o IP da rede local: `ipconfig` (ex.: `192.168.0.10`).
2. Do celular, na mesma Wi-Fi, abra `http://192.168.0.10:8080/guacamole/`.
3. **Esperado:** a página não carrega.

### Testes manuais extras (de dentro do Kali, via Guacamole)

```bash
ping -c 2 1.1.1.1            # "Network is unreachable"
curl -m 5 https://example.com  # falha de DNS
nmap -sV dvwa                # funciona: 80/tcp aberto
```

## Solução de problemas
- **"Other containers are running":** pare o outro lab/contêiner primeiro
  (regra de 1 lab por vez).
- **Login do Guacamole falha depois de trocar o `.env`:** rode
  `scripts/lab-down.sh --purge` e suba de novo.
- **Tela preta no Kali:** `docker compose -f labs/compose.yaml logs kali`; em
  geral basta `scripts/lab-down.sh && scripts/lab-up.sh`.
- **DVWA pede "Create / Reset Database":** abra `http://dvwa/setup.php` no Kali
  e clique no botão.

## Trocas de segurança aceitas nesta fase
- **Kali construído com internet e executado sem ela:** atualizar exige rebuild.
- **O contêiner web do Guacamole tem saída para a internet:** a rede
  `guac_front` precisa ser não interna para publicar a porta. Ele não fica
  exposto ao alvo; restringir essa saída fica para o hardening (Fase 10).
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

## linux-sandbox (módulo 0.3)

Contêiner de prática **sem nenhuma vulnerabilidade**: só guarda os arquivos das
missões do módulo 0.3. Fica em `labs/linux-sandbox/` (projeto Compose
`cyberlab-sandbox`) e é controlado por `scripts/lab-sandbox.sh`.

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
- Recusa subir se houver contêineres de outro projeto Compose rodando (e o
  `lab-up.sh` recusa subir com o sandbox no ar): regra de um lab por vez.

**Imagem:** `debian:trixie-slim` fixada por digest. O Dockerfile devolve as man
pages que a variante slim remove, porque o módulo ensina `man`. As missões são
geradas no build por `missions/build-missions.sh`, de forma determinística (as
saídas citadas no módulo são sempre as mesmas).

**Troca aceita:** as flags do 0.3 estão em texto claro em
`labs/linux-sandbox/missions/build-missions.sh`, porque precisam existir dentro
do lab. A plataforma só guarda os hashes. Numa plataforma pessoal, o único risco
é "colar" de si mesmo.

**Validação (Fase 4):** `npm run lab:sandbox -- verify` deu 17/17 PASS. Os
controles positivos (bash roda, missões existem) garantem que os "blocked"
(internet, DNS, host Docker, `sudo`, `docker.sock`) são reais.

## Memória
Consumo medido e recomendações para o WSL: [`MEDICOES-RAM.md`](MEDICOES-RAM.md).
Resumo: cerca de 0,6 GB com o lab ocioso e cerca de 1,5 GB no pico. O maior
risco é o page cache do WSL depois de builds (`wsl --shutdown` resolve).
