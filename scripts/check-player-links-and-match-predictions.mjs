import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const publicPredictionsSource = read('src/components/MatchPublicPredictionsSection.tsx');
const homeSource = read('src/pages/HomePage.tsx');
const historyChartSource = read('src/components/LeaderboardHistoryChart.tsx');
const stylesSource = read('src/styles/global.css');
const packageSource = read('package.json');

const requireText = (source, expected, label) => {
  assert.ok(source.includes(expected), `${label} is missing: ${expected}`);
};

requireText(packageSource, '"check:player-links"', 'package script');

requireText(publicPredictionsSource, "import { Link } from 'react-router-dom';", 'match public player links import');
requireText(publicPredictionsSource, 'player.playerId ? (', 'no player link without playerId');
requireText(publicPredictionsSource, 'to={`/joueurs/${player.playerId}`}', 'match public player profile route');
requireText(publicPredictionsSource, 'className="match-public-player-link"', 'match public player link class');
requireText(publicPredictionsSource, '<span key={`${group.key}-${player.nickname}`}>{player.nickname}</span>', 'match public fallback chip');

requireText(publicPredictionsSource, 'calculatePredictionPointsForMatch', 'group points calculation');
requireText(publicPredictionsSource, "exact: 'Score exact'", 'group exact label');
requireText(publicPredictionsSource, "'two-point': 'Bon écart'", 'group two-point label');
requireText(publicPredictionsSource, "winner: 'Bon gagnant'", 'group winner label');
requireText(publicPredictionsSource, "lost: 'Perdu'", 'group lost label');
requireText(publicPredictionsSource, 'formatGroupPointsLabel', 'group points label formatter');
requireText(publicPredictionsSource, 'points !== null ? formatGroupPointsLabel(points, resultType)', 'final-only group points label');
requireText(publicPredictionsSource, 'group.pointsLabel ? <small className={`match-public-result-badge ${group.resultType}`}>{group.pointsLabel}</small> : null', 'group points badge');
requireText(publicPredictionsSource, 'group.resultLabel && group.resultType !==', 'winning result badge only');
requireText(publicPredictionsSource, 'right.players.length - left.players.length', 'popularity sort');
requireText(publicPredictionsSource, 'right.resultRank - left.resultRank', 'result tiebreak sort');

requireText(homeSource, 'to={`/joueurs/${winner.playerId}`}', 'home exact winner profile link');
requireText(homeSource, 'className="exact-history-winner-link"', 'home exact winner link class');
requireText(historyChartSource, 'to={`/joueurs/${playerId}`}', 'leaderboard history legend profile link');
requireText(historyChartSource, 'className={`history-legend-chip', 'leaderboard history link class');

requireText(stylesSource, '.match-public-player-link', 'match public link styling');
requireText(stylesSource, '.exact-history-winner-link', 'exact winner link styling');
requireText(stylesSource, '.history-legend-chip', 'history legend link styling');

console.log('check-player-links-and-match-predictions: ok');
