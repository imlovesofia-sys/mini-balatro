import { summary } from './test-helper.js';

const testFiles = [
  './game.test.js',
  './scoring.test.js',
  './shop.test.js',
  './state-constants-consumables.test.js',
  './main-ui.test.js',
  './integration-e2e.test.js'
];

let allPassed = true;

for (const file of testFiles) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Running: ${file}`);
  console.log('═'.repeat(50));
  try {
    await import(file);
  } catch (e) {
    console.error(`  FATAL ERROR in ${file}: ${e.message}`);
    allPassed = false;
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log('  FINAL RESULT');
console.log('═'.repeat(50));

if (allPassed) {
  process.exit(0);
} else {
  process.exit(1);
}
