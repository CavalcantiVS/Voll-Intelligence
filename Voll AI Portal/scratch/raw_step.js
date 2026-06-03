const fs = require('fs');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 189) {
      console.log(JSON.stringify(obj.tool_calls[0].args).substring(1500, 2000));
    }
  } catch(e) {}
}
