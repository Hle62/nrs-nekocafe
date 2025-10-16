// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyjKsxOIjgVgeruSg9vJtfmVjngrPujJ9m_XWVSxzCYvBv0Xfwf0WCUZ1gd0ORPDtLL/exec'; 
// ==========================================================
// ★ 2. 【設定必須】販売記録に適用する一律の商品単価をここに設定してください
// const SALE_UNIT_PRICE = 300; // 個別の商品価格を反映するため、この定数は使用しません。

// ★変更: productList はカテゴリごとのオブジェクト構造になります
let productList = {}; // { '食べ物': [{name: '...', price: 100, id: '...'}], ... }
// ----------------------------------

// --- ログアウト関数 ---
function logout() {
    localStorage.removeItem('loggedInStaff');
    window.location.reload();
}
// ----------------------------------

// ★新規関数: メインアプリを表示する処理を統合
function showMainApp(staffName) {
    document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`;
    
    // ログイン画面を非表示にし、メイン画面を表示
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
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
        // GASからのデータ取得中にメッセージを表示 
        const loadingMessageFetch = '<p>商品リストデータをGASから取得中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageFetch;
        document.getElementById('sale-item-list').innerHTML = loadingMessageFetch;
        
        const response = await fetch(productUrl);
        // ★変更: GASからカテゴリ別オブジェクトを受け取る
        const fullProductListByCategory = await response.json(); 

        if (fullProductListByCategory.error) {
             throw new Error(fullProductListByCategory.error);
        }
        
        // データ取得完了後、DOM構築中にメッセージを表示 (ユーザーフィードバック)
        const loadingMessageRender = '<p>リスト要素描画中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessageRender;
        document.getElementById('sale-item-list').innerHTML = loadingMessageRender;
        
        // ★変更: productList にカテゴリ別データを設定し、一意のIDを付与
        let idCounter = 0;
        productList = {};
        for (const categoryName in fullProductListByCategory) {
            // Nullまたは空配列のカテゴリをスキップ
            if (fullProductListByCategory[categoryName] && fullProductListByCategory[categoryName].length > 0) {
                 productList[categoryName] = fullProductListByCategory[categoryName].map(p => ({
                    category: p.category,
                    name: p.name,
                    // ★変更なし: 統一価格がpriceに入っている（GASで処理済み）
                    price: p.price, 
                    id: `item-${idCounter++}` 
                }));
            }
        }
        
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

// ★修正: 数量のデフォルト値は 0 のまま。チェック時の自動 '1' 設定を削除。
function renderItemLists() {
    const stockListDiv = document.getElementById('stock-item-list');
    const saleListDiv = document.getElementById('sale-item-list');

    stockListDiv.innerHTML = ''; // コンテンツをクリア
    saleListDiv.innerHTML = '';

    const allProductCategories = Object.keys(productList);

    allProductCategories.forEach(category => {
        const products = productList[category];
        if (products.length === 0) return; // 商品がないカテゴリはスキップ

        // そのカテゴリの統一価格を取得 (販売記録用)
        const unifiedPrice = products[0].price; 
        const priceDisplay = unifiedPrice > 0 ? `<span class="category-price"> (¥${unifiedPrice.toLocaleString()})</span>` : '';

        // 1. 在庫補充のカテゴリヘッダー（価格なし）
        const stockHeaderHtml = `<h3 class="category-header">${category}</h3>`;
        stockListDiv.insertAdjacentHTML('beforeend', stockHeaderHtml);
        
        // 2. 販売記録のカテゴリヘッダー（価格あり）
        const saleHeaderHtml = `<h3 class="category-header">${category}${priceDisplay}</h3>`;
        saleListDiv.insertAdjacentHTML('beforeend', saleHeaderHtml);

        // グリッドコンテナを追加
        const stockGridHtml = `<div id="stock-grid-${category}" class="item-grid"></div>`;
        const saleGridHtml = `<div id="sale-grid-${category}" class="item-grid"></div>`;

        stockListDiv.insertAdjacentHTML('beforeend', stockGridHtml);
        saleListDiv.insertAdjacentHTML('beforeend', saleGridHtml);

        const stockGridDiv = document.getElementById(`stock-grid-${category}`);
        const saleGridDiv = document.getElementById(`sale-grid-${category}`);

        products.forEach(product => {
            const productId = product.id;
            
            // 1. 在庫補充リスト (stock)
            const stockHtml = `
                <div class="item-card" data-type="stock" data-id="${productId}">
                    <div class="item-checkbox-row">
                        <input type="checkbox" id="stock-${productId}" name="stock_item" value="${product.name}">
                        <label for="stock-${productId}" class="item-name-label">${product.name}</label>
                    </div>
                    
                    <div id="stock-qty-controls-${productId}" class="quantity-controls" style="display: none;">
                        <label for="qty-stock-${productId}" style="margin-top: 5px;">数量</label>
                        <input type="number" id="qty-stock-${productId}" min="0" value="0">
                        <div class="qty-buttons">
                            <button type="button" onclick="updateQuantity('qty-stock-${productId}', 1, 'stock')">+1</button>
                            <button type="button" onclick="updateQuantity('qty-stock-${productId}', 5, 'stock')">+5</button>
                            <button type="button" onclick="updateQuantity('qty-stock-${productId}', 10, 'stock')">+10</button>
                            <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-stock-${productId}', 'stock')">0</button>
                        </div>
                    </div>
                </div>
            `;
            stockGridDiv.insertAdjacentHTML('beforeend', stockHtml);
            
            // 2. 販売記録リスト (sale)
            const saleHtml = `
                <div class="item-card" data-type="sale" data-id="${productId}" data-category="${category}">
                    <div class="item-checkbox-row">
                        <input type="checkbox" id="sale-${productId}" name="sale_item" value="${product.name}" data-price="${product.price}">
                        <label for="sale-${productId}" class="item-name-label">${product.name}</label>
                    </div>
                    
                    <div id="sale-qty-controls-${productId}" class="quantity-controls" style="display: none;">
                        <label for="qty-sale-${productId}" style="margin-top: 5px;">数量</label>
                        <input type="number" id="qty-sale-${productId}" min="0" value="0" data-item-id="${productId}">
                        <div class="qty-buttons">
                            <button type="button" onclick="updateQuantity('qty-sale-${productId}', 1, 'sale')">+1</button>
                            <button type="button" onclick="updateQuantity('qty-sale-${productId}', 5, 'sale')">+5</button>
                            <button type="button" onclick="updateQuantity('qty-sale-${productId}', 10, 'sale')">+10</button>
                            <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-sale-${productId}', 'sale')">0</button>
                        </div>
                    </div>
                </div>
            `;
            saleGridDiv.insertAdjacentHTML('beforeend', saleHtml);
        });
    });
    
    // イベントリスナーを一括で設定
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const parts = e.target.id.split('-');
            const idPrefix = parts[0]; 
            const productId = parts.slice(1).join('-'); 
            
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                const card = e.target.closest('.item-card'); 
                
                if (e.target.checked) {
                    controls.style.display = 'block';
                    if (card) card.classList.add('is-checked'); 
                    
                    // ★修正: チェック時の自動 '1' 設定を削除
                    const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                    // 販売記録の場合、チェック時に自動で1をセットするロジックを削除
                    // if (idPrefix === 'sale' && input && (parseInt(input.value) === 0 || input.value === '0')) { input.value = 1; }
                    
                } else {
                    controls.style.display = 'none';
                    if (card) card.classList.remove('is-checked');
                    
                    // チェックを外したら数量を0に戻す
                    const input = document.getElementById(`qty-${idPrefix}-${productId}`);
                    if (input) {
                        input.value = 0;
                    }
                }
                
                if (idPrefix === 'sale') {
                    updateSaleTotalDisplay();
                }
            }
        });
    });

    // 数量入力フィールドにchangeとinputイベントリスナーを設定
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
    
    let newValue = currentValue + value;

    if (newValue < 0) {
        newValue = 0;
    }
    
    // ★修正: 販売記録でも、ボタン操作で1より小さくならないようにする制約を削除
    // if (type === 'sale' && newValue === 0 && currentValue > 0) { newValue = 1; }
    
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
    
    // 販売記録で0にリセットする場合、チェックは残す
    if (type === 'sale') {
        input.value = 0;
        const event = new Event('change');
        input.dispatchEvent(event);
    } else {
        input.value = 0;
        const parts = inputId.split('-');
        const idPrefix = parts[1]; 
        const productId = parts.slice(2).join('-');
        const checkbox = document.getElementById(`${idPrefix}-${productId}`);
        if (checkbox) {
            checkbox.checked = false;
            const changeEvent = new Event('change');
            checkbox.dispatchEvent(changeEvent);
        }
    }
}

// 販売記録の合計金額とクーポンの計算/表示
function updateSaleTotalDisplay() {
    const totalDisplay = document.getElementById('sale-total-display');
    const saleQtyInputs = document.querySelectorAll('input[id^="qty-sale-"]'); 
    let totalSales = 0;
    
    let foodQty = 0;
    let drinkQty = 0;
    let jointQty = 0;
    
    saleQtyInputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        
        const parts = input.id.split('-');
        const productId = parts.slice(2).join('-'); 
        const checkbox = document.getElementById(`sale-${productId}`);
        
        if (checkbox && checkbox.checked && quantity > 0) {
            // チェックボックスのデータ属性から価格を取得
            const unitPrice = parseFloat(checkbox.dataset.price);
            const card = checkbox.closest('.item-card');
            const category = card ? card.getAttribute('data-category') : null;

            if (!isNaN(unitPrice)) {
                totalSales += quantity * unitPrice;
            }
            
            // カテゴリごとの数量を合算 (クーポン対象カテゴリのみ)
            if (category === '食べ物') {
                foodQty += quantity;
            } else if (category === '飲み物') {
                drinkQty += quantity;
            } else if (category === 'ジョイント') {
                jointQty += quantity;
            }
        }
    });

    // クーポン枚数の計算 (食べ物、飲み物、ジョイントの最小値/10)
    const minQty = Math.min(foodQty, drinkQty, jointQty);
    
    // 最小値を10で割って、セットが成立した回数を算出
    const totalCoupons = Math.floor(minQty / 10);
    
    
    // 表示用HTMLを生成し、一つの要素に挿入
    let htmlContent = `
        <div class="sale-total-row">
            <span class="label">合計金額</span>
            <span class="value">¥${totalSales.toLocaleString()}</span>
        </div>
    `;

    if (totalCoupons > 0) {
        htmlContent += `
            <div class="coupon-row">
                <span class="label">クーポン券枚数</span>
                <span class="value coupon-value">${totalCoupons.toLocaleString()} 枚</span>
            </div>
        `;
    }
    
    totalDisplay.innerHTML = htmlContent;
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
            console.error('データ取得エラーにより画面表示を完了できませんでした。', error);
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

        } else if (result.error) {
             messageElement.textContent = `エラー ${result.error}`;
        } else {
            messageElement.textContent = 'エラー その名前はシステムに登録されていません。';
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
        
        // ★修正箇所: 在庫補充のプレサブリミットリセットをここに移動
        // 販売記録と同様に、送信ボタンを押した瞬間にリセットする
        const items = form.querySelectorAll('input[name$="_item"]'); 
        items.forEach(item => {
            item.checked = false; 
            const parts = item.id.split('-');
            const idPrefix = parts[0]; 
            const productId = parts.slice(1).join('-'); 
            
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = 'none'; // 数量入力欄全体を非表示にする
            }
            const input = document.getElementById(`qty-${idPrefix}-${productId}`);
            if (input) input.value = 0; 

            const card = item.closest('.item-card');
            if (card) card.classList.remove('is-checked');
        });
        form.reset(); // Memo fieldもクリア

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
                
                const unitPrice = parseFloat(item.dataset.price);
                
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
        
        // フォーム送信前にLocalStorageをクリアし、画面をリセット
        const items = form.querySelectorAll('input[name$="_item"]'); // チェックされていない項目も含む
        items.forEach(item => {
            item.checked = false; 
            const parts = item.id.split('-');
            const idPrefix = parts[0]; 
            const productId = parts.slice(1).join('-'); 
            
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = 'none'; // 数量入力欄全体を非表示にする
            }
            const input = document.getElementById(`qty-${idPrefix}-${productId}`);
            if (input) input.value = 0; 

            const card = item.closest('.item-card');
            if (card) card.classList.remove('is-checked');
        });
        form.reset(); // Memo fieldもクリア
        updateSaleTotalDisplay(); // 表示もリセット

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
            
            // 在庫補充/販売記録はボタン押下時にリセット済み。
            // 経費申請のみ、成功時にform.reset()を実行する。
            if (type === '経費申請') {
                form.reset();
            }
        } else if (result.result === 'error') {
            alert(`送信エラーが発生しました (GASエラー): ${result.message}`);
        } else {
            alert('データの送信に失敗しました。予期せぬ応答です。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert(`致命的な通信エラーが発生しました。システム管理者に連絡してください。`);
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