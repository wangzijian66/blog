---
title: 3D版天天过马路小游戏
date: 2025-07-25 11:56:00 
---

这是一个用 Three.js 实现的3D版“天天过马路”小游戏，快来挑战一下你能走多远吧！

<!-- more -->

<!-- START: Crossy Road 游戏嵌入式代码 -->
<div id="crossy-road-game-wrapper">
  <canvas class="game"></canvas>
  <div class="controls">
    <div>
      <button class="forward">▲</button>
      <button class="left">◀</button>
      <button class="backward">▼</button>
      <button class="right">▶</button>
    </div>
  </div>
  <div class="score">0</div>
  <div class="result-container">
    <div class="result">
      <h1>Game Over</h1>
      <p>Your score: <span class="final-score"></span></p>
      <button class="retry">Retry</button>
    </div>
  </div>
</div>

<style>
  @import url("https://fonts.googleapis.com/css?family=Press+Start+2P");

  /* 关键：为游戏创建一个相对定位的容器 */
  #crossy-road-game-wrapper {
    position: relative;
    width: 100%;
    height: 80vh; /* 您可以调整这个高度 */
    min-height: 550px;
    margin: 20px 0;
    overflow: hidden; /* 只在这个容器内部隐藏溢出 */
    font-family: "Press Start 2P", cursive;
    display: flex; /* 让内部元素可以正常显示 */
    justify-content: center;
    align-items: center;
  }

  /* 关键：所有样式都以 #crossy-road-game-wrapper 开头，防止影响博客 */
  #crossy-road-game-wrapper .controls {
    position: absolute;
    bottom: 20px;
    width: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 10;
  }

  #crossy-road-game-wrapper .controls div {
    display: grid;
    grid-template-columns: 50px 50px 50px;
    gap: 10px;
  }

  #crossy-road-game-wrapper .controls button {
    width: 100%;
    height: 40px;
    background-color: white;
    border: 1px solid lightgray;
    box-shadow: 3px 5px 0px 0px rgba(0, 0, 0, 0.75);
    cursor: pointer;
    outline: none;
  }

  #crossy-road-game-wrapper .controls button:first-of-type {
    grid-column: 1/-1;
  }

  #crossy-road-game-wrapper .score {
    position: absolute;
    top: 20px;
    left: 20px;
    font-size: 2em;
    color: white;
    z-index: 10;
  }

  #crossy-road-game-wrapper .result-container {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    visibility: hidden;
    z-index: 20;
    background-color: rgba(0,0,0,0.5); /* 添加半透明背景 */
  }

  #crossy-road-game-wrapper .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: white;
    padding: 30px;
    border-radius: 10px;
  }
  
  #crossy-road-game-wrapper .result h1 {
    color: #000;
  }
  #crossy-road-game-wrapper .result p {
      color: #333;
  }

  #crossy-road-game-wrapper .result button {
    background-color: red;
    padding: 20px 50px 20px 50px;
    font-family: inherit;
    font-size: inherit;
    color: white;
    border: none;
    cursor: pointer;
  }

</style>

