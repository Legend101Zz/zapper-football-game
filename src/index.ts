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

// Add some content (ball with football texture placed at a specific distance along the z-axis)
const ballTexture = new THREE.TextureLoader().load(footImg);
const ball = new THREE.Mesh(
  new THREE.SphereBufferGeometry(1, 32, 32),
  new THREE.MeshBasicMaterial({ map: ballTexture })
);

ball.position.set(0, 0, -10); // Adjust the position along the z-axis
trackerGroup.add(ball);

const gltfLoader = new GLTFLoader(manager);

gltfLoader.load(
  model,
  (gltf) => {
    gloveModel = gltf.scene;
    gltf.scene.scale.set(2, 2, 2);
    gltf.scene.position.set(0, -0.7, 1);
    gltf.scene.rotation.set(Math.PI / 2, 0, 0);

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
        const beta = event.beta || 0;
        const alpha = event.alpha || 0;
        const gamma = event.gamma || 0;

        gloveModel.rotation.set(beta, alpha, -gamma);
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

const placementUI =
  document.getElementById("zappar-placement-ui") ||
  document.createElement("div");
placementUI.addEventListener("click", () => {
  placementUI.remove();
  hasPlaced = true;
});

// Set up our render loop
function render() {
  camera.updateFrame(renderer);
  if (!hasPlaced) tracker.setAnchorPoseFromCameraOffset(0, 0, -5);

  renderer.render(scene, camera);
}
