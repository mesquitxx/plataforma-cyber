# Modelo de Dados — Plataforma de Cibersegurança

Desenho conceitual das entidades e suas relações, **em nível de projeto**.
Este documento guia a implementação e alinha o vocabulário. O schema concreto
foi implementado na Fase 2 em [`db/schema.ts`](../db/schema.ts) (Drizzle ORM),
com o SQL versionado em [`db/migrations/`](../db/migrations/). Em caso de
divergência, o código é a referência de colunas e o documento, a de conceitos.

## Princípios
- **Conteúdo vs. estado.** O conteúdo (trilhas, módulos, tarefas, labs) nasce dos
  arquivos MDX versionados em `content/` e é ingerido no banco. O estado do
  usuário (progresso, flags resolvidas) nasce do uso da plataforma.
- **Sem login.** Uso local por uma única pessoa; não há entidade de usuário nem
  autenticação. O progresso é global do banco local.
- **SQLite local.** Uma única base em arquivo, sem servidor.
- **Glossário automático.** Termos técnicos explicados na primeira ocorrência
  são registrados como entidade própria e reaproveitados em todo o conteúdo.

---

## Entidades

### Track (Trilha)
Uma das 8 trilhas do currículo.
- **Atributos:** identificador estável (slug), número da trilha, título,
  descrição, ordem de exibição.
- **Origem:** conteúdo (ingerido do MDX).

### Module (Módulo)
Uma unidade de estudo dentro de uma trilha.
- **Atributos:** slug, título, ordem dentro da trilha, corpo em MDX, indicação
  de ter lab ou não, referência ao alvo de lab (quando houver).
- **Origem:** conteúdo.
- **Pertence a:** uma Track.

### Prerequisite (Pré-requisito)
Relação que liga um módulo aos módulos que devem vir antes.
- **Atributos:** módulo de origem, módulo exigido.
- **Origem:** conteúdo (declarado no MDX de cada módulo).
- **Natureza:** relação muitos-para-muitos de Module com Module.

### Task (Tarefa)
Um passo verificável dentro de um módulo (uma pergunta, um objetivo prático,
uma etapa do lab).
- **Atributos:** slug, título/enunciado, ordem no módulo, tipo (leitura,
  exercício, etapa de lab, flag), indicação se exige submissão de flag.
- **Origem:** conteúdo.
- **Pertence a:** um Module.

### Flag
A resposta esperada de uma tarefa do tipo flag (estilo CTF).
- **Atributos:** referência à tarefa, valor/representação da resposta esperada
  (armazenada de forma a permitir verificação, não em texto claro), dica opcional.
- **Origem:** conteúdo.
- **Pertence a:** uma Task (relação um-para-um com tarefas do tipo flag).

### Lab
A definição de um laboratório associado a um módulo.
- **Atributos:** slug, alvo (DVWA, Juice Shop, WebGoat, Vulhub, etc.), referência
  ao diretório do Docker Compose em `labs/`, portas locais esperadas (sempre em
  `127.0.0.1`), observações de isolamento.
- **Origem:** conteúdo + configuração.
- **Relação:** referenciado por Module (um módulo com lab aponta para um Lab).

### Progress (Progresso)
Estado de conclusão do usuário local.
- **Atributos:** referência ao Module ou à Task, situação (não iniciado, em
  andamento, concluído), data de atualização.
- **Origem:** estado (gerado pelo uso).
- **Relação:** cada registro liga-se a um Module ou a uma Task.

### FlagSubmission (Submissão de flag)
Registro de tentativas de resolver uma flag.
- **Atributos:** referência à Flag, valor submetido, resultado (correto/incorreto),
  data/hora.
- **Origem:** estado.
- **Relação:** cada submissão liga-se a uma Flag.

### GlossaryTerm (Termo do Glossário)
Um termo técnico (em inglês) com sua explicação em português.
- **Atributos:** termo, definição, primeira ocorrência (módulo onde foi
  introduzido).
- **Origem:** conteúdo (extraído/declarado no MDX).

---

## Relações (resumo)

```
Track (1) ───< (N) Module
Module (N) >───< (N) Module         [via Prerequisite]
Module (1) ───< (N) Task
Task  (1) ───── (0..1) Flag          [apenas tarefas do tipo flag]
Module (N) ───> (0..1) Lab           [módulos com lab apontam para um Lab]
Module (1) ───< (N) Progress         [estado por módulo]
Task  (1) ───< (N) Progress          [estado por tarefa]
Flag  (1) ───< (N) FlagSubmission    [histórico de tentativas]
GlossaryTerm  ─ referenciado pelo conteúdo dos módulos
```