<!-- 关键：添加 type="module" -->
<script type="module">
  import * as THREE from "https://esm.sh/three";

  // --- START OF GAME CODE ---

  // 关键：所有DOM查询都在游戏容器内部进行
  const gameWrapper = document.getElementById('crossy-road-game-wrapper');
  if (!gameWrapper) {
    console.error("Game wrapper not found!");
  } else {
    // ---- Constants and Game Variables ----
    const minTileIndex = -8;
    const maxTileIndex = 8;
    const tilesPerRow = maxTileIndex - minTileIndex + 1;
    const tileSize = 42;
    const metadata = [];
    const map = new THREE.Group();
    const player = Player();
    const position = { currentRow: 0, currentTile: 0 };
    const movesQueue = [];
    const moveClock = new THREE.Clock(false);
    const clock = new THREE.Clock();
    
    // ---- DOM Elements ----
    const scoreDOM = gameWrapper.querySelector(".score");
    const resultDOM = gameWrapper.querySelector(".result-container");
    const finalScoreDOM = gameWrapper.querySelector(".final-score");
    const canvas = gameWrapper.querySelector("canvas.game");

    // ---- Scene Setup ----
    const scene = new THREE.Scene();
    scene.add(player);
    scene.add(map);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = DirectionalLight();
    dirLight.target = player;
    player.add(dirLight);

    const camera = Camera();
    player.add(camera);

    const renderer = Renderer();
    renderer.setAnimationLoop(animate);

    // ---- Event Listeners ----
    gameWrapper.querySelector(".forward")?.addEventListener("click", () => queueMove("forward"));
    gameWrapper.querySelector(".backward")?.addEventListener("click", () => queueMove("backward"));
    gameWrapper.querySelector(".left")?.addEventListener("click", () => queueMove("left"));
    gameWrapper.querySelector(".right")?.addEventListener("click", () => queueMove("right"));
    gameWrapper.querySelector(".retry")?.addEventListener("click", initializeGame);
    
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") { event.preventDefault(); queueMove("forward"); }
      else if (event.key === "ArrowDown") { event.preventDefault(); queueMove("backward"); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); queueMove("left"); }
      else if (event.key === "ArrowRight") { event.preventDefault(); queueMove("right"); }
    });

    // Handle resizing
    new ResizeObserver(() => {
        const { clientWidth, clientHeight } = gameWrapper;
        const viewRatio = clientWidth / clientHeight;
        const size = 300;
        const width = viewRatio < 1 ? size : size * viewRatio;
        const height = viewRatio < 1 ? size / viewRatio : size;
        camera.left = width / -2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = height / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
    }).observe(gameWrapper);

    // ---- Game Logic Functions ----
    function initializeGame() {
      initializePlayer();
      initializeMap();
      if (scoreDOM) scoreDOM.innerText = "0";
      if (resultDOM) resultDOM.style.visibility = "hidden";
    }

    function animate() {
      animateVehicles();
      animatePlayer();
      hitTest();
      renderer.render(scene, camera);
    }

    // ... (所有其他的游戏逻辑函数都放在这里) ...
    // NOTE: For brevity, the helper functions (Camera, Texture, Car, etc.) are included below.
    // They are the same as in your original code.

    function Camera() {
      const { clientWidth, clientHeight } = gameWrapper;
      const size = 300;
      const viewRatio = clientWidth / clientHeight;
      const width = viewRatio < 1 ? size : size * viewRatio;
      const height = viewRatio < 1 ? size / viewRatio : size;

      const camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 100, 900);
      camera.up.set(0, 0, 1);
      camera.position.set(300, -300, 300);
      camera.lookAt(0, 0, 0);
      return camera;
    }

    function Texture(width, height, rects) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(0,0,0,0.6)";
      rects.forEach((rect) => {
        context.fillRect(rect.x, rect.y, rect.w, rect.h);
      });
      return new THREE.CanvasTexture(canvas);
    }

    const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
    const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
    const carRightSideTexture = new Texture(110, 40, [{ x: 10, y: 0, w: 50, h: 30 }, { x: 70, y: 0, w: 30, h: 30 }]);
    const carLeftSideTexture = new Texture(110, 40, [{ x: 10, y: 10, w: 50, h: 30 }, { x: 70, y: 10, w: 30, h: 30 }]);
    const truckFrontTexture = Texture(30, 30, [{ x: 5, y: 0, w: 10, h: 30 }]);
    const truckRightSideTexture = Texture(25, 30, [{ x: 15, y: 5, w: 10, h: 10 }]);
    const truckLeftSideTexture = Texture(25, 30, [{ x: 15, y: 15, w: 10, h: 10 }]);

    function Car(initialTileIndex, direction, color) {
      const car = new THREE.Group();
      car.position.x = initialTileIndex * tileSize;
      if (!direction) car.rotation.z = Math.PI;
      const main = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 15), new THREE.MeshLambertMaterial({ color, flatShading: true }));
      main.position.z = 12;
      main.castShadow = true;
      main.receiveShadow = true;
      car.add(main);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(33, 24, 12), [
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      ]);
      cabin.position.x = -6;
      cabin.position.z = 25.5;
      cabin.castShadow = true;
      cabin.receiveShadow = true;
      car.add(cabin);
      car.add(Wheel(18));
      car.add(Wheel(-18));
      return car;
    }

    function DirectionalLight() {
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(-100, -100, 200);
      dirLight.up.set(0, 0, 1);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.up.set(0, 0, 1);
      dirLight.shadow.camera.left = -400;
      dirLight.shadow.camera.right = 400;
      dirLight.shadow.camera.top = 400;
      dirLight.shadow.camera.bottom = -400;
      dirLight.shadow.camera.near = 50;
      dirLight.shadow.camera.far = 400;
      return dirLight;
    }

    function Grass(rowIndex) {
      const grass = new THREE.Group();
      grass.position.y = rowIndex * tileSize;
      const createSection = (color) => new THREE.Mesh(new THREE.BoxGeometry(tilesPerRow * tileSize, tileSize, 3), new THREE.MeshLambertMaterial({ color }));
      const middle = createSection(0xbaf455);
      middle.receiveShadow = true;
      grass.add(middle);
      const left = createSection(0x99c846);
      left.position.x = -tilesPerRow * tileSize;
      grass.add(left);
      const right = createSection(0x99c846);
      right.position.x = tilesPerRow * tileSize;
      grass.add(right);
      return grass;
    }

    function initializeMap() {
      metadata.length = 0;
      map.remove(...map.children);
      for (let rowIndex = 0; rowIndex > -10; rowIndex--) {
        const grass = Grass(rowIndex);
        map.add(grass);
      }
      addRows();
    }

    function addRows() {
      const newMetadata = generateRows(20);
      const startIndex = metadata.length;
      metadata.push(...newMetadata);
      newMetadata.forEach((rowData, index) => {
        const rowIndex = startIndex + index + 1;
        if (rowData.type === "forest") {
          const row = Grass(rowIndex);
          rowData.trees.forEach(({ tileIndex, height }) => row.add(Tree(tileIndex, height)));
          map.add(row);
        }
        if (rowData.type === "car") {
          const row = Road(rowIndex);
          rowData.vehicles.forEach((vehicle) => {
            const car = Car(vehicle.initialTileIndex, rowData.direction, vehicle.color);
            vehicle.ref = car;
            row.add(car);
          });
          map.add(row);
        }
        if (rowData.type === "truck") {
          const row = Road(rowIndex);
          rowData.vehicles.forEach((vehicle) => {
            const truck = Truck(vehicle.initialTileIndex, rowData.direction, vehicle.color);
            vehicle.ref = truck;
            row.add(truck);
          });
          map.add(row);
        }
      });
    }

    function Player() {
      const player = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 20), new THREE.MeshLambertMaterial({ color: "white", flatShading: true }));
      body.position.z = 10;
      body.castShadow = true;
      body.receiveShadow = true;
      player.add(body);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshLambertMaterial({ color: 0xf0619a, flatShading: true }));
      cap.position.z = 21;
      cap.castShadow = true;
      cap.receiveShadow = true;
      player.add(cap);
      const playerContainer = new THREE.Group();
      playerContainer.add(player);
      return playerContainer;
    }
    
    function initializePlayer() {
      player.position.x = 0;
      player.position.y = 0;
      player.children[0].position.z = 0;
      position.currentRow = 0;
      position.currentTile = 0;
      movesQueue.length = 0;
    }

    function queueMove(direction) {
      if (!endsUpInValidPosition({ rowIndex: position.currentRow, tileIndex: position.currentTile }, [...movesQueue, direction])) return;
      movesQueue.push(direction);
    }

    function stepCompleted() {
      const direction = movesQueue.shift();
      if (direction === "forward") position.currentRow += 1;
      if (direction === "backward") position.currentRow -= 1;
      if (direction === "left") position.currentTile -= 1;
      if (direction === "right") position.currentTile += 1;
      if (position.currentRow > metadata.length - 10) addRows();
      if (scoreDOM) scoreDOM.innerText = position.currentRow.toString();
    }

    function Renderer() {
        if (!canvas) throw new Error("Canvas not found");
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas: canvas });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(gameWrapper.clientWidth, gameWrapper.clientHeight);
        renderer.shadowMap.enabled = true;
        return renderer;
    }

    function Road(rowIndex) {
      const road = new THREE.Group();
      road.position.y = rowIndex * tileSize;
      const createSection = (color) => new THREE.Mesh(new THREE.PlaneGeometry(tilesPerRow * tileSize, tileSize), new THREE.MeshLambertMaterial({ color }));
      const middle = createSection(0x454a59);
      middle.receiveShadow = true;
      road.add(middle);
      const left = createSection(0x393d49);
      left.position.x = -tilesPerRow * tileSize;
      road.add(left);
      const right = createSection(0x393d49);
      right.position.x = tilesPerRow * tileSize;
      road.add(right);
      return road;
    }

    function Tree(tileIndex, height) {
      const tree = new THREE.Group();
      tree.position.x = tileIndex * tileSize;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(15, 15, 20), new THREE.MeshLambertMaterial({ color: 0x4d2926, flatShading: true }));
      trunk.position.z = 10;
      tree.add(trunk);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(30, 30, height), new THREE.MeshLambertMaterial({ color: 0x7aa21d, flatShading: true }));
      crown.position.z = height / 2 + 20;
      crown.castShadow = true;
      crown.receiveShadow = true;
      tree.add(crown);
      return tree;
    }

    function Truck(initialTileIndex, direction, color) {
      const truck = new THREE.Group();
      truck.position.x = initialTileIndex * tileSize;
      if (!direction) truck.rotation.z = Math.PI;
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(70, 35, 35), new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true }));
      cargo.position.x = -15;
      cargo.position.z = 25;
      cargo.castShadow = true;
      cargo.receiveShadow = true;
      truck.add(cargo);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), [
        new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckFrontTexture }),
        new THREE.MeshLambertMaterial({ color, flatShading: true }),
        new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
        new THREE.MeshLambertMaterial({ color, flatShading: true, map: truckRightSideTexture }),
        new THREE.MeshPhongMaterial({ color, flatShading: true }),
        new THREE.MeshPhongMaterial({ color, flatShading: true }),
      ]);
      cabin.position.x = 35;
      cabin.position.z = 20;
      cabin.castShadow = true;
      cabin.receiveShadow = true;
      truck.add(cabin);
      truck.add(Wheel(37));
      truck.add(Wheel(5));
      truck.add(Wheel(-35));
      return truck;
    }

    function Wheel(x) {
      const wheel = new THREE.Mesh(new THREE.BoxGeometry(12, 33, 12), new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true }));
      wheel.position.x = x;
      wheel.position.z = 6;
      return wheel;
    }

    function calculateFinalPosition(currentPosition, moves) {
      return moves.reduce((position, direction) => {
        if (direction === "forward") return { rowIndex: position.rowIndex + 1, tileIndex: position.tileIndex };
        if (direction === "backward") return { rowIndex: position.rowIndex - 1, tileIndex: position.tileIndex };
        if (direction === "left") return { rowIndex: position.rowIndex, tileIndex: position.tileIndex - 1 };
        if (direction === "right") return { rowIndex: position.rowIndex, tileIndex: position.tileIndex + 1 };
        return position;
      }, currentPosition);
    }

    function endsUpInValidPosition(currentPosition, moves) {
      const finalPosition = calculateFinalPosition(currentPosition, moves);
      if (finalPosition.rowIndex === -1 || finalPosition.tileIndex === minTileIndex - 1 || finalPosition.tileIndex === maxTileIndex + 1) return false;
      const finalRow = metadata[finalPosition.rowIndex - 1];
      if (finalRow && finalRow.type === "forest" && finalRow.trees.some((tree) => tree.tileIndex === finalPosition.tileIndex)) return false;
      return true;
    }

    function generateRows(amount) {
      const rows = [];
      for (let i = 0; i < amount; i++) rows.push(generateRow());
      return rows;
    }
    
    function generateRow() {
      const type = randomElement(["car", "truck", "forest"]);
      if (type === "car") return generateCarLaneMetadata();
      if (type === "truck") return generateTruckLaneMetadata();
      return generateForesMetadata();
    }

    function randomElement(array) {
      return array[Math.floor(Math.random() * array.length)];
    }

    function generateForesMetadata() {
      const occupiedTiles = new Set();
      const trees = Array.from({ length: 4 }, () => {
        let tileIndex;
        do { tileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex); } while (occupiedTiles.has(tileIndex));
        occupiedTiles.add(tileIndex);
        return { tileIndex, height: randomElement([20, 45, 60]) };
      });
      return { type: "forest", trees };
    }

    function generateCarLaneMetadata() {
      const direction = randomElement([true, false]);
      const speed = randomElement([125, 156, 188]);
      const occupiedTiles = new Set();
      const vehicles = Array.from({ length: 3 }, () => {
        let initialTileIndex;
        do { initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex); } while (occupiedTiles.has(initialTileIndex));
        occupiedTiles.add(initialTileIndex - 1);
        occupiedTiles.add(initialTileIndex);
        occupiedTiles.add(initialTileIndex + 1);
        return { initialTileIndex, color: randomElement([0xa52523, 0xbdb638, 0x78b14b]) };
      });
      return { type: "car", direction, speed, vehicles };
    }

    function generateTruckLaneMetadata() {
      const direction = randomElement([true, false]);
      const speed = randomElement([125, 156, 188]);
      const occupiedTiles = new Set();
      const vehicles = Array.from({ length: 2 }, () => {
        let initialTileIndex;
        do { initialTileIndex = THREE.MathUtils.randInt(minTileIndex, maxTileIndex); } while (occupiedTiles.has(initialTileIndex));
        occupiedTiles.add(initialTileIndex - 2);
        occupiedTiles.add(initialTileIndex - 1);
        occupiedTiles.add(initialTileIndex);
        occupiedTiles.add(initialTileIndex + 1);
        occupiedTiles.add(initialTileIndex + 2);
        return { initialTileIndex, color: randomElement([0xa52523, 0xbdb638, 0x78b14b]) };
      });
      return { type: "truck", direction, speed, vehicles };
    }

    function animatePlayer() {
      if (!movesQueue.length) return;
      if (!moveClock.running) moveClock.start();
      const stepTime = 0.2;
      const progress = Math.min(1, moveClock.getElapsedTime() / stepTime);
      setPosition(progress);
      setRotation(progress);
      if (progress >= 1) {
        stepCompleted();
        moveClock.stop();
      }
    }

    function setPosition(progress) {
      const startX = position.currentTile * tileSize;
      const startY = position.currentRow * tileSize;
      let endX = startX;
      let endY = startY;
      if (movesQueue[0] === "left") endX -= tileSize;
      if (movesQueue[0] === "right") endX += tileSize;
      if (movesQueue[0] === "forward") endY += tileSize;
      if (movesQueue[0] === "backward") endY -= tileSize;
      player.position.x = THREE.MathUtils.lerp(startX, endX, progress);
      player.position.y = THREE.MathUtils.lerp(startY, endY, progress);
      player.children[0].position.z = Math.sin(progress * Math.PI) * 8;
    }

    function setRotation(progress) {
      let endRotation = player.children[0].rotation.z;
      if (movesQueue[0] == "forward") endRotation = 0;
      if (movesQueue[0] == "left") endRotation = Math.PI / 2;
      if (movesQueue[0] == "right") endRotation = -Math.PI / 2;
      if (movesQueue[0] == "backward") endRotation = Math.PI;
      player.children[0].rotation.z = THREE.MathUtils.lerp(player.children[0].rotation.z, endRotation, progress);
    }
    
    function animateVehicles() {
      const delta = clock.getDelta();
      metadata.forEach((rowData) => {
        if (rowData.type === "car" || rowData.type === "truck") {
          const beginningOfRow = (minTileIndex - 2) * tileSize;
          const endOfRow = (maxTileIndex + 2) * tileSize;
          rowData.vehicles.forEach(({ ref }) => {
            if (!ref) throw Error("Vehicle reference is missing");
            if (rowData.direction) ref.position.x = ref.position.x > endOfRow ? beginningOfRow : ref.position.x + rowData.speed * delta;
            else ref.position.x = ref.position.x < beginningOfRow ? endOfRow : ref.position.x - rowData.speed * delta;
          });
        }
      });
    }

    function hitTest() {
      const row = metadata[position.currentRow - 1];
      if (!row) return;
      if (row.type === "car" || row.type === "truck") {
        const playerBoundingBox = new THREE.Box3();
        playerBoundingBox.setFromObject(player);
        row.vehicles.forEach(({ ref }) => {
          if (!ref) throw Error("Vehicle reference is missing");
          const vehicleBoundingBox = new THREE.Box3();
          vehicleBoundingBox.setFromObject(ref);
          if (playerBoundingBox.intersectsBox(vehicleBoundingBox)) {
            if (!resultDOM || !finalScoreDOM) return;
            resultDOM.style.visibility = "visible";
            finalScoreDOM.innerText = position.currentRow.toString();
          }
        });
      }
    }
    
    // Start the game
    initializeGame();
  }
</script>
<!-- END: Crossy Road 游戏嵌入式代码 -->