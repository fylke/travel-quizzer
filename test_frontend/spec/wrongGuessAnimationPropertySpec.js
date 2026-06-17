// Feature: wrong-guess-animations, Property 1: Whitespace-only input triggers animation, not API call
describe('Wrong Guess Animation - Property Tests', function () {

    describe('Property 1: Whitespace-only input triggers animation, not API call', function () {
        // **Validates: Requirements 3.4**

        var inputElement;
        var quizScreen;

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            quizScreen = document.getElementById('quizScreen');
            quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            quizScreen.style.removeProperty('transform');
            quizScreen.style.removeProperty('box-shadow');
            quizScreen.style.removeProperty('border-color');
            inputElement.value = '';
            inputElement.disabled = false;
            submitting = false;
        });

        afterEach(function () {
            submitting = false;
        });

        it('triggers animation and does not call fetch for any whitespace-only input', function () {
            spyOn(window, 'matchMedia').and.returnValue({ matches: false });
            spyOn(window, 'fetch').and.callFake(function () {
                return Promise.resolve(new Response(JSON.stringify({})));
            });

            fc.assert(
                fc.property(
                    fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')).filter(function (s) {
                        return s.length > 0;
                    }),
                    function (whitespaceStr) {
                        // Reset state before each iteration
                        quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
                        inputElement.value = whitespaceStr;
                        submitting = false;
                        window.fetch.calls.reset();

                        // Act
                        submitAnswer();

                        // Assert: animation classes are applied to quiz screen
                        expect(quizScreen.classList.contains('wrong-guess-shake')).toBe(true);
                        expect(quizScreen.classList.contains('wrong-guess-glow')).toBe(true);

                        // Assert: fetch was NOT called (no API request made)
                        expect(window.fetch).not.toHaveBeenCalled();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Feature: wrong-guess-animations, Property 3: Animation cleanup preserves input state and leaves no residual styling
    describe('Property 3: Animation cleanup preserves input state and leaves no residual styling', function () {
        // **Validates: Requirements 4.3, 6.4**

        var inputElement;
        var quizScreen;

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            quizScreen = document.getElementById('quizScreen');
            quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            quizScreen.style.removeProperty('transform');
            quizScreen.style.removeProperty('box-shadow');
            quizScreen.style.removeProperty('border-color');
            inputElement.value = '';
            inputElement.disabled = false;
        });

        afterEach(function () {
            quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            quizScreen.style.removeProperty('transform');
            quizScreen.style.removeProperty('box-shadow');
            quizScreen.style.removeProperty('border-color');
        });

        it('preserves input value and leaves no residual styling after animation completes for any string', function () {
            spyOn(window, 'matchMedia').and.returnValue({ matches: false });

            fc.assert(
                fc.property(
                    fc.string(),
                    function (v) {
                        // Reset state before each iteration
                        quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow');
                        quizScreen.style.removeProperty('transform');
                        quizScreen.style.removeProperty('box-shadow');
                        quizScreen.style.removeProperty('border-color');
                        inputElement.disabled = false;

                        // Set arbitrary input value
                        inputElement.value = v;

                        // Trigger animation
                        animateWrongGuess(inputElement);

                        // Fire animationend event on the quiz screen to trigger cleanup
                        var event = new Event('animationend');
                        quizScreen.dispatchEvent(event);

                        // Assert: value is preserved
                        expect(inputElement.value).toBe(v);

                        // Assert: input is not disabled
                        expect(inputElement.disabled).toBe(false);

                        // Assert: no residual inline styles on quiz screen
                        expect(quizScreen.style.getPropertyValue('transform')).toBe('');
                        expect(quizScreen.style.getPropertyValue('box-shadow')).toBe('');
                        expect(quizScreen.style.getPropertyValue('border-color')).toBe('');

                        // Assert: no animation classes remain
                        expect(quizScreen.classList.contains('wrong-guess-shake')).toBe(false);
                        expect(quizScreen.classList.contains('wrong-guess-glow')).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Feature: wrong-guess-animations, Property 2: Re-trigger always restarts animation
    describe('Property 2: Re-trigger always restarts animation', function () {
        // **Validates: Requirements 4.2, 2.5**

        var inputElement;
        var quizScreen;

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            quizScreen = document.getElementById('quizScreen');
            quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            quizScreen.style.removeProperty('transform');
            quizScreen.style.removeProperty('box-shadow');
            quizScreen.style.removeProperty('border-color');
            inputElement.value = '';
            inputElement.disabled = false;
        });

        afterEach(function () {
            quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            quizScreen.style.removeProperty('transform');
            quizScreen.style.removeProperty('box-shadow');
            quizScreen.style.removeProperty('border-color');
        });

        it('calling animateWrongGuess N times always leaves animation classes present after the last call', function () {
            spyOn(window, 'matchMedia').and.returnValue({ matches: false });

            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 50 }),
                    function (n) {
                        // Clean up before each iteration
                        quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow');

                        // Call animateWrongGuess N times in rapid succession
                        for (var i = 0; i < n; i++) {
                            animateWrongGuess(inputElement);
                        }

                        // After the last call, animation classes must be present
                        var hasShake = quizScreen.classList.contains('wrong-guess-shake');
                        var hasGlow = quizScreen.classList.contains('wrong-guess-glow');

                        // Clean up for next iteration
                        quizScreen.classList.remove('wrong-guess-shake', 'wrong-guess-glow');

                        return hasShake && hasGlow;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
