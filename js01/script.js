// 找到遊戲畫面和玩家角色
const gameScreen = document.querySelector(".game-screen");
const player = document.querySelector(".player");
const coinLayer = document.querySelector(".coin-layer");
const planeLayer = document.querySelector(".plane-layer");

let isIntroPlaying = false;
// 飛機事件設定
const planeTriggerHeight = 3000;
let planeTriggered = false;
// 開窗戶事件設定
const windowTriggerHeight = 6000;
let windowTriggered = false;
// 記錄飛機在遊戲世界中的固定高度
let planeWorldBottom = null;
let planeImage = null;
// 建立飛機事件
function showPlane() {
  planeImage = document.createElement("img");

  planeImage.src = "./img/event01_Airplane.gif";
  planeImage.classList.add("plane-event");

  // 飛機固定在觸發當下的遊戲世界高度
  planeImage.style.bottom = cameraY + gameScreen.clientHeight * 0.16 + "px";

  planeLayer.appendChild(planeImage);
}
// 建立開窗戶事件

function showWindow() {
  const windowImage = document.createElement("img");

  windowImage.src = "./img/windowsYH.gif";
  windowImage.classList.add("window-event");

  // 取得 6000px 高度對應的建築輪廓
  const pixelY = Math.max(
    0,
    Math.min(
      maskHeight - 1,
      Math.floor(
        ((worldHeight - windowTriggerHeight) / worldHeight) * maskHeight,
      ),
    ),
  );

  const leftEdge = buildingLeft[pixelY];
  const rightEdge = buildingRight[pixelY];

  // 確認該高度有建築
  if (leftEdge === undefined || rightEdge <= leftEdge) {
    console.warn("開窗事件高度沒有建築輪廓", pixelY);
    return;
  }

  // 換算成畫面寬度
  const buildingLeftX = (leftEdge / maskWidth) * gameScreen.clientWidth;

  const buildingRightX = (rightEdge / maskWidth) * gameScreen.clientWidth;

  const buildingWidth = buildingRightX - buildingLeftX;
  const centerX = (buildingLeftX + buildingRightX) / 2;

  // GIF 放在建築內部
  windowImage.style.width = buildingWidth * 1.3 + "px";
  windowImage.style.left = centerX + "px";

  // 固定在遊戲世界的 6000px 高度
  windowImage.style.bottom = windowTriggerHeight + "px";

  windowImage.onerror = function () {
    console.error("windowYH.gif 載入失敗，請檢查圖片路徑");
  };

  windowImage.onload = function () {
    console.log("開窗 GIF 載入成功！");
  };

  planeLayer.appendChild(windowImage);

  console.log("開窗事件已建立", {
    height: windowTriggerHeight,
    left: centerX,
    buildingWidth: buildingWidth,
  });
}

// 載入 101 透明 PNG，作為金幣生成範圍
const buildingMask = new Image();

// 儲存建築透明度資料
let buildingPixels = null;
// 縮小後的遮罩圖片尺寸
let maskWidth = 0;
let maskHeight = 0;
// 【101 建築輪廓】每一列的左右邊界
const buildingLeft = [];
const buildingRight = [];

// 等待 PNG 載入完成
buildingMask.onload = function () {
  // 建立一張暫時的畫布
  const maskCanvas = document.createElement("canvas");

  // 使用 PNG 原始尺寸
  maskCanvas.width = buildingMask.naturalWidth;
  maskCanvas.height = buildingMask.naturalHeight;
  // 【遮罩縮小 10 倍】
  maskWidth = Math.round(buildingMask.naturalWidth / 10);
  maskHeight = Math.round(buildingMask.naturalHeight / 10);

  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;

  // 取得畫布的繪圖工具
  const maskContext = maskCanvas.getContext("2d");

  // 把 PNG 畫到暫時畫布上
  maskContext.drawImage(buildingMask, 0, 0, maskWidth, maskHeight);

  // 讀取所有像素資料
  buildingPixels = maskContext.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height,
  );
  // 【預先計算 101 每個高度的左右邊界】
  for (let y = 0; y < maskHeight; y++) {
    let left = maskWidth;
    let right = -1;

    for (let x = 0; x < maskWidth; x++) {
      const alphaIndex = (y * maskWidth + x) * 4 + 3;
      const alpha = buildingPixels.data[alphaIndex];

      if (alpha >= 200) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }

    buildingLeft[y] = left;
    buildingRight[y] = right;
  }

  console.log("101 遮罩讀取成功！");
  console.log("圖片尺寸：", maskCanvas.width, maskCanvas.height);
  console.log("101 輪廓資料筆數：", buildingLeft.length);
  console.log("安全位置測試：");

  [0.1, 0.3, 0.5, 0.7, 0.9].forEach((ratio) => {
    console.log(
      ratio,
      isSafePosition(gameScreen.clientWidth / 2, worldHeight * ratio),
    );
  });
  createCoins();

  console.log("目前生成的金幣總數：", coins.length);
  console.log("金幣圖層高度：", coinLayer.clientHeight);
};

