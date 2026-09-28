// public/js/site-content-editor.js
// Small admin pages that are a plain list plus a simple form (hero slides,
// team members) - not the block editor, so this only needs an image picker
// with the same crop step post-editor.js uses, and a confirm-before-submit
// for delete buttons.
(function () {
    'use strict';

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === 'class') node.className = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
        (children || []).forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    }

    function uploadImage(fileOrBlob, onDone) {
        var body = new FormData();
        body.append('file', fileOrBlob);
        var uploadUrl = (window.PON_ADMIN_PATH || '') + '/media';
        fetch(uploadUrl, { method: 'POST', body: body, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.success) onDone(null, data.url);
                else onDone((data && data.error) || 'Upload failed');
            })
            .catch(function () { onDone('Upload failed'); });
    }

    function imagePicker(currentUrl, onUploaded) {
        var preview = el('img', { class: 'block-image-preview', style: currentUrl ? '' : 'display:none', src: currentUrl || '' });
        var status = el('span', { class: 'field-status' });
        var input = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif' });
        var startUpload = function (fileOrBlob) {
            status.textContent = 'Uploading...';
            uploadImage(fileOrBlob, function (err, url) {
                if (err) { status.textContent = err; return; }
                status.textContent = '';
                preview.src = url;
                preview.style.display = '';
                onUploaded(url);
            });
        };
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;
            if (window.PON_openCropModal) window.PON_openCropModal(file, startUpload);
            else startUpload(file);
            input.value = '';
        });
        return el('div', { class: 'image-picker' }, [preview, input, status]);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var slideField = document.getElementById('slideImageField');
        if (slideField) {
            var slideUrlInput = document.getElementById('slideImageUrl');
            slideField.appendChild(imagePicker(slideUrlInput.value, function (url) { slideUrlInput.value = url; }));
        }

        var memberField = document.getElementById('memberPhotoField');
        if (memberField) {
            var memberUrlInput = document.getElementById('memberPhotoUrl');
            memberField.appendChild(imagePicker(memberUrlInput.value, function (url) { memberUrlInput.value = url; }));
        }

        document.querySelectorAll('form[data-confirm]').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                if (!window.confirm(form.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });
    });
})();
