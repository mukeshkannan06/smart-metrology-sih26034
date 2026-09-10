import fs from 'fs';
import path from 'path';

// Parse CSV taking into account quotes
function parseCSV(text: string) {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const records: Record<string, string | null>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: Record<string, string | null> = {};
    headers.forEach((h, idx) => {
      const val = values[idx] !== undefined ? values[idx] : null;
      record[h] = val === '' ? null : val;
    });
    records.push(record);
  }
  return { headers, records };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  values.push(currentVal.trim());
  return values;
}

async function verify() {
  const jsonPath = path.resolve('src/rules/data/SIH26034_LMPC_Rule_Database_v1.0.json');
  const csvPath = path.resolve('src/rules/data/SIH26034_LMPC_Rule_Database_v1.0.csv');
  const jsonPath = path.resolve(__dirname, 'data/SIH26034_LMPC_Rule_Database_v1.0.json');
  const csvPath = path.resolve(__dirname, 'data/SIH26034_LMPC_Rule_Database_v1.0.csv');

  console.log('--- Phase 11 Rule Database Verification ---');
  console.log(`Reading JSON from: ${jsonPath}`);
  console.log(`Reading CSV from: ${csvPath}`);

  const rawJson = fs.readFileSync(jsonPath, 'utf8');
  // strip BOM if present
  const cleanCsv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');

  const jsonData = JSON.parse(rawJson);
  const csvData = parseCSV(cleanCsv);

  console.log(`\nJSON Metadata:`);
  console.log(`- Database Name: ${jsonData.database_name}`);
  console.log(`- Version: ${jsonData.database_version}`);
  console.log(`- Status: ${jsonData.status}`);
  console.log(`- Rule count reported: ${jsonData.rules.length}`);

  console.log(`\nCSV Metadata:`);
  console.log(`- Header fields count: ${csvData.headers.length}`);
  console.log(`- Row count: ${csvData.records.length}`);

  const jsonRules: any[] = jsonData.rules;
  const csvRules = csvData.records;

  // 1. Check count
  if (jsonRules.length !== 33 || csvRules.length !== 33) {
    console.error(`ERROR: Expected 33 rules, got JSON=${jsonRules.length}, CSV=${csvRules.length}`);
  } else {
    console.log(`✓ Both JSON and CSV contain exactly 33 rules.`);
  }

  // 2. Check unique rule_ids
  const jsonIds = new Set(jsonRules.map((r: any) => r.rule_id));
  const csvIds = new Set(csvRules.map((r: any) => r.rule_id));

  if (jsonIds.size !== 33 || csvIds.size !== 33) {
    console.error(`ERROR: Duplicate rule_ids found. JSON unique=${jsonIds.size}, CSV unique=${csvIds.size}`);
  } else {
    console.log(`✓ All 33 rule_ids are unique in both formats.`);
  }

  // 3. Compare rule_ids sequence and values
  let idMismatch = false;
  for (let i = 0; i < 33; i++) {
    if (jsonRules[i].rule_id !== csvRules[i].rule_id) {
      console.error(`Mismatch at row ${i}: JSON=${jsonRules[i].rule_id}, CSV=${csvRules[i].rule_id}`);
      idMismatch = true;
    }
  }
  if (!idMismatch) {
    console.log(`✓ Rule ID order matches 100% across all 33 rows.`);
  }

  // 4. Compare fields per record
  const discrepancies: string[] = [];

  for (let i = 0; i < 33; i++) {
    const jRule = jsonRules[i];
    const cRule = csvRules[i];
    const ruleId = jRule.rule_id;

    for (const field of jsonData.validation_summary.schema_fields) {
      let jVal = jRule[field];
      let cVal = cRule[field];

      // normalize booleans and numbers
      if (typeof jVal === 'boolean') {
        const cBool = cVal === 'True' || cVal === 'true';
        if (cVal === null) {
          if (jVal !== null && jVal !== false) {
            discrepancies.push(`[${ruleId}][${field}] JSON boolean ${jVal} vs CSV ${cVal}`);
          }
        } else if (jVal !== cBool) {
          discrepancies.push(`[${ruleId}][${field}] JSON boolean ${jVal} vs CSV ${cVal}`);
        }
        continue;
      }

      if (typeof jVal === 'number') {
        const cNum = cVal !== null ? Number(cVal) : null;
        if (jVal !== cNum) {
          discrepancies.push(`[${ruleId}][${field}] JSON number ${jVal} vs CSV ${cVal}`);
        }
        continue;
      }

      // normalize strings / null
      const jStr = jVal === null || jVal === undefined ? '' : String(jVal).trim();
      const cStr = cVal === null || cVal === undefined ? '' : String(cVal).trim();

      if (jStr !== cStr) {
        discrepancies.push(`[${ruleId}][${field}]\n  JSON: "${jStr}"\n  CSV:  "${cStr}"`);
      }
    }
  }

  if (discrepancies.length === 0) {
    console.log(`✓ 100% FIELD-BY-FIELD PARITY: All 33 rules x 29 schema fields match identically!`);
  } else {
    console.warn(`Discrepancies found (${discrepancies.length}):`);
    discrepancies.forEach(d => console.warn(d));
  }

  console.log(`\nReview-required rules in dataset:`);
  const reviewReq = jsonRules.filter((r: any) => r.inspector_review_required === true || r.rule_status === 'REVIEW_REQUIRED');
  console.log(`Found ${reviewReq.length} rules requiring inspector review:`);
  reviewReq.forEach((r: any) => {
    console.log(`- ${r.rule_id} (${r.rule_reference}): status=${r.rule_status}, inspector_review_required=${r.inspector_review_required}`);
  });

  console.log(`\nFuture rules in dataset:`);
  const futureRules = jsonRules.filter((r: any) => r.rule_status === 'FUTURE');
  futureRules.forEach((r: any) => {
    console.log(`- ${r.rule_id} (${r.rule_reference}): effective_from=${r.effective_from}`);
  });

  console.log(`\nHistorical guard rules in dataset:`);
  const histRules = jsonRules.filter((r: any) => r.rule_status === 'HISTORICAL');
  histRules.forEach((r: any) => {
    console.log(`- ${r.rule_id} (${r.rule_reference}): notes=${r.notes}`);
  });
}

verify().catch(console.error);

