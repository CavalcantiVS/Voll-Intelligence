const fs = require('fs');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE') {
      console.log(`Step ${obj.step_index}: keys=`, Object.keys(obj));
      console.log(`  content length:`, obj.content ? obj.content.length : 'none');
      console.log(`  output length:`, obj.output ? obj.output.length : 'none');
      if (obj.tool_calls) {
        console.log(`  tool_calls:`, JSON.stringify(obj.tool_calls));
      }
      break;
    }
  } catch(e) {}
}
