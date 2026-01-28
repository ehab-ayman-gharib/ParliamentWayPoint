import * as THREE from 'three';
import { init, NavMeshQuery, NavMesh } from '@recast-navigation/core';
import { threeToSoloNavMesh, NavMeshHelper } from '@recast-navigation/three';

export class NavigationService {
    private navMeshQuery: NavMeshQuery | null = null;
    private navMesh: NavMesh | null = null;
    private isReady = false;

    // Config for the "Agent" (Standard Humanoid size)
    private config = {
        cs: 0.2,   // Cell size 
        ch: 0.1,   // Cell height (0.1 for better precision)
        walkableSlopeAngle: 35,
        walkableHeight: 15, // ~1.5m
        walkableClimb: 2,
        walkableRadius: 40.0, // 1.0m radius -> Keeps paths away from walls
        minRegionArea: 100,  // Cull small islands (wall tops). < 4m^2 removed.
        mergeRegionArea: 20,
        maxSimplificationError: 1.3,
        maxEdgeLen: 12,
        maxVertsPerPoly: 6,
        borderSize: 0,
        tileSize: 0
    };

    public async init(scene: THREE.Group): Promise<boolean> {
        console.log('🔄 Initializing Recast Navigation...');

        try {
            await init();

            const meshes: THREE.Mesh[] = [];
            scene.traverse((node) => {
                if (node instanceof THREE.Mesh) {
                    if (node.visible && !node.name.includes('DEBUG') && !node.name.includes('Helper')) {
                        meshes.push(node);
                    }
                }
            });

            if (meshes.length === 0) return false;

            console.log(`🔨 Baking NavMesh with ${meshes.length} meshes...`);

            // Add a small delay to ensure the loading UI is displayed
            // before the synchronous baking operation blocks the main thread
            await new Promise(resolve => setTimeout(resolve, 200));

            const result = threeToSoloNavMesh(meshes, this.config);
            if (!result || !result.navMesh) {
                console.error('❌ Baking failed: No NavMesh generated');
                return false;
            }

            this.navMesh = result.navMesh;
            this.navMeshQuery = new NavMeshQuery(this.navMesh);

            this.isReady = true;
            console.log('✅ Recast NavMesh Baked Successfully!');

            // Add another small delay to ensure the baking is fully complete
            await new Promise(resolve => setTimeout(resolve, 100));

            return true;

        } catch (error) {
            console.error('❌ Failed to verify/bake NavMesh:', error);
            return false;
        }
    }

    public findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
        if (!this.isReady || !this.navMeshQuery) {
            console.warn('⚠️ NavMesh not ready!');
            return [];
        }

        const startPt = { x: start.x, y: start.y, z: start.z };
        const endPt = { x: end.x, y: end.y, z: end.z };

        console.log('🔍 Finding path:', startPt, '→', endPt);

        // Use the simple computePath API - it takes Vector3 positions directly!
        const result = this.navMeshQuery.computePath(startPt, endPt, {
            halfExtents: { x: 10, y: 10, z: 10 }
        });

        console.log('🛤️ Path result:', result.success, '| Points:', result.path?.length);

        if (result.error) {
            console.warn('❌ computePath error:', result.error.name, result.error.status);
        }

        if (result.success && result.path.length > 0) {
            // Convert to THREE.Vector3 array
            const points: THREE.Vector3[] = result.path.map(p =>
                new THREE.Vector3(p.x, p.y, p.z)
            );

            // Post-process: Round corners to create more natural walking path
            const smoothedPath = this.smoothPathCorners(points, 3.0); // 3 meter offset from walls

            console.log('✅ Path found with', smoothedPath.length, 'waypoints (smoothed)');
            return smoothedPath;
        }

        return [];
    }

    /**
     * Smooth path corners by pushing corner points away from walls.
     * This creates a more natural walking path that doesn't hug walls.
     */
    private smoothPathCorners(path: THREE.Vector3[], cornerOffset: number): THREE.Vector3[] {
        if (path.length <= 2) return path;

        const result: THREE.Vector3[] = [path[0]]; // Keep start point

        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const next = path[i + 1];

            // Calculate direction vectors
            const dir1 = new THREE.Vector3().subVectors(curr, prev).normalize();
            const dir2 = new THREE.Vector3().subVectors(next, curr).normalize();

            // Calculate angle between segments
            const dot = dir1.dot(dir2);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

            // If it's a sharp corner (angle > 45 degrees turn)
            if (angle > Math.PI / 4) {
                // Calculate bisector direction (points inward, away from the corner)
                const bisector = new THREE.Vector3()
                    .addVectors(dir1, dir2)
                    .normalize();

                // Push the point inward along the bisector
                // The sharper the corner, the more we push
                const pushAmount = cornerOffset * (1 - dot); // More push for sharper corners

                const smoothedPoint = new THREE.Vector3()
                    .copy(curr)
                    .add(bisector.multiplyScalar(pushAmount));

                // Keep the original Y height
                smoothedPoint.y = curr.y;

                result.push(smoothedPoint);
            } else {
                result.push(curr);
            }
        }

        result.push(path[path.length - 1]); // Keep end point
        return result;
    }

    public createDebugNavMesh(scene: THREE.Group): THREE.Object3D | null {
        if (!this.navMesh) return null;

        try {
            console.log('🎨 Generating Debug NavMesh (SAFE MODE)...');
            // @ts-ignore
            const helper = new NavMeshHelper(this.navMesh);

            if (typeof (helper as any).update === 'function') {
                (helper as any).update();
            }

            helper.position.y += 0.05;
            return helper as unknown as THREE.Object3D;

        } catch (e) {
            console.error('Failed to create debug mesh', e);
            return null;
        }
    }
}

export const navService = new NavigationService();
