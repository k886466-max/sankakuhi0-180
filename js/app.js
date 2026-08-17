/**
 * Othello Application Controller & UI Interaction
 */

class OthelloApp {
    constructor() {
        this.game = new OthelloGame();
        this.ai = new OthelloAI('normal');
        this.sound = window.soundEffects;

        // Settings
        this.gameMode = 'pve'; // 'pve' (Player vs AI) or 'pvp' (Player vs Player)
        this.playerColor = BLACK; // Player color in PvE (BLACK or WHITE)
        this.showGuide = true;
        this.isProcessing = false; // Lock UI during animation or AI thought

        // Star points coordinates (0-indexed)
        this.starPoints = new Set(['2,2', '2,6', '6,2', '6,6']);

        // DOM elements
        this.dom = {
            board: document.getElementById('board'),
            blackScore: document.getElementById('black-score'),
            whiteScore: document.getElementById('white-score'),
            blackCard: document.getElementById('player-black-card'),
            whiteCard: document.getElementById('player-white-card'),
            blackName: document.getElementById('black-name'),
            whiteName: document.getElementById('white-name'),
            blackStatus: document.getElementById('black-status'),
            whiteStatus: document.getElementById('white-status'),
            modeWrapper: document.getElementById('mode-wrapper'),
            modeSelect: document.getElementById('mode-select'),
            colorWrapper: document.getElementById('color-wrapper'),
            colorSelect: document.getElementById('color-select'),
            difficultyWrapper: document.getElementById('difficulty-wrapper'),
            difficultySelect: document.getElementById('difficulty-select'),
            btnUndo: document.getElementById('btn-undo'),
            btnReset: document.getElementById('btn-reset'),
            btnGuide: document.getElementById('btn-guide'),
            btnSound: document.getElementById('btn-sound'),
            toastContainer: document.getElementById('toast-container'),
            modal: document.getElementById('game-over-modal'),
            modalIcon: document.getElementById('modal-icon'),
            modalTitle: document.getElementById('modal-title'),
            modalSubtitle: document.getElementById('modal-subtitle'),
            modalBlackScore: document.getElementById('modal-black-score'),
            modalWhiteScore: document.getElementById('modal-white-score'),
            modalRestart: document.getElementById('modal-btn-restart'),
            modalClose: document.getElementById('modal-btn-close'),
            confettiCanvas: document.getElementById('confetti-canvas')
        };

        this.init();
    }

    init() {
        this.createBoardCells();
        this.bindEvents();
        this.bindKeyboardShortcuts();
        this.bindAudioUnlock();
        this.startNewGame();
    }

