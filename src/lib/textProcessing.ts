export interface TextChunk {
  text: string;
  page: number;
  length: number;
}

export function cleanAndProcessText(rawText: string): string {
  let text = rawText;
  
  // Remove excessive whitespace and normalize
  text = text
    .replace(/\s+/g, ' ')           // Multiple spaces to single space
    .replace(/\n+/g, ' ')           // Multiple newlines to space
    .replace(/\r+/g, ' ')           // Carriage returns to space
    .replace(/\t+/g, ' ')           // Tabs to space
    .trim();

  // Remove common PDF artifacts
  text = text
    .replace(/\f/g, ' ')            // Form feed characters
    .replace(/[\u0000-\u001F]/g, ' ') // Control characters
    .replace(/\u00A0/g, ' ')        // Non-breaking spaces
    .replace(/\u2022/g, '• ')       // Bullet points
    .replace(/\u2013/g, '-')        // En dash
    .replace(/\u2014/g, '--')       // Em dash
    .replace(/\u201C|\u201D/g, '"') // Smart quotes
    .replace(/\u2018|\u2019/g, "'") // Smart apostrophes

  // Clean up punctuation for better speech
  text = text
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after sentence endings
    .replace(/([,;:])\s*/g, '$1 ')          // Ensure space after commas, semicolons, colons
    .replace(/\s+([.!?,:;])/g, '$1')        // Remove space before punctuation
    .replace(/\.{3,}/g, '...')              // Normalize ellipsis
    .replace(/\s+/g, ' ')                   // Final cleanup of multiple spaces

  return text;
}

export function splitTextIntoChunks(text: string, maxChunkSize: number = 4000): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // Try to split by paragraphs first
  const paragraphs = text.split(/\.\s+(?=[A-Z])/);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const cleanParagraph = paragraph.trim();
    
    // If adding this paragraph would exceed the limit, start a new chunk
    if (currentChunk.length + cleanParagraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        page: chunkIndex + 1,
        length: currentChunk.length
      });
      currentChunk = cleanParagraph;
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + cleanParagraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      page: chunkIndex + 1,
      length: currentChunk.length
    });
  }
  
  // If we still have chunks that are too large, split them by sentences
  const finalChunks: TextChunk[] = [];
  
  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      // Split large chunks by sentences
      const sentences = chunk.text.split(/(?<=[.!?])\s+/);
      let subChunk = '';
      let subChunkIndex = chunk.page;
      
      for (const sentence of sentences) {
        if (subChunk.length + sentence.length > maxChunkSize && subChunk.length > 0) {
          finalChunks.push({
            text: subChunk.trim(),
            page: subChunkIndex,
            length: subChunk.length
          });
          subChunk = sentence;
          subChunkIndex++;
        } else {
          subChunk += (subChunk ? ' ' : '') + sentence;
        }
      }
      
      if (subChunk.trim()) {
        finalChunks.push({
          text: subChunk.trim(),
          page: subChunkIndex,
          length: subChunk.length
        });
      }
    }
  }
  
  return finalChunks;
}

