import { create } from 'zustand';

interface Waypoint {
    name: string;
    position: [number, number, number];
}

interface AppState {
    viewMode: 'overview' | 'navigation';
    destination: Waypoint | null;
    startPoint: [number, number, number];
    isNavigating: boolean;
    isLoading: boolean;
    loadingMessage: string;
    arrivedAt: string | null; // Name of destination when arrived
    path: any[]; // Using any for now, will be Vector3[]

    setViewMode: (mode: 'overview' | 'navigation') => void;
    setDestination: (destination: Waypoint | null) => void;
    setStartPoint: (point: [number, number, number]) => void;
    setIsNavigating: (isNavigating: boolean) => void;
    setIsLoading: (isLoading: boolean, message?: string) => void;
    setArrivedAt: (name: string | null) => void;
    setPath: (path: any[]) => void;
    reset: () => void;
}

export const useStore = create<AppState>((set) => ({
    viewMode: 'overview',
    destination: null,
    startPoint: [57, 0.7, 78], // Main entrance/lobby start point
    isNavigating: false,
    isLoading: true,
    loadingMessage: 'Initializing...',
    arrivedAt: null,
    path: [],

    setViewMode: (mode) => set({ viewMode: mode }),
    setDestination: (destination) => {
        console.log('🗺️ setDestination called with:', destination?.name || 'null');
        console.trace('Call stack:');
        set({ destination });
    },
    setStartPoint: (point) => set({ startPoint: point }),
    setIsNavigating: (isNavigating) => set({ isNavigating }),
    setIsLoading: (isLoading, message) => {
        console.log('📝 setIsLoading called:', isLoading, message);
        set({ isLoading, loadingMessage: message || '' });
    },
    setArrivedAt: (arrivedAt) => set({ arrivedAt }),
    setPath: (path) => set({ path }),
    reset: () => set({ viewMode: 'overview', destination: null, isNavigating: false, path: [], arrivedAt: null }),
}));
