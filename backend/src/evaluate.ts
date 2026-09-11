import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { runPipeline } from './services/pipeline.service';

const InputCaseSchema = z.object({
  id: z.string(),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive()
});

const InputSchema = z.array(InputCaseSchema);

async function runWithLimit<T>(limit: number, items: any[], fn: (item: any) => Promise<T>): Promise<T[]> {
  let i = 0;
  const results: T[] = new Array(items.length);
  const execNext = async (): Promise<void> => {
    if (i >= items.length) return;
    const index = i++;
    results[index] = await fn(items[index]);
    await execNext();
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => execNext());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  let inputFile = '';
  let outputFile = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }

  if (!inputFile || !outputFile) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), inputFile);
  const outputPath = path.resolve(process.cwd(), outputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } catch (err: any) {
    console.error(`Failed to parse input JSON: ${err.message}`);
    process.exit(1);
  }

  const validationResult = InputSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error(`Input validation failed:\n${validationResult.error.message}`);
    process.exit(1);
  }

  const cases = validationResult.data;
  console.log(`Loaded ${cases.length} cases.`);

  const startTime = Date.now();

  const results = await runWithLimit(2, cases, async (c) => {
    console.log(`[${c.id}] Starting pipeline for ${c.company_url}`);
    
    // Call the exact same runPipeline from Phase 9
    const result = await runPipeline({
      jd: c.jd,
      companyUrl: c.company_url,
      days: c.days,
      onProgress: (stage) => console.log(`[${c.id}] Stage: ${stage}`)
    });

    if (result.ok && result.kit) {
      console.log(`[${c.id}] Completed successfully.`);
      return {
        id: c.id,
        status: "ok",
        kit: result.kit,
        error: null
      };
    } else {
      console.error(`[${c.id}] Failed:`, result.error);
      return {
        id: c.id,
        status: "failed",
        kit: null,
        error: result.error || { code: "UNKNOWN_ERROR", message: "Unknown error occurred" }
      };
    }
  });

  const outputFormat = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: results
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputFormat, null, 2), 'utf8');
  console.log(`Evaluation complete in ${((Date.now() - startTime)/1000).toFixed(1)}s. Results written to ${outputFile}`);
}

main().catch(err => {
  console.error("Fatal unhandled error in evaluate script:", err);
  process.exit(1);
});