export function optimizeTextForSpeech(text: string): string {
  let optimized = text;
  
  // ADVANCED HUMAN-LIKE SPEECH PROCESSING
  
  // 1. Add natural breathing patterns and realistic pauses
  optimized = optimized
    // Long pauses for dramatic effect and natural breathing
    .replace(/([.!?])\s+([A-Z])/g, '$1... $2')           // Sentence endings with breathing pause
    .replace(/([.!?])\s*$/gm, '$1...')                   // End of paragraphs with longer pause
    
    // Natural comma pauses (shorter but noticeable)
    .replace(/,\s+/g, ', ')                              // Comma with natural pause
    .replace(/;\s+/g, '; ')                              // Semicolon pause
    .replace(/:\s+/g, ': ')                              // Colon pause
    
    // Paragraph and section breaks with breathing
    .replace(/\n\n+/g, '... ')                           // Paragraph breaks
    .replace(/\n+/g, ' ')                                // Line breaks to spaces
    
    // Add emphasis pauses around important content
    .replace(/\b(however|therefore|furthermore|moreover|nevertheless)\b/gi, '... $1 ...')
    .replace(/\b(first|second|third|finally|lastly)\b/gi, '$1,')
    .replace(/\b(in conclusion|to summarize|in summary)\b/gi, '... $1 ...')
    
  // 2. Advanced number and abbreviation handling for natural speech
  optimized = optimized
    // Percentages and measurements
    .replace(/\b(\d+)%/g, '$1 percent')
    .replace(/\b(\d+)\s*°C/g, '$1 degrees Celsius')
    .replace(/\b(\d+)\s*°F/g, '$1 degrees Fahrenheit')
    .replace(/\b(\d+)\s*km/g, '$1 kilometers')
    .replace(/\b(\d+)\s*mph/g, '$1 miles per hour')
    .replace(/\b(\d+)\s*GB/g, '$1 gigabytes')
    .replace(/\b(\d+)\s*MB/g, '$1 megabytes')
    
    // Years and dates (more natural)
    .replace(/\b(19|20)(\d{2})\b/g, (match, century, year) => {
      const fullYear = century + year;
      if (parseInt(fullYear) >= 1900 && parseInt(fullYear) <= 2099) {
        return fullYear; // Let TTS handle naturally
      }
      return match;
    })
    
    // Time expressions
    .replace(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi, '$1 $2 $3')
    .replace(/\b(\d{1,2}):(\d{2})\b/g, '$1 $2')
    
    // Money and currency
    .replace(/\$(\d+)/g, '$1 dollars')
    .replace(/£(\d+)/g, '$1 pounds')
    .replace(/€(\d+)/g, '$1 euros')
    
    // Professional titles and honorifics
    .replace(/\bDr\./g, 'Doctor')
    .replace(/\bMr\./g, 'Mister')
    .replace(/\bMrs\./g, 'Missus')
    .replace(/\bMs\./g, 'Miss')
    .replace(/\bProf\./g, 'Professor')
    .replace(/\bSt\./g, 'Saint')
    .replace(/\bLt\./g, 'Lieutenant')
    .replace(/\bSgt\./g, 'Sergeant')
    
    // Common abbreviations with natural pronunciation
    .replace(/\betc\./g, 'etcetera')
    .replace(/\bi\.e\./g, 'that is')
    .replace(/\be\.g\./g, 'for example')
    .replace(/\bvs\./g, 'versus')
    .replace(/\bw\/\b/g, 'with')
    .replace(/\bw\/o\b/g, 'without')
    .replace(/\b&\b/g, 'and')
    .replace(/\b@\b/g, 'at')
    .replace(/\b#\b/g, 'number')
    
    // Geographic locations
    .replace(/\bU\.S\./g, 'United States')
    .replace(/\bU\.K\./g, 'United Kingdom')
    .replace(/\bU\.S\.A\./g, 'United States of America')
    .replace(/\bN\.Y\./g, 'New York')
    .replace(/\bL\.A\./g, 'Los Angeles')
    
    // Technical terms and acronyms (spelled out for clarity)
    .replace(/\bCEO\b/g, 'C E O')
    .replace(/\bCTO\b/g, 'C T O')
    .replace(/\bCFO\b/g, 'C F O')
    .replace(/\bAPI\b/g, 'A P I')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\bML\b/g, 'M L')
    .replace(/\bPDF\b/g, 'P D F')
    .replace(/\bURL\b/g, 'U R L')
    .replace(/\bHTML\b/g, 'H T M L')
    .replace(/\bCSS\b/g, 'C S S')
    .replace(/\bJS\b/g, 'JavaScript')
    .replace(/\bSQL\b/g, 'S Q L')
    .replace(/\bXML\b/g, 'X M L')
    .replace(/\bJSON\b/g, 'J S O N')
    .replace(/\bHTTP\b/g, 'H T T P')
    .replace(/\bHTTPS\b/g, 'H T T P S')
    .replace(/\bFTP\b/g, 'F T P')
    .replace(/\bSSH\b/g, 'S S H')
    .replace(/\bVPN\b/g, 'V P N')
    .replace(/\bWiFi\b/g, 'Wi Fi')
    .replace(/\bBluetooth\b/g, 'Bluetooth')
    .replace(/\bUSB\b/g, 'U S B')
    .replace(/\bSSD\b/g, 'S S D')
    .replace(/\bHDD\b/g, 'H D D')
    .replace(/\bRAM\b/g, 'R A M')
    .replace(/\bCPU\b/g, 'C P U')
    .replace(/\bGPU\b/g, 'G P U')
    
  // 3. Advanced human-like speech patterns and emotional cues
  optimized = optimized
    // Natural emphasis and intonation
    .replace(/\*\*(.*?)\*\*/g, '$1')                    // Remove markdown bold but keep emphasis
    .replace(/\*(.*?)\*/g, '$1')                        // Remove markdown italic
    .replace(/`(.*?)`/g, '$1')                          // Remove code formatting
    .replace(/\[(.*?)\]/g, '$1')                        // Remove brackets but keep content
    .replace(/\((.*?)\)/g, ', $1,')                     // Convert parentheses to natural pauses
    
    // Add emotional inflection for questions and exclamations
    .replace(/\?/g, '?')                                // Keep question marks for rising intonation
    .replace(/!/g, '!')                                 // Keep exclamation marks for emphasis
    
    // Natural speech patterns for lists and enumerations
    .replace(/(\d+)\.\s+/g, '$1. ')                     // Numbered lists with pause
    .replace(/•\s+/g, '• ')                             // Bullet points with pause
    .replace(/\-\s+/g, '- ')                            // Dash lists with pause
    
    // Add natural hesitation and thinking patterns
    .replace(/\b(well|um|uh|you know|I mean)\b/gi, '$1,') // Natural hesitations
    .replace(/\b(actually|basically|essentially|literally)\b/gi, '$1,') // Filler words
    
    // Conversational connectors with natural pauses
    .replace(/\b(now|so|then|next|after that|meanwhile)\b/gi, '... $1,')
    .replace(/\b(on the other hand|in contrast|alternatively)\b/gi, '... $1 ...')
    
    // Add breathing spaces for long sentences (every 15-20 words)
    .replace(/(\S+(?:\s+\S+){14,19})\s+/g, '$1 ... ')
    
  // 4. Professional audiobook-style improvements
  optimized = optimized
    // Chapter and section markers
    .replace(/\bChapter\s+(\d+)/gi, 'Chapter $1.')
    .replace(/\bSection\s+(\d+)/gi, 'Section $1.')
    .replace(/\bPart\s+(\d+)/gi, 'Part $1.')
    
    // Quote handling for natural speech
    .replace(/"/g, '')                                  // Remove quotes for natural flow
    .replace(/'/g, "'")                                 // Normalize apostrophes
    
    // Mathematical and scientific expressions
    .replace(/\b(\d+)\s*\+\s*(\d+)/g, '$1 plus $2')
    .replace(/\b(\d+)\s*\-\s*(\d+)/g, '$1 minus $2')
    .replace(/\b(\d+)\s*\*\s*(\d+)/g, '$1 times $2')
    .replace(/\b(\d+)\s*\/\s*(\d+)/g, '$1 divided by $2')
    .replace(/\b(\d+)\s*=\s*(\d+)/g, '$1 equals $2')
    .replace(/\b(\d+)\s*>\s*(\d+)/g, '$1 is greater than $2')
    .replace(/\b(\d+)\s*<\s*(\d+)/g, '$1 is less than $2')
    
  // 5. Final cleanup and normalization for maximum naturalness
  optimized = optimized
    .replace(/\s+/g, ' ')                               // Multiple spaces to single space
    .replace(/\.{3,}/g, '...')                          // Normalize ellipsis
    .replace(/([.!?])\s*([.!?])+/g, '$1')               // Remove duplicate punctuation
    .replace(/,\s*,+/g, ',')                            // Remove duplicate commas
    .replace(/\.\s*\./g, '.')                           // Remove duplicate periods
    
    // Final breathing and pacing adjustments
    .replace(/\.\.\.\s*\.\.\./g, '...')                 // Normalize multiple ellipses
    .replace(/,\s*\.\.\./g, '...')                      // Clean comma-ellipsis combinations
    .replace(/\s+\.\.\./g, '...')                       // Clean space-ellipsis combinations
    
  return optimized.trim();
}
