/**
 * Trigonometric Ratio Dataset (0° to 180°)
 * Standard Angles: 0°, 30°, 45°, 60°, 90°, 120°, 135°, 150°, 180°
 */

const ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180];
const FUNCTIONS = ['sin', 'cos', 'tan'];

const MINUS = '<span class="minus-sign">−</span>';

// 全ての取り得る値の定義（パレット・選択肢用）
const VALUE_DEFS = {
    '0': { id: '0', standard: '0', rationalized: '0', val: 0, label: '0' },
    '1/2': { id: '1/2', standard: '1/2', rationalized: '1/2', val: 0.5, html: '<span class="fraction"><span class="num">1</span><span class="den">2</span></span>' },
    '-1/2': { id: '-1/2', standard: '-1/2', rationalized: '-1/2', val: -0.5, html: `${MINUS}<span class="fraction"><span class="num">1</span><span class="den">2</span></span>` },
    
    '1/sqrt2': { 
        id: '1/sqrt2', 
        standard: '1/√2', 
        rationalized: '√2/2', 
        val: 1 / Math.SQRT2, 
        htmlStd: '<span class="fraction"><span class="num">1</span><span class="den">√2</span></span>',
        htmlRat: '<span class="fraction"><span class="num">√2</span><span class="den">2</span></span>'
    },
    '-1/sqrt2': { 
        id: '-1/sqrt2', 
        standard: '-1/√2', 
        rationalized: '-√2/2', 
        val: -1 / Math.SQRT2, 
        htmlStd: `${MINUS}<span class="fraction"><span class="num">1</span><span class="den">√2</span></span>`,
        htmlRat: `${MINUS}<span class="fraction"><span class="num">√2</span><span class="den">2</span></span>`
    },

    'sqrt3/2': { 
        id: 'sqrt3/2', 
        standard: '√3/2', 
        rationalized: '√3/2', 
        val: Math.sqrt(3) / 2, 
        html: '<span class="fraction"><span class="num">√3</span><span class="den">2</span></span>' 
    },
    '-sqrt3/2': { 
        id: '-sqrt3/2', 
        standard: '-√3/2', 
        rationalized: '-√3/2', 
        val: -Math.sqrt(3) / 2, 
        html: `${MINUS}<span class="fraction"><span class="num">√3</span><span class="den">2</span></span>` 
    },

    '1': { id: '1', standard: '1', rationalized: '1', val: 1, label: '1' },
    '-1': { id: '-1', standard: '-1', rationalized: '-1', val: -1, label: `${MINUS}1` },

    '1/sqrt3': { 
        id: '1/sqrt3', 
        standard: '1/√3', 
        rationalized: '√3/3', 
        val: 1 / Math.sqrt(3), 
        htmlStd: '<span class="fraction"><span class="num">1</span><span class="den">√3</span></span>',
        htmlRat: '<span class="fraction"><span class="num">√3</span><span class="den">3</span></span>'
    },
    '-1/sqrt3': { 
        id: '-1/sqrt3', 
        standard: '-1/√3', 
        rationalized: '-√3/3', 
        val: -1 / Math.sqrt(3), 
        htmlStd: `${MINUS}<span class="fraction"><span class="num">1</span><span class="den">√3</span></span>`,
        htmlRat: `${MINUS}<span class="fraction"><span class="num">√3</span><span class="den">3</span></span>`
    },

    'sqrt3': { id: 'sqrt3', standard: '√3', rationalized: '√3', val: Math.sqrt(3), label: '√3' },
    '-sqrt3': { id: '-sqrt3', standard: '-√3', rationalized: '-√3', val: -Math.sqrt(3), label: `${MINUS}√3` },

    'none': { id: 'none', standard: 'なし', rationalized: 'なし', val: null, label: 'なし' }
};

