// src/utils/snapshotDiff.js
// Compares two editor snapshots (a post_revisions row, an autosave payload,
// or the live post/publication in the same raw-string shape via
// valuesFromPost/detailValuesFromRecord) field by field, for the "what
// would restoring this change" view in the admin History panel.
//
// Deliberately shallow: fields are compared as the raw strings the form
// itself uses (e.g. "one, two" for tags), not parsed back into arrays first.
// That is enough to show an admin what changed without a second copy of the
// form-parsing logic here.

const FIELD_LABELS = {
    title: 'Title', excerpt: 'Excerpt', category: 'Category', tags: 'Tags', authors: 'Authors',
    status: 'Status', published_date: 'Published date', scheduled_for: 'Scheduled for',
    read_time: 'Read time', image_url: 'Cover image', caption: 'Cover caption', slug: 'Slug',
    article_type: 'Article type', abstract: 'Abstract', keywords: 'Keywords', doi: 'DOI',
    volume: 'Volume', issue: 'Issue', pages: 'Pages', received_date: 'Received date',
    accepted_date: 'Accepted date', corresponding_author: 'Corresponding author', license: 'License',
    pdf_url: 'PDF', author_list: 'Authors (structured)', reference_list: 'References'
};

function normalize(value) {
    return typeof value === 'string' ? value.trim() : (value == null ? '' : String(value));
}

function countBlocks(contentJson) {
    try {
        const parsed = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
        return Array.isArray(parsed && parsed.sections) ? parsed.sections.length : null;
    } catch (err) {
        return null;
    }
}

/**
 * @returns {{ fields: Array<{field, label, before, after}>, contentChanged: boolean, blockCounts: {before, after} }}
 */
function diffSnapshots(before, after) {
    const beforeObj = before || {};
    const afterObj = after || {};

    const fields = [];
    Object.keys(FIELD_LABELS).forEach((field) => {
        const b = normalize(beforeObj[field]);
        const a = normalize(afterObj[field]);
        if (b !== a) {
            fields.push({ field, label: FIELD_LABELS[field], before: b, after: a });
        }
    });

    const beforeContent = normalize(beforeObj.content);
    const afterContent = normalize(afterObj.content);
    const contentChanged = beforeContent !== afterContent;

    return {
        fields,
        contentChanged,
        blockCounts: contentChanged ? { before: countBlocks(beforeContent), after: countBlocks(afterContent) } : null
    };
}

module.exports = { diffSnapshots, FIELD_LABELS };
