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

export const getTeamFlagUrl = (shortName: string): string => {
  const code = FLAG_BY_TEAM[shortName] ?? shortName.toLowerCase();
  return `${import.meta.env.BASE_URL}flags/${code}.webp`;
};
