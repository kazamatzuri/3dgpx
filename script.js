// --- Global Three.js Variables ---
let scene, camera, renderer, controls, terrainMesh, trackLine;
let ambientLight, directionalLight; // Store light references for dynamic updates
const TERRAIN_SIZE = 1000; // Arbitrary size for our 3D terrain plane
let cityMarkers = []; // To store references to city marker objects for easy removal

// --- DOM Elements ---
const mapboxTokenInput = document.getElementById('mapboxToken');
const gpxFileInput = document.getElementById('gpxFile');
const zScaleInput = document.getElementById('zScale');
const terrainZoomInput = document.getElementById('terrainZoom');
const ambientLightInput = document.getElementById('ambientLight');
const directionalLightInput = document.getElementById('directionalLight');
const ambientLightValueSpan = document.getElementById('ambientLightValue');
const directionalLightValueSpan = document.getElementById('directionalLightValue');
const visualizeButton = document.getElementById('visualizeButton');
const statusDiv = document.getElementById('status');
const viewerDiv = document.getElementById('viewer');

// --- Sample City Data ---
const cities = [
    { name: "Zurich", lat: 47.3769, lon: 8.5417 },
    { name: "Geneva", lat: 46.2044, lon: 6.1432 },
    { name: "Bern", lat: 46.9480, lon: 7.4474 },
    // Add more cities as needed
];

// --- Initialization ---
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Camera
    camera = new THREE.PerspectiveCamera(75, viewerDiv.clientWidth / viewerDiv.clientHeight, 0.1, 20000);
    camera.position.set(0, TERRAIN_SIZE / 2, TERRAIN_SIZE / 1.5); // Position camera to see the terrain
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    viewerDiv.innerHTML = ''; // Clear previous canvas if any
    viewerDiv.appendChild(renderer.domElement);

    // Lights
    ambientLight = new THREE.AmbientLight(0xffffff, parseFloat(ambientLightInput.value));
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, parseFloat(directionalLightInput.value));
    directionalLight.position.set(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SIZE);
    scene.add(directionalLight);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2.1; // Don't look from below ground

    // Axes Helper (for debugging)
    // const axesHelper = new THREE.AxesHelper(TERRAIN_SIZE / 2);
    // scene.add(axesHelper);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- Utility function to create text sprites ---
function makeTextSprite(message, parameters) {
    const fontface = parameters.hasOwnProperty("fontface") ? parameters.fontface : "Arial";
    const fontsize = parameters.hasOwnProperty("fontsize") ? parameters.fontsize : 18;
    const borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters.borderThickness : 2;
    const borderColor = parameters.hasOwnProperty("borderColor") ? parameters.borderColor : { r:0, g:0, b:0, a:1.0 };
    const backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters.backgroundColor : { r:255, g:255, b:255, a:0.8 };
    const textColor = parameters.hasOwnProperty("textColor") ? parameters.textColor : { r:0, g:0, b:0, a:1.0 };

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Estimate text width for canvas sizing
    context.font = "Bold " + fontsize + "px " + fontface;
    const metrics = context.measureText(message);
    const textWidth = metrics.width;

    canvas.width = textWidth + borderThickness * 2 + 10; // Add some padding
    canvas.height = fontsize * 1.4 + borderThickness * 2; // 1.4 for line height

    // Re-apply font after canvas resize
    context.font = "Bold " + fontsize + "px " + fontface;
    
    // Background
    context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    // Border
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
    context.lineWidth = borderThickness;
    
    // Rounded rectangle
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.lineTo(x+w-r, y);
        ctx.quadraticCurveTo(x+w, y, x+w, y+r);
        ctx.lineTo(x+w, y+h-r);
        ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        ctx.lineTo(x+r, y+h);
        ctx.quadraticCurveTo(x, y+h, x, y+h-r);
        ctx.lineTo(x, y+r);
        ctx.quadraticCurveTo(x, y, x+r, y);
        ctx.closePath();
        ctx.fill();
        if (borderThickness > 0) ctx.stroke();
    }
    roundRect(context, borderThickness/2, borderThickness/2, canvas.width - borderThickness, canvas.height - borderThickness, 5);
    
    // Text
    context.fillStyle = "rgba("+textColor.r+","+textColor.g+","+textColor.b+","+textColor.a+")";
    context.fillText(message, borderThickness + 5, fontsize + borderThickness); // Adjust y position for padding

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    // Scale sprite appropriately
    sprite.scale.set(canvas.width/3, canvas.height/3, 1.0); // Adjust scale as needed
    return sprite;  
}

