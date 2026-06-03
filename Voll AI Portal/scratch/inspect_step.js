const fs = require('fs');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

function cleanString(str) {
  if (!str) return '';
  let s = str.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      s = JSON.parse(s);
    } catch (e) {}
  }
  if (s.includes('\\n')) {
    s = s.replace(/\\n/g, '\n')
         .replace(/\\r/g, '\r')
         .replace(/\\t/g, '\t')
         .replace(/\\"/g, '"')
         .replace(/\\\\/g, '\\');
  }
  return s;
}

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 189) {
      console.log('Step 189 tool calls:');
      for (const call of obj.tool_calls) {
        console.log(`  File: ${call.args.TargetFile}`);
        const content = cleanString(call.args.CodeContent);
        console.log(`  Content length: ${content.length}`);
        console.log(`  Preview (first 200 chars):\n${content.substring(0, 200)}`);
      }
    }
  } catch(e) {}
}
