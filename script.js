// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 要素の取得 ---
    const addBtn = document.getElementById('add-participant-btn');
    const calcBtn = document.getElementById('calculate-btn');
    const participantsList = document.getElementById('participants-list');
    const resultsDiv = document.getElementById('results');
    const utcTimeDisplay = document.getElementById('current-time-display');
    
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let currentMode = 'mode-start'; 

    // -- PC用 出発時刻要素 --
    const startHH = document.getElementById('start-hh');
    const startMM = document.getElementById('start-mm');
    const startSS = document.getElementById('start-ss');
    const setNowStartBtn = document.getElementById('set-now-start-btn');
    
    // -- PC用 到着時刻要素 --
    const targetHH = document.getElementById('target-hh');
    const targetMM = document.getElementById('target-mm');
    const targetSS = document.getElementById('target-ss');
    const setNowTargetBtn = document.getElementById('set-now-target-btn');

    const rallyTimeButtons = document.getElementById('rally-time-buttons');

    // --- 0埋めヘルパー ---
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }

    // --- ★ピッカーの初期化 (MobileSelect.js) ---
    // PC/スマホに関わらず常に初期化を試みる
    let startPicker, targetPicker;

    // データ生成ヘルパー (0からmaxまでの文字列配列を作成)
    function generateData(max) {
        const data = [];
        for (let i = 0; i <= max; i++) {
            data.push(padZero(i));
        }
        return data;
    }
    const hoursData = generateData(23);
    const minutesData = generateData(59);
    const secondsData = generateData(59);

    // ピッカー設定の共通部分
    const pickerConfig = {
        wheels: [
            { data: hoursData },
            { data: minutesData },
            { data: secondsData }
        ],
        title: '時刻を選択(UTC)',
        connector: ':', 
        callback: function(indexArr, data) {}
    };

    // 出発用ピッカー初期化
    try {
        startPicker = new MobileSelect({
            ...pickerConfig,
            trigger: '#mobile-start-trigger', 
        });
    } catch (e) {
        console.warn('MobileSelect init failed for start:', e);
    }

    // 到着用ピッカー初期化
    try {
        targetPicker = new MobileSelect({
            ...pickerConfig,
            trigger: '#mobile-target-trigger',
        });
    } catch (e) {
        console.warn('MobileSelect init failed for target:', e);
    }


    // --- イベントリスナー ---
    addBtn.addEventListener('click', addParticipantRow);
    calcBtn.addEventListener('click', calculateDepartures);

    // タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            currentMode = tabId;
            resultsDiv.innerHTML = ''; 
        });
    });

    // 集結時間ボタン
    rallyTimeButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('rally-time-btn')) {
            rallyTimeButtons.querySelectorAll('.rally-time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
        }
    });

    // 現在時刻取得 (数値で返す)
    function getNowTimeNum() {
        const now = new Date();
        return {
            h: now.getUTCHours(),
            m: now.getUTCMinutes(),
            s: now.getUTCSeconds()
        };
    }

    // ヘルパー: PC用入力欄とピッカーの両方の値を更新する関数【修正】
    function updateAllInputs(timeNum, pcH, pcM, pcS, picker) {
        // 1. PC用入力欄を更新
        pcH.value = padZero(timeNum.h);
        pcM.value = padZero(timeNum.m);
        pcS.value = padZero(timeNum.s);

        // 2. ピッカーが存在すればピッカーの位置も合わせる
        if (picker && typeof picker.locatePosition === 'function') {
            picker.locatePosition(0, timeNum.h);
            picker.locatePosition(1, timeNum.m);
            picker.locatePosition(2, timeNum.s);
        }
    }

    // 現在時刻セット (出発)
    setNowStartBtn.addEventListener('click', () => {
        const t = getNowTimeNum();
        updateAllInputs(t, startHH, startMM, startSS, startPicker);
    });

    // 現在時刻セット (到着)
    setNowTargetBtn.addEventListener('click', () => {
        const t = getNowTimeNum();
        updateAllInputs(t, targetHH, targetMM, targetSS, targetPicker);
    });

    function updateCurrentTime() {
        const now = new Date();
        const utcTimeString = now.toLocaleTimeString('ja-JP', { timeZone: 'UTC', hour12: false });
        if (utcTimeDisplay) utcTimeDisplay.textContent = `現在時刻(UTC): ${utcTimeString}`;
    }
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();

    function addParticipantRow() {
        const row = document.createElement('div');
        row.className = 'participant-row';
        row.innerHTML = `
            <input type="text" placeholder="名前" class="name" style="grid-area: name;">
            <input type="number" placeholder="目的地までの秒数" class="travel-time" style="grid-area: time;">
            <button class="remove-btn" style="grid-area: remove;">&times;</button>
        `;
        row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
        participantsList.appendChild(row);
    }
    // 初期1行
    addParticipantRow();

    //---入力値を取得する関数 (PC/スマホ自動判定)---//
    function getTimeFromInputs(pcH, pcM, pcS, picker) {
        // その瞬間の画面幅で判定
        const isMobile = window.innerWidth <= 480;

        if (isMobile) {
            // スマホ (ピッカーから取得)
            // ピッカーが正しく初期化されていない場合はエラー
            if (!picker || typeof picker.getValue !== 'function') return null;

            const val = picker.getValue();
            if (!val || val.length !== 3) return null;

            const h = parseInt(val[0], 10);
            const m = parseInt(val[1], 10);
            const s = parseInt(val[2], 10);
            if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
            return { h, m, s };

        } else {
            // PC (Inputから取得)
            const h = parseInt(pcH.value, 10);
            const m = parseInt(pcM.value, 10);
            const s = parseInt(pcS.value, 10);
            if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
            if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
            return { h, m, s };
        }
    }

    function calculateDepartures() {
        let errorMessages = [];
        resultsDiv.innerHTML = ''; 

        const activeRallyButton = rallyTimeButtons.querySelector('.rally-time-btn.active');
        const rallyTimeSeconds = activeRallyButton ? parseInt(activeRallyButton.dataset.value, 10) : 60; 

        const participants = [];
        const rows = participantsList.querySelectorAll('.participant-row');
        let maxTravelTime = -1;

        if (rows.length === 0) errorMessages.push('参加者が1人も追加されていません。');

        rows.forEach((row, index) => {
            const name = row.querySelector('.name').value.trim() || `参加者 ${index + 1}`;
            const travelTime = parseInt(row.querySelector('.travel-time').value, 10);
            if (isNaN(travelTime) || travelTime < 0) {
                errorMessages.push(`参加者 ${name}: 秒数(0以上) が無効です。`);
            } else {
                if (travelTime > maxTravelTime) maxTravelTime = travelTime;
                participants.push({ name, travelTime });
            }
        });
        
        if (maxTravelTime === -1 && rows.length > 0) errorMessages.push('有効な移動時間の参加者がいません。');

        let targetArrivalTime = null;
        const now = new Date();

        // モードに応じて時刻を取得
        let timeVal = null;
        if (currentMode === 'mode-start') {
            timeVal = getTimeFromInputs(startHH, startMM, startSS, startPicker);
        } else {
            timeVal = getTimeFromInputs(targetHH, targetMM, targetSS, targetPicker);
        }

        // 時刻取得エラーのチェック
        if (!timeVal) {
            // スマホでピッカーが動いていない場合もここに来る
            errorMessages.push(currentMode === 'mode-start' ? '出発予定時刻を正しく入力してください。' : '目標到着時刻を正しく入力してください。');
        }

        if (errorMessages.length > 0) { showErrors(errorMessages); return; }

        // 計算処理
        if (currentMode === 'mode-start') {
            const baseDepartureTime = new Date(now.getTime());
            baseDepartureTime.setUTCHours(timeVal.h, timeVal.m, timeVal.s, 0);
            
            if (baseDepartureTime.getTime() < now.getTime()) {
                errorMessages.push('出発予定時刻が現在時刻より過去です。未来の時刻を入力してください。');
            } else {
                targetArrivalTime = new Date(baseDepartureTime.getTime() + (maxTravelTime * 1000) + (rallyTimeSeconds * 1000));
            }
        } else {
            targetArrivalTime = new Date(now.getTime());
            targetArrivalTime.setUTCHours(timeVal.h, timeVal.m, timeVal.s, 0);
            if (targetArrivalTime.getTime() < now.getTime()) {
                errorMessages.push('目標到着時刻が現在時刻より過去です。未来の時刻を入力してください。');
            }
        }

        if (errorMessages.length > 0) { showErrors(errorMessages); return; }

        const departureList = [];
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            const targetDepartureTime = new Date(targetArrivalTime.getTime() - (rallyTimeSeconds * 1000) - p.travelTime * 1000);
            if (targetDepartureTime.getTime() < now.getTime()) {
                errorMessages.push(`「${p.name}」の出発時刻が過去になってしまいます。間に合いません。`);
            }
            departureList.push({ name: p.name, departureTime: targetDepartureTime });
        }

        if (errorMessages.length > 0) { showErrors(errorMessages); return; }
        
        departureList.sort((a, b) => a.departureTime - b.departureTime);

        let resultsHTML = `
            <p style="font-size: 0.9em; color: #555; background: #f8f8f8; padding: 10px; border-radius: 6px;">              
                全員の目標到着時刻: <strong>${formatTimeUTC(targetArrivalTime)}</strong> (JST: ${formatTimeLocal(targetArrivalTime)})
            </p>
            <ul>
        `;
        departureList.forEach((p, index) => {
            resultsHTML += `
                <li>
                    <strong>${index + 1}. ${p.name}</strong> <br>
                    出発すべき時刻: <strong>${formatTimeUTC(p.departureTime)}</strong> (JST: ${formatTimeLocal(p.departureTime)})
                </li>
            `;
        });
        resultsHTML += '</ul>';
        resultsDiv.innerHTML = resultsHTML;
    }

    function showErrors(messages) {
        let errorHTML = '<div class="error-message"><h4>入力・計算エラー</h4><ul>';
        messages.forEach(msg => { errorHTML += `<li>${msg}</li>`; });
        errorHTML += '</ul></div>';
        resultsDiv.innerHTML = errorHTML;
    }

    function formatTimeLocal(date) { return date.toLocaleTimeString('ja-JP', { hour12: false }); }
    function formatTimeUTC(date) { return date.toLocaleTimeString('ja-JP', { timeZone: 'UTC', hour12: false }); }
});
