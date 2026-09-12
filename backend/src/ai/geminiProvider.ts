import path from 'path';
import dotenv from 'dotenv';
import {
  AIProvider,
  PackageAnalysisRequest,
  PackageAnalysisResponse,
  DeclarationExtraction,
  DeclarationCategory,
  DetectionState,
  ConfidenceLevel,
  ALL_DECLARATION_CATEGORIES,
} from './aiProvider.interface';

export const PROMPT_VERSION = 'package-extraction-v1';

const SYSTEM_PROMPT = `
You are an assistive Multimodal Package Declaration Extraction AI for Legal Metrology inspection workflows.
Your single objective is to visually inspect the provided package images and extract observable package declarations printed on the product.

STRICT LEGAL & ETHICAL CONSTRAINTS (NON-NEGOTIABLE):
1. OBSERVATION ONLY: You must ONLY report what is physically legible and visible in the imagery.
2. ZERO COMPLIANCE JUDGMENTS: DO NOT make legal conclusions, citations, or rulings. DO NOT state whether any declaration is COMPLIANT, NON_COMPLIANT, LEGAL, ILLEGAL, or VIOLATIVE. Statutory compliance is evaluated exclusively by an external deterministic legal metrology rule engine.
3. ZERO HALLUCINATION: If a declaration is not clearly visible, is obscured, covered, cut off, or missing, mark state as 'NOT_DETECTED' or 'UNCLEAR'. Never invent or assume text.
4. EVIDENCE CITATION: For every detected or partially visible declaration, identify which image sequence number (1, 2, 3, etc.) contains the visible text and specify a concise location description (e.g., "Front bottom right", "Back panel above barcode", "Side panel nutritional box").
5. EXTRACT BOTH RAW AND NORMALIZED:
   - 'rawValue': Verbatim text as printed on the packaging (including spelling, punctuation, currency symbols).
   - 'normalizedValue': Cleaned text (e.g., "500 g", "₹ 45.00", "01/2026").

You MUST evaluate the following 10 statutory declaration categories:
1. PRODUCT_NAME: Generic/common name of the commodity.
2. NET_QUANTITY: Net weight, measure, volume, or piece count with units (e.g. 500 g, 1 L, 10 N).
3. MRP: Maximum Retail Price inclusive of all taxes (e.g. MRP Rs. 99.00 incl. of all taxes).
4. DATE_OF_MANUFACTURE_PACKING: Month and year of manufacture, packing, or import (e.g. 03/2026, Mar 2026).
5. BEST_BEFORE_USE_BY: Expiry, use by date, or best before duration (e.g. 12 months from packing, Best before 31/12/2026).
6. MANUFACTURER_DETAILS: Name and complete address of the manufacturer, packer, or importer.
7. COUNTRY_OF_ORIGIN: Country where manufactured or produced (e.g. Made in India, Country of Origin: India).
8. CONSUMER_CARE: Consumer care contact details (phone, email, postal address, website).
9. UNIT_SALE_PRICE: Unit sale price where applicable (e.g. ₹ 0.20 per g, ₹ 10.00 per 100 ml).
10. DIMENSIONS: Size, dimensions, length, width, or diameter if packaged commodity requires dimensional declarations.

RESPONSE FORMAT:
Return STRICT JSON ONLY matching the following schema with NO markdown wrapping, NO backticks:
{
  "overallConfidence": "HIGH" | "MEDIUM" | "LOW",
  "warnings": ["string warning about lighting, glare, blur, or occlusion"],
  "declarations": [
    {
      "category": "PRODUCT_NAME" | "NET_QUANTITY" | "MRP" | "DATE_OF_MANUFACTURE_PACKING" | "BEST_BEFORE_USE_BY" | "MANUFACTURER_DETAILS" | "COUNTRY_OF_ORIGIN" | "CONSUMER_CARE" | "UNIT_SALE_PRICE" | "DIMENSIONS",
      "state": "DETECTED" | "NOT_DETECTED" | "LOW_CONFIDENCE" | "UNCLEAR",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "rawValue": "verbatim visible text or empty string",
      "normalizedValue": "standardized text or empty string",
      "evidenceImageSequence": 1,
      "evidenceDescription": "location and context in photo"
    }
  ]
}
`.trim();

