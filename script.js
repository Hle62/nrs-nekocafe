<script>
// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby1oHTm9gjv-o5GbIOAsE8VKJvMdFeI74nRX1f9gkrsI_wEbQsu6LinacYQ2m1HWx2U/exec';
// ==========================================================
// ★ 2. 廃止: 一律の商品単価設定は不要になりました

let productList = []; // 商品情報を格納 (価格情報も含むように変更)

// --- ログアウト関数 ---
function logout() {
    localStorage.removeItem('loggedInStaff');
    window.location.reload();
}
// ----------------------------------

// メインアプリを表示する処理
function showMainApp(staffName) {
    document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    showTab('stock');
}

// --- データの取得 ---

// 【社員情報】従業員名リストを取得し、プルダウンを構築
async function fetchStaffNames() {
    const staffUrl = `${GAS_WEB_APP_URL}?action=getStaffNames`;
    const staffDropdown = document.getElementById('login-staff');
    
    try {
        const response = await fetch(staffUrl);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const staffNames = await response.json();
        
        if (staffNames.error) {
             throw new Error(staffNames.error);
        }

        staffDropdown.innerHTML = '<option value="">-- 名前を選択してください --</option>';

        staffNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            staffDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('従業員リスト取得エラー:', error);
        staffDropdown.innerHTML = '<option value="">エラー: リスト取得失敗</option>';
        alert(`従業員リストの取得に失敗しました。GASの再デプロイと共有設定を確認してください。\nエラー詳細: ${error.message}`);
    }
}

// 【商品情報】商品データを取得し、フォームのチェックボックスに反映
async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    
    try {
        const loadingMessageFetch = '<p>商品リストデータをGASから取得中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageFetch;
        document.getElementById('sale-item-list').innerHTML = loadingMessageFetch;
        
        const response = await fetch(productUrl);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const fullProductList = await response.json(); 

        if (fullProductList.error) {
             throw new Error(fullProductList.error);
        }
        
        const loadingMessageRender = '<p>リスト要素描画中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageRender;
        document.getElementById('sale-item-list').innerHTML = loadingMessageRender;
        
        // ★ 変更点: 商品名、価格、連番IDを保持するように修正
        productList = fullProductList.map((p, index) => ({
            name: p.name,
            price: p.price || 0, // 価格情報を保持
            id: `item-${index}`
        }));
        
        renderItemLists();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        document.getElementById('stock-item-list').innerHTML = '<p style="color:red;">エラー: 商品リスト取得失敗。再ログインしてください。</p>';
        document.getElementById('sale-item-list').innerHTML = '<p style="color:red;">エラー: 商品リスト取得失敗。再ログインしてください。</p>';
        alert(`商品情報の取得に失敗しました。\nエラー詳細: ${error.message}`);
        throw error;
    }
}

// チェックボックスと数量フィールドを生成する関数
function renderItemLists() {
    const stockListDiv = document.getElementById('stock-item-list');
    const saleListDiv = document.getElementById('sale-item-list');

    stockListDiv.innerHTML = '<label>在庫補充商品</label><br>';
    saleListDiv.innerHTML = '<label>販売記録商品</label><br>'; 

    productList.forEach(product => {
        const productId = product.id; 
        
        const stockHtml = `
            <div class="item-box">
                <input type="checkbox" id="stock-${productId}" name="stock_item" value="${product.name}" style="width: auto;">
                <label for="stock-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
                <div id="stock-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-stock-${productId}" style="font-weight: normal; display: inline-block; width: 50px; margin-top: 0;">数量</label>
                    <input type="number" id="qty-stock-${productId}" min="0" value="0">
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 1, 'stock')">+1</button> <button type="button" onclick="updateQuantity('qty-stock-${productId}', 5, 'stock')">+5</button> <button type="button" onclick="updateQuantity('qty-stock-${productId}', 10, 'stock')">+10</button> <button type="button" onclick="updateQuantity('qty-stock-${productId}', 100, 'stock')">+100</button> <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-stock-${productId}', 'stock')">0</button>
                </div>
            </div>`;
        stockListDiv.insertAdjacentHTML('beforeend', stockHtml);
        
        // ★ 変更点: inputタグに `data-price` 属性を追加して、商品価格を埋め込む
        const saleHtml = `
            <div class="item-box">
                <input type="checkbox" id="sale-${productId}" name="sale_item" value="${product.name}" style="width: auto;">
                <label for="sale-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
                <div id="sale-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-sale-${productId}" style="font-weight: normal; display: inline-block; width: 50px; margin-top: 0;">数量</label>
                    <input type="number" id="qty-sale-${productId}" min="0" value="0" data-item-id="${productId}" data-price="${product.price}">
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 1, 'sale')">+1</button> <button type="button" onclick="updateQuantity('qty-sale-${productId}', 5, 'sale')">+5</button> <button type="button" onclick="updateQuantity('qty-sale-${productId}', 10, 'sale')">+10</button> <button type="button" onclick="updateQuantity('qty-sale-${productId}', 100, 'sale')">+100</button> <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-sale-${productId}', 'sale')">0</button>
                </div>
            </div>`;
        saleListDiv.insertAdjacentHTML('beforeend', saleHtml);
    });
    
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const [idPrefix, ...idParts] = e.target.id.split('-');
            const productId = idParts.join('-');
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = e.target.checked ? 'block' : 'none';
                const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                if (!e.target.checked && input) {
                    input.value = 0;
                }
                if (idPrefix === 'sale') {
                    updateSaleTotalDisplay();
                }
            }
        });
    });

    document.querySelectorAll('input[id^="qty-sale-"]').forEach(input => {
        input.addEventListener('input', updateSaleTotalDisplay);
        input.addEventListener('change', updateSaleTotalDisplay);
    });

    updateSaleTotalDisplay();
}

