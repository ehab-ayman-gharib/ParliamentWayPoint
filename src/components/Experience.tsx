'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useEffect } from 'react';
import { useProgress, Html } from '@react-three/drei';
import Scene from './Scene';
import UI from './UI';

function Loader() {
    const { progress, active } = useProgress();
    if (!active && progress === 100) return null;

    return (
        <div className="loading-screen">
            <div style={{ textAlign: 'center' }}>
                <p>LOADING SYSTEM</p>
                <div style={{
                    width: '200px',
                    height: '2px',
                    background: '#333',
                    marginTop: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: '#00f2ff',
                        transition: 'width 0.3s'
                    }} />
                </div>
                <p style={{ fontSize: '0.8rem', marginTop: '5px', opacity: 0.5 }}>{Math.round(progress)}%</p>
            </div>
        </div>
    );
}

export default function Experience() {
    return (
        <>
            <div className="canvas-container">
                <Canvas
                    shadows
                    camera={{ position: [300, 300, 300], fov: 40, near: 1, far: 10000 }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={['#ececec']} />
                    <Suspense fallback={null}>
                        <Scene />
                    </Suspense>
                </Canvas>
            </div>
            <UI />
            <Loader />
        </>
    );
}
