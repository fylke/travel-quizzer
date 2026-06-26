// Feature: quiz-type-selection, Property 4: Markdown rendering produces structural HTML
describe('Markdown Renderer - Property Tests', function () {

    // **Validates: Requirements 4.4**

    describe('Property 4: Markdown rendering produces structural HTML', function () {

        describe('Headings produce correct heading tags', function () {

            it('# heading produces <h1>', function () {
                var result = renderMarkdown('# Hello World');
                expect(result).toContain('<h1>Hello World</h1>');
            });

            it('## heading produces <h2>', function () {
                var result = renderMarkdown('## Section Title');
                expect(result).toContain('<h2>Section Title</h2>');
            });

            it('### heading produces <h3>', function () {
                var result = renderMarkdown('### Subsection');
                expect(result).toContain('<h3>Subsection</h3>');
            });

            it('any single-line heading with # produces <h1> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 80 }).filter(function (s) {
                            return s.trim().length > 0 && s.indexOf('#') === -1 && s.indexOf('\n') === -1;
                        }),
                        function (text) {
                            var md = '# ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<h1>');
                            expect(result).toContain('</h1>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });

            it('any single-line heading with ## produces <h2> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 80 }).filter(function (s) {
                            return s.trim().length > 0 && s.indexOf('#') === -1 && s.indexOf('\n') === -1;
                        }),
                        function (text) {
                            var md = '## ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<h2>');
                            expect(result).toContain('</h2>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });

            it('any single-line heading with ### produces <h3> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 80 }).filter(function (s) {
                            return s.trim().length > 0 && s.indexOf('#') === -1 && s.indexOf('\n') === -1;
                        }),
                        function (text) {
                            var md = '### ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<h3>');
                            expect(result).toContain('</h3>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });
        });

        describe('Unordered lists produce <ul><li> tags', function () {

            it('- item produces <ul> and <li>item</li>', function () {
                var result = renderMarkdown('- First item');
                expect(result).toContain('<ul>');
                expect(result).toContain('<li>First item</li>');
                expect(result).toContain('</ul>');
            });

            it('* item produces <ul> and <li>item</li>', function () {
                var result = renderMarkdown('* Second item');
                expect(result).toContain('<ul>');
                expect(result).toContain('<li>Second item</li>');
                expect(result).toContain('</ul>');
            });

            it('any text prefixed with "- " produces <ul><li> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 60 }).filter(function (s) {
                            return s.trim().length > 0 && s.indexOf('\n') === -1 && s.indexOf('*') === -1;
                        }),
                        function (text) {
                            var md = '- ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<ul>');
                            expect(result).toContain('<li>');
                            expect(result).toContain('</li>');
                            expect(result).toContain('</ul>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });

            it('any text prefixed with "* " produces <ul><li> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 60 }).filter(function (s) {
                            return s.trim().length > 0 && s.indexOf('\n') === -1 && s.indexOf('*') === -1;
                        }),
                        function (text) {
                            var md = '* ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<ul>');
                            expect(result).toContain('<li>');
                            expect(result).toContain('</li>');
                            expect(result).toContain('</ul>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });
        });

        describe('Ordered lists produce <ol><li> tags', function () {

            it('1. item produces <ol> and <li>item</li>', function () {
                var result = renderMarkdown('1. First item');
                expect(result).toContain('<ol>');
                expect(result).toContain('<li>First item</li>');
                expect(result).toContain('</ol>');
            });

            it('any text prefixed with "N. " produces <ol><li> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.tuple(
                            fc.integer({ min: 1, max: 999 }),
                            fc.string({ minLength: 1, maxLength: 60 }).filter(function (s) {
                                return s.trim().length > 0 && s.indexOf('\n') === -1 && s.indexOf('*') === -1;
                            })
                        ),
                        function (tuple) {
                            var num = tuple[0];
                            var text = tuple[1];
                            var md = num + '. ' + text;
                            var result = renderMarkdown(md);
                            expect(result).toContain('<ol>');
                            expect(result).toContain('<li>');
                            expect(result).toContain('</li>');
                            expect(result).toContain('</ol>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });
        });

        describe('Paragraphs produce <p> tags', function () {

            it('plain text separated by blank lines produces <p> tags', function () {
                var md = 'First paragraph\n\nSecond paragraph';
                var result = renderMarkdown(md);
                expect(result).toContain('<p>First paragraph</p>');
                expect(result).toContain('<p>Second paragraph</p>');
            });

            it('any non-empty plain text produces <p> (property)', function () {
                fc.assert(
                    fc.property(
                        fc.string({ minLength: 1, maxLength: 80 }).filter(function (s) {
                            return s.trim().length > 0
                                && s.indexOf('\n') === -1
                                && s.indexOf('#') !== 0
                                && s.indexOf('- ') !== 0
                                && s.indexOf('* ') !== 0
                                && !/^\d+\.\s/.test(s);
                        }),
                        function (text) {
                            var result = renderMarkdown(text);
                            expect(result).toContain('<p>');
                            expect(result).toContain('</p>');
                        }
                    ),
                    { numRuns: 100 }
                );
            });
        });

        describe('Inline formatting', function () {

            it('**bold** produces <strong>bold</strong>', function () {
                var result = renderMarkdown('This is **bold** text');
                expect(result).toContain('<strong>bold</strong>');
            });

            it('*italic* produces <em>italic</em>', function () {
                var result = renderMarkdown('This is *italic* text');
                expect(result).toContain('<em>italic</em>');
            });
        });

        describe('Empty input', function () {

            it('empty string returns empty string', function () {
                expect(renderMarkdown('')).toBe('');
            });

            it('null returns empty string', function () {
                expect(renderMarkdown(null)).toBe('');
            });

            it('undefined returns empty string', function () {
                expect(renderMarkdown(undefined)).toBe('');
            });
        });

        describe('Mixed content', function () {

            it('headings + lists + paragraphs render correct structure', function () {
                var md = '# Title\n\nSome intro text\n\n## Section\n\n- Item 1\n- Item 2\n\n1. Step 1\n2. Step 2\n\nClosing paragraph';
                var result = renderMarkdown(md);
                expect(result).toContain('<h1>Title</h1>');
                expect(result).toContain('<p>Some intro text</p>');
                expect(result).toContain('<h2>Section</h2>');
                expect(result).toContain('<ul>');
                expect(result).toContain('<li>Item 1</li>');
                expect(result).toContain('<li>Item 2</li>');
                expect(result).toContain('</ul>');
                expect(result).toContain('<ol>');
                expect(result).toContain('<li>Step 1</li>');
                expect(result).toContain('<li>Step 2</li>');
                expect(result).toContain('</ol>');
                expect(result).toContain('<p>Closing paragraph</p>');
            });
        });
    });
});
