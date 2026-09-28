// public/js/imageCrop.js
// Pure geometry for the image-crop step in the block editor, plus the
// canvas/DOM wiring that uses it. The math is split out from the DOM so it
// can be unit tested with Node (no browser available in this environment to
// test the drag interaction itself - see docs/PHASE4.md).

(function (root) {
    'use strict';

    /**
     * Keep a crop box fully inside a container, with a minimum size.
     * Shrinks first if the box is bigger than the container, then
     * repositions so it can't hang off any edge.
     */
    function clampBox(box, containerW, containerH, minSize) {
        minSize = minSize || 20;
        var w = Math.min(Math.max(box.w, minSize), containerW);
        var h = Math.min(Math.max(box.h, minSize), containerH);
        var x = Math.min(Math.max(box.x, 0), containerW - w);
        var y = Math.min(Math.max(box.y, 0), containerH - h);
        return { x: x, y: y, w: w, h: h };
    }

    /**
     * Adjust a box's height to match a target width/height ratio, keeping
     * its center fixed, then clamp it back inside the container. `ratio`
     * is width/height (e.g. 16/9); pass null/0 to leave the box alone
     * (free-form cropping).
     */
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
        return clampBox(next, containerW, containerH, minSize);
    }

    /**
     * A default centered box covering most of the image, already matching
     * the given ratio (or a comfortable inset for free-form).
     */
    function defaultBox(containerW, containerH, ratio) {
        var inset = 0.9;
        var w = containerW * inset;
        var h = containerH * inset;
        var box = { x: (containerW - w) / 2, y: (containerH - h) / 2, w: w, h: h };
        return applyAspectRatio(box, ratio, containerW, containerH);
    }

    /**
     * Scale a crop box down to fit within maxDim on its longer side, so a
     * crop from a huge source photo doesn't upload a huge file. Never scales
     * up. Dimensions are rounded to whole pixels for canvas/toBlob.
     */
    function computeOutputSize(box, maxDim) {
        maxDim = maxDim || 1600;
        var longest = Math.max(box.w, box.h);
        var scale = longest > maxDim ? maxDim / longest : 1;
        return {
            width: Math.max(1, Math.round(box.w * scale)),
            height: Math.max(1, Math.round(box.h * scale))
        };
    }

    var api = { clampBox, applyAspectRatio, defaultBox, computeOutputSize };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
        return; // Under Node for unit tests; the DOM code below never loads.
    }

    // ------------------------------------------------------------
    // Browser-only: the crop modal itself.
    // ------------------------------------------------------------

    var RATIOS = [
        { label: 'Free', value: 0 },
        { label: '1:1', value: 1 },
        { label: '4:3', value: 4 / 3 },
        { label: '16:9', value: 16 / 9 }
    ];

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (key) {
            if (key === 'class') node.className = attrs[key];
            else if (key === 'text') node.textContent = attrs[key];
            else node.setAttribute(key, attrs[key]);
        });
        (children || []).forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    }

    /**
     * Open a crop modal over `file` (an image File/Blob). Calls
     * onDone(croppedBlob) if the person applies a crop, or onDone(file)
     * unchanged if they skip it. Never calls onDone twice.
     */
    function openCropModal(file, onDone) {
        var objectUrl = URL.createObjectURL(file);
        var img = new Image();

        img.onload = function () {
            var displayW = Math.min(img.naturalWidth, 640);
            var displayH = displayW * (img.naturalHeight / img.naturalWidth);
            var scaleToNatural = img.naturalWidth / displayW;

            var ratio = 0;
            var box = defaultBox(displayW, displayH, ratio);

            var overlay = el('div', { class: 'crop-overlay' });
            var frame = el('div', { class: 'crop-frame', style: 'width:' + displayW + 'px;height:' + displayH + 'px' });
            var imgEl = el('img', { src: objectUrl, class: 'crop-source', draggable: 'false' });
            var boxEl = el('div', { class: 'crop-box' });
            frame.appendChild(imgEl);
            frame.appendChild(boxEl);

            function paint() {
                boxEl.style.left = box.x + 'px';
                boxEl.style.top = box.y + 'px';
                boxEl.style.width = box.w + 'px';
                boxEl.style.height = box.h + 'px';
            }
            paint();

            var ratioBar = el('div', { class: 'crop-ratios' });
            RATIOS.forEach(function (r) {
                var btn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: r.label });
                if (r.value === ratio) btn.classList.add('is-active');
                btn.addEventListener('click', function () {
                    ratio = r.value;
                    box = applyAspectRatio(box, ratio, displayW, displayH);
                    paint();
                    ratioBar.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
                    btn.classList.add('is-active');
                });
                ratioBar.appendChild(btn);
            });

            // Drag to move, drag the bottom-right handle to resize.
            var handle = el('div', { class: 'crop-handle' });
            boxEl.appendChild(handle);

            function onPointerDown(e, mode) {
                e.preventDefault();
                var startX = e.clientX, startY = e.clientY;
                var startBox = { x: box.x, y: box.y, w: box.w, h: box.h };

                function onMove(ev) {
                    var dx = ev.clientX - startX, dy = ev.clientY - startY;
                    if (mode === 'move') {
                        box = clampBox({ x: startBox.x + dx, y: startBox.y + dy, w: startBox.w, h: startBox.h }, displayW, displayH);
                    } else {
                        var box2 = { x: startBox.x, y: startBox.y, w: startBox.w + dx, h: startBox.h + dy };
                        box = ratio ? applyAspectRatio(box2, ratio, displayW, displayH) : clampBox(box2, displayW, displayH);
                    }
                    paint();
                }
                function onUp() {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                }
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }
            boxEl.addEventListener('pointerdown', function (e) {
                if (e.target === handle) onPointerDown(e, 'resize');
                else onPointerDown(e, 'move');
            });

            // Keyboard equivalents of the two drags above, so the crop tool
            // does not require a mouse or touch. The box itself moves with
            // the arrow keys; the resize handle (a separate stop on the tab
            // order) resizes with them. Shift takes bigger steps. Enter on
            // either applies the crop, matching the Apply button.
            boxEl.tabIndex = 0;
            boxEl.setAttribute('role', 'group');
            boxEl.setAttribute('aria-label', 'Crop area. Arrow keys move it; Enter applies the crop.');
            handle.tabIndex = 0;
            handle.setAttribute('role', 'slider');
            handle.setAttribute('aria-label', 'Resize crop area. Arrow keys resize it; Enter applies the crop.');

            boxEl.addEventListener('keydown', function (e) {
                var step = e.shiftKey ? 24 : 8;
                var moved = { x: box.x, y: box.y, w: box.w, h: box.h };
                if (e.key === 'ArrowLeft') moved.x -= step;
                else if (e.key === 'ArrowRight') moved.x += step;
                else if (e.key === 'ArrowUp') moved.y -= step;
                else if (e.key === 'ArrowDown') moved.y += step;
                else if (e.key === 'Enter') { e.preventDefault(); applyBtn.click(); return; }
                else return;

                e.preventDefault();
                box = clampBox(moved, displayW, displayH);
                paint();
            });

            handle.addEventListener('keydown', function (e) {
                var step = e.shiftKey ? 24 : 8;
                var resized = { x: box.x, y: box.y, w: box.w, h: box.h };
                if (e.key === 'ArrowRight') resized.w += step;
                else if (e.key === 'ArrowLeft') resized.w -= step;
                else if (e.key === 'ArrowDown') resized.h += step;
                else if (e.key === 'ArrowUp') resized.h -= step;
                else if (e.key === 'Enter') { e.preventDefault(); applyBtn.click(); return; }
                else return;

                e.preventDefault();
                e.stopPropagation(); // handle is inside boxEl; don't also trigger the move handler above
                box = ratio ? applyAspectRatio(resized, ratio, displayW, displayH) : clampBox(resized, displayW, displayH);
                paint();
            });

            function cleanup() {
                URL.revokeObjectURL(objectUrl);
                document.removeEventListener('keydown', onKeyDown);
                overlay.remove();
            }

            function onKeyDown(e) {
                if (e.key === 'Escape') { cleanup(); onDone(file); }
            }

            var applyBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Apply crop' });
            applyBtn.addEventListener('click', function () {
                var natural = {
                    x: box.x * scaleToNatural, y: box.y * scaleToNatural,
                    w: box.w * scaleToNatural, h: box.h * scaleToNatural
                };
                var out = computeOutputSize(natural, 1600);
                var canvas = document.createElement('canvas');
                canvas.width = out.width;
                canvas.height = out.height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, natural.x, natural.y, natural.w, natural.h, 0, 0, out.width, out.height);
                canvas.toBlob(function (blob) {
                    cleanup();
                    onDone(blob || file);
                }, 'image/jpeg', 0.9);
            });
            var skipBtn = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Use original' });
            skipBtn.addEventListener('click', function () { cleanup(); onDone(file); });

            overlay.addEventListener('mousedown', function (e) {
                if (e.target === overlay) { cleanup(); onDone(file); }
            });
            document.addEventListener('keydown', onKeyDown);

            var actions = el('div', { class: 'crop-actions' }, [ratioBar, el('div', { class: 'crop-actions-buttons' }, [skipBtn, applyBtn])]);
            overlay.appendChild(el('div', { class: 'crop-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Crop image' }, [
                el('h3', { text: 'Crop image' }),
                el('p', { class: 'crop-keyboard-hint', text: 'Tab to the crop area or its resize handle, then use the arrow keys (hold Shift to move faster). Enter applies the crop; Escape cancels.' }),
                frame,
                actions
            ]));
            document.body.appendChild(overlay);
            boxEl.focus();
        };

        img.onerror = function () {
            URL.revokeObjectURL(objectUrl);
            onDone(file); // Can't preview it; upload as-is rather than block the admin.
        };

        img.src = objectUrl;
    }

    root.PON_openCropModal = openCropModal;
})(typeof window !== 'undefined' ? window : globalThis);
