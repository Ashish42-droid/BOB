import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeDMedicalCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 400;
    const height = currentMount.clientHeight || 400;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 1. Outer Particle Wireframe Sphere (Village Network)
    const geometry = new THREE.IcosahedronGeometry(1.1, 3);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan glow
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const sphereMesh = new THREE.Mesh(geometry, wireframeMaterial);
    scene.add(sphereMesh);

    // 2. Inner Glowing Core (AI Pulse)
    const coreGeometry = new THREE.IcosahedronGeometry(0.75, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald green
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 3. Node Points (Representing Rural Clinics)
    const count = 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.12;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Cyan / Emerald gradient points
      colors[i * 3] = Math.random() > 0.5 ? 0.02 : 0.06;
      colors[i * 3 + 1] = Math.random() > 0.5 ? 0.72 : 0.92;
      colors[i * 3 + 2] = Math.random() > 0.5 ? 0.8 : 0.6;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointsMesh);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / width - 0.5) * 0.5;
      mouseY = ((event.clientY - rect.top) / height - 0.5) * 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotation
      sphereMesh.rotation.y = elapsedTime * 0.15;
      sphereMesh.rotation.x = elapsedTime * 0.08;

      coreMesh.rotation.y = -elapsedTime * 0.25;
      coreMesh.rotation.z = elapsedTime * 0.1;

      pointsMesh.rotation.y = elapsedTime * 0.15;
      pointsMesh.rotation.x = elapsedTime * 0.08;

      // Mouse Parallax Smooth Interpolation
      scene.rotation.y += (mouseX - scene.rotation.y) * 0.05;
      scene.rotation.x += (mouseY - scene.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newW = currentMount.clientWidth;
      const newH = currentMount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[450px] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2 text-center pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-slate-900/80 px-3 py-1 rounded-full border border-cyan-500/30 backdrop-blur-md">
          3D Interactive Rural Health Node Network
        </span>
      </div>
    </div>
  );
}
