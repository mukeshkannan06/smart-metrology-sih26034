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
  Rule,
  RuleStatus,
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
    // ----------------------------------------------------
    console.log('\n[4/4] Seeding Core LMPC Statutory Rules...');
    const statutoryRules = [
      {
        ruleId: 'LMPC-R06-1-A',
        ruleReference: 'Rule 6(1)(a)',
        declarationType: 'NAME_AND_ADDRESS',
        requirementDescription: 'Name and complete address of the manufacturer, or packer, or importer.',
        packageContext: ['RETAIL_PACKAGE', 'WHOLESALE_PACKAGE', 'IMPORTED_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(a)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-B',
        ruleReference: 'Rule 6(1)(b)',
        declarationType: 'COMMON_GENERIC_NAME',
        requirementDescription: 'Common or generic name of the commodity contained in the package.',
        packageContext: ['RETAIL_PACKAGE', 'WHOLESALE_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(b)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-C',
        ruleReference: 'Rule 6(1)(c)',
        declarationType: 'NET_QUANTITY',
        requirementDescription: 'Net quantity in terms of standard unit of weight, measure or number.',
        packageContext: ['RETAIL_PACKAGE', 'WHOLESALE_PACKAGE', 'SINGLE_PIECE_RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(c)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-D',
        ruleReference: 'Rule 6(1)(d)',
        declarationType: 'MONTH_YEAR_OF_MANUFACTURE',
        requirementDescription: 'Month and year in which the commodity is manufactured or pre-packed or imported.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(d)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-DA',
        ruleReference: 'Rule 6(1)(da)',
        declarationType: 'BEST_BEFORE_EXPIRY',
        requirementDescription: 'Best before or use by date, month and year for commodities which may become unfit for consumption.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: false,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(da)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-E',
        ruleReference: 'Rule 6(1)(e)',
        declarationType: 'MRP',
        requirementDescription: 'Maximum retail price (MRP) inclusive of all taxes.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(e)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-EA',
        ruleReference: 'Rule 6(1)(ea)',
        declarationType: 'UNIT_SALE_PRICE',
        requirementDescription: 'Unit sale price (USP) in rupees per gram, kilogram, litre, or meter.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(ea)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-F',
        ruleReference: 'Rule 6(1)(f)',
        declarationType: 'CONSUMER_CARE',
        requirementDescription: 'Name, address, telephone number and email address of person or office to be contacted for consumer complaints.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(f)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R06-1-G',
        ruleReference: 'Rule 6(1)(g)',
        declarationType: 'COUNTRY_OF_ORIGIN',
        requirementDescription: 'Country of origin where the commodity is manufactured or produced.',
        packageContext: ['RETAIL_PACKAGE', 'IMPORTED_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 6(1)(g)',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
      {
        ruleId: 'LMPC-R07',
        ruleReference: 'Rule 7',
        declarationType: 'FONT_SIZE_AND_PROMINENCE',
        requirementDescription: 'Declarations must be prominent, legible, and satisfy minimum font size standards relative to Principal Display Panel area.',
        packageContext: ['RETAIL_PACKAGE'],
        mandatoryStatus: true,
        sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
        sourceSection: 'Rule 7 & Table 1',
        version: '2011.1',
        status: RuleStatus.ACTIVE,
      },
    ];

    for (const ruleData of statutoryRules) {
      await Rule.findOneAndUpdate(
        { ruleId: ruleData.ruleId },
        { $set: ruleData },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`  ✓ Rule ${ruleData.ruleReference}: ${ruleData.declarationType}`);
    }

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

