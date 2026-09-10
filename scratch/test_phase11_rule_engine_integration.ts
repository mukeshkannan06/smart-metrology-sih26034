import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../backend/src/config/database';
import { Rule, IRule, RuleOperationalStatus } from '../backend/src/models/Rule';
import { Inspection, PackageContext, InspectionStatus } from '../backend/src/models/Inspection';
import { Sample, SampleStatus } from '../backend/src/models/Sample';
import { RuleEngineService } from '../backend/src/rules/engine/RuleEngineService';
import { RuleEvaluation, ValidationResultOutcome, ApplicabilityStatus } from '../backend/src/models/RuleEvaluation';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('  PHASE 11 — END-TO-END RULE ENGINE INTEGRATION TEST');
  console.log('====================================================\n');

  await connectDatabase();
  if (!isDatabaseConnected()) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  // 1. Verify MongoDB collection rules
  console.log('[Step 1] Verifying MongoDB rules collection...');
  const count = await Rule.countDocuments();
  assert(count === 33, `Expected exactly 33 rules in database, found ${count}`);

  const activeCount = await Rule.countDocuments({ rule_status: RuleOperationalStatus.ACTIVE });
  assert(activeCount === 28, `Expected 28 ACTIVE rules, found ${activeCount}`);

  const reviewReqCount = await Rule.countDocuments({
    $or: [{ rule_status: RuleOperationalStatus.REVIEW_REQUIRED }, { inspector_review_required: true }],
  });
  assert(reviewReqCount === 13, `Expected 13 review-required rules, found ${reviewReqCount}`);

  const futureCount = await Rule.countDocuments({ rule_status: RuleOperationalStatus.FUTURE });
  assert(futureCount === 1, `Expected 1 FUTURE rule (LMPC-R6-ECOM-2027-001), found ${futureCount}`);

  const histCount = await Rule.countDocuments({ rule_status: RuleOperationalStatus.HISTORICAL });
  assert(histCount === 1, `Expected 1 HISTORICAL guard rule (LMPC-R5-HISTORY-001), found ${histCount}`);

  // 2. Test Rule Evaluation on a Retail Package Sample
  console.log('\n[Step 2] Evaluating Deterministic Rule Engine on Retail Package...');
  let retailInspection = await Inspection.findOne({ packageContext: PackageContext.RETAIL_PACKAGE });
  if (!retailInspection) {
    retailInspection = await Inspection.create({
      inspectionNumber: `TEST-RETAIL-${Date.now()}`,
      inspectorId: 'INS-TEST-01',
      commodity: 'Sunflower Refined Edible Oil',
      brand: 'NatureFresh',
      packageContext: PackageContext.RETAIL_PACKAGE,
      location: 'Delhi Central Market',
      samplesCount: 1,
      status: InspectionStatus.IN_PROGRESS,
    });
  }

  let retailSample = await Sample.findOne({ inspectionId: retailInspection._id });
  if (!retailSample) {
    retailSample = await Sample.create({
      inspectionId: retailInspection._id,
      sampleNumber: 1,
      sampleCode: `SMP-RETAIL-${Date.now()}`,
      status: SampleStatus.READY_FOR_ANALYSIS,
      notes: 'Clean sealed retail pouch',
    });
  } else if (!retailSample.sampleCode) {
    retailSample.sampleCode = `SMP-RETAIL-${Date.now()}`;
    await retailSample.save();
  }

  const retailEval = await RuleEngineService.evaluateSample(
    retailInspection._id,
    retailSample._id,
    'TEST_INSPECTOR'
  );

  assert(retailEval.rules_evaluated.length === 33, 'Evaluated all 33 rules in database');
  assert(retailEval.summary.applicable_count > 0, `Applicable rules identified (${retailEval.summary.applicable_count})`);

  // Check that retail package evaluates Rule 6 MRP as APPLICABLE
  const mrpRule = retailEval.rules_evaluated.find((r) => r.rule_id === 'LMPC-R18-MRP-001');
  assert(
    mrpRule?.applicability_status === ApplicabilityStatus.APPLICABLE,
    'Retail package identifies Rule 6(1)(e) MRP as APPLICABLE'
  );

  // Check future rule suppression
  const futureRule = retailEval.rules_evaluated.find((r) => r.rule_id === 'LMPC-R6-ECOM-2027-001');
  assert(
    futureRule?.applicability_status === ApplicabilityStatus.INACTIVE,
    'Future e-commerce 2027 rule is suppressed as INACTIVE'
  );

  // 3. Test Rule Evaluation on a Wholesale Package Sample (Wholesale Safety)
  console.log('\n[Step 3] Evaluating Deterministic Rule Engine on Wholesale Package (Safety Check)...');
  let wholesaleInspection = await Inspection.findOne({ packageContext: PackageContext.WHOLESALE_PACKAGE });
  if (!wholesaleInspection) {
    wholesaleInspection = await Inspection.create({
      inspectionNumber: `TEST-WHOLESALE-${Date.now()}`,
      inspectorId: 'INS-TEST-01',
      commodity: 'Industrial Grade Refined Sugar',
      brand: 'PureCane',
      packageContext: PackageContext.WHOLESALE_PACKAGE,
      location: 'Wholesale Mandi Warehouse',
      samplesCount: 1,
      status: InspectionStatus.IN_PROGRESS,
    });
  }

  let wholesaleSample = await Sample.findOne({ inspectionId: wholesaleInspection._id });
  if (!wholesaleSample) {
    wholesaleSample = await Sample.create({
      inspectionId: wholesaleInspection._id,
      sampleNumber: 1,
      sampleCode: `SMP-WHOLESALE-${Date.now()}`,
      status: SampleStatus.READY_FOR_ANALYSIS,
      notes: 'Wholesale corrugated shipping master carton',
    });
  } else if (!wholesaleSample.sampleCode) {
    wholesaleSample.sampleCode = `SMP-WHOLESALE-${Date.now()}`;
    await wholesaleSample.save();
  }

  const wholesaleEval = await RuleEngineService.evaluateSample(
    wholesaleInspection._id,
    wholesaleSample._id,
    'TEST_INSPECTOR'
  );

  // CRITICAL REQUIREMENT: LMPC-R24-MRP-001 must be NOT_APPLICABLE on wholesale
  const wholesaleMrpRule = wholesaleEval.rules_evaluated.find((r) => r.rule_id === 'LMPC-R24-MRP-001');
  assert(
    wholesaleMrpRule?.validation_result === ValidationResultOutcome.NOT_APPLICABLE,
    'Wholesale package strictly suppresses MRP via LMPC-R24-MRP-001 (NOT_APPLICABLE)',
    wholesaleMrpRule?.reason
  );

  // Wholesale entity rule must be applicable
  const wholesaleEntityRule = wholesaleEval.rules_evaluated.find((r) => r.rule_id === 'LMPC-R24-ENTITY-001');
  assert(
    wholesaleEntityRule?.applicability_status === ApplicabilityStatus.APPLICABLE,
    'Wholesale package identifies Rule 24(a) wholesale responsible entity as APPLICABLE'
  );

  // 4. Persistence verification
  console.log('\n[Step 4] Verifying MongoDB persistence in rule_evaluations collection...');
  const savedEval = await RuleEvaluation.findById(wholesaleEval._id);
  assert(Boolean(savedEval), 'Evaluation document persisted successfully in rule_evaluations collection');
  assert(savedEval?.rules_evaluated.length === 33, 'Persisted evaluation retains all 33 rule results');

  await disconnectDatabase();

  console.log('\n====================================================');
  console.log(`INTEGRATION TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runIntegrationTests().catch((err) => {
  console.error('Fatal error in integration test:', err);
  process.exit(1);
});
