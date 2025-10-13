// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwRe84cPNCe-JxWTWz__JKNmsvGZCdfuVBaF-VpNC0wxdbcQaOygbimt0nCbG7YJP/exec'; 
// ==========================================================

let productList = []; // 商品情報を格納

// --- データの取得 ---

// 従業員名リストを取得し、プルダウンを構築
async function fetchStaffNames() {
    const staffUrl = `${GAS_WEB_APP_URL}?action=getStaffNames`;
    const staffDropdown = document.getElementById('login-staff');
    
    try {
        const response = await fetch(staffUrl);
        const staffNames = await response.json(); 
        
        // GASからエラーが返された場合
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
        alert(`従業員リストの取得に失敗しました。GASエラー: ${error.message}`);
        staffDropdown.innerHTML = '<option value="">エラー: リロードしてください</option>';
    }
}

// 商品データを取得し、フォームのチェックボックスに反映
async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    
    try {
        const response = await fetch(productUrl);
        productList = await response.json();

        // GASからエラーが返された場合
        if (productList.error) {
             throw new Error(productList.error);
        }
        
        renderItemLists();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        alert(`商品情報の取得に失敗しました。GASエラー: ${error.message}`);
    }
}

// チェックボックスと数量フィールドを生成する関数
function renderItemLists() {
    const stockListDiv = document.getElementById('stock-item-list');
    const saleListDiv = document.getElementById('sale-item-list');

    stockListDiv.innerHTML = '<label>在庫補充商品:</label><br>';
    saleListDiv.innerHTML = '<label>販売記録商品:</label><br>';

    productList.forEach(product => {
        // IDを生成する際に、商品名ではなくインデックスを使用し、安全性を確保
        const index = productList.indexOf(product);
        const productId = `item-${index}`; 
        
        // 1. 在庫補充リスト (stock)
        const stockHtml = `
            <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <input type="checkbox" id="stock-${productId}" name="stock_item" value="${product.name}" style="width: auto;">
                <label for="stock-${productId}" style="display: inline; font-weight: normal;">${product.name}</label>
                
                <div id="stock-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-stock-${productId}" style="font-weight: normal; display: inline-block; width: 50px;">数量:</label>
                    <input type="number" id="qty-stock-${productId}" min="0" value="0">
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 1)">+1</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 5)">+5</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 10)">+10</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 100)">+100</button>
                    <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-stock-${productId}')">0</button>
                </div>
            </div>
        `;
        stockListDiv.insertAdjacentHTML('beforeend', stockHtml);
        
        // 2. 販売記録リスト (sale)
        const saleHtml = `
            <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <input type="checkbox" id="sale-${productId}" name="sale_item" value="${product.name}" data-price="${product.price}" style="width: auto;">
                <label for="sale-${productId}" style="display: inline; font-weight: normal;">${product.name} (¥${product.price.toLocaleString()})</label>
                
                <div id="sale-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-sale-${productId}" style="font-weight: normal; display: inline-block; width: 50px;">数量:</label>
                    <input type="number" id="qty-sale-${productId}" min="0" value="0">
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 1)">+1</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 5)">+5</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 10)">+10</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 100)">+100</button>
                    <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-sale-${productId}')">0</button>
                </div>
            </div>
        `;
        saleListDiv.insertAdjacentHTML('beforeend', saleHtml);
    });

    // チェックボックスの状態変更時に数量コントロールを表示/非表示にするイベントリスナーを設定
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const parts = e.target.id.split('-');
            const idPrefix = parts[0]; 
            const productId = parts.slice(1).join('-'); 
            
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = e.target.checked ? 'block' : 'none';
                
                // チェックを外したら数量を0に戻す
                if (!e.target.checked) {
                    const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                    if (input) input.value = 0;
                }
            }
        });
    });
}

// 数量ボタンの処理関数
function updateQuantity(inputId, value) {
    const input = document.getElementById(inputId);
    let currentValue = parseInt(input.value) || 0;
    
    let newValue = currentValue + value;

    if (newValue < 0) {
        newValue = 0;
    }
    
    input.value = newValue;
}

// 個別リセット関数
function resetSingleQuantity(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = 0;
    }
}


// --- ページロード時の自動ログインチェック処理 ---
function checkLoginStatus() {
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    
    if (loggedInStaff) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
        
        fetchProductData();
        showTab('stock');
        
        return true;
    }
    return false;
}


// --- ログイン処理 ---