// 開始載入圖片
buildingMask.src = "./img/101_transparent.png";

// 記錄角色目前的水平位置
let playerX = gameScreen.clientWidth / 2;
// 角色目前向上移動的距離
let playerY = 0;
let cameraY = 0;
// 是否已經觸發結尾動畫
let endingStarted = false;

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
planeLayer.style.height = worldHeight + "px";

// 自動生成金幣
function createCoins() {
  // 【金幣排列】沿著 S 型路徑生成 100 枚金幣
  const targetCount = 100;

  // S 型路徑的左右擺動幅度
  const amplitude = gameScreen.clientWidth * 0.18;

  // 避免金幣太靠近世界上下邊界
  const topBottomMargin = 50;

  for (let i = 0; i < targetCount; i++) {
    // 金幣由下往上平均分布
    const randomY =
      topBottomMargin +
      (i / (targetCount - 1)) * (worldHeight - topBottomMargin * 2);

    // 計算 S 型曲線上的理想水平位置
    const progress = i / (targetCount - 1);

    const targetX =
      gameScreen.clientWidth / 2 + amplitude * Math.sin(progress * Math.PI * 2);

    // 從理想位置向左右尋找安全位置
    let safeX = null;

    for (let offset = 0; offset <= gameScreen.clientWidth / 2; offset += 5) {
      const candidates =
        offset === 0 ? [targetX] : [targetX - offset, targetX + offset];

      for (const candidateX of candidates) {
        if (isSafePosition(candidateX, randomY)) {
          if (!isOverlapping(candidateX, randomY)) {
            safeX = candidateX;
            break;
          }
        }
      }

      if (safeX !== null) break;
    }

    // 找到安全位置才建立金幣
    if (safeX !== null) {
      addCoin(safeX, randomY);
    }
  }
  console.log("已經執行到 createCoins 最後！");
  console.log("S 型金幣生成數量：", coins.length);
}

// 檢查金幣是否完整位於 101 建築範圍內
function isSafePosition(x, y) {
  // 檢查金幣是否完整位於 101 建築範圍內
  if (!buildingPixels) return false;

  const imageWidth = maskWidth;
  const imageHeight = maskHeight;
  const screenWidth = gameScreen.clientWidth;

  // 金幣尺寸與建築內縮安全距離
  const coinHalfSize = 18;
  const margin = 30;

  // 檢查金幣本身，加上四周 30px 的安全範圍
  for (
    let offsetX = -coinHalfSize - margin;
    offsetX <= coinHalfSize + margin;
    offsetX += 6
  ) {
    for (let offsetY = -margin; offsetY <= 36 + margin; offsetY += 6) {
      const sampleX = x + offsetX;
      const sampleY = y + offsetY;

      const pixelX = Math.floor((sampleX / screenWidth) * imageWidth);

      const pixelY = Math.floor(
        ((worldHeight - sampleY) / worldHeight) * imageHeight,
      );

      if (
        pixelX < 0 ||
        pixelX >= imageWidth ||
        pixelY < 0 ||
        pixelY >= imageHeight
      ) {
        return false;
      }

      const alphaIndex = (pixelY * imageWidth + pixelX) * 4 + 3;
      const alpha = buildingPixels.data[alphaIndex];

      if (alpha < 200) {
        return false;
      }
    }
  }

  return true;
}

