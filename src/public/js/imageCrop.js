// public/js/imageCrop.js
// Central crop engine for admin media selection. Uses a profile-based crop
// frame to determine exactly what visitors will see, then generates a final
// processed image before uploading it through the usual Supabase flow.

(function (root) {
    'use strict';

    var MEDIA_PROFILES = {
        hero: {
            key: 'hero',
            label: 'Adjust Slide Image',
            aspectRatio: 16 / 9,
            output: { width: 1920, height: 1080 },
            maxLongEdge: 2560,
            quality: 0.92,
            note: 'Position the important subject inside the frame.'
        },
        blogCover: {
            key: 'blogCover',
            label: 'Adjust Blog Cover',
            aspectRatio: 16 / 9,
            output: { width: 1920, height: 1080 },
            maxLongEdge: 2560,
            quality: 0.92,
            note: 'Choose what visitors see in the blog card and feature area.'
        },
        postCover: {
            key: 'postCover',
            label: 'Adjust Post Cover',
            aspectRatio: 16 / 9,
            output: { width: 1920, height: 1080 },
            maxLongEdge: 2560,
            quality: 0.92,
            note: 'Choose the final cover composition.'
        },
        team: {
            key: 'team',
            label: 'Adjust Team Photo',
            aspectRatio: 1,
            output: { width: 800, height: 800 },
            maxLongEdge: 1200,
            quality: 0.94,
            note: 'Center the person so the face stays inside the avatar frame.'
        },
        gallery: {
            key: 'gallery',
            label: 'Adjust Gallery Image',
            aspectRatio: 4 / 3,
            output: { width: 1600, height: 1200 },
            maxLongEdge: 2000,
            quality: 0.92,
            note: 'Set the final gallery composition.'
        },
        article: {
            key: 'article',
            label: 'Adjust Article Image',
            aspectRatio: null,
            output: { width: 2000, height: 2000 },
            maxLongEdge: 2000,
            quality: 0.92,
            note: 'Keep the image at its natural aspect ratio unless you intentionally crop.'
        }
    };

    function clampBox(box, containerW, containerH, minSize) {
        minSize = minSize || 20;
        var w = Math.min(Math.max(box.w, minSize), containerW);
        var h = Math.min(Math.max(box.h, minSize), containerH);
        var x = Math.min(Math.max(box.x, 0), containerW - w);
        var y = Math.min(Math.max(box.y, 0), containerH - h);
        return { x: x, y: y, w: w, h: h };
    }

    function applyAspectRatio(box, ratio, containerW, containerH, minSize) {
        if (!ratio || ratio <= 0) return clampBox(box, containerW, containerH, minSize);
        var centerX = box.x + box.w / 2;
        var centerY = box.y + box.h / 2;
        var w = box.w;
        var h = w / ratio;
        if (h > containerH) {
            h = containerH;
            w = h * ratio;
        }
        if (w > containerW) {
            w = containerW;
            h = w / ratio;
        }
        var next = { x: centerX - w / 2, y: centerY - h / 2, w: w, h: h };
        return clampBox(next, containerW, containerH, minSize || 20);
    }

    function defaultBox(containerW, containerH, ratio) {
        var inset = 0.9;
        var w = containerW * inset;
        var h = containerH * inset;
        var box = { x: (containerW - w) / 2, y: (containerH - h) / 2, w: w, h: h };
        return applyAspectRatio(box, ratio, containerW, containerH);
    }

    function computeOutputSize(box, maxDim) {
        maxDim = maxDim || 1600;
        var longest = Math.max(box.w, box.h);
        var scale = longest > maxDim ? maxDim / longest : 1;
        return {
            width: Math.max(1, Math.round(box.w * scale)),
            height: Math.max(1, Math.round(box.h * scale))
        };
    }

    function resolveMediaProfile(profile) {
        if (!profile) return MEDIA_PROFILES.hero;
        if (typeof profile === 'string') return MEDIA_PROFILES[profile] || MEDIA_PROFILES.hero;
        if (profile.key) return MEDIA_PROFILES[profile.key] || profile;
        return profile;
    }

    function getTargetOutput(profile, sourceWidth, sourceHeight) {
        var resolved = resolveMediaProfile(profile);
        if (!resolved.aspectRatio && resolved.output) {
            var maxLongEdge = resolved.maxLongEdge || 2000;
            var longSide = Math.max(sourceWidth, sourceHeight);
            var scale = longSide > maxLongEdge ? maxLongEdge / longSide : 1;
            return {
                width: Math.max(1, Math.round(sourceWidth * scale)),
                height: Math.max(1, Math.round(sourceHeight * scale))
            };
        }
        if (resolved.output && resolved.output.width && resolved.output.height) {
            return { width: resolved.output.width, height: resolved.output.height };
        }
        var naturalRatio = sourceWidth / Math.max(sourceHeight, 1);
        var longEdge = Math.min(resolved.maxLongEdge || 2000, Math.max(sourceWidth, sourceHeight));
        if (naturalRatio >= 1) {
            return { width: longEdge, height: Math.max(1, Math.round(longEdge / naturalRatio)) };
        }
        return { width: Math.max(1, Math.round(longEdge * naturalRatio)), height: longEdge };
    }

    function clampScale(value, minScale, maxScale) {
        return Math.min(Math.max(value, minScale), maxScale);
    }

    function buildCropState(stageW, stageH, naturalWidth, naturalHeight, profile) {
        var resolved = resolveMediaProfile(profile);
        var ratio = resolved.aspectRatio || (naturalWidth / Math.max(naturalHeight, 1));
        var guideWidth = stageW * 0.86;
        var guideHeight = guideWidth / ratio;
        if (guideHeight > stageH * 0.82) {
            guideHeight = stageH * 0.82;
            guideWidth = guideHeight * ratio;
        }
        var minScale = Math.max(guideWidth / naturalWidth, guideHeight / naturalHeight);
        var scale = Math.max(minScale, 1.05);
        var imageWidth = naturalWidth * scale;
        var imageHeight = naturalHeight * scale;
        var x = (stageW - imageWidth) / 2;
        var y = (stageH - imageHeight) / 2;
        return {
            profile: resolved,
            ratio: resolved.aspectRatio || ratio,
            guideWidth: guideWidth,
            guideHeight: guideHeight,
            minScale: minScale,
            maxScale: Math.max(8, minScale * 8),
            scale: scale,
            x: x,
            y: y,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            frame: {
                left: (stageW - guideWidth) / 2,
                top: (stageH - guideHeight) / 2,
                width: guideWidth,
                height: guideHeight
            }
        };
    }

    function clampTranslation(state, stageW, stageH) {
        var minX = Math.min(0, stageW - state.imageWidth);
        var maxX = Math.max(0, state.imageWidth - stageW);
        var minY = Math.min(0, stageH - state.imageHeight);
        var maxY = Math.max(0, state.imageHeight - stageH);
        return {
            x: Math.min(Math.max(state.x, minX), maxX),
            y: Math.min(Math.max(state.y, minY), maxY)
        };
    }

    function getVisibleCropRect(state, naturalWidth, naturalHeight, containerWidth, containerHeight) {
        var left = state.frame.left - state.x;
        var top = state.frame.top - state.y;
        var width = state.frame.width / state.scale;
        var height = state.frame.height / state.scale;
        var sourceX = Math.max(0, left / state.scale);
        var sourceY = Math.max(0, top / state.scale);
        var sourceWidth = Math.max(0, Math.min(naturalWidth - sourceX, width));
        var sourceHeight = Math.max(0, Math.min(naturalHeight - sourceY, height));
        return {
            x: Math.max(0, sourceX),
            y: Math.max(0, sourceY),
            width: Math.max(1, sourceWidth),
            height: Math.max(1, sourceHeight)
        };
    }

    function makePreviewFromCrop(image, cropRect, outputSize, profile) {
        var canvas = document.createElement('canvas');
        canvas.width = outputSize.width;
        canvas.height = outputSize.height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            image,
            cropRect.x,
            cropRect.y,
            cropRect.width,
            cropRect.height,
            0,
            0,
            canvas.width,
            canvas.height
        );
        return canvas.toDataURL('image/jpeg', profile.quality || 0.92);
    }

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === 'class') node.className = attrs[key];
            else if (key === 'text') node.textContent = attrs[key];
            else if (key === 'html') node.innerHTML = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
        (children || []).forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    }

    function parseProfileOptions(options) {
        var value = options || {};
        return {
            profile: resolveMediaProfile(value.profile || 'hero'),
            label: value.label || 'Adjust Image',
            subtitle: value.subtitle || 'Move and zoom the image until the area inside the frame is exactly how you want visitors to see it.',
            useOriginalText: value.useOriginalText || 'Use original',
            confirmText: value.confirmText || 'Use This Crop',
            cancelText: value.cancelText || 'Cancel'
        };
    }

    function openCropModal(source, onDone, options) {
        var resolvedOptions = parseProfileOptions(options);
        var profile = resolvedOptions.profile;
        var sourceUrl = typeof source === 'string' ? source : null;
        var objectUrl = source && source instanceof Blob ? URL.createObjectURL(source) : null;
        var image = new Image();
        var loadUrl = sourceUrl || objectUrl;

        if (!loadUrl) {
            onDone(source);
            return;
        }

        image.onload = function () {
            var naturalWidth = image.naturalWidth || image.width;
            var naturalHeight = image.naturalHeight || image.height;
            var stageW = Math.min(Math.max(640, window.innerWidth - 90), 860);
            var stageH = Math.min(Math.max(420, window.innerHeight * 0.5), 700);
            var initialState = buildCropState(stageW, stageH, naturalWidth, naturalHeight, profile);
            var state = {
                scale: initialState.scale,
                x: initialState.x,
                y: initialState.y,
                imageWidth: naturalWidth * initialState.scale,
                imageHeight: naturalHeight * initialState.scale,
                frame: initialState.frame,
                minScale: initialState.minScale,
                maxScale: initialState.maxScale,
                ratio: initialState.ratio,
                profile: profile
            };

            var overlay = el('div', { class: 'crop-overlay' });
            var modal = el('div', { class: 'crop-modal' }, [
                el('div', { class: 'crop-header' }, [
                    el('div', { class: 'crop-header-copy' }, [
                        el('h3', { text: resolvedOptions.label }),
                        el('p', { text: resolvedOptions.subtitle })
                    ]),
                    el('button', { type: 'button', class: 'btn btn-ghost btn-small crop-close-btn', text: 'Close' })
                ]),
                el('div', { class: 'crop-panel' }, [
                    el('div', { class: 'crop-stage', style: 'width:' + stageW + 'px;height:' + stageH + 'px' }, [
                        el('img', { class: 'crop-image', src: loadUrl, alt: 'Cropped media preview', draggable: 'false' }),
                        el('div', { class: 'crop-guide' })
                    ]),
                    el('div', { class: 'crop-side' }, [
                        el('div', { class: 'crop-preview' }, [
                            el('div', { class: 'crop-preview-label', text: 'Final preview' }),
                            el('img', { class: 'crop-preview-image', alt: 'Final crop preview' })
                        ]),
                        el('div', { class: 'crop-controls' }, [
                            el('div', { class: 'crop-zoom-row' }, [
                                el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '-' }),
                                el('input', { type: 'range', min: '1', max: '100', step: '1', value: '50', 'aria-label': 'Zoom level' }),
                                el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: '+' })
                            ]),
                            el('div', { class: 'crop-actions-row' }, [
                                el('button', { type: 'button', class: 'btn btn-ghost', text: 'Reset Position' }),
                                el('button', { type: 'button', class: 'btn btn-primary', text: resolvedOptions.confirmText })
                            ])
                        ])
                    ])
                ])
            ]);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            var stage = modal.querySelector('.crop-stage');
            var imgEl = modal.querySelector('.crop-image');
            var guide = modal.querySelector('.crop-guide');
            var previewImg = modal.querySelector('.crop-preview-image');
            var zoomInput = modal.querySelector('input[type="range"]');
            var closeBtn = modal.querySelector('.crop-close-btn');
            var resetBtn = modal.querySelector('.crop-actions-row .btn-ghost');
            var applyBtn = modal.querySelector('.crop-actions-row .btn-primary');
            var zoomOutBtn = modal.querySelectorAll('.crop-zoom-row .btn')[0];
            var zoomInBtn = modal.querySelectorAll('.crop-zoom-row .btn')[1];
            var currentProfileNote = el('p', { class: 'crop-profile-note', text: profile.note || 'Position the important subject inside the frame.' });
            modal.querySelector('.crop-controls').insertBefore(currentProfileNote, modal.querySelector('.crop-actions-row'));

            function renderImage() {
                var nextScale = clampScale(state.scale, state.minScale, state.maxScale);
                state.scale = nextScale;
                var translated = clampTranslation(state, stageW, stageH);
                state.x = translated.x;
                state.y = translated.y;
                imgEl.style.width = Math.round(naturalWidth * state.scale) + 'px';
                imgEl.style.height = Math.round(naturalHeight * state.scale) + 'px';
                imgEl.style.left = Math.round(state.x) + 'px';
                imgEl.style.top = Math.round(state.y) + 'px';
                guide.style.left = Math.round(state.frame.left) + 'px';
                guide.style.top = Math.round(state.frame.top) + 'px';
                guide.style.width = Math.round(state.frame.width) + 'px';
                guide.style.height = Math.round(state.frame.height) + 'px';
                var zoomPercent = ((state.scale - state.minScale) / Math.max(0.01, state.maxScale - state.minScale)) * 100;
                zoomInput.value = String(Math.max(0, Math.min(100, Math.round(zoomPercent))));
                var outputSize = getTargetOutput(profile, naturalWidth, naturalHeight);
                var cropRect = getVisibleCropRect(state, naturalWidth, naturalHeight, stageW, stageH);
                previewImg.src = makePreviewFromCrop(image, cropRect, outputSize, profile);
            }

            function resetState() {
                var next = buildCropState(stageW, stageH, naturalWidth, naturalHeight, profile);
                state.scale = next.scale;
                state.x = next.x;
                state.y = next.y;
                state.imageWidth = naturalWidth * next.scale;
                state.imageHeight = naturalHeight * next.scale;
                state.frame = next.frame;
                state.minScale = next.minScale;
                state.maxScale = next.maxScale;
                renderImage();
            }

            function cleanup() {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                if (sourceUrl) {
                    // Source URL is reused after cropping; do not revoke custom URLs.
                }
                overlay.remove();
                document.removeEventListener('keydown', onKeyDown);
            }

            function onKeyDown(event) {
                if (event.key === 'Escape') {
                    cleanup();
                    onDone(source || fileFromSource(source));
                }
            }

            function fileFromSource(sourceValue) {
                return sourceValue || null;
            }

            function onApply() {
                var outputSize = getTargetOutput(profile, naturalWidth, naturalHeight);
                var cropRect = getVisibleCropRect(state, naturalWidth, naturalHeight, stageW, stageH);
                var canvas = document.createElement('canvas');
                canvas.width = outputSize.width;
                canvas.height = outputSize.height;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(
                    image,
                    cropRect.x,
                    cropRect.y,
                    cropRect.width,
                    cropRect.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
                var outputFormat = 'image/jpeg';
                var quality = profile.quality || 0.92;
                if (canvas.toDataURL('image/webp', 0.9).slice(0, 15) === 'data:image/webp') {
                    outputFormat = 'image/webp';
                }
                canvas.toBlob(function (blob) {
                    cleanup();
                    onDone(blob || source);
                }, outputFormat, quality);
            }

            function handleZoom(nextScale) {
                state.scale = clampScale(nextScale, state.minScale, state.maxScale);
                renderImage();
            }

            zoomInput.addEventListener('input', function () {
                var percent = Number(zoomInput.value) / 100;
                var rangeScale = state.minScale + (state.maxScale - state.minScale) * percent;
                handleZoom(rangeScale);
            });

            zoomOutBtn.addEventListener('click', function () {
                handleZoom(state.scale / 1.18);
            });
            zoomInBtn.addEventListener('click', function () {
                handleZoom(state.scale * 1.18);
            });
            resetBtn.addEventListener('click', resetState);
            applyBtn.addEventListener('click', onApply);
            closeBtn.addEventListener('click', function () {
                cleanup();
                onDone(source || null);
            });
            overlay.addEventListener('click', function (event) {
                if (event.target === overlay) {
                    cleanup();
                    onDone(source || null);
                }
            });

            var dragging = false;
            var dragStart = null;
            var startState = null;

            stage.addEventListener('pointerdown', function (event) {
                dragging = true;
                dragStart = { x: event.clientX, y: event.clientY };
                startState = { x: state.x, y: state.y };
                stage.setPointerCapture && stage.setPointerCapture(event.pointerId);
            });

            stage.addEventListener('pointermove', function (event) {
                if (!dragging || !dragStart || !startState) return;
                var dx = event.clientX - dragStart.x;
                var dy = event.clientY - dragStart.y;
                state.x = startState.x + dx;
                state.y = startState.y + dy;
                var clamped = clampTranslation(state, stageW, stageH);
                state.x = clamped.x;
                state.y = clamped.y;
                renderImage();
            });

            stage.addEventListener('pointerup', function () {
                dragging = false;
                dragStart = null;
                startState = null;
            });
            stage.addEventListener('pointerleave', function () {
                dragging = false;
                dragStart = null;
                startState = null;
            });

            stage.addEventListener('wheel', function (event) {
                event.preventDefault();
                var factor = event.deltaY < 0 ? 1.12 : 0.88;
                handleZoom(state.scale * factor);
            }, { passive: false });

            document.addEventListener('keydown', onKeyDown);
            renderImage();
        };

        image.onerror = function () {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            onDone(source || null);
        };

        image.src = loadUrl;
    }

    var api = {
        clampBox: clampBox,
        applyAspectRatio: applyAspectRatio,
        defaultBox: defaultBox,
        computeOutputSize: computeOutputSize,
        resolveMediaProfile: resolveMediaProfile,
        getTargetOutput: getTargetOutput,
        buildCropState: buildCropState,
        clampScale: clampScale,
        MEDIA_PROFILES: MEDIA_PROFILES
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    root.PON_MEDIA_PROFILES = MEDIA_PROFILES;
    root.PON_openCropModal = function (file, onDone, options) {
        if (file && file instanceof Blob) {
            openCropModal(file, onDone || function () {}, options || {});
            return;
        }
        if (typeof file === 'string') {
            openCropModal(file, onDone || function () {}, options || {});
            return;
        }
        if (file && file.type && file.type.indexOf('image/') === 0) {
            openCropModal(file, onDone || function () {}, options || {});
            return;
        }
        if (onDone) onDone(file);
    };
    root.PON_openCropModalFromUrl = function (url, onDone, options) {
        openCropModal(url, onDone || function () {}, options || {});
    };
})(typeof window !== 'undefined' ? window : globalThis);
