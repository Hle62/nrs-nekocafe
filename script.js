<script>
// ==========================================================
// ★ 1. 【設定必須】GASのウェブアプリURL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby1oHTm9gjv-o5GbIOAsE8VKJvMdFeI74nRX1f9gkrsI_wEbQsu6LinacYQ2m1HWx2U/exec';
// ==========================================================
let productList = []; // 商品情報（価格も含む）を格納

function logout() {
    localStorage.removeItem('loggedInStaff');
    window.location.reload();
}

function showMainApp(staffName) {
    document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    showTab('stock');
}

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
        staffDropdown.innerHTML = '<option value="">エラー: 従業員リスト取得失敗</option>';
        alert(`従業員リストの取得に失敗しました。GASエラー: ${error.message}`);
    }
}

async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    try {
        const loadingMessage = '<p>商品リストデータをGASから取得中...</p>';
        document.getElementById('stock-item-list').innerHTML = loadingMessage;
        document.getElementById('sale-item-list').innerHTML = loadingMessage;
        
        const response = await fetch(productUrl);
        const fullProductList = await response.json(); 
        if (fullProductList.error) throw new Error(fullProductList.error);
        
        // ★ 商品ごとの価格(price)も一緒に保存
        productList = fullProductList.map((p, index) => ({
            name: p.name,
            id: `item-${index}`,
            price: parseFloat(p.price) || 0
        }));
        
        renderItemLists();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        const errorMessage = '<p style="color:red;">エラー: 商品リスト取得失敗。再ログインしてください。</p>';
        document.getElementById('stock-item-list').innerHTML = errorMessage;
        document.getElementById('sale-item-list').innerHTML = errorMessage;
        alert(`商品情報の取得に失敗しました。GASエラー: ${error.message}`);
        throw error;
    }
}

function renderItemLists() {
    const stockListDiv = document.getElementById('stock-item-list');
    const saleListDiv = document.getElementById('sale-item-list');
    stockListDiv.innerHTML = '<label>在庫補充商品</label><br>';
    saleListDiv.innerHTML = '<label>販売記録商品</label><br>'; 

    productList.forEach(product => {
        const productId = product.id;
        const itemHtml = (type) => `
            <div class="item-box">
                <input type="checkbox" id="${type}-${productId}" name="${type}_item" value="${product.name}" style="width: auto;">
                <label for="${type}-${productId}" style="display: inline; font-weight: normal; color: #333;">${product.name}</label>
                <div id="${type}-qty-controls-${productId}" class="quantity-controls" style="margin-top: 5px; margin-left: 20px; display: none;">
                    <label for="qty-${type}-${productId}" style="font-weight: normal; display: inline-block; width: 50px; margin-top: 0;">数量</label>
                    <input type="number" id="qty-${type}-${productId}" min="0" value="0" data-item-id="${productId}">
                    <button type="button" onclick="updateQuantity('qty-${type}-${productId}', 1, '${type}')">+1</button>
                    <button type="button" onclick="updateQuantity('qty-${type}-${productId}', 5, '${type}')">+5</button>
                    <button type="button" onclick="updateQuantity('qty-${type}-${productId}', 10, '${type}')">+10</button>
                    <button type="button" class="reset-btn" onclick="resetSingleQuantity('qty-${type}-${productId}', '${type}')">0</button>
                </div>
            </div>`;
        stockListDiv.insertAdjacentHTML('beforeend', itemHtml('stock'));
        saleListDiv.insertAdjacentHTML('beforeend', itemHtml('sale'));
    });
    
    document.querySelectorAll('input[type="checkbox"][name$="_item"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const [idPrefix, ...rest] = e.target.id.split('-');
            const productId = rest.join('-');
            const controls = document.getElementById(`${idPrefix}-qty-controls-${productId}`);
            if (controls) {
                controls.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked) {
                    document.getElementById(`qty-${idPrefix}-${productId}`).value = 0;
                }
                if (idPrefix === 'sale') updateSaleTotalDisplay();
            }
        });
    });

    document.querySelectorAll('input[id^="qty-sale-"]').forEach(input => {
        input.addEventListener('input', updateSaleTotalDisplay);
    });
    updateSaleTotalDisplay();
}

function updateQuantity(inputId, value, type) {
    const input = document.getElementById(inputId);
    let newValue = (parseInt(input.value) || 0) + value;
    input.value = Math.max(0, newValue);
    if (type === 'sale') input.dispatchEvent(new Event('input')); 
}

function resetSingleQuantity(inputId, type) {
    const input = document.getElementById(inputId);
    input.value = 0;
    if (type === 'sale') input.dispatchEvent(new Event('input'));
}

