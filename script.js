// API base URL
const API_BASE_URL = 'https://cityride.city/Meri_Maa_API/api.php';

// Function to format date - used for posts and comments
function formatPostDate(dateString) {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - postDate) / (1000 * 60));
    
    if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
        return `${Math.floor(diffInMinutes / 60)}h`;
    } else if (diffInMinutes < 10080) {
        return `${Math.floor(diffInMinutes / 1440)}d`;
    } else {
        return postDate.toLocaleDateString();
    }
}

// Function to get current user ID from localStorage
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? user.id : null;
}

// Function to get user's liked posts
async function getUserLikes() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return new Set();

        const response = await fetch(API_BASE_URL + '/get-user-likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId
            })
        });

        if (response.ok) {
            const data = await response.json();
            // Store liked posts in localStorage
            const likedPosts = new Set(data.likes?.map(like => like.post_id) || []);
            localStorage.setItem('userLikedPosts', JSON.stringify([...likedPosts]));
            return likedPosts;
        }
        return new Set();
    } catch (error) {
        console.error('Error fetching user likes:', error);
        // Fallback to cached likes from localStorage
        const cachedLikes = localStorage.getItem('userLikedPosts');
        return cachedLikes ? new Set(JSON.parse(cachedLikes)) : new Set();
    }
}

// Function to handle likes
async function handleLike(postId, button) {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            alert('Please log in to like posts');
            return;
        }

        // Disable the button temporarily to prevent double-clicks
        button.disabled = true;
        const isLiked = button.dataset.liked === 'true';
        const endpoint = isLiked ? '/unlike-post' : '/like-post';
        
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                post_id: postId
            })
        });

        if (response.ok) {
            // Toggle like state
            const newLikedState = !isLiked;
            button.dataset.liked = newLikedState.toString();
            const icon = button.querySelector('i');
            icon.classList.remove(newLikedState ? 'far' : 'fas');
            icon.classList.add(newLikedState ? 'fas' : 'far');
            
            // Add animation class
            icon.classList.add('like-animation');
            setTimeout(() => {
                icon.classList.remove('like-animation');
            }, 500);
            
            // Update like count
            const likeCountElement = button.parentElement.querySelector('.like-count');
            if (likeCountElement) {
                let count = parseInt(likeCountElement.textContent) || 0;
                likeCountElement.textContent = newLikedState ? count + 1 : count - 1;
            }
            
            // Update localStorage
            const likedPosts = new Set(JSON.parse(localStorage.getItem('userLikedPosts') || '[]'));
            if (newLikedState) {
                likedPosts.add(postId);
            } else {
                likedPosts.delete(postId);
            }
            localStorage.setItem('userLikedPosts', JSON.stringify([...likedPosts]));
        } else {
            throw new Error('Like action failed');
        }
    } catch (error) {
        console.error('Error handling like:', error);
        // Show error feedback
        const icon = button.querySelector('i');
        icon.classList.add('error-animation');
        setTimeout(() => {
            icon.classList.remove('error-animation');
        }, 500);
    } finally {
        button.disabled = false;
    }
}

// Function to handle comments
async function handleComment(postId, button) {
    try {
        // Find the comment section for this post
        const post = button.closest('.post-card');
        const commentsList = post.querySelector('.comments-list');
        const viewCommentsBtn = post.querySelector('.view-comments-btn');

        if (commentsList.style.display === 'none') {
            // Show loading state
            commentsList.innerHTML = '<div class="loading">Loading comments...</div>';
            commentsList.style.display = 'block';
            viewCommentsBtn.textContent = 'Hide comments';

            // Fetch comments
            const response = await fetch(API_BASE_URL + '/get-post-comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    post_id: postId
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Comments API response:', data); // Debug log
                if (data.status === 'success') {
                    // Check if data.data exists and use it for comments
                    const comments = data.data || [];
                    console.log('Comments to display:', comments); // Debug log
                    displayComments(commentsList, comments);
                } else {
                    commentsList.innerHTML = '<div class="error">Failed to load comments</div>';
                }
            } else {
                commentsList.innerHTML = '<div class="error">Failed to load comments</div>';
            }
        } else {
            // Hide comments
            commentsList.style.display = 'none';
            viewCommentsBtn.textContent = 'View all comments';
        }
    } catch (error) {
        console.error('Error handling comments:', error);
        const commentsList = button.closest('.post-card').querySelector('.comments-list');
        if (commentsList) {
            commentsList.innerHTML = '<div class="error">Failed to load comments</div>';
        }
    }
}

// Function to display comments in the comments list
function displayComments(container, comments) {
    console.log('Display Comments function called with:', comments); // Debug log
    
    if (!Array.isArray(comments) || comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet</div>';
        return;
    }

    const defaultProfileImage = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
    
    const commentsHtml = comments.map(comment => {
        // Debug log for each comment
        console.log('Processing comment:', comment);
        
        // Extract user info - handle both nested and flat structures
        const user = comment.user || {};
        const username = user.username || comment.username || 'User';
        const profileImage = user.profile_image || comment.user_profile_image || defaultProfileImage;
        const commentText = comment.comment_text || comment.text || '';
        const createdAt = comment.created_at || comment.timestamp || new Date().toISOString();

        return `
            <div class="comment-item">
                <div class="comment-user-avatar">
                    <img src="${profileImage}" alt="${username}" onerror="this.src='${defaultProfileImage}'">
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-username">${username}</span>
                        <span class="comment-time">${formatPostDate(createdAt)}</span>
                    </div>
                    <p class="comment-text">${commentText}</p>
                </div>
            </div>
        `;
    }).join('');

    console.log('Generated HTML:', commentsHtml); // Debug log
    container.innerHTML = commentsHtml;
}

// Function to handle comment input
function handleCommentInput(input) {
    const button = input.parentElement.querySelector('.post-comment-btn');
    button.disabled = !input.value.trim();
}

