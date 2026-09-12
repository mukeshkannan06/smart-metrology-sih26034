import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import {
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  SampleStatus,
  ComplianceFinding,
  FindingStatus,
  UserRole,
  User,
} from '../src/models';
import { AnalyticsService } from '../src/services/analytics.service';
import { UserContext } from '../src/services/inspection.service';

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
  console.log('  PHASE 15 — ASSISTANT CONTROLLER ANALYTICS TESTS');
  console.log('====================================================\n');

  // 1. Connect to Database
  const connected = await connectDatabase();
  if (!connected) {
    console.error('❌ Cannot connect to database. Aborting test.');
    process.exit(1);
  }

  const timestamp = Date.now();
  const testInspectorId1 = `INSP-ANALYTICS-A-${timestamp}`;
  const testInspectorId2 = `INSP-ANALYTICS-B-${timestamp}`;
  const testControllerId = `CTRL-ANALYTICS-${timestamp}`;

  const inspectorContext: UserContext = {
    id: testInspectorId1,
    inspectorId: testInspectorId1,
    role: UserRole.INSPECTOR,
    name: 'Inspector Test Alpha',
  };

  const controllerContext: UserContext = {
    id: testControllerId,
    role: UserRole.ASSISTANT_CONTROLLER,
    name: 'Assistant Controller Test',
  };

  const createdInspectionIds: mongoose.Types.ObjectId[] = [];
  const createdSampleIds: mongoose.Types.ObjectId[] = [];
  const createdFindingIds: mongoose.Types.ObjectId[] = [];
  const createdUserIds: mongoose.Types.ObjectId[] = [];

  try {
    // ----------------------------------------------------
    // Fixture Setup: Multi-Inspector, Multi-Context, Multi-Date
    // ----------------------------------------------------
    console.log('[Setup] Seeding controlled test fixture documents...');

    // Create inspector user documents so getInspectorsAnalytics can resolve officer names
    const userA = await User.create({
      username: `alpha_${timestamp}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      inspectorId: testInspectorId1,
      name: 'Inspector Test Alpha',
      role: UserRole.INSPECTOR,
      status: 'ACTIVE',
    });
    createdUserIds.push(userA._id as mongoose.Types.ObjectId);

    const userB = await User.create({
      username: `beta_${timestamp}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
      inspectorId: testInspectorId2,
      name: 'Inspector Test Beta',
      role: UserRole.INSPECTOR,
      status: 'ACTIVE',
    });
    createdUserIds.push(userB._id as mongoose.Types.ObjectId);

    // Inspection 1: Inspector A, Retail Package, COMPLETED, Created Today
    const insp1 = await Inspection.create({
      inspectionNumber: `INS-T1-${timestamp.toString().slice(-6)}`,
      inspectorId: testInspectorId1,
      packageContext: PackageContext.RETAIL_PACKAGE,
      commodity: 'Sunflower Oil 1L',
      brand: 'SunBrand',
      manufacturerName: 'Sun Ltd',
      status: InspectionStatus.COMPLETED,
      location: 'Connaught Place Market',
      totalSamplesCount: 1,
      createdAt: new Date(),
    });
    createdInspectionIds.push(insp1._id as mongoose.Types.ObjectId);

    // Sample 1 for Inspection 1
    const sample1 = await Sample.create({
      inspectionId: insp1._id,
      sampleNumber: 1,
      sampleCode: 'S01',
      status: SampleStatus.VERIFIED,
    });
    createdSampleIds.push(sample1._id as mongoose.Types.ObjectId);

    // Finding 1 (Compliant, verified)
    const find1 = await ComplianceFinding.create({
      findingId: `FIND-T1-${timestamp}-1`,
      inspectionId: insp1._id,
      sampleId: sample1._id,
      sampleCode: 'S01',
      ruleId: 'RULE-MRP-01',
      ruleReference: 'PCR 2011, Rule 6(1)(e)',
      ruleFamily: 'MANDATORY_DECLARATIONS',
      declarationType: 'MRP',
      requirementDescription: 'MRP must include all taxes',
      candidateStatus: 'COMPLIANT_CANDIDATE',
      status: 'VERIFIED_COMPLIANT',
      isVerified: true,
      isCorrected: false,
      aiObservation: { state: 'OBSERVED', extractedValue: '195.00', normalizedValue: '195.00', confidence: 'HIGH', evidenceImageIds: [], evidenceDescriptions: [] },
      ruleEngineResult: { outcome: 'PASS', reason: 'Valid MRP', applicabilityExplanation: 'Retail', requiresInspectorReview: false, ruleDatabaseVersion: '1.0', amendmentVersion: null, evaluatedAt: new Date() },
      inspectorVerification: {
        isVerified: true,
        decision: 'VERIFIED_COMPLIANT',
        verifiedValue: '195.00',
        originalAiValuePreserved: '195.00',
        isCorrected: false,
        notes: 'Verified OK',
        verifiedBy: testInspectorId1,
        verifiedByName: 'Inspector Test Alpha',
        verifiedAt: new Date(),
      },
    });
    createdFindingIds.push(find1._id as mongoose.Types.ObjectId);

    // Finding 2 (Compliant, verified)
    const find2 = await ComplianceFinding.create({
      findingId: `FIND-T1-${timestamp}-2`,
      inspectionId: insp1._id,
      sampleId: sample1._id,
      sampleCode: 'S01',
      ruleId: 'RULE-NET-01',
      ruleReference: 'PCR 2011, Rule 12',
      ruleFamily: 'MANDATORY_DECLARATIONS',
      declarationType: 'NET_QUANTITY',
      requirementDescription: 'Net quantity must specify unit',
      candidateStatus: 'COMPLIANT_CANDIDATE',
      status: 'VERIFIED_COMPLIANT',
      isVerified: true,
      isCorrected: false,
      aiObservation: { state: 'OBSERVED', extractedValue: '1 L', normalizedValue: '1 L', confidence: 'HIGH', evidenceImageIds: [], evidenceDescriptions: [] },
      ruleEngineResult: { outcome: 'PASS', reason: 'Valid Net Quantity', applicabilityExplanation: 'Retail', requiresInspectorReview: false, ruleDatabaseVersion: '1.0', amendmentVersion: null, evaluatedAt: new Date() },
      inspectorVerification: {
        isVerified: true,
        decision: 'VERIFIED_COMPLIANT',
        verifiedValue: '1 L',
        originalAiValuePreserved: '1 L',
        isCorrected: false,
        notes: 'Verified OK',
        verifiedBy: testInspectorId1,
        verifiedByName: 'Inspector Test Alpha',
        verifiedAt: new Date(),
      },
    });
    createdFindingIds.push(find2._id as mongoose.Types.ObjectId);

    // Inspection 2: Inspector A, Wholesale Package, IN_PROGRESS, Created 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const insp2 = await Inspection.create({
      inspectionNumber: `INS-T2-${timestamp.toString().slice(-6)}`,
      inspectorId: testInspectorId1,
      packageContext: PackageContext.WHOLESALE_PACKAGE,
      commodity: 'Basmati Rice 25kg',
      brand: 'Royal Grain',
      manufacturerName: 'Royal Mills',
      status: InspectionStatus.IN_PROGRESS,
      location: 'Azadpur Mandi',
      totalSamplesCount: 1,
      createdAt: tenDaysAgo,
    });
    createdInspectionIds.push(insp2._id as mongoose.Types.ObjectId);

    const sample2 = await Sample.create({
      inspectionId: insp2._id,
      sampleNumber: 1,
      sampleCode: 'S01',
      status: SampleStatus.VERIFIED,
    });
    createdSampleIds.push(sample2._id as mongoose.Types.ObjectId);

    // Finding 3 (Non-compliant, verified violation)
    const find3 = await ComplianceFinding.create({
      findingId: `FIND-T2-${timestamp}-3`,
      inspectionId: insp2._id,
      sampleId: sample2._id,
      sampleCode: 'S01',
      ruleId: 'RULE-WHL-01',
      ruleReference: 'PCR 2011, Rule 24',
      ruleFamily: 'MANDATORY_DECLARATIONS',
      declarationType: 'MRP',
      requirementDescription: 'Wholesale package missing declaration',
      candidateStatus: 'POTENTIAL_NON_COMPLIANCE',
      status: 'VERIFIED_NON_COMPLIANT',
      isVerified: true,
      isCorrected: false,
      aiObservation: { state: 'NOT_OBSERVED', extractedValue: null, normalizedValue: null, confidence: 'HIGH', evidenceImageIds: [], evidenceDescriptions: [] },
      ruleEngineResult: { outcome: 'POTENTIAL_VIOLATION', reason: 'Missing declaration', applicabilityExplanation: 'Wholesale', requiresInspectorReview: true, ruleDatabaseVersion: '1.0', amendmentVersion: null, evaluatedAt: new Date() },
      inspectorVerification: {
        isVerified: true,
        decision: 'VERIFIED_NON_COMPLIANT',
        verifiedValue: 'ABSENT',
        originalAiValuePreserved: null,
        isCorrected: false,
        notes: 'Confirmed violation of Rule 24',
        verifiedBy: testInspectorId1,
        verifiedByName: 'Inspector Test Alpha',
        verifiedAt: new Date(),
      },
    });
    createdFindingIds.push(find3._id as mongoose.Types.ObjectId);

    // Inspection 3: Inspector B, Imported Package, READY_FOR_SAMPLING, Created 40 days ago (outside 30d window)
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const insp3 = await Inspection.create({
      inspectionNumber: `INS-T3-${timestamp.toString().slice(-6)}`,
      inspectorId: testInspectorId2,
      packageContext: PackageContext.IMPORTED_PACKAGE,
      commodity: 'Swiss Chocolate Box',
      brand: 'ChocLux',
      importerName: 'Global Imports LLP',
      status: InspectionStatus.READY_FOR_SAMPLING,
      location: 'Okhla Inland Container Depot',
      totalSamplesCount: 1,
      createdAt: fortyDaysAgo,
    });
    createdInspectionIds.push(insp3._id as mongoose.Types.ObjectId);

    const sample3 = await Sample.create({
      inspectionId: insp3._id,
      sampleNumber: 1,
      sampleCode: 'S01',
      status: SampleStatus.PENDING,
    });
    createdSampleIds.push(sample3._id as mongoose.Types.ObjectId);

    // Finding 4 (Pending verification)
    const find4 = await ComplianceFinding.create({
      findingId: `FIND-T3-${timestamp}-4`,
      inspectionId: insp3._id,
      sampleId: sample3._id,
      sampleCode: 'S01',
      ruleId: 'RULE-IMP-01',
      ruleReference: 'PCR 2011, Rule 6(1)(f)',
      ruleFamily: 'MANDATORY_DECLARATIONS',
      declarationType: 'COUNTRY_OF_ORIGIN',
      requirementDescription: 'Country of origin must be stated for imports',
      candidateStatus: 'POTENTIAL_NON_COMPLIANCE',
      status: 'REQUIRES_INSPECTOR_REVIEW',
      isVerified: false,
      isCorrected: false,
      aiObservation: { state: 'NOT_OBSERVED', extractedValue: null, normalizedValue: null, confidence: 'HIGH', evidenceImageIds: [], evidenceDescriptions: [] },
      ruleEngineResult: { outcome: 'REVIEW_REQUIRED', reason: 'Check COO', applicabilityExplanation: 'Imported', requiresInspectorReview: true, ruleDatabaseVersion: '1.0', amendmentVersion: null, evaluatedAt: new Date() },
      inspectorVerification: {
        isVerified: false,
        decision: null,
        verifiedValue: null,
        originalAiValuePreserved: null,
        isCorrected: false,
        notes: null,
        verifiedBy: null,
        verifiedByName: null,
        verifiedAt: null,
      },
    });
    createdFindingIds.push(find4._id as mongoose.Types.ObjectId);

    console.log('[Setup] Seeded 3 inspections, 3 samples, 4 findings across 2 inspectors.\n');

    // ----------------------------------------------------
    // Test Suite 1: RBAC Access Control
    // ----------------------------------------------------
    console.log('[Suite 1] RBAC Supervisory Access:');
    let inspectorAccessBlocked = false;
    try {
      await AnalyticsService.getOverviewAnalytics({}, inspectorContext);
    } catch (err: any) {
      inspectorAccessBlocked = err.message.includes('403') || err.message.includes('Forbidden') || err.message.includes('Assistant Controller');
    }
    assert(inspectorAccessBlocked, 'Inspectors are forbidden (403) from accessing supervisory analytics');

    const controllerOverview = await AnalyticsService.getOverviewAnalytics({}, controllerContext);
    assert(controllerOverview !== null && typeof controllerOverview === 'object', 'Assistant Controller has authorized access to supervisory analytics');

    // ----------------------------------------------------
    // Test Suite 2: Dynamic KPIs Matching Database
    // ----------------------------------------------------
    console.log('\n[Suite 2] Dynamic KPIs Calculation:');
    // In our overall DB, let's test specific inspector filter to isolate our seeded data
    const scopedOverview = await AnalyticsService.getOverviewAnalytics(
      { inspectorId: testInspectorId1, timeRange: 'all' },
      controllerContext
    );

    assert(scopedOverview.summary.totalInspections === 2, `Inspector A total inspections matches seeded count (expected 2, got ${scopedOverview.summary.totalInspections})`);
    assert(scopedOverview.summary.completedInspections === 1, `Inspector A completed inspections matches count (expected 1, got ${scopedOverview.summary.completedInspections})`);
    assert(scopedOverview.summary.activeInspections === 1, `Inspector A active inspections matches count (expected 1, got ${scopedOverview.summary.activeInspections})`);
    assert(scopedOverview.summary.totalFindings === 3, `Inspector A total findings matches count (expected 3, got ${scopedOverview.summary.totalFindings})`);
    assert(scopedOverview.summary.verifiedFindings === 3, `Inspector A verified findings matches count (expected 3, got ${scopedOverview.summary.verifiedFindings})`);
    assert(scopedOverview.summary.verifiedCompliantCount === 2, `Inspector A verified compliant matches count (expected 2, got ${scopedOverview.summary.verifiedCompliantCount})`);
    assert(scopedOverview.summary.verifiedNonCompliantCount === 1, `Inspector A verified non-compliant matches count (expected 1, got ${scopedOverview.summary.verifiedNonCompliantCount})`);
    // Compliance rate: 2 compliant / 3 total verified = 67%
    assert(
      scopedOverview.summary.overallComplianceRate === 67,
      `Inspector A compliance rate correctly calculated (${scopedOverview.summary.overallComplianceRate}% == 67%)`
    );

    // ----------------------------------------------------
    // Test Suite 3: Date-Range Filtering
    // ----------------------------------------------------
    console.log('\n[Suite 3] Date-Range Filtering:');
    // Today filter: should include insp1 (today), exclude insp2 (10 days ago) and insp3 (40 days ago)
    const todayOverview = await AnalyticsService.getOverviewAnalytics(
      { inspectorId: testInspectorId1, timeRange: 'today' },
      controllerContext
    );
    assert(todayOverview.summary.totalInspections === 1, `Today filter isolates today's inspections (expected 1, got ${todayOverview.summary.totalInspections})`);

    // 7d filter: should include insp1, exclude insp2 (10d ago)
    const sevenDayOverview = await AnalyticsService.getOverviewAnalytics(
      { inspectorId: testInspectorId1, timeRange: '7d' },
      controllerContext
    );
    assert(sevenDayOverview.summary.totalInspections === 1, `7-day filter isolates last 7 days (expected 1, got ${sevenDayOverview.summary.totalInspections})`);

    // 30d filter: should include insp1 (today) and insp2 (10d ago), exclude insp3 (40d ago)
    const thirtyDayOverview = await AnalyticsService.getOverviewAnalytics(
      { timeRange: '30d' },
      controllerContext
    );
    const hasInsp3In30d = thirtyDayOverview.attentionRequired.some(
      (a: any) => a.inspectionNumber === insp3.inspectionNumber
    );
    assert(!hasInsp3In30d, `30-day filter excludes inspections older than 30 days`);

    // ----------------------------------------------------
    // Test Suite 4: Statutory Package Context Conformity
    // ----------------------------------------------------
    console.log('\n[Suite 4] Statutory Package Context Conformity:');
    const validContexts = [
      PackageContext.RETAIL_PACKAGE,
      PackageContext.WHOLESALE_PACKAGE,
      PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE,
      PackageContext.IMPORTED_PACKAGE,
      PackageContext.EXPORT_PACKAGE,
    ];

    const packageBreakdown = controllerOverview.charts.packageContextDistribution;
    const allContextsValid = packageBreakdown.every((item: any) =>
      validContexts.includes(item.context as PackageContext)
    );
    assert(allContextsValid, 'All package contexts in breakdown match the 5 approved statutory contexts');

    const serializedPayload = JSON.stringify(controllerOverview);
    assert(
      !serializedPayload.includes('Single-Piece Retail Package'),
      'Strictly zero occurrences of invalid context "Single-Piece Retail Package"'
    );

    // ----------------------------------------------------
    // Test Suite 5: Findings by Declaration Type
    // ----------------------------------------------------
    console.log('\n[Suite 5] Findings by Declaration Type:');
    const mrpFinding = scopedOverview.charts.findingsByDeclarationType.find(
      (item: any) => item.declarationType === 'MRP'
    );
    assert(mrpFinding !== undefined, 'MRP declaration type represented in breakdown');
    if (mrpFinding) {
      assert(mrpFinding.total === 2, `MRP total findings count matches (expected 2, got ${mrpFinding.total})`);
      assert(mrpFinding.compliant === 1, `MRP compliant count matches (expected 1, got ${mrpFinding.compliant})`);
      assert(mrpFinding.nonCompliant === 1, `MRP nonCompliant count matches (expected 1, got ${mrpFinding.nonCompliant})`);
    }

    // ----------------------------------------------------
    // Test Suite 6: Supervisory Inspector Workload Analytics
    // ----------------------------------------------------
    console.log('\n[Suite 6] Supervisory Inspector Performance Metrics:');
    const inspectorMetrics = await AnalyticsService.getInspectorsAnalytics({ timeRange: 'all' }, controllerContext);
    const alphaMetric = inspectorMetrics.find((m: any) => m.badgeNumber === testInspectorId1 || m.name === 'Inspector Test Alpha');
    const betaMetric = inspectorMetrics.find((m: any) => m.badgeNumber === testInspectorId2 || m.name === 'Inspector Test Beta');

    assert(alphaMetric !== undefined, 'Inspector Alpha found in supervisory inspector analytics');
    if (alphaMetric) {
      assert(alphaMetric.totalInspections === 2, `Inspector Alpha total inspections matches (expected 2, got ${alphaMetric.totalInspections})`);
      assert(alphaMetric.completed === 1, `Inspector Alpha completed inspections matches (expected 1, got ${alphaMetric.completed})`);
      assert(alphaMetric.inProgress === 1, `Inspector Alpha active inspections matches (expected 1, got ${alphaMetric.inProgress})`);
      assert(alphaMetric.violationsCount === 1, `Inspector Alpha violations matches (expected 1, got ${alphaMetric.violationsCount})`);
      assert(alphaMetric.name === 'Inspector Test Alpha', `Inspector Alpha name accurately resolved`);
    }

    assert(betaMetric !== undefined, 'Inspector Beta found in supervisory inspector analytics');
    if (betaMetric) {
      assert(betaMetric.totalInspections === 1, `Inspector Beta total inspections matches (expected 1, got ${betaMetric.totalInspections})`);
      assert(betaMetric.name === 'Inspector Test Beta', `Inspector Beta name accurately resolved`);
    }

    // ----------------------------------------------------
    // Test Suite 7: Supervisory Violations Query
    // ----------------------------------------------------
    console.log('\n[Suite 7] Supervisory Violations Query:');
    const violationsResult = await AnalyticsService.getViolationsAnalytics(
      { inspectorId: testInspectorId1, timeRange: 'all' },
      controllerContext
    );
    assert(violationsResult.length >= 1, 'Violations query surfaces non-compliant findings');
    const targetViolation = violationsResult.find(
      (v: any) => v.inspectionNumber === insp2.inspectionNumber
    );
    assert(targetViolation !== undefined, 'Target non-compliant finding surfaced in supervisory view');
    if (targetViolation) {
      assert(targetViolation.declarationType === 'MRP', 'Violation declaration type matches');
      assert(targetViolation.ruleReference === 'PCR 2011, Rule 24', 'Violation rule reference matches');
      assert(targetViolation.status === 'VERIFIED_NON_COMPLIANT', 'Violation status is VERIFIED_NON_COMPLIANT');
    }

    // ----------------------------------------------------
    // Test Suite 8: Zero Mutation & Zero AI / Rule Engine Calls
    // ----------------------------------------------------
    console.log('\n[Suite 8] Record Immutability & Zero AI/Rule Engine Side-effects:');
    const insp1Before = await Inspection.findById(insp1._id).lean();
    const find1Before = await ComplianceFinding.findById(find1._id).lean();

    // Call all analytics endpoints repeatedly
    await AnalyticsService.getOverviewAnalytics({}, controllerContext);
    await AnalyticsService.getInspectorsAnalytics({}, controllerContext);
    await AnalyticsService.getViolationsAnalytics({}, controllerContext);
    await AnalyticsService.getMonitoredInspections({}, controllerContext);

    const insp1After = await Inspection.findById(insp1._id).lean();
    const find1After = await ComplianceFinding.findById(find1._id).lean();

    assert(
      JSON.stringify(insp1Before) === JSON.stringify(insp1After),
      'Inspection documents are strictly IMMUTABLE across analytics executions'
    );
    assert(
      JSON.stringify(find1Before) === JSON.stringify(find1After),
      'ComplianceFinding documents are strictly IMMUTABLE across analytics executions'
    );

    // ----------------------------------------------------
    // Test Suite 9: Sensitive Data Sanitization
    // ----------------------------------------------------
    console.log('\n[Suite 9] Sensitive Data Sanitization:');
    const fullPayloadString = JSON.stringify({
      controllerOverview,
      inspectorMetrics,
      violationsResult,
    });
    assert(
      !fullPayloadString.includes('password') &&
        !fullPayloadString.includes('token') &&
        !fullPayloadString.includes('mongodb+srv://') &&
        !fullPayloadString.includes('jwtSecret'),
      'Analytics payload contains zero passwords, tokens, secrets, or MongoDB connection strings'
    );

  } finally {
    // ----------------------------------------------------
    // Teardown
    // ----------------------------------------------------
    console.log('\n[Teardown] Cleaning up test fixtures...');
    for (const iid of createdInspectionIds) await Inspection.findByIdAndDelete(iid);
    for (const sid of createdSampleIds) await Sample.findByIdAndDelete(sid);
    for (const fid of createdFindingIds) await ComplianceFinding.findByIdAndDelete(fid);
    for (const uid of createdUserIds) await User.findByIdAndDelete(uid);

    await disconnectDatabase();
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
