# CATS — Otimizador Ético de Currículos para ATS

O CATS analisa a compatibilidade do seu currículo com uma vaga, do jeito que os filtros ATS (Gupy, Workday, Greenhouse, Taleo) fazem. Ele mostra o que está forte, o que falta e gera uma versão do currículo no formato que esses sistemas leem melhor.

> O CATS aprimora a semântica e a clareza das suas qualificações reais, mas **nunca** inventa competências, cargos ou experiências que você não possui.

## O que ele faz

- **Score composto**, com cinco critérios: palavras-chave, título do cargo, anos de experiência, formação e legibilidade ATS. Critérios que a vaga não exige saem da conta.
- **Palavras-chave de 15 áreas** (TI, finanças, RH, jurídico, saúde, engenharia, educação, design e outras), com sinônimos e detecção de erros de digitação.
- **Currículo reestruturado** no formato vertical aceito por ATS, editável e exportável em PDF.
- **100% no navegador:** seu currículo nunca é enviado a servidores, APIs ou inteligência artificial.

## Rodando localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção (pasta `dist/`):

```bash
npm run build
```

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/components/` | Interface (cards, abas, menu de exemplos, ilustrações) |
| `src/utils/` | Motor de análise: palavras-chave, título, experiência, formação, legibilidade |
| `src/data/` | Dicionário de competências por área e palavras de cargo ([guia de edição](src/data/README.md)) |
| `src/types/` | Tipagens TypeScript |

O deploy no GitHub Pages é automático a cada push na branch `main` (`.github/workflows/deploy.yml`).

## Sugestões e bugs

Sugestões são muito bem-vindas! Abra uma [Issue](../../issues) descrevendo a ideia ou o problema.

## Direitos autorais

© 2026 ycborg. Todos os direitos reservados.

O código está visível para fins de transparência e portfólio. Não é concedida permissão para copiar, modificar, redistribuir ou publicar este projeto, no todo ou em parte, sem autorização por escrito do autor. O nome "CATS", o logotipo e as ilustrações também são de uso exclusivo do autor.