Legenda: `(1)───<(N)` = um-para-muitos; `(N)>───<(N)` = muitos-para-muitos;
`(0..1)` = opcional.

---

## Ciclo de vida dos dados
1. **Seed (Fase 3):** `npm run db:seed` grava o currículo de
   `db/seed/curriculum.ts` (trilhas, módulos, pré-requisitos e labs, sem corpo
   MDX, tarefas nem flags), com *upsert* por slug. Os slugs são os mesmos que os
   MDX usarão, então a ingestão sobrescreve o seed sem perder estado.
   `npm run db:seed:demo` também **substitui** o progresso por um progresso de
   demonstração, descartado na Fase 5.
2. **Ingestão (Fase 4):** `npm run content:ingest` lê os MDX de `content/` e
   grava o corpo do módulo, Task, Flag e GlossaryTerm. Trilhas, módulos,
   pré-requisitos e labs continuam vindo do seed (ver "Decisões da Fase 4").
   Reexecutar a ingestão atualiza o conteúdo sem apagar o estado do usuário.
3. **Uso:** a resolução de flags gera FlagSubmission (Fase 4); o estudo gera
   Progress (Fase 5).
4. **Separação:** conteúdo pode ser regenerado a partir dos arquivos; estado é
   preservado no banco local.

## Decisões de implementação (Fase 2)
| Entidade | Tabela | Notas |
|---|---|---|
| Track | `tracks` | `number` restrito a 0–7 (CHECK). |
| Module | `modules` | `slug` único global (pré-requisitos cruzam trilhas). "Tem lab" = `lab_id IS NOT NULL`. |
| Prerequisite | `module_prerequisites` | Chave composta; CHECK impede um módulo exigir a si mesmo. |
| Task | `tasks` | `slug` único por módulo. "Exige flag" = `type = 'flag'`. Tipos: `reading`, `exercise`, `lab_step`, `flag`. |
| Flag | `flags` | Guarda `answer_hash` + `salt`, nunca a resposta em claro. Algoritmo e normalização: Fase 4. |
| Lab | `labs` | `target` restrito a `dvwa`, `juice-shop`, `webgoat`, `vulhub` e, desde a Fase 4, `linux-sandbox`. `local_ports` em JSON. |
| Progress | `module_progress` e `task_progress` | Duas tabelas com *foreign key* real, em vez de uma referência polimórfica. Status: `not_started`, `in_progress`, `completed`. |
| FlagSubmission | `flag_submissions` | Desde a Fase 4, guarda o valor digitado **só nas tentativas erradas**; nas corretas, `submitted_value` é `NULL` (CHECK no banco). |
| GlossaryTerm | `glossary_terms` | `term` único sem diferenciar maiúsculas/minúsculas. |

- **Chaves:** IDs inteiros; a ingestão faz *upsert* pela chave natural (slug),
  nunca apaga-e-recria, para o estado do usuário sobreviver à reingestão.
- **Remoção de conteúdo:** apagar um módulo/tarefa/flag do conteúdo apaga em
  cascata seu progresso e suas submissões (intencional).
- **Invariante entre tabelas:** "flag só existe para tarefa do tipo `flag`" é
  garantida pela ingestão, não por CHECK.
- **Banco:** `data/plataforma.db`, modo WAL, `foreign_keys = ON`.

## Decisões de navegação (Fase 3)
- **Slugs:** trilhas `trilha-0` … `trilha-7` (iguais às pastas de `content/`);
  módulos em português, sem acento e sem número (ex.: `lei-e-etica`), para
  continuarem estáveis se a ordem mudar. São dados, não código.
- **Número exibido** do módulo (ex.: "1.4") = número da trilha + `sort_order`
  (que começa em 1 dentro da trilha). Não é armazenado.
- **"Pré-requisito: Trilha N"** do currículo vira uma linha em
  `module_prerequisites` para **cada** módulo da trilha N.
- **Pré-requisitos sempre anteriores:** todo pré-requisito vem antes do módulo na
  ordem do currículo (trilha, depois `sort_order`); isso também garante que não
  há ciclos. O seed valida e aborta se a regra for violada.
