import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { Temperament, WaterType } from '@prisma/client';
import { prisma } from '../src/db';

// CSV cells arrive as strings, so numeric columns are coerced before validation.
const rowSchema = z
  .object({
    scientific_name: z.string().min(1),
    common_name: z.string().min(1),
    water_type: z.nativeEnum(WaterType),
    temperament: z.nativeEnum(Temperament),
    min_tank_liters: z.coerce.number().int().positive(),
    adult_size_cm: z.coerce.number().positive(),
    ph_min: z.coerce.number().min(0).max(14),
    ph_max: z.coerce.number().min(0).max(14),
    temp_min_c: z.coerce.number(),
    temp_max_c: z.coerce.number(),
  })
  .refine((row) => row.ph_min <= row.ph_max, { message: 'ph_min is greater than ph_max' })
  .refine((row) => row.temp_min_c <= row.temp_max_c, {
    message: 'temp_min_c is greater than temp_max_c',
  });

type SpeciesRow = z.infer<typeof rowSchema>;

async function main(): Promise<void> {
  const file = process.argv[2] ?? new URL('../prisma/seed/species.csv', import.meta.url);
  const records: unknown[] = parse(readFileSync(file, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const rows: SpeciesRow[] = [];
  const problems: string[] = [];
  records.forEach((record, index) => {
    const result = rowSchema.safeParse(record);
    if (result.success) {
      rows.push(result.data);
    } else {
      // +2: one for the header line, one because lines are 1-indexed.
      const detail = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`)
        .join('; ');
      problems.push(`line ${index + 2}: ${detail}`);
    }
  });

  // All or nothing: a half-imported catalog is harder to reason about than none.
  if (problems.length > 0) {
    console.error(`Import aborted, ${problems.length} invalid row(s):`);
    problems.forEach((problem) => console.error(`  ${problem}`));
    process.exitCode = 1;
    return;
  }

  for (const row of rows) {
    const data = {
      commonName: row.common_name,
      waterType: row.water_type,
      temperament: row.temperament,
      minTankLiters: row.min_tank_liters,
      adultSizeCm: row.adult_size_cm,
      phMin: row.ph_min,
      phMax: row.ph_max,
      tempMinC: row.temp_min_c,
      tempMaxC: row.temp_max_c,
    };
    // Upsert on the natural key so the import can be re-run safely.
    await prisma.species.upsert({
      where: { scientificName: row.scientific_name },
      create: { scientificName: row.scientific_name, ...data },
      update: data,
    });
  }

  console.log(`Imported ${rows.length} species.`);
}

main().finally(() => prisma.$disconnect());
