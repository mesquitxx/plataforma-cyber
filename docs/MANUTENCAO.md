# Manutenção — backup, restauração e espaço em disco

Rotinas da Fase 8: guardar e recuperar o progresso (decisões D2, D3 e D4) e
devolver ao Windows o espaço que o WSL e o Docker liberam (D5). Tudo roda
**só pelo terminal**; a plataforma não tem botão para nada disto.

## Backup do progresso (SQLite)

O progresso (módulos, tarefas, tentativas de flag e de quiz) mora em
`data/plataforma.db`, dentro do disco virtual do WSL. Se esse disco se perder,
por um `wsl --unregister`, uma corrupção ou uma compactação mal sucedida, o
progresso vai junto. Por isso existem duas cópias:

| Onde | O quê |
|---|---|
| `data/backups/` (WSL, fora do git) | Os 10 backups mais recentes do banco, mais os `pre-restore-*` e os 3 `lab-*` mais recentes. |
| `C:\Users\mesqa\Documents\plataforma-cyber-backups\` (Windows, D2) | A mesma coisa, com a mesma rotação. Sobrevive a qualquer problema do WSL. |

O caminho do Windows vem da pasta **Documentos** do Windows. Para usar outro
lugar, defina `BACKUP_WINDOWS_DIR` com um caminho do WSL (ex.: `/mnt/d/backups`).

### Automático (D4)
Toda vez que você roda `npm run dev`, o `predev` faz um backup **se o mais novo
tiver 24 horas ou mais** e o copia para o Windows. Leva menos de 1 segundo. Se
algo falhar (por exemplo, o Windows inacessível), ele só mostra um aviso e o
`npm run dev` sobe normalmente.

### Manual

```bash
npm run db:backup                 # backup agora, em data/backups/
npm run db:backup -- --windows    # backup agora + cópia no Windows
npm run db:backup -- --list       # lista os backups (WSL e Windows) com as contagens
```

O backup usa a API de backup do SQLite: é seguro **com a plataforma rodando**.
Cada cópia é conferida com `PRAGMA integrity_check` antes de ser guardada, e o
nome traz a hora local (`plataforma-20261001-213809.db`).

### Restaurar

```bash
npm run db:backup -- --list                                   # escolha um
npm run db:restore -- plataforma-20261001-213809.db --yes     # nome em data/backups/ ou um caminho
npm run db:restore -- /mnt/c/Users/mesqa/Documents/plataforma-cyber-backups/plataforma-20261001-213809.db --yes
```

O `db:restore`:
- **recusa** se a plataforma estiver rodando (pare o `npm run dev` antes);
- **recusa** um arquivo corrompido, um backup feito por uma versão **mais nova**
  do código e um backup com outra história de migrações;
- salva o banco atual como `data/backups/pre-restore-plataforma-<hora>.db`
  antes de trocar (esses nunca são apagados automaticamente);
- troca o arquivo de forma atômica e aplica as migrações: um backup antigo sobe
  sozinho para o schema atual (testado com um backup da Fase 3).

Depois de restaurar um backup **antigo**, rode `npm run db:seed` e
`npm run content:ingest` para atualizar o conteúdo; o progresso fica.

## Backup do `/home/kali` e do `labs/.env` (D3)

O que você guarda no Kali (anotações, wordlists, configurações do Burp e do
Firefox) fica no volume `cyberlab_kali_home`. O `labs/.env` guarda as senhas
aleatórias dos labs; sem ele, o login no Guacamole falha.

```bash
scripts/lab.sh backup-home                                   # com todos os labs desligados
scripts/lab.sh restore-home lab-20261001-213810 --yes        # devolve o /home/kali
scripts/lab.sh restore-home lab-20261001-213810 --yes --with-env   # ...e o labs/.env
```

- Gera `data/backups/lab-<hora>/` com `kali-home.tar.gz`, `labs.env` (modo
  `600`) e `SHA256SUMS`, e copia a pasta para o Windows. Guarda os 3 mais
  recentes.
- Fica **de fora** o que se refaz sozinho: `.cache` e o navegador embutido do
  Burp (`.BurpSuite/burpbrowser`, ~660 MB, que vem dentro do `burpsuite.jar` e
  é reextraído na primeira execução). O backup fica em torno de 0,5 MB.
- Roda num contêiner descartável **sem rede**, com o volume montado só para
  leitura (no backup) e com a imagem local do Kali (`--pull never`).
- `restore-home` confere os checksums e **substitui tudo** no `/home/kali`. Com
  `--with-env`, guarda o `.env` atual como `labs/.env.before-restore-<hora>`.
- Os dois recusam se um lab com desktop estiver rodando, e a plataforma não
  consegue chamá-los (código 6).

**Troca aceita (D3):** as senhas dos labs (aleatórias, só locais) passam a
existir também no disco do Windows, dentro de `plataforma-cyber-backups\`.

## Espaço em disco

O WSL guarda tudo num disco virtual, o `ext4.vhdx`
(`C:\Users\mesqa\AppData\Local\wsl\{...}\ext4.vhdx`). Ele **cresce sozinho e
não encolhe sozinho**: apagar imagens Docker libera espaço dentro do WSL, mas o
Windows só recebe esse espaço de volta depois de um `fstrim` com o disco
**esparso** (*sparse*) ou de uma compactação.

Medido em 2026-10-01: VHDX com 23,6 GB, não esparso; WSL com ~19 GB usados.
`docker builder prune` (via `disk-cleanup.sh --apply`) liberou 3,7 GB dentro do
WSL.

### Quando rodar
- depois de `scripts/lab.sh pull` ou `rebuild` (eles deixam cache de build);
- uma vez por mês, ou quando o `C:` estiver apertado.

### 1. Limpeza dentro do WSL — `scripts/disk-cleanup.sh`

```bash
scripts/disk-cleanup.sh            # só mostra (não apaga nada)
scripts/disk-cleanup.sh --apply    # limpa o seguro
scripts/disk-cleanup.sh --deep     # limpa mais (pede confirmação para imagens)
scripts/disk-cleanup.sh --apply --sudo   # + apt, journal e fstrim (pede sua senha)
```

| Modo | Remove | Custo |
|---|---|---|
| `--apply` | Contêineres parados dos labs, imagens *dangling*, cache de build do Docker sem uso, `.next/cache` | Nenhum: tudo se refaz sozinho. |
| `--deep` | Também **todo** o cache de build, o cache de downloads do npm e versões antigas das imagens dos labs que nenhum lab usa | O próximo `pull`/`rebuild` constrói do zero, e o `npm install` baixa de novo (ambos com internet, como já é). |

**Nunca remove:**
- volumes: `/home/kali`, o banco do Guacamole e o do DVWA;
- as imagens dos labs registrados nem as bases dos Dockerfiles (`FROM`), para
  que **ligar um lab continue funcionando sem internet** (testado: depois do
  `--apply`, o lab `kali` subiu com `--pull never`);
- contêineres e imagens de outros projetos: eles são listados, nunca apagados.

Ele recusa rodar com um lab ligado e usa a mesma trava (`data/lab.lock`) da
plataforma.

### 2. Devolver o espaço ao Windows — `scripts/windows/compact-wsl.ps1`

Rode no **PowerShell do Windows** (não dentro do WSL, porque ele desliga o WSL):

```powershell
# 1) Só olhar (não muda nada):
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu\home\mesquitxx\projetos\plataforma-cyber\scripts\windows\compact-wsl.ps1 -Check

