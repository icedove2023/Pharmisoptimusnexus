// public/js/engagement.js
// Views and likes for blog posts and publications.
//
// View: counted once per page load, after the visitor has kept the page open
// and visible for a few seconds. The server ignores crawlers and counts one
// view per visitor per post per day.
// Like: a button that toggles. The server holds the truth (one like per
// visitor per post); the page renders the initial state.
(function () {
    'use strict';

    var VIEW_DELAY_MS = 4000;

    function post(url) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin',
            keepalive: true
        }).then(function (response) {
            if (!response.ok) throw new Error('Request failed: ' + response.status);
            return response.json();
        });
    }

    // ---- Views ----
    function startViewTimer(postId) {
        if (navigator.webdriver) return;

        var visibleMs = 0;
        var last = document.visibilityState === 'visible' ? Date.now() : null;
        var sent = false;

        var timer = setInterval(function () {
            var now = Date.now();
            if (last !== null) visibleMs += now - last;
            last = document.visibilityState === 'visible' ? now : null;

            if (!sent && visibleMs >= VIEW_DELAY_MS) {
                sent = true;
                clearInterval(timer);
                post('/api/views/' + encodeURIComponent(postId))
                    .then(function (data) {
                        var counter = document.getElementById('viewCount');
                        if (counter && data && data.counted && typeof data.views === 'number') {
                            counter.textContent = data.views;
                        }
                    })
                    .catch(function () { /* views are best effort */ });
            }
        }, 500);
    }

    // ---- Likes ----
    function setLiked(button, liked) {
        button.setAttribute('aria-pressed', liked ? 'true' : 'false');
        var icon = button.querySelector('.icon');
        if (icon) icon.classList.toggle('liked', liked);
    }

    function initLike(button) {
        var postId = button.getAttribute('data-post-id');
        var count = button.querySelector('[data-like-count]');
        var busy = false;

        button.addEventListener('click', function () {
            if (busy) return;
            busy = true;
            button.disabled = true;

            post('/api/likes/' + encodeURIComponent(postId))
                .then(function (data) {
                    if (!data || !data.success) return;
                    if (count) count.textContent = data.likes;
                    setLiked(button, Boolean(data.liked));
                })
                .catch(function () { /* leave the button as it was */ })
                .then(function () {
                    busy = false;
                    button.disabled = false;
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var article = document.querySelector('[data-track-view]');
        if (article) startViewTimer(article.getAttribute('data-post-id'));

        document.querySelectorAll('[data-like-button]').forEach(initLike);
    });
})();
