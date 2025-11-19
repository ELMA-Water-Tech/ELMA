// AquaDetect Platform - Main Application JavaScript

// Application Data
const appData = {
  segmentation_area: {
    name: "Périmètre du pilote",
    center: [33.15, -7.53], // Will be calculated from data
    boundary: null, // Will be loaded from GeoJSON
    segmentationData: null, // Will hold the full GeoJSON data
    area: "Variable",
    color: "#1800ad" // Purple
  },
  nappe_berrechid: {
    name: "Nappe de Berrechid",
    center: [33.15, -7.75], // Will be calculated from data
    boundary: null, // Will be loaded from CSV
    nappePoints: [], // Will hold coordinate points
    area: "~2,500 km²",
    color: "#ffde21" // Yellow
  },
  currentRegion: "all_regions", // Default to show all regions
  wells: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-7.577820, 33.351177]
        },
        properties: {
          id: "well_001",
          type: "well",
          depth: 45,
          status: "active",
          water_level: 12.5,
          quality: "good",
          detection_confidence: 0.92,
          last_updated: "2025-10-10"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point", 
          coordinates: [-7.590, 33.340]
        },
        properties: {
          id: "well_002",
          type: "well",
          depth: 38,
          status: "active",
          water_level: 18.3,
          quality: "moderate", 
          detection_confidence: 0.87,
          last_updated: "2025-10-10"
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-7.560, 33.360]
        },
        properties: {
          id: "well_003", 
          type: "well",
          depth: 52,
          status: "inactive",
          water_level: 5.2,
          quality: "poor",
          detection_confidence: 0.78,
          last_updated: "2025-10-10"
        }
      }
    ]
  },
  waterPoints: {
    type: "FeatureCollection",
    features: [] // Will be loaded from data/geojson/water_points.geojson
  },
  basins: {
    type: "FeatureCollection",
    features: [
      // Real basin data will be loaded from the actual region boundary
      // The main basin is represented by the region boundary itself
    ]
  },
  analytics: {
    region_summary: {
      total_wells: 3,
      active_wells: 2,
      inactive_wells: 1,
      total_basins: 76, // Basins (points) detected in segmentation analysis
      total_water_points: 76, // Points detected in segmentation analysis
      avg_well_depth: 45.0,
      avg_water_level: 12.0,
      total_basin_capacity: 0, // To be determined from actual data
      avg_basin_level: 0 // To be determined from actual data
    },
    spectral_indices: {
      avg_ndvi: 0.415,
      avg_ndwi: 0.70,
      vegetation_coverage: 41.5,
      water_surface_area: 1200 // Approximate basin area in km²
    },
    detection_stats: {
      avg_confidence: 0.88,
      high_confidence_detections: 30,
      medium_confidence_detections: 6,
      low_confidence_detections: 2
    }
  }
};

// Authentication check
function checkAuthentication() {
    const isValid = sessionStorage.getItem('elma_license_valid');
    const loginTime = sessionStorage.getItem('elma_login_time');
    const license = sessionStorage.getItem('elma_license');
    
    if (!isValid || !loginTime || !license) {
        return false;
    }
    
    // Check if license is still valid (24 hours)
    const timeElapsed = Date.now() - parseInt(loginTime);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (timeElapsed >= twentyFourHours) {
        // License expired, clear storage
        sessionStorage.removeItem('elma_license');
        sessionStorage.removeItem('elma_license_valid');
        sessionStorage.removeItem('elma_login_time');
        return false;
    }
    
    return true;
}

// Global variables
let map;
let regionBoundaryLayer;
let basinPolygonsLayer;
let analysisPointsLayer;
let pointsWithSegmentationLayer;
let pointsWithoutSegmentationLayer;
let charts = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication before initializing
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }
    
    initializeApp();
});

function initializeApp() {
    updateDateTime();
    // Load region boundaries, water points, and nappe data before initializing the map
    Promise.all([
        loadRegionBoundary(),
        loadWaterPoints(),
        loadNappeBerrechid()
    ]).then(() => {
        initializeMap();
        initializeEventListeners();
        initializeCharts();
        updateAnalytics();
        initializeSplitters();
    }).catch(error => {
        console.error('Error initializing app:', error);
        // Still try to initialize splitters even if other parts fail
        setTimeout(initializeSplitters, 1000);
    });
}

// Update last update date display
function updateDateTime() {
    // Set the last update date (when the data was last refreshed)
    const lastUpdate = new Date('2025-11-18'); // Change this date when you update the data
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const lastUpdateElement = document.getElementById('lastUpdateDate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = 'Dernière mise à jour: ' + lastUpdate.toLocaleDateString('fr-FR', options);
    }
}

// Update layer counts in the UI
function updateLayerCounts(points, polygons) {
    const pointCountEl = document.getElementById('pointCount');
    const polygonCountEl = document.getElementById('polygonCount');
    
    if (pointCountEl) {
        pointCountEl.textContent = points;
    }
    if (polygonCountEl) {
        polygonCountEl.textContent = polygons;
    }
}

// Load region boundaries from GeoJSON files
async function loadRegionBoundary() {
    try {
        // Load Segmentation analysis (updated to 2025 data)
        await loadSegmentationData('segmentation_area', 'data/geojson/berrechid_demo_2025.geojson');
        
        console.log('All region boundaries loaded successfully');
    } catch (error) {
        console.error('Error loading region boundaries:', error);
    }
}

