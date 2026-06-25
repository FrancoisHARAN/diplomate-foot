const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isFranceTeam = (team = {}) => {
  const candidates = [team.countryCode, team.shortName, team.tla, team.name]
    .map(normalize)
    .filter(Boolean);
  return candidates.some((candidate) => candidate === 'fra' || candidate === 'france');
};

const isWorldCup2026Competition = (competition = {}) => {
  if (competition.isWorldCup2026) return true;
  const text = normalize([
    competition.code,
    competition.apiCode,
    competition.sourceCompetitionId,
    competition.name,
    competition.season,
  ].filter(Boolean).join(' '));
  const isWorldCup = text.includes('wc2026') || text.includes('world cup') || text.includes('coupe du monde') || /\bwc\b/.test(text);
  const isOtherWorldCup = text.includes('qualif') || text.includes('qualification') || text.includes('friendly') || text.includes('amical');
  return isWorldCup && !isOtherWorldCup;
};

const worldCupStageMultiplier = (match = {}) => {
  const stage = normalize([match.stage, match.round, match.group, match.matchday].filter(Boolean).join(' '));
  if (stage.includes('semi') || stage.includes('demi')) return 4;
  if (stage.includes('third place') || stage.includes('3e place') || stage.includes('troisieme')) return 3;
  if (stage.includes('quarter') || stage.includes('quart')) return 3;
  if (stage.includes('round of 16') || stage.includes('last 16') || stage.includes('huitieme')) return 2;
  if (stage.includes('final') || stage.includes('finale')) return 5;
  return 1;
};

export const getApiMatchPointsMultiplier = ({ competition = {}, match = {}, homeTeam = {}, awayTeam = {} }) => {
  const explicit = Number(match.pointsMultiplier ?? match.points_multiplier ?? 1);
  const candidates = [Number.isFinite(explicit) && explicit > 1 ? explicit : 1];

  if (isWorldCup2026Competition(competition)) {
    candidates.push(isFranceTeam(homeTeam) || isFranceTeam(awayTeam) ? 2 : 1);
    candidates.push(worldCupStageMultiplier(match));
  }

  return Math.max(...candidates);
};