export class GeminiProvider implements AIProvider {
  public readonly name = 'gemini';

  private reloadEnv(): void {
    try {
      dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
    } catch {
      // ignore
    }
  }

  private get apiKey(): string | undefined {
    this.reloadEnv();
    return process.env.GEMINI_API_KEY?.trim();
  }

  private get modelName(): string {
    this.reloadEnv();
    return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  }

  public isLiveApiAvailable(): boolean {
    const key = this.apiKey;
    return Boolean(key && key.length > 5 && key !== 'mock');
  }

  public async analyzePackageImages(
    request: PackageAnalysisRequest
  ): Promise<PackageAnalysisResponse> {
    const startTime = Date.now();

    if (!request.images || request.images.length === 0) {
      throw new Error('Cannot analyze package declarations: No images provided.');
    }

    // Check if live API key is available or if mock mode is requested
    if (!this.isLiveApiAvailable() || process.env.FORCE_MOCK_AI === 'true') {
      console.log('[GEMINI_PROVIDER] No live API key found or mock forced. Using mock extraction.');
      return this.generateMockAnalysis(request, startTime);
    }

    const primary = this.modelName;
    const candidates = Array.from(
      new Set([
        primary,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-3.7-flash',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
      ])
    );

    let lastError: any;
    for (const targetModel of candidates) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[GEMINI_PROVIDER] Calling live Gemini Multimodal API (${targetModel}) with ${request.images.length} image(s) [Attempt ${attempt}]...`);
          const response = await this.callGeminiMultimodal(request, startTime, targetModel);
          console.log(`[GEMINI_PROVIDER] Live Gemini extraction succeeded with ${targetModel} in ${Date.now() - startTime}ms.`);
          return response;
        } catch (apiError: any) {
          lastError = apiError;
          const safeMessage = this.sanitizeErrorMessage(apiError.message || 'Gemini API call failed');
          console.warn(`[GEMINI_PROVIDER] Model ${targetModel} attempt ${attempt} failed: ${safeMessage}`);
          
          // If model is overloaded (503) or rate-limited (429), failover immediately to next model
          if (apiError.status === 503 || apiError.status === 429 || safeMessage.includes('503') || safeMessage.includes('demand')) {
            console.log(`[GEMINI_PROVIDER] ${targetModel} is busy or high demand. Failing over to next model...`);
            break;
          }
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    }

    const safeMessage = this.sanitizeErrorMessage(lastError?.message || 'Gemini API call failed');
    console.error('[GEMINI_PROVIDER] Live Gemini API failed across all fallback models:', safeMessage);
    throw new Error(`Live Gemini Vision extraction failed (${safeMessage}). Please click "Re-analyze Package" to retry.`);
  }

  /**
   * Calls Google Gemini Multimodal REST API with images encoded as base64 inlineData.
   */
  private async callGeminiMultimodal(
    request: PackageAnalysisRequest,
    startTime: number,
    activeModel: string
  ): Promise<PackageAnalysisResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      activeModel
    )}:generateContent?key=${encodeURIComponent(this.apiKey!)}`;

    // Build multimodal payload with all sample photos
    const parts: any[] = [];

    // Add each image as inlineData
    for (const img of request.images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.buffer.toString('base64'),
        },
      });
    }

    // Add user instruction with contextual hints
    const userPrompt = `
Analyze the ${request.images.length} attached package photos for Sample ${request.sampleId}.
Inspection Context:
- Package Context: ${request.packageContext || 'Standard Packaged Commodity'}
- Declared Commodity: ${request.commodity || 'Unspecified'}
- Total Photos Attached: ${request.images.length}
Extract all 10 statutory declaration categories strictly observing visible text. Follow JSON schema.
`.trim();

    parts.push({ text: userPrompt });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    // 90-second network timeout for high-resolution multimodal vision analysis
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (netErr: any) {
      clearTimeout(timeoutId);
      if (netErr.name === 'AbortError') {
        throw new Error('Gemini API call timed out after 90 seconds. Please retry.');
      }
      throw netErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {
        // ignore
      }

      const err: any = new Error(`Gemini API returned status ${res.status}: ${errBody.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }

    const data: any = await res.json();
    const durationMs = Date.now() - startTime;

    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini API returned an empty extraction response.');
    }

    return this.parseAndNormalizeGeminiResponse(rawText, request, durationMs, activeModel);
  }

  /**
   * Parses Gemini's raw JSON output and ensures all 10 categories are represented.
   */
  private parseAndNormalizeGeminiResponse(
    rawText: string,
    request: PackageAnalysisRequest,
    durationMs: number,
    activeModel: string
  ): PackageAnalysisResponse {
    let parsed: any;
    try {
      // Remove any potential markdown fence wrappers if returned despite instructions
      const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error('Failed to parse AI extraction output as valid JSON.');
    }

    const rawDeclarations: any[] = Array.isArray(parsed.declarations) ? parsed.declarations : [];
    const declarationsMap = new Map<string, any>();

    for (const item of rawDeclarations) {
      if (item && item.category) {
        declarationsMap.set(item.category.toUpperCase().trim(), item);
      }
    }

    const normalizedDeclarations: DeclarationExtraction[] = ALL_DECLARATION_CATEGORIES.map((cat) => {
      const match = declarationsMap.get(cat);
      if (match) {
        const seq = typeof match.evidenceImageSequence === 'number' ? match.evidenceImageSequence : 1;
        const matchingImg = request.images.find((img) => img.sequence === seq) || request.images[0];

        return {
          category: cat,
          state: this.sanitizeState(match.state),
          confidence: this.sanitizeConfidence(match.confidence),
          rawValue: match.rawValue ? String(match.rawValue).trim() : undefined,
          normalizedValue: match.normalizedValue ? String(match.normalizedValue).trim() : undefined,
          evidenceImageId: matchingImg ? matchingImg.imageId : undefined,
          evidenceImageSequence: seq,
          evidenceDescription: match.evidenceDescription ? String(match.evidenceDescription).trim() : undefined,
          inspectorReview: {
            status: 'PENDING',
          },
        };
      }

      // If category omitted by AI, populate standard NOT_DETECTED
      return {
        category: cat,
        state: 'NOT_DETECTED',
        confidence: 'HIGH',
        evidenceImageSequence: 1,
        evidenceDescription: 'No declaration text detected in package imagery.',
        inspectorReview: {
          status: 'PENDING',
        },
      };
    });

    const warnings: string[] = Array.isArray(parsed.warnings)
      ? parsed.warnings.map(String)
      : [];

    return {
      provider: this.name,
      model: activeModel,
      promptVersion: PROMPT_VERSION,
      overallConfidence: this.sanitizeConfidence(parsed.overallConfidence),
      declarations: normalizedDeclarations,
      warnings,
      processingMetadata: {
        durationMs,
        imagesCount: request.images.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Deterministic assistive mock analysis for offline use, unit testing, and dev without API key.
   */
  private generateMockAnalysis(
    request: PackageAnalysisRequest,
    startTime: number
  ): PackageAnalysisResponse {
    const primaryImg = request.images[0];
    const secondaryImg = request.images[1] || primaryImg;

    const declarations: DeclarationExtraction[] = [
      {
        category: 'PRODUCT_NAME',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: request.commodity ? `${request.commodity} Premium Pack` : 'Packaged Commodity Sample',
        normalizedValue: request.commodity || 'Packaged Commodity Sample',
        evidenceImageId: primaryImg.imageId,
        evidenceImageSequence: primaryImg.sequence,
        evidenceDescription: 'Visible in prominent bold type on principal display panel',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'NET_QUANTITY',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'Net Wt. 500 g',
        normalizedValue: '500 g',
        evidenceImageId: primaryImg.imageId,
        evidenceImageSequence: primaryImg.sequence,
        evidenceDescription: 'Printed at lower bottom of principal display panel',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'MRP',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'MRP Rs. 75.00 (Incl. of all taxes)',
        normalizedValue: '₹ 75.00',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Printed in mandatory declaration panel near barcode',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'DATE_OF_MANUFACTURE_PACKING',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'Mfg: 01/2026',
        normalizedValue: '01/2026',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Inkjet printed on back panel',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'BEST_BEFORE_USE_BY',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'Best before 12 months from packaging',
        normalizedValue: '12 months from packing',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Adjacent to manufacturing date',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'MANUFACTURER_DETAILS',
        state: 'DETECTED',
        confidence: 'MEDIUM',
        rawValue: 'Packed & Marketed by: Quality Foods Pvt Ltd, Sector 62, Noida, UP - 201301',
        normalizedValue: 'Quality Foods Pvt Ltd, Sector 62, Noida, UP - 201301',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Back panel address block',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'COUNTRY_OF_ORIGIN',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'Country of Origin: India',
        normalizedValue: 'India',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Back panel below manufacturer block',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'CONSUMER_CARE',
        state: 'DETECTED',
        confidence: 'HIGH',
        rawValue: 'Customer Care: 1800-11-2233 | care@qualityfoods.in',
        normalizedValue: '1800-11-2233 | care@qualityfoods.in',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Toll free number and email visible on side panel',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'UNIT_SALE_PRICE',
        state: 'DETECTED',
        confidence: 'MEDIUM',
        rawValue: 'USP Rs. 0.15 / g',
        normalizedValue: '₹ 0.15 / g',
        evidenceImageId: secondaryImg.imageId,
        evidenceImageSequence: secondaryImg.sequence,
        evidenceDescription: 'Printed directly adjacent to MRP in declaration panel',
        inspectorReview: { status: 'PENDING' },
      },
      {
        category: 'DIMENSIONS',
        state: 'NOT_DETECTED',
        confidence: 'HIGH',
        evidenceImageId: primaryImg.imageId,
        evidenceImageSequence: primaryImg.sequence,
        evidenceDescription: 'No dimensional declaration observed on package surface',
        inspectorReview: { status: 'PENDING' },
      },
    ];

    const durationMs = Date.now() - startTime;
    const warnings: string[] = [
      'Assistive notice: Offline mock AI provider active (Set GEMINI_API_KEY in backend/.env for live Google Gemini API).',
    ];

    return {
      provider: 'gemini-mock',
      model: 'deterministic-mock-v1',
      promptVersion: PROMPT_VERSION,
      overallConfidence: 'HIGH',
      declarations,
      warnings,
      processingMetadata: {
        durationMs,
        imagesCount: request.images.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private sanitizeState(state: any): DetectionState {
    const s = String(state || '').toUpperCase().trim();
    if (s === 'DETECTED') return 'DETECTED';
    if (s === 'LOW_CONFIDENCE') return 'LOW_CONFIDENCE';
    if (s === 'UNCLEAR') return 'UNCLEAR';
    return 'NOT_DETECTED';
  }

  private sanitizeConfidence(conf: any): ConfidenceLevel {
    const c = String(conf || '').toUpperCase().trim();
    if (c === 'HIGH') return 'HIGH';
    if (c === 'LOW') return 'LOW';
    return 'MEDIUM';
  }

  private sanitizeErrorMessage(msg: string): string {
    if (!this.apiKey) return msg;
    return msg.replace(new RegExp(this.apiKey, 'g'), '[REDACTED_API_KEY]');
  }
}

