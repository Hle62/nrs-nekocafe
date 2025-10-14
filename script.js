// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyjKsxOIjgVgeruSg9vJtfmVjngrPujJ9m_XWVSxzCYvBv0Xfwf0WCUZ1gd0ORPDtLL/exec'; 
// ==========================================================

// ★ 2. 【価格設定】種別ごとの価格をここで設定
const PRICES = {
  '食べ物': 30000,
  '飲み物': 30000,
  'ジョイント': 20000,
  '賄い': 10000
};

let productList = []; // 商品情報（名前とカテゴリ）を格納

// --- ログアウト関数 ---
function logout() {
  localStorage.removeItem('loggedInStaff');
  window.location.reload();
}

// --- メインアプリ表示 ---
function showMainApp(staffName) {
  document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  showTab('stock');
}

// --- データの取得 ---

// 従業員名リストを取得
async function fetchStaffNames() {
  const staffUrl = `${GAS_WEB_APP_URL}?action=getStaffNames`;
  const staffDropdown = document.getElementById('login-staff');
  try {
    const response = await fetch(staffUrl);
    const staffNames = await response.json();
    if (staffNames.error) throw new Error(staffNames.error);
    staffDropdown.innerHTML = '<option value="">-- 名前を選択してください --</option>';
    staffNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      staffDropdown.appendChild(option);
    });
  } catch (error) {
    console.error('従業員リスト取得エラー:', error);
    staffDropdown.innerHTML = '<option value="">エラー: 取得失敗</option>';
    alert(`従業員リストの取得に失敗しました: ${error.message}`);
  }
}

// 新しい商品データを取得
async function fetchProductData() {
  const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
  const loadingMessage = '<p>商品リストを読み込み中...</p>';
  document.getElementById('stock-item-list').innerHTML = loadingMessage;
  document.getElementById('sale-item-list').innerHTML = loadingMessage;
  
  try {
    const response = await fetch(productUrl);
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    // 商品名でソートしてリストを綺麗にする
    productList = data.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    
    renderItemLists();
  } catch (error) {
    console.error('商品情報取得エラー:', error);
    const errorMessage = '<p style="color:red;">エラー: 商品リストの取得に失敗しました。</p>';
    document.getElementById('stock-item-list').innerHTML = errorMessage;
    document.getElementById('sale-item-list').innerHTML = errorMessage;
    alert(`商品情報の取得に失敗しました: ${error.message}`);
    throw error;
  }
}

// チェックボックスと数量フィールドを生成
function renderItemLists() {
  const stockListDiv = document.getElementById('stock-item-list');
  const saleListDiv = document.getElementById('sale-item-list');
  stockListDiv.innerHTML = '<label>在庫補充商品</label><br>';
  saleListDiv.innerHTML = '<label>販売記録商品</label><br>';

  productList.forEach((product, index) => {
    const productId = `item-${index}`;
    // HTML生成を共通化
    const createItemHtml = (type) => `
      <div class="item-box">
        <input type="checkbox" id="${type}-${productId}" name="${type}_item" value="${product.name}" data-category="${product.category}" style="width: auto;">
        <label for="${type}-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
        <div id="${type}-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
          <label for="qty-${type}-${productId}" style="font-weight: normal; width: 50px;">数量</label>
          <input type="number" id="qty-${type}-${productId}" min="0" value="0">
          <button type="button" onclick="updateQuantity('qty-${type}-${productId}', 1, '${type}')">+1</button>
          <button type="button" onclick="updateQuantity('qty-${type}-${productId}', 5, '${type}')">+5</button>
          <button type="button" onclick="resetSingleQuantity('qty-${type}-${productId}', '${type}')">0</button>
        </div>
      </div>`;

    stockListDiv.insertAdjacentHTML('beforeend', createItemHtml('stock'));
    saleListDiv.insertAdjacentHTML('beforeend', createItemHtml('sale'));
  });

  // イベントリスナーを一括設定
  document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });
  document.querySelectorAll('input[id^="qty-sale-"]').forEach(input => {
    input.addEventListener('input', updateSaleTotalDisplay);
    input.addEventListener('change', updateSaleTotalDisplay);
  });

  updateSaleTotalDisplay();
}

function handleCheckboxChange(e) {
  const parts = e.target.id.split('-');
  const type = parts[0];
  const productId = parts.slice(1).join('-');
  const controls = document.getElementById(`${type}-qty-controls-${productId}`);
  
  if (controls) {
    controls.style.display = e.target.checked ? 'block' : 'none';
    const input = document.getElementById(`qty-${type}-${productId}`);
    if (!e.target.checked && input) {
      input.value = 0;
    }
    if (type === 'sale') {
      updateSaleTotalDisplay();
    }
  }
}

// 数量ボタンの処理
function updateQuantity(inputId, value, type) {
  const input = document.getElementById(inputId);
  input.value = Math.max(0, (parseInt(input.value) || 0) + value);
  if (type === 'sale') {
    input.dispatchEvent(new Event('change'));
  }
}

function resetSingleQuantity(inputId, type) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = 0;
    if (type === 'sale') {
      input.dispatchEvent(new Event('change'));
    }
  }
}

