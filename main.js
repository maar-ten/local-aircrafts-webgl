import { Scene, PerspectiveCamera, AmbientLight, Color, LinearSRGBColorSpace, WebGLRenderer } from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { OpenStreetMapsProvider, MapView, UnitsUtils } from 'geo-three';

let camera, controls, scene, renderer;

init();
//render(); // remove when using animation loop

function init() {
    const renderer = new WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

	var scene = new Scene();
	scene.background = new Color(0.4, 0.4, 0.4, LinearSRGBColorSpace);
	var provider = new OpenStreetMapsProvider();
	var map = new MapView(MapView.PLANAR, provider);
	scene.add(map);
	map.updateMatrixWorld(true);
	var camera = new PerspectiveCamera(80, 1, 0.1, 1e12);
	var controls = new MapControls(camera, renderer.domElement);
	controls.minDistance = 1e1;
	controls.zoomSpeed = 2.0;
	var coords = UnitsUtils.datumsToSpherical(40.940119, -8.535589);
	controls.target.set(coords.x, 0, -coords.y);
	camera.position.set(0, 1000, 0);
	scene.add(new AmbientLight(0x777777));

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    updateFpsCounter();
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
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
        document.getElementById('fps-counter').innerText = `${Math.round(frameTime)} FPS`;
        frameCount = 0;
    }
    lastFrameTime = now;
    frameCount++;
}