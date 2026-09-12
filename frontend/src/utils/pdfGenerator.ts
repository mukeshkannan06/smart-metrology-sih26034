import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  InspectionReportDTO,
  ReportSampleDetail,
  loadImageAsDataUrl,
} from '../services/reportService';

const PACKAGE_CONTEXT_LABELS: Record<string, string> = {
  RETAIL_PACKAGE: 'Retail Package',
  WHOLESALE_PACKAGE: 'Wholesale Package',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE: 'Industrial / Institutional Package',
  IMPORTED_PACKAGE: 'Imported Package',
  EXPORT_PACKAGE: 'Export Package',
};

/**
 * Normalizes text to replace Unicode Rupee symbol with 'Rs. '
 * preventing character corruption in standard PDF Helvetica font.
 */
function sanitizePdfText(text?: string | null): string {
  if (!text) return '—';
  return text.replace(/₹/g, 'Rs. ').trim();
}

/**
 * Generates the official, tamper-evident consolidated Legal Metrology Inspection PDF Report.
 * One Inspection → One Consolidated Multi-Page PDF containing all child samples.
 */
export async function generateInspectionPdf(
  reportData: InspectionReportDTO,
  options?: { download?: boolean }
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 182mm
  const bottomMargin = 18;

  let currentY = 16;

  // Helper to trigger page break if needed
  const ensureVerticalSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = 22; // Start after page header margin
    }
  };

  const { metadata, summary, samples, legalDisclaimer, systemIdentity } = reportData;

  // Pre-load images as base64 data URLs concurrently
  const loadedImagesMap = new Map<string, string>();
  const imageLoadPromises: Promise<void>[] = [];

  for (const sample of samples) {
    for (const img of sample.images) {
      if (img.availabilityState === 'AVAILABLE' && img.streamUrl) {
        imageLoadPromises.push(
          loadImageAsDataUrl(img.streamUrl).then((dataUrl) => {
            if (dataUrl) loadedImagesMap.set(img.imageId, dataUrl);
          })
        );
      }
    }
  }

  await Promise.all(imageLoadPromises);

  // =========================================================================
  // PAGE 1: OFFICIAL BRANDING HEADER & CASE OVERVIEW
  // =========================================================================

  // Top Accent Bar
  doc.setFillColor(30, 58, 138); // Navy Blue #1E3A8A
  doc.rect(leftMargin, currentY, contentWidth, 3, 'F');
  currentY += 8;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('SMART METROLOGY', leftMargin, currentY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('LEGAL METROLOGY ENFORCEMENT & COMPLIANCE SYSTEM', leftMargin, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Problem Statement SIH26034 · Department of Consumer Affairs', leftMargin, currentY + 8);

  // Report Badge & Date (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`REPORT: ${metadata.reportNumber}`, pageWidth - rightMargin, currentY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Date: ${new Date(metadata.reportGeneratedAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })}`,
    pageWidth - rightMargin,
    currentY + 4,
    { align: 'right' }
  );

  doc.text(`Status: ${summary.finalStatus}`, pageWidth - rightMargin, currentY + 8, { align: 'right' });

  currentY += 13;

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 5;

  // Document Title Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'CONSOLIDATED LEGAL METROLOGY (PACKAGED COMMODITIES) INSPECTION REPORT',
    pageWidth / 2,
    currentY + 7.5,
    { align: 'center' }
  );

  currentY += 16;

  // SECTION 1: Case Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Inspection Case Identification', leftMargin, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59], overflow: 'linebreak' },
    body: [
      [
        { content: 'Inspection ID:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        metadata.inspectionNumber,
        { content: 'Commodity:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        metadata.commodity,
      ],
      [
        { content: 'Brand / Trademark:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        metadata.brand || 'Unbranded / Not Declared',
        { content: 'Statutory Context:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        PACKAGE_CONTEXT_LABELS[metadata.packageContext] || metadata.packageContext,
      ],
      [
        { content: 'Inspection Location:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        metadata.location + (metadata.market ? ` (${metadata.market})` : ''),
        { content: 'Inspecting Officer:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        `${metadata.inspectorName} (${metadata.inspectorId})`,
      ],
      [
        { content: 'Inspection Initiated:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        new Date(metadata.createdAt).toLocaleString('en-IN'),
        { content: 'Final Finding Status:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        summary.finalStatus === 'COMPLIANT'
          ? 'VERIFIED COMPLIANT (PASS)'
          : summary.finalStatus === 'NON_COMPLIANT'
          ? 'NON-COMPLIANT (VIOLATIONS DETECTED)'
          : summary.finalStatus,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // SECTION 2: Multi-Sample Executive Specimen Summary
  ensureVerticalSpace(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Consolidated Multi-Sample Specimen Summary', leftMargin, currentY);
  currentY += 2;

  const sampleSummaryRows = samples.map((s) => {
    const findingsCount = s.findings.length;
    const violations = s.findings.filter(
      (f) => f.status === 'VERIFIED_NON_COMPLIANT' || f.decision === 'VERIFIED_NON_COMPLIANT'
    ).length;
    const compliant = s.findings.filter(
      (f) => f.status === 'VERIFIED_COMPLIANT' || f.decision === 'VERIFIED_COMPLIANT'
    ).length;

    let outcomeText = 'Pending Verification';
    if (violations > 0) outcomeText = `VIOLATION (${violations} flagged)`;
    else if (compliant > 0 && compliant === findingsCount) outcomeText = 'COMPLIANT (All passed)';
    else if (s.status === 'VERIFIED') outcomeText = 'VERIFIED';

    return [
      `Sample #${s.sampleNumber}`,
      s.sampleCode,
      s.status,
      `${s.images.length} Photo(s)`,
      `${findingsCount} Rules`,
      outcomeText,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    theme: 'striped',
    head: [['Specimen', 'Sample Code', 'Lifecycle Status', 'Evidence Photos', 'Rules Checked', 'Specimen Finding']],
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.2, overflow: 'linebreak' },
    body: sampleSummaryRows,
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Executive Statistics Bar
  ensureVerticalSpace(20);
  autoTable(doc, {
    startY: currentY,
    margin: { left: leftMargin, right: rightMargin },
    theme: 'plain',
    styles: { cellPadding: 2.5, fontSize: 8 },
    body: [
      [
        {
          content: `Total Samples: ${summary.totalSamplesActual} of ${summary.totalSamplesExpected} Expected  |  Total Rules Evaluated: ${summary.totalFindings}  |  Compliant: ${summary.verifiedCompliantCount}  |  Violations: ${summary.verifiedNonCompliantCount}  |  Officer Corrections: ${summary.officerCorrectionsCount}  |  Compliance Rate: ${summary.overallComplianceRate}%`,
          styles: {
            fillColor: summary.verifiedNonCompliantCount > 0 ? [254, 242, 242] : [240, 253, 244],
            textColor: summary.verifiedNonCompliantCount > 0 ? [185, 28, 28] : [21, 128, 61],
            fontStyle: 'bold',
            halign: 'center',
          },
        },
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // =========================================================================
  // DETAILED SAMPLE SECTIONS (Sample 1 to N in deterministic sequence)
  // =========================================================================

  for (const sample of samples) {
    ensureVerticalSpace(30);

    // Sample Section Header
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftMargin, currentY, contentWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 58, 138);
    doc.text(
      `SPECIMEN UNIT #${sample.sampleNumber}: ${sample.sampleCode}  [Status: ${sample.status}]`,
      leftMargin + 3,
      currentY + 5.5
    );

    currentY += 12;

    if (sample.notes) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Officer Sampling Notes: ${sample.notes}`, leftMargin + 2, currentY);
      currentY += 5;
    }

    // A. Photographic Evidence Gallery
    ensureVerticalSpace(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('A. Photographic Package Evidence', leftMargin + 2, currentY);
    currentY += 3;

    if (sample.images.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('No photographs recorded for this specimen.', leftMargin + 4, currentY + 3);
      currentY += 8;
    } else {
      let imgX = leftMargin + 2;
      const imgMaxW = 52;
      const imgMaxH = 38;

      for (const img of sample.images) {
        if (imgX + imgMaxW > pageWidth - rightMargin) {
          imgX = leftMargin + 2;
          currentY += imgMaxH + 7;
          ensureVerticalSpace(imgMaxH + 12);
        }

        const dataUrl = loadedImagesMap.get(img.imageId);
        if (img.availabilityState === 'AVAILABLE' && dataUrl) {
          try {
            doc.setDrawColor(203, 213, 225);
            doc.rect(imgX, currentY, imgMaxW, imgMaxH);
            doc.addImage(dataUrl, 'JPEG', imgX + 1, currentY + 1, imgMaxW - 2, imgMaxH - 2);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `Photo #${img.sequence} (${Math.round(img.sizeBytes / 1024)} KB)`,
              imgX + imgMaxW / 2,
              currentY + imgMaxH + 3.5,
              { align: 'center' }
            );
          } catch {
            // Fallback if image rendering fails
            doc.setFillColor(248, 250, 252);
            doc.rect(imgX, currentY, imgMaxW, imgMaxH, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Photo render fallback', imgX + 2, currentY + imgMaxH / 2);
          }
        } else {
          // Evidence Unavailable in Lifecycle
          doc.setFillColor(254, 243, 199); // Amber-100
          doc.setDrawColor(245, 158, 11); // Amber-500
          doc.roundedRect(imgX, currentY, imgMaxW, imgMaxH, 1, 1, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(146, 64, 14); // Amber-800
          doc.text(`Photo #${img.sequence} (IMG-${img.imageId.substring(0, 6)})`, imgX + imgMaxW / 2, currentY + 14, {
            align: 'center',
          });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(180, 83, 9); // Amber-700
          doc.text('Unavailable in storage lifecycle', imgX + imgMaxW / 2, currentY + 20, { align: 'center' });
          doc.text(`(${Math.round(img.sizeBytes / 1024)} KB · Metadata Preserved)`, imgX + imgMaxW / 2, currentY + 25, {
            align: 'center',
          });
        }

        imgX += imgMaxW + 6;
      }

      currentY += imgMaxH + 8;
    }

    // B. AI Multimodal Observations Table
    if (sample.aiExtraction) {
      ensureVerticalSpace(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `B. AI Multimodal Observations (${sample.aiExtraction.aiModel} · ${Math.round(
          sample.aiExtraction.overallConfidence * 100
        )}% Confidence)`,
        leftMargin + 2,
        currentY
      );

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        '* Assistive vision AI observation layer — does not constitute independent statutory authority',
        leftMargin + 2,
        currentY + 3.5
      );
      currentY += 5;

      const aiRows = sample.aiExtraction.declarations.map((dec) => [
        dec.category,
        sanitizePdfText(dec.extractedValue),
        sanitizePdfText(dec.normalizedValue),
        `${Math.round(dec.confidence * 100)}%`,
        dec.state,
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: leftMargin + 2, right: rightMargin + 2 },
        theme: 'grid',
        head: [['Declaration Field', 'AI Extracted Text', 'Normalized Representation', 'Confidence', 'State']],
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
        body: aiRows,
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // C. Statutory Rule Evaluation & Inspector Verification
    ensureVerticalSpace(30);
    const ruleDbVer = sample.ruleEvaluation?.ruleDatabaseVersion || '1.0';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `C. Statutory Rule Evaluation & Human Verification (Rule Database v${ruleDbVer})`,
      leftMargin + 2,
      currentY
    );
    currentY += 2;

    const findingRows = sample.findings.map((f) => {
      const originalAi = sanitizePdfText(f.aiValue);
      const finalVerified = sanitizePdfText(f.verifiedValue);
      const isModified = f.isCorrected;

      let verifiedCellText = finalVerified;
      if (isModified) {
        verifiedCellText = `${finalVerified}\n[*Officer Corrected]`;
      }

      return [
        f.ruleReference,
        f.requirementDescription,
        originalAi,
        verifiedCellText,
        f.status === 'VERIFIED_COMPLIANT'
          ? 'COMPLIANT'
          : f.status === 'VERIFIED_NON_COMPLIANT'
          ? 'NON-COMPLIANT'
          : f.status,
        f.notes || '—',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: leftMargin + 2, right: rightMargin + 2 },
      theme: 'grid',
      head: [
        [
          'Rule Ref',
          'Statutory Requirement',
          'Original AI Value',
          'Verified / Corrected Value',
          'Officer Decision',
          'Inspector Notes',
        ],
      ],
      headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 46 },
        2: { cellWidth: 26 },
        3: { cellWidth: 28 },
        4: { cellWidth: 26, fontStyle: 'bold' },
        5: { cellWidth: 30 },
      },
      body: findingRows,
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // =========================================================================
  // FINAL SECTION: STATUTORY DISCLAIMER & SIGN-OFF BLOCK
  // =========================================================================

  ensureVerticalSpace(48);

  // Disclaimer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, currentY, contentWidth, 18, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('STATUTORY SYSTEM DISCLAIMER & REGULATORY NOTICE', leftMargin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const disclaimerLines = doc.splitTextToSize(legalDisclaimer, contentWidth - 6);
  doc.text(disclaimerLines, leftMargin + 3, currentY + 8.5);

  currentY += 24;

  // Official Sign-Off
  ensureVerticalSpace(25);
  doc.setDrawColor(226, 232, 240);
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
  currentY += 5;

  // System Verification Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AUTHENTICATION & SYSTEM INTEGRITY', leftMargin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Application: ${systemIdentity.appName} (Problem Statement ${systemIdentity.problemStatement})`, leftMargin, currentY + 4);
  doc.text(`Statutory Rule Engine: LMPC Rule Database v${systemIdentity.ruleDatabaseVersion}`, leftMargin, currentY + 7.5);
  doc.setFont('courier', 'normal');
  doc.text(`Verification Hash: ${systemIdentity.verificationHash}`, leftMargin, currentY + 11);

  // Inspector Signature Line (Right)
  const sigBoxW = 65;
  const sigBoxX = pageWidth - rightMargin - sigBoxW;

  doc.setDrawColor(100, 116, 139);
  doc.line(sigBoxX, currentY + 10, sigBoxX + sigBoxW, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(metadata.inspectorName, sigBoxX + sigBoxW / 2, currentY + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Authorized Inspector (${metadata.inspectorId})`, sigBoxX + sigBoxW / 2, currentY + 17.5, {
    align: 'center',
  });
  doc.text('Department of Legal Metrology', sigBoxX + sigBoxW / 2, currentY + 21, { align: 'center' });

  // =========================================================================
  // UNIFIED RUNNING HEADERS & FOOTERS WITH PAGE NUMBERING ("Page X of Y")
  // =========================================================================

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header (pages 2+)
    if (i > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Smart Metrology · Legal Metrology Inspection Report · ${metadata.inspectionNumber}`,
        leftMargin,
        10
      );

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, 12, pageWidth - rightMargin, 12);
    }

    // Running Footer (every page)
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, pageHeight - 12, pageWidth - rightMargin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Smart Metrology · Legal Metrology Enforcement Portal · SIH26034', leftMargin, pageHeight - 8);

    doc.text(`Page ${i} of ${totalPages}`, pageWidth - rightMargin, pageHeight - 8, { align: 'right' });
  }

  // Trigger browser download if requested
  if (options?.download !== false) {
    const filename = `Smart-Metrology-Inspection-${metadata.inspectionNumber}.pdf`;
    doc.save(filename);
  }

  return doc;
}
