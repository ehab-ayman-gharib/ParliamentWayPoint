'use client';

import { useGLTF, Environment, ContactShadows, CameraControls, Center } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import PathLine from './PathLine';
import { navService } from '@/utils/NavigationService';

// Global flag to prevent re-initialization on remounts
let hasSceneInitialized = false;

export default function Scene() {
    const { scene, nodes } = useGLTF('./SM_Parliament.glb');
    const controlsRef = useRef<CameraControls>(null);
    const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Track last calculation to prevent double execution
    const lastCalculatedRef = useRef<string | null>(null);

    const { viewMode, isNavigating, destination, startPoint, setPath, path, setIsNavigating, reset, setIsLoading, setArrivedAt } = useStore();

    const [currentPathIndex, setCurrentPathIndex] = useState(0);
    const [agentPos] = useState(() => new THREE.Vector3(...startPoint));
    const [isNavMeshReady, setIsNavMeshReady] = useState(false);
    const [hasArrived, setHasArrived] = useState(false);

    // Clear timer on manual reset/start
    useEffect(() => {
        if (isNavigating && resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
    }, [isNavigating]);

    // Initialize NavMesh and Log Size
    useEffect(() => {
        if (scene && !hasSceneInitialized) {
            hasSceneInitialized = true;
            setIsLoading(true, 'Loading 3D Model...');

            const box = new THREE.Box3().setFromObject(scene as THREE.Group);
            const size = box.getSize(new THREE.Vector3());
            console.log('Model Bounding Box Size:', size);

            setIsLoading(true, 'Building Navigation Mesh...');

            // Delay baking slightly to let UI update
            setTimeout(() => {
                navService.init(scene as THREE.Group).then(ready => {
                    setIsNavMeshReady(ready);

                    // Artificial delay to prevent "flicker" finish
                    setTimeout(() => {
                        setIsLoading(false);
                    }, 500); // Reduced from 2000ms for snappier feel

                    console.log('NavMesh Ready:', ready);
                });
            }, 100);
        } else if (hasSceneInitialized && !isNavMeshReady) {
            // If we re-mounted but already initialized globally, just ensure local state matches
            setIsNavMeshReady(true);
            setIsLoading(false);
        }
    }, [scene]);

    // reset hasSceneInitialized on unmount if needed? No, we want it persistent for the session.

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
            // Prevent double calculation if destination hasn't changed
            const destKey = `${destination.name}-${startPoint.join(',')}`;
            if (lastCalculatedRef.current === destKey) return;

            lastCalculatedRef.current = destKey;

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

    // Handle Camera - Overview Mode
    useEffect(() => {
        if (!controlsRef.current || !scene) return;

        if (viewMode === 'overview' && !isNavigating) {
            const box = new THREE.Box3().setFromObject(scene as THREE.Group);
            const center = box.getCenter(new THREE.Vector3());

            // Isometric top-down view - user defined position
            controlsRef.current.setLookAt(
                505.9, 946.9, 727.7,        // Camera position (captured from manual adjustment)
                center.x, 0, center.z,      // Look at center of building
                false
            );
        }
    }, [viewMode, scene, isNavigating]);

    // Smooth camera transition when starting navigation
    useEffect(() => {
        if (isNavigating && path.length > 0 && controlsRef.current) {
            // Reset agent position to start point
            agentPos.set(...startPoint);
            setCurrentPathIndex(0);
            setHasArrived(false); // Reset arrived state

            // Get first path point and calculate initial camera position
            const firstPoint = path[0];
            const secondPoint = path[Math.min(1, path.length - 1)];

            // Calculate initial look direction
            const direction = new THREE.Vector3()
                .subVectors(secondPoint, firstPoint)
                .normalize();

            // Camera behind and above the start point
            const camOffset = direction.clone().multiplyScalar(-25).add(new THREE.Vector3(0, 20, 0));
            const camPos = new THREE.Vector3(...startPoint).add(camOffset);

            // Smooth transition from overview to navigation view
            controlsRef.current.setLookAt(
                camPos.x, camPos.y, camPos.z,
                firstPoint.x, firstPoint.y + 5, firstPoint.z,
                true // smooth transition
            );
        }
    }, [isNavigating]);

    // Store last valid direction for camera on arrival
    const lastDirection = useRef(new THREE.Vector3(0, 0, 1));

    // Navigation Logic Loop - Camera follows path
    useFrame((state, delta) => {
        // Stop updating if arrived or not navigating
        if (!isNavigating || hasArrived || path.length === 0 || !controlsRef.current) return;

        const targetPoint = path[currentPathIndex];

        // Constant speed movement (not lerp which slows at corners)
        const speed = 50; // units per second
        const direction = new THREE.Vector3()
            .subVectors(targetPoint, agentPos);

        const distanceToTarget = direction.length();
        direction.normalize();

        // Store last valid direction
        if (direction.length() > 0.1) {
            lastDirection.current.copy(direction);
        }

        const moveDistance = speed * delta;

        if (distanceToTarget > moveDistance) {
            // Move toward target at constant speed
            agentPos.add(direction.clone().multiplyScalar(moveDistance));
        } else {
            // Snap to target if very close
            agentPos.copy(targetPoint);
        }

        // Calculate direction for camera (look ahead 2 waypoints)
        const lookAheadIndex = Math.min(currentPathIndex + 2, path.length - 1);
        const lookAheadPoint = path[lookAheadIndex];
        const camDirection = new THREE.Vector3()
            .subVectors(lookAheadPoint, agentPos);

        // Use last good direction if current is too small
        if (camDirection.length() > 1) {
            camDirection.normalize();
            lastDirection.current.copy(camDirection);
        } else {
            camDirection.copy(lastDirection.current);
        }

        // Camera position: behind and above the agent
        const cameraHeight = 20;
        const cameraDistance = 25;
        const camOffset = camDirection.clone().multiplyScalar(-cameraDistance).add(new THREE.Vector3(0, cameraHeight, 0));
        const camPos = agentPos.clone().add(camOffset);

        // Look ahead of the agent (not at it) - raised to look at horizon
        const lookTarget = agentPos.clone().add(camDirection.clone().multiplyScalar(20));
        lookTarget.y = agentPos.y + 8; // Higher look target for better forward view

        // Smooth camera follow
        controlsRef.current.setLookAt(
            camPos.x, camPos.y, camPos.z,
            lookTarget.x, lookTarget.y, lookTarget.z,
            true // smooth interpolation
        );

        // Check if reached current waypoint
        if (distanceToTarget < 1.0) {
            if (currentPathIndex < path.length - 1) {
                setCurrentPathIndex(prev => prev + 1);
            } else {
                // Reached destination - freeze camera and schedule reset
                setHasArrived(true);
                setArrivedAt(destination?.name || 'Destination');
                console.log('🎯 Arrived at destination!');

                // Store timer in ref so it can be cleared
                resetTimerRef.current = setTimeout(() => {
                    reset(); // Clear path, destination, return to overview
                    setHasArrived(false);
                    resetTimerRef.current = null;
                }, 10000); // 10 second delay to let user see arrival
            }
        }
    });

    return (
        <>
            {/* Removed Center to ensure Unity coordinates match Navigation Space */}
            <primitive
                object={scene}
                onClick={(e: any) => {
                    e.stopPropagation();
                    const point = e.point;
                    const x = parseFloat(point.x.toFixed(2));
                    const y = parseFloat(point.y.toFixed(2));
                    const z = parseFloat(point.z.toFixed(2));
                    console.log(`📍 Clicked Coordinate: [${x}, ${y}, ${z}]`);
                    console.log(`📋 JSON format: { name: "New Point", position: [${x}, ${y}, ${z}] }`);
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
