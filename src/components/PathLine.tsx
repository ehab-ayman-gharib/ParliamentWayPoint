import { useStore } from '@/store/useStore';
import { useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

const MapPin = ({ position, color = '#0088ff' }: { position: THREE.Vector3, color?: string }) => {
    const { scene } = useGLTF('./map_pin.glb');
    const groupRef = useRef<THREE.Group>(null);

    // Clone and color the scene
    const clonedScene = useMemo(() => {
        const clone = scene.clone();
        clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.5,
                    metalness: 0.5
                });
            }
        });
        return clone;
    }, [scene, color]);

    // ⚙️ MANUAL ADJUSTMENT: Change rotation values here [x, y, z] in radians
    const pinRotation: [number, number, number] = [0, Math.PI / 7, 0];

    // ⚙️ MANUAL ADJUSTMENT: Change position offset here [x, y, z]
    const positionOffset: [number, number, number] = [0, 7, 0];

    // ⚙️ MANUAL ADJUSTMENT: Change scale (uniform scaling)
    const pinScale = 35;

    // ⚙️ MANUAL ADJUSTMENT: Pulsing animation settings
    const pulseSpeed = 4; // Speed of the pulse (higher = faster)
    const pulseAmount = 1; // How much to move up/down

    const finalPosition = new THREE.Vector3(
        position.x + positionOffset[0],
        position.y + positionOffset[1],
        position.z + positionOffset[2]
    );

    // Animate the pin with a smooth up/down pulse
    useFrame((state) => {
        if (groupRef.current) {
            const time = state.clock.getElapsedTime();
            groupRef.current.position.y = finalPosition.y + Math.sin(time * pulseSpeed) * pulseAmount;
        }
    });

    return (
        <group ref={groupRef} position={finalPosition} rotation={pinRotation} scale={pinScale}>
            <primitive object={clonedScene} />
        </group>
    );
};

const Dot = ({ position, index, total }: { position: THREE.Vector3, index: number, total: number }) => {
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const birthTime = useRef<number>(-1);

    useFrame((state) => {
        if (!matRef.current) return;

        const time = state.clock.getElapsedTime();
        if (birthTime.current === -1) birthTime.current = time;

        const age = time - birthTime.current;
        const indexDelay = index * 0.05; // 0.05s per dot reveal

        // 1. Entrance Phase: Invisible before its turn
        if (age < indexDelay) {
            matRef.current.opacity = 0;
            return;
        }

        // 2. Transition Phase: Fade in to base opacity
        const fadeInDuration = 0.5;
        const timeSinceReveal = age - indexDelay;

        let baseOpacity = 0.3;
        if (timeSinceReveal < fadeInDuration) {
            baseOpacity = THREE.MathUtils.lerp(0, 0.3, timeSinceReveal / fadeInDuration);
        }

        // 3. Wave Phase: Start only after entire path is potentially revealed
        const totalRevealTime = total * 0.05;
        const waveStartTime = totalRevealTime + 0.5; // Wait a bit after last dot

        let finalOpacity = baseOpacity;

        if (age > waveStartTime) {
            const waveAge = age - waveStartTime;
            const speed = 5.0;
            const cycle = (waveAge * speed) % (total + 8);
            const dist = Math.abs(cycle - index);

            if (dist < 4) {
                // Add wave intensity to base opacity
                const waveIntensity = 0.7 * (1 - (dist / 4));
                finalOpacity = baseOpacity + waveIntensity;
            }
        }

        matRef.current.opacity = Math.min(finalOpacity, 1.0);
    });

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[3, 32]} />
            <meshBasicMaterial
                ref={matRef}
                color="#0088ff"
                transparent
                opacity={0}
                depthTest={false}
            />
        </mesh>
    );
};

export default function PathLine() {
    const { path, isNavigating } = useStore();

    // Generate a unique ID when path changes to force reset of Dot animations
    const pathId = useMemo(() => Math.random().toString(36).substr(2, 9), [path]);

    const spacedPoints = useMemo(() => {
        if (!path || path.length < 2) return [];

        const points: THREE.Vector3[] = [];
        const spacing = 12.0; // Distance between dots
        let currentDist = 0; // Total distance traversed

        let nextPointDist = spacing; // First dot appears after 'spacing' distance

        for (let i = 0; i < path.length - 1; i++) {
            const start = path[i];
            const end = path[i + 1];

            // Ensure we are working with Vector3
            const p1 = start instanceof THREE.Vector3 ? start : new THREE.Vector3(start.x, start.y, start.z);
            const p2 = end instanceof THREE.Vector3 ? end : new THREE.Vector3(end.x, end.y, end.z);

            const segmentLength = p1.distanceTo(p2);

            // While the next point falls within this segment
            while (nextPointDist <= currentDist + segmentLength) {
                const distanceInSegment = nextPointDist - currentDist;
                const alpha = distanceInSegment / segmentLength;

                // Interpolate position
                const point = new THREE.Vector3().lerpVectors(p1, p2, alpha);
                // Lift slightly above floor (approx 0.3 units) to avoid z-fighting but look "2D" on ground
                point.y += 0.3;

                points.push(point);
                nextPointDist += spacing;
            }

            currentDist += segmentLength;
        }

        return points;
    }, [path]);

    const startPos = useMemo(() => {
        if (!path || path.length < 1) return null;
        const p = path[0];
        return p instanceof THREE.Vector3
            ? new THREE.Vector3(p.x, p.y + 6.0, p.z) // Lifted significantly for visibility over walls
            : new THREE.Vector3(p.x, p.y + 6.0, p.z);
    }, [path]);

    const endPos = useMemo(() => {
        if (!path || path.length < 1) return null;
        const p = path[path.length - 1];
        return p instanceof THREE.Vector3
            ? new THREE.Vector3(p.x, p.y + 6.0, p.z)
            : new THREE.Vector3(p.x, p.y + 6.0, p.z);
    }, [path]);

    if (isNavigating || !path || path.length < 2) return null;

    return (
        <group>
            <Suspense fallback={null}>
                {startPos && <MapPin position={startPos} color="#0088ff" />}
                {endPos && <MapPin position={endPos} color="#ff0000" />}
            </Suspense>

            {spacedPoints.map((pos, i) => (
                <Dot key={`${i}-${pathId}`} position={pos} index={i} total={spacedPoints.length} />
            ))}
        </group>
    );
}
