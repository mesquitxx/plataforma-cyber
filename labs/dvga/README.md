# DVGA — Damn Vulnerable GraphQL Application

Alvo vulnerável-por-design, projeto público
[Damn Vulnerable GraphQL Application](https://github.com/dolevf/Damn-Vulnerable-GraphQL-Application)
(Dolev Farhi e Nick Aleks). Usa a imagem publicada `dolevf/dvga` na versão
2.2.0 (fixada por digest em `labs/dvga/compose.yaml`, que entra por cima de
`labs/base/compose.yaml`). É uma aplicação de "pastes" com uma API GraphQL
cheia de falhas: introspecção, consultas abusivas, autorização quebrada,
injeções e mais.

- **Onde acessar:** só de dentro do Kali, em `http://dvga:5013/`; a API
  GraphQL fica em `http://dvga:5013/graphql`.
- **Porta interna 5013:** não é publicada; a única porta no host continua sendo
  a do Guacamole (`127.0.0.1:8080`). Ver `docs/LABORATORIO.md`.
- **Usuário:** o processo roda como `dvga`, sem privilégios, com
  `no-new-privileges`.
- **Estado:** banco SQLite dentro do contêiner; recriar o contêiner
  (**Resetar**) volta ao estado de fábrica. Não há volume a apagar.
- **Redes:** só `lab_net` (com o Kali). Sem internet e sem acesso ao host. Os
  cenários de execução de comando e de SSRF do DVGA ficam presos no contêiner
  (troca T11).
- **Módulo:** 4.9 (Segurança de APIs e GraphQL).
