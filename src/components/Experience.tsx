'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import Scene from './Scene';
import UI from './UI';
import { useStore } from '@/store/useStore';

function LoadingOverlay() {
    const { isLoading } = useStore();

    // Only hide when our NavMesh loading is complete
    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <div className="loading-spinner"></div>
                <h1 className="welcome-text">Welcome to the Egyptian Parliament WayFinder</h1>
                <p className="loading-status">Loading Experience...</p>
            </div>

            <style jsx>{`
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                
                .loading-content {
                    text-align: center;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .loading-spinner {
                    width: 60px;
                    height: 60px;
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    border-top-color: #00f2ff;
                    border-radius: 50%;
                    margin-bottom: 30px;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .welcome-text {
                    font-size: 1.8rem;
                    font-weight: 300;
                    letter-spacing: 1px;
                    color: white;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                }
                
                .loading-status {
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
            `}</style>
        </div>
    );
}

function ArrivalOverlay() {
    const { arrivedAt } = useStore();

    if (!arrivedAt) return null;

    return (
        <div className="arrival-overlay">
            <div className="arrival-card">
                <div className="arrival-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className="arrival-text">
                    <p className="arrival-label">You have arrived at</p>
                    <h2 className="arrival-destination">{arrivedAt}</h2>
                </div>
                <div className="arrival-footer">
                    <p>Thank you for using the Parliament Navigator</p>
                </div>
            </div>

            <style jsx>{`
                .arrival-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    pointer-events: none;
                }
                
                .arrival-card {
                    background: linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(10, 20, 40, 0.98) 100%);
                    border: 1px solid rgba(0, 242, 255, 0.3);
                    border-radius: 20px;
                    padding: 40px 60px;
                    text-align: center;
                    box-shadow: 
                        0 25px 50px rgba(0, 0, 0, 0.5),
                        0 0 100px rgba(0, 242, 255, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                }
                
                .arrival-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 24px;
                    background: linear-gradient(135deg, #00f2ff 0%, #00d4aa 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .arrival-icon svg {
                    width: 40px;
                    height: 40px;
                    color: white;
                }
                
                .arrival-text {
                    margin-bottom: 24px;
                }
                
                .arrival-label {
                    font-size: 0.9rem;
                    color: rgba(255, 255, 255, 0.6);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .arrival-destination {
                    font-size: 2rem;
                    font-weight: 600;
                    color: white;
                    margin: 0;
                    background: linear-gradient(90deg, #00f2ff, #00d4aa);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .arrival-footer {
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .arrival-footer p {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.4);
                    margin: 0;
                }
            `}</style>
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
            <LoadingOverlay />
            <ArrivalOverlay />
        </>
    );
}
