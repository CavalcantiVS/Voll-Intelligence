const fs = require('fs');

const bundlePath = 'c:\\Users\\Note-JoãoCavalcanti\\Documents\\Voll Intelligence\\Voll AI Portal\\frontend\\dist\\assets\\index-tN0oAnRR.js';
const code = fs.readFileSync(bundlePath, 'utf-8');

const targetIndex = 594891; // Visão Geral de Uso
const start = Math.max(0, targetIndex - 6000);
const end = Math.min(code.length, targetIndex + 6000);

const snippet = code.substring(start, end);
fs.writeFileSync('C:\\Users\\Note-JoãoCavalcanti\\Documents\\Voll Intelligence\\Voll AI Portal\\scratch\\dashboard_minified.js', snippet, 'utf-8');
console.log('Successfully wrote minified snippet to scratch/dashboard_minified.js');
