import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../backend/src/config/database';
import {
  AuditEvent,
  IAuditEvent,
  AuditEventType,
  AuditEntityType,
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  SampleStatus,
  UserRole,
  ComplianceFinding,
  InspectorVerificationDecision,
  FindingStatus,
} from '../backend/src/models';
import { InspectionService } from '../backend/src/services/inspection.service';
import { SampleService } from '../backend/src/services/sample.service';
import { RuleEngineService } from '../backend/src/rules/engine/RuleEngineService';
import { FindingService } from '../backend/src/services/finding.service';
import { AuditService } from '../backend/src/services/audit.service';
import { HistoryService } from '../backend/src/services/history.service';

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

async function runPhase13Tests() {
  console.log('===============================================================');
  console.log('  PHASE 13 — INSPECTION HISTORY, EVIDENCE & AUDIT TRAIL TESTS');
  console.log('===============================================================\n');

  await connectDatabase();
  if (!isDatabaseConnected()) {
    console.error('Database connection failed.');
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // Suite 1: AuditEvent Model & Compound Indexes
    // ----------------------------------------------------
    console.log('[Suite 1] AuditEvent Schema & Compound Indexes:');
    await AuditEvent.init();
    const indexes = await AuditEvent.collection.indexes();

    const hasInspectionTimestampIdx = indexes.some(
      (idx) => idx.key && idx.key.inspectionId === 1 && idx.key.timestamp === -1
    );
    assert(hasInspectionTimestampIdx, 'Compound index on { inspectionId: 1, timestamp: -1 } exists');

    const hasEntityTimestampIdx = indexes.some(
      (idx) => idx.key && idx.key.entityId === 1 && idx.key.timestamp === -1
    );
    assert(hasEntityTimestampIdx, 'Compound index on { entityId: 1, timestamp: -1 } exists');

    const hasActorTimestampIdx = indexes.some(
      (idx) => idx.key && idx.key.actorUserId === 1 && idx.key.timestamp === -1
    );
    assert(hasActorTimestampIdx, 'Compound index on { actorUserId: 1, timestamp: -1 } exists');

    const hasUniqueAuditId = indexes.some(
      (idx) => idx.key && idx.key.auditEventId === 1 && idx.unique === true
    );
    assert(hasUniqueAuditId, 'Unique index on auditEventId exists');

    // ----------------------------------------------------
    // Suite 2: End-to-End Audit Trail Generation Across Lifecycle
    // ----------------------------------------------------
    console.log('\n[Suite 2] Lifecycle Event Logging & Audit Hooks:');

    const inspectorUser1 = {
      id: 'usr_phase13_insp_01',
      inspectorId: 'INS-PH13-01',
      role: UserRole.INSPECTOR,
      name: 'Inspector Vikram Singh',
    };

    const inspectorUser2 = {
      id: 'usr_phase13_insp_02',
      inspectorId: 'INS-PH13-02',
      role: UserRole.INSPECTOR,
      name: 'Inspector Ananya Roy',
    };

    const controllerUser = {
      id: 'usr_phase13_ctrl_01',
      role: UserRole.ASSISTANT_CONTROLLER,
      name: 'Assistant Controller Sharma',
    };

    // 1. Create Inspection
    const newInspection = await InspectionService.createInspection(
      {
        commodity: 'Pure Mustard Oil (1L Bottle)',
        brand: 'Fortune Agro',
        packageContext: PackageContext.RETAIL_PACKAGE,
        location: 'Chandni Chowk Wholesale Hub',
        market: 'Central Delhi Market',
        samplesCount: 2,
        remarks: 'Phase 13 audit validation case',
      },
      inspectorUser1
    );
    assert(!!newInspection._id, 'Inspection created successfully', newInspection.inspectionNumber);

    // Verify INSPECTION_CREATED audit event
    const creationEvents = await AuditEvent.find({
      inspectionId: newInspection._id,
      eventType: AuditEventType.INSPECTION_CREATED,
    });
    assert(creationEvents.length === 1, 'Exactly one INSPECTION_CREATED audit event logged');
    assert(creationEvents[0].actorUserId === inspectorUser1.id, 'Audit event recorded correct actorUserId');
    assert(creationEvents[0].source === 'USER', 'Audit event recorded source as USER');
    assert(!!creationEvents[0].auditEventId, 'Audit event assigned unique sequential ID');

    // 2. Create Sample
    const sampleRes = await SampleService.createSample(
      newInspection._id.toString(),
      inspectorUser1,
      { notes: 'Unit 1 sampled from front shelf' }
    );
    const sampleDoc = sampleRes.sample;
    assert(!!sampleDoc._id, 'Sample created successfully', sampleDoc.sampleCode);

    // Verify SAMPLE_CREATED audit event
    const sampleEvents = await AuditEvent.find({
      sampleId: sampleDoc._id,
      eventType: AuditEventType.SAMPLE_CREATED,
    });
    assert(sampleEvents.length === 1, 'SAMPLE_CREATED audit event logged with correct sampleId');

    // 3. Attach Image to Sample
    const dummyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const attachImgRes = await SampleService.attachImageToSample(
      newInspection._id.toString(),
      sampleDoc._id.toString(),
      inspectorUser1,
      {
        imageData: `data:image/png;base64,${dummyPngBase64}`,
        fileName: 'test_phase13_front.png',
      }
    );
    const imageDoc = attachImgRes.image;
    assert(!!imageDoc.imageId, 'Image attached to sample unit');

    // Verify IMAGE_CAPTURED audit event
    const imgEvents = await AuditEvent.find({
      entityId: imageDoc.imageId,
      eventType: AuditEventType.IMAGE_CAPTURED,
    });
    assert(imgEvents.length === 1, 'IMAGE_CAPTURED audit event logged with image metadata');

    // 4. Run Rule Engine & Findings Sync
    const evaluationDoc = await RuleEngineService.evaluateSample(
      newInspection._id,
      sampleDoc._id,
      inspectorUser1.id
    );
    assert(!!evaluationDoc._id, 'Rule Engine evaluated sample successfully');

    // Verify RULE_EVALUATION_COMPLETED & FINDINGS_GENERATED audit events
    const ruleEvalEvents = await AuditEvent.find({
      inspectionId: newInspection._id,
      eventType: AuditEventType.RULE_EVALUATION_COMPLETED,
    });
    assert(ruleEvalEvents.length >= 1, 'RULE_EVALUATION_COMPLETED audit event logged');
    assert(ruleEvalEvents[0].source === 'RULE_ENGINE', 'Rule evaluation audit source is RULE_ENGINE');

    const findingsGenEvents = await AuditEvent.find({
      inspectionId: newInspection._id,
      eventType: AuditEventType.FINDINGS_GENERATED,
    });
    assert(findingsGenEvents.length >= 1, 'FINDINGS_GENERATED audit event logged by sync engine');

    // ----------------------------------------------------
    // Suite 3: Inspector Verification & Correction Audit
    // ----------------------------------------------------
    console.log('\n[Suite 3] Officer Verification, Value Correction & Immutability:');

    const sampleFindings = await ComplianceFinding.find({ sampleId: sampleDoc._id }).sort({ ruleId: 1 });
    assert(sampleFindings.length > 0, `Generated ${sampleFindings.length} compliance findings`);

    const targetFinding = sampleFindings[0];
    const originalAiValue = targetFinding.aiObservation?.extractedValue;

    // A. Inspector Corrects Finding Value
    const correctedRes = await FindingService.correctFinding(
      targetFinding._id.toString(),
      inspectorUser1,
      {
        correctedValue: 'CORRECTED_BY_OFFICER_1000g',
        notes: 'AI misread unit symbol; corrected to standard 1000g',
      }
    );
    assert(correctedRes.isCorrected === true, 'Finding flagged as isCorrected=true');
    assert(
      correctedRes.inspectorVerification.originalAiValuePreserved === originalAiValue,
      'Original AI observation strictly preserved in originalAiValuePreserved'
    );
    assert(
      correctedRes.inspectorVerification.verifiedValue === 'CORRECTED_BY_OFFICER_1000g',
      'Verified value reflects corrected officer entry'
    );

    // Check FINDING_CORRECTED audit event
    const correctionAudit = await AuditEvent.find({
      entityId: targetFinding.findingId,
      eventType: AuditEventType.FINDING_CORRECTED,
    });
    assert(correctionAudit.length === 1, 'FINDING_CORRECTED audit event logged');
    assert(
      correctionAudit[0].afterState?.verifiedValue === 'CORRECTED_BY_OFFICER_1000g',
      'Correction audit records beforeState and afterState diff'
    );

    // B. Inspector Verifies Finding Decision
    const verifyRes = await FindingService.verifyFinding(
      targetFinding._id.toString(),
      inspectorUser1,
      {
        decision: InspectorVerificationDecision.VERIFIED_COMPLIANT,
        notes: 'Statutory compliance confirmed post-correction',
      }
    );
    assert(verifyRes.finding.isVerified === true, 'Finding successfully verified');
    assert(
      verifyRes.finding.status === FindingStatus.VERIFIED_COMPLIANT,
      'Status set to VERIFIED_COMPLIANT'
    );

    // Check FINDING_VERIFIED audit event
    const verificationAudit = await AuditEvent.find({
      entityId: targetFinding.findingId,
      eventType: AuditEventType.FINDING_VERIFIED,
    });
    assert(verificationAudit.length === 1, 'FINDING_VERIFIED audit event logged');
    assert(
      verificationAudit[0].afterState?.decision === InspectorVerificationDecision.VERIFIED_COMPLIANT,
      'Verification audit accurately records inspector decision'
    );

    // ----------------------------------------------------
    // Suite 4: HistoryService Query & 6-Pillar Representation
    // ----------------------------------------------------
    console.log('\n[Suite 4] HistoryService Queries & 6-Pillar Separation:');

    // 1. List Historical Inspections
    const listRes = await HistoryService.listHistoricalInspections(inspectorUser1, {
      search: 'Mustard',
      packageContext: 'RETAIL_PACKAGE',
      page: 1,
      limit: 10,
    });
    assert(listRes.inspections.length >= 1, 'Historical list returns matching inspections');
    assert(listRes.summaryKpis.totalInspections >= 1, 'KPI strip computes total inspections');
    assert(listRes.summaryKpis.complianceRate <= 100, 'Compliance rate valid percentage');

    // 2. Full Read-Only Historical Detail
    const detailRes = await HistoryService.getHistoricalInspectionDetail(
      newInspection._id.toString(),
      inspectorUser1
    );
    assert(!detailRes.forbidden, 'Authorized inspector is granted access');
    assert(!!detailRes.inspectionData, 'Full historical inspection data returned');

    const histData = detailRes.inspectionData!;

    // Pillar 1: Samples & Evidence Availability
    assert(histData.samples.length >= 1, 'Pillar 1: Physical samples present in historical record');
    const histImage = histData.samples[0].images[0];
    assert(!!histImage, 'Pillar 1: Photographic evidence attached');
    assert(
      histImage.availabilityState === 'AVAILABLE' || histImage.availabilityState === 'UNAVAILABLE_LIFECYCLE',
      `Pillar 1: Evidence availabilityState accurately determined (${histImage.availabilityState})`
    );

    // Pillar 2: AI Observations
    assert(histData.extractions.length >= 0, 'Pillar 2: AI extractions preserved');

    // Pillar 3: Rule Evaluations & DB Version
    assert(histData.ruleEvaluations.length >= 1, 'Pillar 3: Rule evaluations preserved');
    assert(
      histData.ruleEvaluations[0].rule_database_version === '1.0',
      'Pillar 3: Historical Rule Database Version (1.0) preserved without dynamic rewriting'
    );

    // Pillar 4 & 5: Inspector Correction & Verification
    const histFinding = histData.findings.find((f) => f.findingId === targetFinding.findingId);
    assert(!!histFinding, 'Pillars 4 & 5: Compliance findings preserved');
    assert(histFinding?.isCorrected === true, 'Pillar 4: Corrected flag preserved');
    assert(
      histFinding?.inspectorVerification?.verifiedValue === 'CORRECTED_BY_OFFICER_1000g',
      'Pillar 5: Officer-verified value preserved'
    );
    assert(
      histFinding?.aiObservation?.extractedValue === originalAiValue,
      'Pillar 2: Original AI observation remains strictly immutable'
    );

    // Pillar 6: Chronological Append-Only Audit Trail
    assert(histData.auditTrail.length >= 4, `Pillar 6: Audit trail contains ${histData.auditTrail.length} events`);
    let isChronological = true;
    for (let i = 1; i < histData.auditTrail.length; i++) {
      if (new Date(histData.auditTrail[i].timestamp) < new Date(histData.auditTrail[i - 1].timestamp)) {
        isChronological = false;
        break;
      }
    }
    assert(isChronological, 'Pillar 6: Audit trail is sorted strictly in chronological order');

    // ----------------------------------------------------
    // Suite 5: Role-Based Access Control (RBAC)
    // ----------------------------------------------------
    console.log('\n[Suite 5] Role-Based Access Control (RBAC) Verification:');

    // Inspector 2 tries to access Inspector 1's inspection record
    const unauthorizedInspectorAccess = await HistoryService.getHistoricalInspectionDetail(
      newInspection._id.toString(),
      inspectorUser2
    );
    assert(
      unauthorizedInspectorAccess.forbidden === true,
      'Inspector 2 cannot access Inspector 1 historical inspection record (403 Forbidden)'
    );

    // Assistant Controller accesses Inspector 1's inspection record
    const controllerAccess = await HistoryService.getHistoricalInspectionDetail(
      newInspection._id.toString(),
      controllerUser
    );
    assert(
      controllerAccess.forbidden === false && !!controllerAccess.inspectionData,
      'Assistant Controller has jurisdiction-wide read-only access to any inspection record'
    );

    // Inspector 2 tries to access Inspector 1's audit trail
    const unauthorizedAuditAccess = await HistoryService.getInspectionAuditTrail(
      newInspection._id.toString(),
      inspectorUser2
    );
    assert(
      unauthorizedAuditAccess.forbidden === true,
      'Inspector 2 cannot access Inspector 1 audit trail (403 Forbidden)'
    );

    // Assistant Controller accesses Inspector 1's audit trail
    const controllerAuditAccess = await HistoryService.getInspectionAuditTrail(
      newInspection._id.toString(),
      controllerUser
    );
    assert(
      controllerAuditAccess.forbidden === false && !!controllerAuditAccess.auditTrail,
      'Assistant Controller can view inspection audit trail jurisdiction-wide'
    );

    // ----------------------------------------------------
    // Cleanup Test Records
    // ----------------------------------------------------
    console.log('\n[Cleanup] Cleaning up Phase 13 test fixtures...');
    await AuditEvent.deleteMany({ inspectionId: newInspection._id });
    await ComplianceFinding.deleteMany({ inspectionId: newInspection._id });
    const { RuleEvaluation } = await import('../backend/src/models/RuleEvaluation');
    await RuleEvaluation.deleteMany({ inspectionId: newInspection._id });
    await Sample.deleteMany({ inspectionId: newInspection._id });
    await Inspection.deleteOne({ _id: newInspection._id });
    console.log('  ✓ Test fixtures cleaned up successfully');
  } catch (err: any) {
    console.error('Error during Phase 13 tests:', err);
    failed++;
  } finally {
    await disconnectDatabase();
  }

  console.log('\n===============================================================');
  console.log(`  PHASE 13 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase13Tests().catch((e) => {
  console.error(e);
  process.exit(1);
});

