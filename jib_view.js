// GR-1000N ジブ側面図 Canvas描画

function drawCraneSideView(canvasId, boomLenStr, jibLenStr, offsetStr, highlightRadius, weight) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var dpr = window.devicePixelRatio || 1;

    // High DPI対応
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    W = canvas.width;
    H = canvas.height;
    ctx.scale(dpr, dpr);
    var drawW = canvas.offsetWidth;
    var drawH = canvas.offsetHeight;

    // クリア
    ctx.clearRect(0, 0, drawW, drawH);

    // 背景
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, drawW, drawH);

    // パラメータ
    var boomLen = parseBoomLength(boomLenStr);
    var jibLen = parseJibLength(jibLenStr);
    var offsetDeg = parseFloat(offsetStr);

    // 表示するブーム角度を求める
    var boomAngleRad;
    if (highlightRadius !== null) {
        boomAngleRad = calcBoomAngleFromRadius(highlightRadius, boomLen, jibLen, offsetDeg);
    } else {
        boomAngleRad = 70 * Math.PI / 180; // デフォルト70°
    }
    var boomAngleDeg = boomAngleRad * 180 / Math.PI;
    var offsetRad = offsetDeg * Math.PI / 180;

    // 揚程と作業半径を計算
    var currentHeight = calcHeight(boomAngleRad, boomLen, jibLen, offsetDeg);
    var currentRadius = boomLen * Math.cos(boomAngleRad) + jibLen * Math.cos(boomAngleRad - offsetRad) + 1.5;

    // スケール計算
    var maxDim = Math.max(boomLen + jibLen + 5, currentHeight + 5, currentRadius + 5);
    var margin = 40;
    var scaleX = (drawW - margin * 2) / (maxDim * 1.1);
    var scaleY = (drawH - margin * 2) / (maxDim * 0.85);
    var scale = Math.min(scaleX, scaleY);

    // 原点(ブーム根元) をキャンバス座標に変換
    var originX = margin + 20;
    var originY = drawH - margin - 10;
    var pivotH = BOOM_PIVOT_HEIGHT;

    function toCanvasX(realX) { return originX + realX * scale; }
    function toCanvasY(realY) { return originY - realY * scale; }

    // --- 地面 ---
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(drawW, originY);
    ctx.stroke();

    // 地面パターン
    ctx.strokeStyle = '#a1887f';
    ctx.lineWidth = 1;
    for (var i = 0; i < drawW; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, originY);
        ctx.lineTo(i - 5, originY + 8);
        ctx.stroke();
    }

    // --- クレーン本体（簡略） ---
    var bodyW = 4.0 * scale;
    var bodyH = 2.0 * scale;
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(originX - bodyW * 0.3, originY - bodyH, bodyW, bodyH);

    // タイヤ
    ctx.fillStyle = '#333';
    var tireR = 0.6 * scale;
    ctx.beginPath();
    ctx.arc(originX - bodyW * 0.1, originY, tireR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(originX + bodyW * 0.5, originY, tireR, 0, Math.PI * 2);
    ctx.fill();

    // --- ブーム根元 ---
    var pivotX = toCanvasX(1.5);
    var pivotY = toCanvasY(pivotH);

    // --- ブーム ---
    var boomTipX_real = 1.5 + boomLen * Math.cos(boomAngleRad);
    var boomTipY_real = pivotH + boomLen * Math.sin(boomAngleRad);
    var boomTipX = toCanvasX(boomTipX_real);
    var boomTipY = toCanvasY(boomTipY_real);

    // ブーム本体
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = Math.max(4, 6 * scale / 50);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(boomTipX, boomTipY);
    ctx.stroke();

    // --- ジブ ---
    var jibAngle = boomAngleRad - offsetRad;
    var jibTipX_real = boomTipX_real + jibLen * Math.cos(jibAngle);
    var jibTipY_real = boomTipY_real + jibLen * Math.sin(jibAngle);
    var jibTipX = toCanvasX(jibTipX_real);
    var jibTipY = toCanvasY(jibTipY_real);

    // ジブ本体
    ctx.strokeStyle = '#ff6f00';
    ctx.lineWidth = Math.max(3, 4 * scale / 50);
    ctx.beginPath();
    ctx.moveTo(boomTipX, boomTipY);
    ctx.lineTo(jibTipX, jibTipY);
    ctx.stroke();

    // --- ワイヤロープ（吊り下げ）---
    var hookLen = Math.min(jibTipY_real * 0.15, 3);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(jibTipX, jibTipY);
    ctx.lineTo(jibTipX, jibTipY + hookLen * scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // フック
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(jibTipX, jibTipY + hookLen * scale + 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- テンションロッド（ジブ支持ワイヤ）---
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boomTipX, boomTipY - 5);
    ctx.lineTo(jibTipX, jibTipY - 3);
    ctx.stroke();

    // --- 寸法線 ---
    // 作業半径
    var radiusEndX = toCanvasX(currentRadius);
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(originX, originY + 20);
    ctx.lineTo(radiusEndX, originY + 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 作業半径矢印
    drawArrow(ctx, originX, originY + 20, radiusEndX, originY + 20, '#e65100');

    ctx.fillStyle = '#e65100';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('作業半径 ' + currentRadius.toFixed(1) + 'm', (originX + radiusEndX) / 2, originY + 35);

    // 揚程（縦）
    var heightTopY = toCanvasY(currentHeight);
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(radiusEndX + 15, originY);
    ctx.lineTo(radiusEndX + 15, heightTopY);
    ctx.stroke();
    ctx.setLineDash([]);

    drawArrow(ctx, radiusEndX + 15, originY, radiusEndX + 15, heightTopY, '#2e7d32');

    ctx.fillStyle = '#2e7d32';
    ctx.save();
    ctx.translate(radiusEndX + 30, (originY + heightTopY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('揚程 ' + currentHeight.toFixed(1) + 'm', 0, 0);
    ctx.restore();

    // --- 揚程の水平線 ---
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(jibTipX, jibTipY);
    ctx.lineTo(radiusEndX + 15, heightTopY);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- ラベル ---
    // ブーム長さラベル
    var boomMidX = (pivotX + boomTipX) / 2 - 15;
    var boomMidY = (pivotY + boomTipY) / 2 - 8;
    ctx.fillStyle = '#1565c0';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ブーム ' + boomLenStr, boomMidX, boomMidY);

    // ジブ長さラベル
    var jibMidX = (boomTipX + jibTipX) / 2 + 15;
    var jibMidY = (boomTipY + jibTipY) / 2 - 8;
    ctx.fillStyle = '#ff6f00';
    ctx.fillText('ジブ ' + jibLenStr, jibMidX, jibMidY);

    // ブーム角度
    ctx.fillStyle = '#555';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('起伏角 ' + boomAngleDeg.toFixed(1) + '°', pivotX + 10, pivotY + 15);

    // オフセット角度
    ctx.fillText('オフセット ' + offsetStr + '°', boomTipX + 5, boomTipY + 15);

    // 重量表示（あれば）
    if (weight !== null) {
        ctx.fillStyle = '#c62828';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(weight + 't', jibTipX, jibTipY + hookLen * scale + 20);
    }

    // --- ブーム接合点マーク ---
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(boomTipX, boomTipY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- ジブ先端マーク ---
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.arc(jibTipX, jibTipY, 3, 0, Math.PI * 2);
    ctx.fill();
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;

    // 矢印の頭
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var headLen = 6;

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}
