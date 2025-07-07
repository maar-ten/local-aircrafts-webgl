import * as THREE from 'three';
import { UnitsUtils } from 'geo-three';

const MODEL_ROTATION_OFFSET = -90; // degrees
const LINE_MATERIAL = new THREE.LineBasicMaterial({color: 0xff00ff});

export class Aircraft {
    constructor(aircraft, model, scene) {
        this.aircraft = aircraft;
        this.model = model;
        this.scene = scene;
        this.path = [toPosition(aircraft)];
        this.line = createLine(this.path);

        // clone the material to change the color of each aircraft individually
        this.material = this.model.children[0].children[2].material.clone();
        this.model.children[0].children[2].material = this.material;

        this.scene.add(this.model);
        this.scene.add(this.line);
    }

    get hex() {
        return this.aircraft.hex;
    }

    update(aircraft) {
        const position = toPosition(aircraft);
        this.model.position.copy(position);
        this.model.rotation.y = toHeading(aircraft);
        this.material.color = getAltitudeColor(aircraft.altitude);

        this.path.push(position);
        this.line.geometry = new THREE.BufferGeometry().setFromPoints(this.path);
    }

    remove() {
        this.scene.remove(this.model);
        this.scene.remove(this.line);
    }
}

function toPosition(aircraft) {
    const {x ,y} = UnitsUtils.datumsToSpherical(aircraft.lat, aircraft.lon);
    const height = aircraft.altitude * 0.3048; // convert to meters
    return new THREE.Vector3(x, height ,-y);
}

function toHeading(aircraft) {
    const heading = THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET - aircraft.track);
    return heading;
}

function createLine(points) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, LINE_MATERIAL);
}

function getAltitudeColor(altitude) {
    const maximumAltitude = 40000;
    const relativeAltitude = Math.min(Number(altitude) / maximumAltitude, 1);

    const hue = 50 + Math.floor(310 * relativeAltitude); // between yellow (50) and red (360)
    const color = new THREE.Color();
    color.setHSL(relativeAltitude, 1, .5);
    return color;
}