    // 8x8セルのDOM生成
    createBoardCells() {
        this.dom.board.innerHTML = '';
        this.cells = [];

        for (let r = 0; r < BOARD_SIZE; r++) {
            this.cells[r] = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', `マス ${r + 1}行 ${c + 1}列`);

                // 星点マーク
                if (this.starPoints.has(`${r},${c}`)) {
                    cell.classList.add('star-dot');
                }

                // 3D Discコンテナ
                const discContainer = document.createElement('div');
                discContainer.className = 'disc-container';
                
                const blackFace = document.createElement('div');
                blackFace.className = 'disc-face black';

                const whiteFace = document.createElement('div');
                whiteFace.className = 'disc-face white';

                discContainer.appendChild(blackFace);
                discContainer.appendChild(whiteFace);
                cell.appendChild(discContainer);

                cell.addEventListener('click', () => this.handleCellClick(r, c));
                this.dom.board.appendChild(cell);

                this.cells[r][c] = {
                    element: cell,
                    disc: discContainer
                };
            }
        }
    }

    // 初回タップ/クリック時にWeb Audio Contextを確実に解除
    bindAudioUnlock() {
        const unlockAudio = () => {
            this.sound.init();
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
        };
        document.addEventListener('click', unlockAudio, { once: true });
        document.addEventListener('touchstart', unlockAudio, { once: true });
    }

    // キーボードショートカット
    bindKeyboardShortcuts() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

            if ((e.key === 'z' || e.key === 'Z') && !this.dom.btnUndo.disabled) {
                this.sound.playClick();
                this.handleUndo();
            } else if (e.key === 'r' || e.key === 'R') {
                this.sound.playClick();
                this.startNewGame();
            } else if (e.key === 'g' || e.key === 'G' || e.key === 'h' || e.key === 'H') {
                this.toggleGuide();
            } else if (e.key === 'm' || e.key === 'M' || e.key === 's' || e.key === 'S') {
                this.toggleSound();
            }
        });
    }

    // イベントリスナー登録
    bindEvents() {
        // モード切替
        this.dom.modeSelect.addEventListener('change', (e) => {
            this.sound.playClick();
            this.gameMode = e.target.value;
            const isPvE = this.gameMode === 'pve';

            if (this.dom.colorWrapper) {
                this.dom.colorWrapper.style.display = isPvE ? 'inline-flex' : 'none';
            }
            if (this.dom.difficultyWrapper) {
                this.dom.difficultyWrapper.style.display = isPvE ? 'inline-flex' : 'none';
            }

            this.updatePlayerNames();
            this.startNewGame();
        });

        // プレイヤー色切替 (先手/後手)
        if (this.dom.colorSelect) {
            this.dom.colorSelect.addEventListener('change', (e) => {
                this.sound.playClick();
                this.playerColor = e.target.value === 'white' ? WHITE : BLACK;
                this.updatePlayerNames();
                this.startNewGame();
            });
        }

        // 難易度切替
        this.dom.difficultySelect.addEventListener('change', (e) => {
            this.sound.playClick();
            this.ai.setDifficulty(e.target.value);
            this.updatePlayerNames();
        });

        // アンドゥ
        this.dom.btnUndo.addEventListener('click', () => {
            if (this.isProcessing) return;
            this.sound.playClick();
            this.handleUndo();
        });

        // リセット
        this.dom.btnReset.addEventListener('click', () => {
            this.sound.playClick();
            this.startNewGame();
        });

        // ガイド表示切替
        this.dom.btnGuide.addEventListener('click', () => {
            this.toggleGuide();
        });

        // サウンド切替
        this.dom.btnSound.addEventListener('click', () => {
            this.toggleSound();
        });

        // モーダル操作
        this.dom.modalRestart.addEventListener('click', () => {
            this.sound.playClick();
            this.hideModal();
            this.startNewGame();
        });

        this.dom.modalClose.addEventListener('click', () => {
            this.sound.playClick();
            this.hideModal();
        });
    }

    toggleGuide() {
        this.sound.playClick();
        this.showGuide = !this.showGuide;
        this.dom.btnGuide.classList.toggle('btn-primary', this.showGuide);
        this.renderValidMoves();
    }

    toggleSound() {
        const enabled = this.sound.toggleSound();
        this.dom.btnSound.textContent = enabled ? '🔊 サウンド' : '🔇 ミュート';
        this.dom.btnSound.classList.toggle('btn-primary', enabled);
        if (enabled) this.sound.playClick();
    }

    getDifficultyLabel() {
        const val = this.dom.difficultySelect.value;
        if (val === 'easy') return '初級';
        if (val === 'normal') return '中級';
        return '上級';
    }

    updatePlayerNames() {
        if (this.gameMode === 'pvp') {
            this.dom.blackName.textContent = 'プレイヤー 1 (黒)';
            this.dom.whiteName.textContent = 'プレイヤー 2 (白)';
        } else {
            const diffLabel = this.getDifficultyLabel();
            if (this.playerColor === BLACK) {
                this.dom.blackName.textContent = 'あなた (黒)';
                this.dom.whiteName.textContent = `CPU (${diffLabel})`;
            } else {
                this.dom.blackName.textContent = `CPU (${diffLabel})`;
                this.dom.whiteName.textContent = 'あなた (白)';
            }
        }
    }

    // 新規ゲーム開始
    startNewGame() {
        this.game.init();
        this.isProcessing = false;
        this.hideModal();
        this.updatePlayerNames();
        this.renderBoardFull();
        this.updateScoreboard();
        this.renderValidMoves();
        this.updateUndoButton();

        // もしCPU対戦でプレイヤーが白（後手）の場合、黒（CPU）の手番を自動実行
        if (this.gameMode === 'pve' && this.playerColor === WHITE) {
            setTimeout(() => {
                this.handleAITurn();
            }, 400);
        }
    }

    // 盤面全体のレンダリング（初期化・アンドゥ時）
    renderBoardFull() {
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const val = this.game.board[r][c];
                const { element, disc } = this.cells[r][c];

                // クラス初期化
                element.classList.remove('valid-move', 'last-move');
                disc.classList.remove('show-black', 'show-white', 'placed');

                if (val === BLACK) {
                    disc.classList.add('show-black');
                    disc.style.display = 'block';
                } else if (val === WHITE) {
                    disc.classList.add('show-white');
                    disc.style.display = 'block';
                } else {
                    disc.style.display = 'none';
                }
            }
        }

        if (this.game.lastMove) {
            const { r, c } = this.game.lastMove;
            this.cells[r][c].element.classList.add('last-move');
        }
    }

    // 有効手ガイドの表示
    renderValidMoves() {
        // 全マスのガイドをクリア
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                this.cells[r][c].element.classList.remove('valid-move');
            }
        }

        if (!this.showGuide || this.game.isGameOver || this.isProcessing) return;

        // CPUの手番の時はガイドを表示しない
        if (this.gameMode === 'pve' && this.game.turn !== this.playerColor) return;

        const validMoves = this.game.getValidMoves();
        for (const move of validMoves) {
            this.cells[move.r][move.c].element.classList.add('valid-move');
        }
    }

    // スコアボードと手番表示の更新
    updateScoreboard() {
        const { black, white } = this.game.getScore();
        this.dom.blackScore.textContent = black;
        this.dom.whiteScore.textContent = white;

        if (this.game.isGameOver) {
            this.dom.blackCard.classList.remove('active');
            this.dom.whiteCard.classList.remove('active');
            this.dom.blackStatus.textContent = '対局終了';
            this.dom.whiteStatus.textContent = '対局終了';
            return;
        }

        if (this.game.turn === BLACK) {
            this.dom.blackCard.classList.add('active');
            this.dom.whiteCard.classList.remove('active');

            if (this.gameMode === 'pvp') {
                this.dom.blackStatus.textContent = '手番 (1P)';
                this.dom.whiteStatus.textContent = '待機中';
            } else if (this.playerColor === BLACK) {
                this.dom.blackStatus.textContent = 'あなたの手番';
                this.dom.whiteStatus.textContent = '待機中';
            } else {
                this.dom.blackStatus.textContent = '思考中...';
                this.dom.whiteStatus.textContent = '待機中';
            }
        } else {
            this.dom.whiteCard.classList.add('active');
            this.dom.blackCard.classList.remove('active');

            if (this.gameMode === 'pvp') {
                this.dom.whiteStatus.textContent = '手番 (2P)';
                this.dom.blackStatus.textContent = '待機中';
            } else if (this.playerColor === WHITE) {
                this.dom.whiteStatus.textContent = 'あなたの手番';
                this.dom.blackStatus.textContent = '待機中';
            } else {
                this.dom.whiteStatus.textContent = '思考中...';
                this.dom.blackStatus.textContent = '待機中';
            }
        }
    }

    updateUndoButton() {
        this.dom.btnUndo.disabled = this.game.history.length === 0 || this.isProcessing;
    }

    // セルクリック時の処理
    async handleCellClick(r, c) {
        if (this.isProcessing || this.game.isGameOver) return;

        // PvEモードでAI手番の場合は無視
        if (this.gameMode === 'pve' && this.game.turn !== this.playerColor) return;

        // 手が打てるか確認
        if (!this.game.canMove(r, c)) return;

        await this.executeMove(r, c);
    }

    // 着手とアニメーション実行
    async executeMove(r, c) {
        this.isProcessing = true;
        this.updateUndoButton();

        // 既存のlast-moveを削除
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                this.cells[row][col].element.classList.remove('valid-move', 'last-move');
            }
        }

        const moveResult = this.game.makeMove(r, c);
        if (!moveResult.success) {
            this.isProcessing = false;
            return;
        }

        // 着手マスの石配置アニメーション
        const targetCell = this.cells[r][c];
        targetCell.element.classList.add('last-move');
        targetCell.disc.style.display = 'block';
        targetCell.disc.className = `disc-container ${moveResult.player === BLACK ? 'show-black' : 'show-white'} placed`;
        this.sound.playPlaceStone();

        // 挟まれた石の波状フリップアニメーション
        await this.animateFlips(moveResult.flips, moveResult.player, r, c);

        this.updateScoreboard();

        // パス発生時の通知
        if (moveResult.passed && !moveResult.gameOver) {
            const passedPlayer = moveResult.player === BLACK ? '白' : '黒';
            this.sound.playPass();
            this.showToast(`置ける場所がないため、${passedPlayer}はパスしました`);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // ゲームオーバー判定
        if (moveResult.gameOver) {
            this.handleGameOver();
            this.isProcessing = false;
            return;
        }

        this.isProcessing = false;
        this.updateUndoButton();
        this.renderValidMoves();

        // PvEでAIの手番になった場合
        if (this.gameMode === 'pve' && this.game.turn !== this.playerColor) {
            this.handleAITurn();
        }
    }

    // 石の反転アニメーション（距離に応じた順次反転）
    async animateFlips(flips, newPlayer, originR, originC) {
        if (flips.length === 0) return;

        // 原点からの距離でソート（近い石から順にパタパタと反転）
        const sortedFlips = [...flips].sort((a, b) => {
            const distA = Math.hypot(a.r - originR, a.c - originC);
            const distB = Math.hypot(b.r - originR, b.c - originC);
            return distA - distB;
        });

        for (let i = 0; i < sortedFlips.length; i++) {
            const { r, c } = sortedFlips[i];
            const { disc } = this.cells[r][c];
            
            // ディレイを挟みながら反転
            await new Promise(resolve => setTimeout(resolve, 60));
            disc.className = `disc-container ${newPlayer === BLACK ? 'show-black' : 'show-white'}`;
            this.sound.playFlipStone(i);
        }

        // 全反転アニメーションの完了を待機
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    // AIの手番処理
    async handleAITurn() {
        if (this.game.isGameOver) return;

        this.isProcessing = true;
        this.updateUndoButton();
        this.updateScoreboard();

        const aiMove = await this.ai.chooseMove(this.game, this.game.turn);

        if (aiMove) {
            await this.executeMove(aiMove.r, aiMove.c);
        } else {
            this.isProcessing = false;
        }
    }

    // アンドゥ処理（PvEなら自分の番まで戻す）
    handleUndo() {
        if (this.gameMode === 'pve') {
            // CPU対戦時は2手戻す（直前のAIの手とプレイヤーの手）
            if (this.game.history.length >= 2) {
                this.game.undo();
                this.game.undo();
            } else if (this.game.history.length === 1) {
                this.game.undo();
            }
        } else {
            this.game.undo();
        }

        this.renderBoardFull();
        this.updateScoreboard();
        this.renderValidMoves();
        this.updateUndoButton();
    }

    // トースト通知表示
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
        this.dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2500);
    }

    // ゲームオーバー処理
    handleGameOver() {
        const { black, white } = this.game.getScore();
        this.dom.modalBlackScore.textContent = black;
        this.dom.modalWhiteScore.textContent = white;

        let title = '';
        let subtitle = '';
        let icon = '🏆';
        let isUserWin = false;

        if (this.game.winner === BLACK) {
            if (this.gameMode === 'pve') {
                if (this.playerColor === BLACK) {
                    title = 'あなたの勝利！ 🎉';
                    subtitle = `${black} 対 ${white} で勝利しました！おめでとうございます！`;
                    isUserWin = true;
                } else {
                    title = 'CPUの勝利！ 🤖';
                    subtitle = `${black} 対 ${white} でCPUの勝利です。再挑戦してみましょう！`;
                    icon = '🤖';
                }
            } else {
                title = '黒 (1P) の勝利！ 🏆';
                subtitle = `${black} 対 ${white} で黒が勝利しました！`;
                isUserWin = true;
            }
        } else if (this.game.winner === WHITE) {
            if (this.gameMode === 'pve') {
                if (this.playerColor === WHITE) {
                    title = 'あなたの勝利！ 🎉';
                    subtitle = `${white} 対 ${black} で見事に勝利しました！`;
                    isUserWin = true;
                } else {
                    title = 'CPUの勝利！ 🤖';
                    subtitle = `${white} 対 ${black} でCPUの勝利です。再挑戦してみましょう！`;
                    icon = '🤖';
                }
            } else {
                title = '白 (2P) の勝利！ 🏆';
                subtitle = `${white} 対 ${black} で白が勝利しました！`;
                isUserWin = true;
            }
        } else {
            title = '引き分け！ 🤝';
            subtitle = `${black} 対 ${white} の白熱した同点でした！`;
            icon = '⚖️';
        }

        this.dom.modalIcon.textContent = icon;
        this.dom.modalTitle.textContent = title;
        this.dom.modalSubtitle.textContent = subtitle;

        if (isUserWin || this.gameMode === 'pvp') {
            this.sound.playWin();
            this.launchConfetti();
        }

        setTimeout(() => {
            this.showModal();
        }, 600);
    }

    showModal() {
        this.dom.modal.classList.add('active');
    }

    hideModal() {
        this.dom.modal.classList.remove('active');
    }

    // 紙吹雪（Confetti）エフェクト
    launchConfetti() {
        const canvas = this.dom.confettiCanvas;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ffffff'];

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
                p.vy += 0.35; // 重力
                p.vx *= 0.98; // 空気抵抗
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
}

// ページロード時に起動
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OthelloApp();
});
