import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const netImg = new URL("../assets/screen-4.jpg", import.meta.url).href;
const model = new URL("../assets/gloves_goalkeeper.glb", import.meta.url).href;
let gloveModel: any;

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(render);

// Setup a Zappar camera instead of one of ThreeJS's cameras
const camera = new ZapparThree.Camera();
const manager = new ZapparThree.LoadingManager();

// The Zappar library needs your WebGL context, so pass it
ZapparThree.glContextSet(renderer.getContext());

// Create a ThreeJS Scene and set its background to be the camera background texture
const scene = new THREE.Scene();
// scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// Set up our instant tracker group
// const instantTracker = new ZapparThree.InstantWorldTracker();
// const instantTrackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, instantTracker);
// scene.add(instantTrackerGroup);

// face tracker group
const faceTracker = new ZapparThree.FaceTrackerLoader(manager).load();
const faceTrackerGroup = new ZapparThree.FaceAnchorGroup(camera, faceTracker);
scene.add(faceTrackerGroup);


// var _ = document.getElementById('rotateDevice') || document.createElement("div");
// function checkOrientation() {
//   if (window.screen.orientation) {
//     var isLandscape = window.screen.orientation.type.includes('landscape');
//     _.style.display = isLandscape ? 'none' : 'block';
//   }
// }

// // Check orientation when the page loads
// checkOrientation();

// // Check orientation when it changes
// if (window.screen.orientation) {
//   window.screen.orientation.addEventListener('change', checkOrientation);
// }

const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);
ball.position.set(0, 0, -30); // Adjust the position along the z-axis
scene.add(ball);

const netTexture = new THREE.TextureLoader().load(netImg);
const net = new THREE.Mesh(
  // new THREE.PlaneGeometry(32, 19),
  new THREE.PlaneGeometry(19, 38),
  new THREE.MeshBasicMaterial({ map: netTexture })
);
net.position.set(0, 3, -30);
scene.add(net);
console.log(net);


const gltfLoader = new GLTFLoader(manager);
gltfLoader.load(
  model,
  (gltf) => {
    // Original model
    gloveModel = gltf.scene;
    gloveModel.scale.set(1.7, 1.7, 1.7);
    gloveModel.position.set(0, -0.6, -4);
    gloveModel.rotation.set(0, 20 * (Math.PI / 180), 0);
    faceTrackerGroup.add(gloveModel);
    console.log(gloveModel);

    // Clone the model
    const clonedModel = gloveModel.clone();
    clonedModel.position.set(0, -0.6, -3.2);
    clonedModel.rotation.set(0, 200 * (Math.PI / 180), 0);
    faceTrackerGroup.add(clonedModel);
    console.log(clonedModel);
  },
  undefined,
  (error) => console.error(error)
);


const directionalLight = new THREE.DirectionalLight('white', 0.6);
directionalLight.position.set(0, 0, 1000);
faceTrackerGroup.add(directionalLight);

const ambientLight = new THREE.AmbientLight('white', 0.4);
faceTrackerGroup.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(0, 100, 200);
faceTrackerGroup.add(pointLight);


const initialPosition = new THREE.Vector3(0, 0, -30);
// ball animation code
function animateBall() {
  const targetPosition = new THREE.Vector3(
    getRandomValue(-4, 4),
    getRandomValue(-2, 2),
    5
  ); // Adjust the target position

  const animationDuration = 1150; // in milliseconds
  const startTime = Date.now();

  function updateAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);
    ball.position.lerpVectors(initialPosition, targetPosition, progress);

    // Calculate the distance between the ball and the glove
    var glovePosition = gloveModel.position;
    var distance = ball.position.distanceTo(glovePosition);

    // If the distance is less than a certain threshold, reset the ball and update the score
    if (distance < 2) { // Adjust the threshold as needed
      ball.position.copy(initialPosition);
      updateScore();
      return;
    }
    
    if (progress < 1) {
      requestAnimationFrame(updateAnimation);
    }

    if(ball.position == targetPosition) {
      ball.position.copy(initialPosition);
      return;
    }
  }

  updateAnimation();
}

function getRandomValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

let score = 0;
var scorediv = document.getElementById('score') || document.createElement("div");
function updateScore() {
  score++;
  scorediv.textContent = `Score: ${score}`;
  console.log(score);
}

const placementUI = document.getElementById("zappar-placement-ui") || document.createElement("div");
placementUI.addEventListener("click", () => {
  placementUI.style.display = 'none';
  let count = 0;
  const maxCount = 10;
  const interval = 3000; // 3 seconds

  animateBall();
  count++;

  const intervalId = setInterval(() => {
    animateBall();

    count++;
    if (count >= maxCount) {
      clearInterval(intervalId);
      placementUI.style.display = 'block';
      ball.position.copy(initialPosition);
    }
  }, interval);
});

// Render loop
function render() {
  camera.updateFrame(renderer);
  renderer.render(scene, camera);
}