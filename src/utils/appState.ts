import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { mockPredictions } from '../data/mockPredictions';
import { isSupabaseConfigured, supabaseRpc } from '../lib/supabaseClient';
import type { ExactPredictionHighlight, FlashChallenge, FlashOption, FlashPrediction, Match, Player, Prediction, PredictionResultType, PublicFlashPrediction, PublicMatchPrediction, PublicPlayerProfile, PublicPrediction, Standing, Team, WorldCupWinnerPrediction } from '../types';
import { canEditPrediction } from './date';
import { getRecentExactPredictionHighlights } from './exactPredictions';
import { calculateFlashPredictionPoints, getFlashOption, getFlashPredictionResultType, isFlashChallengeOpen } from './flashChallenges';
import { sortLeaderboardEntries } from './leaderboard';
import { applyMatchMultiplier, calculatePredictionPoints, calculatePredictionPointsForMatch, getPredictionResultTypeForMatch, isMatchFinal } from './points';
import { isPredictionPublic } from './predictionVisibility';
import { getWorldCupWinnerCountryName, isWorldCupTopThreeLocked, validateWorldCupWinnerPredictionCodes } from './worldCupWinnerPredictions';

const STORAGE_KEYS = {
  currentPlayer: 'diplomate.currentPlayer',
  predictions: 'diplomate.predictions',
  profileImages: 'diplomate.profileImages',
  cloudPlayerState: 'diplomate.cloudPlayerState',
  cloudLeaderboard: 'diplomate.cloudLeaderboard',
  worldCupWinnerPredictions: 'diplomate.worldCupWinnerPredictions',
  flashChallenges: 'diplomate.flashChallenges',
  flashPredictions: 'diplomate.flashPredictions',
};

export interface CurrentPlayer {
  id: string;
  nickname: string;
  displayName?: string;
  avatarUrl?: string;
  sessionToken?: string;
  legacyId?: string;
  points?: number;
  rank?: number;
}

interface RpcPlayerSummary {
  player_id: string;
  nickname: string;
  display_name?: string | null;
  avatar_url?: string | null;
  points?: number | null;
  exact_scores?: number | null;
  correct_results?: number | null;
  rank?: number | null;
  session_token?: string | null;
}

interface RpcPredictionRow {
  id?: string | null;
  player_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points?: number | null;
  updated_at?: string | null;
}

interface RpcPlayerState {
  player: RpcPlayerSummary;
  predictions: RpcPredictionRow[];
}

interface RpcLeaderboardRow {
  player_id: string;
  nickname: string;
  display_name?: string | null;
  avatar_url?: string | null;
  points: number;
  exact_scores: number;
  two_point_results?: number | null;
  correct_results: number;
  first_prediction_at?: string | null;
  rank: number;
}

interface RpcMatchRow {
  id: string;
  external_id?: string | null;
  competition_code?: string | null;
  competition_name?: string | null;
  home_team?: Team | null;
  away_team?: Team | null;
  kickoff: string;
  status: Match['status'];
  home_score?: number | null;
  away_score?: number | null;
  minute?: number | null;
  venue?: string | null;
  matchday?: number | null;
  stage?: string | null;
  round?: string | null;
  group_name?: string | null;
  season?: number | null;
  source_competition_id?: string | null;
  points_multiplier?: number | null;
  source?: string | null;
  last_updated?: string | null;
}

interface RpcPublicPredictionRow extends RpcPredictionRow {
  prediction_id?: string | null;
  predicted_home_score?: number | null;
  predicted_away_score?: number | null;
  final_home_score?: number | null;
  final_away_score?: number | null;
  created_at?: string | null;
  points?: number | null;
  match?: RpcMatchRow | null;
  result_type?: PredictionResultType | null;
  is_finished?: boolean | null;
  is_live?: boolean | null;
  is_locked?: boolean | null;
}

interface RpcPublicMatchPredictionRow {
  prediction_id?: string | null;
  player_id: string;
  nickname: string;
  display_name?: string | null;
  avatar_url?: string | null;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  final_home_score?: number | null;
  final_away_score?: number | null;
  points?: number | null;
  result_type?: PredictionResultType | null;
  updated_at?: string | null;
}

interface RpcPublicPlayerProfile {
  player: RpcPlayerSummary & {
    two_point_results?: number | null;
    one_point_results?: number | null;
    first_prediction_at?: string | null;
    visible_predictions_count?: number | null;
  };
  predictions: RpcPublicPredictionRow[];
  world_cup_winner_prediction?: RpcWorldCupWinnerPrediction | null;
  visible_predictions_count?: number | null;
}

interface RpcExactPredictionWinner {
  player_id: string;
  nickname: string;
  display_name?: string | null;
  avatar_url?: string | null;
  home_score: number;
  away_score: number;
}

interface RpcExactPredictionHighlight {
  match_id: string;
  match: RpcMatchRow;
  winners: RpcExactPredictionWinner[];
}

