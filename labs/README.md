# Laboratórios

Pilha de laboratório da Fase 1: Apache Guacamole (desktop no navegador) +
attack box Kali (XFCE) + DVWA como alvo, tudo em redes internas do Docker.

- Como subir, descer e validar o isolamento: [`docs/LABORATORIO.md`](../docs/LABORATORIO.md)
- Consumo de RAM medido: [`docs/MEDICOES-RAM.md`](../docs/MEDICOES-RAM.md)

| Caminho | Conteúdo |
|---|---|
| `compose.yaml` | Serviços, redes internas e limites de memória |
| `.env.example` | Modelo de senhas (o `lab-up.sh` gera o `.env` real) |
| `guacamole/initdb/` | Schema oficial do Guacamole + seed (senha do admin e conexão "Kali") |
| `kali/` | Dockerfile da attack box (XFCE + TigerVNC + ferramentas) |
| `dvwa/` | Notas do alvo DVWA (usa a imagem oficial) |

As pastas `juice-shop/`, `webgoat/` e `vulhub/` ficam para fases futuras.
