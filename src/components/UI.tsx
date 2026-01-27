'use client';

import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';

const destinations = [
    { name: 'Conference Room A', position: [-109.61, 0.7, 51.2] },
    { name: 'Conference Room B', position: [-15, 0, -10] },
    { name: 'Grand Hall', position: [5, 0, -15] },
    { name: 'Office Suite 101', position: [-20, 0, 10] },
];

export default function UI() {
    const { viewMode, setDestination, destination, setViewMode, setIsNavigating, isNavigating, reset } = useStore();
    const [arrived, setArrived] = useState(false);

    useEffect(() => {
        if (!isNavigating && destination && viewMode === 'navigation') {
            setArrived(true);
            const timer = setTimeout(() => {
                setArrived(false);
                setViewMode('overview');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isNavigating, destination, viewMode, setViewMode]);

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = destinations.find(d => d.name === e.target.value);
        if (selected) {
            setArrived(false);
            setDestination({
                name: selected.name,
                position: selected.position as [number, number, number]
            });
        } else {
            setDestination(null);
        }
    };

    const startNavigation = () => {
        setViewMode('navigation');
        setIsNavigating(true);
        setArrived(false);
    };

    return (
        <div className="ui-overlay">
            <header className="header">
                <h1 className="title">PARLIAMENT WAYFINDER</h1>
                <div className="controls">
                    <select onChange={handleSelect} value={destination?.name || ''}>
                        <option value="">Select Destination</option>
                        {destinations.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                    <button
                        disabled={!destination || isNavigating}
                        onClick={startNavigation}
                    >
                        {isNavigating ? 'NAVIGATING...' : 'START NAVIGATION'}
                    </button>
                    <button onClick={reset} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.6rem' }}>
                        RESET
                    </button>
                </div>
            </header>

            {arrived && (
                <div className="arrival-card">
                    <h2 style={{ color: '#00f2ff' }}>ARRIVED</h2>
                    <p>You have reached {destination?.name}</p>
                </div>
            )}
        </div>
    );
}
