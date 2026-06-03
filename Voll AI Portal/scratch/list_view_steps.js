const fs = require('fs');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const viewSteps = {};

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
        
        if (!viewSteps[filePath]) {
          viewSteps[filePath] = [];
        }
        
        // Count line matches
        let lineCount = 0;
        const contentLines = content.split('\n');
        for (const cLine of contentLines) {
          if (cLine.match(/^\s*(\d+):\s(.*)$/)) {
            lineCount++;
          }
        }
        
        viewSteps[filePath].push({
          step: obj.step_index,
          lines: lineCount
        });
      }
    }
  } catch (err) {}
}

for (const [filePath, steps] of Object.entries(viewSteps)) {
  console.log(`File: ${filePath}`);
  for (const s of steps) {
    console.log(`  Step ${s.step}: ${s.lines} lines`);
  }
}
