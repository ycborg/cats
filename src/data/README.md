# Dados do CATS

Esta pasta guarda **dados**, não lógica. É aqui que você amplia o que o CATS sabe, sem mexer no motor de análise.

| Arquivo | O que contém |
|---|---|
| `lexicon/*.ts` | Competências de cada área (uma área por arquivo) e seus sinônimos |
| `lexicon/index.ts` | Junta todas as áreas automaticamente (não precisa editar) |
| `cargos.ts` | Palavras de títulos de cargo (funções, áreas, níveis), usadas para comparar o cargo da vaga com o do currículo |
| `linguagem.ts` | Regras de linguagem: stopwords, palavras genéricas ignoradas e grafias equivalentes |

## Como adicionar termos a uma área

Abra o arquivo da área (ex.: `lexicon/financas.ts`) e acrescente o termo na lista certa:

```ts
hardSkills: [
  'Conciliação Bancária',
  'Fluxo de Caixa',
  'Novo Termo Aqui',
],
```

- Escreva o termo **como deve aparecer na tela**, com acentos e maiúsculas. O CATS normaliza sozinho: acentos, plural e maiúsculas não importam na comparação.
- `hardSkills`: ferramentas, técnicas, normas, sistemas e conhecimentos específicos.
- `softSkills`: competências comportamentais, idiomas e metodologias.

## Como adicionar sinônimos

```ts
synonyms: [
  ['Recrutamento e Seleção', 'R&S', 'Talent Acquisition'],
],
```

- O **primeiro** termo do grupo é o que o CATS exibe.
- Só agrupe termos que são **a mesma coisa** com nomes diferentes (sigla, tradução, grafia). Termos apenas parecidos (Vue × React, Gestão de Estoque × Logística) **não** são sinônimos: o ATS real não os trata como equivalentes, e o CATS também não deve tratar.

## Regras para não gerar falsos positivos

1. **Evite palavras soltas genéricas.** "Vendas", "Compras" ou "Logística" aparecem na descrição da empresa ("líder em vendas online") e virariam palavra-chave por engano. Prefira expressões específicas, como "Técnicas de Vendas", "Gestão de Compras" ou "Logística Reversa".
2. **Palavras soltas só se forem inequívocas:** nomes de sistemas e normas (eSocial, AutoCAD, SAP, IFRS, NR-35).
3. **Cuidado com siglas curtas** que também são palavras comuns, em português ou inglês. "IA" também é verbo, e "CAR" é palavra em inglês. Na dúvida, use a forma por extenso.
4. Se o mesmo termo aparecer em duas áreas, tudo bem: o CATS junta as duas ocorrências.

## Nova área

Crie um arquivo novo em `lexicon/` (ex.: `lexicon/educacao.ts`) copiando a estrutura de outra área. Não é preciso registrá-lo em lugar nenhum: o CATS carrega automaticamente todos os arquivos da pasta.

```ts
import { defineArea } from './types';

export default defineArea({
  area: 'Educação',
  hardSkills: ['Planejamento de Aulas', 'BNCC', 'Educação Inclusiva'],
  softSkills: [],
  synonyms: [['BNCC', 'Base Nacional Comum Curricular']],
});
```

Se o arquivo estiver fora desse formato, o site mostra um erro dizendo qual arquivo corrigir.
