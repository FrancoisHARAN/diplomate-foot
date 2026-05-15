const normalizeTeam = (team = {}) => ({
  id: String(team.id ?? ''),
  name: String(team.name ?? ''),
  shortName: String(team.shortName ?? ''),
  countryCode: team.countryCode ?? null,
});

const normalizeMatchForComparison = (match = {}) => ({
  id: String(match.id ?? ''),
  externalId: match.externalId ?? null,
  competitionCode: match.competitionCode ?? null,
  competitionName: match.competitionName ?? null,
  kickoff: match.kickoff ?? null,
  status: match.status ?? null,
  homeScore: match.homeScore ?? null,
  awayScore: match.awayScore ?? null,
  scoreKind: match.scoreKind ?? null,
  scoreSource: match.scoreSource ?? null,
  minute: match.minute ?? null,
  matchday: match.matchday ?? null,
  stage: match.stage ?? null,
  round: match.round ?? null,
  group: match.group ?? null,
  season: match.season ?? null,
  pointsMultiplier: match.pointsMultiplier ?? 1,
  homeTeam: normalizeTeam(match.homeTeam),
  awayTeam: normalizeTeam(match.awayTeam),
});

const normalizeMatches = (payload) =>
  [...(payload?.matches ?? [])]
    .map(normalizeMatchForComparison)
    .sort((left, right) => left.id.localeCompare(right.id));

export const hasMeaningfulFootballDataChange = (previousPayload, nextPayload) =>
  JSON.stringify(normalizeMatches(previousPayload)) !== JSON.stringify(normalizeMatches(nextPayload));

export const buildLiveDataPayload = ({ previousPayload, nextPayload, nowIso }) => {
  if (!previousPayload) {
    return {
      ...nextPayload,
      generatedAt: nowIso,
      lastDataChangedAt: nowIso,
    };
  }

  if (!hasMeaningfulFootballDataChange(previousPayload, nextPayload)) {
    return previousPayload;
  }

  return {
    ...nextPayload,
    generatedAt: nowIso,
    lastDataChangedAt: nowIso,
  };
};
