import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

// Optional LOCAL model. AI is a file-category suggestion, not proof of authenticity.
// Only .txt/.md excerpts are sent to locally configured Ollama. PDF/DOCX file bytes never leave this process.
export async function categorize(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!config.aiEnabled) return {mode:'disabled', category:'unclassified'};
  let excerpt = '';
  if (['.txt', '.md'].includes(ext)) {
    const fd = await fs.open(filePath, 'r');
    try {
      const buf = Buffer.alloc(4096);
      const {bytesRead} = await fd.read(buf, 0, buf.length, 0);
      excerpt = buf.subarray(0, bytesRead).toString('utf8');
    } finally { await fd.close(); }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${config.ollamaUrl.replace(/\/$/,'')}/api/generate`, {
      method:'POST', signal:controller.signal,
      headers:{'content-type':'application/json'},
      body:JSON.stringify({model:config.ollamaModel,stream:false,format:'json',prompt:`Classify this file for workflow routing. Return ONLY JSON {"category":"certificate|contract|invoice|letter|other","reason":"short"}. Filename: ${path.basename(filePath)}; extension: ${ext}; text excerpt: ${excerpt}`})
    });
    if (!res.ok) throw Error(`Ollama HTTP ${res.status}`);
    const response = JSON.parse((await res.json()).response);
    const allowed = new Set(['certificate','contract','invoice','letter','other']);
    return {mode:'local-ollama', model:config.ollamaModel, category:allowed.has(response.category) ? response.category : 'other'};
  } catch(error) { return {mode:'unavailable', category:'unclassified', error:String(error.message).slice(0,100)}; }
  finally { clearTimeout(timeout); }
}
