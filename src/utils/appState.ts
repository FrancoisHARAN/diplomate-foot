import { mockMatches } from '../data/mockMatches';
import { mockPlayers } from '../data/mockPlayers';
import { mockPredictions } from '../data/mockPredictions';
import { isSupabaseConfigured, supabaseRpc } from '../lib/supabaseClient';
import type { ExactPredictionHighlight, Match, Player, Prediction, PredictionResultType, PublicPlayerProfile, PublicPrediction, Standing, Team } from '../types';
import { canEditPrediction } from './date';
import { getRecentExactPredictionHighlights } from './exactPredictions';
import { sortLeaderboardEntries } from './leaderboard';
import { applyMatchMultiplier, calculatePredictionPoints, calculatePredictionPointsForMatch, getPredictionResultType } from './points';
import { isPredictionPublic } from './predictionVisibility';

const STORAGE_KEYS = {
  currentPlayer: 'diplomate.currentPlayer',
  predictions: 'diplomate.predictions',
  profileImages: 'diplomate.profileImages',
  cloudPlayerState: 'diplomate.cloudPlayerState',
  cloudLeaderboard: 'diplomate.cloudLeaderboard',
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
  points_multiplier?: number | null;
  source?: string | null;
  last_updated?: string | null;
}

interface RpcPublicPredictionRow extends RpcPredictionRow {
  points?: number | null;
  match?: RpcMatchRow | null;
  result_type?: PredictionResultType | null;
}

interface RpcPublicPlayerProfile {
  player: RpcPlayerSummary & {
    two_point_results?: number | null;
    one_point_results?: number | null;
    first_prediction_at?: string | null;
  };
  predictions: RpcPublicPredictionRow[];
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

export const setPlayerProfileImage = (playerId: string, imageDataUrl: string): void => {
  const canonicalId = canonicalPlayerId(playerId);
  writeJson(STORAGE_KEYS.profileImages, { ...getPlayerProfileImages(), [playerId]: imageDataUrl, [canonicalId]: imageDataUrl });
  const current = getCurrentPlayer();
  if (current && (current.id === playerId || samePlayerId(current.legacyId, playerId))) {
    updateCurrentPlayer({ avatarUrl: imageDataUrl });
  }
  syncCurrentPlayerToCloud();
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
  writeJson(STORAGE_KEYS.currentPlayer, {
    ...current,
    ...player,
    sessionToken: current?.sessionToken ?? player.sessionToken,
  });

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
  writeJson(STORAGE_KEYS.predictions, mergePredictions(localPredictions, remotePredictions));
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

const syncPredictionToCloud = (match: Match, prediction: Prediction): void => {
  const current = getCurrentPlayer();
  if (!isSupabaseConfigured || !current?.sessionToken) return;

  void syncMatchesToCloud([match])
    .then(() =>
      supabaseRpc<RpcPredictionRow>('app_save_prediction_by_session', {
        p_session_token: current.sessionToken,
        p_match_id: prediction.matchId,
        p_home_score: prediction.homeScore,
        p_away_score: prediction.awayScore,
      }),
    )
    .then(() => syncCloudState())
    .catch((error) => console.warn('Prediction cloud sync failed.', error));
};

const syncCurrentPlayerToCloud = (): void => {
  const current = getCurrentPlayer();
  if (!isSupabaseConfigured || !current?.sessionToken || !current.avatarUrl) return;

  void supabaseRpc<RpcPlayerSummary>('app_update_player_avatar', {
    p_session_token: current.sessionToken,
    p_avatar_url: current.avatarUrl,
  })
    .then((player) => {
      const next = toCurrentPlayer({ ...player, session_token: current.sessionToken });
      writeJson(STORAGE_KEYS.currentPlayer, next);
    })
    .catch((error) => console.warn('Player avatar cloud sync failed.', error));
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

export const savePrediction = (match: Match, homeScore: number, awayScore: number): Prediction => {
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

  const next = existing
    ? all.map((prediction) => (prediction.id === existing.id ? nextPrediction : prediction))
    : [...all, nextPrediction];

  writeJson(STORAGE_KEYS.predictions, next);
  syncPredictionToCloud(match, nextPrediction);
  return nextPrediction;
};

export const countUserPredictions = (): number => {
  const player = getCurrentPlayer();
  if (!player) return 0;
  return getPredictionsForPlayer(player.id).length;
};

const calculateFinishedStats = (playerId: string, predictions: Prediction[], matches: Match[]) => {
  const finishedById = new Map(matches.filter((match) => match.status === 'finished').map((match) => [match.id, match]));
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
          exactScores: stats.exactScores + (basePoints === 3 ? 1 : 0),
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
  return Math.max(base, dynamic);
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
  if (match.status === 'finished') return 'done';
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
      return {
        position: 0,
        playerId: player.id,
        nickname: player.nickname,
        avatarUrl: getPlayerAvatarUrl(player.id) ?? player.avatarUrl,
        points: Math.max(player.points, computed.points),
        exactScores: Math.max(player.exactScores, computed.exactScores),
        twoPointResults: Math.max(player.twoPointResults ?? 0, computed.twoPointResults),
        correctResults: Math.max(player.correctResults, computed.correctResults),
        firstPredictionAt: computed.firstPredictionAt ?? player.firstPredictionAt ?? null,
      };
    }));
};

