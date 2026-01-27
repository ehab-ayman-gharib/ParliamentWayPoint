import * as THREE from 'three';

/**
 * Debug utility to analyze the 3D model structure
 * This helps identify floor meshes and understand the model hierarchy
 */
export function analyzeModel(scene: THREE.Group) {
    console.log('=== MODEL ANALYSIS ===');

    const meshes: { name: string; vertices: number; position: THREE.Vector3; boundingBox: THREE.Box3 }[] = [];

    scene.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
            const geometry = node.geometry;
            const vertexCount = geometry.attributes.position?.count || 0;

            // Get world position and bounding box
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);

            const bbox = new THREE.Box3().setFromObject(node);

            meshes.push({
                name: node.name,
                vertices: vertexCount,
                position: worldPos,
                boundingBox: bbox
            });
        }
    });

    console.log(`Total meshes found: ${meshes.length}`);
    console.log('\nMesh Details:');

    meshes.forEach((mesh, index) => {
        const size = mesh.boundingBox.getSize(new THREE.Vector3());
        const center = mesh.boundingBox.getCenter(new THREE.Vector3());

        console.log(`\n[${index}] ${mesh.name || 'Unnamed'}`);
        console.log(`  - Vertices: ${mesh.vertices}`);
        console.log(`  - Position: (${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
        console.log(`  - Size: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`);
        console.log(`  - Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);

        // Identify potential floor meshes (large horizontal surfaces)
        if (size.x > 10 && size.z > 10 && size.y < 5) {
            console.log(`  ⭐ POTENTIAL FLOOR MESH (large horizontal surface)`);
        }
    });

    console.log('\n=== END ANALYSIS ===');

    return meshes;
}

/**
 * Find the best candidate for a navigation mesh
 * Looks for large, flat, horizontal surfaces
 */
export function findFloorMesh(scene: THREE.Group): THREE.Mesh | null {
    let bestCandidate: THREE.Mesh | null = null;
    let largestArea = 0;
    let foundByName: THREE.Mesh | null = null;

    const allMeshes: { mesh: THREE.Mesh; name: string; area: number }[] = [];

    scene.traverse((node: THREE.Object3D) => {
        if (node instanceof THREE.Mesh) {
            const name = node.name.toLowerCase();

            console.log(`🔍 Checking mesh: "${node.name}"`);

            // Skip walls explicitly
            if (name.includes('wall')) {
                console.log(`⚠️ Skipping wall mesh: "${node.name}"`);
                return;
            }

            // First priority: meshes with floor-related names
            // Check for various common naming patterns
            const floorKeywords = ['floor', 'ground', 'nav', 'walkable', 'plane', 'base'];
            const hasFloorKeyword = floorKeywords.some(keyword => name.includes(keyword));

            if (!foundByName && hasFloorKeyword) {
                console.log(`✓ Found floor mesh by name: ${node.name}`);
                foundByName = node;
            }

            // Second priority: large horizontal surfaces
            const bbox = new THREE.Box3().setFromObject(node);
            const size = bbox.getSize(new THREE.Vector3());

            // Check if it's a large horizontal surface (wide and deep, but not tall)
            // Adjusted thresholds to be more lenient
            if (size.x > 5 && size.z > 5 && size.y < 10) {
                const area = size.x * size.z;
                allMeshes.push({ mesh: node, name: node.name, area });

                if (area > largestArea) {
                    largestArea = area;
                    bestCandidate = node;
                }
            }
        }
    });

    // Log all potential floor candidates
    if (allMeshes.length > 0) {
        console.log('\n📊 Potential floor meshes by area:');
        allMeshes
            .sort((a, b) => b.area - a.area)
            .slice(0, 5)
            .forEach((item, index) => {
                console.log(`  ${index + 1}. "${item.name}" - Area: ${item.area.toFixed(2)}`);
            });
    }

    // Prefer name-based match, fall back to geometry-based
    if (foundByName) {
        console.log(`\n✅ Using floor mesh (by name): "${(foundByName as THREE.Mesh).name}"`);
        return foundByName;
    }

    if (bestCandidate) {
        console.log(`\n✅ Using floor mesh (by geometry): "${(bestCandidate as THREE.Mesh).name}" (area: ${largestArea.toFixed(2)})`);
        return bestCandidate;
    }

    console.error('\n❌ No suitable floor mesh found!');
    console.log('💡 Please ensure your model has:');
    console.log('   - A mesh with "Floor", "Ground", or "Nav" in its name, OR');
    console.log('   - A large horizontal surface (width > 5, depth > 5, height < 10)');

    return null;
}
