import * as THREE from "three";
import { GLTFLoader } from "https://unpkg.com/three@0.149.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const loadingManager = new THREE.LoadingManager();
const loader = new GLTFLoader(loadingManager); // have to pass loadingManager to the loader

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

/* ------------------------------ PHYSICS STUFF ----------------------------- */
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_FORCE = 13;
const MOVE_SPEED = 5;

let character = {
  ref: null,
  isMoving: false,
  spawnPosition: new THREE.Vector3(),
};
let targetRotation = 0;

//
const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);
let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;

/* ----------------------------- RENDERER STUFF ----------------------------- */

const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector("#experience-canvas"),
  // document.body.appendChild(renderer.domElement); the line above substitutes the need for this
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
// the tonemapping changes the color profile of the renderer, the default one sucks... too high contrast
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;

const aspect = sizes.width / sizes.height;
const viewSize = 20; // adjust this for zoom
const camera = new THREE.OrthographicCamera(
  -aspect * viewSize,
  aspect * viewSize,
  viewSize,
  -viewSize,
  0.1,
  33333
);

const cameraOffset = new THREE.Vector3(-203, 129, 190);
camera.zoom = 1.2;
camera.updateProjectionMatrix();

// Lights
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
// values to change the shadows directions
sun.position.set(-35, 80, 90);
sun.target.position.set(50, 0, 0);

sun.castShadow = true;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 0.5;
// increase shadow resolution
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
scene.add(sun);

const light = new THREE.AmbientLight(0x404040, 3);
scene.add(light);

// const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(shadowHelper);
// const helper = new THREE.DirectionalLightHelper(sun, 2);
// scene.add(helper);

/* ------------------------------ MODAL CONTENT ----------------------------- */
const modal = document.querySelector(".modal");
const modalContent = {
  Project1: {
    title: "J.D. Vance Babyface Edits",
    content:
      "J.D. Vance Babyface Edits refers to several photoshops and edits of photographs depicting U.S. Vice President J.D. Vance in which he is given exaggerated baby features to his face, such as large cheeks and lips and smooth skin. For instance, the Bald J.D. Vance meme showed Vance with a bald head and a rounder face. The edits were a part of the larger J.D. Vance Edited Face Photoshops, also known as Rare Vances. The J.D. Vance Babyface edits were widely circulated on social media in October 2024 and continued into early 2025. In March 2025, Vance's 'Have You Said Thank You Once?' quote sparked more use of the Babyface edits. In June 2025, Norwegian tourist Mads Mikkelsen claimed that he was barred from entering the U.S. after being stopped by immigration officials at Newark Airport in New Jersey, taken to a holding cell, and having his phone searched. Agents allegedly found the Bald J.D. Vance meme on his device. Mikkelsen's claims sparked international news coverage.",
    link: "https://knowyourmeme.com/memes/jd-vance-babyface-edits",
  },
  Project2: {
    title: "Canaletto - Piazza San Marco verso la Basilica",
    content:
      "In questo quadro Canaletto raffigura Piazza San Marco, dominata sullo sfondo della celebre Basilica di San Marco. Egli mette in forte risalto il ruolo di questa piazza: centro vitale della città, sua vera anima, secondo l'opinione di alcuni viaggiatori del Settecento. Nella Piazza si concentrano gli edifici più rappresentativi: sui lati i palazzi delle procuratie illustrati in prospettiva; sullo sfondo, a destra, il Palazzo Ducale, quasi nascosto dal celebre campanile. Illuminato dal sole, il palazzo spicca rispetto all'ala buia della piazza, anche se è in posizione arretrata.",
    link: "https://it.wikipedia.org/wiki/Piazza_San_Marco_verso_la_Basilica",
  },
  Project3: {
    title: "Giorgio de Chirico - Piazza d'Italia",
    content:
      "Nel dipinto di Giorgio De Chirico si vede una piazza sulla quale si affacciano architetture con portici e una torre. Al centro dello spazio vuoto è dipinto un monumento che raffigura una figura femminile distesa. Sullo sfondo, invece, svetta un’alta torre cilindrica a due piani con le pareti circondate da sottili colonne. Alla sua sommità, sventolano due vessilli che, insieme allo sbuffo del treno, indicano un cenno di movimento. Quindi, sopra al muro di fondo, lungo una rotaia sopraelevata, corre un treno a vapore. Dalla ciminiera si produce uno sbuffo tondeggiante che assume l’aspetto di una massa solida. Infine, una linea di colline deserte chiude l’orizzonte e a sinistra un gruppo di abitazioni si raccoglie ai piedi dell’altura.",
    link: "https://www.analisidellopera.it/piazza-d-italia-metafisica-de-chirico/",
  },
};
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(
  ".modal-project-description"
);
const modalExitButton = document.querySelector(".modal-exit-button");
const modalLink = document.querySelector(".modal-project-visit-button");

