const fs = require('fs');
const path = require('path');

const bundlePath = 'c:\\Users\\Note-JoãoCavalcanti\\Documents\\Voll Intelligence\\Voll AI Portal\\frontend\\dist\\assets\\index-tN0oAnRR.js';
const code = fs.readFileSync(bundlePath, 'utf-8');

console.log('Bundle length:', code.length);

// Let's find occurrences of strings unique to our premium components, e.g.:
// - "Visão Geral de Uso"
// - "Atendimentos Otimizados"
// - "Reutilizar"
// - "badge badge-red"

const keywords = [
  'Visão Geral de Uso',
  'Atendimentos Otimizados',
  'Reutilizar',
  'badge badge-red'
];

for (const kw of keywords) {
  const index = code.indexOf(kw);
  console.log(`Keyword "${kw}": index = ${index}`);
  if (index !== -1) {
    console.log(`  Snippet: ${code.substring(Math.max(0, index - 200), Math.min(code.length, index + 300))}\n`);
  }
}
