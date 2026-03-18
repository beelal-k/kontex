import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writeMemory } from "./write.js";
import { loadConfig } from "../config.js";
import { getToken } from "../auth.js";
import type { ExtractionResult } from "../types.js";

export async function runInitAI(workspaceRoot: string): Promise<void> {
  const config = loadConfig(workspaceRoot);
  if (config.llm.provider === "none") return;

  let token: string | null = null;
  if (config.llm.provider === "github-models") {
    token = await getToken();
    if (!token) {
      console.log("⚠ Missing GitHub token. Run `kontex login` first to use --ai.");
      return;
    }
  }

  console.log("  Analyzing repository structure...");
  const tree = await generateProjectTree(workspaceRoot);
  
  console.log("  Identifying core files...");
  const hotFiles = await getHotFiles(workspaceRoot);
  
  let filesContext = "";
  for (const file of hotFiles) {
    const fullPath = join(workspaceRoot, file);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, "utf-8");
        filesContext += `\n--- FILE: ${file} ---\n${content.slice(0, 3000)}\n`; 
      } catch { /* skip binary/unreadable */ }
    }
  }

  console.log("  Extracting team conventions and practices with AI...");

  try {
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    
    const prompt = `You are an expert software architect. Analyze the provided directory structure and the contents of the most frequently modified files in this codebase.
Identify the prevailing, undocumented architectural conventions and patterns used by this team. Look for repeated structural choices, layering principles, and standard practices that a new developer would need to mimic to write consistent code in this repository.
Do NOT summarize what the app does. ONLY extract actionable engineering conventions.
Return JSON only:
{"new_memories":[{"content":"...","type":"pattern","why_memorable":"...","confidence":0.8,"affected_paths":["..."]}]}

Directory Tree:
${tree}

Hot Files Context:
${filesContext}`;

    let model;
    if (config.llm.provider === "github-models") {
      model = createOpenAI({ baseURL: "https://models.inference.ai.azure.com", apiKey: token ?? "" })(config.llm.model);
    } else if (config.llm.provider === "openai") {
      model = createOpenAI({ apiKey: config.llm.apiKey ?? process.env.OPENAI_API_KEY ?? "" })(config.llm.model);
    } else if (config.llm.provider === "ollama") {
      model = createOpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" })(config.llm.model);
    } else { return; }

    const result = await generateText({ model, prompt, maxTokens: 2000, temperature: 0.1 });
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ExtractionResult;
      
      let writtenCount = 0;
      for (const m of parsed.new_memories || []) {
        const type = ["decision", "pattern", "gotcha", "convention"].includes(m.type) ? m.type : "convention";
        const r = await writeMemory({ 
          content: m.content, 
          type: type as any, 
          why_memorable: m.why_memorable || "Extracted from codebase initialization", 
          confidence: Math.min(m.confidence || 0.8, 0.84),
          affected_paths: m.affected_paths || []
        }, workspaceRoot, config);
        if (r.success) writtenCount++;
      }
      console.log(`✓ Extracted and saved ${writtenCount} architectural conventions to memory.`);
    } else {
      console.log("⚠ AI extraction returned no verifiable conventions.");
    }
  } catch (error: any) {
    console.log(`⚠ AI extraction failed: ${error.message}`);
  }
}

async function generateProjectTree(workspaceRoot: string): Promise<string> {
  try {
    const proc = Bun.spawn(["find", ".", "-not", "-path", "*/.git/*", "-not", "-path", "*/node_modules/*", "-not", "-path", "*/dist/*", "-not", "-path", "*/.context/*"], { cwd: workspaceRoot, stdout: "pipe" });
    const text = await new Response(proc.stdout).text();
    return text.split("\n").sort().slice(0, 100).join("\n"); 
  } catch { return "Tree unavailable"; }
}

async function getHotFiles(workspaceRoot: string): Promise<string[]> {
  try {
    const proc = Bun.spawn(["bash", "-c", "git log --name-only --pretty=format: | grep -v '^$' | grep -v 'package.json' | grep -v 'bun.lockb' | grep -v 'README' | sort | uniq -c | sort -nr | head -10 | awk '{print $2}'"], { cwd: workspaceRoot, stdout: "pipe" });
    const text = await new Response(proc.stdout).text();
    return text.split("\n").map(s => s.trim()).filter(Boolean);
  } catch { return []; }
}
