export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Max 5MB
const MAX_SIZE = 5 * 1024 * 1024;

interface ScreenResponse {
  score: number;
  recommendation: string;
  reasons: string[];
  strengths: string[];
  gaps: string[];
  nextStep: string;
}

interface UploadCVResponse {
  ok: boolean;
  candidateName: string;
  score: number;
  recommendation: string;
  strengths: string[];
  gaps: string[];
  summary: string;
  resumeText: string;
}

function extractNameFromText(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // First non-empty line that looks like a name (2-4 words, not all caps header)
  for (const line of lines.slice(0, 5)) {
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4) {
      // Check it's title-cased or mixed case (not all uppercase header)
      const isAllCaps = line === line.toUpperCase() && line.length > 10;
      if (!isAllCaps && !/^\d/.test(line) && !line.includes('@') && !line.includes('http')) {
        return line;
      }
    }
  }
  return 'Candidate';
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid build issues with pdf-parse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse') as any;
  const pdfParse = mod.default ?? mod;
  const data = await pdfParse(buffer);
  return data.text || '';
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadCVResponse | { error: string }>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const jobTitle = formData.get('jobTitle') as string | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 });
    }

    const fileName = file.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = file.type || '';

    // Validate file type
    const isPDF = ext === 'pdf' || mimeType === 'application/pdf';
    const isDOCX =
      ext === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isTXT = ext === 'txt' || mimeType === 'text/plain';

    if (!isPDF && !isDOCX && !isTXT) {
      return NextResponse.json(
        { error: 'Only PDF, DOCX, and TXT files are supported' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let resumeText = '';

    if (isTXT) {
      resumeText = buffer.toString('utf-8');
    } else if (isPDF) {
      try {
        resumeText = await extractTextFromPDF(buffer);
      } catch (err) {
        console.error('[upload-cv] PDF extraction failed:', err);
        // Fallback: use filename as mock
        resumeText = `Resume from file: ${fileName}. Could not extract text content.`;
      }
    } else if (isDOCX) {
      try {
        resumeText = await extractTextFromDOCX(buffer);
      } catch (err) {
        console.error('[upload-cv] DOCX extraction failed:', err);
        resumeText = `Resume from file: ${fileName}. Could not extract text content.`;
      }
    }

    if (!resumeText.trim()) {
      resumeText = `Resume uploaded: ${fileName}. No text content could be extracted.`;
    }

    // Extract candidate name from text
    const candidateName = extractNameFromText(resumeText);

    // Call screen API
    const baseUrl = request.nextUrl.origin;
    let screenData: ScreenResponse | null = null;

    try {
      const screenRes = await fetch(`${baseUrl}/api/recruit/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          candidateName,
          resumeText,
          jobDescription: jobDescription || undefined,
          requirements: jobDescription
            ? jobDescription
                .split('\n')
                .map((l) => l.trim())
                .filter((l) => l.length > 5)
                .slice(0, 8)
            : [],
        }),
      });

      if (screenRes.ok) {
        screenData = (await screenRes.json()) as ScreenResponse;
      }
    } catch (err) {
      console.error('[upload-cv] Screen API call failed:', err);
    }

    // Build response
    const score = screenData?.score ?? 50;
    const recommendation = screenData?.recommendation ?? 'review';
    const strengths = screenData?.strengths ?? [];
    const gaps = screenData?.gaps ?? [];
    const summary = screenData?.nextStep ?? 'Review the candidate profile.';

    const recLabel =
      recommendation === 'advance'
        ? 'Hire'
        : recommendation === 'review'
        ? 'Consider'
        : 'Pass';

    return NextResponse.json({
      ok: true,
      candidateName,
      score,
      recommendation: recLabel,
      strengths,
      gaps,
      summary,
      resumeText: resumeText.slice(0, 5000), // cap for response size
    });
  } catch (err) {
    console.error('[upload-cv] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
