// public/js/post-editor.js
// The blog post block editor. No build step and no framework: this file
// renders and serializes the block list directly against the DOM.
//
// Rich text (paragraphs, list items, notes) is written as small "lite
// markdown" - **bold**, *italic*, `code`, [text](url) - because a full
// contentEditable WYSIWYG cannot be verified without a browser to test it
// in. mdLiteToHtml() converts that into the small HTML tag set the server
// re-validates and sanitizes (src/utils/richText.js); htmlToMdLite() reverses
// it so editing an existing post shows the same syntax back. Neither
// function nests formatting (no **bold *and* italic** in one span) - a
// deliberate limit of this lightweight editor, not the server's rule.

(function (root) {
    'use strict';

    function escapeText(value) {
        return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function mdLiteToHtml(raw) {
        let s = escapeText(raw == null ? '' : raw);
        s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s()]+|mailto:[^\s()]+)\)/g, '<a href="$2">$1</a>');
        s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>');
        s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        s = s.replace(/\r\n|\r|\n/g, '<br>');
        return s;
    }

    function unescapeText(value) {
        return String(value).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    function htmlToMdLite(html) {
        let s = String(html == null ? '' : html);
        s = s.replace(/<br\s*\/?>/gi, '\n');
        s = s.replace(/<a href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
        s = s.replace(/<b>([^<]*)<\/b>/gi, '**$1**');
        s = s.replace(/<i>([^<]*)<\/i>/gi, '*$1*');
        s = s.replace(/<code>([^<]*)<\/code>/gi, '`$1`');
        return unescapeText(s);
    }

    const api = { mdLiteToHtml, htmlToMdLite };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
        return; // Running under Node for unit tests; the DOM code below never loads.
    }

    // ------------------------------------------------------------
    // Everything past this point only runs in the browser.
    // ------------------------------------------------------------

    var BLOCK_LABELS = {
        heading: 'Heading', paragraph: 'Paragraph', list: 'List', quote: 'Quote',
        note: 'Callout', image: 'Image', gallery: 'Gallery', table: 'Table',
        divider: 'Divider', code: 'Code'
    };

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

    function field(labelText, inputNode) {
        var wrap = el('label', { class: 'block-field' }, [el('span', { text: labelText }), inputNode]);
        return wrap;
    }

    function textInput(value, placeholder) {
        return el('input', { type: 'text', value: value || '', placeholder: placeholder || '' });
    }

    function textArea(value, placeholder, rows) {
        var node = el('textarea', { placeholder: placeholder || '', rows: String(rows || 3) });
        node.value = value || '';
        return node;
    }

    function selectInput(options, current) {
        var node = el('select', {});
        options.forEach(function (opt) {
            var o = el('option', { value: opt.value, text: opt.label });
            if (opt.value === current) o.selected = true;
            node.appendChild(o);
        });
        return node;
    }

    function uploadImage(file, onDone) {
        var body = new FormData();
        body.append('file', file);
        var uploadUrl = (root.PON_ADMIN_PATH || '') + '/media';
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
            if (root.PON_openCropModal) {
                root.PON_openCropModal(file, startUpload);
            } else {
                startUpload(file);
            }
            input.value = '';
        });
        var wrap = el('div', { class: 'image-picker' }, [preview, input, status]);
        return wrap;
    }

    function pdfPicker(currentUrl, onUploaded) {
        var link = el('a', {
            class: 'pdf-link',
            href: currentUrl || '#',
            target: '_blank',
            rel: 'noopener',
            text: currentUrl ? 'Current PDF' : '',
            style: currentUrl ? '' : 'display:none'
        });
        var status = el('span', { class: 'field-status' });
        var input = el('input', { type: 'file', accept: 'application/pdf' });
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) return;
            status.textContent = 'Uploading...';
            var body = new FormData();
            body.append('file', file);
            var uploadUrl = (root.PON_ADMIN_PATH || '') + '/media/pdf';
            fetch(uploadUrl, { method: 'POST', body: body, credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (!data || !data.success) { status.textContent = (data && data.error) || 'Upload failed'; return; }
                    status.textContent = '';
                    link.href = data.url;
                    link.textContent = 'Current PDF';
                    link.style.display = '';
                    onUploaded(data.url);
                })
                .catch(function () { status.textContent = 'Upload failed'; });
        });
        return el('div', { class: 'image-picker' }, [link, input, status]);
    }

    // ---- Block model ----
    // Each block card keeps its editable state on the DOM node itself
    // (node._data) and a serialize() function that reads the current DOM
    // values into the shape utils/contentBlocks.js expects.

    function makeCard(type, data) {
        var card = el('div', { class: 'block-card', 'data-type': type });
        var body = el('div', { class: 'block-body' });
        var serialize;

        switch (type) {
            case 'heading': {
                var levelSel = selectInput([{ value: '2', label: 'H2' }, { value: '3', label: 'H3' }, { value: '4', label: 'H4' }], String(data.level || 2));
                var textIn = textInput(data.text, 'Heading text');
                body.appendChild(field('Level', levelSel));
                body.appendChild(field('Text', textIn));
                serialize = function () { return { type: 'heading', level: Number(levelSel.value), text: textIn.value }; };
                break;
            }
            case 'paragraph': {
                var pArea = textArea(htmlToMdLite(data.html), 'Text. Use **bold**, *italic*, `code`, [link](https://...)', 4);
                body.appendChild(field('Paragraph (supports **bold**, *italic*, `code`, [link](url))', pArea));
                serialize = function () { return { type: 'paragraph', html: mdLiteToHtml(pArea.value) }; };
                break;
            }
            case 'list': {
                var styleSel = selectInput([{ value: 'bullet', label: 'Bullet' }, { value: 'number', label: 'Numbered' }], data.style || 'bullet');
                var itemsRaw = (data.items || []).map(function (h) { return htmlToMdLite(h); }).join('\n');
                var itemsArea = textArea(itemsRaw, 'One item per line', 5);
                body.appendChild(field('Style', styleSel));
                body.appendChild(field('Items (one per line)', itemsArea));
                serialize = function () {
                    var items = itemsArea.value.split('\n').map(function (l) { return mdLiteToHtml(l.trim()); }).filter(function (l) { return l; });
                    return { type: 'list', style: styleSel.value, items: items };
                };
                break;
            }
            case 'quote': {
                var qText = textArea(data.text, 'Quote text', 3);
                var qSource = textInput(data.source, 'Attribution (optional)');
                body.appendChild(field('Quote', qText));
                body.appendChild(field('Source', qSource));
                serialize = function () {
                    var out = { type: 'quote', text: qText.value };
                    if (qSource.value.trim()) out.source = qSource.value;
                    return out;
                };
                break;
            }
            case 'note': {
                var variantSel = selectInput([{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'success', label: 'Success' }], data.variant || 'info');
                var noteArea = textArea(htmlToMdLite(data.html), 'Callout text', 3);
                body.appendChild(field('Style', variantSel));
                body.appendChild(field('Text', noteArea));
                serialize = function () { return { type: 'note', variant: variantSel.value, html: mdLiteToHtml(noteArea.value) }; };
                break;
            }
            case 'image': {
                var imgSrc = data.src || '';
                var imgAlt = textInput(data.alt, 'Alt text (for accessibility)');
                var imgCaption = textInput(data.caption, 'Caption (optional)');
                var imgSize = selectInput([{ value: 'inline', label: 'Inline' }, { value: 'wide', label: 'Wide' }, { value: 'full', label: 'Full width' }], data.size || 'wide');
                var imgAlign = selectInput([{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }], data.align || 'center');
                var picker = imagePicker(imgSrc, function (url) { imgSrc = url; });
                body.appendChild(field('Image', picker));
                body.appendChild(field('Alt text', imgAlt));
                body.appendChild(field('Caption', imgCaption));
                body.appendChild(field('Size', imgSize));
                body.appendChild(field('Alignment', imgAlign));
                serialize = function () { return { type: 'image', src: imgSrc, alt: imgAlt.value, caption: imgCaption.value, size: imgSize.value, align: imgAlign.value }; };
                break;
            }
            case 'gallery': {
                var items = (data.images || []).map(function (img) { return { src: img.src, alt: img.alt || '', caption: img.caption || '' }; });
                var list = el('div', { class: 'gallery-items' });
                function renderItems() {
                    list.innerHTML = '';
                    items.forEach(function (img, idx) {
                        var altIn = textInput(img.alt, 'Alt text');
                        altIn.addEventListener('input', function () { img.alt = altIn.value; });
                        var capIn = textInput(img.caption, 'Caption');
                        capIn.addEventListener('input', function () { img.caption = capIn.value; });
                        var picker2 = imagePicker(img.src, function (url) { img.src = url; });
                        var removeBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Remove' });
                        removeBtn.addEventListener('click', function () { items.splice(idx, 1); renderItems(); });
                        list.appendChild(el('div', { class: 'gallery-item' }, [picker2, altIn, capIn, removeBtn]));
                    });
                }
                renderItems();
                var addImgBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', text: 'Add image' });
                addImgBtn.addEventListener('click', function () { items.push({ src: '', alt: '', caption: '' }); renderItems(); });
                body.appendChild(field('Images', list));
                body.appendChild(addImgBtn);
                serialize = function () { return { type: 'gallery', images: items.filter(function (i) { return i.src; }) }; };
                break;
            }
            case 'table': {
                var headersArea = textArea((data.headers || []).join(', '), 'Column headers, comma separated', 1);
                var rowsArea = textArea((data.rows || []).map(function (r) { return r.join(', '); }).join('\n'), 'One row per line, cells comma separated', 4);
                body.appendChild(field('Headers', headersArea));
                body.appendChild(field('Rows (one per line)', rowsArea));
                serialize = function () {
                    var headers = headersArea.value.split(',').map(function (h) { return h.trim(); }).filter(Boolean);
                    var rows = rowsArea.value.split('\n').map(function (line) {
                        return line.split(',').map(function (c) { return c.trim(); });
                    }).filter(function (r) { return r.length && r.some(Boolean); });
                    return { type: 'table', headers: headers, rows: rows };
                };
                break;
            }
            case 'divider': {
                body.appendChild(el('p', { class: 'muted', text: 'A horizontal rule between sections.' }));
                serialize = function () { return { type: 'divider' }; };
                break;
            }
            case 'code': {
                var langSel = selectInput(
                    ['text', 'javascript', 'typescript', 'python', 'bash', 'sql', 'json', 'html', 'css'].map(function (l) { return { value: l, label: l }; }),
                    data.language || 'text'
                );
                var codeArea = textArea(data.code, 'Code', 6);
                codeArea.classList.add('code-input');
                body.appendChild(field('Language', langSel));
                body.appendChild(field('Code', codeArea));
                serialize = function () { return { type: 'code', language: langSel.value, code: codeArea.value }; };
                break;
            }
            default:
                serialize = function () { return null; };
        }

        var header = el('div', { class: 'block-header' }, [
            el('span', { class: 'block-label', text: BLOCK_LABELS[type] || type }),
            el('div', { class: 'block-actions' })
        ]);
        var actions = header.querySelector('.block-actions');
        var upBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', title: 'Move up' });
        upBtn.innerHTML = root.PON_ICONS.up;
        var downBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', title: 'Move down' });
        downBtn.innerHTML = root.PON_ICONS.down;
        var removeBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-small', title: 'Remove block' });
        removeBtn.innerHTML = root.PON_ICONS.remove;
        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(removeBtn);

        upBtn.addEventListener('click', function () {
            var prev = card.previousElementSibling;
            if (prev) card.parentNode.insertBefore(card, prev);
        });
        downBtn.addEventListener('click', function () {
            var next = card.nextElementSibling;
            if (next) card.parentNode.insertBefore(next, card);
        });
        removeBtn.addEventListener('click', function () {
            if (window.confirm('Remove this block?')) card.remove();
        });

        card.appendChild(header);
        card.appendChild(body);
        card.serialize = serialize;
        return card;
    }

    function init() {
        var list = document.getElementById('blocksList');
        var contentField = document.getElementById('contentField');
        var toolbar = document.getElementById('blockToolbar');
        var form = document.getElementById('postEditorForm');
        var titleInput = document.getElementById('title');
        var slugInput = document.getElementById('slug');
        var slugTouched = Boolean(slugInput && slugInput.value);
        var statusSelect = document.getElementById('status');
        var scheduledField = document.getElementById('scheduledField');

        if (!list || !contentField || !form) return;

        var initialScript = document.getElementById('initialContent');
        var initial = { sections: [] };
        if (initialScript) {
            try { initial = JSON.parse(initialScript.textContent) || { sections: [] }; } catch (e) { initial = { sections: [] }; }
        }
        (initial.sections || []).forEach(function (block) {
            if (block && BLOCK_LABELS[block.type]) list.appendChild(makeCard(block.type, block));
        });

        if (toolbar) {
            toolbar.querySelectorAll('[data-add-block]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    list.appendChild(makeCard(btn.getAttribute('data-add-block'), {}));
                });
            });
        }

        if (titleInput && slugInput) {
            slugInput.addEventListener('input', function () { slugTouched = true; });
            titleInput.addEventListener('input', function () {
                if (slugTouched) return;
                slugInput.value = titleInput.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
            });
        }

        if (statusSelect && scheduledField) {
            var toggleScheduled = function () {
                scheduledField.style.display = statusSelect.value === 'scheduled' ? '' : 'none';
            };
            statusSelect.addEventListener('change', toggleScheduled);
            toggleScheduled();
        }

        var coverField = document.getElementById('coverField');
        if (coverField) {
            var coverUrlInput = document.getElementById('image_url');
            var coverPicker = imagePicker(coverUrlInput.value, function (url) { coverUrlInput.value = url; });
            coverField.appendChild(coverPicker);
        }

        var pdfField = document.getElementById('pdfField');
        if (pdfField) {
            var pdfUrlInput = document.getElementById('pdf_url');
            pdfField.appendChild(pdfPicker(pdfUrlInput.value, function (url) { pdfUrlInput.value = url; }));
        }

        function serializeBlocks() {
            return Array.prototype.slice.call(list.children)
                .map(function (card) { return card.serialize ? card.serialize() : null; })
                .filter(Boolean);
        }

        form.addEventListener('submit', function () {
            contentField.value = JSON.stringify({ sections: serializeBlocks() });
        });

        // ---- Autosave (existing posts only; a brand-new post has nothing
        // to autosave against until it is saved once) ----
        var postId = form.getAttribute('data-post-id');
        var autosaveStatus = document.getElementById('autosaveStatus');
        if (postId) {
            function collectFieldValues() {
                var data = new FormData(form);
                var values = {};
                data.forEach(function (value, key) {
                    if (key === 'content') return; // rebuilt fresh below, not read from the (possibly stale) hidden field
                    values[key] = value;
                });
                return values;
            }

            function runAutosave() {
                var payload = collectFieldValues();
                payload.content = JSON.stringify({ sections: serializeBlocks() });
                if (autosaveStatus) autosaveStatus.textContent = 'Saving draft...';
                fetch((root.PON_ADMIN_PATH || '') + '/posts/' + postId + '/autosave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify(payload)
                }).then(function (r) {
                    if (!r.ok) throw new Error('autosave failed');
                    if (autosaveStatus) autosaveStatus.textContent = 'Draft saved ' + new Date().toLocaleTimeString();
                }).catch(function () {
                    if (autosaveStatus) autosaveStatus.textContent = 'Draft not saved (offline?)';
                });
            }

            setInterval(runAutosave, 25000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(typeof window !== 'undefined' ? window : globalThis);
