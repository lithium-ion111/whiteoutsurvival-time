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

// -- 出発時刻用要素 --
const startHH = document.getElementById('start-hh');
const startMM = document.getElementById('start-mm');
const startSS = document.getElementById('start-ss');
const mStartHH = document.getElementById('mobile-start-hh');
const mStartMM = document.getElementById('mobile-start-mm');
const mStartSS = document.getElementById('mobile-start-ss');
const setNowStartBtn = document.getElementById('set-now-start-btn');
// -- 到着時刻用要素 --
const targetHH = document.getElementById('target-hh');
const targetMM = document.getElementById('target-mm');
const targetSS = document.getElementById('target-ss');
const mTargetHH = document.getElementById('mobile-target-hh');
const mTargetMM = document.getElementById('mobile-target-mm');
const mTargetSS = document.getElementById('mobile-target-ss');
const setNowTargetBtn = document.getElementById('set-now-target-btn');

const rallyTimeButtons = document.getElementById('rally-time-buttons');

// --- 0埋めヘルパー ---
function padZero(num) {
return num.toString().padStart(2, '0');
}

// --- ★初期化: セレクトボックスの選択肢生成 ---
function initSelectOptions() {
// 選択肢を追加するヘルパー
const populate = (elem, max) => {
elem.innerHTML = ''; // 一旦クリア
for (let i = 0; i <= max; i++) {
const opt = document.createElement('option');
opt.value = i; // 値は数値で保持
opt.textContent = padZero(i); // 表示は0埋め
elem.appendChild(opt);
}
};

// 時(0-23), 分(0-59), 秒(0-59)
populate(mStartHH, 23);
populate(mStartMM, 59);
populate(mStartSS, 59);

populate(mTargetHH, 23);
populate(mTargetMM, 59);
populate(mTargetSS, 59);
}
initSelectOptions();

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

// 現在時刻取得
function getNowTime() {
const now = new Date();
return {
h: padZero(now.getUTCHours()),
m: padZero(now.getUTCMinutes()),
s: padZero(now.getUTCSeconds())
};
}

// ヘルパー: PCとスマホ両方に値をセット
function setTimeBoth(val, pcElem, mobElem) {
// 数値として扱うためにparseIntしてからセット
const numVal = parseInt(val, 10);
pcElem.value = numVal; // PC用 (input type="number")
mobElem.value = numVal; // スマホ用 (select)
}

// 現在時刻セット (出発)
setNowStartBtn.addEventListener('click', () => {
const t = getNowTime();
setTimeBoth(t.h, startHH, mStartHH);
setTimeBoth(t.m, startMM, mStartMM);
setTimeBoth(t.s, startSS, mStartSS);
});

// 現在時刻セット (到着)
setNowTargetBtn.addEventListener('click', () => {
const t = getNowTime();
setTimeBoth(t.h, targetHH, mTargetHH);
setTimeBoth(t.m, targetMM, mTargetMM);
setTimeBoth(t.s, targetSS, mTargetSS);
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
function getTimeFromInputs(pcH, pcM, pcS, mobH, mobM, mobS) {
const isMobile = window.innerWidth <= 480;

if (isMobile) {
// スマホ (Select)
const h = parseInt(mobH.value, 10);
const m = parseInt(mobM.value, 10);
const s = parseInt(mobS.value, 10);
if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
return { h, m, s };
} else {
// PC (Input)
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

if (currentMode === 'mode-start') {
// 出発時刻指定
const timeVal = getTimeFromInputs(startHH, startMM, startSS, mStartHH, mStartMM, mStartSS);
if (!timeVal) {
errorMessages.push('出発予定時刻を正しく入力してください。');
} else {
const baseDepartureTime = new Date(now.getTime());
baseDepartureTime.setUTCHours(timeVal.h, timeVal.m, timeVal.s, 0);
if (baseDepartureTime.getTime() < now.getTime()) {
errorMessages.push('出発予定時刻が現在時刻より過去です。未来の時刻を入力してください。');
} else {
targetArrivalTime = new Date(baseDepartureTime.getTime() + (maxTravelTime * 1000) + (rallyTimeSeconds * 1000));
}
}
} else {
// 到着時刻指定
const timeVal = getTimeFromInputs(targetHH, targetMM, targetSS, mTargetHH, mTargetMM, mTargetSS);
if (!timeVal) {
errorMessages.push('目標到着時刻を正しく入力してください。');
} else {
targetArrivalTime = new Date(now.getTime());
targetArrivalTime.setUTCHours(timeVal.h, timeVal.m, timeVal.s, 0);
if (targetArrivalTime.getTime() < now.getTime()) {
errorMessages.push('目標到着時刻が現在時刻より過去です。未来の時刻を入力してください。');
}
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
