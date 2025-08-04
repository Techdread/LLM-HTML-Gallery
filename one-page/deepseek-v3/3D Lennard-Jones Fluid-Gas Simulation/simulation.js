// Simulation parameters
let params = {
    particleCount: 100,
    boxSize: 10,
    epsilon: 1.0,
    sigma: 1.0,
    cutoffRadius: 3.0,
    timeStep: 0.01,
    initialTemp: 1.0,
    targetTemp: 1.0,
    thermostatEnabled: true
};

// Simulation state
let particles = [];
let particleMeshes = [];
let isRunning = false;
let elapsedTime = 0;
let frameId = null;

// Three.js objects
let scene, camera, renderer, controls;
let boxHelper;

// DOM elements
const domElements = {
    particleCount: document.getElementById('particleCountValue'),
    boxSize: document.getElementById('boxSizeValue'),
    epsilon: document.getElementById('epsilonValue'),
    sigma: document.getElementById('sigmaValue'),
    cutoffRadius: document.getElementById('cutoffRadiusValue'),
    timeStep: document.getElementById('timeStepValue'),
    initialTemp: document.getElementById('initialTempValue'),
    targetTemp: document.getElementById('targetTempValue'),
    currentTemp: document.getElementById('currentTemp'),
    kineticEnergy: document.getElementById('kineticEnergy'),
    potentialEnergy: document.getElementById('potentialEnergy'),
    totalEnergy: document.getElementById('totalEnergy'),
    elapsedTime: document.getElementById('elapsedTime')
};

// Initialize Three.js scene
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth - 350, window.innerHeight);
    document.getElementById('simulation-container').appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Simulation box helper
    updateBoxHelper();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
}

// Update the box helper when box size changes
function updateBoxHelper() {
    if (boxHelper) scene.remove(boxHelper);
    
    const boxGeometry = new THREE.BoxGeometry(params.boxSize, params.boxSize, params.boxSize);
    boxHelper = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeometry),
        new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
    );
    scene.add(boxHelper);
}

// Window resize handler
function onWindowResize() {
    camera.aspect = (window.innerWidth - 350) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 350, window.innerHeight);
}

// Initialize particles
function initParticles() {
    // Clear existing particles
    particles = [];
    particleMeshes.forEach(mesh => scene.remove(mesh));
    particleMeshes = [];

    // Create particles
    for (let i = 0; i < params.particleCount; i++) {
        // Random position within the box
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * params.boxSize * 0.9,
            (Math.random() - 0.5) * params.boxSize * 0.9,
            (Math.random() - 0.5) * params.boxSize * 0.9
        );

        // Random velocity based on temperature (Maxwell-Boltzmann distribution)
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * Math.sqrt(params.initialTemp),
            (Math.random() - 0.5) * Math.sqrt(params.initialTemp),
            (Math.random() - 0.5) * Math.sqrt(params.initialTemp)
        );

        // Create particle data
        particles.push({
            position: position,
            velocity: velocity,
            force: new THREE.Vector3(0, 0, 0),
            prevForce: new THREE.Vector3(0, 0, 0)
        });

        // Create particle mesh
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color().setHSL(i / params.particleCount, 0.7, 0.5),
            shininess: 30
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        scene.add(mesh);
        particleMeshes.push(mesh);
    }
}

// Calculate Lennard-Jones force
function calculateLennardJonesForce(distance, epsilon, sigma) {
    if (distance >= params.cutoffRadius) return 0;
    
    const sr = sigma / distance;
    const sr6 = Math.pow(sr, 6);
    const sr12 = sr6 * sr6;
    
    return 48 * epsilon * (sr12 - 0.5 * sr6) / (distance * distance);
}

// Calculate forces between all particles
function calculateForces() {
    // Reset forces
    particles.forEach(p => p.force.set(0, 0, 0));
    
    let potentialEnergy = 0;
    
    // Calculate forces between all unique pairs
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            
            // Calculate distance with periodic boundary conditions
            let dx = p2.position.x - p1.position.x;
            let dy = p2.position.y - p1.position.y;
            let dz = p2.position.z - p1.position.z;
            
            // Minimum image convention
            dx = dx - params.boxSize * Math.round(dx / params.boxSize);
            dy = dy - params.boxSize * Math.round(dy / params.boxSize);
            dz = dz - params.boxSize * Math.round(dz / params.boxSize);
            
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance > 0 && distance < params.cutoffRadius) {
                const forceMagnitude = calculateLennardJonesForce(distance, params.epsilon, params.sigma);
                
                // Force vector components
                const fx = forceMagnitude * dx / distance;
                const fy = forceMagnitude * dy / distance;
                const fz = forceMagnitude * dz / distance;
                
                // Apply equal and opposite forces
                p1.force.x -= fx;
                p1.force.y -= fy;
                p1.force.z -= fz;
                
                p2.force.x += fx;
                p2.force.y += fy;
                p2.force.z += fz;
                
                // Calculate potential energy (LJ potential: 4ε[(σ/r)^12 - (σ/r)^6])
                const sr = params.sigma / distance;
                const sr6 = Math.pow(sr, 6);
                const sr12 = sr6 * sr6;
                potentialEnergy += 4 * params.epsilon * (sr12 - sr6);
            }
        }
    }
    
    return potentialEnergy;
}

