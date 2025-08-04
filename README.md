# GPX 3D Visualizer

A web-based application that transforms GPS tracks from GPX files into immersive 3D terrain visualizations using real elevation data from Mapbox.

![GPX 3D Visualizer](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)
![Mapbox](https://img.shields.io/badge/Mapbox-API-blue.svg)

## 🌟 Features

- **3D Terrain Rendering**: Creates realistic 3D terrain meshes using Mapbox terrain-rgb elevation data
- **GPX Track Visualization**: Displays GPS tracks as 3D lines overlaid on the terrain
- **Interactive Controls**: 
  - Adjustable vertical scale (Z-axis multiplier)
  - Terrain detail level (zoom 10-14)
  - Dynamic lighting controls (ambient and directional)
  - Track height adjustment
- **City Markers**: Displays location markers for major cities (currently includes Swiss cities)
- **Tile Caching**: Efficient caching system for terrain and map tiles to improve performance
- **Responsive Design**: Works on different screen sizes with automatic camera adjustments

## 🚀 Quick Start

### Prerequisites

- A modern web browser with WebGL support
- **Mapbox Access Token** - Get one free at [mapbox.com](https://www.mapbox.com/)

### Setup

1. **Clone or download** this repository
2. **Open `index.html`** in your web browser
3. **Enter your Mapbox Access Token** in the provided field
4. **Upload a GPX file** using the file input
5. **Click "Visualize Track"** to generate your 3D visualization

### Usage

1. **Get a Mapbox Token**: 
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Create a new token with default public scopes
   - Paste it into the "Mapbox Access Token" field

2. **Prepare Your GPX File**:
   - Export GPS tracks from apps like Strava, Garmin Connect, or Komoot
   - Ensure the file contains `<trkpt>` or `<rtept>` elements with lat/lon coordinates

3. **Customize the Visualization**:
   - **Vertical Scale**: Adjust terrain height exaggeration (0.1 = flat, 1.0 = realistic, 10 = very mountainous)
   - **Terrain Detail**: Higher zoom levels (14) show more detail but use more tiles
   - **Lighting**: Adjust ambient and directional lighting for better visualization
   - **Track Height**: Raise the track line above the terrain surface

4. **Navigate the 3D Scene**:
   - **Left Mouse**: Rotate view
   - **Right Mouse**: Pan
   - **Mouse Wheel**: Zoom in/out

## 🛠️ Technical Details

### Architecture

- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript
- **3D Engine**: Three.js (r128) for WebGL rendering
- **Terrain Data**: Mapbox terrain-rgb tiles for elevation
- **Map Textures**: Mapbox Streets tiles for surface appearance

### Key Components

- **GPX Parser**: Built-in parser supporting standard GPX track points and route points
- **Tile Management**: Efficient fetching and caching of Mapbox tiles
- **3D Terrain Generation**: Converts elevation data into Three.js PlaneGeometry with displaced vertices
- **Track Rendering**: GPS coordinates mapped to 3D space with elevation-aware positioning

### Performance Features

- **Tile Caching**: Prevents redundant API calls
- **Optimized Mesh Generation**: Uses 127x127 segments for good detail/performance balance
- **Automatic Bounds Calculation**: Only fetches tiles covering the GPX track area
- **Memory Management**: Efficient cleanup of previous visualizations

## 🎛️ Controls Reference

| Control | Purpose | Range/Options |
|---------|---------|---------------|
| Mapbox Access Token | API authentication | Your personal token |
| GPX File | GPS track data | .gpx files |
| Vertical Scale | Terrain height multiplier | 0.1 - 10.0 |
| Terrain Detail | Zoom level for tiles | 10 - 14 |
| Ambient Light | Overall scene brightness | 0.1 - 1.0 |
| Directional Light | Shadow/highlight intensity | 0.1 - 1.0 |
| Track Height | Track elevation above terrain | 2 - 50 units |

## 🔧 Customization

### Adding More Cities

Edit the `cities` array in `script.js`:

```javascript
const cities = [
    { name: "Your City", lat: 46.2044, lon: 6.1432 },
    // Add more cities here
];
```

### Changing Map Styles

Modify the map tile URL in the `fetchMapImageTile` function:

```javascript
// Current: Mapbox Streets
const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/${zoom}/${tileX}/${tileY}?access_token=${token}`;

// Alternative: Satellite
const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/${zoom}/${tileX}/${tileY}?access_token=${token}`;
```

## 📱 Browser Support

- **Chrome**: ✅ Recommended
- **Firefox**: ✅ Full support
- **Safari**: ✅ Works well
- **Edge**: ✅ Compatible

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch tile" errors**:
   - Check your Mapbox token is valid and has the correct scopes
   - Ensure you have internet connectivity

2. **Track appears flat**:
   - Increase the "Vertical Scale" value
   - Try a different terrain zoom level

3. **Performance issues**:
   - Use lower terrain detail (zoom 10-12)
   - Clear tile cache periodically
   - Try smaller GPX files

4. **Track not visible**:
   - Check that your GPX file contains valid track points
   - Adjust "Track Height" to make it more visible

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

## 🤝 Contributing

Contributions are welcome! Some ideas for improvements:

- Support for multiple GPX tracks
- Different track visualization styles
- Export functionality (screenshots, 3D models)
- More map tile providers
- Performance optimizations for large tracks
- Mobile touch controls

## 🔗 Dependencies

- [Three.js](https://threejs.org/) - 3D graphics library
- [Mapbox API](https://docs.mapbox.com/api/) - Terrain and map data
- Modern browser with WebGL support

---

**Enjoy exploring your GPS adventures in 3D!** 🏔️🚴‍♂️🗺️