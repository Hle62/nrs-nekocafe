// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwRe84cPNCe-JxWTWz__JKNmsvGZCdfuVBaF-VpNC0wxdbcQaOygbimt0nCbZGI7YJP/exec'; 
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
        
        staffDropdown.innerHTML = '<option value="">-- 名前を選択してください --</option>';

        staffNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            staffDropdown.appendChild(option);
        });
    } catch (error) {
        console.error('従業員リスト取得エラー:', error);
        staffDropdown.innerHTML = '<option value="">エラー: リロードしてください</option>';
    }
}

// 商品データを取得し、フォームのチェックボックスに反映
async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    
    try {
        const response = await fetch(productUrl);
        productList = await response.json();
        
        // ★ ドロップダウンではなく、チェックボックスリストを生成
        renderItemLists();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        alert('商品情報が取得できませんでした。');
    }
}

// チェックボックスと数量フィールドを生成する関数
function renderItemLists() {
    const stockListDiv = document.getElementById('stock-item-list');
    const saleListDiv = document.getElementById('sale-item-list');

    stockListDiv.innerHTML = '<label>在庫補充商品:</label><br>';
    saleListDiv.innerHTML = '<label>販売記録商品:</label><br>';

    productList.forEach(product => {
        // スペース削除で一意なID生成 (DOM操作用)
        const productId = product.name.replace(/\s/g, ''); 

        // 1. 在庫補充リスト (stock)
        const stockHtml = `
            <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                <input type="checkbox" id="stock-${productId}" name="stock_item" value="${product.name}" style="width: auto;">
                <label for="stock-${productId}" style="display: inline; font-weight: normal;">${product.name}</label>
                
                <div id="stock-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-stock-${productId}" style="font-weight: normal; display: inline-block; width: 50px;">数量:</label>
                    <input type="number" id="qty-stock-${productId}" min="1" value="1" >
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 1)">+1</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 5)">+5</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 10)">+10</button>
                    <button type="button" onclick="updateQuantity('qty-stock-${productId}', 100)">+100</button>
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
                    <input type="number" id="qty-sale-${productId}" min="1" value="1">
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 1)">+1</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 5)">+5</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 10)">+10</button>
                    <button type="button" onclick="updateQuantity('qty-sale-${productId}', 100)">+100</button>
                </div>
            </div>
        `;
        saleListDiv.insertAdjacentHTML('beforeend', saleHtml);
    });

    // チェックボックスの状態変更時に数量コントロールを表示/非表示にするイベントリスナーを設定
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const idPrefix = e.target.id.startsWith('stock') ? 'stock' : 'sale';
            const productId = e.target.id.split('-').slice(1).join('-');
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    });
}

// 数量ボタンの処理関数
function updateQuantity(inputId, value) {
    const input = document.getElementById(inputId);
    let currentValue = parseInt(input.value) || 0;
    
    // 数量を追加
    let newValue = currentValue + value;

    // 負の値にならないようにする
    if (newValue < 1) {
        newValue = 1;
    }
    
    input.value = newValue;
}