// Load a specific region from GeoJSON
async function loadSpecificRegion(regionKey, filePath, needsTransformation) {
    try {
        const response = await fetch(filePath);
        const geojsonData = await response.json();
        
        if (geojsonData.features && geojsonData.features.length > 0) {
            const feature = geojsonData.features[0];
            let coordinates = feature.geometry.coordinates[0];
            
            // Transform coordinates if needed (projected coordinates)
            if (needsTransformation) {
                coordinates = transformCoordinates(coordinates);
                console.log('Transformed coordinates for', regionKey);
            } else {
                // Demo area is already in lat/lng format
                console.log('Using direct coordinates for', regionKey);
            }
            
            appData[regionKey].boundary = {
                type: "Polygon",
                coordinates: [coordinates]
            };
            
            // Calculate center from the coordinates
            const center = calculatePolygonCenter(coordinates);
            appData[regionKey].center = center;
            
            console.log(`${regionKey} loaded:`, {
                center: center,
                coordinateCount: coordinates.length
            });
        }
    } catch (error) {
        console.error(`Error loading ${regionKey}:`, error);
    }
}

// Transform projected coordinates to WGS84 lat/lng
function transformCoordinates(projectedCoords) {
    // Looking at the coordinate range in the GeoJSON:
    // X: ~280000-330000, Y: ~277000-328000
    // These appear to be Morocco Lambert Conformal Conic coordinates
    
    const transformed = projectedCoords.map(coord => {
        const x = coord[0];
        const y = coord[1];
        
        // For Berrechid region in Morocco, approximate transformation
        // Based on analysis of coordinate ranges and known Berrechid location
        
        // Berrechid is approximately at 33.35°N, 7.58°W
        // Using the coordinate ranges to estimate the transformation
        const minX = 280000, maxX = 330000;
        const minY = 277000, maxY = 328000;
        
        // Known approximate bounds for Berrechid region
        const minLng = -7.8, maxLng = -7.3;
        const minLat = 33.1, maxLat = 33.6;
        
        // Linear interpolation based on coordinate ranges
        const lng = minLng + ((x - minX) / (maxX - minX)) * (maxLng - minLng);
        const lat = minLat + ((y - minY) / (maxY - minY)) * (maxLat - minLat);
        
        return [lng, lat];
    });
    
    return transformed;
}

// Calculate polygon center
function calculatePolygonCenter(coordinates) {
    let totalLat = 0;
    let totalLng = 0;
    const numPoints = coordinates.length - 1; // Exclude the closing point
    
    for (let i = 0; i < numPoints; i++) {
        totalLng += coordinates[i][0];
        totalLat += coordinates[i][1];
    }
    
    return [totalLat / numPoints, totalLng / numPoints];
}

// Load segmentation analysis data
async function loadSegmentationData(regionKey, filePath) {
    try {
        const response = await fetch(filePath);
        const geojsonData = await response.json();
        
        if (geojsonData.features && geojsonData.features.length > 0) {
            // Store the full GeoJSON data
            appData[regionKey].segmentationData = geojsonData;
            
            // Calculate bounds from all features to determine center
            let minLat = Infinity, maxLat = -Infinity;
            let minLng = Infinity, maxLng = -Infinity;
            
            geojsonData.features.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    const [lng, lat] = feature.geometry.coordinates;
                    minLat = Math.min(minLat, lat);
                    maxLat = Math.max(maxLat, lat);
                    minLng = Math.min(minLng, lng);
                    maxLng = Math.max(maxLng, lng);
                } else if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates[0].forEach(coord => {
                        const [lng, lat] = coord;
                        minLat = Math.min(minLat, lat);
                        maxLat = Math.max(maxLat, lat);
                        minLng = Math.min(minLng, lng);
                        maxLng = Math.max(maxLng, lng);
                    });
                }
            });
            
            // Calculate center
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            appData[regionKey].center = [centerLat, centerLng];
            
            // Create a boundary box for the region
            appData[regionKey].boundary = {
                type: "Polygon",
                coordinates: [[
                    [minLng, minLat],
                    [maxLng, minLat],
                    [maxLng, maxLat],
                    [minLng, maxLat],
                    [minLng, minLat]
                ]]
            };
            
            // Count points and polygons for display
            const pointCount = geojsonData.features.filter(f => f.geometry.type === 'Point').length;
            const polygonCount = geojsonData.features.filter(f => f.geometry.type === 'Polygon').length;
            
            // Update the counts in the UI
            updateLayerCounts(pointCount, polygonCount);
            
            console.log(`${regionKey} loaded:`, {
                center: appData[regionKey].center,
                featureCount: geojsonData.features.length,
                bounds: { minLat, maxLat, minLng, maxLng }
            });
        }
    } catch (error) {
        console.error(`Error loading ${regionKey}:`, error);
    }
}

// Load water points from GeoJSON file
async function loadWaterPoints() {
    try {
        const response = await fetch('data/geojson/water_points.geojson');
        const geojsonData = await response.json();
        
        if (geojsonData.features && geojsonData.features.length > 0) {
            // Replace the empty features array with loaded data
            appData.waterPoints.features = geojsonData.features;
            console.log(`Loaded ${geojsonData.features.length} water points from GeoJSON`);
        }
    } catch (error) {
        console.error('Error loading water points:', error);
        // Keep the empty array if loading fails
    }
}

// Load Nappe de Berrechid from CSV file
async function loadNappeBerrechid() {
    try {
        const response = await fetch('data/csv/nappeber.csv');
        const csvText = await response.text();
        
        // Parse CSV
        const lines = csvText.trim().split('\n');
        const points = [];
        
        // Skip header, parse data lines
        for (let i = 1; i < lines.length; i++) {
            const [fid, lat, lng] = lines[i].split(',');
            if (lat && lng) {
                points.push([parseFloat(lng), parseFloat(lat)]);
            }
        }
        
        if (points.length > 0) {
            // Close the polygon by adding the first point at the end
            points.push(points[0]);
            
            // Store points and create boundary
            appData.nappe_berrechid.nappePoints = points;
            appData.nappe_berrechid.boundary = {
                type: "Polygon",
                coordinates: [points]
            };
            
            // Calculate center
            let sumLat = 0, sumLng = 0;
            for (let i = 0; i < points.length - 1; i++) {
                sumLng += points[i][0];
                sumLat += points[i][1];
            }
            const centerLng = sumLng / (points.length - 1);
            const centerLat = sumLat / (points.length - 1);
            appData.nappe_berrechid.center = [centerLat, centerLng];
            
            console.log(`Loaded Nappe de Berrechid with ${points.length - 1} points`);
        }
    } catch (error) {
        console.error('Error loading Nappe de Berrechid:', error);
    }
}

