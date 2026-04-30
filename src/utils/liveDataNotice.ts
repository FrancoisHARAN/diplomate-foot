const restrictedCompetitions = [
  { code: 'EL', name: 'Europa League' },
  { code: 'UCL', name: 'Conference League' },
];

const formatList = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
};

export const getLiveDataNotice = (message?: string | null): string | null => {
  if (!message) return null;

  const restricted = restrictedCompetitions
    .filter((competition) => message.includes(`${competition.code}: 403`))
    .map((competition) => competition.name);

  if (restricted.length > 0) {
    return `${formatList(restricted)} ne sont pas disponibles avec la clé football-data actuelle. Il faut une offre/API qui autorise ces compétitions pour afficher leurs matchs en live.`;
  }

  return message;
};
