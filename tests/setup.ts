import { vi } from 'vitest';

/**
 * Data fixa: períodos "até o momento" ("mar/2022 – atual") são contados até hoje. Sem isso, os anos
 * de experiência (e os scores) mudariam sozinhos com o passar dos meses e os testes quebrariam à toa.
 */
vi.useFakeTimers({ now: new Date('2026-10-01T12:00:00'), toFake: ['Date'] });