- **Estado do módulo é derivado, não armazenado:** o banco guarda só
  `not_started | in_progress | completed`. A interface mostra 4 estados, nesta
  ordem de precedência:

  | Estado | Regra |
  |---|---|
  | Concluído | `module_progress.status = 'completed'` |
  | Em andamento | `status = 'in_progress'` |
  | Bloqueado | algum pré-requisito não está concluído |
  | Disponível | todos os pré-requisitos concluídos, sem progresso |

  O bloqueio é **suave**: a página do módulo abre e mostra um aviso com os
  pré-requisitos pendentes.
- **"Continuar de onde parei":** o módulo em andamento com `updated_at` mais
  recente; senão, o primeiro disponível na ordem do currículo.
- **Labs fora do enum:** módulos cujo lab ainda não cabe em `LAB_TARGETS`
  (rede interna de alvos, contêiner Linux, máquinas boot2root) ficam sem
  `lab_id` até a Fase 6.

## Decisões da Fase 4 (motor de conteúdo)

### Quem é dono de cada dado
- **Seed (`db/seed/curriculum.ts`):** trilhas, módulos (título, ordem), pré-
  requisitos e labs. É o currículo.
- **Front-matter do MDX:** repete `slug`, `track`, `title`, `prerequisites` e
  `lab` para quem escreve, e o `npm test` exige que batam com o seed. Acrescenta
  o que só o módulo sabe: tarefas, flags e termos de glossário.
- **Corpo do MDX:** renderizado na página a partir do arquivo compilado; a
  ingestão guarda uma cópia em `modules.body_mdx` (para busca futura).

### Formato do front-matter
```yaml
slug: terminal-linux
track: trilha-0
title: "Linux: primeiros passos no terminal"
prerequisites: [como-usar-a-plataforma]   # como no seed, sem expandir "trilha-N"
lab: linux-sandbox                        # ou null
tasks:
  - slug: missao-1-arquivo-oculto
    title: "Missão 1 — ..."
    type: flag                            # reading | exercise | lab_step | flag
    prompt: "..."                         # opcional
    hint: "..."                           # opcional, só em flags
    flag: { hash: "scrypt$16384$8$1$<hex>", salt: "<hex>" }   # só em flags
glossary:
  - term: shell
    definition: "..."
```
Modelo completo e comentado: [`TEMPLATE-MODULO.mdx`](TEMPLATE-MODULO.mdx).

### Regras de ingestão
- Tudo é validado antes de gravar; um arquivo inválido aborta a ingestão
  inteira, numa única transação.
- Tarefas: *upsert* por `(module_id, slug)`; `sort_order` segue a ordem do
  front-matter. Tarefas removidas do front-matter são apagadas (com progresso e
  submissões, em cascata).
- Flags: *upsert* por `task_id`. Uma tarefa que deixa de ser `flag` perde a flag.
  Cada tarefa `flag` tem exatamente um `<FlagInput task="...">` no corpo.
- Glossário: cada termo é declarado por **um único** módulo (o da primeira
  aparição), que vira `first_module_id`. Todo termo declarado é marcado no corpo
  com `<GlossaryTerm>`, e todo `<GlossaryTerm>` aponta para um termo declarado
  em algum módulo.

### Hash das flags
- **Normalização:** `trim()` e Unicode NFC. Diferencia maiúsculas de minúsculas.
- **Algoritmo:** scrypt (`node:crypto`), N=16384, r=8, p=1, 32 bytes, salt
  aleatório de 16 bytes por flag. Comparação em tempo constante.
- **Formato:** `answer_hash = "scrypt$N$r$p$<hex>"`, para poder mudar parâmetros
  no futuro sem invalidar flags antigas; `salt` em hex.
- **Onde a flag existe em claro:** só dentro do lab (os arquivos que o leitor
  encontra). Front-matter, banco, página e bundle do navegador só veem o hash.

### Migração 0001
Acrescenta `linux-sandbox` ao CHECK de `labs.target` e torna
`flag_submissions.submitted_value` anulável, com o CHECK "valor só quando
errado". As duas mudanças recriam as tabelas; por isso o `db:migrate` desliga
as *foreign keys* em volta do migrador e roda `foreign_key_check` no fim. Sem
isso, o `DROP TABLE labs` dentro da transação anulava todo `modules.lab_id`.

## Fora de escopo neste documento
- Ligação entre termos do glossário e **todos** os módulos que os citam (Fase 5).