// 【角色建築碰撞】依照 101 每個高度的實際輪廓判定
function isPlayerInsideBuilding(x, y) {
  if (!buildingPixels) return true;

  const halfWidth = player.offsetWidth / 2;
  const playerHeight = player.offsetHeight;
  const screenWidth = gameScreen.clientWidth;

  // 每隔 5px 檢查角色身體的高度
  for (let offsetY = 0; offsetY <= playerHeight; offsetY += 5) {
    const sampleY = y + offsetY;

    // 對應到 101 遮罩圖片的高度
    const pixelY = Math.max(
      0,
      Math.min(
        maskHeight - 1,
        Math.floor(((worldHeight - sampleY) / worldHeight) * maskHeight),
      ),
    );

    // 取得該高度的建築左右邊界
    const leftEdge = buildingLeft[pixelY];
    const rightEdge = buildingRight[pixelY];

    // 該高度沒有建築
    if (leftEdge === undefined || rightEdge < 0) {
      return false;
    }

    // 將圖片像素座標換算成遊戲畫面座標
    const buildingLeftX = (leftEdge / maskWidth) * screenWidth;
    const buildingRightX = (rightEdge / maskWidth) * screenWidth;

    // 檢查角色左右兩側有沒有超出建築
    if (x - halfWidth < buildingLeftX || x + halfWidth > buildingRightX) {
      return false;
    }
  }

  return true;
}

