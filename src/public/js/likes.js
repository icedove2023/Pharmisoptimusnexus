// ============================================================
// LIKES
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const likeIcon = document.getElementById('likeIcon');
    const likeCount = document.getElementById('likeCount');
    
    if (likeIcon && likeCount) {
        const postId = likeIcon.dataset.postId;
        
        // Check if already liked this session
        const liked = sessionStorage.getItem(`liked_${postId}`) === 'true';
        if (liked) {
            likeIcon.style.color = 'var(--blush)';
        }
        
        likeIcon.addEventListener('click', async function() {
            try {
                const response = await fetch(`/api/likes/${postId}`, {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.success) {
                    likeCount.textContent = data.likes;
                    if (data.liked) {
                        this.style.color = 'var(--blush)';
                        sessionStorage.setItem(`liked_${postId}`, 'true');
                    } else {
                        this.style.color = '';
                        sessionStorage.removeItem(`liked_${postId}`);
                    }
                }
            } catch (error) {
                console.error('Error toggling like:', error);
            }
        });
    }
});
