import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/loaders/GLTFLoader.js";
import Stats from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/stats.module.js";

const inputs = ["posX", "posY", "posZ", "rotX", "rotY", "rotZ", "scale"].reduce(
  (acc, id) => {
    acc[id] = document.getElementById(id);
    return acc;
  },
  {}
);

let currentModel = null;

const fileInput = document.getElementById("modelInput");
const flipAxisPos = document.getElementById("flipaxispos");
const flipAxisRot = document.getElementById("flipaxisrot");

document.getElementById("uploadModelBtn").addEventListener("click", () => {
  document.getElementById("modelInput").click();
});

document.getElementById("uploadTextureBtn").addEventListener("click", () => {
  if (!currentModel || !fileInput.files[0]) {
    alert("Load a model first");
    return;
  }
  document.getElementById("textureInput").click();
});

document.getElementById("uploadIconBtn").addEventListener("click", () => {
  document.getElementById("iconInput").click();
});

const textureInput = document.getElementById("textureInput");
const iconInput = document.getElementById("iconInput");
const iconPreview = document.getElementById("iconPreview");

let loadedTexture = null;

textureInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const loader = new THREE.TextureLoader();

  loader.load(url, (texture) => {
    loadedTexture = texture;

    if (currentModel) {
      applyTexture(currentModel, loadedTexture);
    }
  });
});

iconInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  iconPreview.src = url;
});

const scene = new THREE.Scene();
const baseGroup = new THREE.Group();

const headMesh = new THREE.Mesh(
  new THREE.SphereGeometry(32, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, wireframe: true })
);
headMesh.position.set(0, 0, 0);
baseGroup.add(headMesh);

const frontMarker = new THREE.Mesh(
  new THREE.SphereGeometry(2, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
frontMarker.position.set(0, 0, 35);
baseGroup.add(frontMarker);

scene.add(baseGroup);

const light = new THREE.PointLight(0xffffff, 50);
light.position.set(0.8, 1.4, 1.0);
scene.add(light);
scene.add(new THREE.AmbientLight());

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0.8, 1.4, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

const stats = new Stats();
document.body.appendChild(stats.dom);
stats.dom.style.position = "fixed";
stats.dom.style.bottom = "0";
stats.dom.style.left = "0";
stats.dom.style.top = "auto";

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

Object.values(inputs).forEach((input) =>
  input.addEventListener("input", () => {
    updateModelTransform();
  })
);

fileInput.addEventListener("change", handleFileUpload);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  stats.update();
}
animate();

function applyTexture(object, texture) {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ map: texture });
      child.material.needsUpdate = true;
    }
  });
}

function WebTransform(unityPos) {
  const webPos = {
    x: unityPos.x * 5.3,
    y: unityPos.y * 5.3,
    z: unityPos.z * 5.3,
  };

  return webPos;
}

function updateModelTransform() {
  if (!currentModel) return;

  const modelPos = {
    x: parseFloat(inputs.posX.value),
    y: parseFloat(inputs.posY.value),
    z: parseFloat(inputs.posZ.value),
  };

  const pos = WebTransform(modelPos);
  currentModel.position.set(pos.x, pos.y, pos.z);

  const rot = ["rotX", "rotY", "rotZ"].map((id) =>
    THREE.MathUtils.degToRad(parseFloat(inputs[id].value))
  );
  currentModel.rotation.set(...rot);

  let scaleVal = parseFloat(inputs.scale.value);
  let unityScale = scaleVal / 533.34;
  currentModel.scale.setScalar(unityScale);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const ext = file.name.split(".").pop().toLowerCase();
  const url = URL.createObjectURL(file);

  const onLoad = (model) => {
    if (currentModel) scene.remove(currentModel);
    currentModel = model.scene || model;
    if (loadedTexture) {
      applyTexture(currentModel, loadedTexture);
    } else {
      fixMaterials(currentModel);
    }

    scene.add(currentModel);
    updateModelTransform();
  };

  const loaders = {
    glb: new GLTFLoader(),
    gltf: new GLTFLoader(),
    fbx: new FBXLoader(),
  };

  if (loaders[ext]) {
    loaders[ext].load(url, onLoad);
  } else {
    alert("Only .glb, .gltf and .fbx");
  }
}

function fixMaterials(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    }
  });
}

document.getElementById("uploadBtn").addEventListener("click", () => {
  if (!currentModel || !fileInput.files[0]) {
    alert("Load a model first");
    return;
  }

  const formData = new FormData();
  formData.append("model", fileInput.files[0]);

  if (textureInput.files[0]) {
    formData.append("texture", textureInput.files[0]);
  }

  if (iconInput.files[0]) {
    formData.append("icon", iconInput.files[0]);
  }

  const posXVal = parseFloat(inputs.posX.value);
  const posYVal = parseFloat(inputs.posY.value);
  const posZVal = parseFloat(inputs.posZ.value);
  const rotXVal = parseFloat(inputs.rotX.value);
  const rotYVal = parseFloat(inputs.rotY.value);
  const rotZVal = parseFloat(inputs.rotZ.value);
  const scaleVal = parseFloat(inputs.scale.value);

  if (flipAxisPos.checked) {
    let tempPos = posYVal;
    posYVal = posZVal;
    posZVal = tempPos;
  }

  if (flipAxisRot.checked) {
    let tempPos = rotYVal;
    rotYVal = rotZVal;
    rotZVal = tempPos;
  }

  formData.append("position", JSON.stringify([posXVal, posYVal, posZVal]));
  formData.append("scale", scaleVal);
  formData.append("rotation", JSON.stringify([rotXVal, rotYVal, rotZVal]));

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Server error: " + res.statusText);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hat.assetbundle";
      a.click();
    })
    .catch((err) => {
      alert("AssetBundle generation failed: " + err.message);
      console.error(err);
    });
});
