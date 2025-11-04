export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function detectLanguage(text: string): 'arabic' | 'devanagari' | 'latin' | 'cyrillic' | 'unknown' {
  const counts = { arabic: 0, devanagari: 0, latin: 0, cyrillic: 0 } as Record<string, number>;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0600 && code <= 0x06FF) counts.arabic++;
    else if (code >= 0x0900 && code <= 0x097F) counts.devanagari++;
    else if ((code >= 0x0041 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) counts.latin++;
    else if (code >= 0x0400 && code <= 0x04FF) counts.cyrillic++;
  }
  const entries = Object.entries(counts) as [keyof typeof counts, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, count] = entries[0];
  if (count === 0) return 'unknown';
  return top as any;
}

function normalizeExtracted(text: string): string {
  text = text
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '') // zero-width/BIDI marks
    .replace(/[\t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');

  // Only remove tabs/nbsp strictly inside Arabic letters (preserve normal spaces between words)
  for (let i = 0; i < 3; i++) {
    const before = text;
    text = text
      .replace(/([\u0600-\u06FF])[\t]+([\u0600-\u06FF])/g, '$1$2')
      .replace(/([\u0600-\u06FF])[\u00A0]+([\u0600-\u06FF])/g, '$1$2')
      .replace(/([\u0600-\u06FF])[\u2000-\u200A]+([\u0600-\u06FF])/g, '$1$2');
    if (text === before) break;
  }

  // For each line, if Arabic-dominant, reverse token order (not characters)
  const lines = text.split(/\r?\n/).map((line) => {
    const arabicCount = (line.match(/[\u0600-\u06FF]/g) || []).length;
    const letterCount = (line.match(/[\p{L}]/gu) || []).length || 1;
    const ratio = arabicCount / letterCount;
    if (ratio >= 0.6) {
      const tokens = line.split(/\s+/).filter(Boolean);
      return tokens.reverse().join(' ');
    }
    return line;
  });

  text = lines.join('\n');
  return text.trim();
}

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // Try pdfjs-dist first if available (better RTL handling)
  try {
    const req = eval('require');
    const pdfjsLib = req('pdfjs-dist/legacy/build/pdf.js');
    if (pdfjsLib) {
      try {
        // Use no external worker in Node
        pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
      } catch {}
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const doc = await loadingTask.promise;
      let fullText = '';
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => (item?.str ?? ''));
        const pageText = strings.join(' ').replace(/\s{2,}/g, ' ').trim();
        if (pageText) fullText += (fullText ? '\n\n' : '') + pageText;
      }
      const normalized = normalizeExtracted(fullText);
      if (normalized.length >= 10) return normalized;
    }
  } catch {}

  // Fallback to pdf-parse (supports multiple export shapes)
  let pdfParseMod: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfParseMod = require('pdf-parse');
  } catch (e) {
    throw new Error('pdf-parse module not found. Please run: npm install pdf-parse');
  }

  const data = new Uint8Array(buffer);

  const fn = (typeof pdfParseMod === 'function') ? pdfParseMod : (typeof pdfParseMod?.default === 'function') ? pdfParseMod.default : null;
  if (fn) {
    const result = await fn(data);
    const text: string = result?.text || '';
    const normalized = normalizeExtracted(text);
    if (normalized.length < 10) {
      throw new Error('Extracted text too short or PDF may be image-based. Provide a selectable-text PDF.');
    }
    return normalized;
  }

  const PDFParseClass = pdfParseMod?.PDFParse;
  if (typeof PDFParseClass === 'function') {
    const parser = new PDFParseClass(data);
    await parser.load();
    const result = await parser.getText();
    const text: string = result?.text || '';
    const normalized = normalizeExtracted(text);
    if (normalized.length < 10) {
      throw new Error('Extracted text too short or PDF may be image-based. Provide a selectable-text PDF.');
    }
    return normalized;
  }

  console.error('pdf-parse export keys:', Object.keys(pdfParseMod || {}));
  throw new Error('Unsupported pdf-parse export shape. Consider reinstalling pdf-parse.');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    if (!file) return NextResponse.json({ ok: false, error: 'No PDF file provided' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const text = await extractTextFromPDF(arrayBuffer);

    const dominantLanguage = detectLanguage(text);
    const sample = text.slice(0, 600);

    return NextResponse.json({
      ok: true,
      length: text.length,
      dominantLanguage,
      sample,
      extractor: 'pdf-parse',
    });
  } catch (e: any) {
    console.error('Test-read failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to read PDF' }, { status: 500 });
  }
}
