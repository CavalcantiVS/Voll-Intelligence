const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Note-JoãoCavalcanti\\.gemini\\antigravity\\brain\\2ae4b1a3-621a-4bfa-aec1-b7a9b574a075\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const viewFiles = {};

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.status === 'DONE' && obj.content) {
      const content = obj.content;
      // Extract File Path
      // Format: "File Path: `file:///c:/Users/...`"
      const match = content.match(/File Path:\s*`file:\/\/\/(.*?)`/);
      if (match) {
        let filePath = match[1];
        // Decode URL encoding (e.g. %20 for spaces)
        filePath = decodeURIComponent(filePath);
        // On Windows, restore proper path separator if needed
        filePath = filePath.replace(/\//g, '\\');
        // If it starts with a drive letter, e.g. "c:", keep it.
        viewFiles[filePath] = {
          content: content,
          step: obj.step_index
        };
      }
    }
  } catch (err) {
    console.error('Error parsing line:', err);
  }
}

console.log('--- FOUND VIEWED FILES ---');
for (const [target, info] of Object.entries(viewFiles)) {
  console.log(`File: ${target} (Step ${info.step})`);
}

function restoreFile(filePath, content) {
  const lines = content.split('\n');
  const cleanLines = [];
  let foundCode = false;
  
  for (const line of lines) {
    const match = line.match(/^\s*(\d+):\s(.*)$/);
    if (match) {
      foundCode = true;
      cleanLines.push(match[2]);
    } else {
      if (foundCode) {
        if (line.trim() === '') {
          cleanLines.push('');
        }
      }
    }
  }
  
  if (cleanLines.length > 0) {
    // Write target folder if not exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, cleanLines.join('\n'), 'utf-8');
    console.log(`Successfully wrote to: ${filePath}`);
    return true;
  }
  return false;
}

const targetsToRestore = [
  'Dashboard.jsx',
  'History.jsx'
];

for (const [filePath, info] of Object.entries(viewFiles)) {
  const matched = targetsToRestore.find(t => filePath.includes(t));
  if (matched) {
    console.log(`Restoring: ${filePath}`);
    const success = restoreFile(filePath, info.content);
    console.log(success ? `  -> Restored successfully!` : `  -> Failed.`);
  }
}