interface RpcWorldCupWinnerPrediction {
  id: string;
  player_id: string;
  first_choice_code: string;
  second_choice_code: string;
  third_choice_code: string;
  first_choice_name?: string | null;
  second_choice_name?: string | null;
  third_choice_name?: string | null;
  locked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RpcFlashOptionRow {
  id: string;
  flash_id?: string | null;
  label: string;
  points_if_correct: number;
  sort_order?: number | null;
}

interface RpcFlashChallengeRow {
  id: string;
  title: string;
  description?: string | null;
  match_id?: string | null;
  match_label?: string | null;
  closes_at: string;
  status: FlashChallenge['status'];
  result_option_id?: string | null;
  options?: RpcFlashOptionRow[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface RpcFlashPredictionRow {
  id: string;
  flash_id: string;
  option_id: string;
  player_id: string;
  points?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  challenge?: RpcFlashChallengeRow | null;
  selected_option?: RpcFlashOptionRow | null;
}

const readJson = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeIdentity = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeNickname = (nickname: string): string => normalizeIdentity(nickname);

const isUuid = (value?: string | null): boolean =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

export const canonicalPlayerId = (playerId?: string | null): string => {
  if (!playerId) return '';
  const normalized = normalizeIdentity(playerId);
  if (normalized.includes('francois')) return 'p-francois';
  if (normalized.includes('solene')) return 'p-solene';
  if (normalized.includes('frederique')) return 'p-frederique';
  if (normalized.includes('sylvain')) return 'p-sylvain';
  return playerId;
};

const legacyPlayerIdFromNickname = (nickname?: string | null): string => canonicalPlayerId(nickname) || '';

export const samePlayerId = (left?: string | null, right?: string | null): boolean =>
  Boolean(left && right && (left === right || canonicalPlayerId(left) === canonicalPlayerId(right)));

const playerAliases = (playerId?: string | null, nickname?: string | null): Set<string> => {
  const aliases = new Set<string>();
  if (playerId) {
    aliases.add(playerId);
    aliases.add(canonicalPlayerId(playerId) || playerId);
  }
  const legacyId = legacyPlayerIdFromNickname(nickname);
  if (legacyId) aliases.add(legacyId);
  return aliases;
};

const predictionBelongsToPlayer = (prediction: Prediction, player: CurrentPlayer): boolean => {
  const aliases = playerAliases(player.id, player.nickname);
  if (player.legacyId) aliases.add(player.legacyId);
  return aliases.has(prediction.playerId) || aliases.has(canonicalPlayerId(prediction.playerId));
};

export const getPlayerProfileImages = (): Record<string, string> => readJson<Record<string, string>>(STORAGE_KEYS.profileImages, {});

export const getPlayerAvatarUrl = (playerId: string): string | undefined => {
  const images = getPlayerProfileImages();
  return images[playerId] ?? Object.entries(images).find(([storedPlayerId]) => samePlayerId(storedPlayerId, playerId))?.[1];
};

const toCurrentPlayer = (player: RpcPlayerSummary): CurrentPlayer => ({
  id: player.player_id,
  nickname: player.display_name ?? player.nickname,
  displayName: player.display_name ?? player.nickname,
  avatarUrl: player.avatar_url ?? undefined,
  sessionToken: player.session_token ?? undefined,
  legacyId: legacyPlayerIdFromNickname(player.display_name ?? player.nickname),
  points: player.points ?? 0,
  rank: player.rank ?? undefined,
});

export const getCurrentPlayer = (): CurrentPlayer | null => readJson<CurrentPlayer | null>(STORAGE_KEYS.currentPlayer, null);

const updateCurrentPlayer = (patch: Partial<CurrentPlayer>): CurrentPlayer | null => {
  const current = getCurrentPlayer();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeJson(STORAGE_KEYS.currentPlayer, next);
  return next;
};

const writePlayerProfileImage = (playerId: string, imageDataUrl: string): void => {
  const canonicalId = canonicalPlayerId(playerId);
  writeJson(STORAGE_KEYS.profileImages, { ...getPlayerProfileImages(), [playerId]: imageDataUrl, [canonicalId]: imageDataUrl });
};

export const setPlayerProfileImage = async (playerId: string, imageDataUrl: string): Promise<CurrentPlayer | null> => {
  const current = getCurrentPlayer();

  if (isSupabaseConfigured) {
    if (!current?.sessionToken || !samePlayerId(current.id, playerId)) {
      throw new Error('Reconnecte-toi pour modifier ta photo.');
    }

    const player = await supabaseRpc<RpcPlayerSummary>('app_update_player_avatar', {
      p_session_token: current.sessionToken,
      p_avatar_url: imageDataUrl,
    });
    const next = toCurrentPlayer({ ...player, session_token: current.sessionToken });
    writeJson(STORAGE_KEYS.currentPlayer, next);
    writePlayerProfileImage(next.id, next.avatarUrl ?? imageDataUrl);
    return next;
  }

  writePlayerProfileImage(playerId, imageDataUrl);
  if (current && (current.id === playerId || samePlayerId(current.legacyId, playerId))) {
    return updateCurrentPlayer({ avatarUrl: imageDataUrl });
  }
  return current;
};

const findOrCreateLocalPlayer = (nickname: string, code: string): Player => {
  const clean = nickname.trim();
  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new Error('Le code secret doit contenir 6 chiffres.');
  }

  const existing = mockPlayers.find((player) => normalizeNickname(player.nickname) === normalizeNickname(clean));
  if (existing) return existing;

  return {
    id: `guest-${clean.toLowerCase().replace(/\s+/g, '-') || Date.now()}`,
    nickname: clean || 'Joueur',
    points: 0,
    exactScores: 0,
    correctResults: 0,
  };
};

export const loginPlayer = async (nickname: string, code: string): Promise<CurrentPlayer> => {
  if (isSupabaseConfigured) {
    const player = await supabaseRpc<RpcPlayerSummary>('app_login_player', {
      p_nickname: nickname.trim(),
      p_code: code.trim(),
    });
    const auth = toCurrentPlayer(player);
    writeJson(STORAGE_KEYS.currentPlayer, auth);
    await syncLocalPredictionsToCloud(auth);
    await syncCloudState();
    return getCurrentPlayer() ?? auth;
  }

  const player = findOrCreateLocalPlayer(nickname, code);
  const auth: CurrentPlayer = {
    id: player.id,
    nickname: player.nickname,
    displayName: player.nickname,
    avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl,
    legacyId: canonicalPlayerId(player.id),
  };
  writeJson(STORAGE_KEYS.currentPlayer, auth);
  return auth;
};

export const logoutPlayer = (): void => {
  localStorage.removeItem(STORAGE_KEYS.currentPlayer);
  localStorage.removeItem(STORAGE_KEYS.cloudPlayerState);
};

const predictionTimestamp = (prediction: Prediction): number => new Date(prediction.updatedAt).getTime() || 0;

const predictionKey = (prediction: Prediction): string => {
  const current = getCurrentPlayer();
  const playerKey = current && predictionBelongsToPlayer(prediction, current)
    ? current.id
    : canonicalPlayerId(prediction.playerId) || prediction.playerId;
  return `${playerKey}::${prediction.matchId}`;
};

const mergePredictions = (localPredictions: Prediction[], remotePredictions: Prediction[]): Prediction[] => {
  const byKey = new Map<string, Prediction>();
  const current = getCurrentPlayer();

  [...localPredictions, ...remotePredictions].forEach((prediction) => {
    const key = predictionKey(prediction);
    const existing = byKey.get(key);
    if (!existing || predictionTimestamp(prediction) >= predictionTimestamp(existing)) {
      byKey.set(key, {
        ...prediction,
        playerId: current && predictionBelongsToPlayer(prediction, current) ? current.id : prediction.playerId,
      });
    }
  });

  return Array.from(byKey.values());
};

const fromRpcPrediction = (row: RpcPredictionRow): Prediction => ({
  id: row.id ?? `pred-${row.player_id}-${row.match_id}`,
  playerId: row.player_id,
  matchId: row.match_id,
  homeScore: row.home_score,
  awayScore: row.away_score,
  points: row.points ?? undefined,
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

const toLocalPredictionPayload = (prediction: Prediction) => ({
  match_id: prediction.matchId,
  home_score: prediction.homeScore,
  away_score: prediction.awayScore,
  updated_at: prediction.updatedAt,
});

const applyCloudPlayerState = (state: RpcPlayerState): void => {
  writeJson(STORAGE_KEYS.cloudPlayerState, state);
  const player = toCurrentPlayer(state.player);
  const current = getCurrentPlayer();
  const cachePlayer: CurrentPlayer = {
    ...current,
    ...player,
    sessionToken: current?.sessionToken ?? player.sessionToken,
  };
  writeJson(STORAGE_KEYS.currentPlayer, cachePlayer);

  if (player.avatarUrl) {
    const images = getPlayerProfileImages();
    writeJson(STORAGE_KEYS.profileImages, {
      ...images,
      [player.id]: player.avatarUrl,
      ...(player.legacyId ? { [player.legacyId]: player.avatarUrl } : {}),
    });
  }

  const localPredictions = getStoredPredictions();
  const remotePredictions = state.predictions.map(fromRpcPrediction);
  const preservedLocalPredictions = localPredictions.filter(
    (prediction) => !predictionBelongsToPlayer(prediction, cachePlayer),
  );
  writeJson(STORAGE_KEYS.predictions, mergePredictions(preservedLocalPredictions, remotePredictions));
};

const getCloudPlayerState = (): RpcPlayerState | null => readJson<RpcPlayerState | null>(STORAGE_KEYS.cloudPlayerState, null);

const getCloudLeaderboard = (): RpcLeaderboardRow[] => readJson<RpcLeaderboardRow[]>(STORAGE_KEYS.cloudLeaderboard, []);

const syncLocalPredictionsToCloud = async (player: CurrentPlayer): Promise<void> => {
  if (!isSupabaseConfigured || !player.sessionToken) return;
  const localPredictions = getStoredPredictions().filter((prediction) => predictionBelongsToPlayer(prediction, player));
  if (localPredictions.length === 0) return;

  await supabaseRpc('app_sync_local_predictions', {
    p_session_token: player.sessionToken,
    p_predictions: localPredictions.map(toLocalPredictionPayload),
  });
};

export const syncCloudState = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const current = getCurrentPlayer();
    const leaderboard = await supabaseRpc<RpcLeaderboardRow[]>('app_get_leaderboard');
    writeJson(STORAGE_KEYS.cloudLeaderboard, leaderboard);

    if (current?.sessionToken) {
      await syncLocalPredictionsToCloud(current);
      const state = await supabaseRpc<RpcPlayerState>('app_get_player_state', { p_session_token: current.sessionToken });
      applyCloudPlayerState(state);
    }

    return true;
  } catch (error) {
    console.warn('Cloud sync unavailable, using local cache.', error);
    return false;
  }
};

export const getStoredPredictions = (): Prediction[] => {
  const existing = readJson<Prediction[]>(STORAGE_KEYS.predictions, []);
  if (existing.length > 0) return existing;
  if (isSupabaseConfigured) return [];
  writeJson(STORAGE_KEYS.predictions, mockPredictions);
  return mockPredictions;
};

export const getPredictionsForPlayer = (playerId?: string | null, predictions: Prediction[] = getStoredPredictions()): Prediction[] => {
  if (!playerId) return [];

  const current = getCurrentPlayer();
  const aliases = playerAliases(playerId, current?.id === playerId ? current.nickname : undefined);
  if (current && current.id === playerId) {
    aliases.add(current.id);
    if (current.legacyId) aliases.add(current.legacyId);
  }

  const byMatch = new Map<string, Prediction>();
  predictions
    .filter((prediction) => aliases.has(prediction.playerId) || aliases.has(canonicalPlayerId(prediction.playerId)))
    .forEach((prediction) => {
      const existing = byMatch.get(prediction.matchId);
      if (!existing || predictionTimestamp(prediction) >= predictionTimestamp(existing)) {
        byMatch.set(prediction.matchId, prediction);
      }
    });

  return Array.from(byMatch.values());
};

export const getPredictionForMatch = (matchId: string): Prediction | undefined => {
  const current = getCurrentPlayer();
  if (!current) return undefined;
  return getPredictionsForPlayer(current.id).find((prediction) => prediction.matchId === matchId);
};

const writePredictionToCache = (prediction: Prediction, player: CurrentPlayer): void => {
  const all = getStoredPredictions();
  const existing = all.find((item) => item.matchId === prediction.matchId && predictionBelongsToPlayer(item, player));
  const next = existing
    ? all.map((item) => (item.id === existing.id ? prediction : item))
    : [...all, prediction];
  writeJson(STORAGE_KEYS.predictions, next);
};

export const savePrediction = async (match: Match, homeScore: number, awayScore: number): Promise<Prediction> => {
  const player = getCurrentPlayer();
  if (!player) throw new Error('Joueur non connecté');
  if (!canEditPrediction(match, new Date())) {
    throw new Error('Le match a commencé, ce prono est verrouillé.');
  }

  const all = getStoredPredictions();
  const playerId = player.id;
  const existing = all.find((prediction) => prediction.matchId === match.id && predictionBelongsToPlayer(prediction, player));

  const nextPrediction: Prediction = {
    id: existing?.id ?? `pred-${playerId}-${match.id}`,
    playerId,
    matchId: match.id,
    homeScore,
    awayScore,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured) {
    if (!player.sessionToken) {
      throw new Error('Reconnecte-toi pour enregistrer ce prono.');
    }

    const row = await supabaseRpc<RpcPredictionRow>('app_save_prediction_by_session', {
      p_session_token: player.sessionToken,
      p_match_id: match.id,
      p_home_score: homeScore,
      p_away_score: awayScore,
    });
    const cloudPrediction = fromRpcPrediction(row);
    writePredictionToCache(cloudPrediction, player);
    await syncCloudState();
    return cloudPrediction;
  }

  writePredictionToCache(nextPrediction, player);
  return nextPrediction;
};

export const countUserPredictions = (): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;
  return getPredictionsForPlayer(player.id).length;
};

const fromRpcWorldCupWinnerPrediction = (row: RpcWorldCupWinnerPrediction): WorldCupWinnerPrediction => ({
  id: row.id,
  playerId: row.player_id,
  firstChoiceCode: row.first_choice_code,
  secondChoiceCode: row.second_choice_code,
  thirdChoiceCode: row.third_choice_code,
  firstChoiceName: row.first_choice_name ?? getWorldCupWinnerCountryName(row.first_choice_code),
  secondChoiceName: row.second_choice_name ?? getWorldCupWinnerCountryName(row.second_choice_code),
  thirdChoiceName: row.third_choice_name ?? getWorldCupWinnerCountryName(row.third_choice_code),
  lockedAt: row.locked_at ?? null,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

export const getStoredWorldCupWinnerPredictions = (): WorldCupWinnerPrediction[] =>
  readJson<WorldCupWinnerPrediction[]>(STORAGE_KEYS.worldCupWinnerPredictions, []);

const writeWorldCupWinnerPrediction = (prediction: WorldCupWinnerPrediction): void => {
  const existing = getStoredWorldCupWinnerPredictions();
  const next = [
    ...existing.filter((item) => !samePlayerId(item.playerId, prediction.playerId)),
    prediction,
  ];
  writeJson(STORAGE_KEYS.worldCupWinnerPredictions, next);
};

export const getWorldCupWinnerPredictionForPlayer = (playerId?: string | null): WorldCupWinnerPrediction | null => {
  if (!playerId) return null;
  return getStoredWorldCupWinnerPredictions().find((item) => samePlayerId(item.playerId, playerId)) ?? null;
};

export const fetchWorldCupWinnerPrediction = async (): Promise<WorldCupWinnerPrediction | null> => {
  const current = getCurrentPlayer();
  if (!current) return null;

  if (isSupabaseConfigured && current.sessionToken) {
    try {
      const row = await supabaseRpc<RpcWorldCupWinnerPrediction | null>('app_get_world_cup_winner_prediction_by_session', {
        p_session_token: current.sessionToken,
      });
      if (row) {
        const prediction = fromRpcWorldCupWinnerPrediction(row);
        writeWorldCupWinnerPrediction(prediction);
        return prediction;
      }
    } catch (error) {
      console.warn('World Cup top 3 unavailable, using local cache.', error);
    }
  }

  return getWorldCupWinnerPredictionForPlayer(current.id);
};

export const saveWorldCupWinnerPrediction = async (
  firstChoiceCode: string,
  secondChoiceCode: string,
  thirdChoiceCode: string,
): Promise<WorldCupWinnerPrediction> => {
  const current = getCurrentPlayer();
  if (!current) throw new Error('Connecte-toi pour enregistrer ton top 3.');
  if (isWorldCupTopThreeLocked()) throw new Error('La prédiction champion du monde est verrouillée.');

  const codes = [firstChoiceCode, secondChoiceCode, thirdChoiceCode];
  const validationError = validateWorldCupWinnerPredictionCodes(codes);
  if (validationError) throw new Error(validationError);

  const now = new Date().toISOString();
  const localPrediction: WorldCupWinnerPrediction = {
    id: `wc-top3-${current.id}`,
    playerId: current.id,
    firstChoiceCode,
    secondChoiceCode,
    thirdChoiceCode,
    firstChoiceName: getWorldCupWinnerCountryName(firstChoiceCode),
    secondChoiceName: getWorldCupWinnerCountryName(secondChoiceCode),
    thirdChoiceName: getWorldCupWinnerCountryName(thirdChoiceCode),
    updatedAt: now,
  };

  if (isSupabaseConfigured) {
    if (!current.sessionToken) {
      throw new Error('Reconnecte-toi pour enregistrer ton top 3.');
    }

    const row = await supabaseRpc<RpcWorldCupWinnerPrediction>('app_save_world_cup_winner_prediction_by_session', {
      p_session_token: current.sessionToken,
      p_first_code: firstChoiceCode,
      p_second_code: secondChoiceCode,
      p_third_code: thirdChoiceCode,
    });
    const cloudPrediction = fromRpcWorldCupWinnerPrediction(row);
    writeWorldCupWinnerPrediction(cloudPrediction);
    return cloudPrediction;
  }

  writeWorldCupWinnerPrediction(localPrediction);
  return localPrediction;
};

const fromRpcFlashOption = (row: RpcFlashOptionRow, fallbackFlashId: string): FlashOption => ({
  id: row.id,
  flashId: row.flash_id ?? fallbackFlashId,
  label: row.label,
  pointsIfCorrect: row.points_if_correct,
  sortOrder: row.sort_order ?? 0,
});

const fromRpcFlashChallenge = (row: RpcFlashChallengeRow): FlashChallenge => ({
  id: row.id,
  title: row.title,
  description: row.description ?? null,
  matchId: row.match_id ?? null,
  matchLabel: row.match_label ?? null,
  closesAt: row.closes_at,
  status: row.status,
  resultOptionId: row.result_option_id ?? null,
  options: (row.options ?? [])
    .map((option) => fromRpcFlashOption(option, row.id))
    .sort((left, right) => left.sortOrder - right.sortOrder),
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const fromRpcFlashPrediction = (row: RpcFlashPredictionRow): FlashPrediction => ({
  id: row.id,
  flashId: row.flash_id,
  optionId: row.option_id,
  playerId: row.player_id,
  points: row.points ?? null,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

export const getStoredFlashChallenges = (): FlashChallenge[] =>
  readJson<FlashChallenge[]>(STORAGE_KEYS.flashChallenges, []);

const writeFlashChallenges = (challenges: FlashChallenge[]): void => {
  const byId = new Map(getStoredFlashChallenges().map((challenge) => [challenge.id, challenge]));
  challenges.forEach((challenge) => byId.set(challenge.id, challenge));
  writeJson(STORAGE_KEYS.flashChallenges, Array.from(byId.values()));
};

export const getStoredFlashPredictions = (): FlashPrediction[] =>
  readJson<FlashPrediction[]>(STORAGE_KEYS.flashPredictions, []);

const writeFlashPrediction = (prediction: FlashPrediction): void => {
  const existing = getStoredFlashPredictions();
  const next = [
    ...existing.filter((item) => !(samePlayerId(item.playerId, prediction.playerId) && item.flashId === prediction.flashId)),
    prediction,
  ];
  writeJson(STORAGE_KEYS.flashPredictions, next);
};

export const getFlashPredictionsForPlayer = (playerId?: string | null): FlashPrediction[] => {
  if (!playerId) return [];
  return getStoredFlashPredictions().filter((prediction) => samePlayerId(prediction.playerId, playerId));
};

export const getFlashPredictionForChallenge = (flashId: string, playerId?: string | null): FlashPrediction | undefined =>
  getFlashPredictionsForPlayer(playerId ?? getCurrentPlayer()?.id).find((prediction) => prediction.flashId === flashId);

export const fetchActiveFlashChallenges = async (): Promise<FlashChallenge[]> => {
  const current = getCurrentPlayer();
  if (isSupabaseConfigured) {
    try {
      const rows = await supabaseRpc<RpcFlashChallengeRow[]>('app_get_active_flash_challenges', {
        p_session_token: current?.sessionToken ?? null,
      });
      const challenges = rows.map(fromRpcFlashChallenge);
      writeFlashChallenges(challenges);
      return challenges.filter((challenge) => isFlashChallengeOpen(challenge));
    } catch (error) {
      console.warn('Flash challenges unavailable, using local cache.', error);
    }
  }

  return getStoredFlashChallenges().filter((challenge) => isFlashChallengeOpen(challenge));
};

export const fetchPlayerFlashPredictions = async (): Promise<FlashPrediction[]> => {
  const current = getCurrentPlayer();
  if (!current) return [];

  if (isSupabaseConfigured && current.sessionToken) {
    try {
      const rows = await supabaseRpc<RpcFlashPredictionRow[]>('app_get_player_flash_predictions_by_session', {
        p_session_token: current.sessionToken,
      });
      const challenges = rows
        .map((row) => row.challenge)
        .filter((challenge): challenge is RpcFlashChallengeRow => Boolean(challenge))
        .map(fromRpcFlashChallenge);
      writeFlashChallenges(challenges);
      const predictions = rows.map(fromRpcFlashPrediction);
      predictions.forEach(writeFlashPrediction);
      return getFlashPredictionsForPlayer(current.id);
    } catch (error) {
      console.warn('Player flash predictions unavailable, using local cache.', error);
    }
  }

  return getFlashPredictionsForPlayer(current.id);
};

export const saveFlashPrediction = async (challenge: FlashChallenge, optionId: string): Promise<FlashPrediction> => {
  const current = getCurrentPlayer();
  if (!current) throw new Error('Connecte-toi pour répondre au flash.');
  if (!isFlashChallengeOpen(challenge)) throw new Error('Ce flash est fermé.');
  const option = getFlashOption(challenge, optionId);
  if (!option) throw new Error('Option de flash introuvable.');

  const now = new Date().toISOString();
  const localPrediction: FlashPrediction = {
    id: `flash-${challenge.id}-${current.id}`,
    flashId: challenge.id,
    optionId,
    playerId: current.id,
    updatedAt: now,
  };
  writeFlashChallenges([challenge]);

  if (isSupabaseConfigured) {
    if (!current.sessionToken) {
      throw new Error('Reconnecte-toi pour enregistrer ce flash.');
    }

    const row = await supabaseRpc<RpcFlashPredictionRow>('app_save_flash_prediction_by_session', {
      p_session_token: current.sessionToken,
      p_flash_id: challenge.id,
      p_option_id: optionId,
    });
    const cloudPrediction = fromRpcFlashPrediction(row);
    writeFlashPrediction(cloudPrediction);
    await syncCloudState();
    return cloudPrediction;
  }

  writeFlashPrediction(localPrediction);
  return localPrediction;
};

const calculateResolvedFlashStats = (playerId: string) => {
  const challenges = getStoredFlashChallenges();
  const byId = new Map(challenges.map((challenge) => [challenge.id, challenge]));
  return getFlashPredictionsForPlayer(playerId).reduce(
    (stats, prediction) => {
      const challenge = byId.get(prediction.flashId);
      if (!challenge) return stats;
      const points = calculateFlashPredictionPoints(challenge, prediction);
      return {
        points: stats.points + (points ?? 0),
        firstPredictionAt: stats.firstPredictionAt
          ? (new Date(prediction.updatedAt).getTime() < new Date(stats.firstPredictionAt).getTime() ? prediction.updatedAt : stats.firstPredictionAt)
          : prediction.updatedAt,
      };
    },
    { points: 0, firstPredictionAt: null as string | null },
  );
};

export const fetchPublicPlayerFlashPredictions = async (playerId?: string): Promise<PublicFlashPrediction[]> => {
  if (!playerId || !isSupabaseConfigured || !isUuid(playerId)) return [];
  try {
    const rows = await supabaseRpc<RpcFlashPredictionRow[]>('app_get_public_player_flash_predictions', { p_player_id: playerId });
    return rows
      .map((row): PublicFlashPrediction | null => {
        if (!row.challenge || !row.selected_option) return null;
        const challenge = fromRpcFlashChallenge(row.challenge);
        const selectedOption = fromRpcFlashOption(row.selected_option, challenge.id);
        return {
          id: row.id,
          challenge,
          selectedOption,
          points: row.points ?? null,
          resultType: getFlashPredictionResultType(challenge, { optionId: row.option_id }),
          updatedAt: row.updated_at ?? new Date().toISOString(),
        };
      })
      .filter((item): item is PublicFlashPrediction => Boolean(item));
  } catch (error) {
    console.warn('Public flash predictions unavailable.', error);
    return [];
  }
};

const calculateFinishedStats = (playerId: string, predictions: Prediction[], matches: Match[]) => {
  const finishedById = new Map(matches.filter((match) => isMatchFinal(match)).map((match) => [match.id, match]));
  const playerPredictions = getPredictionsForPlayer(playerId, predictions);
  const firstPredictionAt = playerPredictions
    .map((prediction) => prediction.updatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

  return playerPredictions
    .reduce(
      (stats, prediction) => {
        const match = finishedById.get(prediction.matchId);
        if (!match || typeof match.homeScore !== 'number' || typeof match.awayScore !== 'number') return stats;
        const basePoints = calculatePredictionPoints(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore);
        return {
          points: stats.points + applyMatchMultiplier(basePoints, match),
          exactScores: stats.exactScores + (basePoints === 4 ? 1 : 0),
          twoPointResults: stats.twoPointResults + (basePoints === 2 ? 1 : 0),
          onePointResults: stats.onePointResults + (basePoints === 1 ? 1 : 0),
          correctResults: stats.correctResults + (basePoints > 0 ? 1 : 0),
          firstPredictionAt,
        };
      },
      { points: 0, exactScores: 0, twoPointResults: 0, onePointResults: 0, correctResults: 0, firstPredictionAt },
    );
};

export const getUserPointsMock = (matches: Match[] = mockMatches): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;
  const cloudState = getCloudPlayerState();
  if (player.sessionToken && typeof cloudState?.player.points === 'number') return cloudState.player.points;

  const base = mockPlayers.find((entry) => samePlayerId(entry.id, player.id))?.points ?? 0;
  const dynamic = calculateFinishedStats(player.id, getStoredPredictions(), matches).points;
  const flash = calculateResolvedFlashStats(player.id).points;
  return Math.max(base, dynamic) + flash;
};

export const getUserRankMock = (matches: Match[] = mockMatches): number | null => {
  const player = getCurrentPlayer();
  if (!player) return null;
  const cloudState = getCloudPlayerState();
  if (player.sessionToken && typeof cloudState?.player.rank === 'number') return cloudState.player.rank;
  const standings = buildStandings(mockPlayers, getStoredPredictions(), matches);
  return standings.find((entry) => samePlayerId(entry.playerId, player.id))?.position ?? standings.length + 1;
};

export type PredictionUiStatus = 'open' | 'closing' | 'closed' | 'done';

export const getPredictionUiStatus = (match: Match, prediction?: Prediction): PredictionUiStatus => {
  if (isMatchFinal(match)) return 'done';
  if (match.status === 'live') return 'closed';
  if (!canEditPrediction(match)) return 'closed';

  const kickoff = new Date(match.kickoff).getTime();
  const diffMinutes = (kickoff - Date.now()) / (1000 * 60);
  if (diffMinutes <= 60) return 'closing';
  if (prediction) return 'open';
  return 'open';
};

const nicknameFromPlayerId = (playerId: string): string => {
  const normalized = normalizeIdentity(playerId);
  if (normalized.includes('francois')) return 'François';
  if (normalized.includes('solene')) return 'Solène';
  if (normalized.includes('frederique')) return 'Frédérique';
  if (normalized.includes('sylvain')) return 'Sylvain';

  const cleaned = playerId.replace(/^guest-/, '').replace(/^p-/, '').replace(/[-_]+/g, ' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Joueur';
};

const buildPlayerPool = (players: Player[], predictions: Prediction[]): Player[] => {
  const byCanonicalId = new Map<string, Player>();

  players.forEach((player) => {
    byCanonicalId.set(canonicalPlayerId(player.id), player);
  });

  const current = getCurrentPlayer();
  if (current) {
    const currentId = canonicalPlayerId(current.legacyId ?? current.id) || current.id;
    const existing = byCanonicalId.get(currentId);
    byCanonicalId.set(currentId, {
      id: existing?.id ?? current.id,
      nickname: existing?.nickname ?? current.nickname,
      avatarUrl: current.avatarUrl ?? existing?.avatarUrl,
      points: existing?.points ?? current.points ?? 0,
      exactScores: existing?.exactScores ?? 0,
      correctResults: existing?.correctResults ?? 0,
    });
  }

  predictions.forEach((prediction) => {
    const predictionPlayerId = canonicalPlayerId(prediction.playerId) || prediction.playerId;
    if (byCanonicalId.has(predictionPlayerId)) return;
    byCanonicalId.set(predictionPlayerId, {
      id: predictionPlayerId,
      nickname: nicknameFromPlayerId(prediction.playerId),
      points: 0,
      exactScores: 0,
      correctResults: 0,
    });
  });

  return Array.from(byCanonicalId.values());
};

export const buildStandings = (players: Player[], predictions: Prediction[], matches: Match[]): Standing[] => {
  const cloudLeaderboard = getCloudLeaderboard();
  if (isSupabaseConfigured && cloudLeaderboard.length > 0) {
    return sortLeaderboardEntries(
      cloudLeaderboard.map((entry) => ({
        position: 0,
        playerId: entry.player_id,
        nickname: entry.display_name ?? entry.nickname,
        avatarUrl: entry.avatar_url ?? getPlayerAvatarUrl(entry.player_id),
        points: entry.points,
        exactScores: entry.exact_scores,
        twoPointResults: entry.two_point_results ?? 0,
        correctResults: entry.correct_results,
        firstPredictionAt: entry.first_prediction_at ?? null,
      })),
    );
  }

  return sortLeaderboardEntries(buildPlayerPool(players, predictions)
    .map((player) => {
      const computed = calculateFinishedStats(player.id, predictions, matches);
      const flash = calculateResolvedFlashStats(player.id);
      const firstPredictionAt = [computed.firstPredictionAt, flash.firstPredictionAt, player.firstPredictionAt]
        .filter(Boolean)
        .sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime())[0] ?? null;
      return {
        position: 0,
        playerId: player.id,
        nickname: player.nickname,
        avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl,
        points: Math.max(player.points, computed.points) + flash.points,
        exactScores: Math.max(player.exactScores, computed.exactScores),
        twoPointResults: Math.max(player.twoPointResults ?? 0, computed.twoPointResults),
        correctResults: Math.max(player.correctResults, computed.correctResults),
        firstPredictionAt,
      };
    }));
};

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => samePlayerId(entry.playerId, playerId));

const fromRpcMatch = (row: RpcMatchRow): Match => ({
  id: row.id,
  externalId: row.external_id ?? undefined,
  competitionCode: row.competition_code as Match['competitionCode'],
  competitionName: row.competition_name ?? undefined,
  homeTeam: row.home_team ?? { id: `${row.id}-home`, name: 'Équipe domicile', shortName: 'DOM' },
  awayTeam: row.away_team ?? { id: `${row.id}-away`, name: 'Équipe extérieure', shortName: 'EXT' },
  kickoff: row.kickoff,
  status: row.status,
  homeScore: row.home_score ?? undefined,
  awayScore: row.away_score ?? undefined,
  minute: row.minute ?? undefined,
  venue: row.venue ?? undefined,
  matchday: row.matchday ?? undefined,
  stage: row.stage ?? undefined,
  round: row.round ?? undefined,
  group: row.group_name ?? undefined,
  season: row.season ?? undefined,
  sourceCompetitionId: row.source_competition_id ?? undefined,
  pointsMultiplier: row.points_multiplier ?? undefined,
  source: row.source ?? undefined,
  lastUpdated: row.last_updated ?? undefined,
});

export const fetchCloudMatches = async (): Promise<Match[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const rows = await supabaseRpc<RpcMatchRow[]>('app_get_matches');
    return rows.map(fromRpcMatch);
  } catch (error) {
    console.warn('Cloud matches unavailable.', error);
    return [];
  }
};

const fromRpcPublicMatchPrediction = (row: RpcPublicMatchPredictionRow): PublicMatchPrediction => ({
  id: row.prediction_id ?? `match-public-${row.player_id}-${row.match_id}`,
  playerId: row.player_id,
  nickname: row.display_name ?? row.nickname,
  avatarUrl: row.avatar_url ?? getPlayerAvatarUrl(row.player_id),
  homeScore: row.predicted_home_score,
  awayScore: row.predicted_away_score,
  points: row.points ?? null,
  resultType: row.result_type ?? 'pending',
  updatedAt: row.updated_at ?? null,
});

const buildLocalPublicMatchPredictions = (
  match: Match,
  predictions: Prediction[] = getStoredPredictions(),
  players: Player[] = mockPlayers,
): PublicMatchPrediction[] => {
  if (!isPredictionPublic(match)) return [];

  const playerPool = buildPlayerPool(players, predictions);
  return predictions
    .filter((prediction) => prediction.matchId === match.id)
    .map((prediction) => {
      const player = playerPool.find((entry) => samePlayerId(entry.id, prediction.playerId));
      return {
        id: prediction.id,
        playerId: prediction.playerId,
        nickname: player?.nickname ?? nicknameFromPlayerId(prediction.playerId),
        avatarUrl: getPlayerAvatarUrl(prediction.playerId) ?? player?.avatarUrl,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        points: isMatchFinal(match) ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match) : null,
        resultType: isMatchFinal(match)
          ? getPredictionResultTypeForMatch(prediction.homeScore, prediction.awayScore, match)
          : 'pending',
        updatedAt: prediction.updatedAt,
      };
    })
    .sort((left, right) => left.nickname.localeCompare(right.nickname, 'fr'));
};

export const fetchPublicMatchPredictions = async (
  match: Match,
  predictions: Prediction[] = getStoredPredictions(),
): Promise<PublicMatchPrediction[]> => {
  if (!isPredictionPublic(match)) return [];

  const fallback = buildLocalPublicMatchPredictions(match, predictions);
  if (!isSupabaseConfigured) return fallback;

  try {
    const rows = await supabaseRpc<RpcPublicMatchPredictionRow[]>('app_get_public_match_predictions', { p_match_id: match.id });
    return rows.map((row) => {
      const item = fromRpcPublicMatchPrediction(row);
      if (!isMatchFinal(match)) return { ...item, points: null, resultType: 'pending' };
      return {
        ...item,
        points: calculatePredictionPointsForMatch(item.homeScore, item.awayScore, match),
        resultType: getPredictionResultTypeForMatch(item.homeScore, item.awayScore, match),
      };
    });
  } catch (error) {
    console.warn('Public match predictions unavailable, using local fallback.', error);
    return fallback;
  }
};

const normalizeRpcPublicPrediction = (row: RpcPublicPredictionRow): RpcPredictionRow | null => {
  const homeScore = row.home_score ?? row.predicted_home_score;
  const awayScore = row.away_score ?? row.predicted_away_score;

  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') return null;

  return {
    id: row.id ?? row.prediction_id ?? null,
    player_id: row.player_id,
    match_id: row.match_id,
    home_score: homeScore,
    away_score: awayScore,
    points: row.points,
    updated_at: row.updated_at,
  };
};

const resolveRpcPredictionResultType = (
  row: RpcPublicPredictionRow,
  match: Match,
  predictedHome: number,
  predictedAway: number,
): PredictionResultType => {
  if (!isMatchFinal(match)) return 'pending';
  const computedResultType = getPredictionResultTypeForMatch(predictedHome, predictedAway, match);
  return computedResultType === 'pending' ? row.result_type ?? 'pending' : computedResultType;
};

const resolveRpcPredictionPoints = (
  row: RpcPublicPredictionRow,
  match: Match,
  predictedHome: number,
  predictedAway: number,
): number | null => {
  if (!isMatchFinal(match)) return null;
  const computedPoints = calculatePredictionPointsForMatch(predictedHome, predictedAway, match);
  const rowResultType = row.result_type ?? null;
  return computedPoints ?? (rowResultType === 'pending' ? null : row.points ?? null);
};

const toPublicPrediction = (row: RpcPublicPredictionRow, matches: Match[]): PublicPrediction | null => {
  const normalizedPrediction = normalizeRpcPublicPrediction(row);
  if (!normalizedPrediction) return null;

  const rpcMatch = row.match
    ? {
      ...row.match,
      home_score: row.match.home_score ?? row.final_home_score,
      away_score: row.match.away_score ?? row.final_away_score,
    }
    : null;
  const match = rpcMatch ? fromRpcMatch(rpcMatch) : matches.find((item) => item.id === row.match_id);
  if (!match) return null;
  if (!isPredictionPublic(match)) return null;

  return {
    id: row.id ?? row.prediction_id ?? `public-${row.player_id}-${row.match_id}`,
    match,
    prediction: fromRpcPrediction(normalizedPrediction),
    points: resolveRpcPredictionPoints(row, match, normalizedPrediction.home_score, normalizedPrediction.away_score),
    resultType: resolveRpcPredictionResultType(row, match, normalizedPrediction.home_score, normalizedPrediction.away_score),
  };
};

const fromRpcPublicProfile = (payload: RpcPublicPlayerProfile, matches: Match[]): PublicPlayerProfile => ({
  id: payload.player.player_id,
  nickname: payload.player.display_name ?? payload.player.nickname,
  avatarUrl: payload.player.avatar_url ?? getPlayerAvatarUrl(payload.player.player_id),
  stats: {
    points: payload.player.points ?? 0,
    exactScores: payload.player.exact_scores ?? 0,
    twoPointResults: payload.player.two_point_results ?? 0,
    onePointResults: payload.player.one_point_results ?? 0,
    correctResults: payload.player.correct_results ?? 0,
    rank: payload.player.rank ?? undefined,
  },
  predictions: payload.predictions
    .map((prediction) => toPublicPrediction(prediction, matches))
    .filter((prediction): prediction is PublicPrediction => Boolean(prediction))
    .sort((left, right) => new Date(right.match.kickoff).getTime() - new Date(left.match.kickoff).getTime()),
  worldCupTopThree: payload.world_cup_winner_prediction ? fromRpcWorldCupWinnerPrediction(payload.world_cup_winner_prediction) : null,
});

export const buildLocalPublicPlayerProfile = (
  playerId: string | undefined,
  players: Player[],
  predictions: Prediction[],
  matches: Match[],
): PublicPlayerProfile | null => {
  if (!playerId) return null;

  const standings = buildStandings(players, predictions, matches);
  const standing = standings.find((entry) => samePlayerId(entry.playerId, playerId) || entry.playerId === playerId);
  const player = players.find((entry) => samePlayerId(entry.id, playerId)) ?? (standing ? {
    id: standing.playerId,
    nickname: standing.nickname,
    avatarUrl: standing.avatarUrl,
    points: standing.points,
    exactScores: standing.exactScores,
    correctResults: standing.correctResults,
    twoPointResults: standing.twoPointResults,
    firstPredictionAt: standing.firstPredictionAt,
  } : null);

  if (!player) return null;

  const playerPredictions = getPredictionsForPlayer(player.id, predictions)
    .map((prediction): PublicPrediction | null => {
      const match = matches.find((item) => item.id === prediction.matchId);
      if (!match || !isPredictionPublic(match)) return null;
      return {
        id: prediction.id,
        match,
        prediction,
        points: isMatchFinal(match) ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match) : null,
        resultType: isMatchFinal(match)
          ? getPredictionResultTypeForMatch(prediction.homeScore, prediction.awayScore, match)
          : 'pending',
      };
    })
    .filter((prediction): prediction is PublicPrediction => Boolean(prediction))
    .sort((left, right) => new Date(right.match.kickoff).getTime() - new Date(left.match.kickoff).getTime());

  const stats = calculateFinishedStats(player.id, predictions, matches);
  const correctResults = Math.max(player.correctResults, stats.correctResults);
  const exactScores = Math.max(player.exactScores, stats.exactScores);
  const twoPointResults = Math.max(player.twoPointResults ?? 0, stats.twoPointResults);

  return {
    id: player.id,
    nickname: player.nickname,
    avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl,
    stats: {
      points: standing?.points ?? Math.max(player.points, stats.points),
      exactScores: standing?.exactScores ?? exactScores,
      twoPointResults: standing?.twoPointResults ?? twoPointResults,
      onePointResults: Math.max(0, correctResults - exactScores - twoPointResults),
      correctResults,
      rank: standing?.position,
    },
    predictions: playerPredictions,
    worldCupTopThree: getWorldCupWinnerPredictionForPlayer(player.id),
  };
};

export const fetchPublicPlayerProfile = async (
  playerId: string | undefined,
  matches: Match[],
  predictions: Prediction[] = getStoredPredictions(),
): Promise<PublicPlayerProfile | null> => {
  const localProfile = buildLocalPublicPlayerProfile(playerId, mockPlayers, predictions, matches);

  if (!isSupabaseConfigured || !isUuid(playerId)) return localProfile;

  try {
    const payload = await supabaseRpc<RpcPublicPlayerProfile>('app_get_public_player_profile', { p_player_id: playerId });
    return payload?.player ? fromRpcPublicProfile(payload, matches) : localProfile;
  } catch (error) {
    console.warn('Public player profile unavailable, using local cache.', error);
    return localProfile;
  }
};

const fromRpcExactHighlight = (row: RpcExactPredictionHighlight): ExactPredictionHighlight => ({
  matchId: row.match_id,
  match: fromRpcMatch(row.match),
  winners: row.winners.map((winner) => ({
    playerId: winner.player_id,
    nickname: winner.display_name ?? winner.nickname,
    avatarUrl: winner.avatar_url ?? getPlayerAvatarUrl(winner.player_id),
    homeScore: winner.home_score,
    awayScore: winner.away_score,
  })),
});

export const fetchRecentExactPredictionHighlights = async (
  matches: Match[],
  predictions: Prediction[] = getStoredPredictions(),
  standings: Standing[] = buildStandings(mockPlayers, predictions, matches),
): Promise<ExactPredictionHighlight[]> => {
  if (isSupabaseConfigured) {
    try {
      const rows = await supabaseRpc<RpcExactPredictionHighlight[]>('app_get_recent_exact_predictions');
      return rows.map(fromRpcExactHighlight);
    } catch (error) {
      console.warn('Recent exact predictions unavailable, using local cache.', error);
    }
  }

  return getRecentExactPredictionHighlights(matches, predictions, [...mockPlayers, ...standings]);
};
