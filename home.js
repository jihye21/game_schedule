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
function createFamily() {
    const nameInput = document.getElementById("newFamilyName");
    const name = nameInput.value.trim();
    if (!name) {
        alert("집 이름을 입력해주세요!");
        return;
    }

    let families = getAllFamilies();
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

    families.push(newFamily);
    localStorage.setItem("game_schedule_all_groups", JSON.stringify(families));

    nameInput.value = "";
    alert(`"${name}" 공간이 생성되었습니다! 🎉`);

    window.location.href = `parent.html?group=${newId}`;
}
