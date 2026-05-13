import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Match, PredictionResultType, PublicMatchPrediction } from '../types';
import { fetchPublicMatchPredictions, getStoredPredictions } from '../utils/appState';
import { calculatePredictionPointsForMatch, isMatchFinal } from '../utils/points';
import { isPredictionPublic } from '../utils/predictionVisibility';
import { getWorldCupTeamDisplayName } from '../utils/worldCupFilters';

interface MatchPublicPredictionsSectionProps {
  match: Match;
}

interface PredictionGroup {
  key: string;
  homeScore: number;
  awayScore: number;
  players: PublicMatchPrediction[];
  isExact: boolean;
  resultType: PredictionResultType;
  resultRank: number;
  pointsLabel: string | null;
  resultLabel: string | null;
}

const pluralPlayers = (count: number): string => `${count} joueur${count > 1 ? 's' : ''}`;

const resultRankByType: Record<PredictionResultType, number> = {
  exact: 4,
  'two-point': 3,
  winner: 2,
  lost: 1,
  pending: 0,
};

const resultLabels: Record<PredictionResultType, string> = {
  exact: 'Score exact',
  'two-point': 'Bon écart',
  winner: 'Bon gagnant',
  lost: 'Perdu',
  pending: 'En attente',
};

const formatGroupPointsLabel = (points: number, resultType: PredictionResultType): string =>
  resultType === 'lost' ? 'Perdu' : `+${points} ${points > 1 ? 'pts' : 'pt'}`;

const MatchPublicPredictionsSection = ({ match }: MatchPublicPredictionsSectionProps) => {
  const [predictions, setPredictions] = useState<PublicMatchPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const publicVisible = isPredictionPublic(match);
  const hasScore = typeof match.homeScore === 'number' && typeof match.awayScore === 'number';
  const hasFinalScore = isMatchFinal(match) && hasScore;

  useEffect(() => {
    let mounted = true;

    if (!publicVisible) {
      setPredictions([]);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    void fetchPublicMatchPredictions(match, getStoredPredictions())
      .then((items) => {
        if (!mounted) return;
        setPredictions(items);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setPredictions([]);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [match, publicVisible]);

  const groupedPredictions = useMemo<PredictionGroup[]>(() => {
    const groups = new Map<string, PredictionGroup>();

    predictions.forEach((prediction) => {
      const key = `${prediction.homeScore}-${prediction.awayScore}`;
      const existing = groups.get(key);
      if (existing) {
        existing.players.push(prediction);
        return;
      }

      const resultType = hasFinalScore ? prediction.resultType : 'pending';
      const points = hasFinalScore
        ? prediction.resultType === 'pending' ? null : prediction.points ?? calculatePredictionPointsForMatch(prediction.homeScore, prediction.awayScore, match)
        : null;

      groups.set(key, {
        key,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        players: [prediction],
        isExact: resultType === 'exact',
        resultType,
        resultRank: resultRankByType[resultType],
        pointsLabel: points !== null ? formatGroupPointsLabel(points, resultType) : null,
        resultLabel: hasFinalScore ? resultLabels[resultType] : null,
      });
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        players: [...group.players].sort((left, right) => left.nickname.localeCompare(right.nickname, 'fr')),
      }))
      .sort((left, right) =>
        right.players.length - left.players.length ||
        right.resultRank - left.resultRank ||
        left.homeScore - right.homeScore ||
        left.awayScore - right.awayScore,
      );
  }, [hasFinalScore, match, predictions]);

  if (!publicVisible) {
    return (
      <section className="section-block match-public-predictions is-hidden">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bar</p>
            <h2>Les pronos du match</h2>
          </div>
        </div>
        <p className="section-subtitle">Les pronos seront visibles au coup d'envoi.</p>
      </section>
    );
  }

  return (
    <section className="section-block match-public-predictions">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Bar</p>
          <h2>Les pronos du match</h2>
          <p className="section-subtitle">
            {getWorldCupTeamDisplayName(match.homeTeam, match)} - {getWorldCupTeamDisplayName(match.awayTeam, match)}
          </p>
          {!hasFinalScore && hasScore ? (
            <p className="section-subtitle">Score en cours : {match.homeScore} - {match.awayScore}. Points en attente.</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="empty-state inline">
          <strong>Chargement des pronos</strong>
        </div>
      ) : groupedPredictions.length > 0 ? (
        <div className="match-public-group-list">
          {groupedPredictions.map((group) => (
            <article className={`match-public-group ${group.isExact ? 'is-exact' : ''}`} key={group.key}>
              <div className="match-public-score">
                <strong>{group.homeScore} - {group.awayScore}</strong>
                <span>{pluralPlayers(group.players.length)}</span>
                {group.pointsLabel ? <small className={`match-public-result-badge ${group.resultType}`}>{group.pointsLabel}</small> : null}
                {group.resultLabel && group.resultType !== 'lost' ? <small className={`match-public-result-badge ${group.resultType}`}>{group.resultLabel}</small> : null}
              </div>
              <div className="match-public-names">
                {group.players.map((player) => (
                  player.playerId ? (
                    <Link className="match-public-player-link" key={`${group.key}-${player.playerId}`} to={`/joueurs/${player.playerId}`}>
                      {player.nickname}
                    </Link>
                  ) : (
                    <span key={`${group.key}-${player.nickname}`}>{player.nickname}</span>
                  )
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state inline">
          <strong>Aucun prono enregistré sur ce match.</strong>
        </div>
      )}
    </section>
  );
};

export default MatchPublicPredictionsSection;
