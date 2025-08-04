import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* simulation.js */

// Global variables for ThreeJS scene and simulation parameters
let scene, camera, renderer, controls;
let particles = [];
let particleMeshes = [];
let numParticles, temperature, boxSize, epsilon, sigma, dt;
let simulationTime = 0;
let potentialEnergy = 0;
let kineticEnergy = 0;
let isRunning = false;
let animationId;
let cutoff = 2.5; // Will be adjusted as 2.5 * sigma
const mass = 1;    // Assume unit mass for simplicity
const kB = 1;      // Boltzmann constant (in reduced units)

// Grab DOM elements
const simulationContainer = document.getElementById('simulation-container');
const numParticlesInput = document.getElementById('numParticles');
const temperatureInput = document.getElementById('temperature');
const boxSizeInput = document.getElementById('boxSize');
const epsilonInput = document.getElementById('epsilon');
const sigmaInput = document.getElementById('sigma');
const timeStepInput = document.getElementById('timeStep');
const startPauseBtn = document.getElementById('startPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const displayTemperature = document.getElementById('displayTemperature');
const displayPotentialEnergy = document.getElementById('displayPotentialEnergy');
const displayKineticEnergy = document.getElementById('displayKineticEnergy');
const displayTime = document.getElementById('displayTime');

// Particle constructor to store position, velocity, and force
function Particle(position, velocity) {
  this.position = position.clone();
  this.velocity = velocity.clone();
  this.force = new THREE.Vector3();
}

// Initialize Three.js scene, camera, lights, and controls
function initScene() {
  scene = new THREE.Scene();
  
  let aspect = simulationContainer.clientWidth / simulationContainer.clientHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 0, boxSize);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(simulationContainer.clientWidth, simulationContainer.clientHeight);
  simulationContainer.appendChild(renderer.domElement);
  
  // Add ambient and directional lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);
  
  // Initialize OrbitControls to allow interactive camera movement
  controls = new OrbitControls(camera, renderer.domElement);
  
  window.addEventListener('resize', onWindowResize, false);
}

// Adjust renderer and camera on window resize
function onWindowResize() {
  camera.aspect = simulationContainer.clientWidth / simulationContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(simulationContainer.clientWidth, simulationContainer.clientHeight);
}

// Initialize particles, create their Three.js mesh, and add them to the scene
function initParticles() {
  // Remove any old meshes
  particles = [];
  for (let mesh of particleMeshes) {
    scene.remove(mesh);
  }
  particleMeshes = [];
  
  // Get current simulation parameters from UI
  numParticles = parseInt(numParticlesInput.value);
  temperature = parseFloat(temperatureInput.value);
  boxSize = parseFloat(boxSizeInput.value);
  epsilon = parseFloat(epsilonInput.value);
  sigma = parseFloat(sigmaInput.value);
  dt = parseFloat(timeStepInput.value);
  cutoff = 2.5 * sigma;
  
  // Create particles with random positions (within the box) and velocities
  for (let i = 0; i < numParticles; i++) {
    let pos = new THREE.Vector3(
      (Math.random() - 0.5) * boxSize,
      (Math.random() - 0.5) * boxSize,
      (Math.random() - 0.5) * boxSize
    );
    
    // Use the Box-Muller transform to generate velocities from a Gaussian distribution
    let v = new THREE.Vector3(
      randomGaussian() * Math.sqrt(temperature),
      randomGaussian() * Math.sqrt(temperature),
      randomGaussian() * Math.sqrt(temperature)
    );
    
    let particle = new Particle(pos, v);
    particles.push(particle);
    
    // Create a sphere to visually represent the particle
    let geometry = new THREE.SphereGeometry(sigma * 0.5, 16, 16);
    let material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(particle.position);
    scene.add(sphere);
    particleMeshes.push(sphere);
  }
  
  simulationTime = 0;
}

// Box-Muller method for generating Gaussian distributed random numbers
function randomGaussian() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Compute the magnitude of the Lennard-Jones force given a separation distance r
function calculateLennardJonesForce(r) {
  if (r === 0) return 0;
  let sr = sigma / r;
  let sr14 = Math.pow(sr, 14);
  let sr8 = Math.pow(sr, 8);
  // F(r) = 48 * epsilon / sigma^2 * [(sigma/r)^14 - 0.5 * (sigma/r)^8]
  return (48 * epsilon / (sigma * sigma)) * (sr14 - 0.5 * sr8);
}

