# DVWA — Damn Vulnerable Web Application

Alvo vulnerável-por-design, projeto oficial
[digininja/DVWA](https://github.com/digininja/DVWA). Usa a imagem publicada
`ghcr.io/digininja/dvwa` (fixada por digest em `labs/dvwa/compose.yaml`, que
entra por cima de `labs/base/compose.yaml`) com um MariaDB separado.

- **Onde acessar:** só de dentro do Kali, em `http://dvwa/`.
- **Login padrão:** `admin` / `password` (faz parte do exercício).
- **Nível de segurança inicial:** `low` (variável `DEFAULT_SECURITY_LEVEL`).
- **Banco:** o `scripts/lab.sh up dvwa` executa o "Create / Reset Database" na
  primeira subida. Para zerar o alvo, use "Resetar" na plataforma (ou
  `scripts/lab.sh reset dvwa`): o banco do DVWA é recriado e o `/home/kali`
  fica intacto. O botão em `http://dvwa/setup.php` também funciona.
- **Redes:** `lab_net` (com o Kali) e `dvwa_back` (só com o próprio banco).
  Nenhuma das duas tem internet ou acesso ao host.
