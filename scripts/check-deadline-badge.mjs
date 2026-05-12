import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const timerSource = readFileSync(new URL('src/utils/deadlineTimer.ts', root), 'utf8');
const badgeSource = readFileSync(new URL('src/components/DeadlineBadge.tsx', root), 'utf8');

if (!badgeSource.includes('deadline-badge')) {
  throw new Error('DeadlineBadge must render the shared deadline-badge class.');
}

if (!badgeSource.includes('window.setInterval')) {
  throw new Error('DeadlineBadge must refresh dynamically.');
}

const compiled = ts.transpileModule(timerSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;

const context = {};
vm.runInNewContext(
  `${compiled.replace(/export /g, '')}
globalThis.formatRemainingTime = formatRemainingTime;
globalThis.getDeadlineTone = getDeadlineTone;`,
  context,
);

const { formatRemainingTime, getDeadlineTone } = context;
const now = new Date('2026-06-01T12:00:00.000Z');

const cases = [
  ['2026-06-04T16:00:00.000Z', '3J 4H'],
  ['2026-06-01T17:12:00.000Z', '5H 12M'],
  ['2026-06-01T12:42:09.000Z', '42M 09S'],
  ['2026-06-01T12:00:08.000Z', '8S'],
  ['2026-06-01T17:00:00.000Z', '5H'],
];

for (const [deadline, expected] of cases) {
  const actual = formatRemainingTime(deadline, now);
  if (actual !== expected) {
    throw new Error(`Expected ${expected} for ${deadline}, got ${actual}`);
  }
}

if (formatRemainingTime('2026-06-01T17:00:00.000Z', now).includes('0J')) {
  throw new Error('Timer must not render leading zero day units.');
}

if (getDeadlineTone('2026-06-01T16:59:00.000Z', now) !== 'urgent') {
  throw new Error('Timer must be urgent under 5H.');
}

if (getDeadlineTone('2026-06-01T17:00:00.000Z', now) !== 'open') {
  throw new Error('Timer must stay green at 5H or more.');
}

if (getDeadlineTone('2026-06-01T11:59:59.000Z', now) !== 'closed') {
  throw new Error('Expired timer must be closed.');
}

console.log('Deadline badge checks passed.');