// Initialize Leaflet map
function initializeMap() {
    // Initialize map
    map = L.map('map').setView(appData.segmentation_area.center, 11);
    
    // Add Esri World Imagery tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);
    
    // Add region boundary
    addRegionBoundary();
    
    // Add segmentation data
    addSegmentationData();
    
    // Add map event listeners for dynamic stats
    addMapEventListeners();
    
    // Update visible stats after map is fully loaded and rendered
    map.whenReady(function() {
        // Wait for map to be fully rendered with valid size
        setTimeout(function() {
            const mapContainer = map.getContainer();
            if (mapContainer && mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0) {
                map.invalidateSize(); // Ensure map has correct size
                setTimeout(function() {
                    updateVisibleStats();
                }, 50);
            }
        }, 150);
    });
    
    // Also update on first load event
    map.once('load', function() {
        setTimeout(function() {
            updateVisibleStats();
        }, 100);
    });
}

function addRegionBoundary() {
    const currentRegionKey = appData.currentRegion;
    
    if (currentRegionKey === 'all_regions') {
        // Show all regions
        regionBoundaryLayer = L.featureGroup().addTo(map);
        addAllRegionBoundaries();
    } else {
        // Show single region
        const currentRegionData = appData[currentRegionKey];
        
        if (!currentRegionData || !currentRegionData.boundary) {
            console.error('Current region boundary not loaded');
            return;
        }
        
        const coordinates = currentRegionData.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
        
        regionBoundaryLayer = L.polygon(coordinates, {
            color: currentRegionData.color,
            weight: 2,
            opacity: 0.6,
            fillColor: currentRegionData.color,
            fillOpacity: 0.08
        }).addTo(map);
        
        regionBoundaryLayer.bindPopup(createRegionPopup(currentRegionKey, currentRegionData));
    }
}

function addAllRegionBoundaries() {
    const regions = ['segmentation_area', 'nappe_berrechid'];
    
    regions.forEach(regionKey => {
        const regionData = appData[regionKey];
        
        if (!regionData || !regionData.boundary) {
            console.warn(`Region ${regionKey} boundary not loaded`);
            return;
        }
        
        const coordinates = regionData.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
        
        const polygon = L.polygon(coordinates, {
            color: regionData.color,
            weight: 2,
            opacity: 0.6,
            fillColor: regionData.color,
            fillOpacity: 0.08
        });
        
        polygon.bindPopup(createRegionPopup(regionKey, regionData));
        regionBoundaryLayer.addLayer(polygon);
    });
}

function createRegionPopup(regionKey, regionData) {
    return `
        <div class=\"popup-content\">
            <div class=\"popup-header\">${regionData.name}</div>
            <div class=\"popup-details\">
                <div class=\"popup-detail\">
                    <span class=\"label\">Surface :</span>
                    <span class=\"value\">${regionData.area}</span>
                </div>
                <div class=\"popup-detail\">
                    <span class=\"label\">Type :</span>
                    <span class=\"value\">${regionKey === 'nappe_berrechid' ? 'Nappe souterraine' : 'Zone d\'analyse'}</span>
                </div>
            </div>
        </div>
    `;
}

