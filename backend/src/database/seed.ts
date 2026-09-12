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
  ComplianceFinding,
  FindingStatus,
  FindingCandidateStatus,
} from '../models';

/**
 * SMART METROLOGY — SIH26034
 * Phase 4, Phase 5 & Phase 15 Standalone Database Seed Script
 * 
 * Usage:
 *   npm run seed
 * 
 * Note: This script is strictly on-demand. It never runs automatically during server boot.
 */
async function runSeed(): Promise<void> {
  console.log('====================================================');
  console.log('  SMART METROLOGY — SIH26034 DATABASE SEED');
  console.log('  Phase 15: Enriching Synthetic Supervisory Telemetry');
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
    // 2. Demo Inspections across dates, contexts, and officers
    // ----------------------------------------------------
    console.log('\n[2/4] Seeding Multi-Context Supervisory Inspections...');

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

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
        createdAt: new Date(now - 14 * dayMs),
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
        createdAt: new Date(now - 10 * dayMs),
      },
      {
        inspectionNumber: 'INS-2026-003',
        inspectorId: 'INS-DEL-02',
        commodity: 'Refined Sunflower Oil (15L Tin)',
        brand: 'SunGold Agro',
        packageContext: PackageContext.WHOLESALE_PACKAGE,
        location: 'Azadpur Mandi Wholesale Terminal',
        market: 'Azadpur Wholesale Yard',
        samplesCount: 4,
        status: InspectionStatus.COMPLETED,
        remarks: 'Wholesale package inspection under Chapter III mandatory provisions',
        createdAt: new Date(now - 6 * dayMs),
      },
      {
        inspectionNumber: 'INS-2026-004',
        inspectorId: 'INS-DEL-02',
        commodity: 'California Roasted Almonds (500g)',
        brand: 'NutriBites Global',
        packageContext: PackageContext.IMPORTED_PACKAGE,
        location: 'IGI Airport Cargo Complex Air-Side Warehouse',
        market: 'Airport Commercial Free-Zone',
        samplesCount: 3,
        status: InspectionStatus.COMPLETED,
        remarks: 'Imported commodity inspection under Rule 6(1)(da) & Rule 24',
        createdAt: new Date(now - 3 * dayMs),
      },
      {
        inspectionNumber: 'INS-2026-005',
        inspectorId: 'INS-DEL-01',
        commodity: 'Industrial Cleaning Compound (25kg Drum)',
        brand: 'ChemClean Pro',
        packageContext: PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE,
        location: 'Okhla Industrial Area Phase-III',
        market: 'South Delhi Manufacturing Cluster',
        samplesCount: 2,
        status: InspectionStatus.COMPLETED,
        remarks: 'Institutional packaging inspection under Rule 26 exemptions',
        createdAt: new Date(now - 1 * dayMs),
      },
      {
        inspectionNumber: 'INS-2026-006',
        inspectorId: 'INS-DEL-02',
        commodity: 'Premium Basmati Rice (5kg Bag)',
        brand: 'Royal Kohinoor',
        packageContext: PackageContext.RETAIL_PACKAGE,
        location: 'INA Supermarket, South Delhi',
        market: 'South Delhi Supermart',
        samplesCount: 3,
        status: InspectionStatus.IN_PROGRESS,
        remarks: 'Surveillance check on net quantity declaration accuracy',
        createdAt: new Date(now),
      },
    ];

    for (const inspData of demoInspections) {
      const inspection = await Inspection.findOneAndUpdate(
        { inspectionNumber: inspData.inspectionNumber },
        { $set: inspData },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`  ✓ Demo Inspection: ${inspection.inspectionNumber} (${inspection.commodity}) - ${inspection.status}`);

      // Seed child samples
      for (let i = 1; i <= inspData.samplesCount; i++) {
        const sampleData = {
          inspectionId: inspection._id,
          sampleNumber: i,
          sampleCode: `${inspection.inspectionNumber}-S${String(i).padStart(2, '0')}`,
          status: inspData.status === InspectionStatus.COMPLETED ? SampleStatus.VERIFIED : SampleStatus.PENDING,
          notes: `Sample #${i}: Principal display panel examined for ${inspData.commodity}`,
        };

        const sample = await Sample.findOneAndUpdate(
          { inspectionId: inspection._id, sampleNumber: i },
          { $set: sampleData },
          { upsert: true, returnDocument: 'after' }
        );

        // Seed realistic compliance findings for completed inspections
        if (inspData.status === InspectionStatus.COMPLETED && i === 1) {
          if (inspData.inspectionNumber === 'INS-2026-002') {
            // MRP finding (Compliant)
            await ComplianceFinding.findOneAndUpdate(
              { findingId: 'FIND-DEMO-002-1' },
              {
                $set: {
                  findingId: 'FIND-DEMO-002-1',
                  inspectionId: inspection._id,
                  sampleId: sample._id,
                  sampleCode: sample.sampleCode,
                  ruleId: 'RULE-MRP-01',
                  ruleReference: 'PCR 2011, Rule 6(1)(e)',
                  ruleFamily: 'MANDATORY_DECLARATIONS',
                  declarationType: 'MRP',
                  requirementDescription: 'Maximum Retail Price declaration',
                  candidateStatus: FindingCandidateStatus.COMPLIANT_CANDIDATE,
                  status: FindingStatus.VERIFIED_COMPLIANT,
                  isVerified: true,
                  isCorrected: false,
                  aiObservation: {
                    state: 'OBSERVED',
                    extractedValue: 'Rs. 640.00',
                    normalizedValue: '640.00',
                    confidence: 'HIGH',
                    evidenceImageIds: [],
                    evidenceDescriptions: [],
                  },
                  ruleEngineResult: {
                    outcome: 'PASS',
                    reason: 'Valid MRP declaration format',
                    applicabilityExplanation: 'Retail package',
                    requiresInspectorReview: false,
                    ruleDatabaseVersion: '1.0',
                    evaluatedAt: new Date(now - 10 * dayMs),
                  },
                  inspectorVerification: {
                    isVerified: true,
                    decision: 'VERIFIED_COMPLIANT',
                    verifiedValue: 'Rs. 640.00',
                    originalAiValuePreserved: 'Rs. 640.00',
                    isCorrected: false,
                    notes: 'Verified compliant with tax inclusive suffix',
                    verifiedBy: 'INS-DEL-01',
                    verifiedByName: 'Rajesh Kumar',
                    verifiedAt: new Date(now - 10 * dayMs),
                  },
                  createdAt: new Date(now - 10 * dayMs),
                },
              },
              { upsert: true }
            );

            // Net Quantity finding (Compliant)
            await ComplianceFinding.findOneAndUpdate(
              { findingId: 'FIND-DEMO-002-2' },
              {
                $set: {
                  findingId: 'FIND-DEMO-002-2',
                  inspectionId: inspection._id,
                  sampleId: sample._id,
                  sampleCode: sample.sampleCode,
                  ruleId: 'RULE-NQ-01',
                  ruleReference: 'PCR 2011, Rule 6(1)(d)',
                  ruleFamily: 'MANDATORY_DECLARATIONS',
                  declarationType: 'NET_QUANTITY',
                  requirementDescription: 'Net Quantity standard unit declaration',
                  candidateStatus: FindingCandidateStatus.COMPLIANT_CANDIDATE,
                  status: FindingStatus.VERIFIED_COMPLIANT,
                  isVerified: true,
                  isCorrected: false,
                  aiObservation: {
                    state: 'OBSERVED',
                    extractedValue: '1 L',
                    normalizedValue: '1 L',
                    confidence: 'HIGH',
                    evidenceImageIds: [],
                    evidenceDescriptions: [],
                  },
                  ruleEngineResult: {
                    outcome: 'PASS',
                    reason: 'Standard volume unit',
                    applicabilityExplanation: 'Retail package',
                    requiresInspectorReview: false,
                    ruleDatabaseVersion: '1.0',
                    evaluatedAt: new Date(now - 10 * dayMs),
                  },
                  inspectorVerification: {
                    isVerified: true,
                    decision: 'VERIFIED_COMPLIANT',
                    verifiedValue: '1 L',
                    originalAiValuePreserved: '1 L',
                    isCorrected: false,
                    notes: 'Matches standard package size schedule',
                    verifiedBy: 'INS-DEL-01',
                    verifiedByName: 'Rajesh Kumar',
                    verifiedAt: new Date(now - 10 * dayMs),
                  },
                  createdAt: new Date(now - 10 * dayMs),
                },
              },
              { upsert: true }
            );
          }

          if (inspData.inspectionNumber === 'INS-2026-004') {
            // Consumer Care finding (Non-Compliant violation)
            await ComplianceFinding.findOneAndUpdate(
              { findingId: 'FIND-DEMO-004-1' },
              {
                $set: {
                  findingId: 'FIND-DEMO-004-1',
                  inspectionId: inspection._id,
                  sampleId: sample._id,
                  sampleCode: sample.sampleCode,
                  ruleId: 'RULE-CC-01',
                  ruleReference: 'PCR 2011, Rule 6(1)(da)',
                  ruleFamily: 'CONSUMER_CARE',
                  declarationType: 'CONSUMER_CARE',
                  requirementDescription: 'Consumer care contact details',
                  candidateStatus: FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE,
                  status: FindingStatus.VERIFIED_NON_COMPLIANT,
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
                    reason: 'Consumer care telephone and email missing',
                    applicabilityExplanation: 'Imported retail packaging',
                    requiresInspectorReview: true,
                    ruleDatabaseVersion: '1.0',
                    evaluatedAt: new Date(now - 3 * dayMs),
                  },
                  inspectorVerification: {
                    isVerified: true,
                    decision: 'VERIFIED_NON_COMPLIANT',
                    verifiedValue: 'ABSENT',
                    originalAiValuePreserved: null,
                    isCorrected: false,
                    notes: 'Mandatory consumer care telephone/email absent from outer sticker',
                    verifiedBy: 'INS-DEL-02',
                    verifiedByName: 'Priya Sharma',
                    verifiedAt: new Date(now - 3 * dayMs),
                  },
                  createdAt: new Date(now - 3 * dayMs),
                },
              },
              { upsert: true }
            );

            // Country of Origin finding (Compliant)
            await ComplianceFinding.findOneAndUpdate(
              { findingId: 'FIND-DEMO-004-2' },
              {
                $set: {
                  findingId: 'FIND-DEMO-004-2',
                  inspectionId: inspection._id,
                  sampleId: sample._id,
                  sampleCode: sample.sampleCode,
                  ruleId: 'RULE-COO-01',
                  ruleReference: 'PCR 2011, Rule 6(1)(n)',
                  ruleFamily: 'ORIGIN',
                  declarationType: 'COUNTRY_OF_ORIGIN',
                  requirementDescription: 'Country of Origin declaration for imported goods',
                  candidateStatus: FindingCandidateStatus.COMPLIANT_CANDIDATE,
                  status: FindingStatus.VERIFIED_COMPLIANT,
                  isVerified: true,
                  isCorrected: false,
                  aiObservation: {
                    state: 'OBSERVED',
                    extractedValue: 'Country of Origin: USA',
                    normalizedValue: 'USA',
                    confidence: 'HIGH',
                    evidenceImageIds: [],
                    evidenceDescriptions: [],
                  },
                  ruleEngineResult: {
                    outcome: 'PASS',
                    reason: 'Country of Origin declared on principal panel',
                    applicabilityExplanation: 'Imported package',
                    requiresInspectorReview: false,
                    ruleDatabaseVersion: '1.0',
                    evaluatedAt: new Date(now - 3 * dayMs),
                  },
                  inspectorVerification: {
                    isVerified: true,
                    decision: 'VERIFIED_COMPLIANT',
                    verifiedValue: 'Country of Origin: USA',
                    originalAiValuePreserved: 'Country of Origin: USA',
                    isCorrected: false,
                    notes: 'Origin verified from customs import manifest',
                    verifiedBy: 'INS-DEL-02',
                    verifiedByName: 'Priya Sharma',
                    verifiedAt: new Date(now - 3 * dayMs),
                  },
                  createdAt: new Date(now - 3 * dayMs),
                },
              },
              { upsert: true }
            );
          }
        }
      }
      console.log(`    ✓ ${inspData.samplesCount} child samples linked to ${inspection.inspectionNumber}`);
    }

    // ----------------------------------------------------
    // 3. Core Legal Metrology Rules (Authoritative LMPC Database v1.0)
    // ----------------------------------------------------
    console.log('\n[3/3] Ingesting Authoritative LMPC Rule Database v1.0 (33 rules)...');
    const { seedAuthoritativeRules } = await import('./seedRules');
    const ruleResult = await seedAuthoritativeRules();
    console.log(`    ✓ Authoritative Rule Database populated: ${ruleResult.total} rules verified.`);

    console.log('\n====================================================');
    console.log('✅ [SEED] Database seeded successfully with Supervisory Telemetry!');
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
