/**
 * Trigonometric Ratio Quiz Application Controller
 */

class TrigQuizApp {
    constructor() {
        this.audio = window.quizAudio;
        this.visualizer = null;
        this.referenceVisualizer = null;

        // Settings State
        this.mode = '10-challenge'; // '10-challenge' | 'endless' | 'practice'
        this.answerType = 'choice4'; // 'choice4' | 'palette'
        this.targetFunctions = ['sin', 'cos', 'tan']; // Array of selected functions
        this.angleRange = '180'; // '180' (0~180°) or '90' (0~90°)
        this.timeLimitSetting = 10; // 3, 5, 10, or 0 (unlimited)
        this.useRationalized = false; // true: √2/2, false: 1/√2

        // Quiz State
        this.currentQuestion = null;
        this.questionIndex = 0;
        this.totalQuestions = 10;
        this.score = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.lives = 3;
        this.isAnswered = false;
        this.history = []; // Array of { q, selected, correct, isCorrect, timeMs }
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

            // Confetti
            confettiCanvas: document.getElementById('confetti-canvas')
        };

        this.init();
    }

    init() {
        // 単位円の点クリックで直接回答できるコールバックを登録
        this.visualizer = new UnitCircleVisualizer('quiz-unit-circle', (deg, pointEl) => this.handlePointAnswer(deg, pointEl));
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
                if (!this.isAnswered && this.answerType === 'choice4') {
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

        // UI Setup for Mode
        this.dom.headerStreak.textContent = `🔥 0`;
        this.dom.headerScore.textContent = `🎯 0`;

        if (this.mode === '10-challenge') {
            const timeDesc = this.timeLimitSetting > 0 ? ` (${this.timeLimitSetting}秒/問)` : ' (時間無制限)';
            this.dom.quizModeBadge.textContent = `⚡ 10問スピードチャレンジ${timeDesc}`;
            this.dom.timerContainer.style.display = this.timeLimitSetting > 0 ? 'block' : 'none';
            this.dom.livesContainer.style.display = 'none';
            this.timePerQuestion = this.timeLimitSetting > 0 ? this.timeLimitSetting : 10;
        } else if (this.mode === 'endless') {
            this.dom.quizModeBadge.textContent = '🔥 エンドレス特訓 (3ライフ)';
            this.dom.timerContainer.style.display = 'none';
            this.dom.livesContainer.style.display = 'flex';
            this.updateLivesDisplay();
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
        if (this.mode === '10-challenge' && this.questionIndex >= this.totalQuestions) {
            this.finishQuiz();
            return;
        }
        if (this.mode === 'endless' && this.lives <= 0) {
            this.finishQuiz();
            return;
        }

        this.questionIndex++;
        this.isAnswered = false;
        this.dom.explanationCard.classList.remove('active');
        this.dom.btnNextQuestion.style.display = 'none';

        // Update progress bar
        if (this.mode === '10-challenge') {
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
        this.dom.questionAngle.textContent = `${this.currentQuestion.angle}°`;

        // 単位円は出題中は角度・三角形を伏せ、位置選択可能なポイントを表示
        this.visualizer.hideDynamic();

        // Render answer inputs
        if (this.answerType === 'choice4') {
            this.dom.choicesContainer.style.display = 'grid';
            this.dom.paletteContainer.style.display = 'none';
            this.render4Choices();
        } else {
            this.dom.choicesContainer.style.display = 'none';
            this.dom.paletteContainer.style.display = 'flex';
            this.renderPalette();
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
            btn.addEventListener('click', () => this.handleAnswer(valueId, btn));
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

        if (this.mode !== '10-challenge' || this.timeLimitSetting <= 0) return;

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

    // 単位円上の点をクリックして回答
    handlePointAnswer(deg, pointEl) {
        if (this.isAnswered) return;
        const isMatchAngle = (deg === this.currentQuestion.angle);
        const selectedValueId = isMatchAngle 
            ? this.currentQuestion.correctValueId 
            : window.TRIG_DATA[deg][this.currentQuestion.func].valueId;

        this.handleAnswer(selectedValueId, null, deg);
    }

    // 解答処理（選択肢ボタンまたは単位円タップのどちらでも実行）
    handleAnswer(selectedValueId, clickedBtn = null, clickedAngle = null) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.stopTimer();
        this.clearAutoAdvance();

        const timeTakenMs = Date.now() - this.questionStartTime;
        
        // 正誤判定（単位円タップ時は角度一致、ボタンタップ時は値一致）
        const isCorrect = (clickedAngle !== null)
            ? (clickedAngle === this.currentQuestion.angle)
            : (selectedValueId === this.currentQuestion.correctValueId);

        // Record history
        this.history.push({
            angle: this.currentQuestion.angle,
            func: this.currentQuestion.func,
            selected: selectedValueId,
            correct: this.currentQuestion.correctValueId,
            isCorrect,
            timeTakenMs
        });

        // 4択またはパレットボタンのハイライト
        if (this.answerType === 'choice4') {
            const allBtns = this.dom.choicesContainer.querySelectorAll('.choice-btn');
            allBtns.forEach(btn => {
                if (btn.dataset.valueId === this.currentQuestion.correctValueId) {
                    btn.classList.add('correct');
                } else if (btn === clickedBtn && !isCorrect) {
                    btn.classList.add('incorrect');
                }
                btn.disabled = true;
            });
        } else {
            const allBtns = this.dom.paletteContainer.querySelectorAll('.palette-btn');
            allBtns.forEach(btn => {
                if (btn.dataset.valueId === this.currentQuestion.correctValueId) {
                    btn.classList.add('correct');
                } else if (btn === clickedBtn && !isCorrect) {
                    btn.classList.add('incorrect');
                }
                btn.disabled = true;
            });
        }

        // Handle scoring & audio feedback
        if (isCorrect) {
            this.streak++;
            this.maxStreak = Math.max(this.maxStreak, this.streak);
            const speedBonus = this.timeLimitSetting > 0 
                ? Math.max(0, Math.floor((this.timePerQuestion * 1000 - timeTakenMs) / 100))
                : 40;
            const streakBonus = this.streak * 20;
            const points = 100 + speedBonus + streakBonus;
            this.score += points;

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

        // Update header stats
        this.dom.headerStreak.textContent = `🔥 ${this.streak}`;
        this.dom.headerScore.textContent = `🎯 ${this.score}`;

        // 答え合わせ：ここで単位円（半円）に角度・直角三角形・座標・成分値を大きくアニメーション表示！
        this.visualizer.update(this.currentQuestion.angle, this.currentQuestion.func, clickedAngle);

        // Show Explanation
        this.dom.explanationText.innerHTML = `
            <p><strong>${this.currentQuestion.func} ${this.currentQuestion.angle}° = ${window.formatValueHtml(this.currentQuestion.correctValueId, this.useRationalized)}</strong></p>
            <p>${this.currentQuestion.explanation}</p>
        `;
        this.dom.explanationCard.classList.add('active');
        this.dom.btnNextQuestion.style.display = 'inline-flex';

        // 次の問題への自動遷移（1.6秒後に自動で進む、またはボタン即時クリック）
        if (this.mode === 'endless' && this.lives <= 0) {
            this.dom.btnNextQuestion.textContent = '結果を見る ➔';
            this.autoAdvanceTimer = setTimeout(() => {
                this.nextQuestion();
            }, 1800);
        } else if (this.mode === '10-challenge' && this.questionIndex >= this.totalQuestions) {
            this.dom.btnNextQuestion.textContent = '結果発表へ ➔';
            this.autoAdvanceTimer = setTimeout(() => {
                this.nextQuestion();
            }, 1800);
        } else {
            this.dom.btnNextQuestion.textContent = '次の問題へ (自動で進みます) ➔';
            this.autoAdvanceTimer = setTimeout(() => {
                this.nextQuestion();
            }, 1500);
        }
    }

    handleTimeout() {
        if (this.isAnswered) return;
        this.handleAnswer('TIMEOUT', null);
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
        if (accuracy === 100 && total >= 10) {
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

        // Fanfare & Confetti on S rank
        if (accuracy >= 80) {
            this.audio.playFanfare();
            this.launchConfetti();
        }
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
