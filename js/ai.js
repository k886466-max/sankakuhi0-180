/**
 * Othello AI Engine
 * Supports: Easy, Normal, Hard (Alpha-Beta Pruning with positional/mobility/stability evaluation)
 */

// 基本の位置重みテーブル
const POSITION_WEIGHTS = [
    [ 120, -20,  20,   5,   5,  20, -20, 120 ],
    [ -20, -40,  -5,  -5,  -5,  -5, -40, -20 ],
    [  20,  -5,  15,   3,   3,  15,  -5,  20 ],
    [   5,  -5,   3,   3,   3,   3,  -5,   5 ],
    [   5,  -5,   3,   3,   3,   3,  -5,   5 ],
    [  20,  -5,  15,   3,   3,  15,  -5,  20 ],
    [ -20, -40,  -5,  -5,  -5,  -5, -40, -20 ],
    [ 120, -20,  20,   5,   5,  20, -20, 120 ]
];

// 角と隣接マスのマッピング
const CORNER_ADJACENTS = [
    { corner: [0, 0], adjacents: [[0, 1], [1, 0], [1, 1]] },
    { corner: [0, 7], adjacents: [[0, 6], [1, 7], [1, 6]] },
    { corner: [7, 0], adjacents: [[6, 0], [7, 1], [6, 1]] },
    { corner: [7, 7], adjacents: [[7, 6], [6, 7], [6, 6]] }
];

