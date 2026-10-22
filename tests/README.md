# Testes do CATS

Os testes verificam o motor de análise sozinhos, em cerca de 2 segundos. Rodam automaticamente no GitHub em toda PR e antes de todo deploy: se algum falhar, o site não é atualizado.

```bash
npm test            # roda tudo uma vez
npm run test:watch  # roda de novo a cada arquivo salvo (bom enquanto mexe no filtro)
```

## Anotando um caso novo

Achou um problema na análise? Anote em [`casos/casos.ts`](casos/casos.ts) **antes** de corrigir:

```ts
{
  nome: 'Usuário X: "dinâmico" virava palavra-chave',
  vaga: `Analista de Marketing
Requisitos
- Perfil dinâmico, ambiente dinâmico.`,
  nuncaPalavrasChave: ['dinâmico'],
},
```

1. Rode `npm test`: o caso novo **falha** (prova que o problema existe).
2. Corrija o filtro (normalmente em `src/data/`).
3. Rode `npm test` de novo: tudo verde. A partir daí o problema nunca mais volta sem alguém perceber.

Expectativas disponíveis: `nuncaPalavrasChave`, `palavrasChave`, `encontradas`, `faltando`, `errosDeDigitacao`, `semErroDeDigitacao`, `titulo`, `anosExigidos`, `formacaoNoCurriculo`, `nota` e `nivel`. A descrição de cada uma está no topo de `casos/casos.ts`.

## O que cada arquivo cobre

| Arquivo | O que garante |
|---|---|
| `casos.test.ts` | Os casos anotados em `casos/casos.ts` |
| `exemplos.test.ts` | A nota dos 8 exemplos do site. Se uma melhoria mudar alguma nota de propósito, atualize os números lá |
| `palavrasChave.test.ts` | Nenhuma stopword ou palavra genérica vira palavra-chave (testa a lista inteira), pesos de requisito e diferencial, sinônimos, termos em contexto |
| `dicionario.test.ts` | Regras de qualidade de `src/data/lexicon`: termo vazio, duplicado, só stopword, sinônimo apontando para dois lugares |
| `textoBase.test.ts` | Acentos, plural, símbolos técnicos (C#, Node.js, CI/CD), verbos e advérbios |
| `titulos.test.ts` | Comparação de cargos (gênero, grafia, senioridade, áreas) |
| `criterios.test.ts` | Datas e anos de experiência, formação, legibilidade (incluindo colunas) e a conta da nota final |
| `importacao.test.ts` | Leitura de PDF (linhas, frases quebradas, colunas) e DOCX (colunas e tabelas) |
| `exportacaoERascunho.test.ts` | Exportação em Word e texto (o .docx gerado é reimportado) e o rascunho salvo no navegador |

A data de "hoje" é fixada em `setup.ts` (01/10/2026). Assim, períodos "até o momento" não mudam as notas com o passar dos meses.
