import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let sphere, planeMesh;
let infoText;
let nextButton;

const clock = new THREE.Clock();

let isDropping = false;
let dropProgress = 0;
const dropDuration = 0.5; // seconds for plane to fall
const sphereRadius = 1;
const planeSize = 3;
const initialPlaneY = sphereRadius + 2;

const faceConfigs = [
    { count: 1, segments: 1, soundId: 'sound1', deformationType: 'dent' },
    { count: 4, segments: 2, soundId: 'sound2', deformationType: 'crack' },
    { count: 16, segments: 4, soundId: 'sound3', deformationType: 'shatter_light' },
    { count: 64, segments: 8, soundId: 'sound4', deformationType: 'shatter_medium' },
    { count: 256, segments: 16, soundId: 'sound5', deformationType: 'shatter_heavy' },
    { count: 1024, segments: 32, soundId: 'sound6', deformationType: 'drape_light' },
    { count: 4096, segments: 64, soundId: 'sound7', deformationType: 'drape_heavy' }
];
let currentConfigIndex = 0;

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2.5, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, sphereRadius / 2, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Sphere (the "glitter ball")
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 64, 32);
    const sphereMaterial = createGlitterMaterial(); // Custom material for glitter
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 0; // Base of sphere at y=0 for easier calculation
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);

    // UI elements
    infoText = document.getElementById('info');
    nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', setupNextDrop);

    // Initial plane setup
    updatePlaneAndInfo();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

function createGlitterMaterial() {
    // Create a canvas texture for the glitter effect
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;

    // Base gradient (approximating the video's colors)
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#FFFF99'); // Yellowish center
    gradient.addColorStop(0.3, '#90EE90'); // Light green
    gradient.addColorStop(0.6, '#008080'); // Teal
    gradient.addColorStop(1, '#000033'); // Dark blue/black

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add "glitter" particles
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.2;
        const brightness = Math.floor(Math.random() * 155) + 100; // Brighter sparks
        ctx.fillStyle = `rgb(${brightness},${brightness},${brightness / 2})`; // Yellowish sparks
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.6,
        roughness: 0.4,
        emissive: '#111122', // Slight glow from darker areas
        emissiveMap: texture,
        emissiveIntensity: 0.2,
    });
}


function createPlane(segments) {
    if (planeMesh) {
        scene.remove(planeMesh);
        planeMesh.geometry.dispose();
        planeMesh.material.dispose();
    }

    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
    const planeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xcccccc,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9, // Glass-like transparency
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        // clearcoat: 1.0, // For extra shininess
        // clearcoatRoughness: 0.1,
    });

    planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotation.x = -Math.PI / 2; // Lay flat
    planeMesh.castShadow = true;
    planeMesh.receiveShadow = true;
    scene.add(planeMesh);
    resetPlane();
}

function resetPlane() {
    isDropping = false;
    dropProgress = 0;
    if (planeMesh) {
        planeMesh.position.set(0, initialPlaneY, 0);
        // Reset vertices if previously deformed
        const positions = planeMesh.geometry.attributes.position;
        const originalPositions = planeMesh.geometry.userData.originalPositions;
        if (originalPositions) {
            for (let i = 0; i < positions.count; i++) {
                positions.setXYZ(i, originalPositions[i * 3], originalPositions[i * 3 + 1], originalPositions[i * 3 + 2]);
            }
            positions.needsUpdate = true;
            planeMesh.geometry.computeVertexNormals();
        }
    }
}

function updatePlaneAndInfo() {
    const config = faceConfigs[currentConfigIndex];
    infoText.textContent = `${config.count} FACE`;
    createPlane(config.segments);
}

function setupNextDrop() {
    currentConfigIndex = (currentConfigIndex + 1) % faceConfigs.length;
    updatePlaneAndInfo();
    startDrop();
}

function startDrop() {
    resetPlane(); // Ensure it's reset
    isDropping = true;
    dropProgress = 0;

    // Store original vertex positions for reset and relative deformation
    const positions = planeMesh.geometry.attributes.position;
    if (!planeMesh.geometry.userData.originalPositions || planeMesh.geometry.userData.originalPositions.length !== positions.array.length) {
        planeMesh.geometry.userData.originalPositions = positions.array.slice();
    }
}

