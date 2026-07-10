// public/js/comments.js


// ============================================================
// COMMENTS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const commentForm = document.getElementById('commentForm');
    const commentsContainer = document.getElementById('commentsContainer');
    const loadMoreBtn = document.getElementById('loadMoreComments');
    let commentPage = 1;
    
    if (commentForm) {
        const postId = commentForm.dataset.postId;
        
        commentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = {
                author: formData.get('author'),
                email: formData.get('email'),
                content: formData.get('content'),
                parentId: formData.get('parentId') || null
            };
            
            // Disable button and show loading
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Posting...';
            submitBtn.disabled = true;
            
            try {
                const response = await fetch(`/api/comments/${postId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Add comment to UI
                    addCommentToUI(result.comment);
                    this.reset();
                    // Show success message
                    const successMsg = document.getElementById('commentSuccess');
                    if (successMsg) {
                        successMsg.style.display = 'block';
                        setTimeout(() => successMsg.style.display = 'none', 3000);
                    }
                }
            } catch (error) {
                console.error('Error posting comment:', error);
                alert('Failed to post comment. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Load more comments
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async function() {
            const postId = this.dataset.postId;
            commentPage++;
            
            try {
                const response = await fetch(`/api/comments/${postId}?page=${commentPage}`);
                const data = await response.json();
                
                if (data.success && data.comments.length > 0) {
                    data.comments.forEach(comment => {
                        addCommentToUI(comment, true);
                    });
                } else {
                    this.style.display = 'none';
                }
            } catch (error) {
                console.error('Error loading comments:', error);
            }
        });
    }
});

function addCommentToUI(comment, prepend = false) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;
    
    const commentHtml = createCommentHTML(comment);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = commentHtml;
    const commentElement = tempDiv.firstElementChild;
    
    if (prepend) {
        container.prepend(commentElement);
    } else {
        container.appendChild(commentElement);
    }
}

function createCommentHTML(comment) {
    const date = new Date(comment.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-author">
                <strong>${escapeHtml(comment.author)}</strong>
                <span class="comment-date">${date}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <button class="comment-reply-btn" data-comment-id="${comment.id}">Reply</button>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// VIEW TRACKING
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const viewTracker = document.querySelector('[data-track-view]');
    if (viewTracker) {
        const postId = viewTracker.dataset.postId;
        
        // Track view via API
        fetch(`/api/views/${postId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Failed to track view:', err));
    }
});