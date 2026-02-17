// GR-1000N ジブ揚程計算ロジック
// 作業半径からブーム起伏角度を逆算し、ジブ先端の地上揚程を計算

// ブーム長さの数値変換
function parseBoomLength(str) {
    return parseFloat(str.replace('m', ''));
}

// ジブ長さの数値変換
function parseJibLength(str) {
    return parseFloat(str.replace('m', ''));
}

// 作業半径からブーム起伏角度を求める（ニュートン法による近似）
// 作業半径 R = boomLen * cos(boomAngle) + jibLen * cos(boomAngle - offsetAngle) + footOffset
// footOffset: ブーム根元から旋回中心までの水平距離（約1.5m）
function calcBoomAngleFromRadius(radius, boomLen, jibLen, offsetDeg) {
    var offsetRad = offsetDeg * Math.PI / 180;
    var footOffset = 1.5; // ブーム根元オフセット(m)

    // ニュートン法で角度を求める
    // f(a) = boomLen*cos(a) + jibLen*cos(a - offset) + footOffset - radius = 0
    var angle = 60 * Math.PI / 180; // 初期値 60°

    for (var i = 0; i < 50; i++) {
        var f = boomLen * Math.cos(angle) + jibLen * Math.cos(angle - offsetRad) + footOffset - radius;
        var df = -boomLen * Math.sin(angle) - jibLen * Math.sin(angle - offsetRad);

        if (Math.abs(df) < 1e-10) break;

        var newAngle = angle - f / df;

        // 角度の範囲制限 (0° ～ 84°)
        if (newAngle < 0) newAngle = 0.01;
        if (newAngle > 84 * Math.PI / 180) newAngle = 84 * Math.PI / 180;

        if (Math.abs(newAngle - angle) < 1e-8) {
            angle = newAngle;
            break;
        }
        angle = newAngle;
    }

    return angle;
}

// 揚程を計算
// H = pivotHeight + boomLen * sin(boomAngle) + jibLen * sin(boomAngle - offsetAngle)
function calcHeight(boomAngleRad, boomLen, jibLen, offsetDeg) {
    var offsetRad = offsetDeg * Math.PI / 180;
    var pivotHeight = BOOM_PIVOT_HEIGHT; // 2.5m

    var h = pivotHeight
        + boomLen * Math.sin(boomAngleRad)
        + jibLen * Math.sin(boomAngleRad - offsetRad);

    return Math.max(0, h);
}

// 特定の条件でのジブ作業テーブルを生成
// mode: 性能モード, jibLen: ジブ長さ, boomLen: ブーム長さ, offset: オフセット角度
// weight: 入力荷重(t) - nullの場合は全データ表示
function generateJibTable(mode, jibLenStr, boomLenStr, offsetStr, weight) {
    var data = JIB_DATA[mode];
    if (!data) return null;
    if (!data[jibLenStr]) return null;
    if (!data[jibLenStr][boomLenStr]) return null;
    if (!data[jibLenStr][boomLenStr][offsetStr]) return null;

    var radiusData = data[jibLenStr][boomLenStr][offsetStr];
    var boomLen = parseBoomLength(boomLenStr);
    var jibLen = parseJibLength(jibLenStr);
    var offsetDeg = parseFloat(offsetStr);

    var radii = Object.keys(radiusData).map(Number).sort(function(a, b) { return a - b; });

    var rows = [];
    var maxRadiusForWeight = null;
    var loadAtMax = null;

    for (var i = 0; i < radii.length; i++) {
        var r = radii[i];
        var load = radiusData[r];

        // ブーム角度と揚程を計算
        var boomAngleRad = calcBoomAngleFromRadius(r, boomLen, jibLen, offsetDeg);
        var boomAngleDeg = boomAngleRad * 180 / Math.PI;
        var height = calcHeight(boomAngleRad, boomLen, jibLen, offsetDeg);

        var canLift = (weight !== null) ? (load >= weight) : true;

        if (canLift && weight !== null) {
            maxRadiusForWeight = r;
            loadAtMax = load;
        }

        rows.push({
            radius: r,
            load: load,
            boomAngle: boomAngleDeg,
            height: height,
            canLift: canLift
        });
    }

    return {
        rows: rows,
        maxRadius: maxRadiusForWeight,
        loadAtMax: loadAtMax,
        jibLen: jibLenStr,
        boomLen: boomLenStr,
        offset: offsetStr,
        mode: mode
    };
}

// 全ジブ組合せで荷重検索
function searchAllJibCombinations(mode, weight) {
    var data = JIB_DATA[mode];
    if (!data) return [];

    var results = [];

    for (var j = 0; j < JIB_LENGTHS.length; j++) {
        var jibLenStr = JIB_LENGTHS[j];
        if (!data[jibLenStr]) continue;

        for (var b = 0; b < JIB_BOOM_LENGTHS.length; b++) {
            var boomLenStr = JIB_BOOM_LENGTHS[b];
            if (!data[jibLenStr][boomLenStr]) continue;

            for (var o = 0; o < JIB_OFFSETS.length; o++) {
                var offsetStr = JIB_OFFSETS[o];
                if (!data[jibLenStr][boomLenStr][offsetStr]) continue;

                var table = generateJibTable(mode, jibLenStr, boomLenStr, offsetStr, weight);
                if (table && table.maxRadius !== null) {
                    // 最大作業半径での揚程を取得
                    var heightAtMax = 0;
                    for (var r = 0; r < table.rows.length; r++) {
                        if (table.rows[r].radius === table.maxRadius) {
                            heightAtMax = table.rows[r].height;
                            break;
                        }
                    }

                    results.push({
                        jibLen: jibLenStr,
                        boomLen: boomLenStr,
                        offset: offsetStr,
                        offsetLabel: JIB_OFFSET_LABELS[offsetStr],
                        maxRadius: table.maxRadius,
                        loadAtMax: table.loadAtMax,
                        heightAtMax: heightAtMax,
                        table: table
                    });
                }
            }
        }
    }

    // 最大作業半径順にソート
    results.sort(function(a, b) { return b.maxRadius - a.maxRadius; });

    return results;
}

// 最大揚程を持つ組合せを検索
function findMaxHeightCombination(mode, weight) {
    var results = searchAllJibCombinations(mode, weight);

    var best = null;
    var bestHeight = 0;

    for (var i = 0; i < results.length; i++) {
        var res = results[i];
        // この組合せの中で最も高い揚程（吊れる範囲内）を見つける
        for (var r = 0; r < res.table.rows.length; r++) {
            var row = res.table.rows[r];
            if (row.canLift && row.height > bestHeight) {
                bestHeight = row.height;
                best = {
                    jibLen: res.jibLen,
                    boomLen: res.boomLen,
                    offset: res.offset,
                    radius: row.radius,
                    load: row.load,
                    height: row.height
                };
            }
        }
    }

    return best;
}
