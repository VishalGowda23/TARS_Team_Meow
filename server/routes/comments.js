/**
 * TARS Comments API Routes
 * Handles comments on evidence submissions
 */

const express = require('express');
const router = express.Router();
const commentStore = require('../services/commentStore');
const profanityFilter = require('../services/profanityFilter');

/**
 * POST /api/comments/:evidenceId
 * Add a comment to an evidence submission
 */
router.post('/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { content, author, authorEmail, pseudonymousId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 1000 characters'
      });
    }

    // Check for prohibited words
    const profanityCheck = profanityFilter.check(content);
    if (!profanityCheck.isClean) {
      console.log(`🚫 Comment blocked - prohibited content detected`);
      return res.status(400).json({
        success: false,
        error: 'Your comment contains prohibited words and cannot be posted. Please revise your message.'
      });
    }

    const comment = commentStore.addComment(evidenceId, {
      author,
      authorEmail,
      content: content.trim(),
      pseudonymousId
    });

    console.log(`💬 New comment on evidence ${evidenceId} by ${author || 'Anonymous'}`);

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

/**
 * GET /api/comments/:evidenceId
 * Get all comments for an evidence submission
 */
router.get('/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const comments = commentStore.getComments(evidenceId);

    res.json({
      success: true,
      evidenceId,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

/**
 * GET /api/comments
 * Get recent comments across all evidence (for activity feed)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const comments = commentStore.getRecentComments(limit);

    res.json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error('Error fetching recent comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent comments'
    });
  }
});

/**
 * DELETE /api/comments/:evidenceId/:commentId
 * Delete a comment (only by author)
 */
router.delete('/:evidenceId/:commentId', async (req, res) => {
  try {
    const { evidenceId, commentId } = req.params;
    const { authorEmail } = req.body;

    if (!authorEmail) {
      return res.status(400).json({
        success: false,
        error: 'Author email required for deletion'
      });
    }

    const deleted = commentStore.deleteComment(evidenceId, commentId, authorEmail);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
});

/**
 * PUT /api/comments/:evidenceId/:commentId
 * Edit a comment (only by author)
 */
router.put('/:evidenceId/:commentId', async (req, res) => {
  try {
    const { evidenceId, commentId } = req.params;
    const { content, authorEmail } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    if (!authorEmail) {
      return res.status(400).json({
        success: false,
        error: 'Author email required for editing'
      });
    }

    // Check for prohibited words
    const profanityCheck = profanityFilter.check(content);
    if (!profanityCheck.isClean) {
      console.log(`🚫 Comment edit blocked - prohibited content detected`);
      return res.status(400).json({
        success: false,
        error: 'Your comment contains prohibited words and cannot be posted. Please revise your message.'
      });
    }

    const comment = commentStore.editComment(evidenceId, commentId, authorEmail, content.trim());

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or unauthorized'
      });
    }

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit comment'
    });
  }
});

module.exports = router;
