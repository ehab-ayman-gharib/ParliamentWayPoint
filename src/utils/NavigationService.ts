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
        walkableRadius: 2.5, // 0.5m radius -> Prunes narrow walls
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

            const result = threeToSoloNavMesh(meshes, this.config);
            if (!result || !result.navMesh) {
                console.error('❌ Baking failed: No NavMesh generated');
                return false;
            }

            this.navMesh = result.navMesh;
            this.navMeshQuery = new NavMeshQuery(this.navMesh);

            this.isReady = true;
            console.log('✅ Recast NavMesh Baked Successfully!');
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
            console.log('✅ Path found with', points.length, 'waypoints');
            return points;
        }

        return [];
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