// 角度ごとのデータテーブル
const TRIG_DATA = {
    0: {
        sin: { valueId: '0', explanation: '0°のとき点P(1, 0)となり、y座標は 0 です。' },
        cos: { valueId: '1', explanation: '0°のとき点P(1, 0)となり、x座標は 1 です。' },
        tan: { valueId: '0', explanation: 'tan 0° = sin 0° / cos 0° = 0 / 1 = 0 です（動径の傾きが0）。' }
    },
    30: {
        sin: { valueId: '1/2', explanation: '30°-60°-90°の直角三角形（斜辺2, 対辺1, 底辺√3）より、sin 30° = 1/2 です。' },
        cos: { valueId: 'sqrt3/2', explanation: '30°-60°-90°の直角三角形より、cos 30° = √3/2 です。' },
        tan: { valueId: '1/sqrt3', explanation: 'tan 30° = 対辺/隣辺 = 1/√3 (有理化すると √3/3) です。' }
    },
    45: {
        sin: { valueId: '1/sqrt2', explanation: '45°-45°-90°の直角二等辺三角形（辺比 1 : 1 : √2）より、sin 45° = 1/√2 (√2/2) です。' },
        cos: { valueId: '1/sqrt2', explanation: '45°-45°-90°の直角二等辺三角形より、cos 45° = 1/√2 (√2/2) です。' },
        tan: { valueId: '1', explanation: 'tan 45° = 対辺/隣辺 = 1/1 = 1 です（傾きが45°で1）。' }
    },
    60: {
        sin: { valueId: 'sqrt3/2', explanation: '60°-30°-90°の直角三角形より、点Pのy座標は √3/2 です。' },
        cos: { valueId: '1/2', explanation: '60°-30°-90°の直角三角形より、点Pのx座標は 1/2 です。' },
        tan: { valueId: 'sqrt3', explanation: 'tan 60° = 対辺/隣辺 = √3/1 = √3 です。' }
    },
    90: {
        sin: { valueId: '1', explanation: '90°のとき点P(0, 1)となり、y座標は 1（最大値）です。' },
        cos: { valueId: '0', explanation: '90°のとき点P(0, 1)となり、x座標は 0 です。' },
        tan: { valueId: 'none', explanation: 'x=0 となるため分母が0となり、tan 90° は定義されません（「なし」）。' }
    },
    120: {
        sin: { valueId: 'sqrt3/2', explanation: '120° = 180° - 60° です。第2象限でも y > 0 なので sin 120° = sin 60° = √3/2 です。' },
        cos: { valueId: '-1/2', explanation: '120° = 180° - 60° です。第2象限では x < 0 なので cos 120° = -cos 60° = -1/2 です。' },
        tan: { valueId: '-sqrt3', explanation: '120°の動径は傾きが負になり、tan 120° = -tan 60° = -√3 です。' }
    },
    135: {
        sin: { valueId: '1/sqrt2', explanation: '135° = 180° - 45° です。第2象限で y > 0 なので sin 135° = sin 45° = 1/√2 (√2/2) です。' },
        cos: { valueId: '-1/sqrt2', explanation: '135° = 180° - 45° です。第2象限で x < 0 なので cos 135° = -cos 45° = -1/√2 (-√2/2) です。' },
        tan: { valueId: '-1', explanation: '135°の傾きは -1 です（tan 135° = -tan 45° = -1）。' }
    },
    150: {
        sin: { valueId: '1/2', explanation: '150° = 180° - 30° です。第2象限で y > 0 なので sin 150° = sin 30° = 1/2 です。' },
        cos: { valueId: '-sqrt3/2', explanation: '150° = 180° - 30° です。第2象限で x < 0 なので cos 150° = -cos 30° = -√3/2 です。' },
        tan: { valueId: '-1/sqrt3', explanation: '150°の動径の傾きは -1/√3 (-√3/3) です。' }
    },
    180: {
        sin: { valueId: '0', explanation: '180°のとき点P(-1, 0)となり、y座標は 0 です。' },
        cos: { valueId: '-1', explanation: '180°のとき点P(-1, 0)となり、x座標は -1（最小値）です。' },
        tan: { valueId: '0', explanation: '180°の動径は水平（傾き0）なので、tan 180° = 0 です。' }
    }
};

/**
 * HTML表示用の値フォーマットを取得
 * @param {string} valueId - 値ID (e.g. 'sqrt3/2', '1/sqrt2')
 * @param {boolean} useRationalized - 有理化表記フラグ (true: √2/2, false: 1/√2)
 * @returns {string} HTML文字列
 */
function formatValueHtml(valueId, useRationalized = false) {
    const def = VALUE_DEFS[valueId];
    if (!def) return valueId;

    if (def.html) return def.html;
    if (useRationalized && def.htmlRat) return def.htmlRat;
    if (!useRationalized && def.htmlStd) return def.htmlStd;
    if (def.label) return def.label;
    return useRationalized ? def.rationalized : def.standard;
}

/**
 * プレーンテキスト用の値フォーマットを取得
 */
function formatValueText(valueId, useRationalized = false) {
    const def = VALUE_DEFS[valueId];
    if (!def) return valueId;
    return useRationalized ? def.rationalized : def.standard;
}

window.TRIG_DATA = TRIG_DATA;
window.VALUE_DEFS = VALUE_DEFS;
window.ANGLES = ANGLES;
window.FUNCTIONS = FUNCTIONS;
window.formatValueHtml = formatValueHtml;
window.formatValueText = formatValueText;
