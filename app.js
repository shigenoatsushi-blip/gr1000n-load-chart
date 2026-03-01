// GR-1000N 定格総荷重検索アプリ メインロジック

var currentMode = "sc1_4t";
var lastResults = null;

// Mode selector
document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
    });
});

// Quick weight buttons
document.querySelectorAll('.quick-weight').forEach(function (btn) {
    if (btn.classList.contains('quick-radius')) return; // 半径ボタンはスキップ
    btn.addEventListener('click', function () {
        var w = btn.getAttribute('data-weight');
        document.getElementById('weightInput').value = w;
        document.querySelectorAll('.quick-weight').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        search();
    });
});

// Enter key triggers search
document.getElementById('weightInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        search();
    }
});

// Main search function
function search() {
    var weightStr = document.getElementById('weightInput').value;
    var weight = parseFloat(weightStr);

    if (isNaN(weight) || weight <= 0) {
        alert('荷重を入力してください');
        return;
    }

    var modeData = LOAD_DATA[currentMode];
    if (!modeData) return;

    var results = [];

    // IDごとに最大作業半径を検索
    for (var i = 0; i < ID_ORDER.length; i++) {
        var id = ID_ORDER[i];
        var radiusData = modeData[id];
        if (!radiusData) continue;

        var blockInfo = BLOCK_ID_MAP[id];
        if (!blockInfo) continue;

        var radii = Object.keys(radiusData).map(Number).sort(function (a, b) { return a - b; });

        var maxRadius = null;
        var loadAtMaxRadius = null;
        var allRadiusInfo = [];

        for (var j = 0; j < radii.length; j++) {
            var r = radii[j];
            var load = radiusData[r];
            var canLift = load >= weight;

            allRadiusInfo.push({
                radius: r,
                load: load,
                canLift: canLift
            });

            if (canLift) {
                maxRadius = r;
                loadAtMaxRadius = load;
            }
        }

        if (maxRadius !== null) {
            results.push({
                id: id,
                boomLength: blockInfo.length,
                boomLabel: blockInfo.length + ' (ID' + id + ')',
                maxRadius: maxRadius,
                loadAtMaxRadius: loadAtMaxRadius,
                allRadii: allRadiusInfo
            });
        }
    }

    lastResults = results;
    displayResults(weight, results);
}

function displayResults(weight, results) {
    var card = document.getElementById('resultsCard');
    var detailCard = document.getElementById('detailCard');
    var header = document.getElementById('resultsHeader');
    var summary = document.getElementById('resultsSummary');
    var tbody = document.getElementById('resultsBody');

    card.classList.remove('hidden');

    header.textContent = weight + 't の検索結果 (' + MODE_LABELS[currentMode] + ')';

    if (results.length === 0) {
        summary.innerHTML = '<div class="no-result">' + weight + 't を吊れるブーム長さ・作業半径の組み合わせがありません。</div>';
        tbody.innerHTML = '';
        detailCard.classList.add('hidden');
        return;
    }

    // Find the best (longest radius)
    var best = results[0];
    for (var i = 1; i < results.length; i++) {
        if (results[i].maxRadius > best.maxRadius) {
            best = results[i];
        }
    }

    summary.innerHTML = '<div class="result-summary">' +
        weight + 't を最も遠くまで運べる組合せ: ブーム ' + best.boomLabel +
        ' → 最大 ' + best.maxRadius + 'm' +
        ' (定格 ' + best.loadAtMaxRadius + 't)' +
        '</div>';

    // Build table - sorted by max radius descending, then load descending
    var sorted = results.slice().sort(function (a, b) {
        if (b.maxRadius !== a.maxRadius) {
            return b.maxRadius - a.maxRadius;
        }
        return b.loadAtMaxRadius - a.loadAtMaxRadius;
    });

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        var isBest = (r.id === best.id);
        html += '<tr class="' + (isBest ? 'highlight' : '') + '" onclick="showDetail(' + r.id + ')">' +
            '<td class="boom-col">' + r.boomLength + '</td>' +
            '<td style="font-weight: 700; color: var(--accent); font-size: 14px;">ID ' + r.id + '</td>' +
            '<td class="radius-col">' + r.maxRadius + ' m</td>' +
            '<td class="load-col">' + r.loadAtMaxRadius + ' t</td>' +
            '</tr>';
    }
    tbody.innerHTML = html;

    // Show detail for the best boom by default
    buildDetailTabs(results);
    showDetail(best.id);

    // Scroll to results
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildDetailTabs(results) {
    var tabsEl = document.getElementById('detailTabs');
    var sorted = results.slice().sort(function (a, b) {
        if (b.maxRadius !== a.maxRadius) {
            return b.maxRadius - a.maxRadius;
        }
        return b.loadAtMaxRadius - a.loadAtMaxRadius;
    });

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        html += '<button class="tab" data-id="' + r.id + '" onclick="showDetail(' + r.id + ')">' +
            r.boomLabel + '</button>';
    }
    tabsEl.innerHTML = html;
}

