import { KNOWN_SLASH_TOKENS, MERGE_PAIRS, NOISE_WORDS, STOPWORDS, TOKEN_ALIASES } from '../data/linguagem';

export const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '');

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

/** Quebra de frase/lista: impede bigramas falsos entre itens ("React, TypeScript"). */
const SEGMENT_BREAK = /[;:!?()[\]{}"“”•·,|]|\.(?=\s|$)|\s[–—-]\s/;

export function splitSegments(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(SEGMENT_BREAK))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function trimTokenEdges(raw: string): string {
  const withoutTrailing = raw.replace(/[./-]+$/, '');
  return withoutTrailing === '.net' ? withoutTrailing : withoutTrailing.replace(/^[./-]+/, '');
}

/** Sanitiza e tokeniza um segmento preservando símbolos técnicos (c#, c++, node.js, ci/cd). */
export function tokenize(segment: string): string[] {
  // Mantém símbolos que fazem parte de termos: C#, C++, Node.js, CI/CD, NR-35, R&S.
  const sanitized = segment.toLowerCase().replace(/[^\p{L}\p{N}+#&./\-\s]/gu, ' ');
  const tokens = sanitized
    .split(/\s+/)
    .map(trimTokenEdges)
    .filter(Boolean)
    .flatMap((token) =>
      token.includes('/') && !KNOWN_SLASH_TOKENS.has(stripAccents(token))
        ? token.split('/').filter(Boolean)
        : [token],
    );

  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i] ?? '';
    const next = tokens[i + 1];
    const fused = next ? MERGE_PAIRS[`${stripAccents(current)} ${stripAccents(next)}`] : undefined;
    if (fused) {
      merged.push(fused);
      i += 1;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

/** Stemming leve PT/EN: reduz plurais para que "testes" e "teste" coincidam. */
function stem(token: string): string {
  if (!/^[a-z]+$/.test(token) || token.length <= 4) return token;
  if (token.endsWith('oes') || token.endsWith('aes')) return `${token.slice(0, -3)}ao`;
  if (token.endsWith('ais')) return `${token.slice(0, -3)}al`;
  if (token.endsWith('eis')) return `${token.slice(0, -3)}el`;
  if (/(r|z)es$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function canonicalToken(token: string): string {
  const plain = stripAccents(token);
  const alias = TOKEN_ALIASES[plain];
  // Alias de várias palavras ("powerbi" → "power bi") precisa casar com o bigrama equivalente.
  if (alias?.includes(' ')) return alias.split(' ').map(stem).join(' ');
  return stem(alias ?? plain);
}

/**
 * Forma "como está escrita" (sem aliases): detecta quando o currículo só bate com a vaga por
 * equivalência ("JS" ↔ "JavaScript"). Plurais curtos ("APIs") são normalizados para não gerar ruído.
 */
export function literalToken(token: string): string {
  const plain = stripAccents(token);
  if (plain.length === 4 && /^[a-z]+s$/.test(plain)) return plain.slice(0, -1);
  return stem(plain);
}

/** Chave canônica de um termo de uma ou mais palavras. */
export const termKey = (text: string): string => tokenize(text).map(canonicalToken).join(' ');

export const isStopword = (token: string): boolean => STOPWORDS.has(stripAccents(token));

export const isNoise = (token: string): boolean =>
  NOISE_WORDS.has(stripAccents(token)) || NOISE_WORDS.has(canonicalToken(token));

/** Heurística para descartar verbos no infinitivo, gerúndios e advérbios ("desenvolver", "atuando"). */
export function isVerbLike(token: string): boolean {
  const plain = stripAccents(token);
  return /^[a-z]{4,}(ar|er|ir)$/.test(plain) || /^[a-z]{3,}(ando|endo|indo)$/.test(plain) || /^[a-z]{3,}mente$/.test(plain);
}
