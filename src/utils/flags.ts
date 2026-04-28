const FLAG_BY_TEAM: Record<string, string> = {
  ARG: 'ar',
  BRA: 'br',
  CAN: 'ca',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  JPN: 'jp',
  MAR: 'ma',
  MEX: 'mx',
  POR: 'pt',
  SEN: 'sn',
  USA: 'us',
};

export const getTeamFlagUrl = (shortName: string): string | null => {
  const code = FLAG_BY_TEAM[shortName];
  return code ? `${import.meta.env.BASE_URL}flags/${code}.webp` : null;
};

export const getTeamInitials = (name: string, shortName: string): string => {
  if (shortName.length <= 4) return shortName;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};