// 販売記録の合計金額を更新
function updateSaleTotalDisplay() {
  const totalDisplay = document.getElementById('sale-total-display');
  let totalSales = 0;
  
  document.querySelectorAll('input[name="sale_item"]:checked').forEach(checkbox => {
    const parts = checkbox.id.split('-');
    const productId = parts.slice(1).join('-');
    const quantity = parseInt(document.getElementById(`qty-sale-${productId}`).value) || 0;
    
    if (quantity > 0) {
      const category = checkbox.dataset.category;
      const unitPrice = PRICES[category] || 0; // ★価格表から価格を取得
      totalSales += quantity * unitPrice;
    }
  });

  totalDisplay.textContent = `合計金額 ¥${totalSales.toLocaleString()}`;
}


// --- ログインとページ初期化 ---
function checkLoginStatus() {
  const loggedInStaff = localStorage.getItem('loggedInStaff');
  if (loggedInStaff) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
    fetchProductData().then(() => showMainApp(loggedInStaff)).catch(() => {
      // エラー時はログイン画面に戻す
      document.getElementById('login-section').style.display = 'block';
      document.getElementById('main-app').style.display = 'none';
      document.getElementById('login-message').textContent = 'データ取得エラーのため、再ログインしてください。';
    });
    return true;
  }
  return false;
}

async function attemptLogin() {
  const staffName = document.getElementById('login-staff').value;
  const messageElement = document.getElementById('login-message');
  const loginButton = event.target;
  
  if (!staffName) {
    messageElement.textContent = '名前を選択してください。';
    return;
  }
  
  loginButton.textContent = '認証中...';
  loginButton.disabled = true;
  messageElement.textContent = '';
  
  try {
    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;
    const response = await fetch(authUrl);
    const result = await response.json();

    if (result.authenticated) {
      localStorage.setItem('loggedInStaff', staffName);
      messageElement.textContent = '商品リストをロード中...';
      await fetchProductData();
      showMainApp(staffName);
    } else {
      messageElement.textContent = 'エラー: その名前は登録されていません。';
      loginButton.textContent = 'ログイン';
      loginButton.disabled = false;
    }
  } catch (error) {
    console.error('認証エラー:', error);
    messageElement.textContent = '致命的な認証エラーが発生しました。';
    loginButton.textContent = 'ログイン';
    loginButton.disabled = false;
  }
}

// --- タブ切り替え ---
function showTab(tabId) {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.toggle('active', button.getAttribute('onclick').includes(`'${tabId}'`));
  });
  document.querySelectorAll('.form-content').forEach(content => {
    content.style.display = (content.id === `${tabId}-form`) ? 'block' : 'none';
  });
}

// --- データ送信処理 ---
async function submitData(event, type) {
  event.preventDefault();
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = '送信中...';
  submitButton.disabled = true;

  const loggedInStaff = localStorage.getItem('loggedInStaff');
  if (!loggedInStaff) {
    alert('ログイン情報が失効しました。再度ログインしてください。');
    window.location.reload();
    return;
  }
  
  let records = [];
  const form = event.target;
  
  try {
    if (type === '在庫補充') {
      const memo = form.querySelector('#memo-stock').value;
      form.querySelectorAll('input[name="stock_item"]:checked').forEach(item => {
        const qty = parseInt(document.getElementById(`qty-stock-${item.id.substring(6)}`).value);
        if (isNaN(qty) || qty < 1) throw new Error(`${item.value} の数量を1以上で入力してください。`);
        records.push({ "商品名": item.value, "数量": qty, "メモ": memo });
      });
      if (records.length === 0) {
        if (memo.trim()) records.push({ "商品名": 'メモのみ', "数量": 0, "メモ": memo });
        else throw new Error('補充する商品を1つ以上選択してください。');
      }
    } else if (type === '経費申請') {
      records.push({ "費目": '材料費', "金額": form.querySelector('#amount-expense').value, "メモ": form.querySelector('#memo-expense').value });
    } else if (type === '販売記録') {
      const memo = form.querySelector('#memo-sale').value;
      form.querySelectorAll('input[name="sale_item"]:checked').forEach(item => {
        const qty = parseInt(document.getElementById(`qty-sale-${item.id.substring(5)}`).value);
        if (isNaN(qty) || qty < 1) throw new Error(`${item.value} の数量を1以上で入力してください。`);
        const category = item.dataset.category;
        const unitPrice = PRICES[category] || 0;
        records.push({ "商品名": item.value, "数量": qty, "売上金額": unitPrice * qty, "メモ": memo });
      });
      if (records.length === 0) throw new Error('販売した商品を1つ以上選択してください。');
    }
  } catch (e) {
    alert(e.message);
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
    return;
  }

  const bulkData = { "type": type, "担当者名": loggedInStaff, "records": records };

  try {
    const response = await fetch(GAS_WEB_APP_URL, { method: 'POST', body: JSON.stringify(bulkData) });
    const result = await response.json();

    if (result.result === 'success') {
      alert(`${type}のデータ ${records.length} 件が正常に送信されました。`);
      form.reset();
      // チェックボックスと数量表示をリセット
      document.querySelectorAll('input[type="checkbox"][name$="_item"]:checked').forEach(cb => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
      });
    } else {
      throw new Error(result.message || '不明なエラー');
    }
  } catch (error) {
    console.error('送信エラー:', error);
    alert(`送信エラー: ${error.message}`);
  } finally {
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
}

// --- ページロード時の初期処理 ---
document.addEventListener('DOMContentLoaded', () => {
  if (!checkLoginStatus()) {
    fetchStaffNames();
    document.getElementById('app-container').style.display = 'block';
  }
});