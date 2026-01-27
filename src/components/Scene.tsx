'use client';

import { useGLTF, Environment, ContactShadows, CameraControls, Center } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import PathLine from './PathLine';
import { navService } from '@/utils/NavigationService';

export default function Scene() {
    const { scene, nodes } = useGLTF('/SM_Parliament.glb');
    const controlsRef = useRef<CameraControls>(null);
    const { viewMode, isNavigating, destination, startPoint, setPath, path, setIsNavigating } = useStore();

    const [currentPathIndex, setCurrentPathIndex] = useState(0);
    const [agentPos] = useState(() => new THREE.Vector3(...startPoint));
    const [isNavMeshReady, setIsNavMeshReady] = useState(false);

    // Initialize NavMesh and Log Size
    useEffect(() => {
        if (scene) {
            const box = new THREE.Box3().setFromObject(scene as THREE.Group);
            const size = box.getSize(new THREE.Vector3());
            console.log('Model Bounding Box Size:', size);

            navService.init(scene as THREE.Group).then(ready => {
                setIsNavMeshReady(ready);
                console.log('NavMesh Ready:', ready);

                if (ready) {
                    // VISUAL DEBUG: Show the NavMesh
                    const debugMesh = navService.createDebugNavMesh(scene as THREE.Group);
                    if (debugMesh) {
                        (scene as THREE.Group).add(debugMesh);
                        console.log('✅ Added Debug NavMesh to scene');
                    }
                }
            });
        }
    }, [scene]);

    // Handle Roof Visibility based on viewMode
    useEffect(() => {
        if (!scene) return;

        scene.traverse((node: THREE.Object3D) => {
            if (node instanceof THREE.Mesh) {
                const name = node.name.toLowerCase();
                // Hide roof/ceiling in overview mode to see inside
                if (name.includes('roof') || name.includes('ceiling') || name.includes('top')) {
                    node.visible = viewMode === 'navigation';
                }
            }
        });
    }, [viewMode, scene]);

    // Handle Destination Select & Pathfinding
    useEffect(() => {
        if (destination && isNavMeshReady) {
            const endPos = new THREE.Vector3(...destination.position);
            const startPos = new THREE.Vector3(...startPoint); // Use actual start point from store

            console.log('Calculating path from:', startPos, 'to:', endPos);
            const calculatedPath = navService.findPath(startPos, endPos);

            if (calculatedPath.length > 1) {
                console.log('Path found with', calculatedPath.length, 'waypoints');
                setPath(calculatedPath);
                setCurrentPathIndex(0);
            } else {
                console.warn('Pathfinding failed, using direct line');
                // Fallback: direct line if pathfinding fails or mesh is sparse
                setPath([startPos, endPos]);
            }
        }
    }, [destination, isNavMeshReady, startPoint, setPath]);

    // Handle Camera Transitions
    useEffect(() => {
        if (!controlsRef.current || !scene) return;

        if (viewMode === 'overview') {
            const box = new THREE.Box3().setFromObject(scene as THREE.Group);
            // Top-down view: Camera high above (Y), looking straight down
            // Small Z offset to match reference angle (not perfectly orthographic)
            controlsRef.current.setLookAt(0, 400, 150, 0, 0, 0, false);
            // Then fit to the box for perfect framing
            controlsRef.current.fitToBox(box, true, {
                paddingLeft: 2,
                paddingRight: 2,
                paddingTop: 2,
                paddingBottom: 2
            });
        }
    }, [viewMode, scene]); // Also trigger when scene is loaded

    // Navigation Logic Loop
    useFrame((state, delta) => {
        if (isNavigating && path.length > 0 && controlsRef.current) {
            const targetPoint = path[currentPathIndex];

            // Move agent position
            agentPos.lerp(targetPoint, 0.1);

            // Camera Director logic
            const nextPoint = path[Math.min(currentPathIndex + 1, path.length - 1)];
            const direction = new THREE.Vector3().subVectors(nextPoint, agentPos).normalize();

            const camOffset = direction.clone().multiplyScalar(-10).add(new THREE.Vector3(0, 6, 0));
            const camPos = agentPos.clone().add(camOffset);

            controlsRef.current.setLookAt(
                camPos.x, camPos.y, camPos.z,
                agentPos.x, agentPos.y + 1, agentPos.z,
                true
            );

            if (agentPos.distanceTo(targetPoint) < 1.0) {
                if (currentPathIndex < path.length - 1) {
                    setCurrentPathIndex(prev => prev + 1);
                } else {
                    setIsNavigating(false);
                }
            }
        }
    });

    return (
        <>
            {/* Removed Center to ensure Unity coordinates match Navigation Space */}
            <primitive
                object={scene}
                onClick={(e: any) => {
                    // Stop propagation to prevent multiple clicks
                    e.stopPropagation();

                    // Get the clicked point in 3D space
                    const point = e.point;

                    // Round to 2 decimal places for cleaner coordinates
                    const x = Math.round(point.x * 100) / 100;
                    const y = 0; // Keep Y at 0 for floor level
                    const z = Math.round(point.z * 100) / 100;

                    console.log('🎯 Clicked position:', { x, y, z });
                    console.log('📋 Copy this to useStore.ts:');
                    console.log(`   startPoint: [${x}, ${y}, ${z}],`);

                    // Update the start point in the store
                    const { setStartPoint } = useStore.getState();
                    setStartPoint([x, y, z]);
                }}
            />

            <Environment preset="city" />
            <ContactShadows opacity={0.3} scale={150} blur={2.5} far={10} color="#000000" />

            <CameraControls
                ref={controlsRef}
                makeDefault
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 1.6}
            />

            <PathLine />

            {/* Starting Point Marker (Red Dot) */}
            <mesh position={[startPoint[0], 0.1, startPoint[2]]}>
                <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
                <pointLight intensity={2} distance={8} color="#ff0000" />
            </mesh>

            {/* Destination Marker (Blue Dot) */}
            {destination && (
                <mesh position={[destination.position[0], 0.1, destination.position[2]]}>
                    <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
                    <meshStandardMaterial color="#00f2ff" emissive="#00f2ff" emissiveIntensity={3} />
                    <pointLight intensity={2} distance={8} color="#00f2ff" />
                </mesh>
            )}

            <ambientLight intensity={0.6} />
            <directionalLight position={[50, 80, 50]} intensity={0.8} castShadow />
            <directionalLight position={[-50, 80, -50]} intensity={0.4} />
            <directionalLight position={[0, 100, 0]} intensity={0.5} />
            <directionalLight position={[0, 50, -100]} intensity={0.3} />
        </>
    );
}
