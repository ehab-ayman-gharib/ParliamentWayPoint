import { useStore } from '@/store/useStore';
import { useMemo, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';

const TextLabel = ({ position }: { position: THREE.Vector3 }) => {
    // ⚙️ MANUAL ADJUSTMENT: Change rotation values here [x, y, z] in radians
    // -Math.PI / 2 on X axis makes it lie flat on the ground (like the path dots)
    // Y axis rotation aligns it with the map grid
    const textRotation: [number, number, number] = [-Math.PI / 2, 0, Math.PI / 7];

    // ⚙️ MANUAL ADJUSTMENT: Change position offset here [x, y, z]
    const positionOffset: [number, number, number] = [-10, 0, -10];

    const finalPosition = new THREE.Vector3(
        position.x + positionOffset[0],
        position.y + positionOffset[1],
        position.z + positionOffset[2]
    );

    return (
        <group position={finalPosition} rotation={textRotation}>
            <Center>
                <Text3D
                    font="./Roboto Medium_Regular.json"
                    size={10}
                    height={2}
                    curveSegments={12}
                    bevelEnabled
                    bevelThickness={0.5}
                    bevelSize={0.1}
                    bevelOffset={0}
                    bevelSegments={5}
                >
                    You are Here!
                    <meshStandardMaterial
                        color="#000000"
                        roughness={0.8}
                        metalness={0.1}
                        envMapIntensity={0.3}
                    />
                </Text3D>
            </Center>
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

    if (isNavigating || !path || path.length < 2) return null;

    return (
        <group>
            <Suspense fallback={null}>
                {startPos && <TextLabel position={startPos} />}
            </Suspense>

            {spacedPoints.map((pos, i) => (
                <Dot key={`${i}-${pathId}`} position={pos} index={i} total={spacedPoints.length} />
            ))}
        </group>
    );
}
