/**
 * GR-1000N 定格総荷重検索 - ペイウォール管理
 *
 * 【Stripe設定手順】
 * 1. Stripeダッシュボード → Payment Links → 該当リンクを選択
 * 2. 「支払い後」→「ウェブサイトにリダイレクト」を選択
 * 3. リダイレクトURLを以下に設定:
 *    https://shigenoatsushi-blip.github.io/gr1000n-load-chart/?purchased=success
 * 4. 下記 STRIPE_PAYMENT_LINK を実際のURLに書き換える
 */

(function () {
  // ====================================================
  // 設定値（ここを書き換えてください）
  // ====================================================
  var STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_14A4gz8xDgmbfrx7iR53O00'; // Stripeテストモード用URL
  var PRICE_LABEL = '1,480円';
  var TRIAL_DAYS = 7;

  // ---- テストモード設定 ----
  // TEST_MODE = true のとき：日数のかわりに分単位でトライアルを計測（動作確認用）
  // 本番リリース前に false に戻すこと
  var TEST_MODE = true;
  var TRIAL_MINUTES = 3; // テスト時のトライアル時間（分）
  // ====================================================

  var KEY_TRIAL_START = 'gr1000n_trial_start';
  var KEY_PURCHASED = 'gr1000n_purchased';

  /** 購入済みかどうかを返す */
  function isPurchased() {
    return localStorage.getItem(KEY_PURCHASED) === 'true';
  }

  /** トライアル開始日を初期化（初回訪問時のみ） */
  function initTrial() {
    if (!localStorage.getItem(KEY_TRIAL_START)) {
      localStorage.setItem(KEY_TRIAL_START, String(Date.now()));
    }
  }

  /** トライアル残り時間を返す（0以下なら期限切れ）
   *  TEST_MODE時は「残り分数」、本番時は「残り日数」を返す */
  function getTrialDaysRemaining() {
    var start = parseInt(localStorage.getItem(KEY_TRIAL_START) || '0', 10);
    if (TEST_MODE) {
      if (!start) return TRIAL_MINUTES;
      var elapsed = Date.now() - start;
      var minutesElapsed = Math.floor(elapsed / (1000 * 60));
      return Math.max(0, TRIAL_MINUTES - minutesElapsed);
    }
    if (!start) return TRIAL_DAYS;
    var elapsed = Date.now() - start;
    var daysElapsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    return Math.max(0, TRIAL_DAYS - daysElapsed);
  }

  /** URLパラメータ ?purchased=success を検出して購入フラグを保存 */
  function handlePurchaseRedirect() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('purchased') === 'success') {
        localStorage.setItem(KEY_PURCHASED, 'true');
        // URLからパラメータを除去（ブラウザ履歴を汚さない）
        var clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', clean);
        showPurchasedToast();
        return true;
      }
    } catch (e) {}
    return false;
  }

  /** 購入完了トースト通知を表示 */
  function showPurchasedToast() {
    var toast = document.createElement('div');
    toast.id = 'paywall-toast';
    toast.textContent = '✓ ご購入ありがとうございます！すべての機能が有効になりました。';
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 5000);
  }

  /** トライアル残り日数バナーを表示 */
  function showTrialBanner(daysRemaining) {
    var banner = document.createElement('div');
    banner.id = 'paywall-trial-banner';

    var urgentClass = daysRemaining <= 2 ? ' paywall-urgent' : '';
    var unit = TEST_MODE ? '分' : '日';
    var dayText = daysRemaining === 0 ? '本日まで' : '残り' + daysRemaining + unit;

    banner.innerHTML =
      '<span class="paywall-trial-text' + urgentClass + '">' +
      '🆓 無料トライアル ' + dayText +
      '</span>' +
      '<a class="paywall-trial-btn" href="' + STRIPE_PAYMENT_LINK + '">' +
      '今すぐ購入（' + PRICE_LABEL + '）' +
      '</a>' +
      '<button class="paywall-trial-close" aria-label="閉じる">×</button>';

    document.body.prepend(banner);

    banner.querySelector('.paywall-trial-close').addEventListener('click', function () {
      banner.remove();
    });
  }

  /** ペイウォールオーバーレイを表示（トライアル期限切れ） */
  function showPaywall() {
    var overlay = document.createElement('div');
    overlay.id = 'paywall-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'paywall-title');

    overlay.innerHTML =
      '<div class="paywall-box">' +
      '<div class="paywall-icon" aria-hidden="true">🏗</div>' +
      '<h2 id="paywall-title">無料トライアル期間が終了しました</h2>' +
      '<p>' + (TEST_MODE ? TRIAL_MINUTES + '分間' : TRIAL_DAYS + '日間') + 'の無料トライアルをご利用いただき、ありがとうございます。</p>' +
      '<div class="paywall-price-block">' +
      '<div class="paywall-price-label">買い切り</div>' +
      '<div class="paywall-price">' + PRICE_LABEL + '</div>' +
      '<div class="paywall-price-note">一度購入すると永久にご利用いただけます</div>' +
      '</div>' +
      '<a class="paywall-btn" href="' + STRIPE_PAYMENT_LINK + '">' +
      '購入する（' + PRICE_LABEL + '）' +
      '</a>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  /** スタイルを挿入 */
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      /* ---- トライアルバナー ---- */
      '#paywall-trial-banner {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 12px;',
      '  padding: 8px 16px;',
      '  background: #e8f5e9;',
      '  border-bottom: 1px solid #a5d6a7;',
      '  font-size: 13px;',
      '  flex-wrap: wrap;',
      '}',
      '.paywall-trial-text { flex: 1; color: #2e7d32; font-weight: 500; }',
      '.paywall-trial-text.paywall-urgent { color: #b71c1c; }',
      '.paywall-trial-btn {',
      '  display: inline-block;',
      '  background: #635bff;',
      '  color: #fff !important;',
      '  text-decoration: none;',
      '  padding: 6px 14px;',
      '  border-radius: 6px;',
      '  font-size: 13px;',
      '  font-weight: bold;',
      '  white-space: nowrap;',
      '}',
      '.paywall-trial-close {',
      '  background: none;',
      '  border: none;',
      '  font-size: 18px;',
      '  cursor: pointer;',
      '  color: #666;',
      '  padding: 0 4px;',
      '  line-height: 1;',
      '}',

      /* ---- ペイウォールオーバーレイ ---- */
      '#paywall-overlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  background: rgba(0, 0, 20, 0.88);',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  z-index: 9999;',
      '  padding: 20px;',
      '}',
      '.paywall-box {',
      '  background: #fff;',
      '  border-radius: 16px;',
      '  padding: 40px 32px;',
      '  max-width: 380px;',
      '  width: 100%;',
      '  text-align: center;',
      '  box-shadow: 0 24px 64px rgba(0,0,0,0.4);',
      '}',
      '.paywall-icon { font-size: 48px; margin-bottom: 16px; }',
      '.paywall-box h2 {',
      '  font-size: 19px;',
      '  margin: 0 0 12px;',
      '  color: #1a237e;',
      '  line-height: 1.4;',
      '}',
      '.paywall-box > p {',
      '  color: #555;',
      '  line-height: 1.7;',
      '  font-size: 14px;',
      '  margin: 0 0 20px;',
      '}',
      '.paywall-price-block {',
      '  background: #f5f5f5;',
      '  border-radius: 10px;',
      '  padding: 16px;',
      '  margin: 0 0 24px;',
      '}',
      '.paywall-price-label { font-size: 12px; color: #888; margin-bottom: 4px; }',
      '.paywall-price { font-size: 32px; font-weight: bold; color: #1a237e; }',
      '.paywall-price-note { font-size: 12px; color: #888; margin-top: 4px; }',
      '.paywall-btn {',
      '  display: block;',
      '  background: #635bff;',
      '  color: #fff !important;',
      '  text-decoration: none;',
      '  padding: 16px 24px;',
      '  border-radius: 10px;',
      '  font-size: 16px;',
      '  font-weight: bold;',
      '  transition: background 0.2s;',
      '}',
      '.paywall-btn:hover { background: #4f49d0; }',

      /* ---- 購入完了トースト ---- */
      '#paywall-toast {',
      '  position: fixed;',
      '  bottom: 24px;',
      '  left: 50%;',
      '  transform: translateX(-50%);',
      '  background: #2e7d32;',
      '  color: #fff;',
      '  padding: 14px 24px;',
      '  border-radius: 10px;',
      '  font-size: 14px;',
      '  box-shadow: 0 4px 20px rgba(0,0,0,0.25);',
      '  z-index: 10000;',
      '  white-space: nowrap;',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  /** メイン処理 */
  function init() {
    injectStyles();

    // 購入リダイレクト処理（?purchased=success）
    var justPurchased = handlePurchaseRedirect();
    if (justPurchased || isPurchased()) return; // 購入済みなら制限なし

    // トライアル開始日を記録
    initTrial();

    var daysRemaining = getTrialDaysRemaining();

    if (daysRemaining <= 0) {
      // トライアル期限切れ → ペイウォール表示
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showPaywall);
      } else {
        showPaywall();
      }
    } else {
      // トライアル中 → バナーを表示
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          showTrialBanner(daysRemaining);
        });
      } else {
        showTrialBanner(daysRemaining);
      }
    }
  }

  init();
})();
