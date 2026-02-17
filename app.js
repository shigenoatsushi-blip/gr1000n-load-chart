// GR-1000N 定格総荷重検索アプリ メインロジック

var currentMode = "sc1_4t";
var lastResults = null;

// Mode selector
document.querySelectorAll('.mode-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
    });
});

// Quick weight buttons
document.querySelectorAll('.quick-weight').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var w = btn.getAttribute('data-weight');
        document.getElementById('weightInput').value = w;
        document.querySelectorAll('.quick-weight').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        search();
    });
});

// Enter key triggers search
document.getElementById('weightInput').addEventListener('keydown', function(e) {
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

    var data = LOAD_DATA[currentMode];
    if (!data) return;

    var results = [];

    // For each boom length, find the maximum working radius where rated load >= input weight
    for (var i = 0; i < BOOM_ORDER.length; i++) {
        var boomKey = BOOM_ORDER[i];
        if (!data[boomKey]) continue;

        var radiusData = data[boomKey];
        var radii = Object.keys(radiusData).map(Number).sort(function(a, b) { return a - b; });

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
                boom: boomKey,
                boomLabel: BOOM_LABELS[boomKey],
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

    // Build table - sorted by max radius descending
    var sorted = results.slice().sort(function(a, b) { return b.maxRadius - a.maxRadius; });

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        var isBest = (r.boom === best.boom && r.maxRadius === best.maxRadius);
        html += '<tr class="' + (isBest ? 'highlight' : '') + '" onclick="showDetail(\'' + r.boom + '\')">' +
            '<td class="boom-col">' + r.boomLabel + '</td>' +
            '<td class="radius-col">' + r.maxRadius + ' m</td>' +
            '<td class="load-col">' + r.loadAtMaxRadius + ' t</td>' +
            '</tr>';
    }
    tbody.innerHTML = html;

    // Show detail for the best boom by default
    buildDetailTabs(results);
    showDetail(best.boom);

    // Scroll to results
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildDetailTabs(results) {
    var tabsEl = document.getElementById('detailTabs');
    var sorted = results.slice().sort(function(a, b) { return b.maxRadius - a.maxRadius; });

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        html += '<button class="tab" data-boom="' + r.boom + '" onclick="showDetail(\'' + r.boom + '\')">' +
            r.boomLabel + '</button>';
    }
    tabsEl.innerHTML = html;
}

function showDetail(boomKey) {
    if (!lastResults) return;

    var detailCard = document.getElementById('detailCard');
    detailCard.classList.remove('hidden');

    // Update tabs
    document.querySelectorAll('#detailTabs .tab').forEach(function(t) {
        t.classList.toggle('active', t.getAttribute('data-boom') === boomKey);
    });

    // Find result
    var result = null;
    for (var i = 0; i < lastResults.length; i++) {
        if (lastResults[i].boom === boomKey) {
            result = lastResults[i];
            break;
        }
    }
    if (!result) return;

    var contentEl = document.getElementById('detailContent');
    var weight = parseFloat(document.getElementById('weightInput').value);

    var html = '<div class="detail-boom-header">ブーム ' + result.boomLabel + ' の全作業半径</div>';
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
