/**
 * Othello Game Core Logic
 */
const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

class OthelloGame {
    constructor() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        this.turn = BLACK;
        this.history = [];
        this.lastMove = null;
        this.isGameOver = false;
        this.winner = null; // BLACK, WHITE, 0 (Draw), or null (in progress)
        this.init();
    }

    init() {
        this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        const mid = BOARD_SIZE / 2;
        this.board[mid - 1][mid - 1] = WHITE;
        this.board[mid - 1][mid] = BLACK;
        this.board[mid][mid - 1] = BLACK;
        this.board[mid][mid] = WHITE;

        this.turn = BLACK;
        this.history = [];
        this.lastMove = null;
        this.isGameOver = false;
        this.winner = null;
    }

    // 盤面のクローン
    cloneBoard(board = this.board) {
        return board.map(row => [...row]);
    }

    // 座標が盤面内か判定
    isValidCoord(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    // 指定マスに石を置いた時に反転できる石の座標一覧を取得
    getFlippableDiscs(r, c, player = this.turn, board = this.board) {
        if (!this.isValidCoord(r, c) || board[r][c] !== EMPTY) {
            return [];
        }

        const opponent = -player;
        const flippable = [];

        for (const [dr, dc] of DIRECTIONS) {
            const currentDirFlips = [];
            let nr = r + dr;
            let nc = c + dc;

            while (this.isValidCoord(nr, nc) && board[nr][nc] === opponent) {
                currentDirFlips.push({ r: nr, c: nc });
                nr += dr;
                nc += dc;
            }

            if (this.isValidCoord(nr, nc) && board[nr][nc] === player && currentDirFlips.length > 0) {
                flippable.push(...currentDirFlips);
            }
        }

        return flippable;
    }

    // 有効手一覧を取得 [{r, c, flips: [{r, c}, ...]}]
    getValidMoves(player = this.turn, board = this.board) {
        const validMoves = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const flips = this.getFlippableDiscs(r, c, player, board);
                if (flips.length > 0) {
                    validMoves.push({ r, c, flips });
                }
            }
        }
        return validMoves;
    }

    // 着手可能か
    canMove(r, c, player = this.turn, board = this.board) {
        return this.getFlippableDiscs(r, c, player, board).length > 0;
    }

    // 着手実行
    // 戻り値: { success: boolean, flipped: [{r, c}], passed: boolean, gameOver: boolean }
    makeMove(r, c) {
        if (this.isGameOver) return { success: false };

        const flips = this.getFlippableDiscs(r, c, this.turn, this.board);
        if (flips.length === 0) {
            return { success: false };
        }

        // 履歴保存（アンドゥ用）
        this.history.push({
            board: this.cloneBoard(this.board),
            turn: this.turn,
            lastMove: this.lastMove ? { ...this.lastMove } : null
        });

        // 盤面更新
        this.board[r][c] = this.turn;
        for (const disc of flips) {
            this.board[disc.r][disc.c] = this.turn;
        }

        this.lastMove = { r, c, player: this.turn };
        const movedPlayer = this.turn;
        const opponent = -this.turn;

        // 次の手番判定
        let passed = false;
        if (this.getValidMoves(opponent).length > 0) {
            this.turn = opponent;
        } else if (this.getValidMoves(movedPlayer).length > 0) {
            // 相手がパスの場合、現プレイヤーが続行
            passed = true;
            this.turn = movedPlayer;
        } else {
            // 両者置けない → ゲーム終了
            this.isGameOver = true;
            this.determineWinner();
        }

        return {
            success: true,
            player: movedPlayer,
            r,
            c,
            flips,
            passed,
            nextTurn: this.turn,
            gameOver: this.isGameOver
        };
    }

    // 1手アンドゥ（戻す）
    undo() {
        if (this.history.length === 0) return false;

        const prev = this.history.pop();
        this.board = prev.board;
        this.turn = prev.turn;
        this.lastMove = prev.lastMove;
        this.isGameOver = false;
        this.winner = null;

        return true;
    }

    // 石数カウント { black: number, white: number, empty: number }
    getScore(board = this.board) {
        let black = 0;
        let white = 0;
        let empty = 0;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (board[r][c] === BLACK) black++;
                else if (board[r][c] === WHITE) white++;
                else empty++;
            }
        }

        return { black, white, empty };
    }

    // 勝者判定
    determineWinner() {
        const { black, white } = this.getScore();
        if (black > white) {
            this.winner = BLACK;
        } else if (white > black) {
            this.winner = WHITE;
        } else {
            this.winner = 0; // 引き分け
        }
    }
}

window.OthelloGame = OthelloGame;
window.BOARD_SIZE = BOARD_SIZE;
window.BLACK = BLACK;
window.WHITE = WHITE;
window.EMPTY = EMPTY;
