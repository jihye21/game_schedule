const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJJxfR2S0-JWvEUIxjpB12JUhKsUQ8lF8-UknzadnBOmrqQa8Lv16ZYPgFBm9e6BFFOg/exec";

let saveTimeout = null;

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
        return defaultGroups;
    }

    window.location.href = "404.html";
    return [];
}

// 현재 선택된 그룹 ID 가져오기/저장하기
function getCurrentGroupId() {
    const urlParams = new URLSearchParams(window.location.search);

    return urlParams.get("group") || (defaultGroups[0] ? defaultGroups[0].id : "group_1");
}

function setCurrentGroupId(id) {
    const familyKey = "game_schedule_current_id_" + getCurrentFamilyId();
    localStorage.setItem(familyKey, id);

    if (typeof renderGroupSelector === "function") renderGroupSelector();
}

// 로컬스토리지
async function getState() {
    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    let groups = [];
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
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
        groups = (await getAllGroups()) || [];
    }

    if (groups.length === 0) {
        return null;
    }

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

    const familyId = getCurrentFamilyId();
    const cacheKey = "family_" + familyId;

    const index = groups.findIndex(g => g.id === state.id);
    
    if (index !== -1) {
        groups[index] = state;
    } else {
        groups.push(state);
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(groups));
    await saveStateToSheet(groups, familyId);
    
    if (typeof renderChild === "function") {
        await renderChild();
    }
}

