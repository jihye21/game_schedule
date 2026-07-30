const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtrOAfwi1cYcwAc8wemvHIAjejkK5-N2C18c06o8iLet26fSZ0KOSJeYDC2aGVQgFocQ/exec";

// 현재 Family ID 가져오기
function getCurrentFamilyId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("family") || "default_family";
}

function getStorageKey() {
    return "game_schedule_groups_" + getCurrentFamilyId();
}

// 기본 데이터 구조
const defaultGroups = [
    {
        id: "group_1",
        name: "1번 그룹 (첫째)",
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
            { id: 1, title: "수학 2페이지 풀기", rewardExp: 30, rewardGold: 30, status: "none" }
        ],
        shop: [
            { id: 1, name: "컴퓨터 30분 연장권", price: 300 }
        ]
    }
];

// 전체 그룹 데이터를 가져오거나 초기화
async function getAllGroups() {
    const familyId = getCurrentFamilyId();

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "cors",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
                action: "get",
                familyId: familyId
            })
        });

        const result = await res.json();
        
        if (result.status === "success" && result.data) {
            return result.data;
        } 
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        return defaultGroups;
    }
}

// 현재 선택된 그룹 ID 가져오기/저장하기
function getCurrentGroupId() {
    const urlParams = new URLSearchParams(window.location.search);

    return urlParams.get("group") || (defaultGroups[0] ? defaultGroups[0].id : "group_1");
}

// 로컬스토리지
async function getState() {
    const groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let group = groups.find(g => g.id === currentId);

    if (!group) {
        group = groups[0];
        setCurrentGroupId(group.id);
    }
    
    return JSON.parse(JSON.stringify(group));
}

// 내부 저장 전용 헬퍼 함수
async function saveStateToSheet(groupsData, familyId) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            mode: "cors",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
                action: "save",
                familyId: familyId,
                groups: groupsData
            })
        });
    } catch (error) {
        console.error("구글 시트 저장 통신 에러:", error);
    }
}

async function saveState(state) {
    let groups = await getAllGroups();
    if (!Array.isArray(groups)) {
        groups = defaultGroups;
    }

    const index = groups.findIndex(g => g.id === state.id);
    
    if (index !== -1) {
        groups[index] = state;
    } else {
        groups.push(state);
    }
    
    const familyId = getCurrentFamilyId();
    await saveStateToSheet(groups, familyId);
    
    if (typeof renderChild === "function") {
        await renderChild();
    }
}

// 화면 렌더링 함수
async function render() {
    let state = await getState();

    // 상태창
    document.getElementById("levelText").innerText = `🐾 펫 레벨: Lv.${state.level}`;
    document.getElementById("goldText").innerText = `${state.gold} G`;
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
        let rewardText = q.rewardExp > 0 ? `보상: EXP + ${q.rewardExp} 
        / 골드 + ${q.rewardGold}G` : `보상: 검토 중`;
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
                <div class="quest-reward">${rewardText}</div>
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
            <p>${s.price} G</p>
            <button onclick="buyItem(${s.id}, ${s.price})">구매하기</button>
        `;
        shopContainer.appendChild(sItem);
    });
}

// 계획표 추가
async function childAddSchedule() {
    let state = await getState();
    const time = document.getElementById("childScheduleTime").value.trim();
    const task = document.getElementById("childScheduleTask").value.trim();
    if (!time || !task) return alert("시간과 할 일을 입력하세요!");

    const newId = state.schedules.length > 0 ? state.schedules[state.schedules.length - 1].id + 1 : 1;
    state.schedules.push({ id: newId, time, task });
    await saveState(state);
    
    document.getElementById("childScheduleTime").value = "";
    document.getElementById("childScheduleTask").value = "";
    render();
}

async function childDeleteSchedule(id) {
    let state = await getState();
    state.schedules = state.schedules.filter(s => s.id !== id);
    await saveState(state);
    render();
}

// 퀘스트 추가
async function childAddQuest() {
    let state = await getState();
    const title = document.getElementById("childQuestTitle").value.trim();
    if (!title) return alert("숙제 이름을 입력해주세요");

    const newId = state.quests.length > 0 ? state.quests[state.quests.length - 1].id + 1 : 1;
    state.quests.push({ id: newId, title, rewardExp: 0, rewardGold: 0, status: "none" });
    await saveState(state);

    document.getElementById("childQuestTitle").value = "";
    render();
}

async function childDeleteQuest(id) {
    let state = await getState();
    state.quests = state.quests.filter(q => q.id !== id);
    await saveState(state);
    render();
}

// 숙제 완료 요청 함수
async function requestQuest(id) {
    let state = await getState();
    const q = state.quests.find(item => item.id === id);
    if (q) {
        q.status = "requested";
        await saveState(state);
        alert("확인해주세요");
        render();
    }
}

// 상점 아이템 구매 함수
async function buyItem(id, price) {
    let state = await getState();
    if (state.gold >= price) {
        state.gold -= price;
        await saveState(state);
        alert("상점 아이템을 구매했습니다🎉");
        render();
    } else {
        alert("골드가 부족해요");
    }
}

// 초기 실행
render();