const express = require('express');
const router = express.Router();

const BlockchainService = require('../services/blockchainService');
const blockchainService = new BlockchainService();

/**
 * GET /api/reputation/:pseudonymousId
 * Get reputation for a pseudonymous whistleblower
 */
router.get('/:pseudonymousId', async (req, res) => {
  try {
    const { pseudonymousId } = req.params;

    const reputation = await blockchainService.getReputation(pseudonymousId);

    // Calculate additional metrics
    const validationRate = reputation.totalSubmissions > 0
      ? (parseInt(reputation.validatedSubmissions) / parseInt(reputation.totalSubmissions) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      pseudonymousId,
      reputation: {
        ...reputation,
        validationRate: `${validationRate}%`,
        credibilityLevel: getCredibilityLevel(parseInt(reputation.trustScore))
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get reputation',
      message: error.message
    });
  }
});

/**
 * POST /api/reputation/lookup
 * Look up reputation by secret phrase
 */
router.post('/lookup', async (req, res) => {
  try {
    const { secret } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'Secret phrase required' });
    }

    const pseudonymousId = blockchainService.generatePseudonymousId(secret);
    const reputation = await blockchainService.getReputation(pseudonymousId);

    const validationRate = reputation.totalSubmissions > 0
      ? (parseInt(reputation.validatedSubmissions) / parseInt(reputation.totalSubmissions) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      pseudonymousId,
      reputation: {
        ...reputation,
        validationRate: `${validationRate}%`,
        credibilityLevel: getCredibilityLevel(parseInt(reputation.trustScore))
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to lookup reputation',
      message: error.message
    });
  }
});

/**
 * GET /api/reputation/leaderboard
 * Get top whistleblowers by trust score (anonymously)
 */
router.get('/leaderboard/top', async (req, res) => {
  try {
    const { limit } = req.query;
    const maxResults = Math.min(parseInt(limit) || 10, 50);

    // This would require indexing in production
    // For now, return a placeholder
    res.json({
      success: true,
      message: 'Leaderboard feature requires event indexing',
      note: 'Deploy a subgraph or use event listening for production'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get leaderboard',
      message: error.message
    });
  }
});

/**
 * POST /api/reputation/generate-id
 * Generate a pseudonymous ID from a secret (without revealing submissions)
 */
router.post('/generate-id', async (req, res) => {
  try {
    const { secret } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'Secret phrase required' });
    }

    if (secret.length < 12) {
      return res.status(400).json({ 
        error: 'Secret phrase too short',
        message: 'Use at least 12 characters for security'
      });
    }

    const pseudonymousId = blockchainService.generatePseudonymousId(secret);

    res.json({
      success: true,
      pseudonymousId,
      message: 'Store your secret phrase securely. It cannot be recovered.',
      warning: 'Never share your secret phrase. Anyone with it can claim your reputation.'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate ID',
      message: error.message
    });
  }
});

// Helper function to determine credibility level
function getCredibilityLevel(trustScore) {
  if (trustScore >= 90) return { level: 'Exemplary', badge: '🏆' };
  if (trustScore >= 75) return { level: 'Highly Trusted', badge: '⭐' };
  if (trustScore >= 50) return { level: 'Trusted', badge: '✓' };
  if (trustScore >= 25) return { level: 'Building Trust', badge: '📈' };
  if (trustScore > 0) return { level: 'New', badge: '🆕' };
  return { level: 'No History', badge: '❓' };
}

module.exports = router;
