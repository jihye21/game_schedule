const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxtrOAfwi1cYcwAc8wemvHIAjejkK5-N2C18c06o8iLet26fSZ0KOSJeYDC2aGVQgFocQ/exec";

// 홈 화면 제어 스크립트 (home.js)
const defaultGroups = [
    {
        id: "family_default_1",
        name: "우리 집 (기본)",
        level: 1,
        exp: 20,
        gold: 150,
        petName: "귀여운 아기 슬라임",
        petAvatar: "🟢",
        schedules: [{ id: 1, time: "10:00", task: "수학 문제집 풀기" }],
        quests: [{ id: 1, title: "수학 2페이지 풀기", rewardExp: 30, rewardGold: 30, status: "none" }],
        shop: [{ id: 1, name: "컴퓨터 30분 연장권", price: 300 }]
    }
];

function getAllFamilies() {
    const data = localStorage.getItem("game_schedule_all_groups");
    if (!data) {
        localStorage.setItem("game_schedule_all_groups", JSON.stringify(defaultGroups));
        return defaultGroups;
    }
    return JSON.parse(data);
}

// 새 가정 생성
async function createFamily() {
    const nameInput = document.getElementById("newFamilyName");
    const name = nameInput.value.trim();
    if (!name) {
        alert("집 이름을 입력해주세요!");
        return;
    }

    let families = await getAllFamilies();
    const newId = "family_" + Date.now();

    const newFamily = {
        id: newId,
        name: name,
        level: 1,
        exp: 0,
        gold: 100,
        petName: "귀여운 알",
        petAvatar: "🥚",
        schedules: [],
        quests: [],
        shop: [{ id: 1, name: "간식 획득권", price: 200 }]
    };

    await saveState(newFamily);

    nameInput.value = "";
    alert(`"${name}" 공간이 생성되었습니다! 🎉`);

    window.location.href = `parent.html?group=${newId}`;
}

async function saveState(state) {
    let groups = await getAllFamilies();
    
    if (!Array.isArray(groups)) {
        groups = defaultGroups;
    }

    const index = groups.findIndex(g => g.id === state.id);
    if (index !== -1) {
        groups[index] = state;
    } else {
        groups.push(state);
    }
    
    const familyId = state.id;
    
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
                action: "save",
                familyId: familyId,
                groups: groups
            })
        });
        
        const result = await res.json();
        
        if (typeof renderParent === "function") {
            renderParent();
        }
        
        if (result.status !== "success") {
            console.error("구글 시트 저장 실패:", result.message);
            alert("저장에 실패했습니다: " + result.message);
        } else {
            console.log("구글 시트 저장 성공!");
        }
    } catch (error) {
        console.error("통신 에러 발생:", error);
        alert("서버 통신 중 오류가 발생했습니다.");
    }
}