// ==================== Markdown Renderer ====================

/**
 * Minimal markdown-to-HTML renderer.
 * Supports: headings (#, ##, ###), unordered lists (- or *), ordered lists (1.),
 * paragraphs, bold (**text**), and italic (*text*).
 *
 * @param {string} mdText - Raw markdown string
 * @returns {string} HTML string
 */
function renderMarkdown(mdText) {
    if (!mdText) return '';

    const lines = mdText.split('\n');
    const output = [];
    let inUl = false;
    let inOl = false;
    let paragraphLines = [];

    function applyInline(text) {
        // Bold first (**text**), then italic (*text*)
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return text;
    }

    function flushParagraph() {
        if (paragraphLines.length > 0) {
            output.push('<p>' + applyInline(paragraphLines.join(' ')) + '</p>');
            paragraphLines = [];
        }
    }

    function closeList() {
        if (inUl) {
            output.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            output.push('</ol>');
            inOl = false;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Empty line — flush paragraph and close lists
        if (line.trim() === '') {
            flushParagraph();
            closeList();
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
        if (headingMatch) {
            flushParagraph();
            closeList();
            const level = headingMatch[1].length;
            const content = applyInline(headingMatch[2]);
            output.push('<h' + level + '>' + content + '</h' + level + '>');
            continue;
        }

        // Unordered list items (- or * followed by space)
        const ulMatch = line.match(/^[\-\*]\s+(.*)/);
        if (ulMatch) {
            flushParagraph();
            if (inOl) {
                output.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                output.push('<ul>');
                inUl = true;
            }
            output.push('<li>' + applyInline(ulMatch[1]) + '</li>');
            continue;
        }

        // Ordered list items (number followed by . and space)
        const olMatch = line.match(/^\d+\.\s+(.*)/);
        if (olMatch) {
            flushParagraph();
            if (inUl) {
                output.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                output.push('<ol>');
                inOl = true;
            }
            output.push('<li>' + applyInline(olMatch[1]) + '</li>');
            continue;
        }

        // Regular text — accumulate into paragraph
        closeList();
        paragraphLines.push(line);
    }

    // Flush remaining content
    flushParagraph();
    closeList();

    return output.join('');
}