// 화면 렌더링 함수
async function render() {
    let state = await getState();

    getPetInfoByLevel(state.level);

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

    const sortedSchedules = [...state.schedules].sort((a,b)=> {
        return a.time.localeCompare(b.time);
    });

    sortedSchedules.forEach((sch) => {
        const item = document.createElement("div");
        item.className = "schedule-time";
        item.innerHTML = `
            <span >⏰</span>
            <input type="time" value="${sch.time}" onchange="childUpdateSchedule(${sch.id}, 'time', this.value)">
            <input type="text" value="${sch.task}" onchange="childUpdateSchedule(${sch.id}, 'task', this.value)" placeholder="할 일 입력">
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
            btnHtml = `<button disabled style="background:#00b894;">완료🎉</button>`;
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

        const buyButton = s.isPurchased 
        ? `<button disabled style="background:#b2bec3; cursor:not-allowed;">구매완료</button>` 
        : `<button onclick="buyItem(${s.id}, ${s.price})">구매하기</button>`;

        sItem.innerHTML = `
            <h3>${s.name}</h3>
            <p>${s.price} G</p>
            ${buyButton}
        `;
        shopContainer.appendChild(sItem);
    });
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

// 레벨에 따른 펫 정보 정의
function getPetInfoByLevel(level) {
    if (level >= 30) {
        return { petName: "우주신 천상룡", petAvatar: "🌌" };
    } else if (level === 29) {
        return { petName: "차원 지배자", petAvatar: "🌀" };
    } else if (level === 28) {
        return { petName: "별을 품은 피닉스", petAvatar: "🔥" };
    } else if (level === 27) {
        return { petName: "태양의 신수", petAvatar: "☀️" };
    } else if (level === 26) {
        return { petName: "달빛의 수호자", petAvatar: "🌙" };
    } else if (level === 25) {
        return { petName: "얼어붙은 빙하지배자", petAvatar: "🧊" };
    } else if (level === 24) {
        return { petName: "심해의 크라켄", petAvatar: "🦑" };
    } else if (level === 23) {
        return { petName: "번개를 품은 독수리", petAvatar: "🦅" };
    } else if (level === 22) {
        return { petName: "정령의 왕", petAvatar: "🧚" };
    } else if (level === 21) {
        return { petName: "무쇠 기계 골렘", petAvatar: "🤖" };
    } else if (level === 20) {
        return { petName: "암흑의 유령 기사", petAvatar: "👻" };
    } else if (level === 19) {
        return { petName: "황금 사자왕", petAvatar: "🦁" };
    } else if (level === 18) {
        return { petName: "보석 유니콘", petAvatar: "🦄" };
    } else if (level === 17) {
        return { petName: "천상의 페가수스", petAvatar: "🐎" };
    } else if (level === 16) {
        return { petName: "지혜로운 부엉이", petAvatar: "🦉" };
    } else if (level === 15) {
        return { petName: "수호 늑대", petAvatar: "🐺" };
    } else if (level === 14) {
        return { petName: "곰돌이 대장", petAvatar: "🐻" };
    } else if (level === 13) {
        return { petName: "팬더 도사", petAvatar: "🐼" };
    } else if (level === 12) {
        return { petName: "날쌘돌이 치타", petAvatar: "🐆" };
    } else if (level === 11) {
        return { petName: "황금 드래곤", petAvatar: "🐉" };
    } else if (level === 10) {
        return { petName: "꼬마 아기 용", petAvatar: "🐲" };
    } else if (level === 9) {
        return { petName: "화염 불꽃여우", petAvatar: "🦊" };
    } else if (level === 8) {
        return { petName: "날개 달린 사자", petAvatar: "🦁" };
    } else if (level === 7) {
        return { petName: "멋진 유니콘", petAvatar: "🦄" };
    } else if (level === 6) {
        return { petName: "용감한 호랑이", petAvatar: "🐯" };
    } else if (level === 5) {
        return { petName: "귀여운 고양이", petAvatar: "🐱" };
    } else if (level === 4) {
        return { petName: "초록 토끼", petAvatar: "🐰" };
    } else if (level === 3) {
        return { petName: "귀여운 강아지", petAvatar: "🐶" };
    } else if (level === 2) {
        return { petName: "꿈틀거리는 애벌레", petAvatar: "🐛" };
    } else {
        return { petName: "귀여운 알", petAvatar: "🥚" };
    }
}

// 계획표 추가
async function childAddSchedule() {
    const time = document.getElementById("childScheduleTime").value.trim();
    const task = document.getElementById("childScheduleTask").value.trim();
    if (!time || !task) return alert("시간과 할 일을 입력하세요!");

    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const newId = state.schedules.length > 0 ? state.schedules[state.schedules.length - 1].id + 1 : 1;
    state.schedules.push({ id: newId, time, task });
    await saveGroupsToStorage(groups);
    
    document.getElementById("childScheduleTime").value = "";
    document.getElementById("childScheduleTask").value = "";
    render();
}

async function childUpdateSchedule(id, time, task) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const target = state.schedules.find(s=> s.id === id);
    if(target) {
        target[time] = task;
        await saveGroupsToStorage(groups);
    }
    render();
}

async function childDeleteSchedule(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    state.schedules = state.schedules.filter(s => s.id !== id);
    await saveGroupsToStorage(groups);
    render();
}

// 퀘스트 추가
async function childAddQuest() {
    const title = document.getElementById("childQuestTitle").value.trim();
    if (!title) return alert("숙제 이름을 입력해주세요");

    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const newId = state.quests.length > 0 ? state.quests[state.quests.length - 1].id + 1 : 1;
    state.quests.push({ id: newId, title, rewardExp: 0, rewardGold: 0, status: "none" });
    await saveGroupsToStorage(groups);

    document.getElementById("childQuestTitle").value = "";
    render();
}

async function childDeleteQuest(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    state.quests = state.quests.filter(q => q.id !== id);
    await saveGroupsToStorage(groups);
    render();
}

// 숙제 완료 요청 함수
async function requestQuest(id) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    const q = state.quests.find(item => item.id === id);
    if (q) {
        q.status = "requested";
        await saveGroupsToStorage(groups);
        alert("확인해주세요");
        render();
    }
}

// 상점 아이템 구매 함수
async function buyItem(id, price) {
    let groups = await getAllGroups();
    const currentId = getCurrentGroupId();
    let state = groups.find(g=>g.id === currentId);

    if(!state) return;

    if (state.gold >= price) {
        state.gold -= price;

        //아이템 구매 상태를 true로 변경
        const targetItem = state.shop.find(s => s.id === id);
        if (targetItem) {
            targetItem.isPurchased = true;
        }

        await saveGroupsToStorage(groups);
        alert("상점 아이템을 구매했습니다🎉");
        render();
    } else {
        alert("골드가 부족해요");
    }
}

// 초기 실행
render();