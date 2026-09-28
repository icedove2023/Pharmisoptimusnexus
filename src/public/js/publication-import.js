// public/js/publication-import.js
// Wires the "Import from BibTeX or RIS" panel on the new-publication screen
// to the parser in importFormats.js. Only fills form fields; nothing is
// saved until the admin reviews and clicks Save.
(function () {
    'use strict';

    function setField(form, name, value) {
        if (value === undefined || value === null || value === '') return;
        var field = form.querySelector('[name="' + name + '"]');
        if (field) field.value = value;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('citationImportBtn');
        var textarea = document.getElementById('citationImportText');
        var status = document.getElementById('citationImportStatus');
        var form = document.getElementById('postEditorForm');
        if (!btn || !textarea || !form || !window.PON_importFormats) return;

        btn.addEventListener('click', function () {
            var parsed = window.PON_importFormats.parseCitation(textarea.value);
            if (!parsed) {
                status.textContent = 'Could not read that as BibTeX or RIS.';
                return;
            }

            setField(form, 'title', parsed.title);
            setField(form, 'doi', parsed.doi);
            setField(form, 'volume', parsed.volume);
            setField(form, 'issue', parsed.issue);
            setField(form, 'pages', parsed.pages);
            setField(form, 'abstract', parsed.abstract);
            if (parsed.authors && parsed.authors.length) setField(form, 'authors', parsed.authors.join(', '));
            if (parsed.keywords && parsed.keywords.length) setField(form, 'keywords', parsed.keywords.join(', '));
            if (parsed.year && /^\d{4}$/.test(parsed.year)) setField(form, 'published_date', parsed.year + '-01-01');

            var titleInput = form.querySelector('[name="title"]');
            if (titleInput) titleInput.dispatchEvent(new Event('input', { bubbles: true })); // let the slug auto-fill pick it up

            status.textContent = 'Fields filled in - review them, especially the published date, before saving.';
        });
    });
})();