function addSegmentationData() {
    // Create separate layers for polygons and different types of points
    basinPolygonsLayer = L.featureGroup().addTo(map);
    pointsWithSegmentationLayer = L.featureGroup().addTo(map);
    pointsWithoutSegmentationLayer = L.featureGroup().addTo(map);
    
    // For backwards compatibility, keep analysisPointsLayer as a reference to all points
    analysisPointsLayer = L.featureGroup([pointsWithSegmentationLayer, pointsWithoutSegmentationLayer]).addTo(map);
    
    const segmentationData = appData.segmentation_area.segmentationData;
    
    if (!segmentationData || !segmentationData.features) {
        console.log('No segmentation data available');
        return;
    }
    
    // Only display if segmentation_area is selected
    if (appData.currentRegion !== 'segmentation_area' && appData.currentRegion !== 'all_regions') {
        return;
    }
    
    segmentationData.features.forEach(feature => {
        const props = feature.properties;
        
        if (feature.geometry.type === 'Point') {
            const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
        
        const marker = L.circleMarker(coords, {
                radius: 4,
                fillColor: props.has_segmentation ? '#6EADFF' : '#6b7280',
            color: '#ffffff',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
            });
            
            // Build popup content with conditional fields
            let popupContent = `
        <div class="popup-content">
                    <div class="popup-header">Bassin ${props.point_index}</div>
            <div class="popup-details">
                <div class="popup-detail">
                            <span class="label">Année :</span>
                            <span class="value">${props.year || 'N/A'}</span>
                </div>
                <div class="popup-detail">
                            <span class="label">Segmentation :</span>
                            <span class="value">${props.has_segmentation ? 'Oui' : 'Non'}</span>
                        </div>`;
            
            // Add basin-specific data if available
            if (props.area_m2) {
                popupContent += `
                <div class="popup-detail">
                            <span class="label">Superficie :</span>
                            <span class="value">${Math.round(props.area_m2).toLocaleString()} m²</span>
                        </div>`;
            }
            
            if (props.area_category) {
                popupContent += `
                <div class="popup-detail">
                            <span class="label">Catégorie :</span>
                            <span class="value">${props.area_category}</span>
                        </div>`;
            }
            
            if (props.hmax_m) {
                popupContent += `
                <div class="popup-detail">
                            <span class="label">Profondeur max :</span>
                            <span class="value">${props.hmax_m.toFixed(1)} m</span>
                        </div>`;
            }
            
            if (props.volume_m3) {
                popupContent += `
                <div class="popup-detail">
                            <span class="label">Volume :</span>
                            <span class="value">${Math.round(props.volume_m3).toLocaleString()} m³</span>
                        </div>`;
            }
            
            popupContent += `
            </div>
        </div>
    `;
            
            marker.bindPopup(popupContent);
            
            // Add click event to show coordinates in sidebar
            marker.on('click', function(e) {
                console.log('Point clicked:', props.point_index, coords);
                showPointCoordinates(coords, props.point_index);
            });
            
            // Add to appropriate layer based on segmentation status
            if (props.has_segmentation) {
                pointsWithSegmentationLayer.addLayer(marker);
            } else {
                pointsWithoutSegmentationLayer.addLayer(marker);
            }
            
        } else if (feature.geometry.type === 'Polygon') {
            const coordinates = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            
            const polygon = L.polygon(coordinates, {
                color: '#1800ad',
                weight: 2,
                opacity: 0.8,
                fillColor: '#1800ad',
                fillOpacity: 0.3
            });
            
            // Build polygon popup with detailed information
            let polygonPopup = `
        <div class="popup-content">
                    <div class="popup-header">Segmentation - Bassin ${props.point_index || 'N/A'}</div>
            <div class="popup-details">
                <div class="popup-detail">
                            <span class="label">Année :</span>
                            <span class="value">${props.year || 'N/A'}</span>
                        </div>`;
            
            if (props.area_m2) {
                polygonPopup += `
                <div class="popup-detail">
                            <span class="label">Superficie :</span>
                            <span class="value">${Math.round(props.area_m2).toLocaleString()} m²</span>
                        </div>`;
            }
            
            if (props.area_category) {
                polygonPopup += `
                <div class="popup-detail">
                            <span class="label">Catégorie :</span>
                            <span class="value">${props.area_category}</span>
                        </div>`;
            }
            
            if (props.hmax_m) {
                polygonPopup += `
                <div class="popup-detail">
                            <span class="label">Profondeur max :</span>
                            <span class="value">${props.hmax_m.toFixed(1)} m</span>
                        </div>`;
            }
            
            if (props.volume_m3) {
                polygonPopup += `
                <div class="popup-detail">
                            <span class="label">Volume :</span>
                            <span class="value">${Math.round(props.volume_m3).toLocaleString()} m³</span>
                        </div>`;
            }
            
            polygonPopup += `
            </div>
        </div>
    `;
            
            polygon.bindPopup(polygonPopup);
            
            basinPolygonsLayer.addLayer(polygon);
        }
    });
    
    const totalPoints = pointsWithSegmentationLayer.getLayers().length + pointsWithoutSegmentationLayer.getLayers().length;
    console.log(`Loaded ${basinPolygonsLayer.getLayers().length} polygons, ${pointsWithSegmentationLayer.getLayers().length} points with segmentation, ${pointsWithoutSegmentationLayer.getLayers().length} points without segmentation (${totalPoints} total points)`);
}

// Define coordinate systems using Proj4js
// WGS84 (standard GPS coordinates)
const wgs84 = 'EPSG:4326';

// Morocco Lambert Conformal Conic (EPSG:26191)
// This is the standard projection system used in Morocco
const moroccoLambert = '+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs';

// Transform WGS84 lat/lng to Morocco Lambert projected X,Y coordinates
function latLngToXY(lng, lat) {
    try {
        // Use proj4 for accurate transformation
        if (typeof proj4 !== 'undefined') {
            const result = proj4(wgs84, moroccoLambert, [lng, lat]);
            console.log('Proj4 transformation:', [lng, lat], '->', result);
            return { 
                x: Math.round(result[0]), 
                y: Math.round(result[1]) 
            };
        } else {
            console.warn('Proj4 library not loaded, using approximation');
        }
    } catch (error) {
        console.error('Proj4 transformation error:', error);
    }
    
    // Fallback to approximate calculation if proj4 fails
    const centerLng = -7.58;
    const centerLat = 33.27;
    const centerX = 305000;
    const centerY = 302000;
    
    const metersPerDegreeLng = 93000;
    const metersPerDegreeLat = 111000;
    
    const x = centerX + (lng - centerLng) * metersPerDegreeLng;
    const y = centerY + (lat - centerLat) * metersPerDegreeLat;
    
    console.log('Approximate transformation:', [lng, lat], '->', {x, y});
    return { x: Math.round(x), y: Math.round(y) };
}

// Show point coordinates in left sidebar
function showPointCoordinates(latLngCoords, pointIndex) {
    console.log('showPointCoordinates called with:', latLngCoords, pointIndex);
    
    const coords = latLngToXY(latLngCoords[1], latLngCoords[0]);
    console.log('Converted coords:', coords);
    
    // Update the Coordonnées field in left sidebar
    const coordsElement = document.getElementById('regionCoords');
    
    if (!coordsElement) {
        console.error('regionCoords element not found!');
        return;
    }
    
    coordsElement.textContent = `X: ${coords.x.toLocaleString()}, Y: ${coords.y.toLocaleString()}`;
    console.log('Updated coordinates display');
    
    // Highlight the field temporarily
    coordsElement.style.color = '#1800ad';
    coordsElement.style.fontWeight = '600';
    coordsElement.style.transition = 'all 0.3s ease';
    
    // Reset after 3 seconds
    setTimeout(() => {
        coordsElement.style.color = '';
        coordsElement.style.fontWeight = '';
    }, 3000);
}

