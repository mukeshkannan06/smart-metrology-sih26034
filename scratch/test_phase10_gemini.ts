/**
 * Automated Verification Suite for Phase 10:
 * Gemini Multimodal AI + OCR + Package Declaration Extraction
 *
 * Tests:
 * 1. AI Provider Abstraction, 10 Categories, and Prompt Configuration
 * 2. Pre-image validation guard (blocks analysis if 0 images attached)
 * 3. Successful Multimodal AI declaration extraction pipeline
 * 4. Image Set Hash caching & duplicate prevention
 * 5. Force re-analysis and older extraction invalidation
 * 6. Dynamic STALE detection when sample images mutate
 * 7. Inspector review & confirmation workflow
 * 8. Strict non-compliance boundary (No COMPLIANT / NON_COMPLIANT rulings)
 * 9. RBAC: Inspector ownership enforcement (403 for other inspectors)
 * 10. RBAC: Controller supervisory read-only access (403 on analysis trigger/review)
 */

import { GeminiProvider, PROMPT_VERSION } from '../backend/src/ai/geminiProvider';
import { ALL_DECLARATION_CATEGORIES } from '../backend/src/ai/aiProvider.interface';

const BASE_URL = 'http://127.0.0.1:5000/api';

// 1x1 valid JPEG image buffer for testing
const TINY_JPEG_BASE64 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function login(username: string, password = 'Insp@2026!'): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${res.status}`);
  }
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No auth cookie returned for ${username}`);
  }
  return setCookie.split(';')[0];
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  SMART METROLOGY — PHASE 10 AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  // TEST 1: Unit testing GeminiProvider abstraction & 10 categories
  console.log('[1/10] Verifying AI Provider Abstraction & Standard Categories...');
  const provider = new GeminiProvider();
  assert(provider.name === 'gemini', 'Provider name is gemini');
  assert(ALL_DECLARATION_CATEGORIES.length === 10, 'Exactly 10 standard declaration categories defined');
  assert(
    ALL_DECLARATION_CATEGORIES.includes('NET_QUANTITY') &&
    ALL_DECLARATION_CATEGORIES.includes('MRP') &&
    ALL_DECLARATION_CATEGORIES.includes('PRODUCT_NAME') &&
    ALL_DECLARATION_CATEGORIES.includes('DATE_OF_MANUFACTURE_PACKING') &&
    ALL_DECLARATION_CATEGORIES.includes('BEST_BEFORE_USE_BY') &&
    ALL_DECLARATION_CATEGORIES.includes('MANUFACTURER_DETAILS') &&
    ALL_DECLARATION_CATEGORIES.includes('COUNTRY_OF_ORIGIN') &&
    ALL_DECLARATION_CATEGORIES.includes('CONSUMER_CARE') &&
    ALL_DECLARATION_CATEGORIES.includes('UNIT_SALE_PRICE') &&
    ALL_DECLARATION_CATEGORIES.includes('DIMENSIONS'),
    'All 10 Legal Metrology categories present'
  );

  // Direct provider mock analysis check
  const mockBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  const directAnalysis = await provider.analyzePackageImages({
    inspectionId: 'mock-insp-001',
    sampleId: 'mock-sample-001',
    commodity: 'Ground Spices',
    images: [{ imageId: 'img-1', mimeType: 'image/jpeg', buffer: mockBuffer, sequence: 1 }],
  });
  assert(directAnalysis.declarations.length === 10, 'Provider returns all 10 declaration categories');
  assert(directAnalysis.promptVersion === PROMPT_VERSION, 'Provider cites package-extraction-v1 prompt version');
  assert(Boolean(directAnalysis.overallConfidence), 'Provider computes overall confidence');

  // TEST 2: Setup Inspection with Sample
  console.log('\n[2/10] Logging in Inspector 1 and creating inspection case...');
  const insp1Cookie = await login('inspector1');
  const createInspRes = await fetch(`${BASE_URL}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({
      commodity: 'Basmati Rice',
      brand: 'Royal Heritage',
      packageContext: 'RETAIL_PACKAGE',
      location: 'Sector 62, Noida, Uttar Pradesh',
      market: 'Metro Hypermarket',
      samplesCount: 2,
      remarks: 'Phase 10 AI automated test inspection',
    }),
  });
  assert(createInspRes.status === 201, 'Inspection created successfully (201)');
  const inspJson = await createInspRes.json();
  const inspData = inspJson.data;
  const inspectionId = inspData._id;

  // Create child sample unit
  const createSampleRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({ notes: 'Phase 10 Test Sample Unit' }),
  });
  assert(createSampleRes.status === 201, 'Sample created successfully (201)');
  const sample1 = (await createSampleRes.json()).data.sample;
  assert(Boolean(sample1), `Found child sample unit: ${sample1?.sampleCode}`);

  // TEST 3: Pre-image validation guard
  console.log('\n[3/10] Verifying guard against analyzing samples without photos...');
  const zeroImgRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
  });
  assert(zeroImgRes.status === 400, 'Rejects analysis when 0 images attached (400 Bad Request)');
  const zeroImgBody = await zeroImgRes.json();
  assert(
    zeroImgBody.message.includes('No package photos have been captured'),
    'Returns informative error message for missing images'
  );

  // TEST 4: Attach package photo to sample
  console.log('\n[4/10] Attaching package photo to sample...');
  const uploadImgRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({
      imageData: TINY_JPEG_BASE64,
      fileName: 'front_display_panel.jpg',
    }),
  });
  assert(uploadImgRes.status === 201, 'Image attached to sample (201 Created)');
  const uploadImgBody = await uploadImgRes.json();
  const attachedImage = uploadImgBody.data.image;
  assert(Boolean(attachedImage.imageId), `Attached image ID: ${attachedImage.imageId}`);

  // TEST 5: Successful AI Declaration Extraction
  console.log('\n[5/10] Triggering AI Multimodal Declaration Extraction...');
  const analyzeRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({ forceReanalyze: false }),
  });
  assert(analyzeRes.status === 200, 'AI analysis executed successfully (200 OK)');
  const analyzeBody = await analyzeRes.json();
  const extraction = analyzeBody.data.extraction;
  assert(extraction.extractionId.startsWith('EXT-'), `Valid extraction ID format: ${extraction.extractionId}`);
  assert(extraction.declarations.length === 10, 'Contains all 10 standard declaration categories');
  assert(extraction.status === 'COMPLETED' || extraction.status === 'REQUIRES_REVIEW', `Valid extraction status: ${extraction.status}`);
  assert(analyzeBody.data.cached === false, 'Fresh analysis recorded (cached: false)');

  // Verify sample status advanced to EXTRACTED
  const updatedSampleRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}`, {
    headers: { Cookie: insp1Cookie },
  });
  const updatedSampleBody = await updatedSampleRes.json();
  assert(
    updatedSampleBody.data.sample.status === 'EXTRACTED',
    `Sample status auto-advanced to EXTRACTED (currently: ${updatedSampleBody.data.sample.status})`
  );

  // TEST 6: Strict Non-Compliance Boundary Assertion
  console.log('\n[6/10] Verifying strict non-compliance boundaries in extraction data...');
  const rawExtractionString = JSON.stringify(extraction).toUpperCase();
  assert(
    !rawExtractionString.includes('"COMPLIANT"') && !rawExtractionString.includes('"NON_COMPLIANT"'),
    'ZERO COMPLIANT or NON_COMPLIANT judgments found in Phase 10 extraction data'
  );
  assert(
    !rawExtractionString.includes('"VIOLATION"') && !rawExtractionString.includes('"PENALTY"'),
    'ZERO legal violation or penalty assertions in Phase 10 extraction data'
  );

  // TEST 7: Image Set Hash Caching
  console.log('\n[7/10] Verifying Image Set Hash Caching on identical image set...');
  const cachedAnalysisRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({ forceReanalyze: false }),
  });
  assert(cachedAnalysisRes.status === 200, 'Cache fetch successful (200 OK)');
  const cachedBody = await cachedAnalysisRes.json();
  assert(cachedBody.data.cached === true, 'Successfully served from cache (cached: true)');
  assert(cachedBody.data.extraction.extractionId === extraction.extractionId, 'Identical extraction ID returned from cache');

  // Force re-analysis check
  const forceRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({ forceReanalyze: true }),
  });
  assert(forceRes.status === 200, 'Force re-analyze executed (200 OK)');
  const forceBody = await forceRes.json();
  assert(forceBody.data.cached === false, 'Force re-analyze bypassed cache (cached: false)');
  assert(forceBody.data.extraction.extractionId !== extraction.extractionId, 'New extraction ID generated on force re-analyze');

  // TEST 8: Image Mutation & Stale Invalidation
  console.log('\n[8/10] Verifying dynamic STALE status when sample images mutate...');
  // Attach a second photo
  await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
    body: JSON.stringify({
      imageData: TINY_JPEG_BASE64,
      fileName: 'back_panel.jpg',
    }),
  });

  // Query extraction status
  const staleCheckRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-extractions`, {
    headers: { Cookie: insp1Cookie },
  });
  assert(staleCheckRes.status === 200, 'Extractions history retrieved (200 OK)');
  const staleCheckBody = await staleCheckRes.json();
  assert(staleCheckBody.data.isStale === true, 'isStale flag is TRUE after new image added');
  assert(
    staleCheckBody.data.latestExtraction.status === 'STALE',
    'Latest extraction status automatically marked STALE'
  );

  // TEST 9: Inspector Review & Verification Workflow
  console.log('\n[9/10] Verifying Inspector declaration review & confirmation...');
  const latestExtId = staleCheckBody.data.latestExtraction.extractionId;
  const reviewRes = await fetch(
    `${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-extractions/${latestExtId}/declarations/NET_QUANTITY`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: insp1Cookie },
      body: JSON.stringify({
        status: 'CONFIRMED',
        notes: 'Net quantity 500g verified legible on principal display panel',
      }),
    }
  );
  assert(reviewRes.status === 200, 'Inspector declaration review recorded (200 OK)');
  const reviewBody = await reviewRes.json();
  const reviewedDecl = reviewBody.data.extraction.declarations.find(
    (d: any) => d.category === 'NET_QUANTITY'
  );
  assert(reviewedDecl.inspectorReview.status === 'CONFIRMED', 'NET_QUANTITY review marked CONFIRMED');
  assert(
    reviewedDecl.inspectorReview.notes === 'Net quantity 500g verified legible on principal display panel',
    'Inspector review notes persisted'
  );

  // TEST 10: Role-Based Access Control & Isolation
  console.log('\n[10/10] Verifying RBAC and Inspector Data Isolation...');
  // Assistant Controller checks
  const controllerCookie = await login('controller', 'Admin@2026!');
  
  // Controller read access: permitted
  const ctrlReadRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-extractions`, {
    headers: { Cookie: controllerCookie },
  });
  assert(ctrlReadRes.status === 200, 'Assistant Controller has supervisory read access to extractions (200 OK)');

  // Controller trigger analysis: forbidden (Inspector role required)
  const ctrlTriggerRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: controllerCookie },
  });
  assert(ctrlTriggerRes.status === 403, 'Assistant Controller blocked from triggering AI analysis (403 Forbidden)');

  // Controller patch review: forbidden
  const ctrlReviewRes = await fetch(
    `${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-extractions/${latestExtId}/declarations/MRP`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: controllerCookie },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    }
  );
  assert(ctrlReviewRes.status === 403, 'Assistant Controller blocked from modifying declaration reviews (403 Forbidden)');

  // Inspector 2 checks (Inspector 2 does NOT own this inspection)
  const insp2Cookie = await login('inspector2');
  const insp2AnalyzeRes = await fetch(`${BASE_URL}/inspections/${inspectionId}/samples/${sample1._id}/ai-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: insp2Cookie },
  });
  assert(insp2AnalyzeRes.status === 403, 'Inspector 2 blocked from analyzing Inspector 1 inspection (403 Forbidden)');

  console.log('\n=============================================================');
  console.log(`  PHASE 10 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in Phase 10 test suite:', err);
  process.exit(1);
});
