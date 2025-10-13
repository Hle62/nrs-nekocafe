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

// 商品データを取得し、フォームのドロップダウンに反映
async function fetchProductData() {
    const productUrl = `${GAS_WEB_APP_URL}?action=getProducts`;
    
    try {
        const response = await fetch(productUrl);
        productList = await response.json();
        
        updateProductDropdowns();
    } catch (error) {
        console.error('商品情報取得エラー:', error);
        alert('商品情報が取得できませんでした。');
    }
}

// フォームのドロップダウンを更新
function updateProductDropdowns() {
    const dropdowns = [
        document.getElementById('item-stock'),
        document.getElementById('item-sale')
    ];

    dropdowns.forEach(select => {
        select.innerHTML = '<option value="">-- 選択してください --</option>';
    });

    productList.forEach(product => {
        const option1 = document.createElement('option');
        option1.value = product.name;
        option1.textContent = product.name;
        document.getElementById('item-stock').appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = product.name;
        option2.textContent = `${product.name} (¥${product.price.toLocaleString()})`;
        document.getElementById('item-sale').appendChild(option2);
    });
}

// --- ページロード時の自動ログインチェック処理（NEW!）---
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
            localStorage.setItem('loggedInStaff', staffName); // ★ ここで情報を保存
            
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


// --- データ送信処理 (省略) ---

// データ送信（フォームごとに処理を分岐）
async function submitData(event, type) {
    event.preventDefault();
    
    const loggedInStaff = localStorage.getItem('loggedInStaff');
    if (!loggedInStaff) {
        alert('ログイン情報が失効しています。再度ログインしてください。');
        window.location.reload();
        return;
    }
    
    let dataToSend;
    const form = event.target;
    
    if (type === '在庫補充') {
        dataToSend = {
            "type": type,
            "担当者名": loggedInStaff,
            "商品名": form.querySelector('#item-stock').value,
            "補充数量": form.querySelector('#quantity-stock').value,
            "メモ": form.querySelector('#memo-stock').value
        };
    } else if (type === '経費申請') {
        dataToSend = {
            "type": type,
            "担当者名": loggedInStaff,
            "費目": form.querySelector('#category-expense').value,
            "金額": form.querySelector('#amount-expense').value,
            "メモ": form.querySelector('#memo-expense').value
        };
    } else if (type === '販売記録') {
        const selectedItem = form.querySelector('#item-sale').value;
        const quantity = form.querySelector('#quantity-sale').value;
        
        const product = productList.find(p => p.name === selectedItem);
        const unitPrice = product ? product.price : 0;
        const totalAmount = unitPrice * parseInt(quantity || 0);

        if (totalAmount === 0 && parseInt(quantity) > 0) {
             alert('選択した商品の単価情報が見つからないか、数量が不正です。');
             return;
        }

        dataToSend = {
            "type": type,
            "担当者名": loggedInStaff,
            "商品名": selectedItem,
            "販売数量": quantity,
            "売上金額": totalAmount // 自動計算された売上金額
        };
    } else {
        alert('無効なフォームです。');
        return;
    }

    // POSTリクエストの送信
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(dataToSend),
        });
        const result = await response.json();

        if (result.result === 'success') {
            alert(`${type}のデータが正常に送信され、Discordに通知されました！`);
            form.reset();
        } else if (result.result === 'error') {
             alert(`送信エラーが発生しました (GASエラー: ${result.message})。システム管理者に連絡してください。`);
        } else {
            alert('データの送信に失敗しました。予期せぬ応答です。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert('エラーが発生しました。システム管理者に連絡してください。');
    }
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