function showModal(id) {
  // console.log("id:", id);
  const content = modalContent[id];
  if (content) {
    modalTitle.textContent = content.title;
    modalProjectDescription.textContent = content.content;

    if (content.link) {
      modalLink.href = content.link;
      modalLink.classList.remove("hidden");
    } else {
      modalLink.classList.add("hidden");
    }

    modal.classList.toggle("hidden");
  }
}

function hideModal() {
  modal.classList.toggle("hidden");
}

/* -------------------------------- MODAL END ------------------------------- */

let intersectObject = null;
const intersectObjects = [];
const intersectObjectsNames = ["Project1", "Project2", "Project3"];

/* -------------------------------- GLB MODEL ------------------------------- */

let model;
// Load .glb
loader.load(
  "/portfolio-with-collider.glb",
  (glb) => {
    model = glb.scene;
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // console.log(child.material.name);

        if (child.parent.name === "Character") {
          character.spawnPosition.copy(child.parent.position);
          character.ref = child.parent;
          playerCollider.start
            .copy(child.parent.position)
            .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));

          playerCollider.end
            .copy(child.parent.position)
            .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));
        }

        if (child.name === "groundCollider") {
          colliderOctree.fromGraphNode(child);
          // console.log(child);
          child.visible = false;
        }
      }
    });

    // change the grass color, trasverse is life depth-first search in a tree-like strcture
    model.traverse((child) => {
      if (intersectObjectsNames.includes(child.name)) {
        intersectObjects.push(child);
        addClickIndicator(child);
      }
      // erba/ground
      if (child.isMesh && child.name === "Plane009") {
        child.material.color.set("#399412");
      }
      // leaves
      if (child.isMesh && child.material.name === "Leaves") {
        child.material.color.set("#95ff00");
      }
      // dark leaves
      if (child.isMesh && child.material.name === "Dark leaves") {
        child.material.color.set("#589700");
      }
    });

    // the tree.js default for emissive are black and intensity is 1, so default it to 0 to make the proximity highlighting work good
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        if ("emissiveIntensity" in child.material) {
          child.material.emissiveIntensity = 0; // start from 0
        }
        if ("emissive" in child.material) {
          child.material.emissive.set(0x000000); // no emissive color
        }
      }
    });

    scene.add(model); // Add the loaded scene
  },
  undefined,
  (error) => {
    // console.error("Error loading GLB:", error);
  }
);

// resize window, (update all related variables like react would do on event)
function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * viewSize;
  camera.right = aspect * viewSize;
  camera.top = viewSize;
  camera.bottom = -viewSize;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  // console.log(intersectObject);
  if (intersectObject !== null) {
    showModal(intersectObject);
  }
}

// needed to calculate the shortest rotation, otherwise it rotates 270deg instead of just 90
function shortestAngle(current, target) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  return current + diff;
}

//

