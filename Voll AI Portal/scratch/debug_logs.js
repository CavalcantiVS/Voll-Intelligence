const fs = require('fs');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (let i = 0; i < Math.min(20, lines.length); i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    console.log(`Step ${obj.step_index}: source=${obj.source}, type=${obj.type}, status=${obj.status}`);
    if (obj.tool_calls) {
      console.log(`  Tools:`, obj.tool_calls.map(tc => tc.name));
    }
    if (obj.output) {
      console.log(`  Output keys:`, Object.keys(obj.output));
    }
  } catch(e) {}
}
