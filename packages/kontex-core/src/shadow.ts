import * as fs from 'fs';
import * as path from 'path';
import { writeMemory } from './memory/write.js';
import { loadConfig } from './config.js';
import type { MemoryType } from './types.js';

export async function processShadowComments(workspaceRoot: string): Promise<void> {
  const shadowPath = path.join(workspaceRoot, '.context', 'shadow.jsonl');
  if (!fs.existsSync(shadowPath)) return;

  const content = fs.readFileSync(shadowPath, 'utf8');
  if (!content.trim()) return;

  const lines = content.split('\n').filter(line => line.trim() !== '');
  const config = loadConfig(workspaceRoot);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.__kontex_memory) {
        const mem = parsed.__kontex_memory;
        
        const entry = {
          type: (mem.type as MemoryType) || 'decision',
          content: mem.content,
          confidence: typeof mem.confidence === 'number' ? mem.confidence : 0.8,
          affected_paths: Array.isArray(mem.affected_paths) ? mem.affected_paths : [],
          why_memorable: mem.why_memorable || 'Recorded via Copilot shadow comment'
        };
        
        await writeMemory(entry, workspaceRoot, config);
      }
    } catch (e) {
      console.error(`Invalid shadow comment JSON skipped: ${line}`);
    }
  }

  // Clear the file after processing
  fs.writeFileSync(shadowPath, '');
}
