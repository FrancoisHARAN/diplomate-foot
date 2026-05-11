export const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  ARG: 'Argentine',
  BEL: 'Belgique',
  BRA: 'Brésil',
  CAN: 'Canada',
  COL: 'Colombie',
  CRO: 'Croatie',
  ENG: 'Angleterre',
  ESP: 'Espagne',
  FRA: 'France',
  GER: 'Allemagne',
  ITA: 'Italie',
  JPN: 'Japon',
  MAR: 'Maroc',
  MEX: 'Mexique',
  NED: 'Pays-Bas',
  POR: 'Portugal',
  SEN: 'Sénégal',
  USA: 'États-Unis',
};

export const COUNTRY_FLAG_FILE_BY_CODE: Record<string, string> = {
  ARG: 'ar.webp',
  BRA: 'br.webp',
  CAN: 'ca.webp',
  ESP: 'es.webp',
  FRA: 'fr.webp',
  GER: 'de.webp',
  JPN: 'jp.webp',
  MAR: 'ma.webp',
  MEX: 'mx.webp',
  POR: 'pt.webp',
  SEN: 'sn.webp',
  USA: 'us.webp',
};

export const getCountryFlagUrl = (countryCode?: string | null): string | undefined => {
  if (!countryCode) return undefined;
  const file = COUNTRY_FLAG_FILE_BY_CODE[countryCode.toUpperCase()];
  return file ? `${import.meta.env.BASE_URL}flags/${file}` : undefined;
};

export const getCountryDisplayName = (countryCode?: string | null): string | undefined => {
  if (!countryCode) return undefined;
  return COUNTRY_NAME_BY_CODE[countryCode.toUpperCase()];
};
