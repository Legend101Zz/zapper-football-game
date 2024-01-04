import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Howl } from "howler";
import confetti from "canvas-confetti";
import TWEEN from "@tweenjs/tween.js";
import "./index.css";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const netImg = new URL("../assets/screen-4.jpg", import.meta.url).href;
const model = new URL("../assets/gloves_goalkeeper.glb", import.meta.url).href;
let gloveModel: any;
const music = new URL("../assets/whistle.mp3", import.meta.url).href;
const timerClip = new URL("../assets/timer.mp3", import.meta.url).href;
const booClip = new URL("../assets/boo.mp3", import.meta.url).href;

const cheerSound = new Howl({
  src: [music],
});
const timerSound = new Howl({
  src: [timerClip],
});
const booSound = new Howl({
  src: [booClip],
});

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

var camera = new ZapparThree.Camera({
  rearCameraSource: "csO9c0YpAf274OuCPUA53CNE0YHlIr2yXCi+SqfBZZ8=",
  userCameraSource: "RKxXByjnabbADGQNNZqLVLdmXlS0YkETYCIbg+XxnvM=",
});
camera.userCameraMirrorMode = ZapparThree.CameraMirrorMode.Poses;
ZapparThree.glContextSet(renderer.getContext());
const manager = new ZapparThree.LoadingManager();

// Create a ThreeJS Scene and set its background to be the camera background texture
const scene = new THREE.Scene();
// scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// face tracker group
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
scene.add(faceTrackerGroup);

const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);
ball.position.set(0, 0, -30); // Adjust the position along the z-axis
scene.add(ball);

const netTexture = new THREE.TextureLoader().load(netImg);
const net = new THREE.Mesh(
  new THREE.PlaneGeometry(32, 19),
  new THREE.MeshBasicMaterial({ map: netTexture })
);
net.position.set(0, 0, -30);
scene.add(net);

let gameOverUI = document.getElementById("game-over") as HTMLElement;
var isPortrait = window.screen.orientation.type.includes("portrait");
var isLandscape = window.screen.orientation.type.includes("landscape");
let isPaused = isPortrait;
var _ =
  document.getElementById("rotateDevice") || document.createElement("div");

function checkOrientation() {
  if (window.screen.orientation) {
    isLandscape = window.screen.orientation.type.includes("landscape");
    isPortrait = window.screen.orientation.type.includes("portrait");
    isPaused = isPortrait;

    _.style.display = isLandscape ? "none" : "block";
    if (gameOverUI && isLandscape) {
      gameOverUI.style.display = "none";
    }
  }
}

// Check orientation when the page loads
checkOrientation();

// Check orientation when it changes
if (window.screen.orientation) {
  window.screen.orientation.addEventListener("change", checkOrientation);
}

const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(
  model,
  (gltf) => {
    // Original model
    gloveModel = gltf.scene;
    gloveModel.scale.set(2, 2, 2);
    // gloveModel.position.set(0, -0.6, -4);
    gloveModel.rotation.set(0, 0, 0);
    faceTrackerGroup.add(gloveModel);
    // console.log(gloveModel);

    // Clone the model
    const clonedModel = gloveModel.clone();
    // clonedModel.position.set(-0.8, -0.6, -2);
    clonedModel.rotation.set(0, 180 * (Math.PI / 180), 0);
    // faceTrackerGroup.add(clonedModel);
    // console.log(clonedModel);
  },
  undefined,
  (error) => console.error(error)
);

const directionalLight = new THREE.DirectionalLight("white", 0.6);
directionalLight.position.set(0, 0, 1000);
faceTrackerGroup.add(directionalLight);

const ambientLight = new THREE.AmbientLight("white", 0.4);
faceTrackerGroup.add(ambientLight);

const initialPosition = new THREE.Vector3(0, 0, -30);
let isMessageDisplayed = false;
let isBallCaught = false;
const messageDiv =
  document.getElementById("message") || document.createElement("div");

