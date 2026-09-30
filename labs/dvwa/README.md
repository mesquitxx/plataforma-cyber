# DVWA — Damn Vulnerable Web Application

Alvo vulnerável-por-design, projeto oficial
[digininja/DVWA](https://github.com/digininja/DVWA). Usa a imagem publicada
`ghcr.io/digininja/dvwa` (fixada por digest em `labs/compose.yaml`) com um
MariaDB separado.

- **Onde acessar:** só de dentro do Kali, em `http://dvwa/`.
- **Login padrão:** `admin` / `password` (faz parte do exercício).
- **Nível de segurança inicial:** `low` (variável `DEFAULT_SECURITY_LEVEL`).
- **Banco:** o `scripts/lab-up.sh` executa o "Create / Reset Database" na
  primeira subida. Para zerar o alvo, use o botão em `http://dvwa/setup.php`.
- **Redes:** `lab_net` (com o Kali) e `dvwa_back` (só com o próprio banco).
  Nenhuma das duas tem internet ou acesso ao host.
