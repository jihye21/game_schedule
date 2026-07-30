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

// 보호자 화면 렌더링 함수
function renderParent() {
    let state = getState();

    // 아이 상태
    document.getElementById("childStatusInfo").innerHTML = 
        `레벨: Lv.${state.level} | 골드: 🪙 ${state.gold}G | 펫: ${state.petAvatar} ${state.petName} (EXP: ${state.exp}/100)`;

    // 시간 계획표
    const scheduleContainer = document.getElementById("parentScheduleList");
    if (scheduleContainer) {
        scheduleContainer.innerHTML = "";
        state.schedules.forEach(sch => {
            const item = document.createElement("div");
            item.className = "shop-manage-item";
            item.innerHTML = `
                <span><b>[${sch.time}]</b> ${sch.task}</span>
                <button class="btn-danger" onclick="deleteScheduleItem(${sch.id})">삭제</button>
            `;
            scheduleContainer.appendChild(item);
        });
    }

    // 숙제 퀘스트 관리 리스트
    const questManageContainer = document.getElementById("parentQuestManageList");
    if (questManageContainer) {
        questManageContainer.innerHTML = "";
        state.quests.forEach(q => {
            const item = document.createElement("div");
            item.className = "shop-manage-item";
            item.innerHTML = `
                <span><b>${q.title}</b> (EXP +${q.rewardExp}, 🪙 ${q.rewardGold}G)</span>
                <button class="btn-danger" onclick="deleteQuestItem(${q.id})">삭제</button>
            `;
            questManageContainer.appendChild(item);
        });
    }

    // 숙제 승인 요청 리스트
    const questContainer = document.getElementById("parentQuestList");
    if (questContainer) {
        questContainer.innerHTML = "";
        state.quests.forEach(q => {
            let statusText = "진행 전";
            let actionBtn = `<span style="color:#b2bec3; font-size:12px;">대기중</span>`;

            if (q.status === "requested") {
                statusText = "승인 요청 🚨";
                actionBtn = `<button onclick="approveQuest(${q.id})">승인하기 ✅</button>`;
            } else if (q.status === "approved") {
                statusText = "승인 완료 🎉";
                actionBtn = `<span style="color:#00b894; font-size:12px; font-weight:bold;">완료</span>`;
            }

            const item = document.createElement("div");
            item.className = "parent-quest-item";
            item.innerHTML = `
                <div class="parent-quest-info">
                    <div class="title">${q.title}</div>
                    <div class="status">${statusText} (보상: EXP +${q.rewardExp}, 골드 +${q.rewardGold}G)</div>
                </div>
                ${actionBtn}
            `;
            questContainer.appendChild(item);
        });
    }

    // 상점 리스트
    const shopContainer = document.getElementById("parentShopList");
    if (shopContainer) {
        shopContainer.innerHTML = "";
        state.shop.forEach(s => {
            const sItem = document.createElement("div");
            sItem.className = "shop-manage-item";
            sItem.innerHTML = `
                <span><b>${s.name}</b> (🪙 ${s.price}G)</span>
                <button class="btn-danger" onclick="deleteShopItem(${s.id})">삭제</button>
            `;
            shopContainer.appendChild(sItem);
        });
    }
}

// --- 보호자 함수들 ---

// 시간 계획표 추가
function addScheduleItem() {
    let state = getState();
    const timeInput = document.getElementById("newScheduleTime");
    const taskInput = document.getElementById("newScheduleTask");
    const time = timeInput.value.trim();
    const task = taskInput.value.trim();

    if (!time || !task) {
        alert("시간과 할 일을 모두 입력해주세요");
        return;
    }

    const newId = state.schedules.length > 0 ? state.schedules[state.schedules.length - 1].id + 1 : 1;
    state.schedules.push({ id: newId, time, task });
    saveState(state);

    timeInput.value = "";
    taskInput.value = "";
    alert("새로운 계획이 추가되었습니다");
    renderParent();
}

// 시간 계획표 삭제
function deleteScheduleItem(id) {
    let state = getState();
    state.schedules = state.schedules.filter(item => item.id !== id);
    saveState(state);
    renderParent();
}

// 숙제 퀘스트 추가
function addQuestItem() {
    let state = getState();
    const titleInput = document.getElementById("newQuestTitle");
    const expInput = document.getElementById("newQuestExp");
    const goldInput = document.getElementById("newQuestGold");

    const title = titleInput.value.trim();
    const rewardExp = Number(expInput.value);
    const rewardGold = Number(goldInput.value);

    if (!title || !rewardExp || !rewardGold) {
        alert("이름과 보상(EXP, 골드)을 모두 입력해주세요");
        return;
    }

    const newId = state.quests.length > 0 ? state.quests[state.quests.length - 1].id + 1 : 1;
    state.quests.push({ id: newId, title, rewardExp, rewardGold, status: "none" });
    saveState(state);

    titleInput.value = "";
    expInput.value = "";
    goldInput.value = "";
    alert("새로운 숙제가 추가되었습니다");
    renderParent();
}

// 숙제 삭제
function deleteQuestItem(id) {
    let state = getState();
    state.quests = state.quests.filter(item => item.id !== id);
    saveState(state);
    renderParent();
}

// 숙제 승인 함수 (골드 및 경험치 지급 + 레벨업 체크)
function approveQuest(id) {
    let state = getState();
    const q = state.quests.find(item => item.id === id);
    if (q && q.status === "requested") {
        q.status = "approved";
        state.gold += q.rewardGold;
        state.exp += q.rewardExp;

        // 레벨업 판정 (100 EXP 마다 레벨 업)
        if (state.exp >= 100) {
            state.level += 1;
            state.exp -= 100;
            alert("펫이 레벨 업 했습니다");
        }

        saveState(state);
        alert(`"${q.title}" 숙제를 승인했습니다`);
        renderParent();
    }
}

// 상점 아이템 추가
function addShopItem() {
    let state = getState();
    const nameInput = document.getElementById("newItemName");
    const priceInput = document.getElementById("newItemPrice");
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name || !price) {
        alert("이름과 가격을 올바르게 입력해주세요");
        return;
    }

    const newId = state.shop.length > 0 ? state.shop[state.shop.length - 1].id + 1 : 1;
    state.shop.push({ id: newId, name, price });
    saveState(state);

    nameInput.value = "";
    priceInput.value = "";
    alert("새로운 아이템이 추가되었습니다");
    renderParent();
}

// 상점 아이템 삭제
function deleteShopItem(id) {
    let state = getState();
    state.shop = state.shop.filter(item => item.id !== id);
    saveState(state);
    renderParent();
}

// 초기 실행
renderParent();