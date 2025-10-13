// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwRe84cPNCe-JxWTWz__JKNmsvGZCdfuVBaF-VpNC0wxdbcQaOygbimt0nCbZGI7YJP/exec'; 
// ==========================================================
// ★ 2. 【設定必須】販売記録に適用する一律の商品単価をここに設定してください
const SALE_UNIT_PRICE = 300; // 例: 全ての商品を300円と仮定

let productList = []; // 商品情報を格納

// --- ログアウト関数 ---
function logout() {
    localStorage.removeItem('loggedInStaff');
    window.location.reload();
}
// ----------------------------------

// ★新規関数: メインアプリを表示する処理を統合
function showMainApp(staffName) {
    document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`;
    
    // 非表示を解除し、アプリ全体を描画
    const mainApp = document.getElementById('main-app');
    mainApp.style.display = 'block';
    
    // 初回は「在庫補充」タブを表示
    showTab('stock');
}


// --- データの取得 ---

// 従業員名リストを取得し、プルダウンを構築
async function fetchStaffNames() {
    const staffUrl = `${GAS_WEB_APP_URL}?action=getStaffNames`;
    const staffDropdown = document.getElementById('login-staff');
    
    try {
        const response = await fetch(staffUrl);
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
        staffDropdown.innerHTML = '<option value="">エラー: 従業員リスト取得失敗</option>';
        alert(`従業員リストの取得に失敗しました。GASエラー: ${error.message}`);
    }
}

// 商品データを取得し、フォームのチェックボックスに反映
async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    
    try {
        // GASからのデータ取得中にメッセージを表示 (これはローディング表示が解除された後、メインアプリ内で実行される)
        const loadingMessageFetch = '<p>商品リストデータをGASから取得中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageFetch;
        document.getElementById('sale-item-list').innerHTML = loadingMessageFetch;
        
        const response = await fetch(productUrl);
        const fullProductList = await response.json(); 

        if (fullProductList.error) {
             throw new Error(fullProductList.error);
        }
        
        // データ取得完了後、DOM構築中にメッセージを表示 (ユーザーフィードバック)
        const loadingMessageRender = '<p>リスト要素描画中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageRender;
        document.getElementById('sale-item-list').innerHTML = loadingMessageRender;
        
        // 商品名と連番のみを保持
        productList = fullProductList.map((p, index) => ({
            name: p.name,
            id: `item-${index}` // 連番ID
        }));
        
        // DOM構築の実行
        renderItemLists();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        // エラーメッセージを具体的に
        document.getElementById('stock-item-list').innerHTML = '<p style="color:red;">エラー: 商品リスト取得失敗。再ログインしてください。</p>';
        document.getElementById('sale-item-list').innerHTML = '<p style="color:red;">エラー: 商品リスト取得失敗。再ログインしてください。</p>';
        alert(`商品情報の取得に失敗しました。GASエラー: ${error.message}`);
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
        
        // 1. 在庫補充リスト (stock)
        const stockHtml = `
            <div class="item-box">
                <input type="checkbox" id="stock-${productId}" name="stock_item" value="${product.name}" style="width: auto;">
                <label for="stock-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
                
                <div id="stock-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-stock-${productId}" style="font-weight: normal; display: inline-block; width: 50px; margin-top: 0;">数量</label>
                    <input type="number" id="qty-stock-${productId}" min="0" value="0">
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 1, 'stock')">+1</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 5, 'stock')">+5</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 10, 'stock')">+10</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 100, 'stock')">+100</button>
                    <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-stock-${productId}', 'stock')">0</button>
                </div>
            </div>
        `;
        stockListDiv.insertAdjacentHTML('beforeend', stockHtml);
        
        // 2. 販売記録リスト (sale)
        const saleHtml = `
            <div class="item-box">
                <input type="checkbox" id="sale-${productId}" name="sale_item" value="${product.name}" style="width: auto;">
                <label for="sale-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
                
                <div id="sale-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-sale-${productId}" style="font-weight: normal; display: inline-block; width: 50px; margin-top: 0;">数量</label>
                    <input type="number" id="qty-sale-${productId}" min="0" value="0" data-item-id="${productId}">
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 1, 'sale')">+1</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 5, 'sale')">+5</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 10, 'sale')">+10</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 100, 'sale')">+100</button>
                    <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-sale-${productId}', 'sale')">0</button>
                </div>
            </div>
        `;
        saleListDiv.insertAdjacentHTML('beforeend', saleHtml);
    });
    
    // イベントリスナーを一括で設定
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const parts = e.target.id.split('-');
            const idPrefix = parts[0]; 
            const productId = parts.slice(1).join('-'); 
            
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = e.target.checked ? 'block' : 'none';
                
                // チェックを外したら数量を0に戻す
                const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                if (!e.target.checked && input) {
                    input.value = 0;
                }
                
                // チェックボックス変更時に合計金額を再計算
                if (idPrefix === 'sale') {
                    updateSaleTotalDisplay();
                }
            }
        });
    });

    // 数量入力フィールドにchangeとinputイベントリスナーを設定（リアルタイム反映のため）
    document.querySelectorAll('input[id^="qty-sale-"]').forEach(input => {
        input.addEventListener('input', updateSaleTotalDisplay);
        input.addEventListener('change', updateSaleTotalDisplay);
    });

    // 初期表示時に合計金額をリセット
    updateSaleTotalDisplay();
}

// 数量ボタンの処理関数
function updateQuantity(inputId, value, type) {
    const input = document.getElementById(inputId);
    let currentValue = parseInt(input.value) || 0;
    
    let newValue = currentValue + value;

    if (newValue < 0) {
        newValue = 0;
    }
    
    input.value = newValue;
    
    // イベントを手動で発火させ、リアルタイム計算をトリガー
    if (type === 'sale') {
        const event = new Event('change');
        input.dispatchEvent(event); 
    }
}

// 個別リセット関数
function resetSingleQuantity(inputId, type) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = 0;
    }
    
    // イベントを手動で発火させる
    if (type === 'sale') {
        const event = new Event('change');
        input.dispatchEvent(event);
    }
}

// 販売記録の合計金額をリアルタイムで更新する関数
function updateSaleTotalDisplay() {
    const totalDisplay = document.getElementById('sale-total-display');
    const saleQtyInputs = document.querySelectorAll('input[id^="qty-sale-"]');
    let totalSales = 0;
    
    saleQtyInputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        
        // 関連するチェックボックスがチェックされているか確認
        const parts = input.id.split('-');
        const productId = parts.slice(2).join('-'); 
        const checkbox = document.getElementById(`sale-${productId}`);
        
        // チェックが入っていて、数量が正の場合のみ加算
        if (checkbox && checkbox.checked && quantity > 0) {
            totalSales += quantity * SALE_UNIT_PRICE;
        }
    });

    totalDisplay.textContent = `合計金額 ¥${totalSales.toLocaleString()}`;
}


// --- ページロード時の自動ログインチェック処理 ---
function checkLoginStatus() {
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    
    // ★修正ポイント: ログインセクションが非表示の場合は、アプリ全体が見えていない状態と判断
    const appContainer = document.getElementById('app-container');
    
    if (loggedInStaff) {
        document.getElementById('login-section').style.display = 'none';
        
        // アプリ全体を表示に戻す
        appContainer.style.display = 'block';

        // 担当者名だけ先に設定
        document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
        
        // 商品情報取得（非同期）が完了するのを待ってから、メインアプリを表示する
        fetchProductData().then(() => {
            showMainApp(loggedInStaff);
        }).catch(error => {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('login-message').textContent = 'データ取得エラーのため、リロードまたは再ログインしてください。';
            console.error('データ取得エラーにより画面表示を完了できませんでした。', error);
        });
        
        return true;
    }
    
    // ログイン情報がない場合は、アプリコンテナを表示に戻す（ログインフォームを表示させるため）
    appContainer.style.display = 'block';
    
    return false;
}


// --- ログイン処理 ---

async function attemptLogin() {
    const staffName = document.getElementById('login-staff').value;
    const messageElement = document.getElementById('login-message');
    
    if (!staffName) {
        messageElement.textContent = '名前を選択してください。';
        return;
    }
    
    // 認証開始時のメッセージを表示
    messageElement.textContent = '認証中...';

    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;

    try {
        const response = await fetch(authUrl);
        const result = await response.json();

        if (result.authenticated) {
            localStorage.setItem('loggedInStaff', staffName);
            
            document.getElementById('login-section').style.display = 'none';
            
            // ★修正ポイント: 認証成功直後、商品ロードが始まる前にメッセージを表示
            document.getElementById('login-message').textContent = '認証完了、商品リストをロード中...'; 
            
            // 商品データ取得を待ってから showMainApp() を呼び出す
            await fetchProductData(); 
            showMainApp(staffName);
            
            // ログインメッセージをクリア
            document.getElementById('login-message').textContent = '';

        } else if (result.error) {
             messageElement.textContent = `エラー ${result.error}`;
        } else {
            messageElement.textContent = 'エラー その名前はシステムに登録されていません。';
        }
    } catch (error) {
        console.error('認証エラー:', error);
        messageElement.textContent = '致命的な認証エラーが発生しました。';
    }
}

// --- タブ切り替え関数 ---
function showTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('onclick').includes(`'${tabId}'`)) {
            button.classList.add('active');
        }
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


// --- データ送信処理 (複数データ送信対応) ---

async function submitData(event, type) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    
    // 送信ボタンのステータスを変更し、ユーザーに処理中であることを伝える
    submitButton.textContent = '送信中...';
    submitButton.disabled = true;

    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (!loggedInStaff) {
        alert('ログイン情報が失効しています。再度ログインしてください。');
        window.location.reload();
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        return;
    }
    
    let records = []; 
    const form = event.target;
    
    if (type === '在庫補充') {
        const selectedItems = form.querySelectorAll('input[name="stock_item"]:checked');
        const memo = form.querySelector('#memo-stock').value;

        if (selectedItems.length === 0 && memo.trim() === '') {
             alert('補充する商品を1つ以上選択するか、メモを入力してください。');
             submitButton.textContent = originalButtonText;
             submitButton.disabled = false;
             return;
        }
        
        try {
            selectedItems.forEach(item => {
                const parts = item.id.split('-');
                const productId = parts.slice(1).join('-');
                const quantityInput = document.getElementById(`qty-stock-${productId}`);
                const quantity = parseInt(quantityInput.value);

                if (isNaN(quantity) || quantity < 1) {
                     alert(`${item.value} の数量を正しく入力してください（1以上）。`);
                     throw new Error("Invalid quantity"); 
                }

                records.push({
                    "item_type": "stock",
                    "商品名": item.value,
                    "数量": quantity,
                    "メモ": memo
                });
            });

            if (records.length === 0 && memo.trim() !== '') {
                 records.push({
                     "item_type": "stock_memo",
                     "商品名": 'メモのみ', 
                     "数量": 0,
                     "メモ": memo
                 });
            }

        } catch(e) {
            if (e.message === "Invalid quantity") {
                 submitButton.textContent = originalButtonText;
                 submitButton.disabled = false;
                 return;
            }
            throw e;
        }
        
    } else if (type === '経費申請') {
        const memo = form.querySelector('#memo-expense').value;

        records.push({
            "item_type": "expense",
            "費目": '材料費', 
            "金額": form.querySelector('#amount-expense').value,
            "メモ": memo
        });

    } else if (type === '販売記録') {
        const selectedItems = form.querySelectorAll('input[name="sale_item"]:checked');
        const memo = form.querySelector('#memo-sale').value; 

        if (selectedItems.length === 0) {
            alert('販売した商品を1つ以上選択してください。');
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        try {
            selectedItems.forEach(item => {
                const parts = item.id.split('-');
                const productId = parts.slice(1).join('-');
                const quantityInput = document.getElementById(`qty-sale-${productId}`);
                const quantity = parseInt(quantityInput.value);
                const unitPrice = SALE_UNIT_PRICE; 
                
                if (isNaN(quantity) || quantity < 1) {
                     alert(`${item.value} の数量を正しく入力してください（1以上）。`);
                     throw new Error("Invalid quantity"); 
                }
                
                const totalAmount = unitPrice * quantity;
                
                records.push({
                    "item_type": "sale",
                    "商品名": item.value,
                    "数量": quantity,
                    "売上金額": totalAmount,
                    "メモ": memo 
                });
            });
        } catch(e) {
            if (e.message === "Invalid quantity") {
                 submitButton.textContent = originalButtonText;
                 submitButton.disabled = false;
                 return;
            }
            throw e;
        }
    } else {
        alert('無効なフォームです。');
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
        return;
    }

    const bulkData = {
        "type": type, 
        "担当者名": loggedInStaff,
        "records": records 
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(bulkData),
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert(`${type}のデータ ${records.length} 件が正常に送信され、Discordに通知されました！`);
            
            if (type === '在庫補充' || type === '販売記録') {
                const items = form.querySelectorAll('input[name$="_item"]:checked');
                items.forEach(item => {
                    item.checked = false; 
                    const parts = item.id.split('-');
                    const idPrefix = parts[0]; 
                    const productId = parts.slice(1).join('-'); 
                    const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
                    if (controls) {
                        controls.style.display = 'none'; 
                    }
                    const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                    if (input) input.value = 0; 
                });
                
                if (type === '販売記録') {
                    updateSaleTotalDisplay();
                }
            }
            
            form.reset();
        } else if (result.result === 'error') {
            alert(`送信エラーが発生しました (GASエラー): ${result.message}`);
        } else {
            alert('データの送信に失敗しました。予期せぬ応答です。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert(`致命的な通信エラーが発生しました。システム管理者に連絡してください。`);
    } finally {
        // 処理の成功・失敗に関わらずボタンの状態を戻す
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}


// --- ページロード時の初期処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // ログイン情報がない場合、名前リストを取得してログイン画面を表示
    if (!checkLoginStatus()) {
        fetchStaffNames();
        
        // ★修正ポイント: ログイン情報がない場合は、アプリコンテナを即座に表示に戻す
        document.getElementById('app-container').style.display = 'block';
    }
});