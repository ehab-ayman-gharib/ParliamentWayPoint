# Parliament WayPoint Navigation System

## Overview
This is a 3D wayfinding application for navigating through the Parliament building. It uses Three.js, React Three Fiber, and the three-pathfinding library to provide intelligent navigation between different locations.

## Navigation System Architecture

### Key Components

#### 1. **NavigationService** (`src/utils/NavigationService.ts`)
- Manages the pathfinding logic using the `three-pathfinding` library
- Automatically detects floor geometry for navigation
- Calculates optimal paths between start and destination points
- Handles navmesh initialization and path queries

#### 2. **ModelAnalyzer** (`src/utils/ModelAnalyzer.ts`)
- Analyzes the 3D model structure to identify navigable surfaces
- Searches for floor meshes by name (containing "floor", "ground", or "nav")
- Falls back to geometric analysis (large horizontal surfaces)
- Provides detailed console logging for debugging

#### 3. **Scene Component** (`src/components/Scene.tsx`)
- Renders the 3D Parliament model
- Manages camera controls and view modes (overview/navigation)
- Displays visual markers for start point (red) and destination (blue)
- Handles the navigation animation loop

#### 4. **UI Component** (`src/components/UI.tsx`)
- Provides user interface for selecting start points and destinations
- Controls navigation state
- Shows arrival notifications

### How Navigation Works

1. **NavMesh Initialization**
   - When the 3D model loads, the NavigationService analyzes it
   - It searches for a mesh that can serve as the navigation surface
   - The floor geometry is converted into a navigation mesh (navmesh)

2. **Setting Start and Destination**
   - **Red Dot**: Represents the starting point (configurable via UI)
   - **Blue Dot**: Represents the destination (selected from dropdown)

3. **Path Calculation**
   - When you select a destination and click "START NAVIGATION"
   - The system calculates the optimal path from the red dot to the blue dot
   - The path avoids obstacles (walls) and follows the floor geometry

4. **Navigation Animation**
   - The camera smoothly follows the calculated path
   - The view switches to navigation mode
   - When you arrive, you get a notification and return to overview mode

## NavMesh Requirements

For the navigation to work properly, your 3D model needs:

### ❌ Common Issue: "Walking Through Walls"
If your agent walks in a straight line through walls, it means your **Floor Mesh has no holes**.
- **Visual Floor**: Often goes *under* walls (one solid plane). Navigation will ignore walls.
- **Navigation Mesh**: Must have **HOLES** cut out where walls are.

### 🛠️ Unity Workflow (Fix)
If you are coming from Unity, the "Blue Mesh" you see is **BAKED**, it is NOT your floor mesh.
1. Download a script like [NavMeshExport](https://github.com/h8man/NavMeshExport).
2. Bake your NavMesh in Unity.
3. Use the script to **Export NavMesh to OBJ**.
4. Convert that OBJ to GLB (or include it).
5. Name it `NavMesh` and include it in your scene.

### Option 1: Named Floor Mesh (Recommended)
- A mesh in your GLB file with "floor", "ground", or "nav" in its name
- **NEW**: Also supports explicit mesh names like `Mesh.003` (current project default)
- This mesh should represent the walkable surface
- Example: `Parliament_Floor`, `Ground_Level`, `NavMesh`, `Mesh.003`

### Option 2: Geometric Detection (Fallback)
- If no named floor mesh exists, the system looks for:
  - Large horizontal surfaces (width > 10, depth > 10, height < 5)
  - The largest such surface is used as the navigation mesh

### Creating a Proper NavMesh

If navigation isn't working:

1. **In Blender:**
   - Select your floor geometry
   - Rename it to include "floor" (e.g., "Building_Floor")
   - Ensure it's a single, continuous mesh
   - Export as GLB

2. **For Complex Buildings:**
   - Create a simplified floor plane that covers all walkable areas
   - Name it "NavMesh" or "Floor"
   - Place it slightly above the actual floor (y = 0.1)
   - Export separately or include in your main GLB

## Debugging Navigation Issues

### Check the Console
The system provides detailed logging:
- `🔍 Initializing Navigation System...` - Starting initialization
- `✅ Using mesh for navigation: [mesh name]` - Found a floor mesh
- `✅ NavMesh initialized successfully` - Ready to navigate
- `❌ No navigation mesh found` - No suitable floor detected

### Model Analysis
On load, you'll see a complete analysis of all meshes:
```
=== MODEL ANALYSIS ===
Total meshes found: 45

[0] Parliament_Main
  - Vertices: 1234
  - Size: (100.00, 50.00, 80.00)
  ⭐ POTENTIAL FLOOR MESH (large horizontal surface)
```

### Common Issues

1. **"No navigation mesh found"**
   - Your model doesn't have a properly named floor mesh
   - No large horizontal surfaces detected
   - Solution: Add a floor mesh with "floor" in the name

2. **"Pathfinding failed, using direct line"**
   - The navmesh exists but the path calculation failed
   - Start or end point might be outside the navmesh
   - Solution: Adjust start/destination positions or improve navmesh coverage

3. **Path goes through walls**
   - The navmesh includes areas it shouldn't
   - Solution: Create a more accurate floor mesh that excludes wall areas

## Configuration

### Start Points (`src/components/UI.tsx`)
```typescript
const startingPoints = [
    { name: 'Main Entrance', position: [0, 0, 0] },
    { name: 'Lobby Center', position: [0, 0, 15] },
    // Add more start points here
];
```

### Destinations (`src/components/UI.tsx`)
```typescript
const destinations = [
    { name: 'Conference Room A', position: [10, 0, 5] },
    { name: 'Conference Room B', position: [-15, 0, -10] },
    // Add more destinations here
];
```

### Coordinate System
- **X**: Left (-) to Right (+)
- **Y**: Down (-) to Up (+) - Usually 0 for floor level
- **Z**: Back (-) to Front (+)

## View Modes

### Overview Mode
- Top-down view of the entire building
- Camera positioned high above
- Roof/ceiling hidden for interior visibility
- Used for selecting destinations

### Navigation Mode
- First-person perspective following the path
- Camera follows behind the virtual agent
- Smooth transitions between waypoints
- Returns to overview when destination reached

## Future Improvements

- [ ] Click-to-set custom start/destination points
- [ ] Multi-floor navigation support
- [ ] Elevator/staircase handling
- [ ] Real-time obstacle avoidance
- [ ] Voice-guided navigation
- [ ] Accessibility features (ramps, elevators)
- [ ] Save/load custom routes

## Technical Stack

- **React** - UI framework
- **Next.js** - React framework
- **Three.js** - 3D rendering
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for R3F
- **three-pathfinding** - A* pathfinding for Three.js
- **Zustand** - State management

## License

[Your License Here]
