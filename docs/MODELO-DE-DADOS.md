# Modelo de Dados — Plataforma de Cibersegurança

Desenho conceitual das entidades e suas relações, **em nível de projeto**.
Ainda **sem código, sem SQL e sem schema definitivo** — isso chega na Fase 2.
Este documento existe para guiar a implementação e alinhar o vocabulário.

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
1. **Ingestão (Fase 2):** os MDX de `content/` são lidos e viram registros de
   Track, Module, Prerequisite, Task, Flag, Lab e GlossaryTerm. Reexecutar a
   ingestão atualiza o conteúdo sem apagar o estado do usuário.
2. **Uso (Fase 3+):** o estudo gera Progress; a resolução de flags gera
   FlagSubmission.
3. **Separação:** conteúdo pode ser regenerado a partir dos arquivos; estado é
   preservado no banco local.

## Fora de escopo neste documento
- Tipos de coluna, índices, chaves e constraints exatas (Fase 2).
- Estratégia de migração e seed (Fase 2).
- Formato exato do front-matter MDX que declara pré-requisitos, tarefas e flags
  (definido junto da ingestão, na Fase 2).
