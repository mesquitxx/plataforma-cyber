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
- **Módulos:** 5.1 (enumeração), 5.2 (ataque a serviços), 5.3 (Metasploit),
  5.4 (reproduzir a CVE) e 5.5 (ataques a senhas).

## Superfícies de laboratório adicionadas (benignas, não fazem parte da CVE)

Além das duas configurações erradas que a CVE-2021-41773 exige, o `Dockerfile`
acrescenta, por módulo, superfícies **benignas** — más configurações clássicas,
nunca exploit sob medida:

- **5.1 — divulgação de informação:** `ServerTokens Full` (banner de versão
  completo), um cabeçalho que vaza um caminho interno e um *directory listing*
  de `/internal` com um inventário de serviço.
- **5.5 — autenticação fraca:** uma área `/admin` protegida por **HTTP Basic
  Auth**, com um `.htpasswd` de **senhas deliberadamente fracas** (hashes APR1
  de *salt* fixo, reproduzíveis byte a byte). Três contas, duas reusando a mesma
  senha, para treinar *password spraying* e reúso de credenciais. A senha em
  claro **não** está na imagem — só os hashes —, então a flag do módulo (montada
  a partir da senha quebrada e do `sha256` do `.htpasswd`) não é lível do
  repositório sem fazer a quebra. Continua tudo só na `lab_net` interna, **sem
  porta publicada**.

Quando a CVE final for escolhida, troque esta pasta pelo ambiente decidido e
atualize o catálogo (`lib/labs/catalog.ts`) e o registro (`scripts/lab-common.sh`).
