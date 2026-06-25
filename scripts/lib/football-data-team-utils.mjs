export const cleanTeamName = (name) =>
  String(name ?? '')
    .replace(/\bFC\b/g, '')
    .replace(/\bCF\b/g, '')
    .replace(/\bAFC\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeLabel = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const placeholderPatterns = [
  /^$/,
  /^t$/,
  /^tbd$/,
  /^to be determined$/,
  /^a determiner$/,
  /^a definir$/,
  /^home team$/,
  /^away team$/,
  /^equipe domicile$/,
  /^equipe exterieure$/,
  /^winner( of)? group [a-z0-9]+$/,
  /^runner up group [a-z0-9]+$/,
  /^runner up [a-z0-9 ]+$/,
  /^[123](st|nd|rd|e|er)? group [a-z0-9]+$/,
  /^best [123](st|nd|rd|e|er)?$/,
  /^best [123](st|nd|rd|e|er)? placed$/,
  /^best third$/,
  /^best 3rd$/,
  /^vainqueur groupe [a-z0-9]+$/,
  /^deuxieme groupe [a-z0-9]+$/,
  /^meilleur troisieme$/,
];

export const isPlaceholderTeamName = (value) => {
  const normalized = normalizeLabel(value);
  return placeholderPatterns.some((pattern) => pattern.test(normalized));
};

const hasRealTeamName = (team) => {
  const label = cleanTeamName(team?.name ?? team?.shortName ?? '');
  return Boolean(label && !isPlaceholderTeamName(label));
};

export const shortNameFor = (team = {}) => {
  if (team.tla) return team.tla;
  if (team.shortName) return team.shortName.slice(0, 4).toUpperCase();
  return cleanTeamName(team.name ?? 'Team')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
};

export const hasUsefulTeam = (team) => {
  if (!team) return false;
  return Boolean(team.id || team.crest || hasRealTeamName(team));
};

const fallbackCountryCodeFor = (team = {}) => shortNameFor(team);

export const normalizeTeam = (
  team,
  knownTeam,
  fallbackId,
  fallbackName,
  isNationalTeam = false,
  countryCodeFor = fallbackCountryCodeFor,
) => {
  const apiTeamIsUseful = hasUsefulTeam(team);
  const sourceTeam = apiTeamIsUseful ? team : knownTeam;
  const displayName = apiTeamIsUseful ? sourceTeam?.shortName ?? sourceTeam?.name : knownTeam?.name;

  const normalized = {
    id: String(sourceTeam?.id ?? fallbackId),
    name: cleanTeamName(displayName ?? fallbackName),
    shortName: shortNameFor(sourceTeam ?? {}),
    crest: sourceTeam?.crest ?? undefined,
  };

  if (isNationalTeam) {
    normalized.countryCode = countryCodeFor(sourceTeam ?? { name: fallbackName });
  }

  return normalized;
};

export const isPlaceholderTeam = (team) => {
  if (!team) return true;
  return !hasRealTeamName(team);
};

export const isDisplayableMatch = (match) => !isPlaceholderTeam(match.homeTeam) && !isPlaceholderTeam(match.awayTeam);