function showDetail(id) {
    if (!lastResults) return;

    var detailCard = document.getElementById('detailCard');
    detailCard.classList.remove('hidden');

    // Update tabs
    document.querySelectorAll('#detailTabs .tab').forEach(function (t) {
        t.classList.toggle('active', parseInt(t.getAttribute('data-id')) === id);
    });

    // Find result
    var result = null;
    for (var i = 0; i < lastResults.length; i++) {
        if (lastResults[i].id === id) {
            result = lastResults[i];
            break;
        }
    }
    if (!result) return;

    var contentEl = document.getElementById('detailContent');
    var weight = parseFloat(document.getElementById('weightInput').value);
    var blockInfo = BLOCK_ID_MAP[id];

    var html = '<div class="detail-boom-header">ブーム ' + result.boomLength + ' (ブロックID ' + id + ' / ' + (blockInfo ? blockInfo.description : '') + ') の全作業半径</div>';
    html += '<table class="detail-table"><thead><tr>' +
        '<th>作業半径(m)</th><th>定格総荷重(t)</th><th>判定</th>' +
        '</tr></thead><tbody>';

    for (var i = 0; i < result.allRadii.length; i++) {
        var info = result.allRadii[i];
        var isMax = (info.radius === result.maxRadius && info.canLift);
        var cls = '';
        var status = '';

        if (isMax) {
            cls = 'max-radius';
            status = '← 最大';
        } else if (info.canLift) {
            cls = 'can-lift';
            status = 'OK';
        } else {
            cls = 'cannot-lift';
            status = 'NG';
        }

        html += '<tr class="' + cls + '">' +
            '<td>' + info.radius + '</td>' +
            '<td>' + info.load + '</td>' +
            '<td>' + status + '</td>' +
            '</tr>';
    }

    html += '</tbody></table>';
    contentEl.innerHTML = html;
}

// ============================================================
// ブロックID検索機能
// ============================================================

function searchBlockId() {
    var input = document.getElementById('blockIdInput');
    var blockId = parseInt(input.value);
    var resultDiv = document.getElementById('blockIdResult');
    var resultText = document.getElementById('blockIdResultText');

    if (isNaN(blockId) || blockId < 1 || blockId > 29) {
        alert('ブロックIDを1〜29の範囲で入力してください');
        return;
    }

    var blockInfo = getBlockInfo(blockId);

    if (blockInfo) {
        resultDiv.classList.remove('hidden');
        resultText.innerHTML =
            '<div style="font-size: 16px; margin-bottom: 4px;"><strong>ブロックID ' + blockId + '</strong></div>' +
            '<div style="font-size: 18px; font-weight: 700; color: #0d47a1;">ブーム長さ: ' + blockInfo.length + '</div>' +
            '<div style="font-size: 12px; margin-top: 4px; opacity: 0.8;">' + blockInfo.description + '</div>';
    } else {
        resultDiv.classList.remove('hidden');
        resultText.innerHTML =
            '<div style="color: var(--danger);"><strong>ブロックID ' + blockId + '</strong> は登録されていません</div>';
    }

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleBlockIdTable() {
    var tableDiv = document.getElementById('blockIdTable');
    var btnText = document.getElementById('toggleBtnText');

    blockIdTableVisible = !blockIdTableVisible;

    if (blockIdTableVisible) {
        tableDiv.classList.remove('hidden');
        btnText.textContent = '▲ 一覧表を非表示';
        generateBlockIdTable();
        tableDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        tableDiv.classList.add('hidden');
        btnText.textContent = '▼ 一覧表を表示';
    }
}

var blockIdTableVisible = false;

function generateBlockIdTable() {
    var tbody = document.getElementById('blockIdTableBody');
    var html = '';

    for (var id = 1; id <= 29; id++) {
        var blockInfo = getBlockInfo(id);
        var hasData = false;
        for (var mode in LOAD_DATA) {
            if (LOAD_DATA[mode][id]) { hasData = true; break; }
        }
        if (blockInfo) {
            html += '<tr>' +
                '<td style="font-weight: 700; color: var(--primary);">ID ' + id + '</td>' +
                '<td style="font-weight: 700; color: var(--success);">' + blockInfo.length + '</td>' +
                '<td style="font-size: 11px; color: var(--text-secondary);">' + blockInfo.description +
                (hasData ? '' : ' <span style="color:var(--warning);">※データ未登録</span>') + '</td>' +
                '</tr>';
        }
    }

    tbody.innerHTML = html;
}

// Enter key triggers block ID search
document.getElementById('blockIdInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchBlockId();
    }
});