// --- ページロード時の自動ログインチェック処理 ---
function checkLoginStatus() {
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    
    if (loggedInStaff) {
        // ログイン情報がLocalStorageに残っている場合、自動でメイン画面を表示
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
        
        // 商品情報を取得し、フォームを準備
        fetchProductData();
        showTab('stock');
        
        return true; // 自動ログイン成功
    }
    return false; // ログイン情報なし
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

    // GASで名前の存在チェックを依頼
    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;

    try {
        const response = await fetch(authUrl);
        const result = await response.json();

        if (result.authenticated) {
            // ログイン成功
            localStorage.setItem('loggedInStaff', staffName);
            
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('main-app').style.display = 'block'; 
            document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`; 
            messageElement.textContent = '';
            
            // フォーム表示時に商品データを取得し、フォームに反映
            await fetchProductData(); 
            
            // 初回は「在庫補充」タブを表示
            showTab('stock');

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
    // 1. 全てのタブボタンから 'active' クラスを外し、現在のボタンに付与
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('onclick').includes(`'${tabId}'`)) {
            button.classList.add('active');
        }
    });

    // 2. 全てのコンテンツを非表示にし、現在のコンテンツを表示
    document.querySelectorAll('.form-content').forEach(content => {
        content.style.display = 'none';
    });

    // tabId に対応するコンテンツを表示
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
    
    // 複数データを格納するための配列
    let dataToSendArray = []; 
    const form = event.target;
    
    if (type === '在庫補充') {
        const selectedItems = form.querySelectorAll('input[name="stock_item"]:checked');
        if (selectedItems.length === 0) {
            alert('補充する商品を1つ以上選択してください。');
            return;
        }
        
        // エラーチェックとデータ構築
        try {
            selectedItems.forEach(item => {
                const productId = item.id.split('-').slice(1).join('-');
                const quantityInput = document.getElementById(`qty-stock-${productId}`);
                const quantity = parseInt(quantityInput.value);

                if (isNaN(quantity) || quantity < 1) {
                     alert(`${item.value} の数量を正しく入力してください。`);
                     throw new Error("Invalid quantity"); 
                }

                dataToSendArray.push({
                    "type": type,
                    "担当者名": loggedInStaff,
                    "商品名": item.value,
                    "補充数量": quantity,
                    "メモ": form.querySelector('#memo-stock').value
                });
            });
        } catch(e) {
            if (e.message === "Invalid quantity") return; // エラーメッセージ表示済み
            throw e;
        }
        
    } else if (type === '経費申請') {
        // 経費申請は単一送信のまま
        dataToSendArray.push({
            "type": type,
            "担当者名": loggedInStaff,
            "費目": form.querySelector('#category-expense').value,
            "金額": form.querySelector('#amount-expense').value,
            "メモ": form.querySelector('#memo-expense').value
        });

    } else if (type === '販売記録') {
        const selectedItems = form.querySelectorAll('input[name="sale_item"]:checked');
        if (selectedItems.length === 0) {
            alert('販売した商品を1つ以上選択してください。');
            return;
        }

        // エラーチェックとデータ構築
        try {
            selectedItems.forEach(item => {
                const productId = item.id.split('-').slice(1).join('-');
                const quantityInput = document.getElementById(`qty-sale-${productId}`);
                const quantity = parseInt(quantityInput.value);
                const unitPrice = parseFloat(item.dataset.price); // HTMLのdata-price属性から単価を取得

                if (isNaN(quantity) || quantity < 1 || unitPrice === 0) {
                     alert(`${item.value} の数量を正しく入力するか、単価情報（スプシ）を確認してください。`);
                     throw new Error("Invalid quantity or price"); 
                }
                
                const totalAmount = unitPrice * quantity;
                
                dataToSendArray.push({
                    "type": type,
                    "担当者名": loggedInStaff,
                    "商品名": item.value,
                    "販売数量": quantity,
                    "売上金額": totalAmount
                });
            });
        } catch(e) {
            if (e.message === "Invalid quantity or price") return; // エラーメッセージ表示済み
            throw e;
        }
    } else {
        alert('無効なフォームです。');
        return;
    }

    // ★ 複数データ送信をGASが一括処理できるように、ループ処理を実行
    let successCount = 0;

    for (const dataToSend of dataToSendArray) {
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(dataToSend),
                // CROS問題解決のため headers: { 'Content-Type': 'application/json' } は意図的に削除
            });
            const result = await response.json();

            if (result.result !== 'success') {
                alert(`処理中にエラーが発生しました (${dataToSend.商品名} の送信失敗): ${result.message}`);
                return; // 1つでも失敗したら処理を中断
            }
            successCount++;
        } catch (error) {
            console.error('通信エラー:', error);
            alert(`致命的な通信エラーが発生しました (${dataToSend.商品名})。システム管理者に連絡してください。`);
            return; // 1つでも失敗したら処理を中断
        }
    }

    // すべての送信が成功した場合
    alert(`${type}のデータ ${successCount} 件が正常に送信され、Discordに通知されました！`);
    form.reset();
}


// --- ページロード時の初期処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // ログイン情報があれば自動ログインを試みる
    const loggedIn = checkLoginStatus();
    
    // ログイン情報がない場合のみ、名前リストを取得してログイン画面を表示
    if (!loggedIn) {
        fetchStaffNames();
    }
});