// Add map event listeners for dynamic statistics
function addMapEventListeners() {
    // Update stats when map view changes
    map.on('zoomend moveend', function() {
        updateVisibleStats();
    });
}

// Update statistics based on visible map bounds
function updateVisibleStats() {
    // Check if map is initialized and has valid bounds
    if (!map || !map.getBounds) {
        return;
    }
    
    const bounds = map.getBounds();
    
    // Validate bounds are reasonable
    if (!bounds || !bounds.isValid || !bounds.isValid()) {
        return;
    }
    
    const currentRegion = appData.currentRegion;
    
    let visibleBasins = 0;
    let visiblePolygons = 0;
    
    // Calculate the area of the visible map bounds (viewport) using geodesic calculation
    let mapBoundsArea = 0;
    
    // Validate bounds values
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();
    
    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west) || 
        north === south || east === west) {
        // Invalid bounds, don't update
        return;
    }
    
    try {
        // Create a polygon from the map bounds corners
        const boundsPolygon = turf.polygon([[
            [west, south],  // Southwest
            [east, south],  // Southeast
            [east, north],  // Northeast
            [west, north],  // Northwest
            [west, south]   // Close the polygon
        ]]);
        
        // Calculate geodesic area in square meters, then convert to hectares
        const areaInSquareMeters = turf.area(boundsPolygon);
        mapBoundsArea = areaInSquareMeters / 10000; // Convert m² to hectares
    } catch (e) {
        console.warn('Error calculating map bounds area:', e);
        // Fallback: approximate calculation using simple rectangle
        const latDiff = north - south;
        const lngDiff = east - west;
        const centerLat = bounds.getCenter().lat;
        // Approximate meters per degree (rough calculation)
        const metersPerDegreeLat = 111320; // meters per degree of latitude
        const metersPerDegreeLng = 111320 * Math.cos(centerLat * Math.PI / 180); // meters per degree of longitude at this latitude
        const areaInSquareMeters = (latDiff * metersPerDegreeLat) * (lngDiff * metersPerDegreeLng);
        mapBoundsArea = areaInSquareMeters / 10000;
    }
    
    // Count visible features from segmentation data
    if (currentRegion === 'segmentation_area' || currentRegion === 'all_regions') {
        const segmentationData = appData.segmentation_area.segmentationData;
        
        if (segmentationData && segmentationData.features) {
            segmentationData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    // Check if polygon is visible in bounds
                    if (isPolygonVisible(feature.geometry.coordinates[0], bounds)) {
                        visiblePolygons++;
                    }
                } else if (feature.geometry.type === 'Point') {
                    // Check if point is visible in bounds - points represent basins
                    const coords = feature.geometry.coordinates;
                    if (bounds.contains([coords[1], coords[0]])) {
                        visibleBasins++;
                    }
                }
            });
        }
    }
    
    // Update the KPIs in right sidebar
    // Always update the area (map bounds area) and basin count
    document.getElementById('kpiBasinCount').textContent = visibleBasins;
    document.getElementById('kpiPlotArea').textContent = mapBoundsArea.toFixed(2); // Show 2 decimal places
    
    console.log(`Visible in bounds: ${visibleBasins} basins (points), ${visiblePolygons} polygons, map bounds area: ${mapBoundsArea.toFixed(2)} ha`);
}

