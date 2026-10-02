# Medições de RAM — laboratórios

Consumo **real** da pilha Guacamole + Kali (XFCE) + DVWA (lab `dvwa`), medido em
2026-09-30 com `scripts/lab-measure-ram.sh`, e do lab `kali` (sem alvo), medido
na Fase 6.

## Ambiente medido

| Item | Valor |
|---|---|
| RAM física | 16 GB (Windows enxerga **14.021 MB**; o resto é reservado pelo hardware) |
| Limite da VM do WSL2 | 7.945 MB (padrão do WSL; sem `.wslconfig`) + 4 GB de swap — **desde então, `memory=6GB` (ver Fase 8)** |
| Docker | Engine 29.8.1 nativo no WSL (sem Docker Desktop), Compose v5.5.1 |
| Rede do WSL | `nat` |
| Imagens | `cyberlab/kali-xfce:local` 3,85 GB · guacamole 1.6.0 1,12 GB · dvwa 852 MB · mariadb 11 458 MB · postgres 16 420 MB · guacd 1.6.0 377 MB |

## Como ler os números

**`docker stats`** mostra quanto cada contêiner usa, sem contar cache.

**`free -m` → `used`** é a memória realmente ocupada dentro da VM do WSL,
também sem cache. **É a melhor medida do custo do lab.**

**`vmmemWSL`** é quanto a VM inteira do WSL ocupa no Windows. Inclui o **page
cache** do Linux (arquivos lidos recentemente, como as camadas das imagens). O
WSL não devolve esse cache ao Windows por conta própria, então esse número sobe
depois de builds e pulls e **não** reflete o consumo do lab (ver
"Achado importante" abaixo).

## Cenários

- **A — Linha de base:** Docker ligado, lab desligado.
- **B — Ocioso:** lab no ar e **uma sessão real do Guacamole aberta** no desktop
  do Kali, parada.
- **C — Pico realista:** a sessão aberta mais Firefox no DVWA, Burp Suite
  (JVM carregada), `sqlmap --dump` e `nmap -sS -sV -sC -O -p-` rodando ao mesmo
  tempo. São 4 amostras; a tabela usa a maior.

### Por contêiner (MiB, `docker stats`)

| Contêiner | Limite | B — ocioso | C — pico |
|---|---:|---:|---:|
| `kali` | 3072 | 200 | **1112** |
| `guacamole` | 768 | 192 | 193 |
| `dvwa-db` | 256 | 91 | 92 |
| `guacd` | 256 | 24 | 25 |
| `guac-db` | 256 | 23 | 24 |
| `dvwa` | 256 | 15 | 20 |
| **Total** | **4864** | **≈ 545** | **≈ 1465** |

### Visão da VM e do Windows

| Cenário | WSL `used` | Custo do lab (vs. A) | `vmmemWSL` | Windows livre |
|---|---:|---:|---:|---:|
| A — base, antes de qualquer build | 722 MB | — | 1.077 MB | 6.245 MB |
| A — base, depois dos builds | 930 MB | — | 7.288 MB ⚠️ | 1.216 MB ⚠️ |
| B — ocioso | 1.533 MB | **≈ +0,6 GB** | 6.978 MB | 1.518 MB |
| C — pico | 2.277 MB | **≈ +1,35 GB** | 7.392 MB | 1.095 MB |

## Conclusões

1. **O lab cabe com folga.** No pico, a pilha inteira usa cerca de 1,5 GB, e a
   VM do WSL fica em 2,3 GB `used` de 7,9 GB disponíveis.
2. **O Kali é quase todo o custo variável.** Firefox (cerca de 360 MB mais os
   processos de conteúdo) e a JVM do Burp dominam. O restante da pilha é
   estável em torno de 350 MB.
3. **Os limites (`mem_limit`) ficam como estão.** Eles são tetos, não reservas.
   A soma deles (4.864 MiB) é menor que a VM do WSL (7.945 MB), então nem no
   pior caso o lab sozinho esgota o WSL. O Kali tem cerca de 1,9 GiB de folga
   sobre o pico medido.
4. **Limitação da medição do Burp:** na primeira execução, o Burp para na tela
   de termos de uso (EULA) da PortSwigger. Não aceitei os termos em seu nome,
   então a JVM foi medida carregada, mas **sem o proxy interceptando tráfego**.
   Com o proxy ativo e histórico acumulado, espere algumas centenas de MB a
   mais (estimativa, não medida). Para medir de novo depois de aceitar:
   `scripts/lab-measure-ram.sh "C — Burp com proxy ativo"`.

## Fase 6 — lab `kali` (Kali sem alvo)

