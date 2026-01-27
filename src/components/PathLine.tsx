'use client';

import { useStore } from '@/store/useStore';
import { useRef } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function PathLine() {
    const { path } = useStore();

    if (!path || path.length < 2) return null;

    return (
        <Line
            points={path}
            color="#00f2ff"
            lineWidth={5}
            transparent
            opacity={0.8}
            dashed={false}
        />
    );
}
