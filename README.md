# Atlas de Personagens

Recriação responsiva do Atlas original, com ranking por tiers, fichas pesquisáveis, comparação de personagens, análises salvas e painel administrativo. A interface e os dados usam como referência o site original e o HTML fornecido.

## Funcionalidades e dados

- Catálogo com **54 personagens**, sendo **44** no ranking principal. Os demais continuam acessíveis pela pesquisa e pela comparação.
- Ranking nos tiers S, A, B, C e D; busca por nome, aliases e conteúdo da ficha; filtros por universo. Na comparação, é possível buscar por nome, alias ou conteúdo da ficha, ignorando acentos e maiúsculas, e navegar pelas sugestões com o teclado.
- Fichas com atributos, poderes, fraquezas, observações, fontes e ampliação de imagem.
- Comparação sem pontuação automática e sem chamadas a serviços de IA; análises registradas incluem resultado ou inconclusão, confiança, versões, justificativa, contrapontos, método e evidências. A marca em cubo aparece no cabeçalho, favicon e Apple touch icon.
- **1.431 análises** incluídas: 196 com vencedor indicado, 1.235 inconclusivas e 217 marcadas como específicas.
- Login via Manus OAuth. Apenas a conta cujo e-mail está configurado como administrador pode editar o catálogo; as alterações são persistidas no banco gerenciado e compartilhadas entre dispositivos.

## Desenvolvimento

O projeto usa React, TypeScript, Vite, Express, tRPC, Drizzle ORM e MySQL.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

O servidor usa `PORT` (padrão 3000). Para validar o projeto:

```bash
pnpm check
pnpm test
pnpm build
```

## Administração e segurança

Configure `ATLAS_ADMIN_EMAIL` como variável protegida no ambiente do projeto, sem gravá-la no repositório. O fluxo OAuth sincroniza o papel com esse e-mail; as rotas administrativas também verificam o papel e a lista permitida no servidor. Se a configuração estiver ausente, as operações administrativas falham fechadas.

Não inclua `.env`, tokens ou credenciais em commits. A exportação administrativa inclui fichas e análises, não dados de autenticação.

## Persistência e carga inicial

As tabelas Atlas são criadas pelas migrations em `drizzle/`. Na primeira consulta ao catálogo, o seed versionado carrega `data/atlas/catalog.json` e `data/atlas/research.json` em uma única transação. A inicialização é idempotente: uma base inicializada ou que já contém dados não é sobrescrita ao reiniciar o aplicativo.

O banco gerenciado é compartilhado entre desenvolvimento e produção; qualquer escrita de teste também afeta os dados persistidos. Use consultas somente de leitura para verificações de contagem.

## Publicação: Manus e GitHub Pages

Existem dois destinos distintos. **O Atlas completo do Manus é dinâmico**: `pnpm build` compila o cliente e o servidor Express, e `pnpm start` executa o servidor que fornece a API tRPC, OAuth e acesso ao MySQL. O `Dockerfile` usa esse build completo. Para publicar uma versão nova no Manus, use o fluxo de publicação do projeto Manus; um push ao GitHub, por si só, não atualiza o app Manus.

O GitHub Pages usa somente `pnpm build:pages`, que define `VITE_ATLAS_STATIC=true` e gera um snapshot de leitura a partir dos arquivos versionados em `data/atlas/`. O workflow `.github/workflows/pages.yml` publica essa variante estática quando há push em `main`. **Não use `pnpm build:pages` para publicar o app completo no Manus**: esse build não executa Express, OAuth nem MySQL. O build normal `pnpm build` não define o modo estático e mantém a aplicação completa.

O repositório GitHub contém o código-fonte, migrations, testes, workflow e os dados-base do seed; não contém credenciais nem uma cópia do banco gerenciado. Edições administrativas são gravadas no MySQL do Manus e não são sincronizadas automaticamente para o GitHub. Use **Exportar JSON** no painel administrativo para obter uma cópia dos dados atuais. Se outra IA alterar a branch `main` no GitHub, essas alterações não chegam automaticamente ao projeto Manus: sincronize-as com o projeto antes de publicar uma nova versão dinâmica.

## Estrutura principal

- `client/src/pages/Home.tsx` e `client/src/components/atlas/`: ranking, busca, fichas, comparação e painel administrativo.
- `server/atlas/router.ts` e `server/atlas/service.ts`: endpoints, autorização, persistência, seed, invalidação de análises e exportação.
- `drizzle/schema.ts` e `drizzle/`: esquema e migrations do banco.
- `data/atlas/`: catálogo, metadados e análises originais.
- `client/public/manus-routes.json`: manifesto das rotas da aplicação.
