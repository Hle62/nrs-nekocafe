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
        // レスポンスがJSONでない場合もfetchは成功するが、ここでエラーになる
        const staffNames = await response.json(); 
        
        staffDropdown.innerHTML = '<option value="">-- 名前を選択してください --</option>';

        staffNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            staffDropdown.appendChild(option);
        });
    } catch (error) {
        // GASのURL間違いやCORSエラーはここでキャッチされる
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
            document.getElementById('auth-info').style.display = 'block';
            document.querySelectorAll('.form-group').forEach(el => el.style.display = 'block');
            document.getElementById('current-staff-display').textContent = `${staffName}さんとしてログイン中`; 
            messageElement.textContent = '';
            
            // フォーム表示時に商品データを取得し、フォームに反映
            await fetchProductData(); 
        } else {
            messageElement.textContent = 'エラー: その名前はシステムに登録されていません。';
        }
    } catch (error) {
        console.error('認証エラー:', error);
        messageElement.textContent = '認証エラーが発生しました。';
    }
}


// --- データ送信処理 ---

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
            // ★ CROS問題解決のため headers: { 'Content-Type': 'application/json' } は意図的に削除
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

// --- ページロード時にスタッフ名リストの取得を実行 ---
document.addEventListener('DOMContentLoaded', fetchStaffNames);