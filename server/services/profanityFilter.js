/**
 * TARS Profanity Filter
 * Filters comments against a list of prohibited words
 */

const fs = require('fs');
const path = require('path');

class ProfanityFilter {
  constructor() {
    this.prohibitedWords = new Set();
    this.loadProhibitedWords();
  }

  /**
   * Load prohibited words from en.txt file
   */
  loadProhibitedWords() {
    try {
      const filePath = path.join(__dirname, '..', '..', 'en.txt');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Split by newlines and clean up each word
      const words = content
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
      
      this.prohibitedWords = new Set(words);
      console.log(`📝 Loaded ${this.prohibitedWords.size} prohibited words`);
    } catch (error) {
      console.error('Error loading prohibited words:', error.message);
      // Initialize with empty set if file not found
      this.prohibitedWords = new Set();
    }
  }

  /**
   * Check if text contains any prohibited words
   * @param {string} text - The text to check
   * @returns {{ isClean: boolean, foundWords: string[] }}
   */
  check(text) {
    if (!text || typeof text !== 'string') {
      return { isClean: true, foundWords: [] };
    }

    const normalizedText = text.toLowerCase();
    const foundWords = [];

    // Check for each prohibited word
    for (const word of this.prohibitedWords) {
      // Create a regex that matches the word with word boundaries
      // This prevents matching partial words (e.g., "class" shouldn't match "ass")
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
      
      if (regex.test(normalizedText)) {
        foundWords.push(word);
      }
    }

    // Also check for l33t speak and character substitutions
    const leetConverted = this.convertLeetSpeak(normalizedText);
    if (leetConverted !== normalizedText) {
      for (const word of this.prohibitedWords) {
        const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
        if (regex.test(leetConverted) && !foundWords.includes(word)) {
          foundWords.push(word);
        }
      }
    }

    return {
      isClean: foundWords.length === 0,
      foundWords
    };
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Convert common l33t speak substitutions to letters
   */
  convertLeetSpeak(text) {
    return text
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/@/g, 'a')
      .replace(/\$/g, 's')
      .replace(/!/g, 'i');
  }

  /**
   * Clean text by replacing prohibited words with asterisks (optional alternative to blocking)
   */
  censor(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let censored = text;
    
    for (const word of this.prohibitedWords) {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      censored = censored.replace(regex, '*'.repeat(word.length));
    }

    return censored;
  }

  /**
   * Get the count of loaded prohibited words
   */
  getWordCount() {
    return this.prohibitedWords.size;
  }

  /**
   * Reload prohibited words from file
   */
  reload() {
    this.loadProhibitedWords();
  }
}

// Singleton instance
const profanityFilter = new ProfanityFilter();

module.exports = profanityFilter;
