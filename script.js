<script>
// --- テスト用コード ---
// ★ 1. 【設定必須】GASのウェブアプリURLをここに貼り付けてください
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxCL39W2eAtbpkf7Rz45AEEVv65AMfsagBl5WKSiwRIV2wdOkerXlM8G86FDMWUKBnGrA/exec'; // 必ずご自身のURLにしてください

// 従業員名リストを取得する機能だけをテスト
async function fetchStaffNames() {
    const staffUrl = `${GAS_WEB_APP_URL}?action=getStaffNames`;
    const staffDropdown = document.getElementById('login-staff');
    staffDropdown.innerHTML = '<option value="">従業員リストを読み込み中...</option>';
    
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
        alert('テスト成功：従業員リストの読み込みが完了しました。');
    } catch (error) {
        console.error('テスト失敗:', error);
        staffDropdown.innerHTML = '<option value="">エラー: 読み込み失敗</option>';
        alert(`テスト失敗：従業員リストの読み込みに失敗しました。\n\nエラー詳細: ${error.message}\n\n開発者コンソール（F12キー）で赤いエラーメッセージを確認してください。`);
    }
}

// ページが読み込まれたら、テストを実行する
document.addEventListener('DOMContentLoaded', () => {
    fetchStaffNames();
});
</script>