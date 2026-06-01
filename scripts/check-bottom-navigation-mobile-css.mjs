import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const css = read('src/styles/global.css');
const bottomNavigation = read('src/components/BottomNavigation.tsx');

const readRule = (selector) => {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm');
  const match = css.match(pattern);

  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1].toLowerCase();
};

const bottomNavRule = readRule('.bottom-nav');
const appMainRule = readRule('.app-main');

const requireDeclaration = (rule, declaration, label) => {
  assert.ok(rule.includes(declaration.toLowerCase()), `${label} is missing: ${declaration}`);
};

assert.ok(bottomNavigation.includes('<nav className="bottom-nav"'), 'BottomNavigation nav markup is missing');
assert.ok(bottomNavigation.includes('bottom-live-badge'), 'BottomNavigation live badge markup is missing');
assert.ok(bottomNavigation.includes("item.to === '/matchs' && liveCount > 0"), 'BottomNavigation live badge condition is missing');

requireDeclaration(bottomNavRule, 'position: fixed', '.bottom-nav');
requireDeclaration(bottomNavRule, 'left: 0', '.bottom-nav');
requireDeclaration(bottomNavRule, 'right: 0', '.bottom-nav');
requireDeclaration(bottomNavRule, 'bottom: 0', '.bottom-nav');
requireDeclaration(bottomNavRule, 'z-index:', '.bottom-nav');
requireDeclaration(bottomNavRule, 'env(safe-area-inset-bottom)', '.bottom-nav');
requireDeclaration(bottomNavRule, 'transform: none', '.bottom-nav');
requireDeclaration(bottomNavRule, 'max-width: 520px', '.bottom-nav');
requireDeclaration(bottomNavRule, 'margin-inline: auto', '.bottom-nav');

assert.ok(!bottomNavRule.includes('position: sticky'), '.bottom-nav must not be sticky');
assert.ok(!bottomNavRule.includes('position: absolute'), '.bottom-nav must not be absolute');
assert.ok(!bottomNavRule.includes('translatex'), '.bottom-nav must not rely on transform centering');
assert.ok(!bottomNavRule.includes('left: 50%'), '.bottom-nav must not rely on left: 50% centering');

requireDeclaration(appMainRule, 'env(safe-area-inset-bottom)', '.app-main');
assert.ok(/padding\s*:[^;]*calc\(7\.25rem \+ env\(safe-area-inset-bottom\)\)/i.test(appMainRule), '.app-main needs bottom padding for the fixed nav');

console.log('Bottom navigation mobile CSS checks passed.');