// 数量ボタンの処理関数
function updateQuantity(inputId, value, type) {
    const input = document.getElementById(inputId);
    let currentValue = parseInt(input.value) || 0;
    input.value = Math.max(0, currentValue + value);
    if (type === 'sale') {
        input.dispatchEvent(new Event('change'));
    }
}

// 個別リセット関数
function resetSingleQuantity(inputId, type) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = 0;
        if (type === 'sale') {
            input.dispatchEvent(new Event('change'));
        }
    }
}

// ★ 変更点: 販売記録の合計金額を商品ごとの単価で計算するように修正
function updateSaleTotalDisplay() {
    const totalDisplay = document.getElementById('sale-total-display');
    const saleQtyInputs = document.querySelectorAll('input[id^="qty-sale-"]');
    let totalSales = 0;
    
    saleQtyInputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        const [,,...idParts] = input.id.split('-');
        const productId = idParts.join('-');
        const checkbox = document.getElementById(`sale-${productId}`);
        
        if (checkbox && checkbox.checked && quantity > 0) {
            const unitPrice = parseFloat(input.dataset.price) || 0;
            totalSales += quantity * unitPrice;
        }
    });

    totalDisplay.textContent = `合計金額 ¥${totalSales.toLocaleString()}`;
}


// --- ページロード時の自動ログインチェック処理 ---
function checkLoginStatus() {
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (loggedInStaff) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
        fetchProductData().then(() => {
            showMainApp(loggedInStaff);
        }).catch(error => {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('login-message').textContent = 'データ取得エラーのため、リロードまたは再ログインしてください。';
        });
        return true;
    }
    return false;
}


// --- ログイン処理 ---
async function attemptLogin() {
    const staffName = document.getElementById('login-staff').value;
    const messageElement = document.getElementById('login-message');
    const loginButton = event.target;
    const originalButtonText = loginButton.textContent;
    
    if (!staffName) {
        messageElement.textContent = '名前を選択してください。';
        return;
    }
    
    loginButton.textContent = '認証中...';
    loginButton.disabled = true;
    messageElement.textContent = '';
    document.getElementById('login-message').style.display = 'block';

    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;

    try {
        const response = await fetch(authUrl);
        const result = await response.json();

        if (result.authenticated) {
            localStorage.setItem('loggedInStaff', staffName);
            loginButton.textContent = '認証成功！';
            messageElement.textContent = '商品リストをロード中...'; 
            await fetchProductData(); 
            showMainApp(staffName);
            document.getElementById('login-message').style.display = 'none';
        } else {
             messageElement.textContent = result.error || 'エラー その名前はシステムに登録されていません。';
        }
    } catch (error) {
        console.error('認証エラー:', error);
        messageElement.textContent = '致命的な認証エラーが発生しました。';
    } finally {
        if (!localStorage.getItem('loggedInStaff')) {
             loginButton.textContent = originalButtonText;
             loginButton.disabled = false;
        }
    }
}

// --- タブ切り替え関数 ---
function showTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.getAttribute('onclick').includes(`'${tabId}'`));
    });
    document.querySelectorAll('.form-content').forEach(content => {
        content.style.display = 'none';
    });
    const contentElement = document.getElementById(`${tabId}-form`);
    if (contentElement) {
        contentElement.style.display = 'block';
        if (tabId === 'sale') {
            updateSaleTotalDisplay();
        }
    }
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
        alert('ログイン情報が失効しています。再度ログインしてください。');
        window.location.reload();
        return;
    }
    
    let records = []; 
    const form = event.target;
    
    try {
        if (type === '在庫補充') {
            const memo = form.querySelector('#memo-stock').value;
            form.querySelectorAll('input[name="stock_item"]:checked').forEach(item => {
                const [, ...idParts] = item.id.split('-');
                const quantity = parseInt(document.getElementById(`qty-stock-${idParts.join('-')}`).value);
                if (isNaN(quantity) || quantity < 1) throw new Error(`${item.value} の数量を正しく入力してください（1以上）。`);
                records.push({ "商品名": item.value, "数量": quantity, "メモ": memo });
            });
            if (records.length === 0) {
                 if (memo.trim()) records.push({ "商品名": 'メモのみ', "数量": 0, "メモ": memo });
                 else throw new Error('補充する商品を1つ以上選択するか、メモを入力してください。');
            }
        } else if (type === '経費申請') {
            records.push({ "費目": '材料費', "金額": form.querySelector('#amount-expense').value, "メモ": form.querySelector('#memo-expense').value });
        } else if (type === '販売記録') {
            const memo = form.querySelector('#memo-sale').value;
            form.querySelectorAll('input[name="sale_item"]:checked').forEach(item => {
                const [, ...idParts] = item.id.split('-');
                const quantityInput = document.getElementById(`qty-sale-${idParts.join('-')}`);
                const quantity = parseInt(quantityInput.value);
                if (isNaN(quantity) || quantity < 1) throw new Error(`${item.value} の数量を正しく入力してください（1以上）。`);
                const unitPrice = parseFloat(quantityInput.dataset.price) || 0; 
                records.push({ "商品名": item.value, "数量": quantity, "売上金額": unitPrice * quantity, "メモ": memo });
            });
            if (records.length === 0) throw new Error('販売した商品を1つ以上選択してください。');
        } else {
            throw new Error('無効なフォームです。');
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
            alert(`${type}のデータ ${records.length} 件が正常に送信されました！`);
            form.reset();
            document.querySelectorAll('input[name$="_item"]:checked').forEach(item => {
                item.checked = false;
                item.dispatchEvent(new Event('change'));
            });
        } else {
            alert(`送信エラー (GAS): ${result.message}`);
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert(`致命的な通信エラーが発生しました。`);
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
</script>