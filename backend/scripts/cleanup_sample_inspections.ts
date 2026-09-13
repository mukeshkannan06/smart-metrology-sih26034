import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Inspection, Sample, ComplianceFinding, RuleEvaluation, AIExtraction, AuditEvent } from '../src/models';

async function cleanup() {
  await connectDatabase();

  const allInspections = await Inspection.find().select('inspectionNumber commodity inspectorId status createdAt').sort({ createdAt: 1 });
  console.log(`Total inspections in DB: ${allInspections.length}`);

  const originalNumbers = ['INS-2026-001', 'INS-2026-002', 'INS-2026-003', 'INS-2026-004', 'INS-2026-005', 'INS-2026-006'];

  const toRemove = allInspections.filter(i => !originalNumbers.includes(i.inspectionNumber));
  console.log(`Inspections to remove: ${toRemove.length}`);

  for (const insp of toRemove) {
    console.log(`  Removing: ${insp.inspectionNumber} - ${insp.commodity} (${insp.status})`);
    const inspectionId = insp._id;
    await Sample.deleteMany({ inspectionId });
    await ComplianceFinding.deleteMany({ inspectionId });
    await RuleEvaluation.deleteMany({ inspectionId });
    await AIExtraction.deleteMany({ inspectionId });
    await AuditEvent.deleteMany({ inspectionId });
    await Inspection.findByIdAndDelete(inspectionId);
  }

  const remaining = await Inspection.find().select('inspectionNumber commodity inspectorId status').sort({ createdAt: 1 });
  console.log('\nRemaining seeded inspections in DB:');
  for (const r of remaining) {
    console.log(`  ${r.inspectionNumber}: ${r.commodity} [Inspector: ${r.inspectorId}] (Status: ${r.status})`);
  }

  await disconnectDatabase();
}

cleanup().catch(err => {
  console.error(err);
  process.exit(1);
});