// --- GPX and Terrain Logic ---

// Convert Lat, Lon to Tile numbers
function lonLatToTile(lon, lat, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor(n * ((lon + 180) / 360));
    const ytile = Math.floor(n * (1 - (Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)) / 2);
    return { x: xtile, y: ytile, z: zoom };
}

// Convert Tile numbers to Bounding Box (Lat, Lon)
function tileToBoundingBox(x, y, z) {
    const n = Math.pow(2, z);
    const lon_deg_nw = x / n * 360.0 - 180.0;
    const lat_rad_nw = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat_deg_nw = lat_rad_nw * 180.0 / Math.PI;

    const lon_deg_se = (x + 1) / n * 360.0 - 180.0;
    const lat_rad_se = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
    const lat_deg_se = lat_rad_se * 180.0 / Math.PI;

    return {
        north: lat_deg_nw,
        south: lat_deg_se,
        west: lon_deg_nw,
        east: lon_deg_se
    };
}


// Decode Mapbox Terrain-RGB
function decodeTerrainRGB(r, g, b) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

async function fetchTerrainTile(tileX, tileY, zoom, token) {
    const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tileX}/${tileY}.pngraw?access_token=${token}`;
    statusDiv.textContent = `Fetching tile ${tileX},${tileY} (zoom ${zoom})...`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch tile ${tileX},${tileY}: ${response.statusText}`);
        const blob = await response.blob();
        return createImageBitmap(blob);
    } catch (error) {
        console.error("Error fetching tile:", error);
        statusDiv.textContent = `Error fetching tile: ${error.message}`;
        throw error;
    }
}

function getElevationFromImageData(imageData, u, v) { // u,v are 0-1 normalized coords on tile
    const x = Math.floor(u * (imageData.width -1));
    const y = Math.floor(v * (imageData.height -1));
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageData, 0, 0);
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    return decodeTerrainRGB(pixel[0], pixel[1], pixel[2]);
}

