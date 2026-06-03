const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const fileWrites = {};

function cleanString(str) {
  if (!str) return '';
  let s = str.trim();
  // If it starts and ends with double quotes, parse it
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      s = JSON.parse(s);
    } catch (e) {}
  }
  // If it still has escaped newlines like \n as literal chars, replace them
  if (s.includes('\\n')) {
    s = s.replace(/\\n/g, '\n')
         .replace(/\\r/g, '\r')
         .replace(/\\t/g, '\t')
         .replace(/\\"/g, '"')
         .replace(/\\\\/g, '\\');
  }
  return s;
}

function cleanFilePath(p) {
  let s = p.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      s = JSON.parse(s);
    } catch (e) {}
  }
  return s.replace(/\\\\/g, '\\');
}

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === 'write_to_file') {
          const args = call.args;
          const target = args.TargetFile;
          const content = args.CodeContent;
          if (target && content) {
            const cleanTarget = cleanFilePath(target);
            const cleanContent = cleanString(content);
            fileWrites[cleanTarget] = {
              type: 'write_to_file',
              content: cleanContent,
              step: obj.step_index
            };
          }
        }
      }
    }
  } catch (err) {
    // Ignore malformed json lines
  }
}

// Write the files we need back to their places
const targetsToRestore = [
  'Dashboard.jsx',
  'History.jsx',
  'App.jsx',
  'ResponseGenerator.jsx',
  'ChatbotGenerator.jsx',
  'AutomationGenerator.jsx',
  'dashboardRoutes.js'
];

for (const targetKey of Object.keys(fileWrites)) {
  const matched = targetsToRestore.find(t => targetKey.includes(t));
  if (matched) {
    console.log(`Restoring decoded version of: ${targetKey}`);
    try {
      fs.writeFileSync(targetKey, fileWrites[targetKey].content, 'utf-8');
      console.log(`  -> Successfully restored!`);
    } catch (writeErr) {
      console.error(`  -> Failed to write ${targetKey}:`, writeErr);
    }
  }
}