function respawnCharacter() {
  character.ref.position.copy(character.spawnPosition);
  playerCollider.start
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));

  playerCollider.end
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  playerVelocity.set(0, 0, 0);
  character.isMoving = false;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      character.isMoving = false;
      playerVelocity.x = 0;
      playerVelocity.z = 0;
    }
  }
}
function updatePlayer() {
  if (!character.ref) return;

  //if it bugs out and falls through world respawn
  if (character.ref.position.y < -20) {
    respawnCharacter();
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.03;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.03));

  playerCollisions();

  character.ref.position.copy(playerCollider.start);
  character.ref.position.y -= CAPSULE_RADIUS;

  // finalRotation is to not have it bug out
  let finalRotation = shortestAngle(character.ref.rotation.y, targetRotation);

  character.ref.rotation.y = THREE.MathUtils.lerp(
    character.ref.rotation.y,
    finalRotation,
    0.1
  );
}

function onKeyDown(e) {
  if (e.key.toLowerCase() === "r") {
    respawnCharacter();
    return;
  }

  function jump() {
    playerVelocity.y = JUMP_FORCE;
  }
  // this is basically the same as pygame coding
  if (character.isMoving) return;

  let key = e.key.toLowerCase();
  if (key === "w" || key === "arrowup") {
    playerVelocity.x += MOVE_SPEED;
    targetRotation = -Math.PI / 2;
    jump();
  } else if (key === "s" || key === "arrowdown") {
    playerVelocity.x -= MOVE_SPEED;
    targetRotation = Math.PI / 2;
    jump();
  } else if (key === "d" || key === "arrowright") {
    playerVelocity.z += MOVE_SPEED;
    targetRotation = -Math.PI;
    jump();
  } else if (key === "a" || key === "arrowleft") {
    playerVelocity.z -= MOVE_SPEED;
    targetRotation = 0;
    jump();
  }
  character.isMoving = true;
  // checkProximity();
}

let isDarkTheme = false;
const toggleDarkModeBTN = document.querySelector("#darkModeToggle");
const themeIconPath = document.querySelector("#themeIconPath");
const sunPath =
  "M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1zm0 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm7.5-4.5a1 1 0 0 1 1 1V13a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1zM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zM4.5 12a1 1 0 0 1 1-1H7a1 1 0 1 1 0 2H5.5a1 1 0 0 1-1-1z";

const moonPath = "M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z";

function handleTheme() {
  // change the svg path based on theme
  themeIconPath.setAttribute("d", isDarkTheme ? moonPath : sunPath);

  document.body.classList.toggle("dark", isDarkTheme);

  // blur makes it so that after you click it, it loses focus, otherwise the button stayis highlighted
  toggleDarkModeBTN.blur();

  gsap.to(light.color, {
    r: isDarkTheme ? 0.25 : 0.4,
    g: isDarkTheme ? 0.31 : 0.4,
    b: isDarkTheme ? 0.78 : 0.4,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 2.7 : 1.8,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 1.4 : 2.0,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 0.25 : 1.0,
    g: isDarkTheme ? 0.41 : 1.0,
    b: isDarkTheme ? 0.88 : 1.0,
    duration: 1,
    ease: "power2.inOut",
  });
}
//run it once on load to set the initial intensity
handleTheme();

/* -------------------------- HANDLE LOADING SCREEN ------------------------- */
const loadingScreenRef = document.querySelector(".loading-screen");
const loadingStatusTxt = document.querySelector("#loading-status-text");
// Fires when all assets are loaded
loadingManager.onLoad = () => {
  console.log("All assets loaded");
  loadingStatusTxt.textContent = "click to start";
  // loadingScreenRef.classList.add("hidden");
};

/* ----------------------------- PROXIMITY CHECK ---------------------------- */

function addClickIndicator(object) {
  // Smaller ring: inner radius 0.2, outer radius 0.4
  const geometry = new THREE.RingGeometry(0.2, 0.25, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });

  const ring = new THREE.Mesh(geometry, material);

  // Instead of flat on the ground, face the camera (XY plane)
  ring.rotation.y = 0; // no rotation
  ring.rotation.x = -Math.PI / 2; // facing forward
  ring.rotation.z = 0;

  // Position it slightly in front of the object (along Z axis)
  ring.position.set(0.0, -0.1, 0.0);
  // (up-down , dietro-fronte, sinistra-destra)

  ring.visible = false;

  object.add(ring);
  object.userData.clickIndicator = ring;
}

