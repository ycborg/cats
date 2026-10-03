import type { CredentialCheck, EducationAnalysis, EducationLevel } from '../types/ats';
import { jobContentLines } from './jobSections';
import type { Block } from './resumeBuilder';
import { stripAccents, termKey } from './textProcessing';

const LEVEL_RANK: Record<EducationLevel, number> = {
  medio: 1, tecnico: 2, superior: 3, pos: 4, mestrado: 5, doutorado: 6,
};

/** Padrões de nível, do mais alto para o mais baixo (texto sem acento, minúsculo). */
const LEVEL_PATTERNS: Array<[EducationLevel, RegExp]> = [
  ['doutorado', /\b(doutorado|doutor|phd|ph\.d|doctorate)\b/],
  // "master" só com contexto acadêmico, para não confundir com "Scrum Master".
  ['mestrado', /\b(mestrado|mestre|msc|m\.sc|master'?s? (?:degree|of|in|em))\b/],
  ['pos', /\b(pos[- ]graduacao|pos[- ]graduado|especializacao|mba|lato sensu|postgraduate)\b/],
  ['superior', /\b(superior|graduacao|graduado|bacharel(ado)?|licenciatura|tecnologo|faculdade|universidade|bachelor'?s?|degree|college)\b/],
  ['tecnico', /\b(curso tecnico|tecnico em|ensino tecnico|technical degree)\b/],
  ['medio', /\b(ensino medio|segundo grau|high school)\b/],
];

const IN_PROGRESS = /\b(cursando|em andamento|incompleto|trancado|previsao|conclusao prevista|in progress|expected)\b/;
const ACCEPTS_IN_PROGRESS = /\b(cursando|em andamento|ou cursando|completo ou cursando|in progress)\b/;
const COMPLETION_REQUIRED = /\b(completo|completa|concluido|concluida|formado|formada|graduated)\b/;

/** Registros profissionais e certificações conhecidas, em várias áreas. */
const CREDENTIAL_PATTERNS: Array<[string, RegExp]> = [
  ['OAB', /\boab\b/], ['CRC', /\bcrc\b/], ['CRM', /\bcrm\b(?!\s*(?:de vendas|salesforce|hubspot))/],
  ['COREN', /\bcoren\b/], ['CREA', /\bcrea\b/], ['CAU', /\bcau\b/], ['CRP', /\bcrp\b/], ['CRF', /\bcrf\b/],
  ['CRN', /\bcrn\b/], ['CREFITO', /\bcrefito\b/], ['CRO', /\bcro\b/], ['CRA', /\bcra\b/], ['CORECON', /\bcorecon\b/],
  ['CPA-10', /\bcpa[- ]?10\b/], ['CPA-20', /\bcpa[- ]?20\b/], ['CEA', /\bcea\b/], ['CFP', /\bcfp\b/], ['CFA', /\bcfa\b/],
  ['PMP', /\bpmp\b/], ['CAPM', /\bcapm\b/], ['PSM', /\bpsm\b/], ['CSM', /\bcsm\b/], ['PSPO', /\bpspo\b/],
  ['ITIL', /\bitil\b/], ['COBIT', /\bcobit\b/], ['Six Sigma', /\b(six sigma|green belt|black belt)\b/],
  ['AWS Certified', /\baws certified\b/], ['Azure (AZ/AI/DP)', /\b(az|ai|dp)-\d{3}\b/], ['CCNA', /\bccna\b/],
  ['CompTIA', /\bcomptia\b/], ['CISSP', /\bcissp\b/], ['TOEFL/IELTS', /\b(toefl|ielts)\b/],
  ['NR-10', /\bnr[- ]?10\b/], ['NR-35', /\bnr[- ]?35\b/], ['NR-33', /\bnr[- ]?33\b/], ['NR-12', /\bnr[- ]?12\b/],
  ['CNH', /\bcnh\b/], ['ACLS/BLS', /\b(acls|bls|pals)\b/],
];

/** Ex.: "Superior completo em Ciência da Computação, Sistemas de Informação ou áreas afins". */
const FIELD_PATTERN =
  /(?:superior|graduacao|graduado|formacao|bacharelado|licenciatura|tecnologo|degree|curso tecnico)\s*(?:completo|completa|concluido|concluida)?\s*(?:em|in|na area de)\s+([^.;\n]+)/;

function detectLevel(text: string): EducationLevel | null {
  return LEVEL_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

function splitFields(raw: string): string[] {
  return raw
    .replace(/\b(ou areas afins|areas afins|ou afins|or related fields?|or similar|related)\b.*$/, '')
    .split(/,|\bou\b|\be\b|\bor\b|\band\b|\//)
    .map((field) => field.trim())
    .filter((field) => field.length >= 3);
}

export function analyzeEducation(jobText: string, resumeText: string, blocks: Block[]): EducationAnalysis {
  let requiredLevel: EducationLevel | null = null;
  let requiresCompletion = false;
  let requiredFields: string[] = [];
  const requiredCredentials = new Set<string>();

  for (const { text, mode } of jobContentLines(jobText)) {
    if (mode === 'nice') continue;
    const plain = stripAccents(text.toLowerCase());
    const level = detectLevel(plain);
    // Linhas genéricas ("experiência em faculdade X") só contam se falam de formação.
    if (level && /(formacao|graduacao|superior|ensino|bacharel|licenciatura|tecnologo|degree|pos|mba|mestrado|doutorado|curso)/.test(plain)) {
      if (!requiredLevel || LEVEL_RANK[level] < LEVEL_RANK[requiredLevel]) requiredLevel = level; // o mínimo aceito
      requiresCompletion = COMPLETION_REQUIRED.test(plain) && !ACCEPTS_IN_PROGRESS.test(plain);
      const field = FIELD_PATTERN.exec(plain);
      if (field?.[1]) requiredFields = splitFields(field[1]);
    }
    for (const [name, pattern] of CREDENTIAL_PATTERNS) if (pattern.test(plain)) requiredCredentials.add(name);
  }

  // Formação do currículo: seção de formação/certificações, ou o texto todo se não houver seção.
  const educationText = stripAccents(
    blocks
      .filter((block) => block.id === 'education' || block.id === 'certifications')
      .flatMap((block) => block.lines)
      .join('\n')
      .toLowerCase(),
  );
  const resumePlain = stripAccents(resumeText.toLowerCase());
  const searchText = educationText || resumePlain;

  let resumeLevel: EducationLevel | null = null;
  let resumeLevelInProgress = false;
  for (const line of searchText.split('\n')) {
    const level = detectLevel(line);
    if (!level) continue;
    const inProgress = IN_PROGRESS.test(line);
    const better = !resumeLevel || LEVEL_RANK[level] > LEVEL_RANK[resumeLevel];
    const sameButCompleted = resumeLevel === level && resumeLevelInProgress && !inProgress;
    if (better || sameButCompleted) {
      resumeLevel = level;
      resumeLevelInProgress = inProgress;
    }
  }

  const educationKeys = termKey(searchText);
  const fieldMatched = requiredFields.length
    ? requiredFields.some((field) => {
        const key = termKey(field);
        return key.length > 0 && ` ${educationKeys} `.includes(` ${key} `);
      })
    : null;

  const credentials: CredentialCheck[] = [...requiredCredentials].map((name) => {
    const pattern = CREDENTIAL_PATTERNS.find(([credential]) => credential === name)![1];
    return { name, found: pattern.test(resumePlain) };
  });

  // Componentes exigidos pela vaga; os não exigidos saem da conta.
  const parts: Array<{ weight: number; score: number }> = [];
  if (requiredLevel) {
    let levelScore = 0;
    if (resumeLevel && LEVEL_RANK[resumeLevel] > LEVEL_RANK[requiredLevel]) levelScore = 100;
    else if (resumeLevel === requiredLevel) levelScore = resumeLevelInProgress && requiresCompletion ? 50 : 100;
    parts.push({ weight: 60, score: levelScore });
  }
  if (fieldMatched !== null) parts.push({ weight: 20, score: fieldMatched ? 100 : 0 });
  if (credentials.length) {
    const found = credentials.filter((credential) => credential.found).length;
    parts.push({ weight: 20, score: Math.round((found / credentials.length) * 100) });
  }

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  const score = totalWeight
    ? Math.round(parts.reduce((sum, part) => sum + part.weight * part.score, 0) / totalWeight)
    : null;

  return {
    requiredLevel,
    requiresCompletion,
    resumeLevel,
    resumeLevelInProgress,
    requiredFields,
    fieldMatched,
    credentials,
    score,
  };
}

export const EDUCATION_LEVEL_LABEL: Record<EducationLevel, string> = {
  medio: 'Ensino médio',
  tecnico: 'Técnico',
  superior: 'Ensino superior',
  pos: 'Pós-graduação / MBA',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
};
