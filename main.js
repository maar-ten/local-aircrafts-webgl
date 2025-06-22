import { Mesh, MeshBasicMaterial, ConeGeometry, Scene, PerspectiveCamera, HemisphereLight, Color, WebGLRenderer } from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { OpenStreetMapsProvider, MapView, UnitsUtils } from 'geo-three';

let camera, controls, scene, renderer;

const queryString = new URLSearchParams(window.location.search);
const mapViewLat = Number(queryString.get('lat')) ?? 52.11;
const mapViewLon = Number(queryString.get('lon')) ?? 4.77;

init();

function init() {
    renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    scene = new Scene();
    scene.background = new Color(0xaad3df); // OSM color of water

    const coords = UnitsUtils.datumsToSpherical(mapViewLat, mapViewLon);

    camera = new PerspectiveCamera(80, 1, 0.1, 1e12);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.set(coords.x, 100000, -coords.y + 1e-7);

    const map = new MapView(MapView.PLANAR, new OpenStreetMapsProvider());
    map.updateMatrixWorld(true);
    scene.add(map);

    controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1e1;
    controls.zoomSpeed = 2.0;
    controls.target.set(coords.x, 0, -coords.y);

    scene.add(new HemisphereLight(0xaad3df, 0xff0000, 4));

    addAircrafts();

    window.addEventListener('resize', onWindowResize);
}

function logError(err) {
  console.log(`[${err.fileName}:${err.lineNumber}:${err.columnNumber}]`, err.message)
}

function addAircrafts() {
    fetch('data.json')
      .then(response => plotAircrafts(response))
      .catch(logError);
}

async function plotAircrafts(response) {
    if (!response.ok) {
        throw new Error(`Response not OK: ${response.status}`);
    }

    const aircraftDataArr = await response.json();
    aircraftDataArr.forEach(aircraft => scene.add(createAircraft(aircraft)));
}

function createAircraft({lat, lon, altitude, track}) {
    const coords = UnitsUtils.datumsToSpherical(lat, lon);
    const alt = altitude * 0.3048;
    const heading = track / 360 * 2 * Math.PI;

    const geometry = new ConeGeometry( 5, 10, 3 );
    const material = new MeshBasicMaterial( { color: 0xff0000 } );
    const aircraft = new Mesh( geometry, material );
    aircraft.position.set(coords.x, alt, -coords.y);
    aircraft.rotation.set(-Math.PI/2, 0, heading);
    aircraft.scale.set(10, 10, 10);
    return aircraft;
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
    }
    lastFrameTime = now;
    frameCount++;
}