function checkProximity() {
  if (intersectObjects.length === 0) return;

  const charPos = character.ref.position;

  intersectObjects.forEach((obj) => {
    obj.traverse((child) => {
      if (!child.isMesh) return;
      if (
        child.material.name !== "Frame1" &&
        child.material.name !== "Frame2" &&
        child.material.name !== "Frame3"
      ) {
        return;
      }

      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);

      const distance = charPos.distanceTo(worldPos);
      const radius = child.userData.interactionRadius || 15;

      const inRange = distance < radius;

      if (inRange && !child.userData.isHighlighted) {
        child.userData.isHighlighted = true;
        // Kill any previous animation
        if (child.userData.tween) child.userData.tween.kill();

        child.material.emissive.set(0xffffff);
        // Store the gsap tween (loop pulse)
        child.userData.tween = gsap.to(child.material, {
          emissiveIntensity: 0.5,
          yoyo: true,
          repeat: -1,
          duration: 1,
          ease: "sine.inOut",
        });

        //  Show click indicator
        if (obj.userData.clickIndicator) {
          obj.userData.clickIndicator.visible = true;
          obj.userData.clickIndicator.userData.tween = gsap.to(
            obj.userData.clickIndicator.scale,
            {
              x: 1.5,
              y: 1.5,
              z: 1.5,
              duration: 1,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
            }
          );
        }
      } else if (!inRange && child.userData.isHighlighted) {
        child.userData.isHighlighted = false;

        // Stop pulsing emissive
        if (child.userData.tween) child.userData.tween.kill();
        gsap.to(child.material, {
          emissiveIntensity: 0,
          duration: 0.5,
          ease: "sine.inOut",
        });

        // Hide click indicator
        if (obj.userData.clickIndicator) {
          obj.userData.clickIndicator.visible = false;
          if (obj.userData.clickIndicator.userData.tween)
            obj.userData.clickIndicator.userData.tween.kill();
          obj.userData.clickIndicator.scale.set(1, 1, 1);
        }
      }
    });
  });
}

/* ----------------------------- EVENT LISTENERS ---------------------------- */
// the event listeners act kinda like the godot signal bus, they redicter signals to callback functions
window.addEventListener("resize", onResize);
window.addEventListener("click", (e) => {
  e.stopPropagation();
  onClick();
});
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("keydown", onKeyDown);
modalExitButton.addEventListener("click", hideModal);
toggleDarkModeBTN.addEventListener("click", () => {
  isDarkTheme = !isDarkTheme;
  handleTheme();
});
loadingScreenRef.addEventListener("click", () => {
  loadingScreenRef.classList.add("hidden");
});

/* -------------------------------------------------------------------------- */
/*                              // ANIMATION LOOP                             */
/* -------------------------------------------------------------------------- */

function animate() {
  requestAnimationFrame(animate);

  updatePlayer();
  // controls.update();

  if (character.ref) {
    // camera.position.copy(character.ref.position).add(cameraOffset);
    const targetCameraPosition = new THREE.Vector3(
      character.ref.position.x + cameraOffset.x,
      cameraOffset.y,
      character.ref.position.z + cameraOffset.z
    );
    camera.position.copy(targetCameraPosition);
    camera.lookAt(
      new THREE.Vector3(character.ref.position.x, 0, character.ref.position.z)
    );
  }

  /* -------------------------------- RAYCASTS -------------------------------- */
  // update the picking ray with the camera and pointer position
  raycaster.setFromCamera(pointer, camera);
  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
    intersectObject = null;
  }

  for (let i = 0; i < intersects.length; i++) {
    // intersects[i].object.material.color.set(0xff0000);
    intersectObject = intersects[0].object.parent.name;
  }
  /* ----------------------------- END OF RAYCASTS ---------------------------- */

  if (character.isMoving) {
    checkProximity();
  }

  renderer.render(scene, camera);
  // console.log(controls.target);
}
animate();
