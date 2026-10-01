#!/usr/bin/env bash
# Builds the mission files of module 0.3 in the learner's home, at image
# build time. Deterministic: a fixed-seed generator (Park–Miller) instead of
# $RANDOM, so every build has the same files and the module text can quote
# real output.
#
# The flags are in clear text here, on purpose: they must exist inside the
# lab. The platform only stores their scrypt hashes (module front-matter).
set -euo pipefail

home="${HOME:?}"
cd "$home"

# ---------------------------------------------------------------- LEIA-ME
cat > LEIA-ME.txt <<'EOF'
=====================================================================
  SANDBOX LINUX — módulo 0.3 "Linux: primeiros passos no terminal"
=====================================================================

Este contêiner é seu para treinar. Ele não tem rede e é descartável:
se algo der errado, recrie tudo do zero no terminal do WSL (fora daqui)
com:   npm run lab:sandbox -- reset

Missões (cada uma termina numa flag no formato FLAG{...}):

  missao-1/   O arquivo que o ls não mostra.
  missao-2/   Uma agulha num palheiro de mais de 240 pastas.
  missao-3/   O arquivo que nem você consegue ler.

Cada pasta tem um arquivo instrucoes.txt. Comece por:

  cd missao-1
  cat instrucoes.txt

Para sair do sandbox: digite  exit  (ou Ctrl+D).
EOF

# ---------------------------------------------------------------- Mission 1
mkdir -p missao-1/.cofre
cat > missao-1/instrucoes.txt <<'EOF'
MISSÃO 1 — O arquivo que o ls não mostra

Alguém escondeu a flag nesta pasta. Um "ls" simples não mostra o
esconderijo, mas ele está aqui.

Objetivo: encontrar o esconderijo, entrar nele e ler o arquivo com a flag.
Comandos úteis: ls (e suas opções), cd, cat.
EOF
cat > missao-1/rascunho.txt <<'EOF'
Nada de importante aqui. Continue procurando.
EOF
cat > missao-1/lista-de-compras.txt <<'EOF'
- café
- pão
- pilhas para o teclado
EOF
printf 'FLAG{arquivos-ocultos-nao-sao-secretos-4b1d}\n' > missao-1/.cofre/.chave

# ---------------------------------------------------------------- Mission 2
mkdir -p missao-2
cat > missao-2/instrucoes.txt <<'EOF'
MISSÃO 2 — Uma agulha num palheiro de 240 pastas

A pasta arquivo-morto/ guarda quatro anos de relatórios semanais,
organizados em ano/mês/semana. Em algum lugar existe UM arquivo chamado
exatamente  relatorio-final.txt .

Dentro dele há centenas de registros. Só um tem status=ALERTA, e o
campo codigo= dessa linha é a sua resposta.

A flag é o código dentro de FLAG{ }. Exemplo: se a linha disser
codigo=abc-123, a flag é  FLAG{abc-123} .

Cuidado: há alertas falsos em outros relatórios e um rascunho com nome
parecido. Só vale o relatorio-final.txt.

Comandos úteis: find, grep, e o pipe | para juntar os dois.
EOF

awk -v root="missao-2/arquivo-morto" '
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
function hex8(   s, i) { s = ""; for (i = 0; i < 8; i++) s = s substr("0123456789abcdef", int(rnd() * 16) + 1, 1); return s }
function report(path, year, month, lines, alert_line, alert_code,   i, day, status, code) {
    for (i = 1; i <= lines; i++) {
        day = sprintf("%04d-%02d-%02d", year, month, 1 + int(rnd() * 28))
        status = "ok"; code = hex8()
        if (i == alert_line) { status = "ALERTA"; code = alert_code }
        printf "%s %02d:%02d:%02d registro=%04d status=%s codigo=%s\n", day, int(rnd() * 24), int(rnd() * 60), int(rnd() * 60), i, status, code > path
    }
    close(path)
}
BEGIN {
    seed = 20260930
    for (year = 2021; year <= 2024; year++)
        for (month = 1; month <= 12; month++)
            for (week = 1; week <= 4; week++) {
                dir = sprintf("%s/%d/%02d/semana-%d", root, year, month, week)
                system("mkdir -p " dir)
                # About one weekly report in six carries a decoy alert.
                alert = (rnd() < 0.17) ? 1 + int(rnd() * 12) : 0
                report(dir "/relatorio-semanal.txt", year, month, 12, alert, "falso-alarme-" substr(hex8(), 1, 4))
            }
    report(root "/2022/11/semana-2/relatorio-final-rascunho.txt", 2022, 11, 40, 17, "rascunho-nao-vale-" substr(hex8(), 1, 4))
    report(root "/2023/08/semana-3/relatorio-final.txt", 2023, 8, 300, 187, "find-e-grep-trabalham-juntos-91e3")
}'

# ---------------------------------------------------------------- Mission 3
mkdir -p missao-3
cat > missao-3/instrucoes.txt <<'EOF'
MISSÃO 3 — O arquivo que nem você consegue ler

vazamento.txt é uma lista FICTÍCIA de senhas "vazadas" (uma por linha).
Quase todas aparecem várias vezes. Uma única senha aparece uma vez só:
ela é a flag, no formato FLAG{senha}.

Problema: o arquivo é seu, mas ninguém tem permissão de leitura nele.

Objetivo:
  1. Descobrir por que não dá para ler (olhe as permissões).
  2. Dar a VOCÊ (só a você) permissão de leitura.
  3. Achar a senha que aparece uma única vez, sem ler mais de mil linhas
     no olho.

Comandos úteis: ls -l, chmod, sort, uniq, wc, e o pipe |.
EOF

awk '
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
BEGIN {
    seed = 7041979
    n = split("123456 senha123 admin qwerty brasil2024 12345678 password abc123 " \
              "iloveyou flamengo corinthians palmeiras 102030 111111 senha " \
              "dragon futebol mudar123 batman monkey 654321 welcome letmein " \
              "trustno1 sunshine princess master 000000 qwerty123 1q2w3e4r " \
              "senha@123 admin123 root toor teste123 gatinho estrela " \
              "maria2023 joao1990 vasco2022 gremio saopaulo internacional " \
              "cruzeiro 159753 147258 abcd1234 Senha123 Admin@2024 " \
              "brasil123 amor123 familia jesus123 deus123 casa2024 " \
              "computador123 wifi1234 minhasenha", words, " ")
    for (i = 1; i <= n; i++) {
        copies = 2 + int(rnd() * 37)
        for (c = 0; c < copies; c++) printf "%.9f %s\n", rnd(), words[i]
    }
    printf "%.9f %s\n", rnd(), "chmod-e-uniq-resolvem-7e4b"
}' | sort -n | cut -d' ' -f2 > missao-3/vazamento.txt
chmod 000 missao-3/vazamento.txt
