import fs from 'fs';
import path from 'path';
import { Rule } from '../models/Rule';
import { connectDatabase, isDatabaseConnected, disconnectDatabase } from '../config/database';

export async function seedAuthoritativeRules(): Promise<{ total: number; inserted: number; updated: number }> {
  const jsonPath = path.resolve(__dirname, '../rules/data/SIH26034_LMPC_Rule_Database_v1.0.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Authoritative rule dataset not found at: ${jsonPath}`);
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(rawJson);
  const rules = parsed.rules;

  if (!Array.isArray(rules) || rules.length !== 33) {
    throw new Error(`Expected exactly 33 rules in dataset, found: ${rules?.length}`);
  }

  console.log(`[SEED-RULES] Ingesting authoritative dataset '${parsed.database_name}' v${parsed.database_version}...`);
  console.log(`[SEED-RULES] Total rules to upsert: ${rules.length}`);

  // Safely drop legacy index ruleId_1 if it exists in MongoDB Atlas collection
  try {
    await Rule.collection.dropIndex('ruleId_1');
    console.log(`[SEED-RULES] Dropped legacy 'ruleId_1' index.`);
  } catch {
    // Index doesn't exist or already dropped
  }

  // Purge any legacy rules that are not in the authoritative 33-rule dataset
  const authoritativeIds = rules.map((r: any) => r.rule_id);
  const deleteResult = await Rule.deleteMany({ rule_id: { $nin: authoritativeIds } });
  if (deleteResult.deletedCount > 0) {
    console.log(`[SEED-RULES] Cleaned up ${deleteResult.deletedCount} legacy rules not in authoritative 33 dataset.`);
  }

  let inserted = 0;
  let updated = 0;

  for (const r of rules) {
    const filter = { rule_id: r.rule_id };
    const updateDoc = {
      rule_id: r.rule_id,
      ruleId: r.rule_id,
      rule_reference: r.rule_reference,
      declaration_type: r.declaration_type,
      requirement_description: r.requirement_description,
      human_condition_text: r.human_condition_text,
      package_context: r.package_context,
      commodity_category: r.commodity_category,
      applicability_conditions: r.applicability_conditions,
      mandatory_status: r.mandatory_status,
      evidence_type: r.evidence_type,
      ocr_field: r.ocr_field || null,
      validation_function: r.validation_function,
      imported_status: r.imported_status || null,
      quantity_condition: r.quantity_condition || null,
      package_structure_condition: r.package_structure_condition || null,
      exemption_exception: r.exemption_exception || null,
      effective_from: r.effective_from ? new Date(r.effective_from) : null,
      effective_to: r.effective_to ? new Date(r.effective_to) : null,
      amendment_version: r.amendment_version || null,
      source_document: r.source_document,
      source_section: r.source_section,
      source_page: typeof r.source_page === 'number' ? r.source_page : null,
      source_url: r.source_url,
      inspector_review_required: Boolean(r.inspector_review_required),
      rule_status: r.rule_status,
      rule_family: r.rule_family,
      notes: r.notes || null,
      database_version: r.database_version || '1.0',
      baseline_origin: r.baseline_origin || 'v0.1',
    };

    const res = await Rule.findOneAndUpdate(filter, { $set: updateDoc }, { upsert: true, returnDocument: 'after' });
    if (res) {
      // Check if newly created or updated
      updated++;
    }
  }

  console.log(`[SEED-RULES] Successfully seeded ${rules.length} authoritative rules into MongoDB Atlas.`);
  return { total: rules.length, inserted, updated };
}

// Standalone execution support
if (require.main === module) {
  (async () => {
    try {
      console.log('--- Connecting to database for standalone rule seeding ---');
      await connectDatabase();
      if (!isDatabaseConnected()) {
        console.error('Cannot seed: Database not connected.');
        process.exit(1);
      }
      await seedAuthoritativeRules();
      await disconnectDatabase();
      console.log('Seeding complete.');
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed rules:', err);
      process.exit(1);
    }
  })();
}
