import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import {
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  SampleStatus,
  AIExtraction,
  RuleEvaluation,
  ComplianceFinding,
  UserRole,
} from '../src/models';
import { ReportService } from '../src/services/report.service';
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
  console.log('  PHASE 14 — CONSOLIDATED PDF REPORTING UNIT TESTS');
  console.log('====================================================\n');

  // 1. Connect to Database
  const connected = await connectDatabase();
  if (!connected) {
    console.error('❌ Cannot connect to database. Aborting test.');
    process.exit(1);
  }

  // Setup disk files in tmp/uploads for image lifecycle testing
  const uploadsDir = path.resolve(__dirname, '../tmp/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const realImageRef = `test_real_img_${Date.now()}.jpg`;
  const realImagePath = path.join(uploadsDir, realImageRef);
  fs.writeFileSync(realImagePath, 'fake-jpeg-image-bytes-for-test');

  const missingImageRef = `test_purged_img_${Date.now()}.jpg`;
  const missingImagePath = path.join(uploadsDir, missingImageRef);
  if (fs.existsSync(missingImagePath)) {
    fs.unlinkSync(missingImagePath);
  }

  const testInspectorId1 = `INSP-RAJESH-${Date.now()}`;
  const testInspectorId2 = `INSP-SURESH-${Date.now()}`;
  const testControllerId = `CTRL-SHARMA-${Date.now()}`;

  const inspector1Context: UserContext = {
    id: testInspectorId1,
    inspectorId: testInspectorId1,
    role: UserRole.INSPECTOR,
    name: 'Inspector Rajesh Kumar',
  };

  const inspector2Context: UserContext = {
    id: testInspectorId2,
    inspectorId: testInspectorId2,
    role: UserRole.INSPECTOR,
    name: 'Inspector Suresh Patil',
  };

  const controllerContext: UserContext = {
    id: testControllerId,
    role: UserRole.ASSISTANT_CONTROLLER,
    name: 'Joint Director Sharma',
  };

  let testInspectionId: mongoose.Types.ObjectId;
  const createdSampleIds: mongoose.Types.ObjectId[] = [];
  const createdFindingIds: mongoose.Types.ObjectId[] = [];
  const createdExtractionIds: mongoose.Types.ObjectId[] = [];
  const createdEvaluationIds: mongoose.Types.ObjectId[] = [];

  try {
    // ----------------------------------------------------
    // Fixture Setup: Multi-Sample Inspection (3 samples)
    // ----------------------------------------------------
    console.log('[Setup] Seeding multi-sample inspection fixture...');

    const inspection = await Inspection.create({
      inspectionNumber: `INS-PH14-${Date.now().toString().slice(-6)}`,
      inspectorId: testInspectorId1,
      packageContext: PackageContext.RETAIL_PACKAGE,
      commodity: 'Fortified Sunflower Cooking Oil 1L',
      brand: 'SunPure Supreme',
      location: 'Central Supermarket, Koramangala, Bengaluru',
      market: 'Sector 4 Hypermarket',
      samplesCount: 3,
      status: InspectionStatus.COMPLETED,
    });
    testInspectionId = inspection._id;

    // Create 3 Child Samples deliberately out of order (3, 1, 2) to test deterministic sort
    const sample3 = await Sample.create({
      inspectionId: testInspectionId,
      sampleNumber: 3,
      sampleCode: 'S03',
      status: SampleStatus.VERIFIED,
      images: [],
    });
    createdSampleIds.push(sample3._id);

    const sample1 = await Sample.create({
      inspectionId: testInspectionId,
      sampleNumber: 1,
      sampleCode: 'S01',
      status: SampleStatus.VERIFIED,
      images: [
        {
          imageId: 'IMG-001',
          sequence: 1,
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          fileName: 'front_panel.jpg',
          temporaryReference: realImageRef,
          capturedAt: new Date(),
        },
        {
          imageId: 'IMG-002',
          sequence: 2,
          mimeType: 'image/jpeg',
          sizeBytes: 2048,
          fileName: 'purged_back_panel.jpg',
          temporaryReference: missingImageRef,
          capturedAt: new Date(),
        },
      ],
    });
    createdSampleIds.push(sample1._id);

    const sample2 = await Sample.create({
      inspectionId: testInspectionId,
      sampleNumber: 2,
      sampleCode: 'S02',
      status: SampleStatus.VERIFIED,
      images: [],
    });
    createdSampleIds.push(sample2._id);

    const uniqueSeed = Date.now().toString();

    // AI Extraction for Sample 1
    const ext1 = await AIExtraction.create({
      extractionId: `EXT-S01-${uniqueSeed}`,
      inspectionId: testInspectionId,
      sampleId: sample1._id,
      imageIds: ['IMG-001'],
      imageSetHash: 'hash-abc-123',
      provider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      promptVersion: '1.0.0',
      status: 'COMPLETED',
      overallConfidence: 'HIGH',
      declarations: [
        {
          category: 'MRP',
          state: 'DETECTED',
          rawValue: 'Rs 195.00',
          normalizedValue: '195.00',
          confidence: 'HIGH',
          evidenceImageId: 'IMG-001',
          evidenceDescription: 'MRP on front neck',
        },
      ],
      warnings: [],
      processingMetadata: {
        durationMs: 380,
        imagesCount: 1,
        timestamp: new Date(),
      },
    });
    createdExtractionIds.push(ext1._id);

    // Rule Evaluation for Sample 1 (historical DB version 1.0)
    const eval1 = await RuleEvaluation.create({
      evaluation_id: `EVAL-S01-${uniqueSeed}`,
      inspectionId: testInspectionId,
      sampleId: sample1._id,
      sampleCode: 'S01',
      package_context: 'RETAIL_PACKAGE',
      commodity: 'Fortified Sunflower Cooking Oil 1L',
      commodity_category: 'FOOD_EDIBLE_OIL',
      rule_database_version: '1.0',
      evaluated_at: new Date(),
      evaluated_by: testInspectorId1,
      rules_evaluated: [
        {
          rule_id: 'RULE-MRP-01',
          rule_reference: 'PCR 2011, Rule 6(1)(e)',
          declaration_type: 'MRP',
          requirement_description: 'Maximum Retail Price declaration',
          rule_family: 'MANDATORY_DECLARATIONS',
          applicability_status: 'APPLICABLE',
          mandatory_status: 'MANDATORY',
          observation_status: 'OBSERVED',
          observed_value: 'Rs 195.00',
          normalized_value: '195.00',
          confidence: 'HIGH',
          evidence_image_ids: ['IMG-001'],
          evidence_descriptions: ['Front neck'],
          reason: 'Valid MRP declaration format',
          applicability_explanation: 'Retail pack',
          validation_result: 'PASS',
          requires_inspector_review: false,
          rule_database_version: '1.0',
          amendment_version: null,
          effective_from: null,
          effective_to: null,
        },
      ],
      summary: {
        total_rules_evaluated: 1,
        applicable_count: 1,
        compliant_count: 1,
        potential_violations_count: 0,
        review_required_count: 0,
        exempt_count: 0,
        scope_excluded_count: 0,
        not_applicable_count: 0,
      },
    });
    createdEvaluationIds.push(eval1._id);

    // Compliance Finding 1 (Sample 1): Officer corrected finding
    const find1 = await ComplianceFinding.create({
      findingId: `FIND-S01-${uniqueSeed}-1`,
      inspectionId: testInspectionId,
      sampleId: sample1._id,
      sampleCode: 'S01',
      ruleId: 'RULE-MRP-01',
      ruleReference: 'PCR 2011, Rule 6(1)(e)',
      ruleFamily: 'MANDATORY_DECLARATIONS',
      declarationType: 'MRP',
      requirementDescription: 'Maximum Retail Price declaration under PCR Rule 6(1)(e)',
      candidateStatus: 'COMPLIANT_CANDIDATE',
      status: 'VERIFIED_COMPLIANT',
      isVerified: true,
      isCorrected: true,
      aiObservation: {
        state: 'OBSERVED',
        extractedValue: 'Rs 195.00',
        normalizedValue: '195.00',
        confidence: 'HIGH',
        evidenceImageIds: ['IMG-001'],
        evidenceDescriptions: ['Front neck label'],
      },
      ruleEngineResult: {
        outcome: 'PASS',
        reason: 'Valid MRP declaration format',
        applicabilityExplanation: 'Retail pack',
        requiresInspectorReview: false,
        ruleDatabaseVersion: '1.0',
        amendmentVersion: null,
        evaluatedAt: new Date(),
      },
      inspectorVerification: {
        isVerified: true,
        decision: 'VERIFIED_COMPLIANT',
        verifiedValue: 'Rs. 195.00 (inclusive of all taxes)',
        originalAiValuePreserved: 'Rs 195.00',
        isCorrected: true,
        notes: 'Confirmed full tax inclusion suffix on side banner',
        verifiedBy: testInspectorId1,
        verifiedByName: 'Inspector Rajesh Kumar',
        verifiedAt: new Date(),
      },
    });
    createdFindingIds.push(find1._id);

    // Compliance Finding 2 (Sample 2): Non-compliant finding
    const find2 = await ComplianceFinding.create({
      findingId: `FIND-S02-${uniqueSeed}-2`,
      inspectionId: testInspectionId,
      sampleId: sample2._id,
      sampleCode: 'S02',
      ruleId: 'RULE-CC-01',
      ruleReference: 'PCR 2011, Rule 6(1)(da)',
      ruleFamily: 'CONSUMER_CARE',
      declarationType: 'CONSUMER_CARE',
      requirementDescription: 'Consumer care contact telephone and email details',
      candidateStatus: 'POTENTIAL_NON_COMPLIANCE',
      status: 'VERIFIED_NON_COMPLIANT',
      isVerified: true,
      isCorrected: false,
      aiObservation: {
        state: 'NOT_OBSERVED',
        extractedValue: null,
        normalizedValue: null,
        confidence: 'HIGH',
        evidenceImageIds: [],
        evidenceDescriptions: [],
      },
      ruleEngineResult: {
        outcome: 'POTENTIAL_VIOLATION',
        reason: 'Consumer care contact details missing',
        applicabilityExplanation: 'Retail packaged commodity',
        requiresInspectorReview: true,
        ruleDatabaseVersion: '1.0',
        amendmentVersion: null,
        evaluatedAt: new Date(),
      },
      inspectorVerification: {
        isVerified: true,
        decision: 'VERIFIED_NON_COMPLIANT',
        verifiedValue: 'ABSENT',
        originalAiValuePreserved: null,
        isCorrected: false,
        notes: 'Consumer care contact completely absent from packaging label',
        verifiedBy: testInspectorId1,
        verifiedByName: 'Inspector Rajesh Kumar',
        verifiedAt: new Date(),
      },
    });
    createdFindingIds.push(find2._id);

    console.log('[Setup] Test fixtures created successfully.\n');

    // ----------------------------------------------------
    // Test Suite 1: Single Consolidated Report Assembly
    // ----------------------------------------------------
    console.log('[Suite 1] Single Consolidated Multi-Sample Assembly:');

    const result = await ReportService.buildReportData(testInspectionId.toString(), inspector1Context);

    assert(result.forbidden === false, 'Owner inspector is authorized');
    assert(result.reportData !== null, 'Report DTO is generated');
    const dto = result.reportData!;

    assert(
      dto.metadata.inspectionNumber === inspection.inspectionNumber,
      'DTO contains matching inspection number'
    );
    assert(
      dto.metadata.packageContext === 'RETAIL_PACKAGE',
      'Statutory package context is RETAIL_PACKAGE (NO Single-Piece Retail Package)'
    );
    assert(
      dto.samples.length === 3,
      `Consolidates all 3 child samples in ONE single report (got ${dto.samples.length})`
    );

    // ----------------------------------------------------
    // Test Suite 2: Deterministic Sequence Ordering
    // ----------------------------------------------------
    console.log('\n[Suite 2] Deterministic Sample Sequence Ordering:');

    assert(
      dto.samples[0].sampleNumber === 1 && dto.samples[0].sampleCode === 'S01',
      'Child Sample #1 is positioned first'
    );
    assert(
      dto.samples[1].sampleNumber === 2 && dto.samples[1].sampleCode === 'S02',
      'Child Sample #2 is positioned second'
    );
    assert(
      dto.samples[2].sampleNumber === 3 && dto.samples[2].sampleCode === 'S03',
      'Child Sample #3 is positioned third'
    );

    // ----------------------------------------------------
    // Test Suite 3: Photographic Evidence Preservation & Lifecycle Handling
    // ----------------------------------------------------
    console.log('\n[Suite 3] Photographic Evidence & Storage Lifecycle Preservation:');

    const sample1Dto = dto.samples.find((s) => s.sampleCode === 'S01');
    assert(
      sample1Dto !== undefined && sample1Dto.images.length === 2,
      'Sample 1 contains both photographic evidence records'
    );

    if (sample1Dto) {
      const activeImg = sample1Dto.images.find((img) => img.fileName === 'front_panel.jpg');
      assert(
        activeImg !== undefined &&
          activeImg.availabilityState === 'AVAILABLE' &&
          activeImg.streamUrl !== null,
        'Existing disk image flagged as AVAILABLE with stream URL'
      );

      const purgedImg = sample1Dto.images.find((img) => img.fileName === 'purged_back_panel.jpg');
      assert(
        purgedImg !== undefined &&
          purgedImg.availabilityState === 'UNAVAILABLE_LIFECYCLE' &&
          purgedImg.streamUrl === null,
        'Missing disk image safely handled as UNAVAILABLE_LIFECYCLE without crashing'
      );
      assert(
        purgedImg !== undefined && purgedImg.sizeBytes === 2048 && purgedImg.mimeType === 'image/jpeg',
        'UNAVAILABLE_LIFECYCLE evidence preserves size (2048) and MIME (image/jpeg) metadata'
      );
    }

    // ----------------------------------------------------
    // Test Suite 4: 6-Pillar Architecture & Assistive Transparency
    // ----------------------------------------------------
    console.log('\n[Suite 4] 6-Pillar Separation & Assistive Transparency:');

    // Pillar 1: Inspection & Statutory Context Metadata
    assert(
      dto.metadata.commodity === 'Fortified Sunflower Cooking Oil 1L' &&
        dto.metadata.brand === 'SunPure Supreme' &&
        dto.metadata.location.includes('Bengaluru'),
      'Pillar 1: Metadata preserves commodity, brand, location, and statutory context'
    );

    // Pillar 2: Evidence array is isolated per sample
    assert(
      Array.isArray(dto.samples[0].images) && dto.samples[0].images.length === 2,
      'Pillar 2: Photographic package evidence is isolated per sample'
    );

    // Pillar 3: AI raw multimodal observations preserved
    const allFindings = dto.samples.flatMap((s) => s.findings);
    const rawAiFinding = allFindings.find((f) => f.ruleId === 'RULE-MRP-01');
    assert(
      rawAiFinding !== undefined && rawAiFinding.aiValue === 'Rs 195.00',
      'Pillar 3: AI multimodal observations preserved as assistive data'
    );

    // Pillar 4: Rule Engine version preserved
    assert(
      dto.systemIdentity.ruleDatabaseVersion === '1.0',
      'Pillar 4: Historical Rule Database Version (1.0) preserved in report system identity'
    );

    // Pillar 5: Officer corrections distinct side-by-side
    assert(
      rawAiFinding !== undefined &&
        rawAiFinding.isCorrected === true &&
        rawAiFinding.aiValue === 'Rs 195.00' &&
        rawAiFinding.verifiedValue === 'Rs. 195.00 (inclusive of all taxes)',
      'Pillar 5: Original AI value and Officer-corrected value preserved side-by-side'
    );

    // Pillar 6: Final officer determinations, statutory disclaimer, and cryptographic verification hash
    assert(
      dto.legalDisclaimer.includes('Legal Metrology (Packaged Commodities) Rules, 2011') &&
        dto.legalDisclaimer.includes('assistive'),
      'Pillar 6: Statutory disclaimer references Legal Metrology (Packaged Commodities) Rules, 2011 and assistive status'
    );
    assert(
      typeof dto.systemIdentity.verificationHash === 'string' &&
        dto.systemIdentity.verificationHash.length === 20,
      `Pillar 6: Cryptographic SHA-256 verification hash computed (${dto.systemIdentity.verificationHash})`
    );

    // ----------------------------------------------------
    // Test Suite 5: Zero Re-Evaluation & Zero Mutation
    // ----------------------------------------------------
    console.log('\n[Suite 5] Zero Re-Evaluation & Database Immutability:');

    const inspectionBefore = await Inspection.findById(testInspectionId);
    const updatedBefore = inspectionBefore?.updatedAt?.getTime();

    // Call ReportService a second time
    const result2 = await ReportService.buildReportData(testInspectionId.toString(), inspector1Context);

    const inspectionAfter = await Inspection.findById(testInspectionId);
    const updatedAfter = inspectionAfter?.updatedAt?.getTime();

    assert(
      updatedBefore === updatedAfter,
      'Report generation strictly read-only: does not mutate inspection document'
    );
    assert(
      result2.reportData?.systemIdentity.verificationHash === dto.systemIdentity.verificationHash,
      'Deterministic synthesis: repeated calls yield identical verification hash'
    );

    // ----------------------------------------------------
    // Test Suite 6: Role-Based Access Control (RBAC)
    // ----------------------------------------------------
    console.log('\n[Suite 6] Role-Based Access Control (RBAC):');

    // Inspector 2 tries to access Inspector 1's inspection
    const unauthorizedResult = await ReportService.buildReportData(
      testInspectionId.toString(),
      inspector2Context
    );
    assert(
      unauthorizedResult.forbidden === true && unauthorizedResult.reportData === null,
      'Inspector 2 cannot access Inspector 1 report (403 Forbidden)'
    );

    // Assistant Controller accesses Inspector 1's inspection
    const controllerResult = await ReportService.buildReportData(
      testInspectionId.toString(),
      controllerContext
    );
    assert(
      controllerResult.forbidden === false && controllerResult.reportData !== null,
      'Assistant Controller has supervisory access to view any inspection report'
    );

    // ----------------------------------------------------
    // Test Suite 7: Sensitive Data Sanitization
    // ----------------------------------------------------
    console.log('\n[Suite 7] Sensitive Data Sanitization:');

    const serialized = JSON.stringify(dto);
    assert(
      !serialized.includes('password') &&
        !serialized.includes('token') &&
        !serialized.includes('mongodb+srv://') &&
        !serialized.includes('SECRET'),
      'Report payload contains zero credentials, hashed passwords, or connection strings'
    );

  } finally {
    // ----------------------------------------------------
    // Teardown
    // ----------------------------------------------------
    console.log('\n[Teardown] Cleaning up test fixtures...');
    if (testInspectionId!) await Inspection.findByIdAndDelete(testInspectionId);
    for (const sid of createdSampleIds) await Sample.findByIdAndDelete(sid);
    for (const fid of createdFindingIds) await ComplianceFinding.findByIdAndDelete(fid).catch(() => {});
    for (const xid of createdExtractionIds) await AIExtraction.findByIdAndDelete(xid);
    for (const eid of createdEvaluationIds) await RuleEvaluation.findByIdAndDelete(eid);

    if (fs.existsSync(realImagePath)) fs.unlinkSync(realImagePath);

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
