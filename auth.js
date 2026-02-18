/**
 * GR-1000N 定格総荷重検索 - Supabase 認証モジュール
 *
 * 【Supabase セットアップ手順】
 *
 * 1. https://supabase.com にアクセスして「Start your project」でプロジェクトを作成
 *
 * 2. ダッシュボード → Settings → API から以下の2つをコピー:
 *    - Project URL  → 下の SUPABASE_URL に貼り付け
 *    - anon public  → 下の SUPABASE_ANON_KEY に貼り付け
 *
 * 3. Authentication → Configuration → Auth Providers → Email
 *    「Confirm email」を OFF にする（登録直後にそのまま使えるようにする）
 *
 * 4. SQL Editor を開いて、以下のSQLを実行して顧客情報テーブルを作成:
 *
 *    create table public.profiles (
 *      id uuid references auth.users on delete cascade primary key,
 *      name text not null,
 *      company text,
 *      phone text,
 *      created_at timestamptz default now()
 *    );
 *    alter table public.profiles enable row level security;
 *    create policy "自分のプロフィールのみ参照可"
 *      on public.profiles for select using (auth.uid() = id);
 *    create policy "自分のプロフィールのみ登録可"
 *      on public.profiles for insert with check (auth.uid() = id);
 *    create policy "自分のプロフィールのみ更新可"
 *      on public.profiles for update using (auth.uid() = id);
 *
 * 5. 上の手順が完了したら、下記の設定値を書き換えてください
 */