// Function to submit a comment
async function submitComment(postId, button) {
    const wrapper = button.closest('.comment-input-wrapper');
    const input = wrapper.querySelector('.comment-input');
    const commentText = input.value.trim();
    
    if (!commentText) return;

    const userId = getCurrentUserId();
    if (!userId) {
        alert('Please log in to comment');
        return;
    }

    // Disable input and button while submitting
    input.disabled = true;
    button.disabled = true;

    try {
        // Add the comment
        const response = await fetch(API_BASE_URL + '/add-comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                post_id: postId,
                comment_text: commentText
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add comment');
        }

        // Clear input immediately on success
        input.value = '';

        // Find comment display elements
        const post = button.closest('.post-card');
        const commentsList = post.querySelector('.comments-list');
        const viewCommentsBtn = post.querySelector('.view-comments-btn');

        // Refresh comments list
        const commentsResponse = await fetch(API_BASE_URL + '/get-post-comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                post_id: postId
            })
        });

        if (!commentsResponse.ok) {
            throw new Error('Failed to fetch updated comments');
        }

        const commentsData = await commentsResponse.json();
        console.log('Updated comments:', commentsData);

        // Show comments list if it was hidden
        commentsList.style.display = 'block';
        viewCommentsBtn.textContent = 'Hide comments';

        // Display the updated comments
        if (commentsData.status === 'success' && commentsData.data) {
            displayComments(commentsList, commentsData.data);
        } else {
            console.error('Invalid comment data:', commentsData);
            commentsList.innerHTML = '<div class="error">Error displaying comments. Please refresh.</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add comment. Please try again.');
    } finally {
        // Re-enable input and button
        input.disabled = false;
        button.disabled = !input.value.trim();
    }
}


// Function to handle post sharing
function handleShare(postId, button) {
    // Create share menu if it doesn't exist
    let shareMenu = button.nextElementSibling;
    if (!shareMenu || !shareMenu.classList.contains('share-menu')) {
        shareMenu = document.createElement('div');
        shareMenu.className = 'share-menu';
        shareMenu.innerHTML = `
            <div class="share-options">
                <div class="share-header">Share to:</div>
                <button onclick="shareToWhatsApp(${postId}, this)">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="shareToInstagram(${postId}, this)">
                    <i class="fab fa-instagram"></i> Instagram
                </button>
                <button onclick="shareToFacebook(${postId}, this)">
                    <i class="fab fa-facebook"></i> Facebook
                </button>
                <button onclick="copyLink(${postId}, this)">
                    <i class="fas fa-link"></i> Copy Link
                </button>
            </div>
        `;
        button.parentNode.insertBefore(shareMenu, button.nextSibling);

        // Close menu when clicking outside
        document.addEventListener('click', function closeMenu(e) {
            if (!shareMenu.contains(e.target) && !button.contains(e.target)) {
                shareMenu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    } else {
        shareMenu.remove();
    }
}

// Function to update share count
async function updateShareCount(postId, shareButton) {
    try {
        const userId = getCurrentUserId();
        if (!userId) return;

        const response = await fetch(API_BASE_URL + '/share-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                post_id: postId
            })
        });

        if (response.ok) {
            // Update share count display
            const shareCountSpan = shareButton.querySelector('.share-count');
            if (shareCountSpan) {
                const currentCount = parseInt(shareCountSpan.textContent) || 0;
                shareCountSpan.textContent = currentCount + 1;
            } else {
                // Create share count span if it doesn't exist
                const newShareCount = document.createElement('span');
                newShareCount.className = 'share-count';
                newShareCount.textContent = '1';
                shareButton.appendChild(newShareCount);
            }
        }
    } catch (error) {
        console.error('Error updating share count:', error);
    }
}

// Share to WhatsApp
async function shareToWhatsApp(postId, button) {
    const shareButton = button.closest('.share-options').previousElementSibling;
    const postUrl = `${window.location.origin}/post/${postId}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=Check out this post: ${encodeURIComponent(postUrl)}`;
    await updateShareCount(postId, shareButton);
    window.open(whatsappUrl, '_blank');
}

// Share to Instagram (opens Instagram app or website)
async function shareToInstagram(postId, button) {
    const shareButton = button.closest('.share-options').previousElementSibling;
    await updateShareCount(postId, shareButton);
    // Since Instagram doesn't have a direct share URL, we'll copy the link and notify the user
    copyLink(postId, button);
    alert('Link copied! You can now paste it in Instagram.');
}

