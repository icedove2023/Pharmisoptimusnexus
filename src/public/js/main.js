// src/public/js/main.js

// ============================================================
// THEME TOGGLE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
});

// ============================================================
// MOBILE NAV
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileNav.classList.toggle('open');
        });
        
        mobileNav.addEventListener('click', function() {
            this.classList.remove('open');
        });
    }
});

// ============================================================
// SCROLL REVEAL
// ============================================================
function observeReveal() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.12 });
    
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(observeReveal, 200);
});

// ============================================================
// LOADER
// ============================================================
window.addEventListener('load', function() {
    setTimeout(() => {
        document.getElementById('loader')?.classList.add('hide');
    }, 800);
});

// ============================================================
// STATS COUNTER
// ============================================================
function animateCounters() {
    document.querySelectorAll('.stat-num').forEach(el => {
        const target = parseInt(el.dataset.count) || 0;
        let current = 0;
        const increment = Math.max(1, Math.floor(target / 60));
        const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            el.textContent = current + (target >= 1000 ? '+' : '');
            if (current >= target) clearInterval(timer);
        }, 18);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(animateCounters, 500);
});

// ============================================================
// HERO SLIDESHOW
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const heroSlides = document.getElementById('heroSlides');
    const heroDots = document.getElementById('heroDots');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');

    if (!heroSlides || !heroDots || !prevBtn || !nextBtn) return;

    const fallbackSlides = [
        {
            headline: '',
            subtitle: '',
            label: '',
            image: '/images/aa.jpg'
        },
        {
            headline: '',
            subtitle: '',
            label: '',
            image: '/images/bb.jpg'
        },
        {
            headline: '',
            subtitle: '',
            label: '',
            image: '/images/mental.png'
        }
    ];

    let slides = [...fallbackSlides];
    let currentIndex = 0;
    let autoplayTimer = null;

    function normalizeSlides(data) {
        if (!Array.isArray(data)) return fallbackSlides;

        return data
            .map((item) => {
                const title = item.title || item.headline || item.heading || '';
                const subtitle = item.subtitle || item.description || item.text || '';
                const label = item.label || item.category || item.tag || 'Featured';
                const image = item.image || item.image_url || item.img || item.photo || '';

                if (!title && !subtitle && !image) return null;

                return {
                    headline: title,
                    subtitle,
                    label,
                    image: image || fallbackSlides[0].image
                };
            })
            .filter(Boolean);
    }

    function renderSlides() {
        heroSlides.innerHTML = '';
        heroDots.innerHTML = '';

        if (!slides.length) {
            slides = [...fallbackSlides];
        }

        slides.forEach((slide, index) => {
            const slideEl = document.createElement('article');
            slideEl.className = `hero-slide${index === currentIndex ? ' active' : ''}`;
            slideEl.innerHTML = `
                <img class="hero-slide-media" src="${slide.image}" alt="" />
                <div class="hero-slide-bg" style="background: linear-gradient(135deg, rgba(10,16,26,0.8), rgba(134,55,62,0.45));"></div>
                <div class="hero-slide-overlay">
                    <span class="hero-slide-label">${slide.label}</span>
                    <h2>${slide.headline}</h2>
                    <p>${slide.subtitle}</p>
                </div>
            `;
            heroSlides.appendChild(slideEl);

            const dot = document.createElement('button');
            dot.className = `hero-dot${index === currentIndex ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            dot.addEventListener('click', () => goToSlide(index));
            heroDots.appendChild(dot);
        });
    }

    function goToSlide(index) {
        currentIndex = (index + slides.length) % slides.length;
        renderSlides();
        restartAutoplay();
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    function restartAutoplay() {
        if (autoplayTimer) clearInterval(autoplayTimer);
        autoplayTimer = setInterval(nextSlide, 6000);
    }

    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    heroSlides.addEventListener('mouseenter', () => {
        if (autoplayTimer) clearInterval(autoplayTimer);
    });

    heroSlides.addEventListener('mouseleave', restartAutoplay);

    fetch('/api/hero-slides')
        .then(async (response) => {
            if (!response.ok) throw new Error('Hero slides request failed');
            const json = await response.json();
            const normalized = normalizeSlides(json?.slides || []);
            if (normalized.length) {
                slides = normalized;
                currentIndex = 0;
            }
            renderSlides();
            restartAutoplay();
        })
        .catch(() => {
            renderSlides();
            restartAutoplay();
        });
});

// ============================================================
// NEWSLETTER
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.newsletter-submit').forEach(btn => {
        btn.addEventListener('click', function() {
            const container = this.closest('.footer-col') || this.closest('.sidebar-widget');
            const input = container ? container.querySelector('.newsletter-email') : null;
            const success = container ? container.querySelector('.newsletter-success') : null;
            
            if (input && input.value.trim()) {
                if (success) {
                    success.classList.add('show');
                    setTimeout(() => {
                        success.classList.remove('show');
                        input.value = '';
                    }, 3000);
                }
            } else if (input) {
                input.style.borderColor = 'var(--blush)';
                setTimeout(() => input.style.borderColor = '', 2000);
            }
        });
    });
});

// ============================================================
// VIEW TRACKING
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const viewTracker = document.querySelector('[data-track-view]');
    if (viewTracker) {
        const postId = viewTracker.dataset.postId;
        fetch(`/api/views/${postId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Failed to track view:', err));
    }
});

// ============================================================
// FILTERS
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Blog category filter
    const blogCategoryFilter = document.getElementById('blogCategoryFilter');
    if (blogCategoryFilter) {
        blogCategoryFilter.addEventListener('change', function() {
            const category = this.value;
            const url = new URL(window.location.href);
            if (category) {
                url.searchParams.set('category', category);
            } else {
                url.searchParams.delete('category');
            }
            window.location.href = url.toString();
        });
    }
    
    // Blog search
    const blogSearch = document.getElementById('blogSearch');
    if (blogSearch) {
        let searchTimeout;
        blogSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = this.value.trim();
                const url = new URL(window.location.href);
                if (query) {
                    url.searchParams.set('search', query);
                } else {
                    url.searchParams.delete('search');
                }
                window.location.href = url.toString();
            }, 500);
        });
    }
});

// ============================================================
// SIDEBAR CATEGORY FILTER
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.category-list li[data-cat]').forEach(item => {
        item.addEventListener('click', function() {
            const cat = this.dataset.cat;
            const url = new URL(window.location.href);
            if (cat === 'all') {
                url.searchParams.delete('category');
            } else {
                url.searchParams.set('category', cat);
            }
            window.location.href = url.toString();
        });
    });
});

// ============================================================
// TAG FILTER
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tag-chip').forEach(tag => {
        tag.addEventListener('click', function() {
            const tagName = this.dataset.tag;
            const url = new URL(window.location.href);
            if (tagName) {
                url.searchParams.set('tag', tagName);
            }
            window.location.href = url.toString();
        });
    });
});
