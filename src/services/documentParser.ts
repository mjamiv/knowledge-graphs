import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { DocumentInfo } from '../types';

// Configure PDF.js worker - use unpkg CDN for better reliability
// The version must match exactly with the installed pdfjs-dist package
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Parse a document file and extract its text content
 */
export async function parseDocument(file: File): Promise<DocumentInfo> {
  const fileType = getFileType(file.name);

  let content = '';
  let pageCount: number | undefined;

  switch (fileType) {
    case 'pdf':
      const pdfResult = await parsePDF(file);
      content = pdfResult.content;
      pageCount = pdfResult.pageCount;
      break;

    case 'docx':
      content = await parseDOCX(file);
      break;

    case 'txt':
    case 'md':
      content = await parseText(file);
      break;

    default:
      throw new Error(`Unsupported file type: ${file.name}`);
  }

  return {
    name: file.name,
    type: fileType,
    size: file.size,
    content: content.trim(),
    pageCount,
  };
}

/**
 * Determine file type from filename
 */
function getFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'md' {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'md':
    case 'markdown':
      return 'md';
    case 'txt':
    default:
      return 'txt';
  }
}

/**
 * Parse PDF file using PDF.js
 */
async function parsePDF(file: File): Promise<{ content: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join(' ');

    textParts.push(pageText);
  }

  return {
    content: textParts.join('\n\n'),
    pageCount: pdf.numPages,
  };
}

/**
 * Parse DOCX file using Mammoth
 */
async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parse plain text or markdown file
 */
async function parseText(file: File): Promise<string> {
  return await file.text();
}

/**
 * Chunk text into smaller pieces for processing
 */
export function chunkText(text: string, maxChunkSize: number = 4000, overlap: number = 200): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If paragraph itself is too long, split by sentences
    if (paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let sentenceChunk = '';

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
          }
          sentenceChunk = sentence;
        } else {
          sentenceChunk += ' ' + sentence;
        }
      }

      if (sentenceChunk) {
        chunks.push(sentenceChunk.trim());
      }
    } else if (currentChunk.length + paragraph.length > maxChunkSize) {
      chunks.push(currentChunk.trim());
      // Add overlap from previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}
