# OWASP WebGoat

Alvo vulnerável-por-design, projeto oficial
[OWASP WebGoat](https://owasp.org/www-project-webgoat/). Usa a imagem publicada
`webgoat/webgoat` (fixada por digest em `labs/webgoat/compose.yaml`, que entra
por cima de `labs/base/compose.yaml`). Traz aulas guiadas de falhas web em Java.

- **Onde acessar:** só de dentro do Kali, em `http://webgoat:8080/WebGoat/`.
- **Porta interna 8080:** não é publicada; não conflita com o Guacamole
  (`127.0.0.1:8080`), que é a única porta no host. Ver `docs/LABORATORIO.md`.
- **Estado:** banco H2 em memória; recriar o contêiner (**Resetar**) zera o
  progresso. Não há volume a apagar.
- **Redes:** só `lab_net` (com o Kali). Sem internet e sem acesso ao host.
- **Módulos:** 4.7 (CSRF/SSRF) e 4.8 (componentes vulneráveis/desserialização).
