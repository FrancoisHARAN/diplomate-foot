import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const pageSource = readFileSync(new URL('../src/pages/PlayerProfilePage.tsx', import.meta.url), 'utf8');

const rules = [];
const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
let match;

while ((match = rulePattern.exec(css)) !== null) {
  const selectors = match[1]
    .split(',')
    .map((selector) => selector.trim())
    .filter(Boolean);
  const declarations = match[2].toLowerCase();

  rules.push({ selectors, declarations });
}

const findDeclarations = (selector) =>
  rules
    .filter((rule) => rule.selectors.includes(selector))
    .map((rule) => rule.declarations)
    .join('\n');

const requireDeclarations = (selector, expected) => {
  const declarations = findDeclarations(selector);

  if (!declarations) {
    throw new Error(`Missing CSS rule for ${selector}`);
  }

  const missing = expected.filter((declaration) => !declarations.includes(declaration.toLowerCase()));

  if (missing.length > 0) {
    throw new Error(`${selector} is missing declarations:\n${missing.join('\n')}`);
  }
};

const requireSource = (snippet) => {
  if (!pageSource.includes(snippet)) {
    throw new Error(`PlayerProfilePage is missing expected markup: ${snippet}`);
  }
};

const forbidSource = (snippet) => {
  if (pageSource.includes(snippet)) {
    throw new Error(`PlayerProfilePage still contains forbidden markup: ${snippet}`);
  }
};

requireSource('className="filter-row public-profile-filters"');
requireSource('className="social-prono-row public-prono-row"');
requireSource('className="social-prono-teams"');
requireSource('className="public-prono-details"');
requireSource('className="public-detail-item"');
requireSource('public-result-summary');
forbidSource('+{points ?? 0} pts');

requireDeclarations('.app-main', [
  'width: 100%',
  'max-width: 100%',
  'overflow-x: hidden',
]);

requireDeclarations('.screen-stack', [
  'width: 100%',
  'max-width: 100%',
  'min-width: 0',
]);

requireDeclarations('.section-block', [
  'max-width: 100%',
  'min-width: 0',
  'overflow: hidden',
]);

requireDeclarations('.filter-row', [
  'max-width: calc(100% + 1.7rem)',
  'min-width: 0',
  'overflow-x: auto',
  '-webkit-overflow-scrolling: touch',
]);

requireDeclarations('.public-profile-filters', [
  'width: 100%',
  'max-width: 100%',
  'min-width: 0',
  'margin-inline: 0',
  'box-sizing: border-box',
]);

requireDeclarations('.public-prono-row', [
  'box-sizing: border-box',
  'width: 100%',
  'max-width: 100%',
  'min-width: 0',
  'overflow: hidden',
]);

requireDeclarations('.social-prono-teams', [
  'display: grid',
  'grid-template-columns: auto minmax(0, 1fr) auto',
  'width: 100%',
  'max-width: 100%',
  'min-width: 0',
]);

requireDeclarations('.social-prono-teams span', [
  'display: grid',
  'max-width: 100%',
  'min-width: 0',
]);

requireDeclarations('.social-prono-teams strong', [
  'display: block',
  'max-width: 100%',
  'min-width: 0',
  'overflow-wrap: anywhere',
]);

requireDeclarations('.social-prono-teams small', [
  'display: block',
  'max-width: 100%',
  'min-width: 0',
  'overflow-wrap: anywhere',
]);

requireDeclarations('.public-result-badge', [
  'max-width: 100%',
  'white-space: normal',
  'overflow-wrap: anywhere',
]);

requireDeclarations('.public-prono-details', [
  'grid-template-columns: repeat(2, minmax(0, 1fr))',
  'width: 100%',
  'max-width: 100%',
  'min-width: 0',
  'overflow: hidden',
]);

requireDeclarations('.public-detail-item', [
  'display: grid',
  'min-width: 0',
  'overflow-wrap: anywhere',
]);

requireDeclarations('.public-detail-item strong', [
  'min-width: 0',
  'overflow-wrap: anywhere',
]);

requireDeclarations('.public-result-summary', [
  'min-width: 0',
  'overflow-wrap: anywhere',
]);

console.log('Player profile mobile CSS constraints are present.');
