import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure pdfjs worker for Node.js environment to prevent API/worker version mismatch
if ((pdfjsLib as any).GlobalWorkerOptions) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
}

export interface FormatCheckResult {
  check: string;
  passed: boolean;
  message: string;
}

/**
 * Perform a 100% deterministic, rule-based format check on raw uploaded file buffer.
 * No AI calls involved.
 */
export async function checkFormatCompatibility(
  fileBuffer: Buffer,
  mimetype: string,
  parsedJson: any
): Promise<FormatCheckResult[]> {
  const isPdf = mimetype === 'application/pdf' || fileBuffer.slice(0, 4).toString() === '%PDF';
  const isDocx =
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword' ||
    (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b); // PK zip header

  const checks: FormatCheckResult[] = [];

  let pdfDoc: any = null;
  let docxZip: JSZip | null = null;
  let docxDocumentXml: string = '';

  if (isPdf) {
    try {
      const data = new Uint8Array(fileBuffer);
      pdfDoc = await (pdfjsLib as any).getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
        useWorkerFetch: false,
        isWorkerDisabled: true,
      }).promise;
    } catch (e: any) {
      console.warn('pdfjs-dist failed to parse PDF buffer:', e?.message || e);
    }
  } else if (isDocx) {
    try {
      docxZip = await JSZip.loadAsync(fileBuffer);
      const docXmlFile = docxZip.file('word/document.xml');
      if (docXmlFile) {
        docxDocumentXml = await docXmlFile.async('string');
      }
    } catch (e: any) {
      console.warn('JSZip failed to parse DOCX buffer:', e?.message || e);
    }
  }

  // -------------------------------------------------------------
  // Check 1: Scanned / Image-Based PDF Detection
  // -------------------------------------------------------------
  let pageCount = 1;
  let totalChars = 0;

  if (isPdf && pdfDoc) {
    pageCount = pdfDoc.numPages || 1;
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
        totalChars += pageText.trim().length;
      } catch (err) {
        // ignore single page text error
      }
    }
  } else {
    // For DOCX or non-PDF, extract text from parsedJson summary/exp/skills
    const summary = parsedJson?.summary || '';
    const expText = JSON.stringify(parsedJson?.workExperience || {});
    totalChars = summary.length + expText.length;
  }

  const avgCharsPerPage = Math.round(totalChars / pageCount);

  if (isPdf && avgCharsPerPage < 50) {
    checks.push({
      check: 'Scanned / Image-Based PDF Detection',
      passed: false,
      message: `Extracted text density is extremely low (~${avgCharsPerPage} chars/page). This indicates a scanned or image-based PDF which real ATS parsers cannot extract text from.`,
    });
  } else {
    checks.push({
      check: 'Scanned / Image-Based PDF Detection',
      passed: true,
      message: `Sufficient selectable text found (~${avgCharsPerPage} chars/page). Document text is searchable and indexable.`,
    });
  }

  // -------------------------------------------------------------
  // Check 2: Embedded Images & Graphics Detection
  // -------------------------------------------------------------
  let hasEmbeddedImages = false;

  if (isDocx && docxZip) {
    // Check word/media/ directory in zip
    const mediaFiles = Object.keys(docxZip.files).filter((path) => path.startsWith('word/media/'));
    const hasDrawingXml =
      docxDocumentXml.includes('<w:drawing') ||
      docxDocumentXml.includes('<v:shape') ||
      docxDocumentXml.includes('<w:object') ||
      docxDocumentXml.includes('<v:imagedata');

    if (mediaFiles.length > 0 || hasDrawingXml) {
      hasEmbeddedImages = true;
    }
  } else if (isPdf && pdfDoc) {
    // Check PDF for image XObjects or raw stream image markers
    const rawPdfStr = fileBuffer.toString('binary');
    if (/\/Subtype\s*\/Image/i.test(rawPdfStr) || /\/XObject/i.test(rawPdfStr)) {
      // Check if image operators exist in pages
      for (let i = 1; i <= Math.min(pageCount, 5); i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const ops = await page.getOperatorList();
          // OPS codes for paintImageXObject = 85, paintInlineImageXObject = 86, etc.
          const hasImgOp = ops.fnArray.some(
            (fn: number) => fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject || fn === pdfjsLib.OPS.paintImageMaskXObject
          );
          if (hasImgOp) {
            hasEmbeddedImages = true;
            break;
          }
        } catch (err) {
          // ignore
        }
      }
    }
  }

  if (hasEmbeddedImages) {
    checks.push({
      check: 'Embedded Images & Graphics',
      passed: false,
      message: 'Embedded image(s) or graphic elements detected. Real ATS parsers cannot extract or index text inside graphics or images.',
    });
  } else {
    checks.push({
      check: 'Embedded Images & Graphics',
      passed: true,
      message: 'No embedded images or graphic elements detected.',
    });
  }

  // -------------------------------------------------------------
  // Check 3: Table Structures Detection
  // -------------------------------------------------------------
  let hasTables = false;

  if (isDocx && docxDocumentXml) {
    if (docxDocumentXml.includes('<w:tbl') || docxDocumentXml.includes('<w:tbl>')) {
      hasTables = true;
    }
  } else if (isPdf && pdfDoc) {
    // Check PDF text positioning for table cell grids
    for (let i = 1; i <= Math.min(pageCount, 5); i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        // Check if multiple text items share same Y (transform[5]) with 3+ distinct X positions (transform[4])
        const yMap: Record<number, number[]> = {};
        for (const item of textContent.items) {
          const x = Math.round(item.transform[4]);
          const y = Math.round(item.transform[5]);
          if (!yMap[y]) yMap[y] = [];
          yMap[y].push(x);
        }

        let gridRows = 0;
        for (const yStr in yMap) {
          const xList = yMap[yStr];
          if (xList.length >= 3) {
            gridRows++;
          }
        }

        if (gridRows >= 3) {
          hasTables = true;
          break;
        }
      } catch (err) {
        // ignore
      }
    }
  }

  if (hasTables) {
    checks.push({
      check: 'Table Structures Detection',
      passed: false,
      message: 'Table structure(s) detected. Tables frequently cause ATS parsers to scramble parsing order and misalign column boundaries.',
    });
  } else {
    checks.push({
      check: 'Table Structures Detection',
      passed: true,
      message: 'No table structures detected.',
    });
  }

  // -------------------------------------------------------------
  // Check 4: Multi-Column Layout Detection (PDF & DOCX)
  // -------------------------------------------------------------
  let hasMultiColumns = false;

  if (isDocx && docxDocumentXml) {
    if (/<w:cols[^>]*w:num="[2-9]"/i.test(docxDocumentXml) || /<w:col\s/i.test(docxDocumentXml)) {
      hasMultiColumns = true;
    }
  } else if (isPdf && pdfDoc) {
    for (let i = 1; i <= Math.min(pageCount, 5); i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        // Find text items in middle 80% vertical height of page
        const items = textContent.items.map((it: any) => ({
          text: it.str,
          x: it.transform[4],
          y: it.transform[5],
        }));

        // Cluster items into left column (x < 250) vs right column (x > 320) with overlapping Y bounds
        const leftItems = items.filter((it: any) => it.x < 250 && it.text.trim().length > 3);
        const rightItems = items.filter((it: any) => it.x > 320 && it.text.trim().length > 3);

        if (leftItems.length >= 5 && rightItems.length >= 5) {
          // Check vertical Y overlap between left & right clusters
          const leftMinY = Math.min(...leftItems.map((it: any) => it.y));
          const leftMaxY = Math.max(...leftItems.map((it: any) => it.y));
          const rightMinY = Math.min(...rightItems.map((it: any) => it.y));
          const rightMaxY = Math.max(...rightItems.map((it: any) => it.y));

          const overlap = Math.min(leftMaxY, rightMaxY) - Math.max(leftMinY, rightMinY);
          if (overlap > 100) {
            hasMultiColumns = true;
            break;
          }
        }
      } catch (err) {
        // ignore
      }
    }
  }

  if (hasMultiColumns) {
    checks.push({
      check: 'Multi-Column Layout Detection',
      passed: false,
      message: 'Multi-column layout detected. Multi-column text frequently causes ATS parsers to read across columns horizontally instead of top-to-bottom.',
    });
  } else {
    checks.push({
      check: 'Multi-Column Layout Detection',
      passed: true,
      message: 'Single-column linear layout detected.',
    });
  }

  // -------------------------------------------------------------
  // Check 5: Missing Standard Resume Sections
  // -------------------------------------------------------------
  const missingSections: string[] = [];

  const contact = parsedJson?.contact || {};
  if (!contact.name && !contact.email) {
    missingSections.push('Contact Information');
  }

  const workExperience = parsedJson?.workExperience || [];
  if (!Array.isArray(workExperience) || workExperience.length === 0) {
    missingSections.push('Work Experience');
  }

  const education = parsedJson?.education || [];
  if (!Array.isArray(education) || education.length === 0) {
    missingSections.push('Education');
  }

  const skills = parsedJson?.skills || [];
  if (!Array.isArray(skills) || skills.length === 0) {
    missingSections.push('Skills');
  }

  if (missingSections.length > 0) {
    checks.push({
      check: 'Standard Resume Sections',
      passed: false,
      message: `Missing standard section(s): ${missingSections.join(', ')}. Real ATS parsers rely on standard section headers to catalog candidate data.`,
    });
  } else {
    checks.push({
      check: 'Standard Resume Sections',
      passed: true,
      message: 'All core resume sections (Contact Info, Work Experience, Education, Skills) are present.',
    });
  }

  return checks;
}
