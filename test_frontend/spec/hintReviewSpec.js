describe('Hint Review', function () {
    var fixtureContainer;

    beforeEach(function () {
        fixtureContainer = document.createElement('div');
        fixtureContainer.id = 'hintReviewFixture';
        fixtureContainer.innerHTML =
            '<div id="quizScreen" class="screen">' +
                '<div class="hint-section"><h2 id="hint"></h2></div>' +
                '<div class="hint-meta">' +
                    '<span id="hintProgress"></span>' +
                    '<span id="hintPoints"></span>' +
                '</div>' +
                '<div class="hint-review hidden" id="hintReviewSection">' +
                    '<span class="hint-review-label">Review unlocked hints:</span>' +
                    '<div id="hintHistoryButtons" class="hint-history-buttons"></div>' +
                '</div>' +
                '<input id="answerInput" />' +
                '<div id="progressFill"></div>' +
                '<img id="image1" />' +
                '<img id="image2" />' +
            '</div>';
        document.body.appendChild(fixtureContainer);

        resetHintReviewState();
    });

    afterEach(function () {
        resetHintReviewState();
        if (fixtureContainer && fixtureContainer.parentNode) {
            fixtureContainer.remove();
        }
    });

    it('shows review controls once multiple hints are unlocked', function () {
        updateHintDisplay('Harder hint', 5, 5);

        var reviewSection = document.getElementById('hintReviewSection');
        expect(reviewSection.classList.contains('hidden')).toBe(true);

        updateHintDisplay('Easier hint', 4, 4);

        expect(reviewSection.classList.contains('hidden')).toBe(false);
        expect(document.querySelectorAll('#hintHistoryButtons .hint-history-btn').length).toBe(2);
    });

    it('allows viewing a previous hint while keeping current scoring info', function () {
        updateHintDisplay('Harder hint', 5, 5);
        updateHintDisplay('Easier hint', 4, 4);

        var buttons = document.querySelectorAll('#hintHistoryButtons .hint-history-btn');
        expect(buttons.length).toBe(2);

        buttons[0].click();

        expect(document.getElementById('hint').textContent).toBe('Harder hint');
        expect(document.getElementById('hintProgress').textContent).toContain('Reviewing hint difficulty 5');
        expect(document.getElementById('hintPoints').textContent).toContain('16 points');
    });
});
