const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJJxfR2S0-JWvEUIxjpB12JUhKsUQ8lF8-UknzadnBOmrqQa8Lv16ZYPgFBm9e6BFFOg/exec";

let saveTimeout = null;

// URL에서 groupId를 읽어오는 함수
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 현재 Family ID 가져오기
function getCurrentFamilyId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("group") || "default_family";
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

//백그라운드에서 서버 데이터를 가져오기
/*
async function syncFromServerInBackground(familyId, cacheKey){
    try{
        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({action: "get", familyId: familyId })
        });
        const result = await response.json();
        if(result.status === "success" && Array.isArray(result.data)) {
            localStorage.setItem(cacheKey, JSON.stringify(result.data));
        }
    } catch (e){
        //무시
    }
}*/

// 전체 그룹 데이터를 가져오거나 초기화
async function getAllGroups() {
    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    const cachedData = localStorage.getItem(cacheKey);
    if(cachedData){
        try {
            const parsed = JSON.parse(cachedData);
            if(Array.isArray(parsed)) return parsed;
            if(parsed && Array.isArray(parsed.groups)) {
                return parsed.groups;
            }
        } catch (e) {}
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "get",
                familyId: familyId
            })
        });
        const result = await response.json();
        
        if (result.status === "success" && Array.isArray(result.data) && result.data.length > 0) {
            const initialData = {
                timestamp: Date.now(),
                groups: result.data
            };
            localStorage.setItem(cacheKey, JSON.stringify(initialData));
            return result.data;
        } 
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
    
    window.location.href = "404.html";
    return [];
}

// 현재 선택된 그룹 ID 가져오기/저장하기
function getCurrentGroupId() {
    const familyKey = "game_schedule_current_id_" + getCurrentFamilyId();
    
    return localStorage.getItem(familyKey) || "";
}

function setCurrentGroupId(id) {
    const familyKey = "game_schedule_current_id_" + getCurrentFamilyId();
    localStorage.setItem(familyKey, id);

    if (typeof renderGroupSelector === "function") renderGroupSelector();
}

// 현재 활성화된 그룹 객체 가져오기
async function getCurrentGroup() {
    const groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let group = groups.find(g => g.id === currentId);
    if (!group) {
        group = groups[0];
        setCurrentGroupId(group.id);
    }
    return group;
}

// 현재 그룹 상태만 업데이트하여 저장하기
async function saveCurrentGroup(updatedGroup) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();

    const index = groups.findIndex(g => g.id === currentId);
    if (index !== -1) {
        groups[index] = updatedGroup;
        saveStateToSheet(groups, getCurrentFamilyId());
    }
}