// Velocity Verlet integration
function integrate(dt) {
    // Step 1: Update positions and half-step velocities
    for (const p of particles) {
        // v(t + dt/2) = v(t) + a(t) * dt / 2
        p.velocity.x += p.force.x * dt / 2;
        p.velocity.y += p.force.y * dt / 2;
        p.velocity.z += p.force.z * dt / 2;
        
        // x(t + dt) = x(t) + v(t + dt/2) * dt
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        p.position.z += p.velocity.z * dt;
        
        // Apply periodic boundary conditions
        if (p.position.x < -params.boxSize/2) p.position.x += params.boxSize;
        if (p.position.x > params.boxSize/2) p.position.x -= params.boxSize;
        if (p.position.y < -params.boxSize/2) p.position.y += params.boxSize;
        if (p.position.y > params.boxSize/2) p.position.y -= params.boxSize;
        if (p.position.z < -params.boxSize/2) p.position.z += params.boxSize;
        if (p.position.z > params.boxSize/2) p.position.z -= params.boxSize;
        
        // Store current force for next step
        p.prevForce.copy(p.force);
    }
    
    // Step 2: Calculate new forces
    const potentialEnergy = calculateForces();
    
    // Step 3: Complete velocity update
    let kineticEnergy = 0;
    for (const p of particles) {
        // v(t + dt) = v(t + dt/2) + a(t + dt) * dt / 2
        p.velocity.x += p.force.x * dt / 2;
        p.velocity.y += p.force.y * dt / 2;
        p.velocity.z += p.force.z * dt / 2;
        
        // Calculate kinetic energy (0.5 * m * v^2, assuming m=1)
        kineticEnergy += 0.5 * (p.velocity.x*p.velocity.x + p.velocity.y*p.velocity.y + p.velocity.z*p.velocity.z);
    }
    
    return { kineticEnergy, potentialEnergy };
}

// Thermostat to control temperature
function applyThermostat(targetTemp) {
    // Calculate current temperature from kinetic energy
    // KE = (3/2) N kT (we set kB=1)
    const currentTemp = (2/3) * calculateKineticEnergy() / params.particleCount;
    
    if (currentTemp > 0) {
        const scalingFactor = Math.sqrt(targetTemp / currentTemp);
        
        // Scale all velocities
        for (const p of particles) {
            p.velocity.multiplyScalar(scalingFactor);
        }
    }
}

// Calculate total kinetic energy
function calculateKineticEnergy() {
    let ke = 0;
    for (const p of particles) {
        ke += 0.5 * (p.velocity.x*p.velocity.x + p.velocity.y*p.velocity.y + p.velocity.z*p.velocity.z);
    }
    return ke;
}

// Update particle meshes positions
function updateParticleMeshes() {
    for (let i = 0; i < particles.length; i++) {
        particleMeshes[i].position.copy(particles[i].position);
    }
}

// Animation loop
function animate() {
    frameId = requestAnimationFrame(animate);
    
    if (isRunning) {
        // Run simulation steps
        const { kineticEnergy, potentialEnergy } = integrate(params.timeStep);
        
        // Apply thermostat if enabled
        if (params.thermostatEnabled) {
            applyThermostat(params.targetTemp);
        }
        
        // Update statistics
        const currentTemp = (2/3) * kineticEnergy / params.particleCount;
        domElements.currentTemp.textContent = currentTemp.toFixed(3);
        domElements.kineticEnergy.textContent = kineticEnergy.toFixed(3);
        domElements.potentialEnergy.textContent = potentialEnergy.toFixed(3);
        domElements.totalEnergy.textContent = (kineticEnergy + potentialEnergy).toFixed(3);
        
        elapsedTime += params.timeStep;
        domElements.elapsedTime.textContent = elapsedTime.toFixed(2);
    }
    
    // Update particle positions
    updateParticleMeshes();
    
    // Render scene
    controls.update();
    renderer.render(scene, camera);
}

// Initialize UI event listeners
function initUI() {
    // Slider events
    document.getElementById('particleCount').addEventListener('input', (e) => {
        params.particleCount = parseInt(e.target.value);
        domElements.particleCount.textContent = params.particleCount;
    });
    
    document.getElementById('boxSize').addEventListener('input', (e) => {
        params.boxSize = parseFloat(e.target.value);
        domElements.boxSize.textContent = params.boxSize;
        updateBoxHelper();
    });
    
    document.getElementById('epsilon').addEventListener('input', (e) => {
        params.epsilon = parseFloat(e.target.value);
        domElements.epsilon.textContent = params.epsilon;
    });
    
    document.getElementById('sigma').addEventListener('input', (e) => {
        params.sigma = parseFloat(e.target.value);
        domElements.sigma.textContent = params.sigma;
    });
    
    document.getElementById('cutoffRadius').addEventListener('input', (e) => {
        params.cutoffRadius = parseFloat(e.target.value);
        domElements.cutoffRadius.textContent = params.cutoffRadius;
    });
    
    document.getElementById('timeStep').addEventListener('input', (e) => {
        params.timeStep = parseFloat(e.target.value);
        domElements.timeStep.textContent = params.timeStep;
    });
    
    document.getElementById('initialTemp').addEventListener('input', (e) => {
        params.initialTemp = parseFloat(e.target.value);
        domElements.initialTemp.textContent = params.initialTemp;
    });
    
    document.getElementById('targetTemp').addEventListener('input', (e) => {
        params.targetTemp = parseFloat(e.target.value);
        domElements.targetTemp.textContent = params.targetTemp;
    });
    
    document.getElementById('thermostatEnabled').addEventListener('change', (e) => {
        params.thermostatEnabled = e.target.checked;
    });
    
    // Button events
    document.getElementById('startBtn').addEventListener('click', () => {
        isRunning = true;
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        isRunning = false;
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        isRunning = false;
        elapsedTime = 0;
        initParticles();
        calculateForces(); // Initialize forces
    });
}

// Initialize everything
function init() {
    initThreeJS();
    initUI();
    initParticles();
    calculateForces(); // Initialize forces
    animate();
}

// Start the simulation
init();