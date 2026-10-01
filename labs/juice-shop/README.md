# OWASP Juice Shop

Alvo vulnerável-por-design, projeto oficial
[OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). Usa a imagem
publicada `bkimminich/juice-shop` (fixada por digest em
`labs/juice-shop/compose.yaml`, que entra por cima de `labs/base/compose.yaml`).
É uma loja moderna em Node.js com falhas do OWASP Top 10 e desafios de JWT.

- **Onde acessar:** só de dentro do Kali, em `http://juice-shop:3000/`.
- **Estado:** banco em memória; **Resetar** (ou recriar o contêiner) volta tudo
  ao início. Não há volume a apagar.
- **Redes:** só `lab_net` (com o Kali). Sem internet e sem acesso ao host.
- **Labs que o usam:** `juice-shop` (sozinho) e `rede-de-alvos` (com o DVWA).
- **Módulos:** 2.5 (Burp), 3.4 (JWT), 4.4, 4.5 e 4.10.
