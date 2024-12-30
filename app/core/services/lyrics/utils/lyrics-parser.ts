import * as cheerio from 'cheerio';
import type { BasicAcceptedElems, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

import { GeniusApiError } from '~/core/errors/ApiError';
import type { LyricsSection } from '~/core/domain/Lyrics';

const SELECTORS = {
  LYRICS_CONTAINER: '#lyrics-root-pin-spacer',
  LYRICS_FOOTER: '[class*="LyricsFooter" i]'
} as const;

const PATTERNS = {
  SECTION: /\[(.*?)(?::|])/g
} as const;

export class LyricsParser {
  static parse(html: string): LyricsSection[] {
    const $ = cheerio.load(html);
    $(SELECTORS.LYRICS_FOOTER).remove();
    const lyricsContainer = $(SELECTORS.LYRICS_CONTAINER);
    const content = lyricsContainer.html() || "";

    if (!content) {
      throw new GeniusApiError(
        'Failed to parse lyrics content from Genius API response',
        422,
        { selector: SELECTORS.LYRICS_CONTAINER }
      );
    }

    return this.findSections(content);
  }

  private static findSections(content: string): LyricsSection[] {
    const sections: LyricsSection[] = [];
    const sectionMatches = content.matchAll(PATTERNS.SECTION);
    let lastIndex = 0;

    for (const match of sectionMatches) {
      const sectionStartIndex = match.index!;
      const sectionEndIndex = content.indexOf('[', sectionStartIndex + 1);

      // If this is not the first section and there's content before it,
      // treat it as an untitled section
      if (sectionStartIndex > lastIndex && lastIndex > 0) {
        const untitledContent = content.slice(lastIndex, sectionStartIndex);
        if (untitledContent.trim()) {
          sections.push({
            type: 'Lyrics',
            lines: this.processSection(untitledContent, { type: 'Lyrics', startIndex: lastIndex, annotationLinks: {} }),
            annotationLinks: {}
          });
        }
      }

      const sectionContent = sectionEndIndex === -1
        ? content.slice(sectionStartIndex)
        : content.slice(sectionStartIndex, sectionEndIndex);

      const section = {
        type: match[1].trim(),
        startIndex: sectionStartIndex,
        annotationLinks: {} as Record<string, number[]>
      };

      const lines = this.processSection(sectionContent, section);
      if (lines.length > 0) {
        sections.push({
          type: section.type,
          lines,
          annotationLinks: section.annotationLinks
        });
      }

      lastIndex = sectionEndIndex === -1 ? content.length : sectionEndIndex;
    }

    // If there's any remaining content after the last section, add it
    if (lastIndex < content.length) {
      const remainingContent = content.slice(lastIndex);
      if (remainingContent.trim()) {
        sections.push({
          type: 'Lyrics',
          lines: this.processSection(remainingContent, { type: 'Lyrics', startIndex: lastIndex, annotationLinks: {} }),
          annotationLinks: {}
        });
      }
    }

    return sections;
  }

  private static processSection(content: string, section: { type: string; startIndex: number; annotationLinks: Record<string, number[]> }) {
    const $ = cheerio.load(content);
    const lines: { id: number; text: string }[] = [];
    const claimedLines = new Set<number>();
    const lineMap = new Map<number, string>();
    let lineCounter = 1;

    // Process annotation links first
    $('a[class^="ReferentFragment"]').each((_, element) => {
      const url = $(element).attr('href');
      if (!url) return;

      if (!section.annotationLinks[url]) {
        section.annotationLinks[url] = [];
      }

      const textNodes = this.extractTextNodes($, element);
      const lineTexts = textNodes.split('\n').filter(line => line.trim());

      this.mapLinesToAnnotations(lineTexts, lineCounter, url, section, claimedLines, lineMap);
      lineCounter += lineTexts.length;
    });

    // Process remaining text
    const remainingLines = $('div[class^="Lyrics__Container"]')
      .contents()
      .filter((_, node) => {
        const isText = node.type === 'text';
        const isBreak = node.type === 'tag' && node.name === 'br';
        const isNotAnnotation = !$(node).find('a[class^="ReferentFragment"]').length;
        return (isText || isBreak) && isNotAnnotation;
      })
      .map((_, node) => {
        if (node.type === 'text') return $(node).text().trim();
        if (node.type === 'tag' && node.name === 'br') return '\n';
        return '';
      })
      .get()
      .join('')
      .split('\n')
      .filter(line => line.trim());

    remainingLines.forEach(lineText => {
      if (!lineMap.has(lineCounter)) {
        lineMap.set(lineCounter, lineText);
      }
      lineCounter++;
    });

    // Build final lines array
    for (let i = 1; i < lineCounter; i++) {
      const text = lineMap.get(i);
      if (text) {
        lines.push({ id: i, text });
      }
    }

    return lines;
  }

  private static extractTextNodes($: CheerioAPI, element: BasicAcceptedElems<Element>): string {
    return $(element).find('span').contents().map((_, node) => {
      if (node.type === 'text') return $(node).text().trim();
      if (node.type === 'tag' && node.name === 'br') return '\n';
      if (node.type === 'tag' && node.name === 'i') return $(node).text().trim();
      return '';
    }).get().join('');
  }

  private static mapLinesToAnnotations(
    lineTexts: string[],
    currentLineCounter: number,
    url: string,
    section: { annotationLinks: Record<string, number[]> },
    claimedLines: Set<number>,
    lineMap: Map<number, string>
  ) {
    lineTexts.forEach((lineText, i) => {
      const lineIndex = currentLineCounter + i;
      lineMap.set(lineIndex, lineText);

      if (!claimedLines.has(lineIndex)) {
        section.annotationLinks[url].push(lineIndex);
        claimedLines.add(lineIndex);
      }
    });
  }
}
