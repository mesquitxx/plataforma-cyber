Lab do modulo 3.3 — Criptografia simetrica
==========================================

Estes arquivos sao o material do laboratorio guiado do modulo 3.3. Eles ficam
somente em /opt/lab-3.3 (leitura), dentro da attack box Kali, que roda isolada:
rede interna sem internet, nenhum alvo de ataque. Todo o trabalho e OFFLINE,
sobre arquivos cifrados de uma empresa ficticia, a Cooperativa Atlas. A chave
de cifra NAO esta aqui: cada missao se resolve explorando um erro de uso do
AES, nunca quebrando o AES.

  missao-1/       O cofre de imagens. cofre-ecb.bin e cofre-cbc.bin sao a MESMA
                  imagem BMP de 24 bits (1200 x 180 pixels), arquivo inteiro
                  cifrado com AES-128: uma vez em ECB, outra em CBC, com a mesma
                  chave. Os 54 primeiros bytes de um BMP sao o cabecalho.

  missao-2/       O servico de exportacao. exportes/ tem quatro arquivos
                  cifrados com AES-256-CTR e a mesma chave. Formato de cada um:
                  16 bytes de contador inicial (nonce) + texto cifrado.
                  aviso-publico.txt e o texto claro de um deles, que foi
                  publicado na intranet.

  missao-3/       O token de acesso. token.txt e um token AES-128-CBC em
                  Base64: IV (16 bytes) + texto cifrado (32 bytes). O texto
                  claro segue o formato publico role=<papel>;uid=<n>;exp=<data>
                  e este token e de role=guest;uid=7;exp=2026-12-31.
                  conferir.sh confere o formato do token forjado e imprime a
                  flag derivada dele.

Comece copiando tudo para a sua home, para poder refazer o exercicio sem
reiniciar o lab:

  cp -r /opt/lab-3.3 ~/lab-3.3 && cd ~/lab-3.3

O passo a passo, as dicas e as flags estao na pagina do modulo 3.3.

Etica: estas tecnicas so sao legitimas no seu laboratorio ou em ambiente com
autorizacao por escrito. Veja a Trilha 1 (lei brasileira e etica).
