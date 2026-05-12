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
