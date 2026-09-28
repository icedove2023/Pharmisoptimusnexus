// src/utils/richText.js
// A small, dependency-free sanitizer for the inline formatting the block
// editor allows inside paragraphs, list items and notes: bold, italic,
// underline, strikethrough, inline code, line breaks and links.
//
// This is not a general HTML sanitizer. It only understands the exact tag set
// below and treats everything else - including any tag it does not recognize
// and any attribute on a tag it does recognize - as plain text. A disallowed
// tag is escaped, not dropped, so `<script>` becomes visible text rather than
// disappearing or running.

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'code']);
const VOID_TAGS = new Set(['br']);
const SAFE_URL_SCHEMES = /^(https?:|mailto:)/i;
const HREF_RE = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i;
const MAX_LENGTH = 20000;
const MAX_NESTING = 50;

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

function decodeEntities(value) {
    return String(value).replace(/&(#39|amp|lt|gt|quot|apos);/g, (match, name) => NAMED_ENTITIES[name] || match);
}

function escapeText(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
    return escapeText(value).replace(/"/g, '&quot;');
}

function safeHref(rawAttrs) {
    const match = HREF_RE.exec(rawAttrs || '');
    const raw = match ? decodeEntities((match[1] ?? match[2] ?? match[3] ?? '').trim()) : '';
    return SAFE_URL_SCHEMES.test(raw) ? raw : '#';
}

/**
 * Locate the tag starting at source[start] (which must be '<'). Unlike a
 * single regex, this respects quoted attribute values, so a `>` or `<`
 * inside `href="..."` does not end the tag early or split it in two - the
 * same rule a real HTML parser follows.
 * Returns null if this is not a well-formed tag (e.g. no matching
 * unquoted '>'), in which case the caller treats '<' as a literal character.
 */
function findTag(source, start) {
    let i = start + 1;
    const closing = source[i] === '/';
    if (closing) i += 1;

    const nameStart = i;
    while (i < source.length && /[a-zA-Z0-9]/.test(source[i])) i += 1;
    if (i === nameStart) return null;
    const name = source.slice(nameStart, i).toLowerCase();

    const attrsStart = i;
    let inQuote = null;
    while (i < source.length) {
        const c = source[i];
        if (inQuote) {
            if (c === inQuote) inQuote = null;
        } else if (c === '"' || c === "'") {
            inQuote = c;
        } else if (c === '>') {
            break;
        }
        i += 1;
    }
    if (i >= source.length) return null;

    const attrs = source.slice(attrsStart, i);
    return { name, closing, attrs, end: i + 1 };
}

/**
 * Sanitize a small piece of inline rich text into safe HTML.
 * Only text originating from the admin editor should reach this function;
 * it is defense in depth, not a substitute for the editor only ever
 * generating this tag set in the first place.
 */
function sanitizeInlineHtml(input) {
    if (typeof input !== 'string' || !input) return '';
    const source = input.slice(0, MAX_LENGTH);

    let out = '';
    const stack = [];
    let i = 0;

    while (i < source.length) {
        const ch = source[i];

        if (ch !== '<') {
            const next = source.indexOf('<', i);
            const end = next === -1 ? source.length : next;
            out += escapeText(source.slice(i, end));
            i = end;
            continue;
        }

        const tag = findTag(source, i);
        if (!tag) {
            out += '&lt;';
            i += 1;
            continue;
        }

        const { name: tagName, closing: isClosing, attrs, end } = tag;

        if (VOID_TAGS.has(tagName)) {
            if (!isClosing) out += `<${tagName}>`;
            i = end;
            continue;
        }

        if (!ALLOWED_TAGS.has(tagName) && tagName !== 'a') {
            out += escapeText(source.slice(i, end));
            i = end;
            continue;
        }

        if (isClosing) {
            const openIndex = stack.lastIndexOf(tagName);
            if (openIndex !== -1) {
                for (let k = stack.length - 1; k >= openIndex; k -= 1) {
                    out += `</${stack[k]}>`;
                }
                stack.length = openIndex;
            }
            // A closing tag with no matching open tag is dropped: emitting it
            // would close whatever the template wraps this fragment in.
        } else if (stack.length >= MAX_NESTING) {
            // Absurdly deep nesting has no legitimate use here and would make
            // the auto-close pass below grow without bound; treat it as text.
            out += escapeText(source.slice(i, end));
        } else if (tagName === 'a') {
            out += `<a href="${escapeAttr(safeHref(attrs))}" target="_blank" rel="noopener noreferrer nofollow">`;
            stack.push('a');
        } else {
            out += `<${tagName}>`;
            stack.push(tagName);
        }

        i = end;
    }

    for (let k = stack.length - 1; k >= 0; k -= 1) {
        out += `</${stack[k]}>`;
    }

    return out;
}

/**
 * Strip all markup and return plain text: for captions, alt text, quote
 * attributions and other fields that are never meant to hold formatting.
 * Rendered later with EJS's escaping `<%=`, so this only needs to remove
 * stray angle brackets, not escape entities itself.
 */
function toPlainText(input, maxLength = 500) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

module.exports = { sanitizeInlineHtml, toPlainText, ALLOWED_TAGS: Array.from(ALLOWED_TAGS) };
