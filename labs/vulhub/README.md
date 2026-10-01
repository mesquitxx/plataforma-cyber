# Vulhub — ambiente de CVE real

Lab de serviço com uma CVE conhecida, no estilo
[Vulhub](https://github.com/vulhub/vulhub) (coleção consagrada de ambientes
vulneráveis-por-design). O alvo entra por cima de `labs/base/compose.yaml` e só
é alcançável pelo Kali, por `lab_net` (interna, sem internet, sem acesso ao
host). **Nenhuma porta é publicada no host** — diferente do compose original do
Vulhub, que publica portas (troca de segurança T7 em `docs/LABORATORIO.md`).

## Provisório (Fase 7)

A CVE final deste lab ainda é **decisão do MESQUITA**. Três candidatos estão em
[`docs/CURRICULO.md`](../../docs/CURRICULO.md) (Trilha 5). Enquanto isso, o lab
compila com o candidato **mais leve e didático**:

- **CVE-2021-41773** — Apache httpd **2.4.49**, *path traversal* que vira RCE
  quando o CGI está ligado e o diretório raiz é liberado.
- Reconstruído **sobre a imagem oficial `httpd:2.4.49`** (fixada por digest em
  `labs/vulhub/Dockerfile`), não sobre uma imagem de terceiros. As duas únicas
  mudanças são as duas configurações erradas que a CVE exige (ligar o
  `mod_cgid`/`mod_cgi` e liberar `<Directory />`). Não há exploit sob medida.

- **Onde acessar:** só de dentro do Kali, em `http://vulhub/`.
- **Construção:** imagem local, como o Kali. Baixe/construa no terminal com
  `scripts/lab.sh pull vulhub` (único momento com internet).
- **Módulos:** 5.1, 5.4 (e, com o módulo do Metasploit, 5.3).

Quando a CVE final for escolhida, troque esta pasta pelo ambiente decidido e
atualize o catálogo (`lib/labs/catalog.ts`) e o registro (`scripts/lab-common.sh`).
