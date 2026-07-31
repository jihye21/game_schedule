const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJJxfR2S0-JWvEUIxjpB12JUhKsUQ8lF8-UknzadnBOmrqQa8Lv16ZYPgFBm9e6BFFOg/exec";

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

// 새 가정 생성
async function createFamily() {
    const nameInput = document.getElementById("newFamilyName");
    const name = nameInput.value.trim();
    if (!name) {
        alert("집 이름을 입력해주세요!");
        return;
    }

    const newId = "family_" + Date.now();
    const newGroupId = "group_" + Date.now();

    const newFamily = {
        id: newGroupId,
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

    await saveStateToSheet([newFamily], newId);

    nameInput.value = "";
    alert(`"${name}" 공간이 생성되었습니다! 🎉`);

    window.location.href = `parent.html?group=${newId}`;
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