console.log(ball);
// ball animation code
function animateBall() {
  const targetPosition = new THREE.Vector3(
    getRandomValue(-3.5, 3.5),
    getRandomValue(-1.5, 1.5),
    0
  );

  const animationDuration = 1700; // in milliseconds

  // Clear any existing tweens
  TWEEN.removeAll();

  // Create a new tween
  const tween = new TWEEN.Tween({
    x: initialPosition.x,
    y: initialPosition.y,
    z: initialPosition.z,
  })
    .to(
      { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
      animationDuration
    )
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate((object) => {
      ball.position.set(object.x, object.y, object.z);

      // Calculate the distance between the ball and the glove
      const glovePosition = gloveModel.position;
      const distance = ball.position.distanceTo(glovePosition);

      // If the distance is less than a certain threshold, reset the ball and update the score
      if (distance < 1.8 && !isBallCaught) {
        ball.visible = false;
        isBallCaught = true;
        updateScore();
        tween.stop(); // Stop the tween if the ball is caught
      }
    })
    .start()
    .onComplete(() => {
      // Animation complete
      isBallCaught = false;
      ball.position.copy(initialPosition);

      if (!isMessageDisplayed) {
        if (messageDiv) {
          isMessageDisplayed = true;
          messageDiv.style.opacity = "0.8";
          messageDiv.textContent = "Goal!";
          messageDiv.style.color = "red";
          booSound.play();

          setTimeout(() => {
            messageDiv.textContent = "";
            isMessageDisplayed = false;
            messageDiv.style.opacity = "0";
          }, 2000);
        }
      }
    })
    .start();
}

function getRandomValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let score = 0;
var scorediv =
  document.getElementById("score") || document.createElement("div");

function updateScore() {
  score++;
  scorediv.textContent = `Score: ${score}`;
  if (!isMessageDisplayed) {
    if (messageDiv) {
      cheerSound.play();
      // Start the confetti effect from the bottom left corner
      confetti({
        particleCount: 300,
        spread: 360,
        startVelocity: 35,
        origin: { x: 0, y: 1 },
      });

      // Start the confetti effect from the bottom right corner
      confetti({
        particleCount: 300,
        spread: 360,
        startVelocity: 35,
        origin: { x: 1, y: 1 },
      });

      isMessageDisplayed = true;
      messageDiv.style.opacity = "0.8";
      messageDiv.textContent = "Saved!";
      messageDiv.style.color = "green";
      ball.visible = false;

      setTimeout(() => {
        messageDiv.textContent = "";
        isMessageDisplayed = false;
        messageDiv.style.opacity = "0";
      }, 2000);
    }
  }
  ball.visible = true;
  return;
}

var timerElement =
  document.getElementById("timer") || document.createElement("div");

function showGameOverUI() {
  // Display the game over UI
  if (gameOverUI) {
    gameOverUI.style.display = "block";

    // Display the final score
    const finalScoreElement = document.getElementById("final-score");
    if (finalScoreElement) {
      finalScoreElement.textContent = `Final Score: ${score}`;
    }
  }

  // Add a click event listener to the restart button
  const restartButton = document.getElementById("restart-button");
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      location.reload();
      startGameBtn.style.display = "block";
      timerElement.style.display = "none";
    });
  }
}

const startGameBtn =
  document.getElementById("zappar-placement-ui") ||
  document.createElement("div");
var ballsleft =
  document.getElementById("balls-left") || document.createElement("div");

startGameBtn.addEventListener("click", () => {
  startGameBtn.style.display = "none";
  timerElement.style.display = "block";
  let time = 3;

  setTimeout(() => timerSound.play(), 1000);
  const timerId = setInterval(() => {
    time--;
    if (timerElement && time != -1) {
      timerElement.textContent = `${time}`;
    }
    if (time == -1) {
      timerElement.style.display = "none";
      clearInterval(timerId);
    }
  }, 1000);

  let count = 0;
  const maxCount = 10;
  const interval = 3000; // 3 seconds

  const intervalId = setInterval(() => {
    if (isPaused) {
      return;
    }
    animateBall();
    count++;
    ballsleft.textContent = `Balls Left: ${10 - count}`;

    if (count >= maxCount) {
      clearInterval(intervalId);
      ball.position.copy(initialPosition);
      setTimeout(showGameOverUI, 2000);
    }
  }, interval);
});

// Render loop
function render() {
  camera.updateFrame(renderer);
  TWEEN.update();
  renderer.render(scene, camera);
}