// Share to Facebook
async function shareToFacebook(postId, button) {
    const shareButton = button.closest('.share-options').previousElementSibling;
    const postUrl = `${window.location.origin}/post/${postId}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    await updateShareCount(postId, shareButton);
    window.open(facebookUrl, '_blank');
}

// Copy link to clipboard
async function copyLink(postId, button) {
    const shareButton = button.closest('.share-options').previousElementSibling;
    const postUrl = `${window.location.origin}/post/${postId}`;
    try {
        await navigator.clipboard.writeText(postUrl);
        await updateShareCount(postId, shareButton);
        alert('Link copied to clipboard!');
    } catch (err) {
        console.error('Error copying link:', err);
        alert('Failed to copy link');
    }
}

// Function to update like count for a post
async function updateLikeCount(postId) {
    try {
        const response = await fetch(API_BASE_URL + '/get-user-likes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: getCurrentUserId()
            })
        });

        if (response.ok) {
            const likes = await response.json();
            // Update UI with new like count if needed
        }
    } catch (error) {
        console.error('Error updating like count:', error);
    }
}

// Function to toggle post description show more/less
function toggleDescription(button) {
    const descriptionText = button.previousElementSibling;
    const isTruncated = descriptionText.classList.contains('truncated');
    
    descriptionText.classList.toggle('truncated');
    button.textContent = isTruncated ? 'less' : 'more';
}

// Function to initialize audio players
function initializeAudioPlayers() {
    document.querySelectorAll('.audio-player').forEach(player => {
        const audio = player.querySelector('audio');
        const playPauseBtn = player.querySelector('.play-pause-btn');
        const progress = player.querySelector('.progress');
        const currentTime = player.querySelector('.current');
        const duration = player.querySelector('.duration');
        const volumeSlider = player.querySelector('.volume-slider');

        if (!audio) return;

        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audio.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const progressPercent = (audio.currentTime / audio.duration) * 100;
                progress.style.width = `${progressPercent}%`;
                currentTime.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            duration.textContent = formatTime(audio.duration);
        });

        volumeSlider.addEventListener('input', (e) => {
            audio.volume = e.target.value / 100;
        });
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // First fetch user's liked posts
    await getUserLikes();
    
    // Function to fetch and display all posts
    async function fetchAllPosts() {
        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/all_posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: getCurrentUserId() || null
                })
            });
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }
            const data = await response.json();
            if (data.status === 'success') {
                displayPosts(data.data);
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            document.querySelector('.feed-grid').innerHTML = '<div class="error-message">Failed to load posts</div>';
        }
    }

    // Call fetchAllPosts to load initial posts
    fetchAllPosts();

    // Function to display posts
    function displayPosts(posts) {
        const feedGrid = document.querySelector('.feed-grid');
        feedGrid.innerHTML = '';

        posts.forEach(post => {
            let postHTML = '';
            const defaultProfileImage = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            
            // Common header template
            const headerTemplate = `
                <header class="post-header">
                    <div class="user-info">
                        <div class="user-avatar">
                            <img src="${post.user_profile_image || defaultProfileImage}" alt="${post.username}">
                        </div>
                        <div class="user-details">
                            <strong class="username">${post.user.username || 'User'}</strong>
                            ${post.location ? `<span class="location">${post.location}</span>` : ''}
                        </div>
                    </div>
                </header>`;

            // Common footer template
            const footerTemplate = `
                <footer class="post-footer">
                    <div class="interaction-stats">
                        <button class="like-btn" onclick="handleLike(${post.id}, this)" data-liked="${post.is_liked ? 'true' : 'false'}">
                            <i class="fa${post.is_liked ? 's' : 'r'} fa-heart"></i>
                        </button>
                        <button class="comment-btn" onclick="handleComment(${post.id})">
                            <i class="far fa-comment"></i>
                        </button>
                        <button class="share-btn" onclick="handleShare(${post.id}, this)">
                            <i class="fas fa-share"></i>
                            ${post.share_count ? `<span class="share-count">${post.share_count}</span>` : ''}
                        </button>
                    </div>
                    <div class="post-date">${formatPostDate(post.post_datetime)}</div>
                    <div class="post-description">
                        <p class="description-text ${post.description && post.description.length > 150 ? 'truncated' : ''}">
                            <span class="username">${post.user.username || 'User'}</span>
                            ${post.description || ''}
                        </p>
                        ${post.description && post.description.length > 150 ? '<button class="show-more-btn" onclick="toggleDescription(this)">more</button>' : ''}
                    </div>
                    <div class="comments-section">
                        <button class="view-comments-btn" onclick="handleComment(${post.id}, this)">View all comments</button>
                        <div class="comments-list" style="display: none;"></div>
                        <div class="add-comment">
                            <img src="${localStorage.getItem('user_profile_image') || defaultProfileImage}" alt="Your Profile" class="comment-avatar">
                            <div class="comment-input-wrapper">
                                <input type="text" class="comment-input" placeholder="Add a comment..." onkeyup="handleCommentInput(this)">
                                <button class="post-comment-btn" onclick="submitComment(${post.id}, this)" disabled>Post</button>
                            </div>
                        </div>
                    </div>
                </footer>`;

            switch (post.post_type) {
                case 'post':
                    // Image post template
                    postHTML = `
                        <article class="post-card">
                            ${headerTemplate}
                            <div class="post-media">
                                <img src="${post.image_url}" alt="${post.title || 'Post image'}" class="post-image">
                            </div>
                            ${footerTemplate}
                        </article>`;
                    break;

                case 'message':
                    // Message post template
                    postHTML = `
                        <article class="post-card">
                            ${headerTemplate}
                            <div class="post-media story-content">
                                <div class="story-decoration"></div>
                                <div class="story-wrapper">
                                    <h2 class="story-content-header">${post.title || 'Message'}</h2>
                                    <p>${post.message || ''}</p>
                                </div>
                            </div>
                            ${footerTemplate}
                        </article>`;
                    break;

                case 'audio':
                    // Audio post template
                    postHTML = `
                        <article class="post-card">
                            ${headerTemplate}
                            <div class="post-media audio-player">
                                <div class="audio-background"></div>
                                <div class="audio-content">
                                    <div class="audio-info">
                                        <h3>${post.title || 'Audio Post'}</h3>
                                        <p>${post.description || ''}</p>
                                    </div>
                                    <div class="audio-controls">
                                        <audio src="${post.audio_url}">
                                            Your browser does not support the audio element.
                                        </audio>
                                        <div class="play-pause-btn">
                                            <i class="fas fa-play"></i>
                                        </div>
                                        <div class="progress-area">
                                            <div class="progress-bar">
                                                <div class="progress"></div>
                                            </div>
                                            <div class="time-counter">
                                                <span class="current">0:00</span>
                                                <span class="duration">0:00</span>
                                            </div>
                                        </div>
                                        <div class="volume-container">
                                            <i class="fas fa-volume-up"></i>
                                            <input type="range" min="0" max="100" value="100" class="volume-slider">
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ${footerTemplate}
                        </article>`;
                    break;
            }

            feedGrid.insertAdjacentHTML('beforeend', postHTML);
        });

        // Initialize audio players
        initializeAudioPlayers();
    }

    // Call fetchAllPosts when the page loads
    fetchAllPosts();

    // Function to fetch user profile data
    async function fetchUserProfile(userId) {
        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            if (data.status === 'success') {
                updateProfileUI(data);
            }
            return data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }

    // Function to update profile UI
    function updateProfileUI(userData) {
        if (!userData || !userData.user) return;

        const user = userData.user;
        
        // Update profile photo
        const profilePhoto = document.querySelector('.profile-photo img');
        if (profilePhoto) {
            profilePhoto.src = user.profile_image || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
            profilePhoto.alt = user.name;
        }

        // Update username
        const usernameElement = document.querySelector('.profile-username');
        if (usernameElement) {
            usernameElement.textContent = user.username || '';
        }

        // Update name
        const nameElement = document.querySelector('.profile-name');
        if (nameElement) {
            nameElement.textContent = user.name || '';
        }

        // Update address
        const addressElement = document.querySelector('.profile-address');
        if (addressElement) {
            addressElement.textContent = user.address || '';
        }

        // Update posts count
        const postsCountElement = document.querySelector('.stat-number');
        if (postsCountElement) {
            postsCountElement.textContent = user.total_posts || '0';
        }

        // Update name
        const fullNameElement = document.querySelector('.full-name');
        if (fullNameElement) {
            fullNameElement.textContent = user.name || '';
        }

        // Update bio
        const bioElement = document.querySelector('.bio-text');
        if (bioElement) {
            bioElement.textContent = user.bio || '';
        }

        console.log('Profile Updated:', user);
    }

    // Load profile data
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.id) {
        fetchUserProfile(userData.id).then(data => {
            if (data && data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        }).catch(err => {
            console.error('Error fetching profile:', err);
        });
    }
    
    // More Options Dropdown Functionality
    const moreBtn = document.getElementById('moreBtn');
    const moreDropdown = document.querySelector('.more-dropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle dropdown when clicking More button
    moreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        moreDropdown.style.display = moreDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Handle logout
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Clear any stored authentication tokens or session data
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('userSession');
        // Redirect to login page
        window.location.href = 'login.html';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!moreBtn.contains(e.target) && !moreDropdown.contains(e.target)) {
            moreDropdown.style.display = 'none';
        }
    });

    // Comments View/Hide Functionality
    const viewCommentsBtns = document.querySelectorAll('.view-comments-btn');
    viewCommentsBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const commentsList = this.nextElementSibling;
            if (commentsList.style.display === 'none') {
                commentsList.style.display = 'block';
                this.textContent = 'Hide comments';
            } else {
                commentsList.style.display = 'none';
                this.textContent = 'View all comments';
            }
        });
    });

    // Edit Profile Popup Functionality
    const editProfileBtn = document.querySelector('.edit-profile-btn');
    const editProfilePopup = document.getElementById('editProfilePopup');
    const closeEditProfileBtn = editProfilePopup.querySelector('.close-popup');
    const bioTextarea = document.getElementById('profileBio');
    const bioCounter = document.getElementById('bioLength');
    const profileImageInput = document.createElement('input');
    profileImageInput.type = 'file';
    profileImageInput.accept = 'image/*';
    profileImageInput.style.display = 'none';
    document.body.appendChild(profileImageInput);

    // Navigation between pages
    const homeButton = document.querySelector('.nav-item.active');
    const mainContent = document.querySelector('.main-content');
    const profilePage = document.getElementById('profilePage');
    const postsGrid = document.querySelector('.posts-grid');
    const profileNav = document.querySelector('a[href="#"].nav-item img.profile-pic').parentElement;
    
    // Function to show profile page
    function showProfilePage() {
        if (mainContent && profilePage) {
            mainContent.style.display = 'none';
            profilePage.style.display = 'block';
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            // Add active class to profile nav item
            if (profileNav) {
                profileNav.classList.add('active');
            }
            // Load profile posts
            loadProfilePosts();
        } else {
            console.error('Required elements not found:', { 
                mainContent: !!mainContent, 
                profilePage: !!profilePage 
            });
        }
    }

    // Function to show home page
    function showHomePage() {
        mainContent.style.display = 'block';
        profilePage.style.display = 'none';
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        // Add active class to home nav item
        homeButton.classList.add('active');
    }

    // Profile navigation click handler
    profileNav.addEventListener('click', (e) => {
        e.preventDefault();
        showProfilePage();
    });

    // Home navigation click handler
    homeButton.addEventListener('click', (e) => {
        e.preventDefault();
        showHomePage();
    });
    
    // Function to fetch user posts
    async function fetchUserPosts(userId) {
        try {
            console.log('Fetching posts for user:', userId);
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/get-user-posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }

            const data = await response.json();
            console.log('Posts data:', data);
            
            if (data.status === 'success' && data.data) {
                // Get the currently active tab
                const activeTab = document.querySelector('.profile-nav .nav-btn.active');
                const activeTabType = activeTab ? activeTab.getAttribute('data-tab') : 'posts';
                displayUserPosts(data.data, activeTabType);
            } else {
                throw new Error(data.message || 'Failed to fetch posts');
            }
        } catch (error) {
            console.error('Error fetching user posts:', error);
            postsGrid.innerHTML = '<div class="error-message">Failed to load posts. Please try again later.</div>';
        }
    }

    // Function to display user posts
    function displayUserPosts(posts, filterType = 'posts') {
        console.log('Displaying posts:', posts, 'Filter:', filterType);
        
        if (!posts || !posts.length) {
            postsGrid.innerHTML = '<div class="no-posts"><i class="fas fa-inbox"></i><p>No posts found</p></div>';
            return;
        }

        // Filter posts based on type
        const filteredPosts = filterType === 'posts' ? 
            posts.filter(post => post.post_type === 'post') :
            filterType === 'messages' ? 
            posts.filter(post => post.post_type === 'message') :
            filterType === 'audio' ? 
            posts.filter(post => post.post_type === 'audio') :
            posts;

        // Check if there are any posts after filtering
        if (filteredPosts.length === 0) {
            const message = `No ${filterType} found`;
            const icon = filterType === 'posts' ? 'fa-image' :
                        filterType === 'messages' ? 'fa-envelope' :
                        filterType === 'audio' ? 'fa-microphone' : 'fa-inbox';
            
            postsGrid.innerHTML = `
                <div class="no-posts">
                    <i class="fas ${icon}"></i>
                    <p>${message}</p>
                </div>`;
            return;
        }

        if (filteredPosts.length === 0) {
            postsGrid.innerHTML = `<div class="no-posts">No ${filterType} found</div>`;
            return;
        }

        postsGrid.innerHTML = '';  // Clear existing posts

        // Default background colors for different post types
        const defaultColors = {
            post: '#e1f5fe',     // Light blue
            message: '#f3e5f5',  // Light purple
            audio: '#e8f5e9',    // Light green
            text: '#fff3e0'      // Light orange
        };

        // Default icons for different post types
        const defaultIcons = {
            post: 'fa-image',
            message: 'fa-envelope',
            audio: 'fa-microphone',
            text: 'fa-file-alt'
        };

        filteredPosts.forEach(post => {
            let postContent = '';
            let overlayContent = '';

            switch (post.post_type) {
                case 'message':
                    // Special styling for message cards
                    postContent = `
                        <div class="message-card">
                            <h2 class="message-title">${post.title || "Mother's Love"}</h2>
                            <p class="message-text">${post.message || post.description || ''}</p>
                            <div class="message-stats">
                                <span class="stat-item"><i class="far fa-heart"></i> ${post.total_likes || 0}</span>
                                <span class="stat-item"><i class="far fa-comment"></i> ${post.total_comments || 0}</span>
                                ${post.location ? `<span class="stat-item location"><i class="fas fa-map-marker-alt"></i> ${post.location}</span>` : ''}
                            </div>
                        </div>`;
                    break;
                    
                default:
                case 'text':
                    const postType = post.post_type || 'text';
                    const backgroundColor = defaultColors[postType] || defaultColors.text;
                    const icon = defaultIcons[postType] || defaultIcons.text;
                    
                    // Create preview based on post type
                    if (post.media_url && postType === 'post') {
                        // If there's a media URL for image posts, create an image preview
                        postContent = `
                            <div class="post-preview" style="background-image: url('${post.media_url}');">
                                <div class="post-overlay">
                                    <i class="fas ${icon}"></i>
                                    ${post.description ? `<p class="post-description">${post.description.substring(0, 50)}${post.description.length > 50 ? '...' : ''}</p>` : ''}
                                </div>
                            </div>`;
                    } else {
                        // For other types or when no media URL is available
                        postContent = `
                            <div class="post-preview" style="background-color: ${backgroundColor}">
                                <i class="fas ${icon}"></i>
                                <h3>${post.title || postType.charAt(0).toUpperCase() + postType.slice(1)}</h3>
                                ${post.description || post.message ? 
                                    `<p class="post-excerpt">${(post.description || post.message).substring(0, 50)}${(post.description || post.message).length > 50 ? '...' : ''}</p>` 
                                    : ''}
                            </div>`;
                    }
                    break;
            }

            overlayContent = `
                <div class="overlay-stats">
                    <span><i class="fas fa-heart"></i> ${post.total_likes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${post.total_comments || 0}</span>
                    ${post.location ? `<div class="post-location"><i class="fas fa-map-marker-alt"></i> ${post.location}</div>` : ''}
                </div>`;

            // Create and append the post element
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
            postElement.setAttribute('data-post-id', post.id);
            postElement.setAttribute('data-post-type', post.post_type);
            
            postElement.innerHTML = `
                ${postContent}
                <div class="post-overlay">
                    ${overlayContent}
                </div>
            `;
            
            postsGrid.appendChild(postElement);
        });

        // Add click event listeners to posts if needed
        document.querySelectorAll('.post-item').forEach(post => {
            post.addEventListener('click', () => {
                // Handle post click if needed
                const postId = post.dataset.postId;
                const postType = post.dataset.postType;
                // You can add post detail view functionality here
            });
        });
    }

    // Function to update profile posts when profile is viewed
    function loadProfilePosts() {
        console.log('Loading profile posts');
        const userData = JSON.parse(localStorage.getItem('user'));
        const userId = userData ? userData.id : 1;
        console.log('User ID:', userId);
        fetchUserPosts(userId);
    }

    // Initial load of profile posts if we're on the profile page
    if (window.location.hash === '#profile') {
        showProfilePage();
    } else {
        showHomePage();
    }

    // Home button click
    homeButton.addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.style.display = 'block';
        profilePage.classList.remove('active');
    });

    // Load posts when profile page is shown
    document.querySelector('a[href="#"].nav-item img.profile-pic').addEventListener('click', (e) => {
        e.preventDefault();
        loadProfilePosts();
    });

    // Create Post Functionality
    const createPopup = document.getElementById('createPopup');
    const tabButtons = document.querySelectorAll('.create-tabs .tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let selectedMedia = null;
    let selectedAudio = null;
    let currentPostType = 'post';

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId + 'Tab').classList.add('active');
            currentPostType = tabId;
        });
    });

    // Image/Video upload functionality
    const mediaInput = document.getElementById('mediaInput');
    const mediaPreview = document.getElementById('mediaPreview');
    const mediaPreviewContainer = document.querySelector('.selected-media-preview');
    const selectMediaBtn = document.querySelector('.select-media-btn');

    selectMediaBtn.addEventListener('click', () => {
        mediaInput.click();
    });

    mediaInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                mediaPreview.src = e.target.result;
                selectedMedia = e.target.result;
                mediaPreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Audio upload functionality
    const audioInput = document.getElementById('audioInput');
    const audioPreview = document.getElementById('audioPreview');
    const audioControls = document.querySelector('.audio-controls');
    const selectAudioBtn = document.querySelector('.select-audio-btn');

    selectAudioBtn.addEventListener('click', () => {
        audioInput.click();
    });

    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                audioPreview.src = e.target.result;
                selectedAudio = e.target.result;
                audioControls.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Function to create post
    async function createPost(postData) {
        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/add-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                throw new Error('Failed to create post');
            }

            const data = await response.json();
            if (data.status === 'success') {
                alert('Post created successfully!');
                // Reset form and close popup
                resetCreateForm();
                createPopup.style.display = 'none';
                // Reload posts if needed
                window.location.reload();
            } else {
                throw new Error(data.message || 'Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post. Please try again.');
        }
    }

    // Handle post submission for all types
    const sharePostBtn = document.querySelector('.share-post-btn');
    const sendMessageBtn = document.querySelector('.send-message-btn');
    const shareAudioBtn = document.querySelector('.share-audio-btn');

    // Image/Video Post
    sharePostBtn.addEventListener('click', () => {
        const location = document.querySelector('#postTab .location-input input').value;
        const description = document.querySelector('.caption-input').value;
        
        if (!selectedMedia) {
            alert('Please select an image or video');
            return;
        }

        createPost({
            user_id: JSON.parse(localStorage.getItem('user'))?.id || 1,
            post_type: 'post',
            media: selectedMedia,
            location: location,
            description: description
        });
    });

    // Message Post
    sendMessageBtn.addEventListener('click', () => {
        const location = document.querySelector('#messageTab .location-input input').value;
        const title = document.querySelector('.message-title').value;
        const message = document.querySelector('.message-subject').value;
        const description = document.querySelector('.message-description').value;

        if (!title || !message) {
            alert('Please fill in all required fields');
            return;
        }

        createPost({
            user_id: JSON.parse(localStorage.getItem('user'))?.id || 1,
            post_type: 'message',
            title: title,
            message: message,
            description: description,
            location: location
        });
    });

    // Audio Post
    shareAudioBtn.addEventListener('click', () => {
        const location = document.querySelector('#audioTab .location-input input').value;
        const title = document.querySelector('.audio-title').value;
        const description = document.querySelector('.audio-description').value;

        if (!selectedAudio) {
            alert('Please select or record an audio');
            return;
        }

        createPost({
            user_id: JSON.parse(localStorage.getItem('user'))?.id || 1,
            post_type: 'audio',
            audio: selectedAudio,
            title: title,
            description: description,
            location: location
        });
    });

    // Function to reset create form
    function resetCreateForm() {
        // Reset image/video post
        selectedMedia = null;
        mediaPreview.src = '';
        mediaPreviewContainer.style.display = 'none';
        document.querySelector('.caption-input').value = '';
        
        // Reset message post
        document.querySelector('.message-title').value = '';
        document.querySelector('.message-subject').value = '';
        document.querySelector('.message-description').value = '';
        
        // Reset audio post
        selectedAudio = null;
        audioPreview.src = '';
        audioControls.style.display = 'none';
        document.querySelector('.audio-title').value = '';
        document.querySelector('.audio-description').value = '';
        
        // Reset all location inputs
        document.querySelectorAll('.location-input input').forEach(input => {
            input.value = '';
        });
    }

    // Function to populate edit profile popup
    function populateEditProfileForm(userData) {
        const editProfileImage = document.querySelector('.current-profile-image img');
        const profileNameInput = document.getElementById('profileName');
        const profileBioTextarea = document.getElementById('profileBio');
        const bioLengthCounter = document.getElementById('bioLength');

        if (userData) {
            // Set profile image
            if (userData.profile_image) {
                editProfileImage.src = userData.profile_image;
            }
            
            // Set name
            if (userData.name) {
                profileNameInput.value = userData.name;
            }
            
            // Set bio
            if (userData.bio) {
                profileBioTextarea.value = userData.bio;
                bioLengthCounter.textContent = userData.bio.length;
            } else {
                profileBioTextarea.value = '';
                bioLengthCounter.textContent = '0';
            }
        }
    }

    // Open edit profile popup
    editProfileBtn.addEventListener('click', async () => {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('user'));
        
        if (userData && userData.id) {
            try {
                const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userData.id
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                if (data.status === 'success' && data.user) {
                    populateEditProfileForm(data.user);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Fall back to localStorage data if API fails
                populateEditProfileForm(userData);
            }
        } else {
            // If no user data in localStorage, try to fetch from API with default user_id
            try {
                const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: 1
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                if (data.status === 'success' && data.user) {
                    populateEditProfileForm(data.user);
                }
            } catch (error) {
                console.error('Error fetching default user data:', error);
            }
        }

        // Show the popup
        editProfilePopup.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close popup button click
    closeEditProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editProfilePopup.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close popup when clicking outside
    editProfilePopup.addEventListener('click', (e) => {
        if (e.target === editProfilePopup) {
            editProfilePopup.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Bio character counter
    bioTextarea.addEventListener('input', () => {
        const length = bioTextarea.value.length;
        bioCounter.textContent = length;
        
        if (length > 150) {
            bioTextarea.value = bioTextarea.value.slice(0, 150);
            bioCounter.textContent = 150;
        }
    });

    // Change profile photo
    const changePhotoBtn = document.querySelector('.change-profile-photo');
    const profileImage = document.querySelector('.current-profile-image img');
    let selectedProfileImage = null;

    changePhotoBtn.addEventListener('click', () => {
        profileImageInput.click();
    });

    // Handle profile image selection
    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                profileImage.src = e.target.result;
                selectedProfileImage = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Save profile changes
    const saveProfileBtn = document.querySelector('.save-profile-btn');
    saveProfileBtn.addEventListener('click', async () => {
        const name = document.getElementById('profileName').value;
        const bio = document.getElementById('profileBio').value;
        const userId = JSON.parse(localStorage.getItem('user'))?.id || 1;

        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/update-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    profile_image: selectedProfileImage || '',
                    name: name,
                    bio: bio
                })
            });

            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                // Update UI
                const profileNameElements = document.querySelectorAll('.profile-name, .full-name');
                profileNameElements.forEach(element => {
                    if (element) element.textContent = name;
                });

                const bioElements = document.querySelectorAll('.bio-text');
                bioElements.forEach(element => {
                    if (element) element.textContent = bio;
                });

                // Update profile images throughout the page
                if (selectedProfileImage) {
                    const profileImages = document.querySelectorAll('.profile-photo img, .profile-pic, .comment-avatar');
                    profileImages.forEach(img => {
                        img.src = selectedProfileImage;
                    });
                }

                // Close popup
                editProfilePopup.classList.remove('active');
                document.body.style.overflow = '';

                // Show success message
                alert('Profile updated successfully!');

                // Update local storage
                const user = JSON.parse(localStorage.getItem('user')) || {};
                user.name = name;
                user.bio = bio;
                if (selectedProfileImage) user.profile_image = selectedProfileImage;
                localStorage.setItem('user', JSON.stringify(user));
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    });

    profileImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                profileImage.src = e.target.result;
                // Also update the profile picture in the sidebar and profile page
                document.querySelector('.nav-item .profile-pic').src = e.target.result;
                document.querySelector('.profile-photo img').src = e.target.result;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Save profile changes
   // const saveProfileBtn = document.querySelector('.save-profile-btn');
    const profileNameInput = document.getElementById('profileName');
    
    saveProfileBtn.addEventListener('click', () => {
        // Update profile information
        document.querySelector('.profile-bio .full-name').textContent = profileNameInput.value;
        document.querySelector('.profile-bio .welcome-text').textContent = bioTextarea.value;
        
        // Close popup
        editProfilePopup.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Profile Page Functionality
    const profileButton = document.querySelector('.nav-item img.profile-pic').parentElement;
    //const profilePage = document.getElementById('profilePage');
    //const mainContent = document.querySelector('.main-content');
    const profileNavBtns = document.querySelectorAll('.profile-nav .nav-btn');
   // const moreBtn = document.querySelector('.more-btn');

    // Open profile page
    profileButton.addEventListener('click', (e) => {
        e.preventDefault();
        mainContent.style.display = 'none';
        profilePage.classList.add('active');
    });

    // Profile navigation tabs
    profileNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            profileNavBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get the selected tab type
            const tabType = btn.getAttribute('data-tab');
            
            // Get the current posts data from the last fetch
            const userData = JSON.parse(localStorage.getItem('user'));
            if (userData && userData.id) {
                // Re-fetch posts with the new filter
                fetchUserPosts(userData.id).then(data => {
                    if (data && data.status === 'success' && data.data) {
                        // Display posts with the selected filter
                        displayUserPosts(data.data, tabType);
                    }
                }).catch(err => {
                    console.error('Error fetching posts:', err);
                    postsGrid.innerHTML = '<div class="error-message">Failed to load posts. Please try again later.</div>';
                });
            }
        });
    });

    // Show more bio text
    moreBtn?.addEventListener('click', function() {
        const bio = this.previousElementSibling;
        if (bio.style.maxHeight) {
            bio.style.maxHeight = null;
            this.textContent = 'Show more...';
        } else {
            bio.style.maxHeight = bio.scrollHeight + 'px';
            this.textContent = 'Show less';
        }
    });

    // Notifications Popup Functionality
    const likesButton = document.querySelector('.nav-item i.far.fa-heart').parentElement;
    const notificationsPopup = document.getElementById('notificationsPopup');
    const notificationsTabs = document.querySelectorAll('.notifications-popup .tab-btn');
    const notificationsContents = document.querySelectorAll('.notifications-popup .tab-content');
    const thisWeekContent = document.getElementById('this-week');
    const thisMonthContent = document.getElementById('this-month');

    // Function to fetch user likes
    async function fetchUserLikes(userId) {
        try {
            const response = await fetch('https://cityride.city/Meri_Maa_API/api.php/get-user-likes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch likes');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching likes:', error);
            return null;
        }
    }

    // Function to format the date difference
    function formatDateDiff(dateString) {
        const postDate = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays}d`;
        return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Function to display notifications
    function displayNotifications(data) {
        if (!data || !data.data) return;

        const posts = data.data;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Filter posts for this week and this month
        const thisWeekPosts = posts.filter(post => new Date(post.post_datetime) >= oneWeekAgo);
        const thisMonthPosts = posts;

        // Generate HTML for notifications
        thisWeekContent.innerHTML = generateNotificationsHTML(thisWeekPosts);
        thisMonthContent.innerHTML = generateNotificationsHTML(thisMonthPosts);
    }

    // Function to generate HTML for notifications
    function generateNotificationsHTML(posts) {
        if (!posts.length) {
            return '<div class="no-notifications">No notifications yet</div>';
        }

        return posts.map(post => `
            <div class="notification-item">
                <div class="notification-avatar">
                    <img src="${post.post_owner.profile_image_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}" alt="${post.post_owner.username}">
                </div>
                <div class="notification-details">
                    <p><strong>${post.post_owner.username}</strong> ${post.post_type === 'post' ? 'posted' : 'shared'} "${post.title || post.message || 'a post'}"</p>
                    <span class="notification-time">${formatDateDiff(post.post_datetime)}</span>
                </div>
                ${post.total_likes > 0 ? `<div class="like-count">${post.total_likes} ${post.total_likes === 1 ? 'like' : 'likes'}</div>` : ''}
            </div>
        `).join('');
    }

    // Open notifications popup and load data
    likesButton.addEventListener('click', () => {
        notificationsPopup.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Get user data and fetch likes
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.id) {
            fetchUserLikes(userData.id).then(data => {
                if (data && data.status === 'success') {
                    displayNotifications(data);
                }
            });
        }
    });

    // Close popup when clicking outside
    notificationsPopup.addEventListener('click', (e) => {
        if (e.target === notificationsPopup) {
            notificationsPopup.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Tab switching
    notificationsTabs.forEach(button => {
        button.addEventListener('click', () => {
            notificationsTabs.forEach(btn => btn.classList.remove('active'));
            notificationsContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    // Follow button functionality
    document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.textContent === 'Follow') {
                this.textContent = 'Following';
                this.style.backgroundColor = '#ddd';
                this.style.color = 'black';
            } else {
                this.textContent = 'Follow';
                this.style.backgroundColor = '';
                this.style.color = '';
            }
        });
    });

    // Search Popup Functionality
    const searchButton = document.querySelector('.nav-item i.fas.fa-search').parentElement;
    const searchPopup = document.getElementById('searchPopup');
    const closeSearchBtn = document.querySelector('.close-search');
    const searchInput = document.querySelector('.search-input');
    const clearAllBtn = document.querySelector('.clear-all');
    const removeButtons = document.querySelectorAll('.remove-search');

    // Open search popup
    searchButton.addEventListener('click', () => {
        searchPopup.classList.add('active');
        document.body.style.overflow = 'hidden';
        searchInput.focus();
    });

    // Close search popup
    closeSearchBtn.addEventListener('click', () => {
        searchPopup.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close popup when clicking outside
    searchPopup.addEventListener('click', (e) => {
        if (e.target === searchPopup) {
            searchPopup.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Clear all recent searches
    clearAllBtn.addEventListener('click', () => {
        const searchResults = document.querySelector('.search-results');
        searchResults.innerHTML = '';
    });

    // Remove individual search items
    removeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.search-item').remove();
        });
    });

    // Create Popup Functionality
    const createButton = document.querySelector('.nav-item i.far.fa-square-plus').parentElement;
    //const createPopup = document.getElementById('createPopup');
    const closePopupBtn = document.querySelector('.close-popup');
    //const tabButtons = document.querySelectorAll('.tab-btn');
   // const tabContents = document.querySelectorAll('.tab-content');
    //const mediaInput = document.getElementById('mediaInput');
    //const mediaPreview = document.getElementById('mediaPreview');
    const uploadArea = document.querySelector('.upload-area');
    const selectedMediaPreview = document.querySelector('.selected-media-preview');

    // Open popup
    createButton.addEventListener('click', () => {
        createPopup.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close popup
    closePopupBtn.addEventListener('click', () => {
        createPopup.classList.remove('active');
        document.body.style.overflow = '';
    });

    // Close popup when clicking outside
    createPopup.addEventListener('click', (e) => {
        if (e.target === createPopup) {
            createPopup.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(button.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // File upload preview
    mediaInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                mediaPreview.src = e.target.result;
                uploadArea.style.display = 'none';
                selectedMediaPreview.style.display = 'block';
            }
            reader.readAsDataURL(this.files[0]);
        }
    });

    // Trigger file input when clicking select button
    document.querySelector('.select-media-btn').addEventListener('click', () => {
        mediaInput.click();
    });

    // Audio Recording and Upload Functionality
    let mediaRecorder;
    let audioChunks = [];
    const recordAudioBtn = document.querySelector('.record-audio-btn');
    //const selectAudioBtn = document.querySelector('.select-audio-btn');
    //const audioInput = document.getElementById('audioInput');
    //const audioPreview = document.getElementById('audioPreview');
    //const audioControls = document.querySelector('.audio-controls');
    const audioUploadArea = document.querySelector('#audioTab .upload-area');

    // Audio Recording
    recordAudioBtn?.addEventListener('click', async () => {
        try {
            if (recordAudioBtn.textContent === 'Record Audio') {
                // Start Recording
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    audioPreview.src = audioUrl;
                    audioUploadArea.style.display = 'none';
                    audioControls.style.display = 'block';
                };

                mediaRecorder.start();
                recordAudioBtn.textContent = 'Stop Recording';
                recordAudioBtn.style.backgroundColor = '#ed4956';
            } else {
                // Stop Recording
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                recordAudioBtn.textContent = 'Record Audio';
                recordAudioBtn.style.backgroundColor = '';
            }
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Unable to access microphone. Please check your browser permissions.');
        }
    });

    // Audio Upload
    selectAudioBtn?.addEventListener('click', () => {
        audioInput.click();
    });

    audioInput?.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.type.startsWith('audio/')) {
                const audioUrl = URL.createObjectURL(file);
                audioPreview.src = audioUrl;
                audioUploadArea.style.display = 'none';
                audioControls.style.display = 'block';
            } else {
                alert('Please select an audio file.');
                this.value = '';
            }
        }
    });

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                mediaPreview.src = e.target.result;
                uploadArea.style.display = 'none';
                selectedMediaPreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
    // Initialize all carousels
    document.querySelectorAll('.post-media').forEach(postMedia => {
        const container = postMedia.querySelector('.carousel-container');
        if (!container) return;

        const slides = postMedia.querySelectorAll('.carousel-slide');
        const dots = postMedia.querySelectorAll('.carousel-dot');
        const prevBtn = postMedia.querySelector('.prev-btn');
        const nextBtn = postMedia.querySelector('.next-btn');
        let currentSlide = 0;

        function updateCarousel() {
            container.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
            prevBtn.style.display = currentSlide === 0 ? 'none' : 'flex';
            nextBtn.style.display = currentSlide === slides.length - 1 ? 'none' : 'flex';
        }

        nextBtn?.addEventListener('click', () => {
            if (currentSlide < slides.length - 1) {
                currentSlide++;
                updateCarousel();
            }
        });

        prevBtn?.addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateCarousel();
            }
        });

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                updateCarousel();
            });
        });

        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;

        container.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        container.addEventListener('touchmove', (e) => {
            touchEndX = e.touches[0].clientX;
        });

        container.addEventListener('touchend', () => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentSlide < slides.length - 1) {
                    currentSlide++;
                    updateCarousel();
                } else if (diff < 0 && currentSlide > 0) {
                    currentSlide--;
                    updateCarousel();
                }
            }
        });

        updateCarousel();
    });

    // 🔥 Double-click to like (on the entire post-media area)
    document.querySelectorAll('.post-media').forEach(media => {
        media.addEventListener('dblclick', function (e) {
            const post = this.closest('.post-card');
            if (!post) return;

            const likeBtn = post.querySelector('.like-btn');
            const heartIcon = likeBtn?.querySelector('.fa-heart');
            const likesCountEl = post.querySelector('.likes-count'); // Optional: add this if you show count

            if (!heartIcon || heartIcon.classList.contains('fas')) return; // Already liked

            // Visual feedback
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas', 'liked');
            heartIcon.style.color = '#ed4956';

            // 💖 Heart animation
            const heart = document.createElement('div');
            heart.className = 'heart-animation';
            heart.innerHTML = '<i class="fas fa-heart"></i>';
            this.appendChild(heart);

            // Optional: increment like count if you have it
            if (likesCountEl) {
                let count = parseInt(likesCountEl.textContent.replace(/,/g, '')) || 0;
                likesCountEl.textContent = (count + 1).toLocaleString();
            }

            setTimeout(() => {
                heart.remove();
            }, 800);
        });
    });

    // Single click on like button
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const heartIcon = this.querySelector('.fa-heart');
            if (!heartIcon) return;

            if (heartIcon.classList.contains('fas')) {
                // Unlike
                heartIcon.classList.remove('fas', 'liked');
                heartIcon.classList.add('far');
                heartIcon.style.color = '';
            } else {
                // Like
                heartIcon.classList.remove('far');
                heartIcon.classList.add('fas', 'liked');
                heartIcon.style.color = '#ed4956';
            }

            // Optional: update like count here too if needed
        });
    });

    // Show more/less description
    document.querySelectorAll('.show-more-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const text = this.previousElementSibling;
            if (!text) return;

            text.classList.toggle('expanded');
            this.textContent = text.classList.contains('expanded') ? 'less' : 'more';
        });
    });

    // Comment functionality
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const post = this.closest('.post-card');
            const commentBox = post.querySelector('.comment-input');
            if (commentBox) {
                commentBox.focus();
                // Scroll to comment section
                post.querySelector('.comments-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Comment input functionality
    document.querySelectorAll('.comment-input').forEach(input => {
        input.addEventListener('input', function() {
            const postBtn = this.parentElement.querySelector('.post-comment-btn');
            postBtn.disabled = !this.value.trim();
        });

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                const post = this.closest('.post-card');
                addNewComment(post, this.value.trim());
                this.value = '';
                this.parentElement.querySelector('.post-comment-btn').disabled = true;
            }
        });
    });

    document.querySelectorAll('.post-comment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.comment-input');
            if (input.value.trim()) {
                const post = this.closest('.post-card');
                addNewComment(post, input.value.trim());
                input.value = '';
                this.disabled = true;
            }
        });
    });

    // Function to add new comment
    function addNewComment(post, commentText) {
        const commentsList = post.querySelector('.comments-list');
        const newComment = document.createElement('div');
        newComment.className = 'comment-item';
        newComment.innerHTML = `
            <img src="https://c8.alamy.com/comp/2HD94X6/happy-black-mom-taking-selfie-with-her-adorable-infant-baby-at-home-2HD94X6.jpg" alt="Your Profile" class="comment-avatar">
            <div class="comment-content">
                <span class="comment-username">acbs_sonu22</span>
                <p class="comment-text">${commentText}</p>
                <div class="comment-actions">
                    <span class="comment-time">now</span>
                    <button class="comment-like-btn">Like</button>
                    <button class="comment-reply-btn">Reply</button>
                </div>
            </div>
        `;
        commentsList.appendChild(newComment);
        
        // Add event listeners to new comment's buttons
        const likeBtn = newComment.querySelector('.comment-like-btn');
        likeBtn.addEventListener('click', function() {
            this.style.color = this.style.color === 'rgb(237, 73, 86)' ? '' : '#ed4956';
            this.textContent = this.style.color === '#ed4956' ? 'Liked' : 'Like';
        });
    }

    // Comment like and reply functionality
    document.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.style.color = this.style.color === 'rgb(237, 73, 86)' ? '' : '#ed4956';
            this.textContent = this.style.color === '#ed4956' ? 'Liked' : 'Like';
        });
    });
});