// 그룹 선택 박스 렌더링
async function renderGroupSelector() {
    const select = document.getElementById("groupSelect");
    if (!select) return;
    
    const familyId = getCurrentFamilyId();
    const allGroups = await getAllGroups();
    const groups = Array.isArray(allGroups) ? allGroups : [];

    const currentId = getCurrentGroupId();
    select.innerHTML = "";
    groups.forEach(g => {
        const option = document.createElement("option");
        option.value = g.id;
        option.innerText = g.name;
        if (g.id === currentId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// 다른 그룹으로 전환
function changeGroup(groupId) {
    setCurrentGroupId(groupId);
    // 페이지 종류에 따라 적절한 렌더 함수 호출
    if (typeof render === "function") render();
    if (typeof renderParent === "function") renderParent();
}

// 새로운 그룹 추가
async function addNewGroup() {
    const name = prompt("새로운 그룹 이름을 입력하세요:", "새로운 그룹");
    if (!name) return;

    let groups = await getAllGroups();
    const newId = "group_" + Date.now();
    
    const newGroup = {
        id: newId,
        name: name,
        level: 1,
        exp: 0,
        gold: 0,
        petName: "귀여운 알",
        petAvatar: "🥚",
        schedules: [],
        quests: [],
        shop: []
    };

    groups.push(newGroup);
    
    const familyId = getCurrentFamilyId();
    saveStateToSheet(groups, familyId);

    setCurrentGroupId(newId);

    alert(`"${name}" 그룹이 생성되었습니다! 🎉`);

    if (typeof renderGroupSelector === "function") renderGroupSelector();
    if (typeof render === "function") render();
    if (typeof renderParent === "function") renderParent();
}

// 현재 선택된 그룹의 링크 복사
function copyChildLink() {
    const familyId = getCurrentFamilyId();
    const currentId = getCurrentGroupId();
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const childLink = `${baseUrl}child.html?family=${familyId}&group=${currentId}`;

    navigator.clipboard.writeText(childLink).then(() => {
        alert("자녀용 접속 링크가 복사되었습니다");
    }).catch(err => {
        prompt("링크 복사에 실패했습니다. 아래 주소를 직접 복사하세요:", childLink);
    });
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

async function deleteStateToSheet(familyId){
    try{
        await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
                action: "deleteSheet",
                familyId: familyId
            })
        });
    } catch (error) {
        console.error("구글 시트 행 삭제 통신 에러:" , error);
    }
}

// 현재 그룹 삭제 함수
async function deleteCurrentGroup() {
    let groups = await getAllGroups();

    const currentId = getCurrentGroupId();
    const currentGroup = groups.find(g => g.id === currentId);
    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    if (confirm(`정말 "${currentGroup ? currentGroup.name : '현재 그룹'}"을(를) 삭제하시겠습니까?`)) {
        groups = groups.filter(g => g.id !== currentId);
        
        if(groups.length === 0){
            localStorage.removeItem(cacheKey);
            await deleteStateToSheet(familyId);
            alert("그룹이 삭제되었습니다.");
            window.location.href = "index.html";
            return;
        }

        localStorage.setItem(cacheKey, JSON.stringify(groups));
        await saveStateToSheet(groups, familyId);

        setCurrentGroupId(groups[0].id);
        alert("그룹이 삭제되었습니다.");
        
        if (typeof render === "function") render();
        if (typeof renderParent === "function") renderParent();
    }
}

// 로컬스토리지
async function getState() {
    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    let groups = [];
    const cachedData = localStorage.getItem(cacheKey);

    if(cachedData){
        try {
            const parsed = JSON.parse(cachedData);
            if (Array.isArray(parsed)) {
                groups = parsed;
            } else if (parsed && Array.isArray(parsed.groups)) {
                groups = parsed.groups;
            }
        } catch (e) {
            console.error("캐시 파싱 에러:", e);
        }
    }

    if (!Array.isArray(groups) || groups.length === 0) {
        groups = await getAllGroups();
    }

    const currentId = getCurrentGroupId();
    let group = groups.find(g=>g.id === currentId);

    if(!group && groups.length > 0) {
        group = groups[0];
        setCurrentGroupId(group.id);
    }
    return group ? JSON.parse(JSON.stringify(group)) : null;
}

async function saveState(state) {
    let groups = await getAllGroups();
    
    if (!Array.isArray(groups)) {
        groups = [];
    }

    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    const index = groups.findIndex(g => g.id === state.id);
    if (index !== -1) {
        groups[index] = state;
    } else {
        groups.push(state);
    }

    localStorage.setItem(cacheKey, JSON.stringify(groups));
    
    saveStateToSheet(groups, familyId);
}

// 보호자 화면 렌더링 함수
async function renderParent() {
    renderGroupSelector();

    let state = await getState();

    // 아이 상태
    document.getElementById("childStatusInfo").innerHTML = 
        `레벨: Lv.${state.level} | 골드: ${state.gold}G | 펫: ${state.petAvatar} ${state.petName} (EXP: ${state.exp}/100)`;

    // 시간 계획표
    const scheduleContainer = document.getElementById("parentScheduleList");
    if (scheduleContainer) {
        scheduleContainer.innerHTML = "";
        state.schedules.forEach(sch => {
            const item = document.createElement("div");
            item.className = "shop-manage-item";
            item.innerHTML = `
                <div style="display:flex; gap:5px; flex:1; align-items:center;">
                    <input type="text" value="${sch.time}" style="width:60px; padding:4px; font-size:12px;" onchange="updateSchedule(${sch.id}, 'time', this.value)">
                    <input type="text" value="${sch.task}" style="flex:1; padding:4px; font-size:12px;" onchange="updateSchedule(${sch.id}, 'task', this.value)">
                </div>
                <button class="btn-danger" onclick="deleteScheduleItem(${sch.id})" style="margin-left:8px;">삭제</button>            `;
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
                <div style="display:flex; gap:4px; flex:1; align-items:center;">
                    <input type="text" value="${q.title}" style="flex:2; padding:4px; font-size:12px;" onchange="updateQuest(${q.id}, 'title', this.value)" placeholder="숙제 이름">
                    <input type="number" value="${q.rewardExp}" style="width:45px; padding:4px; font-size:12px;" onchange="updateQuest(${q.id}, 'rewardExp', this.value)" placeholder="EXP">
                    <input type="number" value="${q.rewardGold}" style="width:45px; padding:4px; font-size:12px;" onchange="updateQuest(${q.id}, 'rewardGold', this.value)" placeholder="골드">
                </div>
                <button class="btn-danger" onclick="deleteQuestItem(${q.id})" style="margin-left:8px;">삭제</button>            `;
            questManageContainer.appendChild(item);
        });
    }

    // 숙제 승인 요청 리스트
    const questContainer = document.getElementById("parentQuestList");
    if (questContainer) {
        questContainer.innerHTML = "";
        state.quests.forEach(q => {
            let actionArea = "";

            if (q.status === "none") {
                actionArea = `<span style="color:#b2bec3; font-size:12px;">아이 진행 중</span>`;
            } else if (q.status === "requested") {
                actionArea =`
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input type="number" id="exp-input-${q.id}" placeholder="EXP" style="width:45px; padding:4px; font-size:11px;" value="${q.rewardExp || 30}">
                        <input type="number" id="gold-input-${q.id}" placeholder="골드" style="width:45px; padding:4px; font-size:11px;" value="${q.rewardGold || 30}">
                        <button onclick="approveQuest(${q.id})" style="padding:6px 8px; font-size:11px;">승인✅</button>
                    </div>
                    `;
            } else if(q.status === "approved") {
                actionArea = `<span style="color:#00b894; font-size:12px; font-weight:bold;">승인완료 (EXP +${q.rewardExp}, 🪙 +${q.rewardGold}G)</span>`;            }

            const item = document.createElement("div");
            item.className = "parent-quest-item";
            item.innerHTML = `
                <div class="parent-quest-info">
                    <div class="title">${q.title}</div>
                    <div class="status">상태: ${q.status}</div>
                </div>
                ${actionArea}
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
                <div style="display:flex; gap:4px; flex:1; align-items:center;">
                    <input type="text" value="${s.name}" style="flex:2; padding:4px; font-size:12px;" onchange="updateShop(${s.id}, 'name', this.value)" placeholder="보상 이름">
                    <input type="number" value="${s.price}" style="flex:1; padding:4px; font-size:12px;" onchange="updateShop(${s.id}, 'price', this.value)" placeholder="가격">
                </div>
                <button class="btn-danger" onclick="deleteShopItem(${s.id})" style="margin-left:8px;">삭제</button>            `;
            shopContainer.appendChild(sItem);
        });
    }
}

async function saveGroupsToStorage(groups) {
    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;
    const timestamp = Date.now();

    const dateToSave = {
        timestamp: timestamp,
        groups: groups
    };

    localStorage.setItem(cacheKey, JSON.stringify(dateToSave));

    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        await saveStateToSheet(groups, familyId);
    }, 500);
}
// --- 보호자 함수들 ---

// 시간 계획표 추가
async function addScheduleItem() {
    const timeInput = document.getElementById("newScheduleTime");
    const taskInput = document.getElementById("newScheduleTask");
    const time = timeInput.value.trim();
    const task = taskInput.value.trim();

    if (!time || !task) {
        alert("시간과 할 일을 모두 입력해주세요");
        return;
    }

    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const newId = state.schedules.length > 0 ? state.schedules[state.schedules.length - 1].id + 1 : 1;
    state.schedules.push({ id: newId, time, task });
    
    await saveGroupsToStorage(groups);

    timeInput.value = "";
    taskInput.value = "";
    alert("새로운 계획이 추가되었습니다");
    renderParent();
}

//시간표 업데이트
async function updateSchedule(id, field, value) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;
    
    const target = state.schedules.find(s => s.id === id);
    if (target) {
        target[field] = value;
        await saveGroupsToStorage(groups);
    }
}

// 시간 계획표 삭제
async function deleteScheduleItem(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    state.schedules = state.schedules.filter(item => item.id !== id);
    await saveGroupsToStorage(groups);
    renderParent();
}

// 숙제 퀘스트 추가
async function addQuestItem() {
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

    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const newId = state.quests.length > 0 ? state.quests[state.quests.length - 1].id + 1 : 1;
    state.quests.push({ id: newId, title, rewardExp, rewardGold, status: "none" });
    
    await saveGroupsToStorage(groups);

    titleInput.value = "";
    expInput.value = "";
    goldInput.value = "";
    alert("새로운 숙제가 추가되었습니다");
    renderParent();
}

//숙제 업데이트
async function updateQuest(id, field, value) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const target = state.quests.find(q => q.id === id);
    if (target) {
        target[field] = (field === 'rewardExp' || field === 'rewardGold') ? Number(value) : value;
        await saveGroupsToStorage(groups);
    }
}

// 숙제 삭제
async function deleteQuestItem(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    state.quests = state.quests.filter(item => item.id !== id);
    await saveGroupsToStorage(groups);
    renderParent();
}

// 숙제 승인 함수 (골드 및 경험치 지급 + 레벨업 체크)
async function approveQuest(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const q = state.quests.find(item => item.id === id);
    if (q) {
        const expInput = document.getElementById(`exp-input-${id}`);
        const goldInput = document.getElementById(`gold-input-${id}`);

        const rewardExp = Number(expInput ? expInput.value : 30);
        const rewardGold = Number(goldInput ? goldInput.value : 30);

        if(!rewardExp || !rewardGold) {
            alert("지정할 EXP와 골드를 입력해주세요");
            return;
        }

        q.rewardExp = rewardExp;
        q.rewardGold = rewardGold;
        q.status = "approved";
        
        state.gold += rewardGold;
        state.exp += rewardExp;

        // 레벨업 판정 (100 EXP 마다 레벨 업)
        if (state.exp >= 100) {
            state.level += 1;
            state.exp -= 100;
            alert("펫이 레벨 업 했습니다");
        }

        await saveGroupsToStorage(groups);
        alert(`"${q.title}" 숙제를 승인하고 보상(EXP +${rewardExp}, 골드 + ${rewardGold}G을 지급했습니다)`);
        renderParent();
    }
}

// 상점 아이템 추가
async function addShopItem() {
    const nameInput = document.getElementById("newItemName");
    const priceInput = document.getElementById("newItemPrice");
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);

    if (!name || !price) {
        alert("이름과 가격을 올바르게 입력해주세요");
        return;
    }

    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const newId = state.shop.length > 0 ? state.shop[state.shop.length - 1].id + 1 : 1;
    state.shop.push({ id: newId, name, price });
    await saveGroupsToStorage(groups);

    nameInput.value = "";
    priceInput.value = "";
    alert("새로운 아이템이 추가되었습니다");
    renderParent();
}

//상점 아이템 업데이트
async function updateShop(id, field, value) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const target = state.shop.find(s => s.id === id);
    if (target) {
        target[field] = (field === 'price') ? Number(value) : value;
        await saveGroupsToStorage(groups);
    }
}

// 상점 아이템 삭제
async function deleteShopItem(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    state.shop = state.shop.filter(item => item.id !== id);
    await saveGroupsToStorage(groups);
    renderParent();
}

// 초기 실행
renderParent();