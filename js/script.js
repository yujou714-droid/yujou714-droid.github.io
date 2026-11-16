// 找到遊戲畫面和玩家角色
const gameScreen = document.querySelector(".game-screen");
const player = document.querySelector(".player");
const coinLayer = document.querySelector(".coin-layer");

// 記錄角色目前的水平位置
let playerX = gameScreen.clientWidth / 2;
// 角色目前向上移動的距離
let playerY = 0;
let cameraY = 0;

// 金幣資料
const coins = [];
// 金幣總數
const totalCoins = 100;
// 已收集的金幣數量
let collectedCoins = 0;

// 每次點擊上升的距離
const climbSpeed = 100;
const worldHeight = gameScreen.clientWidth * (10000 / 1728);
coinLayer.style.height = worldHeight + "px";

// 自動生成金幣
function createCoins() {
  // ===== 主要金幣群組 =====
  const groupCount = 15;
  const coinsPerGroup = 5;

  // 每組之間的平均高度距離
  const groupSpacing = (worldHeight - 700) / (groupCount - 1);

  for (let i = 0; i < groupCount; i++) {
    // 每組金幣的高度，加入少量隨機變化
    const groupY = 350 + i * groupSpacing + (Math.random() * 100 - 50);

    // 每組的中心水平位置
    const centerX = 120 + Math.random() * (gameScreen.clientWidth - 240);

    // 隨機選擇排列形狀
    const shape = Math.floor(Math.random() * 3);

    for (let j = 0; j < coinsPerGroup; j++) {
      // 金幣相對於群組中心的水平偏移
      const offsetX = (j - 2) * 44;

      let offsetY = 0;

      // 0：橫排
      if (shape === 0) {
        offsetY = 0;
      }

      // 1：斜排
      if (shape === 1) {
        offsetY = (j - 2) * 22;
      }

      // 2：弧形
      if (shape === 2) {
        const arcPositions = [-40, -15, 0, -15, -40];
        offsetY = arcPositions[j];
      }

      // 建立這枚金幣
      addCoin(centerX + offsetX, groupY + offsetY);
    }
  }

  // ===== 零散金幣 =====
  const scatteredCount = 25;

  for (let i = 0; i < scatteredCount; i++) {
    const randomX = 25 + Math.random() * (gameScreen.clientWidth - 50);

    const randomY = 150 + Math.random() * (worldHeight - 300);

    addCoin(randomX, randomY);
  }
}

// 建立單枚金幣
function addCoin(x, y) {
  const coinElement = document.createElement("div");
  coinElement.classList.add("coin");

  coinElement.style.left = x + "px";
  coinElement.style.bottom = y + "px";

  coinLayer.appendChild(coinElement);

  coins.push({
    x: x,
    y: y,
    collected: false,
    element: coinElement,
  });
}

// 執行金幣生成
createCoins();
console.log("目前生成的金幣總數：", coins.length);
console.log("金幣總數：", coins.length);
console.log("背景世界高度：", worldHeight);
console.log("金幣圖層高度：", coinLayer.clientHeight);

// 角色移動速度
const moveSpeed = 5;

// 記錄目前有沒有按住方向鍵
let movingLeft = false;
let movingRight = false;

// 設定角色初始位置在畫面中央
player.style.left = playerX + "px";

// 按下鍵盤
document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowLeft") {
    movingLeft = true;
    event.preventDefault();
  }

  if (event.key === "ArrowRight") {
    movingRight = true;
    event.preventDefault();
  }
});

// 放開鍵盤
document.addEventListener("keyup", function (event) {
  if (event.key === "ArrowLeft") {
    movingLeft = false;
  }

  if (event.key === "ArrowRight") {
    movingRight = false;
  }
});

gameScreen.addEventListener("click", function () {
  // 累積角色上升的距離
  playerY = Math.min(playerY + climbSpeed, worldHeight - player.offsetHeight);

  // 計算角色在畫面中央時的底部位置
  const centerBottom = (gameScreen.clientHeight - player.offsetHeight) / 2;

  // 計算鏡頭需要移動的距離
  cameraY = Math.min(
    Math.max(0, playerY - centerBottom),
    worldHeight - gameScreen.clientHeight,
  );
  console.log({
    playerY: playerY,
    worldHeight: worldHeight,
    screenHeight: gameScreen.clientHeight,
    maxCameraY: worldHeight - gameScreen.clientHeight,
    cameraY: cameraY,
  });
  // 角色尚未到達中央時，正常向上移動
  // 到達中央後，角色維持在中央
  player.style.bottom = playerY - cameraY + "px";

  // 背景向下移動，呈現鏡頭向上跟隨的效果
  gameScreen.style.backgroundPositionY = `calc(100% + ${cameraY}px)`;

  // 金幣圖層跟隨鏡頭移動
  coinLayer.style.bottom = -cameraY + "px";
});

// 持續更新角色位置
function movePlayer() {
  if (movingLeft) {
    playerX -= moveSpeed;
    player.style.backgroundColor = "yellow";
  }

  if (movingRight) {
    playerX += moveSpeed;
    player.style.backgroundColor = "purple";
  }

  if (!movingLeft && !movingRight) {
    player.style.backgroundColor = "red";
  }

  // 暫時限制角色不要超出遊戲畫面
  const halfWidth = player.offsetWidth / 2;

  playerX = Math.max(
    halfWidth,
    Math.min(gameScreen.clientWidth - halfWidth, playerX),
  );

  // 更新角色位置
  player.style.left = playerX + "px";

  requestAnimationFrame(movePlayer);
}

// 開始執行移動更新
movePlayer();
