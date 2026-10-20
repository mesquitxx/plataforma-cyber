Lab do modulo 3.2 — Hashing, senhas e quebra de hashes
======================================================

Estes arquivos sao o material do laboratorio guiado do modulo 3.2. Eles ficam
somente em /opt/lab-3.2 (leitura), dentro da attack box Kali, que roda isolada:
rede interna sem internet, usuario sem privilegio, nenhum alvo de ataque. Todo o
trabalho e quebra OFFLINE de hashes — nao ha vitima, nao ha rede.

  webapp.hashes  Missao 1 — seis linhas user:hash (MD5 cru de um vazamento
                 ficticio de aplicacao web). Quebra rapida com wordlist; uma
                 conta so cai com um ataque hibrido (wordlist + mascara).

  shadow.leak    Missao 2 — quatro linhas user:hash no formato do /etc/shadow
                 (sha512crypt, $6$). Hash lento e com salt: a licao de por que
                 salt derrota rainbow tables e por que o hash lento atrasa o
                 atacante. Duas contas tem a MESMA senha e, mesmo assim, hashes
                 diferentes.

  conferir.sh    Deriva a flag da Missao 2 a partir das senhas recuperadas.

Comece copiando tudo para a sua home, para poder refazer o exercicio sem
reiniciar o lab:

  cp -r /opt/lab-3.2 ~/lab-3.2 && cd ~/lab-3.2

O passo a passo, as dicas e as flags estao na pagina do modulo 3.2.

Etica: estas tecnicas so sao legitimas no seu laboratorio ou em ambiente com
autorizacao por escrito. Veja a Trilha 1 (lei brasileira e etica).
