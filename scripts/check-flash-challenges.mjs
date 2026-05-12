import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

for (const expected of [
  'Dembélé buteur ?',
  'Dembélé marque-t-il contre Lens ?',
  'Oui, il marque',
  'Non, il ne marque pas',
  'fd-542664',
]) {
  if (!schema.includes(expected)) {
    throw new Error(`Missing seeded Dembélé flash detail in schema: ${expected}`);
  }
}

if (!schema.includes('into v_flash_id') || !schema.includes('where title =')) {
  throw new Error('Dembélé flash seed must stay idempotent and avoid duplicates.');
}

const challenge = {
  status: 'resolved',
  resultOptionId: 'yes',
  options: [
    { id: 'yes', label: 'Oui', pointsIfCorrect: 5 },
    { id: 'no', label: 'Non', pointsIfCorrect: 2 },
  ],
};

const calculate = (flash, optionId) => {
  if (flash.status !== 'resolved') return null;
  if (flash.resultOptionId !== optionId) return 0;
  return flash.options.find((option) => option.id === optionId)?.pointsIfCorrect ?? 0;
};

if (calculate({ ...challenge, status: 'open' }, 'yes') !== null) {
  throw new Error('Open flash challenges should keep points pending.');
}

if (calculate(challenge, 'yes') !== 5) {
  throw new Error('Winning "Oui" option should grant 5 points.');
}

if (calculate(challenge, 'no') !== 0) {
  throw new Error('Wrong flash answer should grant 0 points.');
}

if (calculate({ ...challenge, resultOptionId: 'no' }, 'no') !== 2) {
  throw new Error('Winning "Non" option should grant 2 points.');
}

console.log('Flash challenge checks passed.');
