import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const playerProfile = read('src/pages/PlayerProfilePage.tsx');
const matchPublicPredictions = read('src/components/MatchPublicPredictionsSection.tsx');
const homePage = read('src/pages/HomePage.tsx');
const tournamentPage = read('src/pages/TournamentPage.tsx');
const bottomNavigation = read('src/components/BottomNavigation.tsx');
const packageJson = read('package.json');

const requireText = (source, text, label) => {
  assert.ok(source.includes(text), `${label} is missing: ${text}`);
};

requireText(packageJson, '"check:internal-nav"', 'package script');

requireText(playerProfile, 'className="social-prono-row public-prono-row"', 'public profile prediction card');
requireText(playerProfile, 'to={`/matchs/${match.id}`}', 'public profile match link');
requireText(playerProfile, 'aria-label={`Voir le match', 'public profile match aria label');

requireText(matchPublicPredictions, 'player.playerId ? (', 'guard against player links without id');
requireText(matchPublicPredictions, 'to={`/joueurs/${player.playerId}`}', 'match public player profile link');

requireText(homePage, 'to={`/matchs/${highlight.matchId}`}', 'home exact prediction match link');
requireText(homePage, 'to={`/joueurs/${winner.playerId}`}', 'home exact prediction player link');

requireText(tournamentPage, 'return item.available && item.id ? (', 'tournament known match guard');
requireText(tournamentPage, 'to={`/matchs/${item.id}`}', 'tournament known match link');
requireText(tournamentPage, 'knockout-match-card disabled', 'tournament placeholder not linked');
requireText(tournamentPage, 'team-fixture-row disabled', 'team fixture placeholder not linked');

requireText(bottomNavigation, 'const liveCount = matches.filter((match) => isLiveDisplayMatch(match)).length;', 'bottom nav live count');
requireText(bottomNavigation, "item.to === '/matchs' && liveCount > 0", 'bottom nav live badge condition');
requireText(bottomNavigation, 'bottom-live-badge', 'bottom nav live badge markup');
requireText(bottomNavigation, "className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''} ${hasLiveBadge ? 'has-live' : ''}`}", 'bottom nav active/live coexistence');
requireText(bottomNavigation, 'aria-label={`${item.label}${liveAria}`}', 'bottom nav live accessible label');

console.log('check-internal-navigation-links: ok');
