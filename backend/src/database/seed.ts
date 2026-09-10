import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database';
import {
  User,
  UserRole,
  UserStatus,
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  SampleStatus,
} from '../models';

/**
 * SMART METROLOGY — SIH26034
 * Phase 4 & Phase 5 Standalone Database Seed Script
 * 
 * Usage:
 *   npm run seed
 * 
 * Note: This script is strictly on-demand. It never runs automatically during server boot.
 */
async function runSeed(): Promise<void> {
  console.log('====================================================');
  console.log('  SMART METROLOGY — SIH26034 DATABASE SEED');
  console.log('  Phase 5: Populating Synthetic Demo Users & Base Data');
  console.log('====================================================');

  const connected = await connectDatabase();
  if (!connected || !isDatabaseConnected()) {
    console.error('❌ [SEED] Cannot seed: MongoDB Atlas is not connected.');
    console.error('👉 [SEED] Please configure MONGODB_URI in backend/.env.');
    console.error('👉 [SEED] See docs/mongodb-atlas-setup.md for setup instructions.');
    process.exit(1);
  }

  try {
    // ----------------------------------------------------
    // 1. Demo Users (Hashed with bcryptjs)
    // ----------------------------------------------------
    console.log('\n[1/4] Seeding Synthetic Demo Users with Hashed Credentials...');
    // Purge any legacy demo users missing username field
    await User.deleteMany({ $or: [{ username: { $exists: false } }, { username: null }] });

    const inspectorPasswordHash = await bcrypt.hash('Insp@2026!', 10);
    const controllerPasswordHash = await bcrypt.hash('Admin@2026!', 10);

    const demoUsers = [
      {
        username: 'inspector1',
        name: 'Rajesh Kumar',
        passwordHash: inspectorPasswordHash,
        role: UserRole.INSPECTOR,
        inspectorId: 'INS-DEL-01',
        status: UserStatus.ACTIVE,
        isDemo: true,
      },
      {
        username: 'inspector2',
        name: 'Priya Sharma',
        passwordHash: inspectorPasswordHash,
        role: UserRole.INSPECTOR,
        inspectorId: 'INS-DEL-02',
        status: UserStatus.ACTIVE,
        isDemo: true,
      },
      {
        username: 'controller',
        name: 'Dr. Vikram Singh',
        passwordHash: controllerPasswordHash,
        role: UserRole.ASSISTANT_CONTROLLER,
        inspectorId: 'AC-HQ-01',
        status: UserStatus.ACTIVE,
        isDemo: true,
      },
    ];

    for (const userData of demoUsers) {
      await User.findOneAndUpdate(
        { username: userData.username },
        { $set: userData },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`  ✓ Demo User: ${userData.name} (@${userData.username}, ${userData.role}, ID: ${userData.inspectorId})`);
    }

    // ----------------------------------------------------
    // 2. Demo Inspections (for inspector1, leaving inspector2 at 0)
    // ----------------------------------------------------
    console.log('\n[2/4] Seeding Sample Inspections for Rajesh Kumar (inspector1)...');
    const demoInspections = [
      {
        inspectionNumber: 'INS-2026-001',
        inspectorId: 'INS-DEL-01',
        commodity: 'Packaged Wheat Flour (Atta)',
        brand: 'Nature Harvest',
        packageContext: PackageContext.RETAIL_PACKAGE,
        location: 'Delhi Retail Mart, Connaught Place',
        market: 'Central Market',
        samplesCount: 5,
        status: InspectionStatus.IN_PROGRESS,
        remarks: 'Routine legal metrology retail compliance check under LMPC Rules 2011',
      },
      {
        inspectionNumber: 'INS-2026-002',
        inspectorId: 'INS-DEL-01',
        commodity: 'Pure Desi Cow Ghee (1L Pet Jar)',
        brand: 'Vedic Farms',
        packageContext: PackageContext.RETAIL_PACKAGE,
        location: 'Chandni Chowk Commercial Market, Delhi',
        market: 'North Delhi Hub',
        samplesCount: 3,
        status: InspectionStatus.COMPLETED,
        remarks: 'Statutory compliance verification completed under Rule 6 declarations',
      },
    ];

    for (const inspData of demoInspections) {
      const inspection = await Inspection.findOneAndUpdate(
        { inspectionNumber: inspData.inspectionNumber },
        { $set: inspData },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`  ✓ Demo Inspection: ${inspection.inspectionNumber} (${inspection.commodity}) - ${inspection.status}`);

      // Seed samples for this inspection
      for (let i = 1; i <= inspData.samplesCount; i++) {
        const sampleData = {
          inspectionId: inspection._id,
          sampleNumber: i,
          sampleCode: `${inspection.inspectionNumber}-S${String(i).padStart(2, '0')}`,
          status: inspData.status === InspectionStatus.COMPLETED ? SampleStatus.VERIFIED : SampleStatus.PENDING,
          notes: `Sample #${i}: Package seal intact, principal display panel examined for ${inspData.commodity}`,
        };

        await Sample.findOneAndUpdate(
          { inspectionId: inspection._id, sampleNumber: i },
          { $set: sampleData },
          { upsert: true, returnDocument: 'after' }
        );
      }
      console.log(`    ✓ ${inspData.samplesCount} child samples linked to ${inspection.inspectionNumber}`);
    }

    // ----------------------------------------------------
    // 4. Core Legal Metrology Rules (LMPC Rules 2011)
    // 4. Core Legal Metrology Rules (Authoritative LMPC Database v1.0)
    // ----------------------------------------------------
    console.log('\n[4/4] Ingesting Authoritative LMPC Rule Database v1.0 (33 rules)...');
    const { seedAuthoritativeRules } = await import('./seedRules');
    const ruleResult = await seedAuthoritativeRules();
    console.log(`    ✓ Authoritative Rule Database populated: ${ruleResult.total} rules verified.`);

    console.log('\n====================================================');
    console.log('✅ [SEED] Database seeded successfully!');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ [SEED] Error during seeding:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    console.log('[SEED] Database connection closed cleanly.');
  }
}

// Execute seed
runSeed().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});