# 2) De verdade (feche os labs antes; a plataforma e os terminais WSL vão fechar):
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu\home\mesquitxx\projetos\plataforma-cyber\scripts\windows\compact-wsl.ps1
```

O que ele faz, em ordem:
1. Recusa se houver lab rodando e pede confirmação.
2. Dentro do WSL: backup do banco com cópia no Windows, `lab.sh backup-home` e
   `disk-cleanup.sh --apply`. **Se algum backup falhar, ele para sem compactar
   nada.** Como root (via `wsl -u root`, sem pedir senha): `apt-get clean`,
   `journalctl --vacuum-size=100M` e `fstrim`.
3. `wsl --shutdown`.
4. **Disco esparso (D5, preferido):** `wsl --manage Ubuntu --set-sparse true`,
   e depois mais um `fstrim` para o Windows liberar os blocos. É uma vez só:
   daí em diante o VHDX encolhe a cada `fstrim`. O `.wslconfig` já tem
   `sparseVhd=true`, mas isso só vale para discos **novos**; o seu é anterior.
   - **Se esta versão do WSL exigir `--allow-unsafe`, o script NÃO o usa**
     (decisão D5) e cai na compactação manual. Usar `--allow-unsafe` só depois
     de uma decisão explícita sua.
5. **Compactação manual** (se o passo 4 não deu): precisa de um **PowerShell
   como administrador**. Usa `Optimize-VHD` se houver Hyper-V (o seu Windows
   não tem), senão `diskpart` → `compact vdisk`. Sem administrador, ele mostra o
   comando para rodar de novo elevado com `-SkipCleanup`.
6. Mostra o espaço ocupado pelo VHDX antes e depois.

> **Estado:** o modo `-Check` foi executado (VHDX de 23,58 GB, não esparso; WSL
> 3.0.1; sem Hyper-V). Os passos 3 a 5 desligam o WSL e **não puderam ser
> executados de dentro do WSL** nesta fase: ficam para você rodar. O `wsl --help`
> desta versão (3.0.1) não menciona `--allow-unsafe`, então o esperado é que o
> passo 4 funcione; se não funcionar, o script avisa e cai no 5.

### Se algo der errado
- **O WSL não abre depois da compactação:** o progresso está em
  `C:\Users\mesqa\Documents\plataforma-cyber-backups\`. Reinstale o Ubuntu,
  clone o repositório, `npm install`, `npm run db:migrate` e
  `npm run db:restore -- /mnt/c/Users/mesqa/Documents/plataforma-cyber-backups/<arquivo>.db --yes`.
  Depois `scripts/lab.sh pull <lab>` para cada lab e
  `scripts/lab.sh restore-home <pasta lab-...> --yes --with-env` (copie a pasta
  `lab-...` do Windows para `data/backups/` antes, ou passe o caminho
  `/mnt/c/...`).
- **Um lab não sobe ("Faltam imagens"):** o `--deep` não remove imagens de lab;
  se faltar, `scripts/lab.sh pull <lab>`.
