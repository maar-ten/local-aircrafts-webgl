import { Scene, PerspectiveCamera, AmbientLight, Color, WebGLRenderer } from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { OpenStreetMapsProvider, MapView, UnitsUtils } from 'geo-three';

let camera, controls, scene, renderer;

init();

function init() {
    renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    scene = new Scene();
    scene.background = new Color(0xaad3df); // OSM color of water

    const map = new MapView(MapView.PLANAR, new OpenStreetMapsProvider());
    map.updateMatrixWorld(true);
    scene.add(map);

    const coords = UnitsUtils.datumsToSpherical(52.11, 4.77);

    camera = new PerspectiveCamera(80, 1, 0.1, 1e12);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.set(coords.x, 100000, -coords.y + 1e-7);

    controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1e1;
    controls.zoomSpeed = 2.0;
    controls.target.set(coords.x, 0, -coords.y);

    scene.add(new AmbientLight(0x777777));

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function animate() {
    updateFpsCounter();
    controls.update();
    render();
}

function render() {
    renderer.render(scene, camera);
}

let lastFrameTime = Date.now();
let frameCount = 0;

function updateFpsCounter() {
    const now = Date.now();
    if (frameCount % 60 === 0) {
        const frameTime = 1000 / (now - lastFrameTime);
        document.getElementById('fps-counter').innerText = `${Math.floor(frameTime)} FPS`;
        frameCount = 0;
        console.log(camera.position);
    }
    lastFrameTime = now;
    frameCount++;
}