#!/usr/bin/env node
/**
 * Bedrock Mantle Model Sync Tool
 * Fetches models from AWS Bedrock Mantle API and updates OpenCode config.
 * No git operations – purely local file update.
 */
import { readFile, writeFile } from 'fs/promises';

// Configuration
const API_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const API_URL = `https://bedrock-mantle.${API_REGION}.api.aws/v1/models`;
const CONFIG_PATH = process.env.OPENCODE_CONFIG_PATH || 'config.json';

// Validate required env var
const required = ['AWS_BEARER_TOKEN_BEDROCK'];
const missing = required.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

/** Fetch models from Bedrock Mantle API */
async function fetchModels() {
  console.error(`Fetching models from ${API_URL}...`);
  const maxRetries = 3;
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.status === 401 || response.status === 403) {
        console.error('Auth error: Invalid token');
        process.exit(1);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.models || [];
    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

/** Transform Mantle models to OpenCode format */
function transformModels(models) {
  return models
    .filter(m => m.capabilities?.includes('chat') || m.capabilities?.includes('completions'))
    .map(m => ({
      id: m.id,
      name: m.name || m.id,
      provider: mapProvider(m.id),
      endpoint: `bedrock-mantle:${m.id}`,
      capabilities: m.capabilities || []
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Map model ID to provider name */
function mapProvider(id) {
  const patterns = [
    { regex: /anthropic|claude/i, provider: 'anthropic' },
    { regex: /meta|llama/i, provider: 'meta' },
    { regex: /amazon|titan/i, provider: 'amazon' },
    { regex: /mistral/i, provider: 'mistral' },
    { regex: /cohere/i, provider: 'cohere' },
    { regex: /ai21/i, provider: 'ai21' }
  ];
  for (const p of patterns) if (p.regex.test(id)) return p.provider;
  return 'bedrock';
}

/** Load existing OpenCode config */
async function loadConfig() {
  try { return JSON.parse(await readFile(CONFIG_PATH, 'utf-8')); }
  catch { return { models: [] }; }
}

/** Save OpenCode config */
async function saveConfig(cfg) {
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

/** Main */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const debug = process.argv.includes('--debug');
  if (dryRun) console.error('[DRY RUN]');
  try {
    const raw = await fetchModels();
    const newModels = transformModels(raw);
    if (debug) console.error(`Fetched ${raw.length} raw, ${newModels.length} after filter`);
    const cfg = await loadConfig();
    const existing = cfg.models || [];
    if (JSON.stringify(existing) === JSON.stringify(newModels)) {
      console.log('no changes');
      process.exit(0);
    }
    console.error(`Models changed: ${existing.length} -> ${newModels.length}`);
    if (dryRun) { console.log('Would update config, but --dry-run'); process.exit(0); }
    cfg.models = newModels;
    await saveConfig(cfg);
    console.log(`models updated: ${newModels.length}`);
    process.exit(0);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    if (debug) console.error(e.stack);
    process.exit(1);
  }
}

main();