// ============================================================
// 作業半径から定格総荷重を検索する機能
// ============================================================

// Quick radius buttons
document.querySelectorAll('.quick-radius').forEach(function (btn) {
    btn.addEventListener('click', function () {
        var r = btn.getAttribute('data-radius');
        document.getElementById('radiusInput').value = r;
        document.querySelectorAll('.quick-radius').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        searchByRadius();
    });
});

// Enter key triggers radius search
document.getElementById('radiusInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchByRadius();
    }
});

function searchByRadius() {
    var radiusStr = document.getElementById('radiusInput').value;
    var radius = parseFloat(radiusStr);

    if (isNaN(radius) || radius <= 0) {
        alert('作業半径を入力してください');
        return;
    }

    var modeData = LOAD_DATA[currentMode];
    if (!modeData) return;

    var results = [];

    for (var i = 0; i < ID_ORDER.length; i++) {
        var id = ID_ORDER[i];
        var radiusData = modeData[id];
        if (!radiusData) continue;

        var blockInfo = BLOCK_ID_MAP[id];
        if (!blockInfo) continue;

        var radii = Object.keys(radiusData).map(Number).sort(function (a, b) { return a - b; });

        var matchedRadius = null;
        for (var j = 0; j < radii.length; j++) {
            if (radii[j] === radius) {
                matchedRadius = radii[j];
                break;
            } else if (radii[j] > radius) {
                // 入力半径を超えたら、その1つ前（直近の小さい値）を採用する
                if (j > 0) {
                    matchedRadius = radii[j - 1];
                }
                break;
            }
        }
        // 全てのデータが入力半径より小さい場合は、最大の半径を採用
        if (matchedRadius === null && radii.length > 0 && radii[radii.length - 1] < radius) {
            matchedRadius = radii[radii.length - 1];
        }

        if (matchedRadius !== null) {
            results.push({
                id: id,
                boomLength: blockInfo.length,
                boomLabel: blockInfo.length + ' (ID' + id + ')',
                matchedRadius: matchedRadius,
                load: radiusData[matchedRadius],
                description: blockInfo.description
            });
        }
    }

    displayRadiusResults(radius, results);
}

function displayRadiusResults(radius, results) {
    var card = document.getElementById('radiusResultsCard');
    var header = document.getElementById('radiusResultsHeader');
    var summary = document.getElementById('radiusResultsSummary');
    var tbody = document.getElementById('radiusResultsBody');

    card.classList.remove('hidden');

    header.textContent = '作業半径 ' + radius + 'm の検索結果 (' + MODE_LABELS[currentMode] + ')';

    if (results.length === 0) {
        summary.innerHTML = '<div class="no-result">作業半径 ' + radius + 'm のデータが登録されているIDがありません。</div>';
        tbody.innerHTML = '';
        return;
    }

    // 定格総荷重の降順でソート
    var sorted = results.slice().sort(function (a, b) {
        return b.load - a.load;
    });

    // 最大荷重のものをハイライト
    var best = sorted[0];

    summary.innerHTML = '<div class="result-summary">' +
        '作業半径 ' + radius + 'm で最大荷重: ブーム ' + best.boomLabel +
        ' → ' + best.load + 't' +
        '</div>';

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        var isBest = (r.id === best.id);

        // 入力半径と一致しない場合（補完された場合）、使用した半径を表示
        var radiusNote = '';
        if (r.matchedRadius !== radius) {
            radiusNote = '<div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">(' + r.matchedRadius + 'mの値)</div>';
        }

        html += '<tr class="' + (isBest ? 'highlight' : '') + '">' +
            '<td class="boom-col">' + r.boomLength + '</td>' +
            '<td style="font-weight: 700; color: var(--accent); font-size: 14px;">ID ' + r.id + '</td>' +
            '<td><span style="font-weight: 700; color: var(--success); font-size: 15px;">' + r.load + ' t</span>' + radiusNote + '</td>' +
            '</tr>';
    }
    tbody.innerHTML = html;

    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