// Loop over all unique particle pairs to compute forces and potential energy
function computeForces() {
  // Reset forces for all particles
  for (let particle of particles) {
    particle.force.set(0, 0, 0);
  }
  potentialEnergy = 0;
  
  // Compute pair interactions
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      let p1 = particles[i];
      let p2 = particles[j];
      
      // Compute displacement and apply minimum image convention for periodic boundaries
      let dx = p2.position.x - p1.position.x;
      let dy = p2.position.y - p1.position.y;
      let dz = p2.position.z - p1.position.z;
      
      if (dx > boxSize/2) dx -= boxSize;
      else if (dx < -boxSize/2) dx += boxSize;
      if (dy > boxSize/2) dy -= boxSize;
      else if (dy < -boxSize/2) dy += boxSize;
      if (dz > boxSize/2) dz -= boxSize;
      else if (dz < -boxSize/2) dz += boxSize;
      
      let displacement = new THREE.Vector3(dx, dy, dz);
      let r = displacement.length();
      
      // Apply cutoff for efficiency
      if (r < cutoff && r > 0) {
        let forceMag = calculateLennardJonesForce(r);
        let forceVec = displacement.normalize().multiplyScalar(forceMag);
        p1.force.add(forceVec);
        p2.force.sub(forceVec);
        
        // Calculate the Lennard-Jones potential energy: U(r) = 4*ε*((σ/r)^12 - (σ/r)^6)
        let sr6 = Math.pow(sigma / r, 6);
        let potential = 4 * epsilon * (sr6 * sr6 - sr6);
        potentialEnergy += potential;
      }
    }
  }
}

// Wrap particle positions when they leave the simulation box (periodic boundary conditions)
function applyPeriodicBoundary(particle) {
  let halfBox = boxSize / 2;
  if (particle.position.x > halfBox) particle.position.x -= boxSize;
  else if (particle.position.x < -halfBox) particle.position.x += boxSize;
  
  if (particle.position.y > halfBox) particle.position.y -= boxSize;
  else if (particle.position.y < -halfBox) particle.position.y += boxSize;
  
  if (particle.position.z > halfBox) particle.position.z -= boxSize;
  else if (particle.position.z < -halfBox) particle.position.z += boxSize;
}

// Perform one simulation time step using the Velocity Verlet integration scheme
function simulationStep() {
  // First half-step: update velocities based on the current force (acceleration)
  for (let particle of particles) {
    let acceleration = particle.force.clone().divideScalar(mass);
    particle.velocity.add(acceleration.multiplyScalar(dt / 2));
  }
  
  // Update positions: x(t+dt) = x(t) + v(t+dt/2) * dt
  for (let particle of particles) {
    particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    applyPeriodicBoundary(particle);
  }
  
  // Recompute forces at new positions
  computeForces();
  
  // Second half-step: update velocities to full step using new acceleration
  kineticEnergy = 0;
  for (let particle of particles) {
    let accelerationNew = particle.force.clone().divideScalar(mass);
    particle.velocity.add(accelerationNew.multiplyScalar(dt / 2));
    
    kineticEnergy += 0.5 * mass * particle.velocity.lengthSq();
  }
  
  simulationTime += dt;
}

// Update the positions of the Three.js meshes to reflect particle motion
function updateMeshPositions() {
  for (let i = 0; i < particles.length; i++) {
    particleMeshes[i].position.copy(particles[i].position);
  }
}

// Update on-screen simulation data (temperature, energies, elapsed time)
function updateDisplay() {
  // Average kinetic energy per particle and deduced temperature:
  // T = (2/3)*(<KE>/(kB))
  let avgKE = kineticEnergy / numParticles;
  let currentTemperature = (2/3) * (avgKE / kB);
  displayTemperature.textContent = currentTemperature.toFixed(2);
  displayPotentialEnergy.textContent = potentialEnergy.toFixed(2);
  displayKineticEnergy.textContent = kineticEnergy.toFixed(2);
  displayTime.textContent = simulationTime.toFixed(2);
}

// Main animation loop using requestAnimationFrame
function animate() {
  if (isRunning) {
    simulationStep();
    updateMeshPositions();
    updateDisplay();
  }
  controls.update();
  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// Event listeners for the Start/Pause and Reset buttons
startPauseBtn.addEventListener('click', function() {
  isRunning = !isRunning;
  startPauseBtn.textContent = isRunning ? 'Pause Simulation' : 'Start Simulation';
});

resetBtn.addEventListener('click', function() {
  isRunning = false;
  startPauseBtn.textContent = 'Start Simulation';
  simulationTime = 0;
  initParticles();
});

// Initialize the simulation: setup the scene, particles, and start the animation loop
function init() {
  boxSize = parseFloat(boxSizeInput.value);
  initScene();
  initParticles();
  computeForces();
  animate();
}

init();
