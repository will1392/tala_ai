/**
 * Mock Translation Service
 * 
 * Simulates translation API for testing without API keys
 */

class MockTranslation {
  constructor() {
    this.translatedCount = 0;
    this.supportedLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 
      'ja', 'ko', 'zh', 'ar', 'hi', 'tr', 'pl', 'sv'
    ];
    
    // Sample translations for common travel phrases
    this.translations = {
      passport: {
        en: 'passport',
        es: 'pasaporte',
        fr: 'passeport',
        de: 'Reisepass',
        it: 'passaporto',
        pt: 'passaporte',
        ja: 'パスポート',
        zh: '护照'
      },
      flight: {
        en: 'flight',
        es: 'vuelo',
        fr: 'vol',
        de: 'Flug',
        it: 'volo',
        pt: 'voo',
        ja: 'フライト',
        zh: '航班'
      },
      hotel: {
        en: 'hotel',
        es: 'hotel',
        fr: 'hôtel',
        de: 'Hotel',
        it: 'hotel',
        pt: 'hotel',
        ja: 'ホテル',
        zh: '酒店'
      },
      booking: {
        en: 'booking',
        es: 'reserva',
        fr: 'réservation',
        de: 'Buchung',
        it: 'prenotazione',
        pt: 'reserva',
        ja: '予約',
        zh: '预订'
      }
    };
  }

  /**
   * Detect language of text
   * @param {string} text - Text to analyze
   * @returns {Object} Language detection result
   */
  async detectLanguage(text) {
    await this.simulateDelay(100, 300);
    
    const languagePatterns = {
      en: /\b(the|and|of|to|in|is|for|with)\b/gi,
      es: /\b(el|la|de|y|en|es|por|con)\b/gi,
      fr: /\b(le|la|de|et|en|est|pour|avec)\b/gi,
      de: /\b(der|die|das|und|in|ist|für|mit)\b/gi,
      it: /\b(il|la|di|e|in|è|per|con)\b/gi,
      pt: /\b(o|a|de|e|em|é|para|com)\b/gi,
      ja: /[\u3040-\u309f\u30a0-\u30ff]/,
      zh: /[\u4e00-\u9fff]/,
      ar: /[\u0600-\u06ff]/
    };
    
    let detectedLang = 'en';
    let highestScore = 0;
    let alternatives = [];
    
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      const matches = text.match(pattern);
      const score = matches ? matches.length : 0;
      
      if (score > highestScore) {
        highestScore = score;
        detectedLang = lang;
      }
      
      if (score > 0) {
        alternatives.push({ language: lang, confidence: Math.min(score / 20, 0.95) });
      }
    }
    
    // Sort alternatives by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);
    
    return {
      language: detectedLang,
      confidence: Math.min(highestScore / 20, 0.98),
      alternatives: alternatives.slice(0, 3),
      isReliable: highestScore > 5
    };
  }

  /**
   * Translate text between languages
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {Object} Translation result
   */
  async translateText(text, sourceLang, targetLang) {
    await this.simulateDelay(200, 800);
    
    this.translatedCount++;
    
    // Check if languages are supported
    if (!this.supportedLanguages.includes(sourceLang) || 
        !this.supportedLanguages.includes(targetLang)) {
      throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
    }
    
    // If same language, return original
    if (sourceLang === targetLang) {
      return {
        translatedText: text,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: 1.0,
        cached: true
      };
    }
    
    // Simple mock translation
    let translatedText = text;
    
    // Replace known travel terms
    for (const [term, translations] of Object.entries(this.translations)) {
      if (translations[sourceLang] && translations[targetLang]) {
        const regex = new RegExp(`\\b${translations[sourceLang]}\\b`, 'gi');
        translatedText = translatedText.replace(regex, translations[targetLang]);
      }
    }
    
    // Add language markers for demonstration
    if (targetLang !== 'en') {
      translatedText = `[${targetLang.toUpperCase()}] ${translatedText}`;
    }
    
    // Simulate common translations
    const commonTranslations = {
      'en->es': {
        'Date': 'Fecha',
        'Name': 'Nombre',
        'Number': 'Número',
        'From': 'Desde',
        'To': 'Hasta',
        'Departure': 'Salida',
        'Arrival': 'Llegada'
      },
      'en->fr': {
        'Date': 'Date',
        'Name': 'Nom',
        'Number': 'Numéro',
        'From': 'De',
        'To': 'À',
        'Departure': 'Départ',
        'Arrival': 'Arrivée'
      },
      'en->de': {
        'Date': 'Datum',
        'Name': 'Name',
        'Number': 'Nummer',
        'From': 'Von',
        'To': 'Nach',
        'Departure': 'Abfahrt',
        'Arrival': 'Ankunft'
      }
    };
    
    const translationKey = `${sourceLang}->${targetLang}`;
    if (commonTranslations[translationKey]) {
      for (const [original, translated] of Object.entries(commonTranslations[translationKey])) {
        translatedText = translatedText.replace(new RegExp(`\\b${original}\\b`, 'g'), translated);
      }
    }
    
    return {
      translatedText,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      confidence: 0.85 + Math.random() * 0.13, // 0.85-0.98
      alternatives: [],
      processingTime: Math.random() * 500 + 200
    };
  }

  /**
   * Batch translate multiple texts
   * @param {Array} texts - Array of texts to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @returns {Array} Translation results
   */
  async batchTranslate(texts, sourceLang, targetLang) {
    const results = [];
    
    for (const text of texts) {
      try {
        const result = await this.translateText(text, sourceLang, targetLang);
        results.push({ 
          original: text, 
          translation: result.translatedText,
          confidence: result.confidence 
        });
      } catch (error) {
        results.push({ 
          original: text, 
          error: error.message,
          translation: null 
        });
      }
    }
    
    return results;
  }

  /**
   * Get supported languages
   * @returns {Array} Supported language codes
   */
  getSupportedLanguages() {
    return this.supportedLanguages.map(code => ({
      code,
      name: this.getLanguageName(code),
      nativeName: this.getNativeLanguageName(code)
    }));
  }

  /**
   * Get language name in English
   * @param {string} code - Language code
   * @returns {string} Language name
   */
  getLanguageName(code) {
    const names = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      ru: 'Russian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      ar: 'Arabic',
      hi: 'Hindi',
      tr: 'Turkish',
      pl: 'Polish',
      sv: 'Swedish'
    };
    return names[code] || code;
  }

  /**
   * Get language name in native language
   * @param {string} code - Language code
   * @returns {string} Native language name
   */
  getNativeLanguageName(code) {
    const names = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      nl: 'Nederlands',
      ru: 'Русский',
      ja: '日本語',
      ko: '한국어',
      zh: '中文',
      ar: 'العربية',
      hi: 'हिन्दी',
      tr: 'Türkçe',
      pl: 'Polski',
      sv: 'Svenska'
    };
    return names[code] || code;
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      translatedCount: this.translatedCount,
      supportedLanguages: this.supportedLanguages.length,
      averageConfidence: 0.91,
      cachingEnabled: true,
      mockService: true
    };
  }

  /**
   * Simulate processing delay
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  async simulateDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Reset service statistics
   */
  reset() {
    this.translatedCount = 0;
  }
}

export default MockTranslation;