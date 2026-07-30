// 기본 데이터 구조
const defaultState = {
    level: 1,
    exp: 20,
    gold: 150,
    petName: "귀여운 아기 슬라임",
    petAvatar: "🟢",
    schedules: [
        { id: 1, time: "10:00", task: "수학 문제집 풀기" },
        { id: 2, time: "14:00", task: "영어 단어 암기" }
    ],
    quests: [
        { id: 1, title: "수학 2페이지 풀기", rewardExp: 40, rewardGold: 50, status: "none" },
        { id: 2, title: "영어 단어 10개 외우기", rewardExp: 30, rewardGold: 30, status: "none" }
    ],
    shop: [
        { id: 1, name: "컴퓨터 30분 연장권", price: 300 },
        { id: 2, name: "원하는 간식 획득권", price: 500 }
    ]
};

// 로컬스토리지
function getState() {
    const data = localStorage.getItem("game_schedule_state");
    return data ? JSON.parse(data) : defaultState;
}

function saveState(state) {
    localStorage.setItem("game_schedule_state", JSON.stringify(state));
}

// 화면 렌더링 함수
function render() {
    let state = getState();

    // 상태창
    document.getElementById("levelText").innerText = `🐾 펫 레벨: Lv.${state.level}`;
    document.getElementById("goldText").innerText = `🪙 ${state.gold} G`;
    document.getElementById("expText").innerText = `${state.exp} / 100`;
    document.getElementById("expBar").style.width = `${state.exp}%`;
    
    document.getElementById("petAvatar").innerText = state.petAvatar;
    document.getElementById("petName").innerText = state.petName;

    // 시간표
    const scheduleContainer = document.getElementById("scheduleList");
    scheduleContainer.innerHTML = "";
    state.schedules.forEach((sch) => {
        const item = document.createElement("div");
        item.className = "schedule-item";
        item.innerHTML = `
            <span class="schedule-time">⏰ ${sch.time}</span>
            <span class="schedule-task">${sch.task}</span>
            <button style="background:#d63031; padding:4px 8px; font-size:11px;" onclick="childDeleteSchedule(${sch.id})">삭제</button>
        `;
        scheduleContainer.appendChild(item);
    });

    // 숙제
    const questContainer = document.getElementById("questList");
    questContainer.innerHTML = "";
    state.quests.forEach(q => {
        let btnHtml = "";
        if (q.status === "none") {
            btnHtml = `<button onclick="requestQuest(${q.id})">완료 요청</button>`;
        } else if (q.status === "requested") {
            btnHtml = `<button disabled style="background:#fdcb6e;">승인 대기중⏳</button>`;
        } else if (q.status === "approved") {
            btnHtml = `<button disabled style="background:#00b894;">완료 완료!🎉</button>`;
        }

        const qItem = document.createElement("div");
        qItem.className = "quest-item";
        qItem.innerHTML = `
            <div class="quest-info">
                <div class="quest-title">${q.title}</div>
                <div class="quest-reward">보상: EXP +${q.rewardExp} / 골드 +${q.rewardGold}G</div>
            </div>
            <div style="display:flex; gap:5px; align-items:center;">
                ${btnHtml}
                <button style="background:#d63031; padding:8px; font-size:11px;" onclick="childDeleteQuest(${q.id})">삭제</button>
            </div>
        `;
        questContainer.appendChild(qItem);
    });

    // 상점
    const shopContainer = document.getElementById("shopList");
    shopContainer.innerHTML = "";
    state.shop.forEach(s => {
        const sItem = document.createElement("div");
        sItem.className = "shop-item";
        sItem.innerHTML = `
            <h3>${s.name}</h3>
            <p>🪙 ${s.price} G</p>
            <button onclick="buyItem(${s.id}, ${s.price})">구매하기</button>
        `;
        shopContainer.appendChild(sItem);
    });
}

// 계획표 추가
function childAddSchedule() {
    let state = getState();
    const time = document.getElementById("childScheduleTime").value.trim();
    const task = document.getElementById("childScheduleTask").value.trim();
    if (!time || !task) return alert("시간과 할 일을 입력하세요!");

    const newId = state.schedules.length > 0 ? state.schedules[state.schedules.length - 1].id + 1 : 1;
    state.schedules.push({ id: newId, time, task });
    saveState(state);
    
    document.getElementById("childScheduleTime").value = "";
    document.getElementById("childScheduleTask").value = "";
    render();
}

function childDeleteSchedule(id) {
    let state = getState();
    state.schedules = state.schedules.filter(s => s.id !== id);
    saveState(state);
    render();
}

// 퀘스트 추가
function childAddQuest() {
    let state = getState();
    const title = document.getElementById("childQuestTitle").value.trim();
    const rewardExp = Number(document.getElementById("childQuestExp").value);
    const rewardGold = Number(document.getElementById("childQuestGold").value);
    if (!title || !rewardExp || !rewardGold) return alert("모든 항목을 입력해주세요");

    const newId = state.quests.length > 0 ? state.quests[state.quests.length - 1].id + 1 : 1;
    state.quests.push({ id: newId, title, rewardExp, rewardGold, status: "none" });
    saveState(state);

    document.getElementById("childQuestTitle").value = "";
    document.getElementById("childQuestExp").value = "";
    document.getElementById("childQuestGold").value = "";
    render();
}

function childDeleteQuest(id) {
    let state = getState();
    state.quests = state.quests.filter(q => q.id !== id);
    saveState(state);
    render();
}

// 숙제 완료 요청 함수
function requestQuest(id) {
    let state = getState();
    const q = state.quests.find(item => item.id === id);
    if (q) {
        q.status = "requested";
        saveState(state);
        alert("확인해주세요");
        render();
    }
}

// 상점 아이템 구매 함수
function buyItem(id, price) {
    let state = getState();
    if (state.gold >= price) {
        state.gold -= price;
        saveState(state);
        alert("상점 아이템을 구매했습니다🎉");
        render();
    } else {
        alert("골드가 부족해요");
    }
}

// 초기 실행
render();