async function fetchMapImageTile(tileX, tileY, zoom, token) {
    // Example for Mapbox Streets. Replace with your preferred tile provider if needed.
    const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/${zoom}/${tileX}/${tileY}?access_token=${token}`;
    // const url = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`; // OpenStreetMap Example (no token needed)
    statusDiv.textContent = `Fetching map image tile ${tileX},${tileY} (zoom ${zoom})...`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch map image tile ${tileX},${tileY}: ${response.statusText}`);
        const blob = await response.blob();
        return createImageBitmap(blob);
    } catch (error) {
        console.error("Error fetching map image tile:", error);
        statusDiv.textContent = `Error fetching map image tile: ${error.message}`;
        throw error; // Or handle more gracefully, e.g., return a placeholder
    }
}

// Helper function to get elevation at a specific Lat, Lon using the fetched terrain-rgb tiles
function getElevationAtLatLon(lat, lon, fetchedTerrainRGBTileData, terrainGeoBounds, zScale) {
    let elevation = 0;
    let foundTileForCoord = false;

    for (const data of fetchedTerrainRGBTileData) { // data is {tileInfo, img}
        const tileBbox = tileToBoundingBox(data.tileInfo.x, data.tileInfo.y, data.tileInfo.z);

        if (lat <= tileBbox.north && lat >= tileBbox.south && lon >= tileBbox.west && lon <= tileBbox.east) {
            const u_tile = (lon - tileBbox.west) / (tileBbox.east - tileBbox.west);
            const v_tile = (tileBbox.north - lat) / (tileBbox.north - tileBbox.south); // v is 0 at North, 1 at South
            elevation = getElevationFromImageData(data.img, u_tile, v_tile);
            foundTileForCoord = true;
            break;
        }
    }
    // if (!foundTileForCoord) {
    //     console.warn(`Coordinate ${lat.toFixed(5)},${lon.toFixed(5)} outside fetched terrain-rgb tile coverage. Using 0 elevation.`);
    // }
    return elevation * zScale;
}

async function createTerrain(gpxPoints, mapboxToken, terrainZoom, zScale) {
    if (gpxPoints.length === 0) {
        statusDiv.textContent = "No GPX points to visualize.";
        return null;
    }

    // 1. Calculate Bounding Box of GPX track
    let minLatGPX = gpxPoints[0].lat, maxLatGPX = gpxPoints[0].lat;
    let minLonGPX = gpxPoints[0].lon, maxLonGPX = gpxPoints[0].lon;
    gpxPoints.forEach(p => {
        minLatGPX = Math.min(minLatGPX, p.lat); maxLatGPX = Math.max(maxLatGPX, p.lat);
        minLonGPX = Math.min(minLonGPX, p.lon); maxLonGPX = Math.max(maxLonGPX, p.lon);
    });

    // Add a small buffer to the GPX bounding box to ensure terrain extends slightly beyond the track.
    // The buffer size might need adjustment based on zoom level or track scale.
    // For zoom 12, 0.01 degrees is roughly 1km. Let's use a smaller buffer.
    const latBuffer = (maxLatGPX - minLatGPX) * 0.05; // 5% buffer
    const lonBuffer = (maxLonGPX - minLonGPX) * 0.05; // 5% buffer
    minLatGPX -= latBuffer; maxLatGPX += latBuffer;
    minLonGPX -= lonBuffer; maxLonGPX += lonBuffer;


    statusDiv.textContent = `GPX Bounds (buffered): Lat(${minLatGPX.toFixed(4)} to ${maxLatGPX.toFixed(4)}), Lon(${minLonGPX.toFixed(4)} to ${maxLonGPX.toFixed(4)})`;

    // 2. Determine ALL tiles needed to cover the GPX bounding box
    const topLeftTileGPX = lonLatToTile(minLonGPX, maxLatGPX, terrainZoom); // NW corner of GPX bbox
    const bottomRightTileGPX = lonLatToTile(maxLonGPX, minLatGPX, terrainZoom); // SE corner of GPX bbox

    const tilesToFetch = [];
    // Tile X increases L to R, Tile Y increases Top to Bottom (North to South)
    const startTileX = topLeftTileGPX.x;
    const endTileX = bottomRightTileGPX.x;
    const startTileY = topLeftTileGPX.y; // Y for maxLat (North)
    const endTileY = bottomRightTileGPX.y; // Y for minLat (South)

    // Cap the number of tiles to prevent excessive requests (e.g., if zoom is too low for a vast GPX)
    // Max 10x10 grid for this example, adjust as needed.
    const MAX_TILES_DIM = 10;
    let numTilesX = Math.abs(endTileX - startTileX) + 1;
    let numTilesY = Math.abs(endTileY - startTileY) + 1;

    let finalStartTileX = startTileX;
    let finalEndTileX = endTileX;
    let finalStartTileY = startTileY;
    let finalEndTileY = endTileY;

    if (numTilesX > MAX_TILES_DIM || numTilesY > MAX_TILES_DIM) {
        statusDiv.textContent = `Warning: GPX track spans ${numTilesX}x${numTilesY} tiles at zoom ${terrainZoom}. Clamping to approx ${MAX_TILES_DIM}x${MAX_TILES_DIM} around center.`;
        const centerLon = (minLonGPX + maxLonGPX) / 2;
        const centerLat = (minLatGPX + maxLatGPX) / 2;
        const centralTile = lonLatToTile(centerLon, centerLat, terrainZoom);
        
        const halfDim = Math.floor(MAX_TILES_DIM / 2);
        finalStartTileX = centralTile.x - halfDim;
        finalEndTileX = centralTile.x + halfDim;
        finalStartTileY = centralTile.y - halfDim;
        finalEndTileY = centralTile.y + halfDim;
        
        numTilesX = MAX_TILES_DIM; // Update for status
        numTilesY = MAX_TILES_DIM;
    }
    
    // Iterate ensuring Y goes from smaller index (North) to larger (South)
    // and X goes from smaller index (West) to larger (East)
    for (let ty = Math.min(finalStartTileY, finalEndTileY); ty <= Math.max(finalStartTileY, finalEndTileY); ty++) {
        for (let tx = Math.min(finalStartTileX, finalEndTileX); tx <= Math.max(finalStartTileX, finalEndTileX); tx++) {
            tilesToFetch.push({ x: tx, y: ty, z: terrainZoom });
        }
    }


    if (tilesToFetch.length === 0) {
        statusDiv.textContent = "Could not determine any tiles for the GPX track area.";
        return null;
    }
    statusDiv.textContent = `Identified ${tilesToFetch.length} tiles (${numTilesX}x${numTilesY} effective) to fetch.`;


    // 3. Calculate overall geographic bounds of the CHOSEN set of tiles
    let minActualTileX = Infinity, maxActualTileX = -Infinity;
    let minActualTileY = Infinity, maxActualTileY = -Infinity;
    tilesToFetch.forEach(t => {
        minActualTileX = Math.min(minActualTileX, t.x);
        maxActualTileX = Math.max(maxActualTileX, t.x);
        minActualTileY = Math.min(minActualTileY, t.y);
        maxActualTileY = Math.max(maxActualTileY, t.y);
    });

    const nwCornerOfTileGridBox = tileToBoundingBox(minActualTileX, minActualTileY, terrainZoom);
    const seCornerOfTileGridBox = tileToBoundingBox(maxActualTileX, maxActualTileY, terrainZoom); // This is NW of (maxActualTileX, maxActualTileY)

    const terrainGeoBounds = {
        minLat: seCornerOfTileGridBox.south, // Use South of the SE-most tile
        maxLat: nwCornerOfTileGridBox.north, // Use North of the NW-most tile
        minLon: nwCornerOfTileGridBox.west,  // Use West of the NW-most tile
        maxLon: seCornerOfTileGridBox.east,  // Use East of the SE-most tile
    };
    console.log("Calculated Terrain Geo Bounds for chosen tiles:", terrainGeoBounds);


    // 4. Fetch tile image data (parallel fetching)
    const tileImagePromises = tilesToFetch.map(tile =>
        fetchTerrainTile(tile.x, tile.y, tile.z, mapboxToken)
            .then(imgBitmap => ({ tileInfo: tile, img: imgBitmap })) // Keep tile info with image
            .catch(error => {
                console.warn(`Failed to fetch terrain-rgb tile ${tile.x},${tile.y}. Error: ${error}. Skipping.`);
                return null; // Allow Promise.all to succeed even if some tiles fail
            })
    );

    const mapImagePromises = tilesToFetch.map(tile =>
        fetchMapImageTile(tile.x, tile.y, tile.z, mapboxToken) // Using same zoom and token for map images
            .then(imgBitmap => ({ tileInfo: tile, img: imgBitmap }))
            .catch(error => {
                console.warn(`Failed to fetch map image tile ${tile.x},${tile.y}. Error: ${error}. Skipping.`);
                return null; 
            })
    );

    const fetchedTerrainRGBTileData = (await Promise.all(tileImagePromises)).filter(Boolean); // Filter out nulls from failed fetches
    const fetchedMapImageTileData = (await Promise.all(mapImagePromises)).filter(Boolean);

    if (fetchedTerrainRGBTileData.length === 0) {
        statusDiv.textContent = "No terrain-rgb tiles successfully fetched. Cannot create terrain.";
        return null;
    }
    if (fetchedMapImageTileData.length === 0) {
        statusDiv.textContent = "No map image tiles successfully fetched. Using elevation data for texture, but it might look odd.";
        // Fallback or alternative texture could be used here if desired
    }
    statusDiv.textContent = `Fetched ${fetchedTerrainRGBTileData.length} terrain-rgb tiles and ${fetchedMapImageTileData.length} map image tiles. Creating mesh...`;


    // 5. Create Terrain Mesh
    const segments = 127; // Resolution of the terrain plane
    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
        const worldX = positions.getX(i);
        const worldZ = positions.getZ(i); // Corresponds to 3D Z axis, which maps to latitude direction

        // Convert plane vertex (relative to TERRAIN_SIZE) to normalized 0-1 coordinates within terrainGeoBounds
        const normXPlane = (worldX + TERRAIN_SIZE / 2) / TERRAIN_SIZE; // 0 at left edge, 1 at right
        const normZPlane = (worldZ + TERRAIN_SIZE / 2) / TERRAIN_SIZE; // 0 at 'bottom' edge, 1 at 'top' (mapping to latitude)

        // Convert normalized plane coords to actual Lat/Lon
        const lon = terrainGeoBounds.minLon + normXPlane * (terrainGeoBounds.maxLon - terrainGeoBounds.minLon);
        // Latitude: plane's positive Z maps to decreasing latitude (North to South)
        const lat = terrainGeoBounds.maxLat - normZPlane * (terrainGeoBounds.maxLat - terrainGeoBounds.minLat);

        let elevation = 0;
        let foundTileForVertex = false;
        for (const data of fetchedTerrainRGBTileData) { // data is {tileInfo, img} - USE TERRAIN RGB FOR ELEVATION
            const tileBbox = tileToBoundingBox(data.tileInfo.x, data.tileInfo.y, data.tileInfo.z);

            if (lat <= tileBbox.north && lat >= tileBbox.south && lon >= tileBbox.west && lon <= tileBbox.east) {
                const u_tile = (lon - tileBbox.west) / (tileBbox.east - tileBbox.west);
                const v_tile = (tileBbox.north - lat) / (tileBbox.north - tileBbox.south); // v is 0 at North, 1 at South
                elevation = getElevationFromImageData(data.img, u_tile, v_tile);
                foundTileForVertex = true;
                break;
            }
        }
        // if (!foundTileForVertex) {
        //     console.warn(`Vertex at ${lat.toFixed(5)},${lon.toFixed(5)} outside fetched tile bounds. Using 0 elevation.`);
        // }
        positions.setY(i, elevation * zScale);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    if (terrainMesh) scene.remove(terrainMesh);
    const material = new THREE.MeshPhongMaterial({
        map: createTerrainTexture(
            fetchedMapImageTileData.map(d => d.img),      // Array of ImageBitmaps from map images
            fetchedMapImageTileData.map(d => d.tileInfo), // Corresponding array of {x,y,z} tile objects
            minActualTileX,                       // Min X tile index of the fetched grid
            minActualTileY                        // Min Y tile index of the fetched grid
        ),
        shininess: 0,
        // wireframe: true // Useful for debugging terrain
    });
    terrainMesh = new THREE.Mesh(geometry, material);
    scene.add(terrainMesh);

    // --- Create Track ---
    const trackPoints3D = [];
    for (const pt of gpxPoints) {
        const normXTrack = (pt.lon - terrainGeoBounds.minLon) / (terrainGeoBounds.maxLon - terrainGeoBounds.minLon);
        const normZTrack = (terrainGeoBounds.maxLat - pt.lat) / (terrainGeoBounds.maxLat - terrainGeoBounds.minLat);

        const worldX = (normXTrack - 0.5) * TERRAIN_SIZE;
        const worldZ = (normZTrack - 0.5) * TERRAIN_SIZE;

        let elevation = 0;
        let foundTileForTrackPt = false;
        for (const data of fetchedTerrainRGBTileData) { // data is {tileInfo, img} - USE TERRAIN RGB FOR ELEVATION
            const tileBbox = tileToBoundingBox(data.tileInfo.x, data.tileInfo.y, data.tileInfo.z);
            if (pt.lat <= tileBbox.north && pt.lat >= tileBbox.south && pt.lon >= tileBbox.west && pt.lon <= tileBbox.east) {
                const u_tile = (pt.lon - tileBbox.west) / (tileBbox.east - tileBbox.west);
                const v_tile = (tileBbox.north - pt.lat) / (tileBbox.north - tileBbox.south);
                elevation = getElevationFromImageData(data.img, u_tile, v_tile);
                foundTileForTrackPt = true;
                break;
            }
        }
        // if (!foundTileForTrackPt && (normXTrack >= 0 && normXTrack <=1 && normZTrack >=0 && normZTrack <=1)) {
            // GPX point is within terrainGeoBounds but no specific tile found for it (e.g. tile fetch failed, or at exact seam)
            // console.warn(`GPX point ${pt.lat.toFixed(5)},${pt.lon.toFixed(5)} could not get elevation from specific tile. Using 0.`);
        // } else if (!foundTileForTrackPt) {
            // GPX point is outside terrainGeoBounds entirely
            // console.warn(`GPX point ${pt.lat.toFixed(5)},${pt.lon.toFixed(5)} is outside overall terrain bounds. Using 0 elevation.`);
        // }


        trackPoints3D.push(new THREE.Vector3(worldX, elevation * zScale + 2 * zScale, worldZ));
    }

    if (trackLine) scene.remove(trackLine);
    const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints3D);
    const trackMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 5 }); // Increased linewidth
    // For thicker lines that respect pixel width better (requires including Line2.js, LineMaterial.js, LineSegmentsGeometry.js)
    // const trackGeometry = new THREE.LineSegmentsGeometry().setPositions( trackPoints3D.flatMap(p => [p.x, p.y, p.z]) );
    // const trackMaterial = new THREE.LineMaterial({ color: 0xff0000, linewidth: 0.005, worldUnits: false }); // linewidth in screen units
    // trackMaterial.resolution.set(viewerDiv.clientWidth, viewerDiv.clientHeight);
    trackLine = new THREE.Line(trackGeometry, trackMaterial);
    scene.add(trackLine);

    // Add City Markers
    console.log("Calling addCityMarkers with cities:", cities, "and terrainGeoBounds:", terrainGeoBounds);
    addCityMarkers(cities, terrainGeoBounds, zScale, fetchedTerrainRGBTileData);

    statusDiv.textContent = "Terrain and track visualized!";

    if (trackPoints3D.length > 0) {
        const boundingBox = new THREE.Box3().setFromObject(trackLine); // Get bounding box of the track
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        controls.target.copy(center);

        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        // Position camera to view the whole track, slightly from above and side
        // The factor for camera distance can be tuned
        const camDist = maxDim > 0 ? maxDim * 2 : TERRAIN_SIZE;
        camera.position.set(center.x, center.y + camDist * 0.5, center.z + camDist);
        camera.lookAt(center);
    } else { // Fallback if no track points
        controls.target.set(0,0,0);
        camera.position.set(0, TERRAIN_SIZE / 2, TERRAIN_SIZE);
    }
    controls.update();

    return { terrainMesh, trackLine };
}

function addCityMarkers(cityData, terrainGeoBounds, zScale, fetchedTerrainRGBTileData) {
    // Clear existing city markers
    cityMarkers.forEach(markerSet => {
        if (markerSet.mesh) scene.remove(markerSet.mesh);
        if (markerSet.label) scene.remove(markerSet.label);
    });
    cityMarkers = [];
    console.log("addCityMarkers: Cleared old markers. Processing cities:", cityData);
    console.log("addCityMarkers: Terrain Geo Bounds:", JSON.parse(JSON.stringify(terrainGeoBounds)));
    console.log("addCityMarkers: Z-Scale:", zScale);

    const markerHeight = 10 * zScale; // Make marker height relative to zScale
    const markerRadius = 2 * zScale;

    cityData.forEach(city => {
        console.log(`addCityMarkers: Processing city: ${city.name} (Lat: ${city.lat}, Lon: ${city.lon})`);

        // Convert city Lat/Lon to normalized coordinates within the terrainGeoBounds
        const normXCity = (city.lon - terrainGeoBounds.minLon) / (terrainGeoBounds.maxLon - terrainGeoBounds.minLon);
        const normZCity = (terrainGeoBounds.maxLat - city.lat) / (terrainGeoBounds.maxLat - terrainGeoBounds.minLat);
        console.log(`addCityMarkers: City ${city.name} - Normalized Coords: X=${normXCity.toFixed(3)}, Z=${normZCity.toFixed(3)}`);

        // Check if the city is within the current terrain bounds
        if (normXCity < 0 || normXCity > 1 || normZCity < 0 || normZCity > 1) {
            console.log(`addCityMarkers: City ${city.name} is OUTSIDE the current terrain bounds. Skipping.`);
            return; // Skip this city
        }

        // Convert normalized coords to world 3D coordinates
        const worldX = (normXCity - 0.5) * TERRAIN_SIZE;
        const worldZ = (normZCity - 0.5) * TERRAIN_SIZE;
        console.log(`addCityMarkers: City ${city.name} - World Coords: X=${worldX.toFixed(2)}, Z=${worldZ.toFixed(2)}`);

        // Get elevation for the city
        // Pass zScale as 1.0 to get raw elevation, then apply the overall zScale for final positioning
        const cityRawElevation = getElevationAtLatLon(city.lat, city.lon, fetchedTerrainRGBTileData, terrainGeoBounds, 1.0); 
        const markerBaseY = cityRawElevation * zScale; // Apply zScale here for final position
        console.log(`addCityMarkers: City ${city.name} - Raw Elevation=${cityRawElevation.toFixed(2)}, Marker Base Y=${markerBaseY.toFixed(2)}`);

        // Create Marker Mesh (e.g., a cone or cylinder)
        const geometry = new THREE.ConeGeometry(markerRadius, markerHeight, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Bright pink
        const markerMesh = new THREE.Mesh(geometry, material);
        
        // Position the marker: Tip of the cone pointing up, base on the terrain surface
        markerMesh.position.set(worldX, markerBaseY + markerHeight / 2, worldZ);
        markerMesh.rotation.x = 0; // Cones point up Y by default

        scene.add(markerMesh);

        // Create Label Sprite
        const label = makeTextSprite(city.name, { fontsize: 24, borderColor: {r:0,g:0,b:0,a:1}, backgroundColor: {r:255,g:255,b:255,a:0.8} });
        label.position.set(worldX, markerBaseY + markerHeight + 15 * zScale, worldZ); // Position label above marker
        scene.add(label);
        
        cityMarkers.push({ mesh: markerMesh, label: label, name: city.name });
        console.log(`addCityMarkers: Added marker and label for ${city.name} to scene.`);
    });
    console.log("addCityMarkers: Finished processing. Final cityMarkers count:", cityMarkers.length, cityMarkers.map(cm => cm.name));
}

// Modified createTerrainTexture to use minCanvasTileX/Y for proper stitching
function createTerrainTexture(tileImageBitmaps, // Array of ImageBitmaps
                              tileInfos,         // Array of {x,y,z} tile objects, corresponding to tileImageBitmaps
                              minCanvasTileX,    // The smallest X tile index among tileInfos actually USED for the canvas
                              minCanvasTileY     // The smallest Y tile index among tileInfos actually USED for the canvas
                             ) {
    if (tileImageBitmaps.length === 0 || tileInfos.length !== tileImageBitmaps.length) {
        console.warn("No tile images or mismatched image/info for texture. Using fallback green texture.");
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(34,139,34)'; // ForestGreen
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
    }

    const tileWidth = tileImageBitmaps[0].width;  // Assuming all tiles are same width (e.g., 256 or 512)
    const tileHeight = tileImageBitmaps[0].height; // Assuming all tiles are same height

    let maxCanvasTileX = -Infinity, maxCanvasTileY = -Infinity;
    tileInfos.forEach(t => { // Find max X,Y from the *actually fetched and provided* tiles
        maxCanvasTileX = Math.max(maxCanvasTileX, t.x);
        maxCanvasTileY = Math.max(maxCanvasTileY, t.y);
    });
    
    const gridWidthInTiles = maxCanvasTileX - minCanvasTileX + 1;
    const gridHeightInTiles = maxCanvasTileY - minCanvasTileY + 1;

    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = gridWidthInTiles * tileWidth;
    masterCanvas.height = gridHeightInTiles * tileHeight;
    const masterCtx = masterCanvas.getContext('2d');

    // For debugging, fill with a color to see gaps if any tiles fail to draw
    // masterCtx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    // masterCtx.fillRect(0, 0, masterCanvas.width, masterCanvas.height);

    for (let i = 0; i < tileImageBitmaps.length; i++) {
        const img = tileImageBitmaps[i];
        const tileInfo = tileInfos[i]; // {x, y, z}
        
        // Calculate position on the master_canvas relative to the minCanvasTileX, minCanvasTileY
        // This ensures tiles are placed correctly within the canvas grid
        const canvasX = (tileInfo.x - minCanvasTileX) * tileWidth;
        const canvasY = (tileInfo.y - minCanvasTileY) * tileHeight;
        
        masterCtx.drawImage(img, canvasX, canvasY);
    }
    
    const texture = new THREE.CanvasTexture(masterCanvas);
    texture.needsUpdate = true;

    // For visual debugging of the composite texture:
    // masterCanvas.style.position = 'fixed';
    // masterCanvas.style.top = '10px';
    // masterCanvas.style.left = '10px';
    // masterCanvas.style.border = '2px solid red';
    // masterCanvas.style.zIndex = '1000';
    // masterCanvas.style.width = '256px'; // Scale down for display
    // masterCanvas.style.height = 'auto';
    // document.body.appendChild(masterCanvas);
    // setTimeout(() => { if (masterCanvas.parentElement) masterCanvas.parentElement.removeChild(masterCanvas); }, 10000);


    return texture;
}


// --- Event Listeners ---
visualizeButton.addEventListener('click', async () => {
    const token = mapboxTokenInput.value.trim();
    const file = gpxFileInput.files[0];
    const zScale = parseFloat(zScaleInput.value);
    const terrainZoomLevel = parseInt(terrainZoomInput.value);

    if (!token) {
        statusDiv.textContent = "Please enter a Mapbox Access Token.";
        return;
    }
    if (!file) {
        statusDiv.textContent = "Please select a GPX file.";
        return;
    }
    if (isNaN(zScale) || zScale <= 0) {
        statusDiv.textContent = "Please enter a valid Z-scale.";
        return;
    }
    if (isNaN(terrainZoomLevel) || terrainZoomLevel < 10 || terrainZoomLevel > 15) {
        statusDiv.textContent = "Please enter a terrain zoom level between 10 and 15.";
        return;
    }


    statusDiv.textContent = "Processing...";
    visualizeButton.disabled = true;

    // Clear previous scene objects
    if (scene) {
        if (terrainMesh) scene.remove(terrainMesh);
        if (trackLine) scene.remove(trackLine);
        // Clear old city markers
        cityMarkers.forEach(markerSet => {
            if (markerSet.mesh) scene.remove(markerSet.mesh);
            if (markerSet.label) scene.remove(markerSet.label);
        });
        cityMarkers = [];
    } else {
        initThreeJS(); // Initialize only if not already done
    }


    try {
        const gpxString = await file.text();
        const gpxPoints = parseGPX(gpxString);

        if (gpxPoints.length === 0) {
            statusDiv.textContent = "GPX file contains no track points or is invalid.";
            visualizeButton.disabled = false;
            return;
        }

        await createTerrain(gpxPoints, token, terrainZoomLevel, zScale);

    } catch (error) {
        console.error("Visualization error:", error);
        statusDiv.textContent = `Error: ${error.message}`;
    } finally {
        visualizeButton.disabled = false;
    }
});

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = viewerDiv.clientWidth / viewerDiv.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    }
});

// --- Light Control Event Listeners ---
ambientLightInput.addEventListener('input', () => {
    const value = parseFloat(ambientLightInput.value);
    ambientLightValueSpan.textContent = value.toFixed(2);
    if (ambientLight) {
        ambientLight.intensity = value;
    }
});

directionalLightInput.addEventListener('input', () => {
    const value = parseFloat(directionalLightInput.value);
    directionalLightValueSpan.textContent = value.toFixed(2);
    if (directionalLight) {
        directionalLight.intensity = value;
    }
});

// --- Initial call if needed or auto-load something ---
// initThreeJS(); // Or call it on first visualize
mapboxTokenInput.value = localStorage.getItem('mapboxToken') || ''; // Persist token
mapboxTokenInput.addEventListener('change', () => localStorage.setItem('mapboxToken', mapboxTokenInput.value));

statusDiv.textContent = "Ready. Enter token, select GPX, and click Visualize.";