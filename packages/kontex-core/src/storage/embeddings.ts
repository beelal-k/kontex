/**
 * Local embedding generation via `@xenova/transformers`.
 *
 * Uses `all-MiniLM-L6-v2` (23MB, 384-dim). Downloaded once and cached
 * at `~/.cache/kontex/models/`. Target: < 50ms per embedding.
 */

import { join } from "node:path";
import { homedir } from "node:os";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const CACHE_DIR = join(homedir(), ".cache", "kontex", "models");

type Pipeline = (text: string, options?: Record<string, unknown>) => Promise<{ data: Float32Array }>;

let pipeline: Pipeline | null = null;
let modelLoading: Promise<Pipeline> | null = null;

/**
 * Initializes the embedding model. Downloads on first call (~23MB).
 */
export async function initEmbeddingModel(modelName: string = DEFAULT_MODEL): Promise<void> {
  if (pipeline) return;
  if (!modelLoading) modelLoading = loadPipeline(modelName);
  pipeline = await modelLoading;
}

/**
 * Generates a 384-dimensional embedding for the given text.
 */
export async function embed(text: string): Promise<Float32Array> {
  if (!pipeline) await initEmbeddingModel();
  const result = await pipeline!(text, { pooling: "mean", normalize: true });
  return result.data;
}

async function loadPipeline(modelName: string): Promise<Pipeline> {
  const { pipeline: createPipeline, env } = await import("@xenova/transformers");
  env.cacheDir = CACHE_DIR;
  env.allowLocalModels = true;
  const pipe = await createPipeline("feature-extraction", modelName);
  return pipe as unknown as Pipeline;
}