function updateSaleTotalDisplay() {
    const totalDisplay = document.getElementById('sale-total-display');
    let totalSales = 0;
    document.querySelectorAll('input[id^="qty-sale-"]').forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            const productId = input.getAttribute('data-item-id');
            const checkbox = document.getElementById(`sale-${productId}`);
            if (checkbox && checkbox.checked) {
                const product = productList.find(p => p.id === productId);
                totalSales += quantity * (product ? product.price : 0);
            }
        }
    });
    totalDisplay.textContent = `合計金額 ¥${totalSales.toLocaleString()}`;
}

async function checkLoginStatus() {
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (loggedInStaff) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('current-staff-display').textContent = `${loggedInStaff}さんとしてログイン中`;
        try {
            await fetchProductData();
            showMainApp(loggedInStaff);
        } catch (error) {
            document.getElementById('login-section').style.display = 'block';
            document.getElementById('main-app').style.display = 'none';
            document.getElementById('login-message').textContent = 'データ取得エラー。再ログインしてください。';
        }
        return true;
    }
    return false;
}

async function attemptLogin() {
    const staffName = document.getElementById('login-staff').value;
    const messageElement = document.getElementById('login-message');
    if (!staffName) {
        messageElement.textContent = '名前を選択してください。';
        return;
    }
    
    const loginButton = event.target;
    const originalButtonText = loginButton.textContent;
    loginButton.textContent = '認証中...';
    loginButton.disabled = true;
    messageElement.textContent = '';

    const authUrl = `${GAS_WEB_APP_URL}?staffName=${encodeURIComponent(staffName)}`;
    try {
        const response = await fetch(authUrl);
        const result = await response.json();
        if (result.authenticated) {
            localStorage.setItem('loggedInStaff', staffName);
            messageElement.textContent = '商品リストをロード中...'; 
            await fetchProductData(); 
            showMainApp(staffName);
        } else {
            messageElement.textContent = result.error || 'その名前は登録されていません。';
            loginButton.textContent = originalButtonText;
            loginButton.disabled = false;
        }
    } catch (error) {
        messageElement.textContent = '致命的な認証エラーが発生しました。';
        loginButton.textContent = originalButtonText;
        loginButton.disabled = false;
    }
}

async function submitData(event, type) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = '送信中...';
    submitButton.disabled = true;

    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (!loggedInStaff) {
        alert('ログインが失効しました。再度ログインしてください。');
        window.location.reload();
        return;
    }
    
    let records = []; 
    const form = event.target;
    
    try {
        if (type === '在庫補充') {
            const memo = form.querySelector('#memo-stock').value;
            form.querySelectorAll('input[name="stock_item"]:checked').forEach(item => {
                const productId = item.id.split('-').slice(1).join('-');
                const quantity = parseInt(document.getElementById(`qty-stock-${productId}`).value);
                if (quantity > 0) records.push({ "商品名": item.value, "数量": quantity, "メモ": memo });
            });
            if (records.length === 0) throw new Error("数量が1以上の商品を1つ以上選択してください。");
        } else if (type === '経費申請') {
            const amount = form.querySelector('#amount-expense').value;
            if (!amount || amount < 1) throw new Error("金額を正しく入力してください。");
            records.push({ "費目": '材料費', "金額": amount, "メモ": form.querySelector('#memo-expense').value });
        } else if (type === '販売記録') {
            const memo = form.querySelector('#memo-sale').value;
            form.querySelectorAll('input[name="sale_item"]:checked').forEach(item => {
                const productId = item.id.split('-').slice(1).join('-');
                const quantity = parseInt(document.getElementById(`qty-sale-${productId}`).value);
                if (quantity > 0) {
                    const product = productList.find(p => p.id === productId);
                    const totalAmount = (product ? product.price : 0) * quantity;
                    records.push({ "商品名": item.value, "数量": quantity, "売上金額": totalAmount, "メモ": memo });
                }
            });
            if (records.length === 0) throw new Error("数量が1以上の商品を1つ以上選択してください。");
        }

        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ "type": type, "担当者名": loggedInStaff, "records": records }),
        });
        const result = await response.json();

        if (result.result === 'success') {
            alert(`${type}のデータ ${records.length}件が正常に送信されました！`);
            form.reset();
            // フォームを再描画して数量入力欄などをリセット
            document.querySelectorAll('.quantity-controls').forEach(el => el.style.display = 'none');
            document.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
            updateSaleTotalDisplay();
        } else {
            throw new Error(result.message || '予期せぬエラーです。');
        }
    } catch (error) {
        alert(`送信エラー: ${error.message}`);
    } finally {
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!checkLoginStatus()) {
        fetchStaffNames();
    }
});
</script>