(function () {
  // ====================================================
  // 設定値（ここを書き換えてください）
  // ====================================================
  var SUPABASE_URL = 'https://XXXXXXXXXXXXXXXX.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.XXXXXXXXXX';
  // ====================================================

  // 未設定チェック（設定前はログイン不要でアプリが使えるようにする）
  var CONFIGURED = (
    SUPABASE_URL.indexOf('XXXXXXXXXXXXXXXX') === -1 &&
    SUPABASE_ANON_KEY.indexOf('XXXXXXXXXX') === -1
  );

  var _client = null;

  function getClient() {
    if (!_client) {
      _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _client;
  }

  // 他のスクリプト（paywall.js など）から参照できるよう公開
  // 使用例: window._supabase.auth.getSession()
  if (CONFIGURED) {
    window._supabase = getClient();
  }

  // ============================================================
  // スタイル
  // ============================================================
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = [
      '#auth-overlay {',
      '  position: fixed; inset: 0;',
      '  background: rgba(0, 0, 20, 0.88);',
      '  display: flex; align-items: center; justify-content: center;',
      '  z-index: 9998; padding: 20px;',
      '}',
      '#auth-box {',
      '  background: #fff; border-radius: 16px;',
      '  padding: 32px 28px; max-width: 400px; width: 100%;',
      '  box-shadow: 0 24px 64px rgba(0,0,0,0.4);',
      '  max-height: 90vh; overflow-y: auto;',
      '}',
      '.auth-logo { text-align: center; font-size: 36px; margin-bottom: 8px; }',
      '.auth-title {',
      '  text-align: center; font-size: 17px; font-weight: 700;',
      '  color: #1a237e; margin-bottom: 4px;',
      '}',
      '.auth-subtitle {',
      '  text-align: center; font-size: 12px; color: #888;',
      '  margin-bottom: 20px; line-height: 1.5;',
      '}',
      '.auth-tabs {',
      '  display: flex; border-bottom: 2px solid #e0e0e0;',
      '  margin-bottom: 20px;',
      '}',
      '.auth-tab {',
      '  flex: 1; padding: 10px; text-align: center;',
      '  font-size: 14px; font-weight: 600; color: #888;',
      '  border: none; background: none; cursor: pointer;',
      '  border-bottom: 3px solid transparent; margin-bottom: -2px;',
      '  transition: color 0.2s;',
      '}',
      '.auth-tab.active { color: #1a237e; border-bottom-color: #1a237e; }',
      '.auth-field { margin-bottom: 14px; }',
      '.auth-field label {',
      '  display: block; font-size: 12px; font-weight: 600;',
      '  color: #555; margin-bottom: 5px;',
      '}',
      '.auth-optional { font-weight: 400; color: #aaa; font-size: 11px; }',
      '.auth-field input {',
      '  width: 100%; height: 46px;',
      '  border: 2px solid #e0e0e0; border-radius: 10px;',
      '  padding: 0 14px; font-size: 16px;',
      '  outline: none; transition: border-color 0.2s;',
      '  -webkit-appearance: none;',
      '}',
      '.auth-field input:focus { border-color: #1a237e; }',
      '.auth-hint { font-size: 11px; color: #aaa; margin-top: 4px; }',
      '.auth-btn {',
      '  width: 100%; height: 50px;',
      '  background: linear-gradient(135deg, #1a237e, #3949ab);',
      '  color: #fff; border: none; border-radius: 12px;',
      '  font-size: 16px; font-weight: 700; cursor: pointer;',
      '  margin-top: 8px; transition: opacity 0.2s; letter-spacing: 0.5px;',
      '}',
      '.auth-btn:active { opacity: 0.85; }',
      '.auth-btn:disabled { background: #bbb; cursor: not-allowed; }',
      '.auth-error {',
      '  background: #ffebee; color: #c62828;',
      '  border-radius: 8px; padding: 10px 14px;',
      '  font-size: 13px; margin-bottom: 14px;',
      '  display: none; line-height: 1.5;',
      '}',
      '.auth-error.visible { display: block; }',
      '.auth-success {',
      '  background: #e8f5e9; color: #2e7d32;',
      '  border-radius: 8px; padding: 10px 14px;',
      '  font-size: 13px; margin-bottom: 14px;',
      '  display: none; line-height: 1.5;',
      '}',
      '.auth-success.visible { display: block; }',
      '.auth-divider {',
      '  text-align: center; font-size: 11px; color: #ccc;',
      '  margin: 16px 0 0;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ============================================================
  // モーダル作成
  // ============================================================
  function createModal() {
    var overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'auth-title-text');

    overlay.innerHTML = [
      '<div id="auth-box">',
      '  <div class="auth-logo">🏗</div>',
      '  <div class="auth-title" id="auth-title-text">GR-1000N 定格総荷重検索</div>',
      '  <div class="auth-subtitle">ご利用にはアカウント登録が必要です</div>',
      '  <div class="auth-tabs">',
      '    <button class="auth-tab active" id="tab-register">新規登録</button>',
      '    <button class="auth-tab" id="tab-login">ログイン</button>',
      '  </div>',
      '  <div id="auth-error" class="auth-error" role="alert"></div>',
      '  <div id="auth-success" class="auth-success" role="status"></div>',

      '  <!-- 新規登録フォーム -->',
      '  <div id="form-register">',
      '    <div class="auth-field">',
      '      <label>氏名</label>',
      '      <input type="text" id="reg-name" autocomplete="name" placeholder="山田 太郎">',
      '    </div>',
      '    <div class="auth-field">',
      '      <label>会社名 <span class="auth-optional">（任意）</span></label>',
      '      <input type="text" id="reg-company" autocomplete="organization" placeholder="〇〇建設 株式会社">',
      '    </div>',
      '    <div class="auth-field">',
      '      <label>電話番号 <span class="auth-optional">（任意）</span></label>',
      '      <input type="tel" id="reg-phone" autocomplete="tel" inputmode="tel" placeholder="090-0000-0000">',
      '    </div>',
      '    <div class="auth-field">',
      '      <label>メールアドレス</label>',
      '      <input type="email" id="reg-email" autocomplete="email" inputmode="email" placeholder="example@email.com">',
      '    </div>',
      '    <div class="auth-field">',
      '      <label>パスワード</label>',
      '      <input type="password" id="reg-password" autocomplete="new-password" placeholder="8文字以上">',
      '      <div class="auth-hint">※ 次回以降のログインに使用します</div>',
      '    </div>',
      '    <button class="auth-btn" id="register-btn">登録して開始</button>',
      '    <div class="auth-divider">登録情報はサポート・アップデート連絡のみに使用します</div>',
      '  </div>',

      '  <!-- ログインフォーム -->',
      '  <div id="form-login" style="display:none">',
      '    <div class="auth-field">',
      '      <label>メールアドレス</label>',
      '      <input type="email" id="login-email" autocomplete="email" inputmode="email">',
      '    </div>',
      '    <div class="auth-field">',
      '      <label>パスワード</label>',
      '      <input type="password" id="login-password" autocomplete="current-password">',
      '    </div>',
      '    <button class="auth-btn" id="login-btn">ログイン</button>',
      '  </div>',
      '</div>',
    ].join('\n');

    document.body.appendChild(overlay);

    // タブ切り替え
    document.getElementById('tab-register').addEventListener('click', function () { switchTab('register'); });
    document.getElementById('tab-login').addEventListener('click', function () { switchTab('login'); });

    // ボタンアクション
    document.getElementById('register-btn').addEventListener('click', doRegister);
    document.getElementById('login-btn').addEventListener('click', doLogin);

    // Enter キー対応
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var activeForm = document.getElementById('form-login').style.display !== 'none' ? 'login' : 'register';
      if (activeForm === 'login') doLogin();
      else doRegister();
    });

    // 最初のフォーカス
    setTimeout(function () {
      var nameInput = document.getElementById('reg-name');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  // ============================================================
  // タブ切り替え
  // ============================================================
  function switchTab(tab) {
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('form-register').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('form-login').style.display = tab === 'login' ? '' : 'none';
    clearMessages();
  }

  // ============================================================
  // エラー / 成功メッセージ
  // ============================================================
  function showError(msg) {
    var el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.add('visible');
    document.getElementById('auth-success').classList.remove('visible');
  }

  function showSuccess(msg) {
    var el = document.getElementById('auth-success');
    el.textContent = msg;
    el.classList.add('visible');
    document.getElementById('auth-error').classList.remove('visible');
  }

  function clearMessages() {
    document.getElementById('auth-error').classList.remove('visible');
    document.getElementById('auth-success').classList.remove('visible');
  }

  // ============================================================
  // ボタンのローディング制御
  // ============================================================
  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    btn.disabled = loading;
    if (btnId === 'login-btn') {
      btn.textContent = loading ? '確認中...' : 'ログイン';
    } else {
      btn.textContent = loading ? '登録中...' : '登録して開始';
    }
  }

  // ============================================================
  // 新規登録
  // ============================================================
  function doRegister() {
    clearMessages();

    var name = document.getElementById('reg-name').value.trim();
    var company = document.getElementById('reg-company').value.trim();
    var phone = document.getElementById('reg-phone').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;

    if (!name) { showError('氏名を入力してください'); return; }
    if (!email || email.indexOf('@') === -1) { showError('正しいメールアドレスを入力してください'); return; }
    if (password.length < 8) { showError('パスワードは8文字以上で設定してください'); return; }

    setLoading('register-btn', true);

    var sb = getClient();
    sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name, company: company || null, phone: phone || null }
      }
    }).then(function (result) {
      if (result.error) {
        setLoading('register-btn', false);
        if (result.error.message.indexOf('already registered') !== -1 ||
            result.error.message.indexOf('already been registered') !== -1 ||
            result.error.message.indexOf('User already') !== -1) {
          showError('このメールアドレスはすでに登録されています。「ログイン」タブからサインインしてください。');
        } else {
          showError('登録できませんでした。もう一度お試しください。');
        }
        return;
      }

      var user = result.data && result.data.user;
      if (!user) {
        setLoading('register-btn', false);
        showError('登録処理に問題が発生しました。しばらくしてから再度お試しください。');
        return;
      }

      // profiles テーブルに顧客情報を保存
      sb.from('profiles').upsert({
        id: user.id,
        name: name,
        company: company || null,
        phone: phone || null,
      }).then(function () {
        setLoading('register-btn', false);
        dismissModal();
      });
    });
  }

  // ============================================================
  // ログイン
  // ============================================================
  function doLogin() {
    clearMessages();

    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    if (!email || email.indexOf('@') === -1) { showError('メールアドレスを入力してください'); return; }
    if (!password) { showError('パスワードを入力してください'); return; }

    setLoading('login-btn', true);

    var sb = getClient();
    sb.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
      setLoading('login-btn', false);
      if (result.error) {
        showError('ログインできませんでした。メールアドレスとパスワードを確認してください。');
      } else {
        dismissModal();
      }
    });
  }

  // ============================================================
  // モーダルを閉じる
  // ============================================================
  function dismissModal() {
    var overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.remove();
  }

  // ============================================================
  // メイン
  // ============================================================
  function init() {
    // Supabase が未設定の場合はスキップ（開発中に使えるようにする）
    if (!CONFIGURED) {
      console.warn('[auth.js] Supabase が未設定です。auth.js の SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。');
      return;
    }

    injectStyles();

    var sb = getClient();
    sb.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      if (!session) {
        // セッションなし → モーダルを表示
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', createModal);
        } else {
          createModal();
        }
      }
      // セッションあり → そのままアプリ起動（自動ログイン）
    });
  }

  init();
})();