class OthelloAI {
    constructor(difficulty = 'normal') {
        this.difficulty = difficulty; // 'easy' | 'normal' | 'hard'
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    // 次の手を決定する
    async chooseMove(game, player) {
        const validMoves = game.getValidMoves(player);
        if (validMoves.length === 0) return null;

        // UIの反応性を保つためわずかな思考ディレイ（200〜400ms）
        await new Promise(resolve => setTimeout(resolve, 300));

        switch (this.difficulty) {
            case 'easy':
                return this.chooseEasyMove(validMoves);
            case 'normal':
                return this.chooseNormalMove(game, player, validMoves);
            case 'hard':
            default:
                return this.chooseHardMove(game, player, validMoves);
        }
    }

    // Easy: ランダム（ただし角があれば80%で取る）
    chooseEasyMove(validMoves) {
        const cornerMoves = validMoves.filter(m => 
            (m.r === 0 || m.r === 7) && (m.c === 0 || m.c === 7)
        );
        if (cornerMoves.length > 0 && Math.random() < 0.8) {
            return cornerMoves[Math.floor(Math.random() * cornerMoves.length)];
        }
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Normal: 1手先の位置評価値 + 取れる枚数の簡易評価
    chooseNormalMove(game, player, validMoves) {
        let bestScore = -Infinity;
        let bestMoves = [];

        for (const move of validMoves) {
            const posScore = POSITION_WEIGHTS[move.r][move.c];
            const flipScore = move.flips.length * 2;
            const totalScore = posScore + flipScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestMoves = [move];
            } else if (totalScore === bestScore) {
                bestMoves.push(move);
            }
        }

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Hard: ミニマックス（α-β枝刈り）+ 高度な盤面評価
    chooseHardMove(game, player, validMoves) {
        const emptyCount = game.getScore().empty;

        // 終盤（空きマス10個以下）は完全読み、中盤は深さ4〜5手読み
        let searchDepth = 4;
        if (emptyCount <= 10) {
            searchDepth = emptyCount; // 完全読み
        } else if (emptyCount <= 16) {
            searchDepth = 5;
        }

        let bestScore = -Infinity;
        let bestMove = validMoves[0];
        let alpha = -Infinity;
        const beta = Infinity;

        // 手の並び替え（角や端を先に探索して枝刈り効率UP）
        const sortedMoves = [...validMoves].sort((a, b) => {
            return POSITION_WEIGHTS[b.r][b.c] - POSITION_WEIGHTS[a.r][a.c];
        });

        for (const move of sortedMoves) {
            const nextBoard = this.simulateMove(game.board, move.r, move.c, move.flips, player);
            const score = this.minimax(game, nextBoard, searchDepth - 1, alpha, beta, -player, player, emptyCount <= 10);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestScore);
        }

        return bestMove;
    }

    // 盤面着手シミュレーション（高速コピー）
    simulateMove(board, r, c, flips, player) {
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;
        for (const disc of flips) {
            newBoard[disc.r][disc.c] = player;
        }
        return newBoard;
    }

    // ミニマックス（Alpha-Beta法）
    minimax(game, board, depth, alpha, beta, currentPlayer, aiPlayer, isEndgame) {
        const validMoves = game.getValidMoves(currentPlayer, board);

        // 終局または探索深度限界
        if (depth === 0 || (validMoves.length === 0 && game.getValidMoves(-currentPlayer, board).length === 0)) {
            return this.evaluateBoard(game, board, aiPlayer, isEndgame);
        }

        // パスの場合
        if (validMoves.length === 0) {
            return this.minimax(game, board, depth - 1, alpha, beta, -currentPlayer, aiPlayer, isEndgame);
        }

        const isMaximizing = (currentPlayer === aiPlayer);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const nextBoard = this.simulateMove(board, move.r, move.c, move.flips, currentPlayer);
                const evaluation = this.minimax(game, nextBoard, depth - 1, alpha, beta, -currentPlayer, aiPlayer, isEndgame);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // β枝刈り
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const nextBoard = this.simulateMove(board, move.r, move.c, move.flips, currentPlayer);
                const evaluation = this.minimax(game, nextBoard, depth - 1, alpha, beta, -currentPlayer, aiPlayer, isEndgame);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // α枝刈り
            }
            return minEval;
        }
    }

    // 静的盤面評価関数
    evaluateBoard(game, board, aiPlayer, isEndgame) {
        const opponent = -aiPlayer;
        let aiDiscs = 0;
        let oppDiscs = 0;

        // 終盤は石の枚数差のみで勝敗を判断
        if (isEndgame) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c] === aiPlayer) aiDiscs++;
                    else if (board[r][c] === opponent) oppDiscs++;
                }
            }
            return (aiDiscs - oppDiscs) * 1000;
        }

        // 1. 位置価値（動的重み）
        let posVal = 0;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const val = POSITION_WEIGHTS[r][c];
                if (board[r][c] === aiPlayer) {
                    posVal += val;
                    aiDiscs++;
                } else if (board[r][c] === opponent) {
                    posVal -= val;
                    oppDiscs++;
                }
            }
        }

        // 角が取られている場合、周囲のマイナス評価を緩和
        for (const { corner, adjacents } of CORNER_ADJACENTS) {
            const [cr, cc] = corner;
            if (board[cr][cc] !== EMPTY) {
                const owner = board[cr][cc];
                for (const [ar, ac] of adjacents) {
                    if (board[ar][ac] === owner) {
                        posVal += (owner === aiPlayer ? 45 : -45);
                    }
                }
            }
        }

        // 2. 着手可能手数（モビリティ）の評価
        const aiMoves = game.getValidMoves(aiPlayer, board).length;
        const oppMoves = game.getValidMoves(opponent, board).length;
        let mobilityVal = 0;
        if (aiMoves + oppMoves > 0) {
            mobilityVal = 100 * (aiMoves - oppMoves) / (aiMoves + oppMoves);
        }

        // 3. 確定石（隅の確保数）
        let cornerVal = 0;
        const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
        for (const [r, c] of corners) {
            if (board[r][c] === aiPlayer) cornerVal += 35;
            else if (board[r][c] === opponent) cornerVal -= 35;
        }

        // 総合スコア算出
        return (posVal * 1.0) + (mobilityVal * 1.5) + (cornerVal * 2.0);
    }
}

window.OthelloAI = OthelloAI;
