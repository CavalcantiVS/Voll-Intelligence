const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const fileLines = {}; // { [filePath]: { [lineNum]: content } }

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.status === 'DONE' && obj.content) {
      const content = obj.content;
      const match = content.match(/File Path:\s*`file:\/\/\/(.*?)`/);
      if (match) {
        let filePath = match[1];
        filePath = decodeURIComponent(filePath).replace(/\//g, '\\');
        
        if (!fileLines[filePath]) {
          fileLines[filePath] = {};
        }
        
        // Parse lines
        const contentLines = content.split('\n');
        for (const cLine of contentLines) {
          const lMatch = cLine.match(/^\s*(\d+):\s(.*)$/);
          if (lMatch) {
            const num = parseInt(lMatch[1], 10);
            const text = lMatch[2];
            fileLines[filePath][num] = text;
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

// Restore targets
const targetsToRestore = [
  'Dashboard.jsx',
  'History.jsx'
];

for (const [filePath, lineMap] of Object.entries(fileLines)) {
  const matched = targetsToRestore.find(t => filePath.includes(t));
  if (matched) {
    console.log(`Reconstructing: ${filePath}`);
    const keys = Object.keys(lineMap).map(Number).sort((a, b) => a - b);
    if (keys.length === 0) {
      console.log(`  -> No lines found.`);
      continue;
    }
    
    // Create code array up to max line
    const maxLine = keys[keys.length - 1];
    const code = [];
    for (let i = 1; i <= maxLine; i++) {
      // If line is missing, default to empty string
      code.push(lineMap[i] !== undefined ? lineMap[i] : '');
    }
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, code.join('\n'), 'utf-8');
    console.log(`  -> Successfully reconstructed ${code.length} lines!`);
  }
}
