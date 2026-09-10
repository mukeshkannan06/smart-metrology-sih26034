import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../backend/src/config/database';
import {
  ComplianceFinding,
  FindingCandidateStatus,
  InspectorVerificationDecision,
  FindingStatus,
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  SampleStatus,
  UserRole,
} from '../backend/src/models';
import { RuleEngineService } from '../backend/src/rules/engine/RuleEngineService';
import { FindingService } from '../backend/src/services/finding.service';

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

async function runPhase12Tests() {
  console.log('====================================================');
  console.log('  PHASE 12 — COMPLIANCE FINDINGS & VERIFICATION TESTS');
  console.log('====================================================\n');

  await connectDatabase();
  if (!isDatabaseConnected()) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // Suite 1: Mongoose Schema & Indexes
    // ----------------------------------------------------
    console.log('[Suite 1] Schema & Indexes Verification:');
    await ComplianceFinding.init();
    const indexes = await ComplianceFinding.collection.indexes();
    const hasSampleRuleIndex = indexes.some(
      (idx) => idx.key && idx.key.sampleId === 1 && idx.key.ruleId === 1 && idx.unique === true
    );
    assert(hasSampleRuleIndex, 'Compound unique index on { sampleId: 1, ruleId: 1 } exists and is unique');

    // ----------------------------------------------------
    // Suite 2: E2E Generation of Findings from Rule Engine
    // ----------------------------------------------------
    console.log('\n[Suite 2] Auto-Generation & 3-Layer Structure:');
    const testInspectorUser = {
      id: 'usr_test_inspector_01',
      inspectorId: 'INS-DEL-01',
      role: UserRole.INSPECTOR,
      name: 'Rajesh Kumar (Field Officer)',
    };

    const testInspector2User = {
      id: 'usr_test_inspector_02',
      inspectorId: 'INS-DEL-02',
      role: UserRole.INSPECTOR,
      name: 'Priya Sharma (Field Officer)',
    };

    const testControllerUser = {
      id: 'usr_test_controller_01',
      role: UserRole.ASSISTANT_CONTROLLER,
      name: 'Dr. Vikram Singh (Supervisory Controller)',
    };

    // Create test case
    const testInspection = await Inspection.create({
      inspectionNumber: `TEST-P12-${Date.now()}`,
      inspectorId: testInspectorUser.inspectorId,
      commodity: 'Fortified Wheat Flour (Atta)',
      brand: 'Aashirvaad',
      packageContext: PackageContext.RETAIL_PACKAGE,
      location: 'Okhla Industrial Area, Phase II',
      samplesCount: 1,
      status: InspectionStatus.IN_PROGRESS,
    });

    const testSample = await Sample.create({
      inspectionId: testInspection._id,
      sampleNumber: 1,
      sampleCode: `SMP-P12-${Date.now().toString().slice(-4)}`,
      status: SampleStatus.EXTRACTED,
      notes: 'Test specimen package for Phase 12 validation',
    });

    // Run deterministic rule engine
    const evaluation = await RuleEngineService.evaluateSample(
      testInspection._id,
      testSample._id,
      testInspectorUser.inspectorId
    );

    assert(evaluation.rules_evaluated.length === 33, 'Rule engine evaluated all 33 statutory rules');

    // Check findings generated
    const findings = await ComplianceFinding.find({ sampleId: testSample._id }).sort({ ruleId: 1 });
    assert(findings.length === 33, `Generated exactly 33 findings for sample (got ${findings.length})`);

    const firstFinding = findings[0];
    assert(Boolean(firstFinding.findingId), `Finding has unique findingId: ${firstFinding.findingId}`);
    assert(firstFinding.isVerified === false, 'Initial finding isVerified is strictly false');
    assert(Boolean(firstFinding.aiObservation), 'Layer A (aiObservation) exists');
    assert(Boolean(firstFinding.ruleEngineResult), 'Layer B (ruleEngineResult) exists');
    assert(Boolean(firstFinding.inspectorVerification), 'Layer C (inspectorVerification) exists');
    assert(
      firstFinding.inspectorVerification.isVerified === false,
      'Layer C starts unverified with null decision'
    );

    // Verify telemetry calculation
    const telemetry = FindingService.calculateTelemetry(findings);
    assert(telemetry.totalFindings === 33, `Telemetry reports totalFindings = 33`);
    assert(telemetry.verifiedCount === 0, `Telemetry reports verifiedCount = 0`);
    assert(telemetry.pendingCount === 33, `Telemetry reports pendingCount = 33`);
    assert(telemetry.percentVerified === 0, `Telemetry reports percentVerified = 0%`);
    assert(telemetry.isAllVerified === false, `Telemetry reports isAllVerified = false`);

    // ----------------------------------------------------
    // Suite 3: Observation Correction & Legal Immutability
    // ----------------------------------------------------
    console.log('\n[Suite 3] Value Correction & AI Immutability Guarantee:');
    // Simulate initial AI extraction on a finding
    firstFinding.aiObservation.extractedValue = 'Aashirvad Atta 5kg';
    firstFinding.aiObservation.confidence = 'HIGH';
    await firstFinding.save();

    const originalAiValue = firstFinding.aiObservation.extractedValue;
    const correctedValue = 'Aashirvaad Superior MP Atta 5kg';

    const correctedFinding = await FindingService.correctFinding(
      firstFinding._id.toString(),
      testInspectorUser,
      {
        correctedValue,
        notes: 'Corrected brand name spelling from physical package inspection',
      }
    );

    assert(
      correctedFinding.aiObservation.extractedValue === originalAiValue,
      'Original AI extractedValue is strictly IMMUTABLE and untouched'
    );
    assert(
      correctedFinding.inspectorVerification.verifiedValue === correctedValue,
      'Inspector verifiedValue is updated to corrected text'
    );
    assert(
      correctedFinding.inspectorVerification.originalAiValuePreserved === originalAiValue,
      'Original AI value is explicitly preserved in inspectorVerification.originalAiValuePreserved'
    );
    assert(correctedFinding.isCorrected === true, 'Finding isCorrected flag is true');
    assert(
      correctedFinding.inspectorVerification.isCorrected === true,
      'Layer C isCorrected flag is true'
    );

    // ----------------------------------------------------
    // Suite 4: Inspector Verification Decisions
    // ----------------------------------------------------
    console.log('\n[Suite 4] Inspector Verification Decisions & Transitions:');
    // Verify finding 1 as VERIFIED_COMPLIANT
    const verifyRes1 = await FindingService.verifyFinding(
      firstFinding._id.toString(),
      testInspectorUser,
      {
        decision: InspectorVerificationDecision.VERIFIED_COMPLIANT,
        notes: 'Physical examination confirms complete compliance with Rule 6(1)(a).',
      }
    );

    assert(verifyRes1.finding.isVerified === true, 'Finding 1 isVerified is true');
    assert(
      verifyRes1.finding.status === FindingStatus.VERIFIED_COMPLIANT,
      `Finding 1 status transitioned to VERIFIED_COMPLIANT`
    );
    assert(
      verifyRes1.finding.inspectorVerification.verifiedBy === testInspectorUser.inspectorId,
      'Inspector badge ID recorded in verifiedBy'
    );
    assert(
      verifyRes1.finding.inspectorVerification.verifiedByName === testInspectorUser.name,
      'Inspector full name recorded in verifiedByName'
    );
    assert(
      Boolean(verifyRes1.finding.inspectorVerification.verifiedAt),
      'Verification timestamp recorded'
    );
    assert(verifyRes1.telemetry.verifiedCount === 1, 'Telemetry verifiedCount updated to 1');
    assert(verifyRes1.allSampleFindingsVerified === false, 'allSampleFindingsVerified is false (1/33)');

    // Verify finding 2 as VERIFIED_NON_COMPLIANT
    const secondFinding = findings[1];
    const verifyRes2 = await FindingService.verifyFinding(
      secondFinding._id.toString(),
      testInspectorUser,
      {
        decision: InspectorVerificationDecision.VERIFIED_NON_COMPLIANT,
        notes: 'Mandatory declaration completely missing on package.',
      }
    );

    assert(
      verifyRes2.finding.status === FindingStatus.VERIFIED_NON_COMPLIANT,
      'Finding 2 status transitioned to VERIFIED_NON_COMPLIANT'
    );
    assert(verifyRes2.telemetry.verifiedCount === 2, 'Telemetry verifiedCount updated to 2');

    // ----------------------------------------------------
    // Suite 5: RBAC Security & Data Isolation
    // ----------------------------------------------------
    console.log('\n[Suite 5] Role-Based Access Control & Security Guards:');

    // Test 1: Assistant Controller cannot verify findings (Read-only supervisory)
    let controllerBlocked = false;
    try {
      await FindingService.verifyFinding(
        findings[2]._id.toString(),
        testControllerUser,
        { decision: InspectorVerificationDecision.VERIFIED_COMPLIANT }
      );
    } catch (err: any) {
      if (err.statusCode === 403) controllerBlocked = true;
    }
    assert(controllerBlocked, 'Assistant Controller rejected with HTTP 403 on verification attempt');

    // Test 2: Assistant Controller cannot correct observation values
    let controllerCorrectionBlocked = false;
    try {
      await FindingService.correctFinding(
        findings[2]._id.toString(),
        testControllerUser,
        { correctedValue: 'Tampered Value' }
      );
    } catch (err: any) {
      if (err.statusCode === 403) controllerCorrectionBlocked = true;
    }
    assert(
      controllerCorrectionBlocked,
      'Assistant Controller rejected with HTTP 403 on value correction attempt'
    );

    // Test 3: Another inspector cannot verify findings for an inspection they do not own
    let crossInspectorBlocked = false;
    try {
      await FindingService.verifyFinding(
        findings[2]._id.toString(),
        testInspector2User,
        { decision: InspectorVerificationDecision.VERIFIED_COMPLIANT }
      );
    } catch (err: any) {
      if (err.statusCode === 403) crossInspectorBlocked = true;
    }
    assert(
      crossInspectorBlocked,
      'Cross-inspector rejected with HTTP 403 when trying to verify another officer\'s case'
    );

    // Test 4: Another inspector cannot query findings for an inspection they do not own
    let crossInspectorQueryBlocked = false;
    try {
      await FindingService.getInspectionFindings(
        testInspection._id.toString(),
        testInspector2User
      );
    } catch (err: any) {
      if (err.statusCode === 403) crossInspectorQueryBlocked = true;
    }
    assert(
      crossInspectorQueryBlocked,
      'Cross-inspector rejected with HTTP 403 on inspection findings query'
    );

    // Test 5: Assistant Controller CAN query findings in supervisory read-only mode
    const controllerQuery = await FindingService.getInspectionFindings(
      testInspection._id.toString(),
      testControllerUser
    );
    assert(
      controllerQuery.findings.length === 33,
      'Assistant Controller successfully views all 33 findings in supervisory mode'
    );

    // ----------------------------------------------------
    // Suite 6: Full Sample Verification Completion
    // ----------------------------------------------------
    console.log('\n[Suite 6] Full Sample Verification Completion:');
    // Verify all remaining findings (from index 2 to 32)
    for (let i = 2; i < findings.length; i++) {
      await FindingService.verifyFinding(
        findings[i]._id.toString(),
        testInspectorUser,
        {
          decision:
            findings[i].candidateStatus === FindingCandidateStatus.NOT_APPLICABLE
              ? InspectorVerificationDecision.VERIFIED_NOT_APPLICABLE
              : InspectorVerificationDecision.VERIFIED_COMPLIANT,
          notes: 'Batch verification for test suite',
        }
      );
    }

    const sampleFindingsAfter = await FindingService.getSampleFindings(
      testSample._id.toString(),
      testInspectorUser
    );

    assert(
      sampleFindingsAfter.telemetry.isAllVerified === true,
      'Sample telemetry confirms isAllVerified is true (33/33)'
    );
    assert(
      sampleFindingsAfter.telemetry.percentVerified === 100,
      'Sample telemetry confirms percentVerified is 100%'
    );

    const updatedSample = await Sample.findById(testSample._id);
    assert(
      updatedSample?.status === SampleStatus.VERIFIED,
      'Sample status automatically transitioned to VERIFIED upon 100% finding verification'
    );

    // Clean up test documents
    await ComplianceFinding.deleteMany({ sampleId: testSample._id });
    await Sample.deleteOne({ _id: testSample._id });
    await Inspection.deleteOne({ _id: testInspection._id });
    console.log('\nCleaned up test records from database.');

  } catch (error) {
    console.error('Unexpected test error:', error);
    failed++;
  } finally {
    await disconnectDatabase();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase12Tests().catch(console.error);
