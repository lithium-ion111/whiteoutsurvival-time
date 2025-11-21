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

    // -- 入力要素 --
    const startInputs = { h: 'start-hh', m: 'start-mm', s: 'start-ss', mh: 'mobile-start-hh', mm: 'mobile-start-mm', ms: 'mobile-start-ss' };
    const targetInputs = { h: 'target-hh', m: 'target-mm', s: 'target-ss', mh: 'mobile-target-hh', mm: 'mobile-target-mm', ms: 'mobile-target-ss' };
    const rallyTimeButtons = document.getElementById('rally-time-buttons');

    // --- 0埋めヘルパー ---
    const padZero = (num) => num.toString().padStart(2, '0');

    // --- 初期化: セレクトボックス生成 ---
    function initSelectOptions() {
        const populate = (id, max) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.innerHTML = '';
            for (let i = 0; i <= max; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = padZero(i);
                el.appendChild(opt);
            }
        };
        ['mobile-start', 'mobile-target'].forEach(p => {
            populate(`${p}-hh`, 23);
            populate(`${p}-mm`, 59);
            populate(`${p}-ss`, 59);
        });
    }
    initSelectOptions();

    // --- イベント: タブ切り替え ---
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

    // --- イベント: 集結時間選択 ---
    rallyTimeButtons.addEventListener('click', (e) => {
        if (e.target.classList.contains('rally-time-btn')) {
            rallyTimeButtons.querySelectorAll('.rally-time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    // --- 時刻同期関連 ---
    function getNowTime() {
        const now = new Date();
        return { h: now.getUTCHours(), m: now.getUTCMinutes(), s: now.getUTCSeconds() };
    }

    function setTimeInputs(prefix, t) {
        document.getElementById(`${prefix}-hh`).value = t.h;
        document.getElementById(`${prefix}-mm`).value = t.m;
        document.getElementById(`${prefix}-ss`).value = t.s;
        document.getElementById(`mobile-${prefix}-hh`).value = t.h;
        document.getElementById(`mobile-${prefix}-mm`).value = t.m;
        document.getElementById(`mobile-${prefix}-ss`).value = t.s;
    }

    document.getElementById('set-now-start-btn').addEventListener('click', () => setTimeInputs('start', getNowTime()));
    document.getElementById('set-now-target-btn').addEventListener('click', () => setTimeInputs('target', getNowTime()));

    // 時計更新
    setInterval(() => {
        const now = new Date();
        utcTimeDisplay.textContent = `現在時刻(UTC): ${now.toLocaleTimeString('ja-JP', { timeZone: 'UTC', hour12: false })}`;
    }, 1000);

    // --- 参加者行の追加 ---
    function addParticipantRow() {
        const row = document.createElement('div');
        row.className = 'participant-row';
        row.innerHTML = `
            <input type="text" placeholder="名前" class="name" style="grid-area: name;">
            <input type="number" placeholder="行軍時間(秒)" class="travel-time" style="grid-area: time;">
            <button class="remove-btn" style="grid-area: remove;">×</button>
        `;
        row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
        participantsList.appendChild(row);
    }
    addBtn.addEventListener('click', addParticipantRow);
    addParticipantRow();

    // --- 入力取得 ---
    function getTimeValue(ids) {
        const isMobile = window.getComputedStyle(document.querySelector('.mobile-view')).display !== 'none';
        const hId = isMobile ? ids.mh : ids.h;
        const mId = isMobile ? ids.mm : ids.m;
        const sId = isMobile ? ids.ms : ids.s;

        const h = parseInt(document.getElementById(hId).value, 10);
        const m = parseInt(document.getElementById(mId).value, 10);
        const s = parseInt(document.getElementById(sId).value, 10);

        if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
        return { h, m, s };
    }

    // --- 時刻フォーマット関数 ---
    function formatTimeLocal(date) { return date.toLocaleTimeString('ja-JP', { hour12: false }); }
    function formatTimeUTC(date) { return date.toLocaleTimeString('ja-JP', { timeZone: 'UTC', hour12: false }); }

    // --- 計算 & 結果表示 ---
    calcBtn.addEventListener('click', () => {
        resultsDiv.innerHTML = '';
        const errors = [];
        
        // 1. 参加者取得
        const rows = participantsList.querySelectorAll('.participant-row');
        let participants = [];
        let maxTravel = 0;

        rows.forEach((row, i) => {
            const name = row.querySelector('.name').value.trim() || `参加者${i+1}`;
            const time = parseInt(row.querySelector('.travel-time').value, 10);
            if (isNaN(time) || time < 0) {
                errors.push(`${name}の秒数が不正です`);
            } else {
                participants.push({ name, time });
                if (time > maxTravel) maxTravel = time;
            }
        });

        if (participants.length === 0) errors.push("参加者がいません");

        // 2. 時間設定取得
        const rallySec = parseInt(document.querySelector('.rally-time-btn.active').dataset.value, 10);
        const rallyMin = rallySec / 60;
        const now = new Date();
        let targetDate = new Date();

        if (currentMode === 'mode-start') {
            const val = getTimeValue(startInputs);
            if (!val) {
                errors.push("出発時刻を入力してください");
            } else {
                const baseStart = new Date(now);
                baseStart.setUTCHours(val.h, val.m, val.s, 0);
                targetDate = new Date(baseStart.getTime() + (maxTravel * 1000) + (rallySec * 1000));
            }
        } else {
            const val = getTimeValue(targetInputs);
            if (!val) {
                errors.push("到着時刻を入力してください");
            } else {
                targetDate = new Date(now);
                targetDate.setUTCHours(val.h, val.m, val.s, 0);
            }
        }

        if (errors.length > 0) {
            resultsDiv.innerHTML = `<div class="error-message"><h4>エラー</h4><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul></div>`;
            return;
        }

        // 3. 計算とソート（出発が早い順）
        const calculatedList = participants.map(p => {
            const depTime = new Date(targetDate.getTime() - (rallySec * 1000) - (p.time * 1000));
            return {
                name: p.name,
                time: p.time,
                depTime: depTime
            };
        });

        // 出発時刻で昇順ソート (早い時間が先)
        calculatedList.sort((a, b) => a.depTime - b.depTime);

        // 4. テキスト生成とリスト生成
        // チャット用（UTCのみ）
        let chatText = `到着: ${formatTimeUTC(targetDate)} (UTC)\n集結: ${rallyMin}分\n----------------\n【出発時刻一覧】\n`;
        
        // 表示用リスト（詳細形式）
        let listHTML = `
        <p style="font-size: 0.9em; color: #555; background: #f8f8f8; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
            全員の目標到着時刻: <strong>${formatTimeUTC(targetDate)}</strong> (JST: ${formatTimeLocal(targetDate)})
        </p>
        <ul>
        `;

        calculatedList.forEach((p, index) => {
            // チャット用テキスト追加
            chatText += `${p.name}  ${formatTimeUTC(p.depTime)}\n`;

            // 表示用リスト追加
            listHTML += `
            <li>
                <strong>${index + 1}. ${p.name}</strong> <br>
                出発すべき時刻: <strong>${formatTimeUTC(p.depTime)}</strong> (JST: ${formatTimeLocal(p.depTime)})
            </li>
            `;
        });
        listHTML += '</ul>';

        // 5. 描画（リストを先に表示し、その下にチャットコピー機能）
        const container = document.createElement('div');
        
        // チャットコピーエリア
        const chatAreaHTML = `
            <div class="copy-section">
                <hr>
                <div class="result-actions">
                    <button id="copy-chat-btn" class="copy-btn">📋 チャット用にコピー</button>
                    <span id="copy-msg" class="copy-msg">コピーしました!</span>
                </div>
                <textarea id="chat-preview" class="chat-preview" readonly>${chatText}</textarea>
            </div>
        `;

        // リスト(listHTML) + コピーエリア(chatAreaHTML) の順で結合
        container.innerHTML = listHTML + chatAreaHTML;
        resultsDiv.appendChild(container);

        // 6. コピーボタン動作
        const copyBtn = document.getElementById('copy-chat-btn');
        const copyMsg = document.getElementById('copy-msg');
        const previewArea = document.getElementById('chat-preview');

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(chatText).then(() => {
                copyMsg.classList.add('show');
                setTimeout(() => copyMsg.classList.remove('show'), 2000);
                previewArea.select();
            }).catch(() => {
                alert('コピーに失敗しました');
            });
        });
    });
});
