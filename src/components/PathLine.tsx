'use client';

import { useStore } from '@/store/useStore';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PathLine() {
    const { path, isNavigating } = useStore();
    const lineRef = useRef<any>(null);
    const [animationProgress, setAnimationProgress] = useState(0);

    // Lift path points above floor to prevent z-fighting
    const elevatedPath = useMemo(() => {
        if (!path || path.length < 2) return [];
        return path.map(p => {
            if (p instanceof THREE.Vector3) {
                return new THREE.Vector3(p.x, p.y + 8.0, p.z); // Lift 8.0 units above floor (eye level)
            }
            return p;
        });
    }, [path]);

    // Reset animation when path changes
    useEffect(() => {
        setAnimationProgress(0);
    }, [path]);

    // Animate dash offset for flowing effect (START -> GOAL direction)
    useFrame((state, delta) => {
        if (lineRef.current?.material) {
            // Positive offset = flows from start to end
            lineRef.current.material.dashOffset += 0.08;
        }

        // Progressive reveal animation
        if (animationProgress < 1) {
            setAnimationProgress(prev => Math.min(prev + delta * 0.8, 1));
        }
    });

    // Calculate partial path for reveal animation
    const animatedPath = useMemo(() => {
        if (elevatedPath.length < 2 || animationProgress >= 1) return elevatedPath;

        // Calculate total path length
        let totalLength = 0;
        const segments: number[] = [0];

        for (let i = 1; i < elevatedPath.length; i++) {
            const p1 = elevatedPath[i - 1] as THREE.Vector3;
            const p2 = elevatedPath[i] as THREE.Vector3;
            totalLength += p1.distanceTo(p2);
            segments.push(totalLength);
        }

        const targetLength = totalLength * animationProgress;
        const result: THREE.Vector3[] = [elevatedPath[0] as THREE.Vector3];

        for (let i = 1; i < elevatedPath.length; i++) {
            if (segments[i] <= targetLength) {
                result.push(elevatedPath[i] as THREE.Vector3);
            } else {
                // Interpolate final point
                const p1 = elevatedPath[i - 1] as THREE.Vector3;
                const p2 = elevatedPath[i] as THREE.Vector3;
                const segmentLength = segments[i] - segments[i - 1];
                const remainingLength = targetLength - segments[i - 1];
                const t = remainingLength / segmentLength;

                result.push(new THREE.Vector3().lerpVectors(p1, p2, t));
                break;
            }
        }

        return result.length >= 2 ? result : elevatedPath.slice(0, 2);
    }, [elevatedPath, animationProgress]);

    // Hide path line when actively navigating OR no valid path
    // (This check must come AFTER all hooks to avoid React hooks order error)
    if (isNavigating || elevatedPath.length < 2) return null;

    return (
        <group>
            {/* Base shadow/ambient layer */}
            <Line
                points={animatedPath}
                color="#004466"
                lineWidth={25}
                transparent
                opacity={0.2}
                depthTest={false}
            />

            {/* Outer glow - wide and soft */}
            <Line
                points={animatedPath}
                color="#00d4ff"
                lineWidth={20}
                transparent
                opacity={0.25}
                depthTest={false}
            />

            {/* Middle glow layer */}
            <Line
                points={animatedPath}
                color="#00e5ff"
                lineWidth={14}
                transparent
                opacity={0.4}
                depthTest={false}
            />

            {/* Main solid path */}
            <Line
                points={animatedPath}
                color="#00ffff"
                lineWidth={8}
                transparent
                opacity={0.9}
                depthTest={false}
            />

            {/* Animated flowing arrows/dashes - moves toward goal */}
            <Line
                ref={lineRef}
                points={animatedPath}
                color="#ffffff"
                lineWidth={5}
                transparent
                opacity={1}
                dashed
                dashSize={2}
                dashOffset={0}
                gapSize={3}
                depthTest={false}
            />

            {/* Bright center core */}
            <Line
                points={animatedPath}
                color="#ffffff"
                lineWidth={2}
                transparent
                opacity={0.95}
                depthTest={false}
            />
        </group>
    );
}
