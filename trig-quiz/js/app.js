/**
 * Trigonometric Ratio Quiz Application Controller
 */

class TrigQuizApp {
    constructor() {
        this.audio = window.quizAudio;
        this.visualizer = null;
        this.referenceVisualizer = null;

        // Settings State
        this.mode = '20-challenge'; // '20-challenge' | '50-timetrial' | 'practice'
        this.answerType = 'choice4'; // 'choice4' | 'palette'
        this.targetFunctions = ['sin', 'cos', 'tan']; // Array of selected functions
        this.angleRange = '180'; // '180' (0~180°) or '90' (0~90°)
        this.timeLimitSetting = 10; // 3, 5, 10, or 0 (unlimited)
        this.useRationalized = false; // true: √2/2, false: 1/√2

        // Quiz State
        this.currentQuestion = null;
        this.questionIndex = 0;
        this.totalQuestions = 20;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.lives = 3;
        this.isAnswered = false;
        this.history = []; // Array of { angle, func, selected, correct, isCorrect, timeTakenMs }
        this.nickname = ''; // player nickname for leaderboard
        // Dual answer state
        this.selectedAngle = null; // angle chosen on unit‑circle
        this.selectedChoiceId = null; // valueId chosen from 4‑choice
        this.clickedChoiceBtn = null; // reference to the button element
        this.timerInterval = null;
        this.autoAdvanceTimer = null;
        this.timeLeft = 10;
        this.timePerQuestion = 10;
        this.questionStartTime = 0;

        // Cache DOM elements
        this.dom = {
            // Screens
            startScreen: document.getElementById('start-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            resultScreen: document.getElementById('result-screen'),
            referenceModal: document.getElementById('reference-modal'),

            // Header elements
            headerStreak: document.getElementById('header-streak'),
            headerScore: document.getElementById('header-score'),
            btnSound: document.getElementById('btn-sound'),
            btnReference: document.getElementById('btn-reference'),

            // Start screen controls
            modeTabs: document.querySelectorAll('.mode-tab'),
            answerTypeInputs: document.querySelectorAll('input[name="answer-type"]'),
            funcCheckboxes: document.querySelectorAll('input[name="filter-func"]'),
            angleRangeInputs: document.querySelectorAll('input[name="angle-range"]'),
            timeLimitInputs: document.querySelectorAll('input[name="time-limit"]'),
            rationalizeToggle: document.getElementById('toggle-rationalize'),
            btnStartQuiz: document.getElementById('btn-start-quiz'),

            // Quiz screen elements
            quizModeBadge: document.getElementById('quiz-mode-badge'),
            quizProgressText: document.getElementById('quiz-progress-text'),
            quizProgressBar: document.getElementById('quiz-progress-bar'),
            timerContainer: document.getElementById('timer-container'),
            timerBar: document.getElementById('timer-bar'),
            livesContainer: document.getElementById('lives-container'),
            livesDisplay: document.getElementById('lives-display'),
            questionFunc: document.getElementById('question-func'),
            questionAngle: document.getElementById('question-angle'),
            comboBadge: document.getElementById('combo-badge'),
            choicesContainer: document.getElementById('choices-container'),
            paletteContainer: document.getElementById('palette-container'),
            explanationCard: document.getElementById('explanation-card'),
            explanationText: document.getElementById('explanation-text'),
            btnNextQuestion: document.getElementById('btn-next-question'),
            btnQuitQuiz: document.getElementById('btn-quit-quiz'),

            // Result screen elements
            resultRankBadge: document.getElementById('result-rank-badge'),
            resultScoreText: document.getElementById('result-score-text'),
            resultAccuracyText: document.getElementById('result-accuracy-text'),
            resultMaxStreakText: document.getElementById('result-max-streak-text'),
            resultHistoryList: document.getElementById('result-history-list'),
            btnRestartQuiz: document.getElementById('btn-restart-quiz'),
            btnBackToHome: document.getElementById('btn-back-to-home'),

            // Reference Modal
            referenceTableBody: document.getElementById('reference-table-body'),
            btnCloseReference: document.getElementById('btn-close-reference'),

            leaderboardList: document.getElementById('leaderboard-list'),
            nicknameInput: document.getElementById('nickname-input'),
            // Confetti
            confettiCanvas: document.getElementById('confetti-canvas')
        };

        this.init();
    }

    init() {
        // 単位円の点クリックでの選択コールバックを登録
        this.visualizer = new UnitCircleVisualizer('quiz-unit-circle', (deg, pointEl) => this.handleCircleSelect(deg, pointEl));
        this.referenceVisualizer = new UnitCircleVisualizer('reference-unit-circle');

        this.bindEvents();
        this.bindAudioUnlock();
        this.buildReferenceTable();
        this.updateSettingsFromUI();
    }

    bindAudioUnlock() {
        const unlock = () => {
            this.audio.init();
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
    }

    bindEvents() {
        // Mode Tabs
        this.dom.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.audio.playClick();
                this.dom.modeTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.mode = tab.dataset.mode;
            });
        });

        // Answer Type (4-Choice vs Palette)
        this.dom.answerTypeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.audio.playClick();
                this.answerType = input.value;
            });
        });

        // Function filters
        this.dom.funcCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                this.audio.playClick();
                this.updateSettingsFromUI();
            });
        });

        // Angle range
        this.dom.angleRangeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.audio.playClick();
                this.angleRange = input.value;
            });
        });

        // Time limit settings
        this.dom.timeLimitInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.audio.playClick();
                this.timeLimitSetting = parseInt(input.value, 10);
            });
        });

        // Rationalization toggle
        this.dom.rationalizeToggle.addEventListener('change', (e) => {
            this.audio.playClick();
            this.useRationalized = e.target.checked;
            this.buildReferenceTable();
            if (this.currentQuestion) {
                if (this.answerType === 'choice4') this.render4Choices();
                else this.renderPalette();
            }
        });

        // Sound toggle
        this.dom.btnSound.addEventListener('click', () => {
            const enabled = this.audio.toggleSound();
            this.dom.btnSound.textContent = enabled ? '🔊 サウンド' : '🔇 ミュート';
            this.dom.btnSound.classList.toggle('active', enabled);
            if (enabled) this.audio.playClick();
        });

        // Reference Sheet Modal
        this.dom.btnReference.addEventListener('click', () => {
            this.audio.playClick();
            this.showReferenceModal();
        });
        this.dom.btnCloseReference.addEventListener('click', () => {
            this.audio.playClick();
            this.hideReferenceModal();
        });

        // Start Quiz Button
        this.dom.btnStartQuiz.addEventListener('click', () => {
            this.audio.playClick();
            this.startQuiz();
        });

        // Next Question Button (Manual skip)
        this.dom.btnNextQuestion.addEventListener('click', () => {
            this.clearAutoAdvance();
            this.audio.playClick();
            this.nextQuestion();
        });

        // Quit Quiz Button
        this.dom.btnQuitQuiz.addEventListener('click', () => {
            this.clearAutoAdvance();
            this.stopTimer();
            this.audio.playClick();
            if (confirm('クイズを中断してタイトルに戻りますか？')) {
                this.showScreen('start');
            }
        });

        // Restart Quiz Button
        this.dom.btnRestartQuiz.addEventListener('click', () => {
            this.clearAutoAdvance();
            this.audio.playClick();
            this.startQuiz();
        });

        // Back to Home Button
        this.dom.btnBackToHome.addEventListener('click', () => {
            this.clearAutoAdvance();
            this.audio.playClick();
            this.showScreen('start');
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (this.dom.quizScreen.classList.contains('active')) {
                if (!this.isAnswered) {
                    if (['1', '2', '3', '4'].includes(e.key)) {
                        const index = parseInt(e.key) - 1;
                        const buttons = this.dom.choicesContainer.querySelectorAll('.choice-btn');
                        if (buttons[index]) {
                            buttons[index].click();
                        }
                    }
                } else if (this.isAnswered && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    this.clearAutoAdvance();
                    this.nextQuestion();
                }
            }
        });
    }

    updateSettingsFromUI() {
        const checkedFuncs = Array.from(this.dom.funcCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (checkedFuncs.length === 0) {
            this.dom.funcCheckboxes[0].checked = true;
            this.targetFunctions = ['sin'];
        } else {
            this.targetFunctions = checkedFuncs;
        }

        const selectedTimeLimit = document.querySelector('input[name="time-limit"]:checked');
        if (selectedTimeLimit) {
            this.timeLimitSetting = parseInt(selectedTimeLimit.value, 10);
        }
    }

    showScreen(screenName) {
        this.dom.startScreen.classList.remove('active');
        this.dom.quizScreen.classList.remove('active');
        this.dom.resultScreen.classList.remove('active');

        if (screenName === 'start') this.dom.startScreen.classList.add('active');
        if (screenName === 'quiz') this.dom.quizScreen.classList.add('active');
        if (screenName === 'result') this.dom.resultScreen.classList.add('active');
    }

    // ==========================================
    // Quiz Flow Management
    // ==========================================

    startQuiz() {
        this.clearAutoAdvance();
        this.updateSettingsFromUI();
        this.questionIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.lives = 3;
        this.history = [];
        this.isAnswered = false;
        this.nickname = (this.dom.nicknameInput && this.dom.nicknameInput.value.trim()) || '匿名希望';

        // UI Setup for Mode
        this.dom.headerStreak.textContent = `🔥 0`;
        this.dom.headerScore.textContent = `🎯 0`;

        if (this.mode === '20-challenge') {
            this.totalQuestions = 20;
            const timeDesc = this.timeLimitSetting > 0 ? ` (${this.timeLimitSetting}秒/問)` : ' (時間無制限)';
            this.dom.quizModeBadge.textContent = `⚡ 20問コース${timeDesc}`;
            this.dom.timerContainer.style.display = this.timeLimitSetting > 0 ? 'block' : 'none';
            this.dom.livesContainer.style.display = 'none';
            this.timePerQuestion = this.timeLimitSetting > 0 ? this.timeLimitSetting : 10;
        } else if (this.mode === '50-timetrial') {
            this.totalQuestions = 50;
            const timeDesc = this.timeLimitSetting > 0 ? ` (${this.timeLimitSetting}秒/問)` : ' (時間無制限)';
            this.dom.quizModeBadge.textContent = `🔥 50問タイムトライアル${timeDesc}`;
            this.dom.timerContainer.style.display = this.timeLimitSetting > 0 ? 'block' : 'none';
            this.dom.livesContainer.style.display = 'none';
            this.timePerQuestion = this.timeLimitSetting > 0 ? this.timeLimitSetting : 10;
        } else {
            this.dom.quizModeBadge.textContent = '📖 じっくり練習';
            this.dom.timerContainer.style.display = 'none';
            this.dom.livesContainer.style.display = 'none';
        }

        this.showScreen('quiz');
        this.nextQuestion();
    }

    updateLivesDisplay() {
        let hearts = '';
        for (let i = 0; i < 3; i++) {
            hearts += i < this.lives ? '❤️' : '🖤';
        }
        this.dom.livesDisplay.textContent = hearts;
    }

    nextQuestion() {
        this.clearAutoAdvance();

        // Check game end conditions
        if ((this.mode === '20-challenge' || this.mode === '50-timetrial') && this.questionIndex >= this.totalQuestions) {
            this.finishQuiz();
            return;
        }
        if (this.mode === 'endless' && this.lives <= 0) {
            this.finishQuiz();
            return;
        }

        this.questionIndex++;
        this.isAnswered = false;
        // Reset dual-answer state for new question
        this.selectedAngle = null;
        this.selectedChoiceId = null;
        this.clickedChoiceBtn = null;
        this.dom.explanationCard.classList.remove('active');
        this.dom.btnNextQuestion.style.display = 'none';

        // Update progress bar
        if (this.mode === '20-challenge' || this.mode === '50-timetrial') {
            this.dom.quizProgressText.textContent = `第 ${this.questionIndex} / ${this.totalQuestions} 問`;
            this.dom.quizProgressBar.style.width = `${((this.questionIndex - 1) / this.totalQuestions) * 100}%`;
        } else {
            this.dom.quizProgressText.textContent = `第 ${this.questionIndex} 問`;
            this.dom.quizProgressBar.style.width = `100%`;
        }

        // Generate next question
        this.currentQuestion = this.generateQuestion();
        this.renderQuestion();
        this.startTimer();
    }

    generateQuestion() {
        const angles = this.angleRange === '90' 
            ? [0, 30, 45, 60, 90] 
            : [0, 30, 45, 60, 90, 120, 135, 150, 180];

        const funcs = this.targetFunctions;

        let angle, func;
        let attempts = 0;
        do {
            angle = angles[Math.floor(Math.random() * angles.length)];
            func = funcs[Math.floor(Math.random() * funcs.length)];
            attempts++;
        } while (
            attempts < 10 &&
            this.currentQuestion &&
            this.currentQuestion.angle === angle &&
            this.currentQuestion.func === func
        );

        const data = window.TRIG_DATA[angle][func];
        const correctValueId = data.valueId;

        return {
            angle,
            func,
            correctValueId,
            explanation: data.explanation
        };
    }

    renderQuestion() {
        // Question display
        this.dom.questionFunc.textContent = `${this.currentQuestion.func}`;
        this.dom.questionFunc.className = `q-func func-${this.currentQuestion.func}`;
        // Show the angle so user knows which position to select on the unit circle
        this.dom.questionAngle.textContent = `${this.currentQuestion.angle}°`;

        // Unit circle: hide dynamic layer, enable interactive points
        this.visualizer.hideDynamic();

        // Dual mode: always show 4-choice panel alongside unit circle
        this.dom.choicesContainer.style.display = 'grid';
        this.dom.paletteContainer.style.display = 'none';
        this.render4Choices();

        // Show hint prompt
        this.updateDualHint();
    }

    updateDualHint() {
        const circleOk = this.selectedAngle !== null;
        const choiceOk = this.selectedChoiceId !== null;
        let hintEl = document.getElementById('dual-hint');
        if (!hintEl) return;
        if (circleOk && choiceOk) {
            hintEl.textContent = '✅ 両方選択済み — 採点中...';
        } else if (circleOk) {
            hintEl.textContent = '☑️ 位置 選択済 ／ 📋 下の値を選んでください';
        } else if (choiceOk) {
            hintEl.textContent = '📋 値 選択済 ／ ☑️ 単位円上で角度の位置を選んでください';
        } else {
            hintEl.textContent = '① 単位円上で角度の位置を選択  ② 下の値を選択 → 両方揃うと採点';
        }
    }

    render4Choices() {
        const correctId = this.currentQuestion.correctValueId;
        const allIds = Object.keys(window.VALUE_DEFS);

        let candidates = allIds.filter(id => id !== correctId);
        
        let distractors = [];
        if (correctId.startsWith('-')) {
            const posId = correctId.slice(1);
            if (candidates.includes(posId)) distractors.push(posId);
        } else if (correctId !== '0' && correctId !== 'none') {
            const negId = `-${correctId}`;
            if (candidates.includes(negId)) distractors.push(negId);
        }

        const remaining = candidates.filter(id => !distractors.includes(id)).sort(() => Math.random() - 0.5);
        while (distractors.length < 3 && remaining.length > 0) {
            distractors.push(remaining.pop());
        }

        const choices = [correctId, ...distractors].sort(() => Math.random() - 0.5);

        this.dom.choicesContainer.innerHTML = '';
        choices.forEach((valueId, idx) => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.dataset.valueId = valueId;
            btn.innerHTML = `
                <span class="choice-num">${idx + 1}</span>
                <span class="choice-val">${window.formatValueHtml(valueId, this.useRationalized)}</span>
            `;
            btn.addEventListener('click', () => this.handleChoiceSelect(valueId, btn));
            this.dom.choicesContainer.appendChild(btn);
        });
    }

    // 2段構成の数式パレット（上段: sin/cos値 小さい順、下段: tan値 小さい順）
    renderPalette() {
        // 上段: sin/cos の値（-1 〜 1 の小さい順 9個）
        const rowSinCos = ['-1', '-sqrt3/2', '-1/sqrt2', '-1/2', '0', '1/2', '1/sqrt2', 'sqrt3/2', '1'];

        // 下段: tan の値（-√3 〜 √3, none の小さい順 8個）
        const rowTan = ['-sqrt3', '-1', '-1/sqrt3', '0', '1/sqrt3', '1', 'sqrt3', 'none'];

        this.dom.paletteContainer.innerHTML = `
            <!-- 上段: sin / cos -->
            <div class="palette-row-block">
                <div class="palette-row-title">
                    <span style="color: var(--color-sin);">sin</span> / <span style="color: var(--color-cos);">cos</span> の値 (小さい順)
                </div>
                <div class="palette-row-grid row-sin-cos" id="palette-row-1"></div>
            </div>

            <!-- 下段: tan -->
            <div class="palette-row-block">
                <div class="palette-row-title">
                    <span style="color: var(--color-tan);">tan</span> の値 (小さい順)
                </div>
                <div class="palette-row-grid row-tan" id="palette-row-2"></div>
            </div>
        `;

        const row1El = this.dom.paletteContainer.querySelector('#palette-row-1');
        const row2El = this.dom.paletteContainer.querySelector('#palette-row-2');

        rowSinCos.forEach(valueId => {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.dataset.valueId = valueId;
            btn.innerHTML = window.formatValueHtml(valueId, this.useRationalized);
            btn.addEventListener('click', () => this.handleAnswer(valueId, btn));
            row1El.appendChild(btn);
        });

        rowTan.forEach(valueId => {
            const btn = document.createElement('button');
            btn.className = 'palette-btn';
            btn.dataset.valueId = valueId;
            btn.innerHTML = window.formatValueHtml(valueId, this.useRationalized);
            btn.addEventListener('click', () => this.handleAnswer(valueId, btn));
            row2El.appendChild(btn);
        });
    }

    startTimer() {
        this.stopTimer();
        this.questionStartTime = Date.now();

        if ((this.mode !== '20-challenge' && this.mode !== '50-timetrial') || this.timeLimitSetting <= 0) return;

        this.timeLeft = this.timePerQuestion;
        this.dom.timerBar.style.width = '100%';
        this.dom.timerBar.classList.remove('warning');

        this.timerInterval = setInterval(() => {
            this.timeLeft -= 0.1;
            const pct = Math.max(0, (this.timeLeft / this.timePerQuestion) * 100);
            this.dom.timerBar.style.width = `${pct}%`;

            if (this.timeLeft <= 2.5 && !this.dom.timerBar.classList.contains('warning')) {
                this.dom.timerBar.classList.add('warning');
                this.audio.playTick();
            }

            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.handleTimeout();
            }
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    clearAutoAdvance() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }

    // ========== DUAL ANSWER MODE ==========
    // ユーザーが単位円上の点をクリックしたとき
    handleCircleSelect(deg, pointEl) {
        if (this.isAnswered) return;
        this.selectedAngle = deg;

        // ポイントの見た目を選択状態にする
        this.visualizer.container.querySelectorAll('.circle-point-group').forEach(g => g.classList.remove('selected'));
        pointEl.classList.add('selected');

        this.updateDualHint();
        this.tryFinalizeAnswer();
    }

    // ユーザーが4択ボタンをクリックしたとき
    handleChoiceSelect(valueId, btn) {
        if (this.isAnswered) return;
        this.selectedChoiceId = valueId;
        this.clickedChoiceBtn = btn;

        // ボタンの見た目を選択状態にする
        this.dom.choicesContainer.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        this.updateDualHint();
        this.tryFinalizeAnswer();
    }

    // 両方の選択が揃ったら採点実行
    tryFinalizeAnswer() {
        if (this.isAnswered) return;
        if (this.selectedAngle === null || this.selectedChoiceId === null) return;

        this.isAnswered = true;
        this.stopTimer();
        this.clearAutoAdvance();

        const timeTakenMs = Date.now() - this.questionStartTime;

        // 両方正解でないと不正解
        const circleCorrect = (this.selectedAngle === this.currentQuestion.angle);
        const valueCorrect = (this.selectedChoiceId === this.currentQuestion.correctValueId);
        const isCorrect = circleCorrect && valueCorrect;

        // Record history
        this.history.push({
            angle: this.currentQuestion.angle,
            func: this.currentQuestion.func,
            selectedAngle: this.selectedAngle,
            selected: this.selectedChoiceId,
            correct: this.currentQuestion.correctValueId,
            isCorrect,
            circleCorrect,
            valueCorrect,
            timeTakenMs
        });

        // 4択ボタンのハイライト
        this.dom.choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
            if (btn.dataset.valueId === this.currentQuestion.correctValueId) {
                btn.classList.add('correct');
            } else if (btn === this.clickedChoiceBtn && !valueCorrect) {
                btn.classList.add('incorrect');
            }
            btn.classList.remove('selected');
            btn.disabled = true;
        });

        // 単位円ポイントのハイライト
        this.visualizer.container.querySelectorAll('.circle-point-group').forEach(grp => {
            const d = parseInt(grp.dataset.angle, 10);
            grp.classList.remove('selected');
            if (d === this.currentQuestion.angle) {
                grp.classList.add('correct');
            } else if (d === this.selectedAngle && !circleCorrect) {
                grp.classList.add('incorrect');
            }
        });

        // スコア・音声フィードバック
        if (isCorrect) {
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            const speedBonus = this.timeLimitSetting > 0
                ? Math.max(0, Math.floor((this.timePerQuestion * 1000 - timeTakenMs) / 100))
                : 40;
            const streakBonus = this.streak * 20;
            this.score += 100 + speedBonus + streakBonus;

            if (this.streak >= 2) {
                this.audio.playStreak(this.streak);
                this.showComboAnimation(this.streak);
            } else {
                this.audio.playCorrect();
            }
        } else {
            this.streak = 0;
            this.audio.playIncorrect();
            if (this.mode === 'endless') {
                this.lives--;
                this.updateLivesDisplay();
            }
        }

        this.dom.headerStreak.textContent = `🔥 ${this.streak}`;
        this.dom.headerScore.textContent = `🎯 ${this.score}`;

        // 角度と解答を単位円に表示（解答と同時に単位円展開）
        this.visualizer.update(this.currentQuestion.angle, this.currentQuestion.func, this.selectedAngle);

        // 解説カードを表示
        const circleMsg = circleCorrect ? '✅ 位置正解' : `❌ 位置不正解（正解: ${this.currentQuestion.angle}°）`;
        const valueMsg = valueCorrect ? '✅ 値正解' : `❌ 値不正解`;
        this.dom.explanationText.innerHTML = `
            <p><strong>${this.currentQuestion.func} ${this.currentQuestion.angle}° = ${window.formatValueHtml(this.currentQuestion.correctValueId, this.useRationalized)}</strong></p>
            <p style="font-size:0.85em; color:#64748b; margin-top:4px;">${circleMsg} ／ ${valueMsg}</p>
            <p>${this.currentQuestion.explanation}</p>
        `;
        this.dom.explanationCard.classList.add('active');
        this.dom.btnNextQuestion.style.display = 'inline-flex';

        // ヒント表示を更新
        let hintEl = document.getElementById('dual-hint');
        if (hintEl) hintEl.textContent = isCorrect ? '🎉 両方正解！' : '😢 不正解 — 単位円と値の両方が合っている必要があります';

        // Auto-advance: update conditions for new modes
        if (this.mode === 'endless' && this.lives <= 0) {
            this.dom.btnNextQuestion.textContent = '結果を見る ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 1800);
        } else if ((this.mode === '20-challenge' || this.mode === '50-timetrial') && this.questionIndex >= this.totalQuestions) {
            this.dom.btnNextQuestion.textContent = '結果発表へ ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 1800);
        } else {
            this.dom.btnNextQuestion.textContent = '次の問題へ (自動で進みます) ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 2000);
        }
    }

    handleTimeout() {
        if (this.isAnswered) return;
        // 時間切れ：選択していない分をnullのまま採点（両方nullなので不正解）
        if (this.selectedAngle === null) this.selectedAngle = -1; // invalid
        if (this.selectedChoiceId === null) this.selectedChoiceId = 'TIMEOUT';
        this.isAnswered = true;
        this.stopTimer();
        this.clearAutoAdvance();

        const timeTakenMs = Date.now() - this.questionStartTime;
        this.history.push({
            angle: this.currentQuestion.angle,
            func: this.currentQuestion.func,
            selectedAngle: this.selectedAngle,
            selected: this.selectedChoiceId,
            correct: this.currentQuestion.correctValueId,
            isCorrect: false,
            circleCorrect: false,
            valueCorrect: false,
            timeTakenMs
        });

        this.streak = 0;
        this.audio.playIncorrect();
        if (this.mode === 'endless') { this.lives--; this.updateLivesDisplay(); }

        this.dom.headerStreak.textContent = `🔥 ${this.streak}`;
        this.dom.headerScore.textContent = `🎯 ${this.score}`;

        this.visualizer.update(this.currentQuestion.angle, this.currentQuestion.func, null);

        this.dom.explanationText.innerHTML = `
            <p><strong>時間切れ！</strong> 正解: ${this.currentQuestion.func} ${this.currentQuestion.angle}° = ${window.formatValueHtml(this.currentQuestion.correctValueId, this.useRationalized)}</p>
            <p>${this.currentQuestion.explanation}</p>
        `;
        this.dom.explanationCard.classList.add('active');
        this.dom.btnNextQuestion.style.display = 'inline-flex';
        this.dom.choicesContainer.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });

        if (this.mode === 'endless' && this.lives <= 0) {
            this.dom.btnNextQuestion.textContent = '結果を見る ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 1800);
        } else if ((this.mode === '20-challenge' || this.mode === '50-timetrial') && this.questionIndex >= this.totalQuestions) {
            this.dom.btnNextQuestion.textContent = '結果発表へ ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 1800);
        } else {
            this.dom.btnNextQuestion.textContent = '次の問題へ (自動で進みます) ➔';
            this.autoAdvanceTimer = setTimeout(() => this.nextQuestion(), 2000);
        }
    }

    showComboAnimation(combo) {
        this.dom.comboBadge.textContent = `${combo} COMBO!! 🔥`;
        this.dom.comboBadge.classList.add('active');
        setTimeout(() => {
            this.dom.comboBadge.classList.remove('active');
        }, 1200);
    }

    // ==========================================
    // Quiz Result Screen
    // ==========================================

    finishQuiz() {
        this.stopTimer();
        this.clearAutoAdvance();
        this.showScreen('result');

        const total = this.history.length;
        const correctCount = this.history.filter(h => h.isCorrect).length;
        const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

        // Rank determination
        let rank = 'C';
        let rankClass = 'rank-c';
        if (accuracy === 100 && total >= 20) {
            rank = 'S+';
            rankClass = 'rank-s-plus';
        } else if (accuracy >= 90) {
            rank = 'S';
            rankClass = 'rank-s';
        } else if (accuracy >= 75) {
            rank = 'A';
            rankClass = 'rank-a';
        } else if (accuracy >= 60) {
            rank = 'B';
            rankClass = 'rank-b';
        }

        this.dom.resultRankBadge.textContent = rank;
        this.dom.resultRankBadge.className = `rank-badge ${rankClass}`;
        this.dom.resultScoreText.textContent = this.score.toLocaleString();
        this.dom.resultAccuracyText.textContent = `${accuracy}% (${correctCount}/${total}問)`;
        this.dom.resultMaxStreakText.textContent = `${this.maxStreak} 回`;

        // Render Review List
        this.dom.resultHistoryList.innerHTML = '';
        this.history.forEach((h, i) => {
            const item = document.createElement('div');
            item.className = `history-item ${h.isCorrect ? 'is-correct' : 'is-wrong'}`;
            
            const qStr = `${h.func} ${h.angle}°`;
            const correctVal = window.formatValueHtml(h.correct, this.useRationalized);
            const userVal = h.selected === 'TIMEOUT' ? '時間切れ' : window.formatValueHtml(h.selected, this.useRationalized);

            item.innerHTML = `
                <div class="hist-badge">${h.isCorrect ? '⭕ 正解' : '❌ 不正解'}</div>
                <div class="hist-q">第${i + 1}問: <strong>${qStr}</strong></div>
                <div class="hist-ans">正解: <span class="val-correct">${correctVal}</span> ${!h.isCorrect ? `(解答: <span class="val-user">${userVal}</span>)` : ''}</div>
            `;
            this.dom.resultHistoryList.appendChild(item);
        });

        // Save to leaderboard and render
        this.saveToLeaderboard(this.nickname, this.score, accuracy, this.mode);
        this.renderLeaderboard();

        // Fanfare & Confetti on S rank
        if (accuracy >= 80) {
            this.audio.playFanfare();
            this.launchConfetti();
        }
    }

    // ==========================================
    // Leaderboard (localStorage)
    // ==========================================

    getLeaderboard() {
        try {
            return JSON.parse(localStorage.getItem('trig-quiz-leaderboard') || '[]');
        } catch { return []; }
    }

    saveToLeaderboard(nickname, score, accuracy, mode) {
        const lb = this.getLeaderboard();
        lb.push({
            nickname: nickname || '匿名希望',
            score,
            accuracy,
            mode,
            date: new Date().toLocaleDateString('ja-JP')
        });
        // Sort descending by score, keep top 10 per mode or overall top 10
        lb.sort((a, b) => b.score - a.score);
        const top = lb.slice(0, 10);
        localStorage.setItem('trig-quiz-leaderboard', JSON.stringify(top));
    }

    renderLeaderboard() {
        const lb = this.getLeaderboard();
        const el = this.dom.leaderboardList;
        if (!el) return;

        if (lb.length === 0) {
            el.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:12px;">まだ記録がありません</p>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];
        el.innerHTML = lb.map((entry, i) => {
            const medal = medals[i] || `${i + 1}位`;
            const modeLabel = entry.mode === '20-challenge' ? '20問' :
                              entry.mode === '50-timetrial' ? '50問タイム' : '練習';
            const isMe = (entry.nickname === this.nickname && i === lb.findIndex(e => e.nickname === this.nickname && e.score === this.score));
            return `
                <div class="lb-row ${isMe ? 'lb-row-me' : ''} ${i < 3 ? 'lb-top3' : ''}">
                    <span class="lb-rank">${medal}</span>
                    <span class="lb-name">${entry.nickname}</span>
                    <span class="lb-score">${entry.score.toLocaleString()}点</span>
                    <span class="lb-meta">${entry.accuracy}% ・ ${modeLabel} ・ ${entry.date}</span>
                </div>
            `;
        }).join('');
    }

    launchConfetti() {
        const canvas = this.dom.confettiCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#0284c7', '#e11d48', '#059669', '#d97706', '#8b5cf6'];

        for (let i = 0; i < 90; i++) {
            particles.push({
                x: canvas.width * 0.5 + (Math.random() * 100 - 50),
                y: canvas.height * 0.4 + (Math.random() * 50 - 25),
                vx: (Math.random() - 0.5) * 16,
                vy: Math.random() * -14 - 4,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10,
                opacity: 1
            });
        }

        let animationFrame;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeCount = 0;

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35;
                p.vx *= 0.98;
                p.rotation += p.vRot;
                p.opacity -= 0.008;

                if (p.opacity > 0 && p.y < canvas.height) {
                    activeCount++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                    ctx.restore();
                }
            }

            if (activeCount > 0) {
                animationFrame = requestAnimationFrame(render);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationFrame);
            }
        };

        render();
    }

    // ==========================================
    // Reference Modal (早見表)
    // ==========================================

    buildReferenceTable() {
        this.dom.referenceTableBody.innerHTML = '';
        window.ANGLES.forEach(deg => {
            const row = document.createElement('tr');
            row.dataset.angle = deg;

            const sinVal = window.formatValueHtml(window.TRIG_DATA[deg].sin.valueId, this.useRationalized);
            const cosVal = window.formatValueHtml(window.TRIG_DATA[deg].cos.valueId, this.useRationalized);
            const tanVal = window.formatValueHtml(window.TRIG_DATA[deg].tan.valueId, this.useRationalized);

            row.innerHTML = `
                <td class="cell-angle"><strong>${deg}°</strong></td>
                <td class="cell-sin">${sinVal}</td>
                <td class="cell-cos">${cosVal}</td>
                <td class="cell-tan">${tanVal}</td>
            `;

            row.addEventListener('click', () => {
                this.audio.playClick();
                this.dom.referenceTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
                row.classList.add('active-row');
                this.referenceVisualizer.update(deg, 'all');
            });

            this.dom.referenceTableBody.appendChild(row);
        });
    }

    showReferenceModal() {
        this.dom.referenceModal.classList.add('active');
        // Initial highlight 45°
        const row45 = this.dom.referenceTableBody.querySelector('tr[data-angle="45"]');
        if (row45) row45.click();
    }

    hideReferenceModal() {
        this.dom.referenceModal.classList.remove('active');
    }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TrigQuizApp();
});