// ログイン試行（プルダウン選択のみ）
async function attemptLogin() {
    const staffName = document.getElementById('login-staff').value;
    const messageElement = document.getElementById('login-message');
    
    if (!staffName) {
        messageElement.textContent = '名前を選択してください。';
        return;
    }
    
    messageElement.textContent = '認証中...';

    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;

    try {
        const response = await fetch(authUrl);
        const result = await response.json();

        if (result.authenticated) {
            localStorage.setItem('loggedInStaff', staffName);
            
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('main-app').style.display = 'block'; 
            document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`; 
            messageElement.textContent = '';
            
            await fetchProductData(); 
            showTab('stock');

        } else if (result.error) {
             messageElement.textContent = `エラー: ${result.error}`;
        } else {
            messageElement.textContent = 'エラー: その名前はシステムに登録されていません。';
        }
    } catch (error) {
        console.error('認証エラー:', error);
        messageElement.textContent = '認証エラーが発生しました。';
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
    }
}


// --- データ送信処理 (複数データ送信対応) ---

async function submitData(event, type) {
    event.preventDefault();
    
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (!loggedInStaff) {
        alert('ログイン情報が失効しています。再度ログインしてください。');
        window.location.reload();
        return;
    }
    
    let records = []; 
    const form = event.target;
    
    if (type === '在庫補充') {
        const selectedItems = form.querySelectorAll('input[name="stock_item"]:checked');
        const memo = form.querySelector('#memo-stock').value;

        if (selectedItems.length === 0 && memo.trim() === '') {
             alert('補充する商品を1つ以上選択するか、メモを入力してください。');
             return;
        }
        
        try {
            selectedItems.forEach(item => {
                const productId = String(item.id).split('-').slice(1).join('-');
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

            // 商品が未選択でメモのみの場合
            if (records.length === 0 && memo.trim() !== '') {
                 records.push({
                     "item_type": "stock_memo",
                     "商品名": 'メモのみ', 
                     "数量": 0,
                     "メモ": memo
                 });
            }

        } catch(e) {
            if (e.message === "Invalid quantity") return;
            throw e;
        }
        
    } else if (type === '経費申請') {
        const memo = form.querySelector('#memo-expense').value;
        if (memo.trim() === '') {
            alert('経費申請にはメモが必須です。');
            return;
        }

        records.push({
            "item_type": "expense",
            // ★修正: 費目を材料費に固定
            "費目": '材料費', 
            "金額": form.querySelector('#amount-expense').value,
            "メモ": memo
        });

    } else if (type === '販売記録') {
        const selectedItems = form.querySelectorAll('input[name="sale_item"]:checked');
        const memo = form.querySelector('#memo-sale').value; // ★修正: 販売記録のメモを取得

        if (selectedItems.length === 0) {
            alert('販売した商品を1つ以上選択してください。');
            return;
        }

        try {
            selectedItems.forEach(item => {
                const productId = String(item.id).split('-').slice(1).join('-');
                const quantityInput = document.getElementById(`qty-sale-${productId}`);
                const quantity = parseInt(quantityInput.value);
                const unitPrice = parseFloat(item.dataset.price);

                if (isNaN(quantity) || quantity < 1) {
                     alert(`${item.value} の数量を正しく入力してください（1以上）。`);
                     throw new Error("Invalid quantity"); 
                }
                
                if (unitPrice === 0 || isNaN(unitPrice)) {
                     alert(`${item.value} の単価情報が（スプシで）設定されていません。`);
                     throw new Error("Invalid price");
                }
                
                const totalAmount = unitPrice * quantity;
                
                records.push({
                    "item_type": "sale",
                    "商品名": item.value,
                    "数量": quantity,
                    "売上金額": totalAmount,
                    "メモ": memo // ★修正: 販売記録のメモをレコードに追加
                });
            });
        } catch(e) {
            if (e.message === "Invalid quantity" || e.message === "Invalid price") return;
            throw e;
        }
    } else {
        alert('無効なフォームです。');
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
            
            // ★修正: 送信成功後の数量コントロールを閉じる処理を追加
            if (type === '在庫補充' || type === '販売記録') {
                const items = form.querySelectorAll('input[name$="_item"]:checked');
                items.forEach(item => {
                    item.checked = false; // チェックを外す
                    const parts = item.id.split('-');
                    const idPrefix = parts[0]; 
                    const productId = parts.slice(1).join('-'); 
                    const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
                    if (controls) {
                        controls.style.display = 'none'; // 数量コントロールを非表示
                    }
                    const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                    if (input) input.value = 0; // 数量をリセット
                });
            }
            
            form.reset();
        } else if (result.result === 'error') {
            alert(`送信エラーが発生しました (GASエラー): ${result.message}`);
        } else {
            alert('データの送信に失敗しました。予期せぬ応答です。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert(`致命的な通信エラーが発生しました。システム管理者/デプロイ設定を確認してください。エラー詳細: ${error.message}`);
    }
}


// --- ページロード時の初期処理 ---
document.addEventListener('DOMContentLoaded', () => {
    const loggedIn = checkLoginStatus();
    if (!loggedIn) {
        fetchStaffNames();
    }
});