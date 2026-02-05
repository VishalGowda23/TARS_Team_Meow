/**
 * In-memory Evidence Store with File Persistence
 * For hackathon demo purposes - stores submissions that can be seen by all validators
 * Persists to JSON file to survive server restarts
 */

const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '../data/evidence-store.json');

class EvidenceStore {
  constructor() {
    // Singleton pattern
    if (EvidenceStore.instance) {
      return EvidenceStore.instance;
    }
    
    this.submissions = new Map();
    this.validations = new Map(); // Track who has validated what
    
    // Load from file if exists
    this._loadFromFile();
    
    EvidenceStore.instance = this;
  }

  _loadFromFile() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      if (fs.existsSync(STORE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
        this.submissions = new Map(data.submissions || []);
        this.validations = new Map(data.validations || []);
        console.log(`Loaded ${this.submissions.size} submissions from store`);
      }
    } catch (err) {
      console.warn('Could not load evidence store:', err.message);
    }
  }

  _saveToFile() {
    try {
      const dataDir = path.dirname(STORE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const data = {
        submissions: Array.from(this.submissions.entries()),
        validations: Array.from(this.validations.entries())
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('Could not save evidence store:', err.message);
    }
  }

  /**
   * Add a new submission
   */
  addSubmission(submission) {
    const submissionData = {
      ...submission,
      createdAt: new Date().toISOString(),
      currentSignatures: 0,
      requiredSignatures: 3,
      validators: [],
      status: 'orbiting'
    };
    
    this.submissions.set(submission.id, submissionData);
    this._saveToFile(); // Persist to disk
    return submissionData;
  }

  /**
   * Get a submission by ID
   */
  getSubmission(id) {
    return this.submissions.get(id);
  }

  /**
   * Get all submissions (for validation queue)
   */
  getAllSubmissions() {
    return Array.from(this.submissions.values());
  }

  /**
   * Get pending submissions (not yet fully validated)
   */
  getPendingSubmissions() {
    return this.getAllSubmissions().filter(
      s => s.currentSignatures < s.requiredSignatures
    );
  }

  /**
   * Add validation to a submission
   */
  validateSubmission(submissionId, validatorEmail, isValid, comment = '') {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Check if validator already validated this
    if (submission.validators.includes(validatorEmail)) {
      throw new Error('You have already validated this submission');
    }

    // Can't validate own submission
    if (submission.submittedBy === validatorEmail) {
      throw new Error('Cannot validate your own submission');
    }

    if (isValid) {
      submission.currentSignatures += 1;
      submission.validators.push(validatorEmail);
      
      // Update status if threshold reached
      if (submission.currentSignatures >= submission.requiredSignatures) {
        submission.status = 'verified';
      }
    }

    // Store validation record
    const validationKey = `${submissionId}-${validatorEmail}`;
    this.validations.set(validationKey, {
      submissionId,
      validatorEmail,
      isValid,
      comment,
      timestamp: new Date().toISOString()
    });

    this.submissions.set(submissionId, submission);
    this._saveToFile(); // Persist to disk
    return submission;
  }

  /**
   * Check if a validator has already validated a submission
   */
  hasValidated(submissionId, validatorEmail) {
    const submission = this.submissions.get(submissionId);
    return submission?.validators?.includes(validatorEmail) || false;
  }

  /**
   * Get validations for a submission
   */
  getValidations(submissionId) {
    const validations = [];
    for (const [key, value] of this.validations.entries()) {
      if (value.submissionId === submissionId) {
        validations.push(value);
      }
    }
    return validations;
  }

  /**
   * Update submission (for blockchain confirmation, etc.)
   */
  updateSubmission(id, updates) {
    const submission = this.submissions.get(id);
    if (submission) {
      this.submissions.set(id, { ...submission, ...updates });
      this._saveToFile(); // Persist to disk
      return this.submissions.get(id);
    }
    return null;
  }

  /**
   * Get stats
   */
  getStats() {
    const all = this.getAllSubmissions();
    return {
      total: all.length,
      pending: all.filter(s => s.status === 'orbiting').length,
      verified: all.filter(s => s.status === 'verified').length,
      totalValidations: this.validations.size
    };
  }
}

// Export singleton instance
module.exports = new EvidenceStore();