// 檢查金幣是否與其他金幣重疊
function isOverlapping(x, y) {
  const minDistance = 42;

  for (const coin of coins) {
    const distanceX = Math.abs(x - coin.x);
    const distanceY = Math.abs(y - coin.y);

    if (distanceX < minDistance && distanceY < minDistance) {
      return true;
    }
  }

  return false;
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
// 【金幣收集】檢查角色是否碰到金幣
function checkCoinCollision() {
  if (isIntroPlaying) return;
  const playerLeft = playerX - player.offsetWidth / 2;
  const playerRight = playerX + player.offsetWidth / 2;
  const playerBottom = playerY;
  const playerTop = playerY + player.offsetHeight;

  for (const coin of coins) {
    if (coin.collected) continue;

    const coinLeft = coin.x - 18;
    const coinRight = coin.x + 18;
    const coinBottom = coin.y;
    const coinTop = coin.y + 36;

    const isTouching =
      playerRight > coinLeft &&
      playerLeft < coinRight &&
      playerTop > coinBottom &&
      playerBottom < coinTop;

    if (isTouching) {
      coin.collected = true;
      coin.element.remove();

      collectedCoins++;

      document.querySelector("#coin-count").textContent = collectedCoins;
    }
  }
}

// 角色移動速度
const moveSpeed = 5;

// 記錄目前有沒有按住方向鍵
let movingLeft = false;
let movingRight = false;
// 角色目前是否正在播放上升動畫
let isClimbing = false;

// 上升動畫計時器
let climbingTimer1 = null;
let climbingTimer2 = null;
// 根據角色目前的動作切換圖片
function updatePlayerImage() {
  if (isIntroPlaying) {
    player.style.backgroundImage = 'url("./img/he_jumpjump.gif")';
    return;
  }
  if (movingLeft) {
    player.style.backgroundImage = 'url("./img/he_left.png")';
  } else if (movingRight) {
    player.style.backgroundImage = 'url("./img/he_right.png")';
  } else if (isClimbing) {
    player.style.backgroundImage = 'url("./img/he_up.png")';
  } else {
    player.style.backgroundImage = 'url("./img/he_default.png")';
  }
}

// 設定角色初始位置在畫面中央
player.style.left = playerX + "px";
updatePlayerImage();

// 按下鍵盤
document.addEventListener("keydown", function (event) {
  if (isIntroPlaying) return;
  if (event.key === "ArrowLeft") {
    movingLeft = true;
    event.preventDefault();
  }

  if (event.key === "ArrowRight") {
    movingRight = true;
    event.preventDefault();
  }

  updatePlayerImage();
});

// 放開鍵盤
document.addEventListener("keyup", function (event) {
  if (event.key === "ArrowLeft") {
    movingLeft = false;
  }

  if (event.key === "ArrowRight") {
    movingRight = false;
  }

  updatePlayerImage();
});

gameScreen.addEventListener("click", function () {
  if (isIntroPlaying) return;
  // 【角色上升動畫】
  clearTimeout(climbingTimer1);
  clearTimeout(climbingTimer2);

  // 第一格：回到待機姿勢
  isClimbing = false;
  updatePlayerImage();

  // 第二格：切換成上升姿勢
  climbingTimer1 = setTimeout(function () {
    isClimbing = true;
    updatePlayerImage();
  }, 100);

  // 第三格：回到待機姿勢
  climbingTimer2 = setTimeout(function () {
    isClimbing = false;
    updatePlayerImage();
  }, 250);
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
  if (playerY >= planeTriggerHeight && !planeTriggered) {
    planeTriggered = true;
    showPlane();
  }
  // 開窗戶事件：只觸發一次
  if (playerY >= windowTriggerHeight && !windowTriggered) {
    windowTriggered = true;
    showWindow();
  }
  player.style.bottom = playerY - cameraY + "px";

  // 背景向下移動，呈現鏡頭向上跟隨的效果
  gameScreen.style.backgroundPositionY = `calc(100% + ${cameraY}px)`;

  // 金幣圖層跟隨鏡頭移動
  coinLayer.style.bottom = -cameraY + "px";
  // 飛機圖層跟隨鏡頭移動
  planeLayer.style.bottom = -cameraY + "px";
});

// 持續更新角色位置
function movePlayer() {
  // 計算下一個水平位置
  let nextPlayerX = playerX;

  if (movingLeft) {
    nextPlayerX -= moveSpeed;
  }

  if (movingRight) {
    nextPlayerX += moveSpeed;
  }

  // 只有正在左右移動時，才進行建築碰撞檢查
  if (movingLeft || movingRight) {
    if (isPlayerInsideBuilding(nextPlayerX, playerY)) {
      playerX = nextPlayerX;
    }
  }

  // 暫時限制角色不要超出遊戲畫面
  const halfWidth = player.offsetWidth / 2;

  playerX = Math.max(
    halfWidth,
    Math.min(gameScreen.clientWidth - halfWidth, playerX),
  );

  // 更新角色位置
  player.style.left = playerX + "px";
  // 檢查角色是否碰到金幣
  checkCoinCollision();

  requestAnimationFrame(movePlayer);
}

// 開始執行移動更新
movePlayer();

// =========================
// 封面開始按鈕
// =========================

const coverScreen = document.querySelector("#cover-screen");
const startButton = document.querySelector("#start-button");
const startButtonImage = startButton.querySelector("img");

// 按下按鈕：切換 active 圖片
startButton.addEventListener("pointerdown", function () {
  startButtonImage.src = "./img/buttonstart_02.png";
});

// 放開按鈕：恢復 default 圖片
startButton.addEventListener("pointerup", function () {
  startButtonImage.src = "./img/buttonStart_01.png";
});

// 離開按鈕範圍：恢復 default 圖片
startButton.addEventListener("pointerleave", function () {
  startButtonImage.src = "./img/buttonStart_01.png";
});

// 點擊後播放開場動畫
startButton.addEventListener("click", function () {
  // 隱藏封面
  coverScreen.classList.add("hidden");

  // 鎖定遊戲操作
  isIntroPlaying = true;

  // 建立 101 開場 GIF
  const backgroundSlide = document.createElement("img");
  backgroundSlide.src = "./img/backgroundSlide.gif";
  backgroundSlide.classList.add("background-slide");
  document.body.appendChild(backgroundSlide);

  // 角色跳跳動畫先準備播放，但保持隱藏
  player.classList.add("intro-playing", "intro-hidden");
  updatePlayerImage();

  // 7 秒後：背景動畫消失
  setTimeout(function () {
    backgroundSlide.remove();

    // 再等待 2 秒，角色登場
    setTimeout(function () {
      // 顯示角色
      player.classList.remove("intro-hidden");

      // 重新播放跳跳 GIF，從第一格開始
      player.style.backgroundImage = "none";
      void player.offsetWidth;
      updatePlayerImage();

      // 角色跳跳 5 秒後結束
      setTimeout(function () {
        player.classList.remove("intro-playing");

        // 切換成正常待機圖片
        isIntroPlaying = false;
        updatePlayerImage();

        // 顯示「開始」GIF
        const startCaption = document.createElement("img");
        startCaption.src = "./img/startCapion.gif";
        startCaption.classList.add("start-caption");
        document.body.appendChild(startCaption);

        // 3 秒後移除開始 GIF
        setTimeout(function () {
          startCaption.remove();
        }, 3000);

        console.log("開場結束，正式開始遊戲！");
      }, 5000);
    }, 2000);
  }, 7000);
});
