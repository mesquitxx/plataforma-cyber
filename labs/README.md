# Laboratórios

Desde a Fase 6, a plataforma liga, desliga e reseta os labs, **um por vez**,
sempre pelo mesmo executor: `scripts/lab.sh`. A lista de labs que ele aceita
é fechada (`scripts/lab-common.sh`) e precisa bater com o catálogo da
plataforma (`lib/labs/catalog.ts`); o `npm test` confere.

- Como subir, descer e validar o isolamento: [`docs/LABORATORIO.md`](../docs/LABORATORIO.md)
- Consumo de RAM medido: [`docs/MEDICOES-RAM.md`](../docs/MEDICOES-RAM.md)

| Caminho | Conteúdo |
|---|---|
| `base/compose.yaml` | Base de todo lab com desktop: Guacamole + Kali, redes internas e limites de memória. Sozinha, é o lab `kali` (Kali sem alvo). |
| `base/guacamole/initdb/` | Schema oficial do Guacamole + seed (senha do admin e conexão "Kali") |
| `base/kali/` | Dockerfile da attack box (XFCE + TigerVNC + ferramentas) |
| `dvwa/compose.yaml` | Alvo DVWA, que entra por cima da base (lab `dvwa`) |
| `linux-sandbox/` | Contêiner de prática sem rede do módulo 0.3 (lab `linux-sandbox`) |
| `.env.example` | Modelo de senhas (o `lab.sh` gera o `.env` real) |

As pastas `juice-shop/`, `webgoat/` e `vulhub/` recebem seus arquivos nas
fases de conteúdo (catálogo de labs planejados em `lib/labs/catalog.ts`).
