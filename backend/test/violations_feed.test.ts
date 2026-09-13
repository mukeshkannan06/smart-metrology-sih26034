import mongoose from 'mongoose';
import { FindingService } from '../src/services/finding.service';
import { UserRole } from '../src/models';
import { connectDatabase, disconnectDatabase } from '../src/config/database';

async function testViolationsFeed() {
  console.log('Testing Inspector Violations Live Query...');
  await connectDatabase();

  const inspections = await mongoose.model('Inspection').find().select('inspectorId inspectionNumber').lean();
  console.log(`Available inspections in DB: ${inspections.length}`);
  const firstInsp = inspections[0];
  if (firstInsp) {
    console.log(`Testing with Inspector ID: ${firstInsp.inspectorId}`);
    const results = await FindingService.getViolations({
      id: String(firstInsp.inspectorId),
      inspectorId: String(firstInsp.inspectorId),
      role: UserRole.INSPECTOR,
      name: 'Field Inspector',
    });
    console.log(`✅ SUCCESS: Retrieved ${results.length} infraction/violation records for Inspector ${firstInsp.inspectorId}:`);
    results.slice(0, 5).forEach((r) => {
      console.log(`  - [${r.status}] Case: ${r.inspectionNumber} | Unit: ${r.sampleCode} | Rule: ${r.ruleReference} | Commodity: ${r.commodity}`);
    });
  }

  await disconnectDatabase();
}

testViolationsFeed().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