export const getUserRank = (standings: Standing[], playerId?: string) => standings.find((entry) => samePlayerId(entry.playerId, playerId));

const toRpcMatchPayload = (match: Match) => ({
  id: match.id,
  external_id: match.externalId,
  competition_code: match.competitionCode,
  competition_name: match.competitionName,
  home_team: match.homeTeam,
  away_team: match.awayTeam,
  kickoff: match.kickoff,
  status: match.status,
  home_score: match.homeScore,
  away_score: match.awayScore,
  minute: match.minute,
  venue: match.venue,
  matchday: match.matchday,
  points_multiplier: match.pointsMultiplier,
  source: match.source,
  last_updated: match.lastUpdated,
});

export const syncMatchesToCloud = async (matches: Match[]): Promise<boolean> => {
  if (!isSupabaseConfigured || matches.length === 0) return false;
  try {
    await supabaseRpc('app_sync_matches', { p_matches: matches.map(toRpcMatchPayload) });
    return true;
  } catch (error) {
    console.warn('Match cloud sync failed.', error);
    return false;
  }
};

const fromRpcMatch = (row: RpcMatchRow): Match => ({
  id: row.id,
  externalId: row.external_id ?? undefined,
  competitionCode: row.competition_code as Match['competitionCode'],
  competitionName: row.competition_name ?? undefined,
  homeTeam: row.home_team ?? { id: `${row.id}-home`, name: 'Equipe domicile', shortName: 'DOM' },
  awayTeam: row.away_team ?? { id: `${row.id}-away`, name: 'Equipe extérieure', shortName: 'EXT' },
  kickoff: row.kickoff,
  status: row.status,
  homeScore: row.home_score ?? undefined,
  awayScore: row.away_score ?? undefined,
  minute: row.minute ?? undefined,
  venue: row.venue ?? undefined,
  matchday: row.matchday ?? undefined,
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

const toPublicPrediction = (row: RpcPublicPredictionRow, matches: Match[]): PublicPrediction | null => {
  const match = row.match ? fromRpcMatch(row.match) : matches.find((item) => item.id === row.match_id);
  if (!match) return null;

  return {
    id: row.id ?? `public-${row.player_id}-${row.match_id}`,
    match,
    prediction: fromRpcPrediction(row),
    points: match.status === 'finished' ? row.points ?? 0 : null,
    resultType: match.status === 'finished'
      ? row.result_type ?? getPredictionResultType(row.home_score, row.away_score, match.homeScore, match.awayScore)
      : 'pending',
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
        points: match.status === 'finished' ? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match) : null,
        resultType: match.status === 'finished'
          ? getPredictionResultType(prediction.homeScore, prediction.awayScore, match.homeScore, match.awayScore)
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