Medido em 2026-10-01 com o lab ligado **pela plataforma** e uma sessão real do
Guacamole aberta no painel (Chromium headless), parada.

| Contêiner | Limite | B — ocioso |
|---|---:|---:|
| `kali` | 3072 | 209 |
| `guacamole` | 768 | 206 |
| `guac-db` | 256 | 26 |
| `guacd` | 256 | 17 |
| **Total** | **4352** | **≈ 457** |

- Bate com a estimativa (pilha da Fase 1 menos o DVWA e o banco dele, cerca de
  106 MiB a menos). O pico não foi medido de novo: ele vem do Kali (Firefox,
  Burp), que é o mesmo, então fica em cerca de 1,35 GB.
- Nesta medição, a VM do WSL tinha **5.929 MB** (na Fase 1, 7.945 MB). O
  `used` do WSL (2.405 MB) inclui o `npm run dev` e o Chromium do teste, então
  não é comparável ao da tabela da Fase 1.

## Fase 8 — proxy do Guacamole e `.wslconfig`

- **`guac-proxy` (nginx, T8):** 2,7 MiB ociosos com o lab `dvwa` no ar
  (`docker stats`, 2026-10-01), com teto de 64 MiB. Não muda o total da pilha.
- **`.wslconfig`** (conferido em 2026-10-01): `memory=6GB`, `swap=4GB`,
  `processors=4` e, em `[experimental]`, `sparseVhd=true` e
  `autoMemoryReclaim=gradual`. O `sparseVhd` só vale para discos criados
  depois; o disco atual é tratado por `scripts/windows/compact-wsl.ps1`
  (ver [`MANUTENCAO.md`](MANUTENCAO.md)).

## Fase 7 — labs novos (estimativas; medição pendente)

Os labs da Fase 7 (`juice-shop`, `webgoat`, `vulhub`, `rede-de-alvos`) **ainda
não foram medidos**: as imagens precisam ser baixadas no terminal
(`scripts/lab.sh pull <lab>`, único momento com internet) e cada lab subido uma
vez. Os números abaixo são **estimativas** a partir dos tamanhos de imagem e da
pilha base já medida (Guacamole + Kali ≈ 0,35 GB ociosa; o Kali domina o pico
com ≈ 1,35 GB). O pico de cada lab é ditado pelo Kali, que é o mesmo em todos.

| Lab | Alvo(s) | Estimativa ociosa | Estimativa de pico | Observação |
|---|---|---:|---:|---|
| `juice-shop` | Juice Shop (Node.js) | ≈ 0,7 GB | ≈ 1,5 GB | Estado em memória; reset = recriar o contêiner. |
| `rede-de-alvos` | DVWA + Juice Shop | ≈ 0,8 GB | ≈ 1,6 GB | Dois alvos na mesma `lab_net`. |
| `webgoat` | WebGoat (JVM) | ≈ 0,9 GB | ≈ 1,7 GB | A JVM pesa mais no ocioso. |
| `vulhub` | Apache 2.4.49 (provisório) | ≈ 0,5 GB | ≈ 1,4 GB | Alvo leve; imagem construída localmente. |

Todas as estimativas ficam **bem abaixo** dos ~7,9 GB da VM do WSL, respeitando
a regra de **um lab por vez**. Para medir de verdade, com o lab no ar:
`scripts/lab-measure-ram.sh "<cenário>"`. Substituir esta seção pelas medições
reais quando o `pull` for feito.

## Achado importante: o cache do WSL aperta o Windows

Depois de baixar as imagens e construir o Kali, o page cache inflou a VM do
WSL para **cerca de 7,3 GB no Windows**, e o Windows ficou com **cerca de 1,1 GB
livre**, mesmo com o lab parado. Com 14 GB visíveis, esse é o verdadeiro risco
para os 16 GB. O lab em si não é o problema.

**Alívio imediato (sem mudar configuração):** depois de builds ou pulls grandes,
rode no PowerShell do Windows `wsl --shutdown` e reabra o Ubuntu. A memória
volta para o Windows.

**Recomendação (aplicada pelo MESQUITA; conferida na Fase 8):** criar
`C:\Users\<você>\.wslconfig` com:

```ini
[wsl2]
# Teto da VM: o pico medido do lab é ~2,3 GB; 6 GB deixa folga para builds
# e devolve ~2 GB ao Windows em relação ao padrão.
memory=6GB

[experimental]
# Devolve o page cache ao Windows automaticamente (confira o nome da opção
# na documentação da sua versão do WSL: `wsl --version`).
autoMemoryReclaim=dropCache
```

Depois, rode `wsl --shutdown` para aplicar e meça de novo com os três cenários.

## Dados brutos

