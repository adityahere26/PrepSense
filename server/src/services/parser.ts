import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  const extension = originalName.split('.').pop()?.toLowerCase();

  let rawText = '';

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    try {
      const parseFunc = (pdfParse as any).default || pdfParse;
      const data = await parseFunc(fileBuffer);
      rawText = data.text;
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupt or unreadable PDF file'}`);
    }
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx' ||
    extension === 'doc'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = result.value;
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message || 'Corrupt or unreadable DOCX file'}`);
    }
  } else {
    throw new Error('Unsupported file type. Please upload a PDF (.pdf) or Word document (.docx).');
  }

  const cleanedText = rawText.trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  if (!cleanedText || cleanedText.length < 20) {
    throw new Error(
      'Could not extract sufficient text from the uploaded file. Please ensure the document is not an image-only scan or empty.'
    );
  }

  return cleanedText;
}
