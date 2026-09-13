import assert from 'assert';
import mongoose from 'mongoose';
import { Inspection, Sample, InspectionStatus, PackageContext, UserRole } from '../src/models';
import { InspectionService } from '../src/services/inspection.service';
import { getInspectorDashboardData } from '../src/services/dashboard.service';
import { connectDatabase, disconnectDatabase } from '../src/config/database';

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING OPTION B: INSPECTION FINALIZATION WORKFLOW');
  console.log('====================================================\n');

  await connectDatabase();

  const inspectorA = {
    id: 'test-inspector-a-id',
    inspectorId: 'INS-TEST-A',
    role: UserRole.INSPECTOR,
    name: 'Inspector Alpha',
  };

  const inspectorB = {
    id: 'test-inspector-b-id',
    inspectorId: 'INS-TEST-B',
    role: UserRole.INSPECTOR,
    name: 'Inspector Beta',
  };

  let testInspectionId = '';

  try {
    // 1. Setup initial Dashboard metrics check
    const initialDashboard = await getInspectorDashboardData(inspectorA.inspectorId, inspectorA.id);
    const initialCompleted = initialDashboard.summary.completed;
    console.log(`[Setup] Initial completed inspections for Inspector A: ${initialCompleted}`);

    // 2. Create a new inspection with 2 planned samples
    const inspection = await InspectionService.createInspection(
      {
        commodity: 'Option B Test Biscuits',
        packageContext: PackageContext.RETAIL_PACKAGE,
        location: 'Test Supermarket, Chennai',
        samplesCount: 2,
      },
      inspectorA
    );
    testInspectionId = inspection._id.toString();
    console.log(`[Suite 1] Created case ${inspection.inspectionNumber} with status ${inspection.status}`);
    assert.strictEqual(inspection.status, InspectionStatus.READY_FOR_SAMPLING);

    // 3. Test: Cannot finalize when 0 of 2 samples exist (HTTP 400)
    try {
      await InspectionService.finalizeInspection(testInspectionId, inspectorA);
      assert.fail('Should have rejected finalization when samplesCount < planned');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
      console.log('  ✓ PASS: Rejects finalization when sample target is incomplete (0/2 samples)');
    }

    // 4. Create Sample 1
    const s1 = new Sample({
      inspectionId: inspection._id,
      sampleNumber: 1,
      sampleCode: `${inspection.inspectionNumber}-S01`,
      status: 'PENDING',
    });
    await s1.save();

    // 5. Test: Cannot finalize when only 1 of 2 samples exists (HTTP 400)
    try {
      await InspectionService.finalizeInspection(testInspectionId, inspectorA);
      assert.fail('Should have rejected finalization when 1/2 samples exist');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 400);
      console.log('  ✓ PASS: Rejects finalization when sample target is incomplete (1/2 samples)');
    }

    // 6. Test: Cross-Inspector authorization rejection (HTTP 403)
    try {
      await InspectionService.finalizeInspection(testInspectionId, inspectorB);
      assert.fail('Should have rejected cross-inspector finalization with 403');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      console.log('  ✓ PASS: Cross-inspector finalization attempt rejected with HTTP 403');
    }

    // 7. Create Sample 2 (Satisfying the 2/2 target scope)
    const s2 = new Sample({
      inspectionId: inspection._id,
      sampleNumber: 2,
      sampleCode: `${inspection.inspectionNumber}-S02`,
      status: 'VERIFIED',
    });
    await s2.save();
    console.log('  ✓ [Setup] Created Sample 2 of 2 (100% target scope satisfied)');

    // 8. Test: Formally finalize inspection case
    const finalizeRes = await InspectionService.finalizeInspection(
      testInspectionId,
      inspectorA,
      'Physical package labels attested per Legal Metrology Rules.'
    );
    assert.strictEqual(finalizeRes.inspection.status, InspectionStatus.COMPLETED);
    assert.ok(finalizeRes.inspection.remarks?.includes('Final Attestation'));
    console.log(`  ✓ PASS: Successfully finalized case with status ${finalizeRes.inspection.status}`);

    // 9. Test: Dashboard KPI immediately increments completed count!
    const updatedDashboard = await getInspectorDashboardData(inspectorA.inspectorId, inspectorA.id);
    const updatedCompleted = updatedDashboard.summary.completed;
    console.log(`  ✓ [Dashboard Check] Completed count before: ${initialCompleted}, after: ${updatedCompleted}`);
    assert.strictEqual(updatedCompleted, initialCompleted + 1, 'Dashboard completed counter must increment by 1');
    console.log('  ✓ PASS: Dashboard completed counter successfully incremented!');

    // 10. Test: Safe idempotency (calling finalize on already completed case returns cleanly)
    const idempotentRes = await InspectionService.finalizeInspection(testInspectionId, inspectorA);
    assert.strictEqual(idempotentRes.inspection.status, InspectionStatus.COMPLETED);
    console.log('  ✓ PASS: Finalize call is safely idempotent on completed cases');

    console.log('\n====================================================');
    console.log('  ALL OPTION B TESTS PASSED (100% SUCCESS)');
    console.log('====================================================\n');
  } finally {
    // Teardown test artifacts
    if (testInspectionId) {
      await Sample.deleteMany({ inspectionId: testInspectionId });
      await Inspection.findByIdAndDelete(testInspectionId);
      console.log('[Teardown] Test fixtures cleaned up successfully.');
    }
    await disconnectDatabase();
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

