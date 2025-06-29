import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

import Stats from 'three/addons/libs/stats.module.js';
import { OpenStreetMapsProvider, MapView, UnitsUtils } from 'geo-three';
import GUI from 'lil-gui';

const ENVIRONMENT_TEXTURE_MAP_URL = 'https://cdn.jsdelivr.net/gh/maar-ten/local-aircrafts-webgl@main/industrial_sunset_puresky_1k.hdr';
const AIRCRAFT_MODEL_URL = 'https://cdn.jsdelivr.net/gh/maar-ten/local-aircrafts-webgl@main/Airplane.glb';
const LIVE_AIRCRAFT_DATA_URL = `http://${location.hostname}:8080/data.json`;
const POLLING_INTERVAL = 2 * 1000; // 2s
const MAX_SCALE_PLANE = 50;

let camera, controls, scene, renderer, stats, map, modelAircraft;
const aircraftCache = new Map(), aircraftArray = [];
const scalingConfig = {
    size: .00002,
    minFactor: 20,
    maxFactor: 20
};

const queryString = new URLSearchParams(window.location.search);
const mapViewLat = Number(queryString.get('lat')) ?? 52.11;
const mapViewLon = Number(queryString.get('lon')) ?? 4.77;

await new GLTFLoader().loadAsync(AIRCRAFT_MODEL_URL).then(gltf => modelAircraft = gltf.scene);

await init();
async function init() {
    scene = new THREE.Scene();

    // load environment map (clouds)
    await new RGBELoader().loadAsync(ENVIRONMENT_TEXTURE_MAP_URL).then(texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.background = texture;
        scene.environmentIntensity = 1.5;
    });

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    // initial coordinates are taken from the URL query params
    const coords = UnitsUtils.datumsToSpherical(mapViewLat, mapViewLon);

    camera = new THREE.PerspectiveCamera(80, 1, 100, 1e8);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    camera.position.set(coords.x, 100000, -coords.y + 1e-7);

    map = new MapView(MapView.PLANAR, new OpenStreetMapsProvider('https://a.tile.openstreetmap.fr/hot/'));
    map.updateMatrixWorld(true);
    scene.add(map);

    // controls for the camera
    controls = new MapControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.zoomToCursor = true;
    controls.minDistance = 1e1;
    controls.zoomSpeed = 2.0;
    controls.maxPolarAngle = Math.PI / 2 - .001; // disable the camera from going below the map
    controls.target.set(coords.x, 0, -coords.y);

    // click on an aircraft and move the camera to that aircraft's pilot position
    // const raycaster = new THREE.Raycaster();
    // const pointer = new THREE.Vector2();
    // renderer.domElement.addEventListener('click', event => {
	// 	pointer.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
	// 	pointer.y = (event.clientY / renderer.domElement.clientHeight) * -2 + 1;

    //     raycaster.setFromCamera(pointer, camera);
    //     const intersectedObjects = raycaster.intersectObjects(aircraftArray, true);
    //     if (intersectedObjects.length) {
    //         controls.target.x = intersectedObjects[0].point.x;
    //         controls.target.y = intersectedObjects[0].point.y;
    //         controls.target.z = intersectedObjects[0].point.z;
    //     }
    // });

    await addAircrafts();
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

async function addAircrafts() {
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
        if (!aircraftCache.has(aircraft.hex)) {
            const aircraftGeometry = modelAircraft.clone();
            aircraftCache.set(aircraft.hex, aircraftGeometry);
            aircraftArray.push(aircraftGeometry);
            scene.add(aircraftGeometry);
        }

        const coords = UnitsUtils.datumsToSpherical(aircraft.lat, aircraft.lon);
        const alt = aircraft.altitude * 0.3048; // convert to meters
        const modelOffsetRotation = THREE.MathUtils.degToRad(-90);
        const heading = THREE.MathUtils.degToRad(aircraft.track);

        const aircraftGeometry = aircraftCache.get(aircraft.hex);
        aircraftGeometry.position.set(coords.x, alt, -coords.y);
        aircraftGeometry.rotation.y = modelOffsetRotation + heading;
    });
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

let prevScale = 0;

function scaleAircrafts() {
    const { size, minFactor, maxFactor } = scalingConfig;
    const factor = controls.getDistance() * Math.min(minFactor * Math.tan(Math.PI * camera.fov / 360) / camera.zoom, maxFactor);
    const scale = Math.min(factor * size, MAX_SCALE_PLANE);
    aircraftArray.forEach(aircraft => aircraft.scale.set(1, 1, 1).multiplyScalar(scale));
}