function deformPlaneOnImpact() {
    const config = faceConfigs[currentConfigIndex];
    const positions = planeMesh.geometry.attributes.position;
    const originalPositions = planeMesh.geometry.userData.originalPositions;
    const impactPoint = new THREE.Vector3(0, 0, 0); // Assuming sphere center is (0,0,0) for impact projection
    const sphereTopY = sphereRadius;

    for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1]; // This is Z in world space due to plane rotation
        const oz = originalPositions[i * 3 + 2]; // This is Y in local space (initially 0)

        const vertexLocal = new THREE.Vector3(ox, oy, oz);
        // No need to convert to world if we consider sphere center as (0,0,0) and plane is centered

        const distToImpactCenter = Math.sqrt(vertexLocal.x * vertexLocal.x + vertexLocal.y * vertexLocal.y); // vertex.y is plane's local Z

        let deformation = 0;
        const maxDeformationDepth = sphereRadius * 0.6; // How deep it can go

        switch (config.deformationType) {
            case 'dent': // 1 Face
                if (distToImpactCenter < planeSize * 0.3) {
                    deformation = -maxDeformationDepth * 0.5 * (1 - distToImpactCenter / (planeSize * 0.3));
                }
                break;
            case 'crack': // 4 Faces
                if (distToImpactCenter < planeSize * 0.4) {
                    deformation = -maxDeformationDepth * 0.7 * Math.pow(Math.cos(distToImpactCenter / (planeSize * 0.4) * Math.PI / 2), 2);
                    // Make one specific vertex go deeper for a "crack point"
                    if (i === Math.floor(positions.count / 2) + config.segments) deformation *= 1.5; // Example
                }
                break;
            case 'shatter_light': // 16
            case 'shatter_medium': // 64
            case 'shatter_heavy': // 256
                const shatterRadius = planeSize * 0.5 * (1 + (config.segments - 4) / 30); // Larger radius for more segments
                if (distToImpactCenter < shatterRadius) {
                    const normalizedDist = distToImpactCenter / shatterRadius;
                    deformation = -maxDeformationDepth * (1 - normalizedDist) * (0.7 + Math.random() * 0.6); // Jagged
                    // Add some lift to edges
                    if (normalizedDist > 0.6 && normalizedDist < 0.9) {
                        deformation += maxDeformationDepth * 0.2 * Math.random();
                    }
                }
                break;
            case 'drape_light': // 1024
            case 'drape_heavy': // 4096
                const drapeRadius = planeSize * 0.6; // Should cover most of the sphere contact
                if (distToImpactCenter < drapeRadius) {
                    // Smooth draping (cosine bell shape)
                    deformation = -maxDeformationDepth * Math.pow(Math.cos(distToImpactCenter / drapeRadius * Math.PI / 2), 2);
                } else if (distToImpactCenter < planeSize / 2 * 0.9) {
                    // Slight upward curl at edges
                    deformation = maxDeformationDepth * 0.1 * Math.pow(Math.cos((distToImpactCenter - drapeRadius) / (planeSize / 2 - drapeRadius) * Math.PI / 2), 2);
                }
                break;
        }
        // Apply deformation to the local Z of the plane (which is world Y after rotation)
        positions.setZ(i, oz + deformation);
    }
    positions.needsUpdate = true;
    planeMesh.geometry.computeVertexNormals(); // Important for lighting after deformation

    // Play sound
    const sound = document.getElementById(config.soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (isDropping) {
        dropProgress += deltaTime / dropDuration;
        dropProgress = Math.min(dropProgress, 1);

        const newY = THREE.MathUtils.lerp(initialPlaneY, sphereRadius - 0.02, dropProgress); // Target slightly inside sphere
        planeMesh.position.y = newY;

        if (dropProgress >= 1) {
            isDropping = false;
            deformPlaneOnImpact();
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// --- Start everything ---
init();