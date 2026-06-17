// Feature: wrong-guess-animations, Property 1: Whitespace-only input triggers animation, not API call
describe('Wrong Guess Animation - Property Tests', function () {

    describe('Property 1: Whitespace-only input triggers animation, not API call', function () {
        // **Validates: Requirements 3.4**

        var inputElement;

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            inputElement.style.removeProperty('transform');
            inputElement.style.removeProperty('box-shadow');
            inputElement.style.removeProperty('border-color');
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
                        inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
                        inputElement.value = whitespaceStr;
                        submitting = false;
                        window.fetch.calls.reset();

                        // Act
                        submitAnswer();

                        // Assert: animation classes are applied
                        expect(inputElement.classList.contains('wrong-guess-shake')).toBe(true);
                        expect(inputElement.classList.contains('wrong-guess-glow')).toBe(true);

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

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            inputElement.style.removeProperty('transform');
            inputElement.style.removeProperty('box-shadow');
            inputElement.style.removeProperty('border-color');
            inputElement.value = '';
            inputElement.disabled = false;
        });

        afterEach(function () {
            inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            inputElement.style.removeProperty('transform');
            inputElement.style.removeProperty('box-shadow');
            inputElement.style.removeProperty('border-color');
        });

        it('preserves input value and leaves no residual styling after animation completes for any string', function () {
            spyOn(window, 'matchMedia').and.returnValue({ matches: false });

            fc.assert(
                fc.property(
                    fc.string(),
                    function (v) {
                        // Reset state before each iteration
                        inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow');
                        inputElement.style.removeProperty('transform');
                        inputElement.style.removeProperty('box-shadow');
                        inputElement.style.removeProperty('border-color');
                        inputElement.disabled = false;

                        // Set arbitrary input value
                        inputElement.value = v;

                        // Trigger animation
                        animateWrongGuess(inputElement);

                        // Fire animationend event to trigger cleanup
                        var event = new Event('animationend');
                        inputElement.dispatchEvent(event);

                        // Assert: value is preserved
                        expect(inputElement.value).toBe(v);

                        // Assert: input is not disabled
                        expect(inputElement.disabled).toBe(false);

                        // Assert: no residual inline styles
                        expect(inputElement.style.getPropertyValue('transform')).toBe('');
                        expect(inputElement.style.getPropertyValue('box-shadow')).toBe('');
                        expect(inputElement.style.getPropertyValue('border-color')).toBe('');

                        // Assert: no animation classes remain
                        expect(inputElement.classList.contains('wrong-guess-shake')).toBe(false);
                        expect(inputElement.classList.contains('wrong-guess-glow')).toBe(false);
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

        beforeEach(function () {
            inputElement = document.getElementById('answerInput');
            inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            inputElement.style.removeProperty('transform');
            inputElement.style.removeProperty('box-shadow');
            inputElement.style.removeProperty('border-color');
            inputElement.value = '';
            inputElement.disabled = false;
        });

        afterEach(function () {
            inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow', 'wrong-guess-static');
            inputElement.style.removeProperty('transform');
            inputElement.style.removeProperty('box-shadow');
            inputElement.style.removeProperty('border-color');
        });

        it('calling animateWrongGuess N times always leaves animation classes present after the last call', function () {
            spyOn(window, 'matchMedia').and.returnValue({ matches: false });

            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 50 }),
                    function (n) {
                        // Clean up before each iteration
                        inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow');

                        // Call animateWrongGuess N times in rapid succession
                        for (var i = 0; i < n; i++) {
                            animateWrongGuess(inputElement);
                        }

                        // After the last call, animation classes must be present
                        var hasShake = inputElement.classList.contains('wrong-guess-shake');
                        var hasGlow = inputElement.classList.contains('wrong-guess-glow');

                        // Clean up for next iteration
                        inputElement.classList.remove('wrong-guess-shake', 'wrong-guess-glow');

                        return hasShake && hasGlow;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
