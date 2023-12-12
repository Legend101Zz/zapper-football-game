import * as THREE from "three";
import * as ZapparThree from "@zappar/zappar-threejs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./index.css";

const footImg = new URL("../assets/football.png", import.meta.url).href;
const model = new URL("../assets/gloves.glb", import.meta.url).href;
let gloveModel: any;

// Setup ThreeJS in the usual way
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
let hasPlaced = false;

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
scene.background = camera.backgroundTexture;

// Request the necessary permission from the user
ZapparThree.permissionRequestUI().then((granted) => {
  if (granted) camera.start();
  else ZapparThree.permissionDeniedUI();
});

// Set up our instant tracker group
const tracker = new ZapparThree.InstantWorldTracker();
const trackerGroup = new ZapparThree.InstantWorldAnchorGroup(camera, tracker);
scene.add(trackerGroup);

var _ = document.getElementById('rotateDevice') || document.createElement("div");
function checkOrientation() {
  if (window.screen.orientation) {
    var isLandscape = window.screen.orientation.type.includes('landscape');
    _.style.display = isLandscape ? 'none' : 'block';
  }
}

// Check orientation when the page loads
checkOrientation();

// Check orientation when it changes
if (window.screen.orientation) {
  window.screen.orientation.addEventListener('change', checkOrientation);
}

// Add some content (ball with football texture placed at a specific distance along the z-axis)
const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);
ball.position.set(0, 0, -20); // Adjust the position along the z-axis
trackerGroup.add(ball);

const gltfLoader = new GLTFLoader(manager);

gltfLoader.load(
  model,
  (gltf) => {
    gloveModel = gltf.scene;
    gltf.scene.scale.set(1.5, 1.5, 1.5);
    gltf.scene.position.set(0, -1.1, 1);
    gltf.scene.rotation.set(0, 20 * (Math.PI / 180), 0);
    // console.log(gloveModel);

    // Add the scene to the tracker group
    gltf.scene.traverse(function (child) {
      if ((child as THREE.Mesh).isMesh) {
        let m = child as THREE.Mesh;
        child.castShadow = true;
        child.receiveShadow = true;
        //m.castShadow = true
        m.frustumCulled = false;
      }
    });

    // Set up device orientation event listener
    function handleOrientation(event: DeviceOrientationEvent) {
      if (gloveModel) {
        let horizontalTilt;

        // Check if the device is in landscape mode
        if (window.screen.orientation && window.screen.orientation.type.includes('landscape')) {
          // In landscape mode, the beta value corresponds to the horizontal tilt
          horizontalTilt = event.beta || 0;
        } else {
          // In portrait mode, the gamma value corresponds to the horizontal tilt
          horizontalTilt = event.gamma || 0;
        }

        // Adjust the movement speed based on the horizontal tilt
        const movementSpeed = 0.05;
        const moveX = horizontalTilt * movementSpeed;

        gloveModel.position.x = moveX;
      }
    }

    window.addEventListener("deviceorientation", handleOrientation);
    trackerGroup.add(gloveModel);

  },
  undefined,
  (error) => console.error(error)
);

// Add ambient light for overall illumination
const ambientLight2 = new THREE.AmbientLight(0x404040); // Soft white ambient light
scene.add(ambientLight2);

// ball animation code
function animateBall() {
  const initialPosition = new THREE.Vector3(0, 0, -20);
  const targetPosition = new THREE.Vector3(
    getRandomValue(-5, 5),
    getRandomValue(-2, 2),
    5
  ); // Adjust the target position

  const animationDuration = 1000; // in milliseconds
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
  // placementUI.remove();
  hasPlaced = true;
  animateBall();
});

// Set up our render loop
function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

  renderer.render(scene, camera);
}
