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
        this.line = undefined;

        this.scene.add(this.model);
    }

    get hex() {
        return this.aircraft.hex;
    }

    update(aircraft) {
        const position = toPosition(aircraft);
        this.model.position.copy(position);
        this.model.rotation.y = toHeading(aircraft);

        this.path.push(position);
        this.line = createLine(this.path);
        this.scene.add(this.line);
    }

    remove() {
        this.scene.remove(this.model);
        this.scene.remove(this.line);
        this.line.geometry.dispose();
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