// Check if a polygon is visible within the map bounds
function isPolygonVisible(coordinates, bounds) {
    // Check if any point of the polygon is within bounds
    for (let i = 0; i < coordinates.length; i++) {
        const [lng, lat] = coordinates[i];
        if (bounds.contains([lat, lng])) {
            return true;
        }
    }
    
    // Also check if the polygon completely contains the bounds
    // (for very large polygons that contain the visible area)
    const center = bounds.getCenter();
    if (isPointInPolygon([center.lng, center.lat], coordinates)) {
        return true;
    }
    
    return false;
}

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Initialize event listeners
function initializeEventListeners() {
    // Region selector
    document.getElementById('regionSelector').addEventListener('change', function() {
        switchRegion(this.value);
    });
    
    // Layer toggles for basins and points
    document.getElementById('showBasinPolygons').addEventListener('change', function() {
        updateLayerVisibility();
    });
    
    document.getElementById('showAnalysisPoints').addEventListener('change', function() {
        updateLayerVisibility();
    });
    
    // Function to update layer visibility based on checkbox states
    function updateLayerVisibility() {
        const showPolygons = document.getElementById('showBasinPolygons').checked;
        const showPoints = document.getElementById('showAnalysisPoints').checked;
        
        // Handle polygon layer
        if (showPolygons) {
            if (basinPolygonsLayer && !map.hasLayer(basinPolygonsLayer)) {
                map.addLayer(basinPolygonsLayer);
            }
        } else {
            if (basinPolygonsLayer && map.hasLayer(basinPolygonsLayer)) {
                map.removeLayer(basinPolygonsLayer);
            }
        }
        
        // Handle points with segmentation
        // Show when: polygons are checked OR points are checked
        if (showPolygons || showPoints) {
            if (pointsWithSegmentationLayer && !map.hasLayer(pointsWithSegmentationLayer)) {
                map.addLayer(pointsWithSegmentationLayer);
            }
        } else {
            if (pointsWithSegmentationLayer && map.hasLayer(pointsWithSegmentationLayer)) {
                map.removeLayer(pointsWithSegmentationLayer);
            }
        }
        
        // Handle points without segmentation
        // Show only when: points checkbox is checked
        if (showPoints) {
            if (pointsWithoutSegmentationLayer && !map.hasLayer(pointsWithoutSegmentationLayer)) {
                map.addLayer(pointsWithoutSegmentationLayer);
            }
        } else {
            if (pointsWithoutSegmentationLayer && map.hasLayer(pointsWithoutSegmentationLayer)) {
                map.removeLayer(pointsWithoutSegmentationLayer);
            }
        }
    }
    
    // Map controls
    // Reset map view button removed - functionality replaced by History button
    // document.getElementById('resetMapView').addEventListener('click', function() {
    //     const currentRegionData = appData[appData.currentRegion];
    //     map.setView(currentRegionData.center, 11);
    // });
    
    document.getElementById('toggleLegend').addEventListener('click', function() {
        const legend = document.getElementById('mapLegend');
        legend.classList.toggle('hidden');
    });
    
    // Download coordinates functionality
    document.getElementById('downloadCoordsBtn').addEventListener('click', async function() {
        const year = document.getElementById('exportYear').value;
        await downloadCoordinatesForYear(year);
    });
    
    // Function to download coordinates as Excel
    async function downloadCoordinatesForYear(year) {
        try {
            const downloadBtn = document.getElementById('downloadCoordsBtn');
            const originalText = downloadBtn.innerHTML;
            
            // Show loading state
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span class="download-icon">⏳</span><span>Chargement...</span>';
            
            // Load the GeoJSON file for the selected year
            const response = await fetch(`data/geojson/demo_berrechid_by_years/demo_berrechid_${year}.geojson`);
            if (!response.ok) {
                throw new Error(`Failed to load data for year ${year}`);
            }
            
            const geojsonData = await response.json();
            
            // Filter only Point features
            const points = geojsonData.features.filter(f => f.geometry.type === 'Point');
            
            if (points.length === 0) {
                alert(`Aucun point trouvé pour l'année ${year}`);
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = originalText;
                return;
            }
            
            // Prepare data for Excel
            const excelData = points.map((feature, index) => {
                const coords = feature.geometry.coordinates;
                const props = feature.properties || {};
                
                // Transform coordinates to X,Y using proj4 if needed
                // Note: The coordinates in the file might already be in X,Y format
                // Adjust transformation if needed based on your data format
                const x = coords[0];
                const y = coords[1];
                
                return {
                    'ID': props.point_index || index + 1,
                    'X': x.toFixed(6),
                    'Y': y.toFixed(6),
                    'Année': year,
                    'Année détection': props.year || year,
                    'Superficie (m²)': props.area_m2 ? Math.round(props.area_m2) : '',
                    'Profondeur max (m)': props.hmax_m ? props.hmax_m.toFixed(2) : '',
                    'Volume (m³)': props.volume_m3 ? Math.round(props.volume_m3) : '',
                    'Catégorie': props.area_category || ''
                };
            });
            
            // Create Excel workbook
            const ws = XLSX.utils.json_to_sheet(excelData);
            
            // Set column widths
            const colWidths = [
                { wch: 8 },   // ID
                { wch: 15 },  // X
                { wch: 15 },  // Y
                { wch: 8 },   // Année
                { wch: 12 },  // Année détection
                { wch: 15 },  // Superficie
                { wch: 15 },  // Profondeur
                { wch: 15 },  // Volume
                { wch: 15 }   // Catégorie
            ];
            ws['!cols'] = colWidths;
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Coordonnées ${year}`);
            
            // Generate filename
            const filename = `coordonnees_bassins_${year}.xlsx`;
            
            // Write and download
            XLSX.writeFile(wb, filename);
            
            // Reset button state
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = originalText;
            
            console.log(`Downloaded ${points.length} coordinates for year ${year}`);
            
        } catch (error) {
            console.error('Error downloading coordinates:', error);
            alert(`Erreur lors du téléchargement: ${error.message}`);
            
            // Reset button state
            const downloadBtn = document.getElementById('downloadCoordsBtn');
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '<span class="download-icon">⬇️</span><span>Télécharger les coordonnées</span>';
        }
    }
    
    // Analytics navigation
    document.getElementById('analyticsButton').addEventListener('click', function() {
        window.location.href = 'analytics.html';
    });
    
    // Documentation navigation
    document.getElementById('documentationButton').addEventListener('click', function() {
        window.location.href = 'documentation.html';
    });
    
    // History navigation
    const historyButton = document.getElementById('historyButton');
    if (historyButton) {
        historyButton.addEventListener('click', function() {
            window.location.href = 'history.html';
        });
    }
    
    // Logout functionality
    const logoutModal = document.getElementById('logoutModal');
    const logoutButton = document.getElementById('logoutButton');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    
    logoutButton.addEventListener('click', function() {
        logoutModal.classList.remove('hidden');
    });
    
    cancelLogout.addEventListener('click', function() {
        logoutModal.classList.add('hidden');
    });
    
    confirmLogout.addEventListener('click', function() {
        logoutModal.classList.add('hidden');
        logout();
    });
    
    // Close modal when clicking outside
    logoutModal.addEventListener('click', function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.add('hidden');
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !logoutModal.classList.contains('hidden')) {
            logoutModal.classList.add('hidden');
        }
    });
}

// Logout function
function logout() {
    // Clear authentication data
    sessionStorage.removeItem('elma_license');
    sessionStorage.removeItem('elma_license_valid');
    sessionStorage.removeItem('elma_login_time');
    
    // Redirect to login page
    window.location.href = 'login.html';
}


// Initialize charts
function initializeCharts() {
    // No charts to initialize - charts removed from sidebar
}

// Update analytics displays
function updateAnalytics() {
    const currentRegion = appData.currentRegion;
    let totalBasins = 0;
    let areaHectares = 0;
    
    // Calculate based on current region
    if (currentRegion === 'segmentation_area' || currentRegion === 'all_regions') {
        // Count basins from segmentation data
        const segmentationData = appData.segmentation_area.segmentationData;
        if (segmentationData && segmentationData.features) {
            // Count Point features (basins are represented by points)
            totalBasins = segmentationData.features.filter(f => f.geometry.type === 'Point').length;
            
            // Calculate total area of all polygons in hectares using precise geodesic calculation
            segmentationData.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    try {
                        const polygon = turf.polygon(feature.geometry.coordinates);
                        const areaInSquareMeters = turf.area(polygon); // Geodesic area in m²
                        areaHectares += areaInSquareMeters / 10000; // Convert m² to hectares
                    } catch (e) {
                        console.warn('Error calculating area for polygon:', e);
                        // Fallback to property value if Turf fails
                        if (feature.properties && feature.properties.area_m2) {
                            areaHectares += feature.properties.area_m2 / 10000;
                        }
                    }
                }
        });
    }
}

    if (currentRegion === 'nappe_berrechid' || currentRegion === 'all_regions') {
        // Add nappe area if selected
        // Approximate area: 2500 km² = 250,000 ha
        if (currentRegion === 'nappe_berrechid') {
            areaHectares = 250000;
            totalBasins = 1; // The nappe itself is one large basin
        }
    }
    
    // Default if no region selected
    if (totalBasins === 0) {
        totalBasins = 76; // Known count of points from segmentation file
        areaHectares = 12000; // Default area
    }
    
    // Update KPI values
    document.getElementById('kpiPlotArea').textContent = formatNumber(Math.round(areaHectares));
    document.getElementById('kpiBasinCount').textContent = totalBasins;
    
    // Update region information
    updateRegionInfo();
}

// Calculate polygon area in hectares using the Shoelace formula
// DEPRECATED: Old shoelace formula (inaccurate for lat/lng coordinates)
// Now using Turf.js geodesic area calculation for precision
// function calculatePolygonArea(coordinates) {
//     if (!coordinates || coordinates.length < 3) return 0;
//     
//     let area = 0;
//     const n = coordinates.length;
//     
//     for (let i = 0; i < n - 1; i++) {
//         const [x1, y1] = coordinates[i];
//         const [x2, y2] = coordinates[i + 1];
//         area += (x1 * y2) - (x2 * y1);
//     }
//     
//     area = Math.abs(area / 2);
//     
//     // Convert from degrees² to hectares (approximate)
//     // 1 degree² ≈ 12,100 km² at equator, but varies with latitude
//     // At 33°N latitude: 1 degree ≈ 93 km
//     // So 1 degree² ≈ 8,649 km² = 864,900 ha
//     const degreesToHectares = 864900;
//     
//     return area * degreesToHectares;
// }

// Switch between regions
function switchRegion(regionKey) {
    appData.currentRegion = regionKey;
    
    // Remove existing region boundary
    if (regionBoundaryLayer) {
        map.removeLayer(regionBoundaryLayer);
    }
    
    // Remove and re-add segmentation layers
    if (basinPolygonsLayer) {
        map.removeLayer(basinPolygonsLayer);
    }
    if (pointsWithSegmentationLayer) {
        map.removeLayer(pointsWithSegmentationLayer);
    }
    if (pointsWithoutSegmentationLayer) {
        map.removeLayer(pointsWithoutSegmentationLayer);
    }
    if (analysisPointsLayer) {
        map.removeLayer(analysisPointsLayer);
    }
    
    // Add new region boundary
    addRegionBoundary();
    
    // Re-add segmentation data if applicable
    addSegmentationData();
    
    // Update map view
    if (regionKey === 'all_regions') {
        // Calculate bounds for all regions
        const allBounds = [];
        const regions = ['segmentation_area', 'nappe_berrechid'];
        
        regions.forEach(region => {
            const regionData = appData[region];
            if (regionData && regionData.boundary) {
                const coordinates = regionData.boundary.coordinates[0].map(coord => [coord[1], coord[0]]);
                allBounds.push(...coordinates);
            }
        });
        
        if (allBounds.length > 0) {
            const bounds = L.latLngBounds(allBounds);
            map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 10
            });
        }
        
        console.log('Switched to all regions view');
    } else {
        // Update map view to specific region
        const currentRegionData = appData[regionKey];
        map.setView(currentRegionData.center, 11);
        console.log('Switched to region:', currentRegionData.name);
    }
    
    // Update analytics and region info display
    updateAnalytics();
    
    // Update visible stats after region switch
    setTimeout(() => {
        updateVisibleStats();
    }, 500);
}

// Update region information display
function updateRegionInfo() {
    const currentRegionKey = appData.currentRegion;
    
    if (currentRegionKey === 'all_regions') {
        // Calculate combined information for all regions
        const regions = ['segmentation_area', 'nappe_berrechid'];
        let totalPopulation = 0;
        let areaText = '';
        
        regions.forEach((regionKey, index) => {
            const regionData = appData[regionKey];
            if (regionData) {
                // Parse population (remove formatting) - skip N/A
                if (regionData.population !== 'N/A') {
                const popValue = parseInt(regionData.population.replace(/\s/g, ''));
                    if (!isNaN(popValue)) {
                totalPopulation += popValue;
                    }
                }
                
                // Combine area information
                if (index > 0) areaText += ' + ';
                areaText += regionData.area;
            }
        });
        
        // Update region name display
        document.getElementById('regionNameDisplay').textContent = 'Zone : Toutes les régions';
        
        // Update display
        document.getElementById('regionArea').textContent = areaText;
        document.getElementById('regionCoords').textContent = 'Vue d\'ensemble';
    } else {
        // Single region view
        const currentRegionData = appData[currentRegionKey];
        
        // Update region name display
        document.getElementById('regionNameDisplay').textContent = `Zone : ${currentRegionData.name}`;
        
        // Update region information in the sidebar
        document.getElementById('regionArea').textContent = currentRegionData.area;
        
        // Update coordinates display (center of region)
        const center = currentRegionData.center;
        const coordText = `${center[0].toFixed(2)}°N, ${Math.abs(center[1]).toFixed(2)}°W`;
        document.getElementById('regionCoords').textContent = coordText;
    }
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
});

// Resize handler for responsive charts
window.addEventListener('resize', function() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
});

// Splitter functionality
function initializeSplitters() {
    const mainGrid = document.querySelector('.main-grid');
    const leftSidebar = document.querySelector('.left-sidebar');
    const rightSidebar = document.querySelector('.right-sidebar');
    const mapContainer = document.querySelector('.map-container');
    const splitters = document.querySelectorAll('.splitter');
    
    if (!mainGrid || !leftSidebar || !rightSidebar || splitters.length === 0) {
        console.error('Splitter elements not found');
        return;
    }
    
    let isDragging = false;
    let currentSplitter = null;
    let startX = 0;
    let startLeftWidth = 0;
    let startRightWidth = 0;

    console.log('Initializing splitters:', splitters.length);
    
    splitters.forEach((splitter, index) => {
        console.log(`Adding event listener to splitter ${index}:`, splitter);
        
        // Remove any existing event listeners to avoid duplicates
        splitter.removeEventListener('mousedown', handleSplitterMouseDown);
        
        // Add the event listener
        splitter.addEventListener('mousedown', handleSplitterMouseDown);
        
        // Ensure splitter is properly styled
        splitter.style.cursor = 'col-resize';
        splitter.title = 'Drag to resize panels';
        splitter.style.backgroundColor = 'var(--color-border)';
        
        // Add hover effect programmatically as backup
        splitter.addEventListener('mouseenter', () => {
            splitter.style.backgroundColor = 'var(--color-primary)';
        });
        
        splitter.addEventListener('mouseleave', () => {
            if (!splitter.classList.contains('dragging')) {
                splitter.style.backgroundColor = 'var(--color-border)';
            }
        });
    });

    function handleSplitterMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Splitter mousedown:', e.target);
        
        isDragging = true;
        currentSplitter = e.target.closest('.splitter');
        startX = e.clientX;
        
        // Get current actual widths in pixels
        startLeftWidth = leftSidebar.offsetWidth;
        startRightWidth = rightSidebar.offsetWidth;
        
        console.log('Starting drag - Left width:', startLeftWidth, 'Right width:', startRightWidth);
        
        // Add dragging class for visual feedback
        mainGrid.classList.add('dragging');
        currentSplitter.classList.add('dragging');
        
        // Add global event listeners
        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp);
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    }

    function handleMouseMove(e) {
        if (!isDragging || !currentSplitter) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const deltaX = e.clientX - startX;
        const containerWidth = mainGrid.offsetWidth;
        const target = currentSplitter.dataset.target;
        
        console.log('Mouse move - deltaX:', deltaX, 'target:', target);
        
        let newLeftWidth, newRightWidth;
        
        if (target === 'left') {
            // Dragging left splitter - adjust left sidebar
            const minLeftWidth = 200;
            const maxLeftWidth = containerWidth - 300 - 250 - 8; // Leave room for map and right sidebar
            
            newLeftWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, startLeftWidth + deltaX));
            newRightWidth = rightSidebar.offsetWidth; // Keep right sidebar same
        } else if (target === 'right') {
            // Dragging right splitter - adjust right sidebar
            const minRightWidth = 250;
            const maxRightWidth = containerWidth - 300 - 200 - 8; // Leave room for map and left sidebar
            
            newRightWidth = Math.max(minRightWidth, Math.min(maxRightWidth, startRightWidth - deltaX));
            newLeftWidth = leftSidebar.offsetWidth; // Keep left sidebar same
        }
        
        // Calculate map width as remaining space
        const newMapWidth = containerWidth - newLeftWidth - newRightWidth - 8; // 8px for splitters
        
        // Only update if map width is reasonable
        if (newMapWidth >= 300) {
            // Update grid template columns
            const newGridTemplate = `${newLeftWidth}px 4px ${newMapWidth}px 4px ${newRightWidth}px`;
            console.log('Updating grid template:', newGridTemplate);
            mainGrid.style.gridTemplateColumns = newGridTemplate;
            
            // Trigger map resize
            if (typeof map !== 'undefined' && map) {
                requestAnimationFrame(() => {
                    map.invalidateSize();
                });
            }
            
            // Trigger chart resize
            if (typeof charts !== 'undefined') {
                Object.values(charts).forEach(chart => {
                    if (chart && chart.resize) {
                        requestAnimationFrame(() => {
                            chart.resize();
                        });
                    }
                });
            }
        } else {
            console.warn('Map width too small:', newMapWidth);
        }
    }

    function handleMouseUp(e) {
        if (!isDragging) return;
        
        console.log('Mouse up - ending drag');
        
        isDragging = false;
        
        // Remove dragging classes
        mainGrid.classList.remove('dragging');
        if (currentSplitter) {
            currentSplitter.classList.remove('dragging');
        }
        
        // Remove global event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Restore text selection and cursor
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        
        currentSplitter = null;
        
        // Final resize of map and charts
        if (typeof map !== 'undefined' && map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
        
        if (typeof charts !== 'undefined') {
            Object.values(charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        }
    }
    
    // Add a test function to window for debugging
    window.testSplitters = function() {
        console.log('=== Splitter Debug Info ===');
        console.log('Main grid:', mainGrid);
        console.log('Left sidebar:', leftSidebar, 'Width:', leftSidebar?.offsetWidth);
        console.log('Right sidebar:', rightSidebar, 'Width:', rightSidebar?.offsetWidth);
        console.log('Splitters found:', splitters.length);
        splitters.forEach((s, i) => {
            console.log(`Splitter ${i}:`, s, 'Target:', s.dataset.target);
        });
        console.log('Current grid template:', mainGrid?.style.gridTemplateColumns || 'default');
        console.log('========================');
    };
    
    // Call test function after a short delay
    setTimeout(() => {
        if (window.testSplitters) window.testSplitters();
    }, 500);
}