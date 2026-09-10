import { RuleConditionEvaluator } from '../src/rules/engine/RuleConditionEvaluator';
import { RuleVersionResolver } from '../src/rules/engine/RuleVersionResolver';
import { RuleValidatorRegistry } from '../src/rules/engine/RuleValidatorRegistry';
import { ValidationResultOutcome } from '../src/models/RuleEvaluation';
import { IRule, RuleOperationalStatus, RuleMandatoryStatus } from '../src/models/Rule';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('  PHASE 11 — DETERMINISTIC RULE ENGINE UNIT TESTS');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // Test Suite 1: RuleConditionEvaluator
  // ----------------------------------------------------
  console.log('[Suite 1] Safe Condition Evaluator (Zero eval()):');

  // Test 1.1 Simple boolean condition
  const res1 = RuleConditionEvaluator.evaluate('chapter_ii_applies == true', {
    chapter_ii_applies: true,
  });
  assert(res1.satisfied === true, 'Evaluates simple equality (chapter_ii_applies == true)');

  // Test 1.2 Compound AND condition
  const res2 = RuleConditionEvaluator.evaluate(
    'is_imported == true AND is_retail_package == true AND chapter_ii_applies == true',
    {
      is_imported: true,
      is_retail_package: true,
      chapter_ii_applies: true,
    }
  );
  assert(res2.satisfied === true, 'Evaluates compound AND condition when all true');

  const res3 = RuleConditionEvaluator.evaluate(
    'is_imported == true AND is_retail_package == true AND chapter_ii_applies == true',
    {
      is_imported: false,
      is_retail_package: true,
      chapter_ii_applies: true,
    }
  );
  assert(res3.satisfied === false, 'Evaluates compound AND condition when one is false');

  // Test 1.3 Compound OR condition
  const res4 = RuleConditionEvaluator.evaluate(
    'commodity_may_become_unfit_for_human_consumption == true OR product_specific_law_requires_date == true',
    {
      commodity_may_become_unfit_for_human_consumption: false,
      product_specific_law_requires_date: true,
    }
  );
  assert(res4.satisfied === true, 'Evaluates compound OR condition when one branch is true');

  // Test 1.4 Set membership: var in {A, B, C}
  const res5 = RuleConditionEvaluator.evaluate(
    'package_structure in {COMBINATION,GROUP,MULTI_PIECE} AND qualifying_exception_conditions_met == true',
    {
      package_structure: 'COMBINATION',
      qualifying_exception_conditions_met: true,
    }
  );
  assert(res5.satisfied === true, 'Evaluates set membership (in {A, B, C}) correctly');

  const res6 = RuleConditionEvaluator.evaluate(
    'package_structure in {COMBINATION,GROUP,MULTI_PIECE} AND qualifying_exception_conditions_met == true',
    {
      package_structure: 'SINGLE_PIECE',
      qualifying_exception_conditions_met: true,
    }
  );
  assert(res6.satisfied === false, 'Rejects set membership when value not in set');

  // Test 1.5 Date comparison: inspection_date >= 2026-02-01
  const res7 = RuleConditionEvaluator.evaluate(
    'commodity_category == PAN_MASALA AND inspection_date >= 2026-02-01',
    {
      commodity_category: 'PAN_MASALA',
      inspection_date: '2026-09-10',
    }
  );
  assert(res7.satisfied === true, 'Evaluates date comparison (inspection_date >= 2026-02-01)');

  const res8 = RuleConditionEvaluator.evaluate(
    'commodity_category == PAN_MASALA AND inspection_date >= 2026-02-01',
    {
      commodity_category: 'PAN_MASALA',
      inspection_date: '2025-12-01',
    }
  );
  assert(res8.satisfied === false, 'Rejects date comparison when inspection_date is earlier');

  // ----------------------------------------------------
  // Test Suite 2: RuleVersionResolver
  // ----------------------------------------------------
  console.log('\n[Suite 2] Temporal Validity & Version Resolution:');

  const futureRule = {
    rule_id: 'LMPC-R6-ECOM-2027-001',
    rule_status: RuleOperationalStatus.FUTURE,
    effective_from: new Date('2027-07-01'),
    effective_to: null,
    amendment_version: 'G.S.R. 312(E)',
  } as unknown as IRule;

  const versionResCurrent = RuleVersionResolver.resolve(futureRule, new Date('2026-09-10'));
  assert(versionResCurrent.isApplicableByVersion === false, 'Future rule is INACTIVE for current 2026 inspection');

  const versionResFuture = RuleVersionResolver.resolve(futureRule, new Date('2027-08-01'));
  assert(versionResFuture.isApplicableByVersion === true, 'Future rule becomes ACTIVE after its effective date in 2027');

  const historicalGuardRule = {
    rule_id: 'LMPC-R5-HISTORY-001',
    rule_status: RuleOperationalStatus.HISTORICAL,
    effective_from: null,
    effective_to: null,
    notes: 'Historical rule guard',
  } as unknown as IRule;

  const histRes = RuleVersionResolver.resolve(historicalGuardRule, new Date());
  assert(histRes.isApplicableByVersion === false && histRes.isHistoricalGuard === true, 'Historical rule acts as guard and is not auto-enforced');

  // ----------------------------------------------------
  // Test Suite 3: Validator Registry & Wholesale Safety
  // ----------------------------------------------------
  console.log('\n[Suite 3] Controlled Validator Registry & Wholesale Safety:');

  // Test 3.1 Wholesale MRP Suppression
  const wholesaleMrpRes = RuleValidatorRegistry.execute('suppress_wholesale_mrp', {
    rule: { rule_id: 'LMPC-R24-MRP-001', rule_reference: 'Rule 24; Rule 6/18' } as any,
    observation: { state: 'NOT_DETECTED' } as any,
    context: { package_context: 'WHOLESALE_PACKAGE' },
    allObservations: [],
  });
  assert(
    wholesaleMrpRes.outcome === ValidationResultOutcome.NOT_APPLICABLE,
    'Wholesale MRP is strictly NOT_APPLICABLE (prevents false violation on wholesale boxes)'
  );

  // Test 3.2 Industrial Package Scope Exclusion
  const indScopeRes = RuleValidatorRegistry.execute('evaluate_industrial_institutional_scope', {
    rule: { rule_id: 'LMPC-R3-INDINST-001' } as any,
    observation: null,
    context: {
      package_context: 'INDUSTRIAL_INSTITUTIONAL_PACKAGE',
      industrial_or_institutional_definition_satisfied: true,
    },
    allObservations: [],
  });
  assert(
    indScopeRes.outcome === ValidationResultOutcome.SCOPE_EXCLUDED,
    'Industrial/institutional package is SCOPE_EXCLUDED from Chapter II'
  );

  // Test 3.3 Safe Fallback for Unknown Validator
  const unknownRes = RuleValidatorRegistry.execute('non_existent_function', {
    rule: { rule_id: 'UNKNOWN-001' } as any,
    observation: null,
    context: {},
    allObservations: [],
  });
  assert(
    unknownRes.outcome === ValidationResultOutcome.REVIEW_REQUIRED && unknownRes.requiresInspectorReview === true,
    'Unknown validator fails safely to REVIEW_REQUIRED without crashing'
  );

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});