<details>
<summary>Saídas completas do <code>scripts/lab-measure-ram.sh</code></summary>

### A — linha de base antes dos builds (coleta manual, mesmas fontes)
```
# free -m
               total        used        free      shared  buff/cache   available
Mem:            7945         722        6778           4         592        7223
Swap:           4096           0        4096
# Windows
vmmemWSL: 1077 MB
Windows total: 14021 MB, free: 6245 MB
```

### A — linha de base depois dos builds — 2026-09-30 16:22:57
```
(no lab containers running)
               total        used        free      shared  buff/cache   available
Mem:            7945         930          92           4        7119        7015
Swap:           4096           0        4095
vmmemWSL: 7288 MB
Windows total: 14021 MB, free: 1216 MB
```

### B — ocioso — 2026-09-30 16:48:59
```
NAME                   MEM USAGE / LIMIT   MEM %     CPU %
cyberlab-guacamole-1   192.2MiB / 768MiB   25.03%    1.10%
cyberlab-dvwa-1        15.18MiB / 256MiB   5.93%     0.01%
cyberlab-kali-1        199.6MiB / 3GiB     6.50%     1.90%
cyberlab-guacd-1       23.75MiB / 256MiB   9.28%     1.10%
cyberlab-dvwa-db-1     90.84MiB / 256MiB   35.48%    0.01%
cyberlab-guac-db-1     23.31MiB / 256MiB   9.11%     0.02%
               total        used        free      shared  buff/cache   available
Mem:            7945        1533         800          29        5880        6411
Swap:           4096           0        4095
vmmemWSL: 6978 MB
Windows total: 14021 MB, free: 1518 MB
```

### C — pico, amostra 1 (maior) — 2026-09-30 16:49:43 — rodando: sqlmap, firefox, burp
```
NAME                   MEM USAGE / LIMIT   MEM %     CPU %
cyberlab-guacamole-1   193.1MiB / 768MiB   25.15%    0.62%
cyberlab-dvwa-1        19.79MiB / 256MiB   7.73%     0.35%
cyberlab-kali-1        1.086GiB / 3GiB     36.21%    3.45%
cyberlab-guacd-1       24.59MiB / 256MiB   9.60%     0.99%
cyberlab-dvwa-db-1     92.07MiB / 256MiB   35.97%    0.23%
cyberlab-guac-db-1     23.47MiB / 256MiB   9.17%     0.00%
               total        used        free      shared  buff/cache   available
Mem:            7945        2277          78          39        5820        5668
Swap:           4096           0        4095
vmmemWSL: 7392 MB
Windows total: 14021 MB, free: 1095 MB
```

### C — pico, amostra 4 — 2026-09-30 16:50:45 — rodando: nmap, sqlmap, firefox, burp
```
NAME                   MEM USAGE / LIMIT   MEM %     CPU %
cyberlab-guacamole-1   194.4MiB / 768MiB   25.31%    0.69%
cyberlab-dvwa-1        20.15MiB / 256MiB   7.87%     0.01%
cyberlab-kali-1        1.034GiB / 3GiB     34.46%    1.92%
cyberlab-guacd-1       24.5MiB / 256MiB    9.57%     0.98%
cyberlab-dvwa-db-1     92.04MiB / 256MiB   35.95%    0.01%
cyberlab-guac-db-1     23.62MiB / 256MiB   9.23%     0.00%
               total        used        free      shared  buff/cache   available
Mem:            7945        2249         135          39        5791        5696
Swap:           4096           0        4095
vmmemWSL: 7332 MB
Windows total: 14021 MB, free: 1133 MB
```

As amostras 2 e 3 (16:50:04 e 16:50:25) ficaram entre essas duas: Kali com
1.016 GiB e 1007 MiB; WSL `used` 2.205 e 2.161 MB.

### Fase 6 — lab kali, ocioso
```
# docker stats (containers of project cyberlab)
NAME                   MEM USAGE / LIMIT   MEM %     CPU %
cyberlab-guacamole-1   205.7MiB / 768MiB   26.78%    0.98%
cyberlab-guacd-1       16.86MiB / 256MiB   6.58%     0.95%
cyberlab-kali-1        208.7MiB / 3GiB     6.79%     4.30%
cyberlab-guac-db-1     25.92MiB / 256MiB   10.13%    0.02%

# free -m (inside the WSL VM)
               total        used        free      shared  buff/cache   available
Mem:            5929        2405         895         140        2951        3523
Swap:           4096           0        4095

# Windows view (vmmemWSL = what the whole WSL VM costs the PC)
vmmemWSL: 4893 MB
Windows total: 14021 MB, free: 1604 MB
```
</details>
