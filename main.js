import * as Three from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

import Stats from 'three/addons/libs/stats.module.js';
import { OpenStreetMapsProvider, MapView, UnitsUtils } from 'geo-three';
import GUI from 'lil-gui';

const ENVIRONMENT_TEXTURE_MAP_URL = 'https://cdn.jsdelivr.net/gh/maar-ten/local-aircrafts-webgl@main/industrial_sunset_puresky_1k.hdr';
const LIVE_AIRCRAFT_DATA_URL = `http://${location.hostname}:8080/data.json`;
const POLLING_INTERVAL = 2 * 1000; // 2s

let camera, controls, scene, renderer, stats, modelAircraft;
const aircraftCache = new Map(), aircraftArray = [];
const scalingConfig = {
    size: .00002,
    minFactor: 20,
    maxFactor: 20
};

const queryString = new URLSearchParams(window.location.search);
const mapViewLat = Number(queryString.get('lat')) ?? 52.11;
const mapViewLon = Number(queryString.get('lon')) ?? 4.77;

// load aircraft model and init world
const gltfLoader = new GLTFLoader();
gltfLoader.load('Airplane.glb', (gltf) => {
    modelAircraft = gltf.scene;
    init();
});

function init() {
    renderer = new Three.WebGLRenderer({antialias: true});
    renderer.toneMapping = Three.ACESFilmicToneMapping;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    scene = new Three.Scene();

    new RGBELoader().load(ENVIRONMENT_TEXTURE_MAP_URL, (texture) => {
        texture.mapping = Three.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        scene.environmentIntensity = 1.5;
    });

    const coords = UnitsUtils.datumsToSpherical(mapViewLat, mapViewLon);

    camera = new Three.PerspectiveCamera(80, 1, 100, 1e8);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.set(coords.x, 100000, -coords.y + 1e-7);

    const map = new MapView(MapView.PLANAR, new OpenStreetMapsProvider('https://a.tile.openstreetmap.fr/hot/'));
    map.updateMatrixWorld(true);
    scene.add(map);

    controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 1e1;
    controls.zoomSpeed = 2.0;
    controls.target.set(coords.x, 0, -coords.y);

    addAircrafts();
    addGui();

    stats = new Stats()
    document.body.appendChild(stats.dom)

    window.addEventListener('resize', onWindowResize);
}

function logError(err) {
    console.log(`[${err.fileName}:${err.lineNumber}:${err.columnNumber}]`, err.message)
}

function addGui() {
    const gui = new GUI();
    gui.add(scene, 'environmentIntensity', 0, 100, 1);
}

function addAircrafts() {
    fetch('data.json')
        .then(response => plotAircrafts(response))
        .catch(logError);
}
// setInterval(addAircrafts, POLLING_INTERVAL);

async function plotAircrafts(response) {
    if (!response.ok) {
        throw new Error(`Response not OK: ${response.status}`);
    }

    const aircraftDataArr = await response.json();
    aircraftDataArr.forEach(aircraft => {
        if (aircraftCache.has(aircraft.hex)) {
            const coords = UnitsUtils.datumsToSpherical(aircraft.lat, aircraft.lon);
            const alt = aircraft.altitude * 0.3048;
            const modelOffsetRotation = Three.MathUtils.degToRad(-90);
            const heading = Three.MathUtils.degToRad(aircraft.track);
            
            const aircraftGeometry = aircraftCache.get(aircraft.hex);
            aircraftGeometry.position.set(coords.x, alt, -coords.y);
            aircraftGeometry.rotation.y = modelOffsetRotation + heading;
            return;
        }

        const aircraftGeometry = createAircraft(aircraft);
        aircraftCache.set(aircraft.hex, aircraftGeometry);
        aircraftArray.push(aircraftGeometry);
        scene.add(aircraftGeometry);
    });
}

function createAircraft({ lat, lon, altitude, track }) {
    const coords = UnitsUtils.datumsToSpherical(lat, lon);
    const alt = altitude * 0.3048;
    const modelOffsetRotation = Three.MathUtils.degToRad(-90);
    const heading = Three.MathUtils.degToRad(track);

    const aircraft = modelAircraft.clone();
    aircraft.position.set(coords.x, alt, -coords.y);
    aircraft.rotation.y = modelOffsetRotation + heading;
    return aircraft;
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

function animate() {
    stats.update();
    scaleAircrafts();
    controls.update();
    render();
}

function render() {
    renderer.render(scene, camera);
}

function scaleAircrafts() {
    const { size, minFactor, maxFactor } = scalingConfig;
    const factor = controls.getDistance() * Math.min(minFactor * Math.tan(Math.PI * camera.fov / 360) / camera.zoom, maxFactor);
    const scale = factor * size;
    aircraftArray.forEach(aircraft => aircraft.scale.set(1, 1, 1).multiplyScalar(scale));
}
