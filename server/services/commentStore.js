/**
 * TARS Comment Store
 * In-memory storage for comments on evidence submissions
 */

class CommentStore {
  constructor() {
    // Store comments by evidence ID
    this.comments = new Map();
    this.commentIdCounter = 1;
  }

  /**
   * Add a comment to an evidence submission
   */
  addComment(evidenceId, { author, authorEmail, content, pseudonymousId }) {
    const comment = {
      id: `comment-${this.commentIdCounter++}`,
      evidenceId,
      author: author || 'Anonymous',
      authorEmail: authorEmail || null,
      pseudonymousId: pseudonymousId || null,
      content,
      timestamp: new Date().toISOString(),
      edited: false
    };

    if (!this.comments.has(evidenceId)) {
      this.comments.set(evidenceId, []);
    }

    this.comments.get(evidenceId).push(comment);
    return comment;
  }

  /**
   * Get all comments for an evidence submission
   */
  getComments(evidenceId) {
    return this.comments.get(evidenceId) || [];
  }

  /**
   * Get comment count for an evidence submission
   */
  getCommentCount(evidenceId) {
    const comments = this.comments.get(evidenceId);
    return comments ? comments.length : 0;
  }

  /**
   * Delete a comment (only by author)
   */
  deleteComment(evidenceId, commentId, authorEmail) {
    const comments = this.comments.get(evidenceId);
    if (!comments) return false;

    const index = comments.findIndex(c => c.id === commentId && c.authorEmail === authorEmail);
    if (index === -1) return false;

    comments.splice(index, 1);
    return true;
  }

  /**
   * Edit a comment (only by author)
   */
  editComment(evidenceId, commentId, authorEmail, newContent) {
    const comments = this.comments.get(evidenceId);
    if (!comments) return null;

    const comment = comments.find(c => c.id === commentId && c.authorEmail === authorEmail);
    if (!comment) return null;

    comment.content = newContent;
    comment.edited = true;
    comment.editedAt = new Date().toISOString();
    return comment;
  }

  /**
   * Get all comments (for admin/reporting)
   */
  getAllComments() {
    const allComments = [];
    for (const [evidenceId, comments] of this.comments) {
      allComments.push(...comments.map(c => ({ ...c, evidenceId })));
    }
    return allComments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get recent comments across all evidence
   */
  getRecentComments(limit = 10) {
    return this.getAllComments().slice(0, limit);
  }
}

// Singleton instance
const commentStore = new CommentStore();

module.exports = commentStore;
