
/**
 * Code Duplication Detector
 * Prevents code duplication by detecting similar code patterns
 */

/**
 * Interface for a code pattern
 */
export interface CodePattern {
  id: string;
  pattern: string;
  category: string;
  alternativeReference?: string;
  description?: string;
}

/**
 * Result of a duplication check
 */
export interface DuplicationCheckResult {
  isDuplicate: boolean;
  similarityScore: number; // 0-1
  matchedPattern?: CodePattern;
  suggestion?: string;
}

/**
 * Duplication detector for code patterns
 */
export class DuplicationDetector {
  private patterns: CodePattern[] = [];
  
  /**
   * Register a code pattern to detect
   */
  public registerPattern(pattern: CodePattern): void {
    this.patterns.push(pattern);
    console.log(`Registered pattern: ${pattern.id}`);
  }
  
  /**
   * Check code for duplications
   */
  public checkDuplication(code: string): DuplicationCheckResult {
    if (!code || typeof code !== 'string' || code.length < 10) {
      return {
        isDuplicate: false,
        similarityScore: 0
      };
    }
    
    // Normalize code for comparison
    const normalizedCode = this.normalizeCode(code);
    
    // Find the closest match
    let bestMatch: {
      pattern: CodePattern;
      score: number;
    } | null = null;
    
    for (const pattern of this.patterns) {
      const normalizedPattern = this.normalizeCode(pattern.pattern);
      const score = this.calculateSimilarity(normalizedCode, normalizedPattern);
      
      if (score > 0.8 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          pattern,
          score
        };
      }
    }
    
    // Return the result
    if (bestMatch) {
      return {
        isDuplicate: true,
        similarityScore: bestMatch.score,
        matchedPattern: bestMatch.pattern,
        suggestion: bestMatch.pattern.alternativeReference ?
          `Use ${bestMatch.pattern.alternativeReference} instead` : 
          'Consider refactoring to avoid duplication'
      };
    }
    
    return {
      isDuplicate: false,
      similarityScore: 0
    };
  }
  
  /**
   * Normalize code by removing whitespace, comments, etc.
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\/\/.*$/gm, '') // Remove single line comments
      .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b(const|let|var)\b/g, '') // Remove variable declarations
      .trim(); // Trim whitespace
  }
  
  /**
   * Calculate similarity between two strings
   * Uses a simplified version of Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    
    // For simplicity, we'll use a suboptimal but fast approach
    // For real implementation, use Levenshtein or better algorithms
    
    // Check if one is substring of the other
    if (str1.includes(str2)) {
      return str2.length / str1.length;
    }
    
    if (str2.includes(str1)) {
      return str1.length / str2.length;
    }
    
    // Calculate shared character sequences
    let commonChars = 0;
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length < str2.length ? str2 : str1;
    
    for (let i = 0; i < shorter.length; i++) {
      const char = shorter[i];
      if (longer.includes(char)) {
        commonChars++;
      }
    }
    
    return commonChars / longer.length;
  }
}
