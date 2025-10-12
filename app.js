// ELMA Platform - Main Application JavaScript

// Application Data
const appData = {
  berrechid_region: {
    name: "Région de Berrechid",
    center: [33.351177, -7.577820],
    boundary: null, // Will be loaded from GeoJSON
    area: "1200 km²",
    population: "168,687",
    color: "#3b82f6" // Blue
  },
  demo_area: {
    name: "Zone de démonstration",
    center: [33.160, -7.598], // Approximate center
    boundary: null, // Will be loaded from GeoJSON
    area: "850 km²",
    population: "95,000",
    color: "#10b981" // Emerald green
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
    features: [] // Will be loaded from waterPoints/water_points.geojson
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
      total_basins: 1, // Main Berrechid basin
      total_water_points: 9, // Water points detected
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
      high_confidence_detections: 2,
      medium_confidence_detections: 1,
      low_confidence_detections: 0
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
let wellsLayer;
let basinsLayer;
let waterPointsLayer;
let charts = {};
let selectedYear = null; // For year filter (null means all years)

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
    // Load both region boundaries and water points before initializing the map
    Promise.all([
        loadRegionBoundary(),
        loadWaterPoints()
    ]).then(() => {
        initializeMap();
        initializeEventListeners();
        initializeCharts();
        updateAnalytics();
        initializeSplitters();
    });
}

// Update date and time display
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR', options);
}

// Load region boundaries from GeoJSON files
async function loadRegionBoundary() {
    try {
        // Load Berrechid region
        await loadSpecificRegion('berrechid_region', 'regions/bassin.geojson', true);
        
        // Load Demo area
        await loadSpecificRegion('demo_area', 'regions/demoarea.geojson', false);
        
        console.log('All region boundaries loaded successfully');
    } catch (error) {
        console.error('Error loading region boundaries:', error);
        // Fallback to original rectangle for Berrechid if loading fails
        appData.berrechid_region.boundary = {
            type: "Polygon",
            coordinates: [[
                [-7.65, 33.20],
                [-7.45, 33.20], 
                [-7.45, 33.40],
                [-7.65, 33.40],
                [-7.65, 33.20]
            ]]
        };
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

// Load water points from GeoJSON file
async function loadWaterPoints() {
    try {
        const response = await fetch('waterPoints/water_points.geojson');
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

// Initialize Leaflet map
function initializeMap() {
    // Initialize map
    map = L.map('map').setView(appData.berrechid_region.center, 11);
    
    // Add Esri World Imagery tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
    }).addTo(map);
    
    // Add region boundary
    addRegionBoundary();
    
    // Add wells, basins, and water points
    addWells();
    addBasins();
    addWaterPoints();
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
    const regions = ['berrechid_region', 'demo_area'];
    
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
                    <span class=\"label\">Population :</span>
                    <span class=\"value\">${regionData.population}</span>
                </div>
                <div class=\"popup-detail\">
                    <span class=\"label\">Puits :</span>
                    <span class=\"value\">${appData.analytics.region_summary.total_wells}</span>
                </div>
                <div class=\"popup-detail\">
                    <span class=\"label\">Type :</span>
                    <span class=\"value\">${regionKey === 'berrechid_region' ? 'Nappe de Berrechid' : 'Zone d\'étude'}</span>
                </div>
            </div>
        </div>
    `;
}

function addWells() {
    wellsLayer = L.featureGroup().addTo(map);
    
    appData.wells.features.forEach(well => {
        const coords = [well.geometry.coordinates[1], well.geometry.coordinates[0]];
        const props = well.properties;
        
        const marker = L.circleMarker(coords, {
            radius: 8,
            fillColor: props.status === 'active' ? '#3b82f6' : '#ef4444',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
        });
        
        marker.bindPopup(createWellPopup(props));
        
        marker.on('click', function() {
            map.setView(coords, 14);
        });
        
        wellsLayer.addLayer(marker);
    });
}

function addWaterPoints() {
    waterPointsLayer = L.featureGroup().addTo(map);
    
    appData.waterPoints.features.forEach(point => {
        const coords = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
        const props = point.properties;
        
        // All water points use the same color (emerald green for retention basins)
        const markerColor = '#10b981'; // Emerald green for retention basins
        
        const marker = L.circleMarker(coords, {
            radius: 6,
            fillColor: markerColor,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        marker.bindPopup(createWaterPointPopup(props));
        
        marker.on('click', function() {
            map.setView(coords, 15);
        });
        
        waterPointsLayer.addLayer(marker);
    });
}

function addBasins() {
    basinsLayer = L.featureGroup().addTo(map);
    
    // The main basin is represented by the region boundary itself
    // We can add additional basin-specific styling or data if needed in the future
    
    // For now, the basin layer group exists but the actual basin area
    // is represented by the region boundary with different styling
}

function createWellPopup(props) {
    return `
        <div class="popup-content">
            <div class="popup-header">Puits ${props.id.toUpperCase()}</div>
            <div class="popup-details">
                <div class="popup-detail">
                    <span class="label">Statut :</span>
                    <span class="value">
                        <span class="status-badge ${props.status}">${props.status === 'active' ? 'ACTIF' : 'INACTIF'}</span>
                    </span>
                </div>
                <div class="popup-detail">
                    <span class="label">Profondeur :</span>
                    <span class="value">${props.depth}m</span>
                </div>
                <div class="popup-detail">
                    <span class="label">Niveau d'eau :</span>
                    <span class="value">${props.water_level}m</span>
                </div>
                <div class="popup-detail">
                    <span class="label">Qualité :</span>
                    <span class="value">
                        <span class="quality-badge ${props.quality}">${props.quality === 'good' ? 'BONNE' : props.quality === 'moderate' ? 'MOYENNE' : 'MAUVAISE'}</span>
                    </span>
                </div>
                <div class="popup-detail">
                    <span class="label">Confiance :</span>
                    <span class="value">${(props.detection_confidence * 100).toFixed(0)}%</span>
                </div>
                <div class="popup-detail">
                    <span class="label">Dernière mise à jour :</span>
                    <span class="value">${formatDate(props.last_updated)}</span>
                </div>
            </div>
        </div>
    `;
}

// Basin popup removed - basin is represented by region boundary only

function createWaterPointPopup(props) {
    const typeLabel = props.type === 'retention_basin' ? 'Bassin de rétention' : 'Station de lavage';
    
    return `
        <div class="popup-content">
            <div class="popup-header">${props.name}</div>
            <div class="popup-details">
                <div class="popup-detail">
                    <span class="label">Type :</span>
                    <span class="value">${typeLabel}</span>
                </div>
                <div class="popup-detail">
                    <span class="label">Région :</span>
                    <span class="value">${props.region}</span>
                </div>
                ${props.capacity ? `
                <div class="popup-detail">
                    <span class="label">Capacité :</span>
                    <span class="value">${props.capacity} m³</span>
                </div>` : ''}
                ${props.status ? `
                <div class="popup-detail">
                    <span class="label">Statut :</span>
                    <span class="value">
                        <span class="status-badge ${props.status}">${props.status === 'active' ? 'ACTIF' : 'INACTIF'}</span>
                    </span>
                </div>` : ''}
                <div class="popup-detail">
                    <span class="label">Coordonnées :</span>
                    <span class="value">${props.coordinates}</span>
                </div>
            </div>
        </div>
    `;
}

// Initialize event listeners
function initializeEventListeners() {
    // Region selector
    document.getElementById('regionSelector').addEventListener('change', function() {
        switchRegion(this.value);
    });
    
    // Layer toggles - basin toggle controls all water features
    document.getElementById('showBasins').addEventListener('change', function() {
        if (this.checked) {
            // Show all water-related layers
            if (basinsLayer) map.addLayer(basinsLayer);
            if (wellsLayer) map.addLayer(wellsLayer);
            if (waterPointsLayer) map.addLayer(waterPointsLayer);
        } else {
            // Hide all water-related layers
            if (basinsLayer) map.removeLayer(basinsLayer);
            if (wellsLayer) map.removeLayer(wellsLayer);
            if (waterPointsLayer) map.removeLayer(waterPointsLayer);
        }
    });
    
    // Year filter slider (compact version in map header)
    const yearSlider = document.getElementById('yearSlider');
    const yearValue = document.getElementById('yearValue');
    
    // Initialize to show all years
    yearValue.textContent = 'Toutes';
    selectedYear = null;
    
    yearSlider.addEventListener('input', function() {
        const sliderValue = parseInt(this.value);
        // If slider is at max position, show all years
        if (sliderValue === parseInt(this.max)) {
            selectedYear = null;
            yearValue.textContent = 'Toutes';
        } else {
            selectedYear = sliderValue;
            yearValue.textContent = selectedYear;
        }
        const sourceType = document.getElementById('waterSourceFilter').value;
        filterWaterSources(sourceType);
        updateFilterResult(sourceType);
    });
    
    // Double-click on year value to reset to all years
    yearValue.addEventListener('dblclick', function() {
        selectedYear = null;
        yearValue.textContent = 'Toutes';
        yearSlider.value = yearSlider.max;
        const sourceType = document.getElementById('waterSourceFilter').value;
        filterWaterSources(sourceType);
        updateFilterResult(sourceType);
    });
    
    // Water source filter
    document.getElementById('waterSourceFilter').addEventListener('change', function() {
        filterWaterSources(this.value);
        updateFilterResult(this.value);
    });
    
    // Map controls
    document.getElementById('resetMapView').addEventListener('click', function() {
        const currentRegionData = appData[appData.currentRegion];
        map.setView(currentRegionData.center, 11);
    });
    
    document.getElementById('toggleLegend').addEventListener('click', function() {
        const legend = document.getElementById('mapLegend');
        legend.classList.toggle('hidden');
    });
    
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

function filterWaterSources(sourceType) {
    // Clear all layers
    wellsLayer.clearLayers();
    basinsLayer.clearLayers();
    waterPointsLayer.clearLayers();
    
    // Get current year filter value
    const yearSlider = document.getElementById('yearSlider');
    const currentYearFilter = selectedYear; // selectedYear is defined in initializeEventListeners
    
    // Show/hide layers based on filter
    if (sourceType === 'all' || sourceType === 'wells') {
        appData.wells.features.forEach(well => {
            const coords = [well.geometry.coordinates[1], well.geometry.coordinates[0]];
            const props = well.properties;
            
            // Apply year filter if set
            if (currentYearFilter !== null && props.year && props.year !== currentYearFilter) {
                return; // Skip this well
            }
            
            const marker = L.circleMarker(coords, {
                radius: 8,
                fillColor: props.status === 'active' ? '#3b82f6' : '#ef4444',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });
            
            marker.bindPopup(createWellPopup(props));
            marker.on('click', function() {
                map.setView(coords, 14);
            });
            
            wellsLayer.addLayer(marker);
        });
    }
    
    // Basin is represented by the region boundary itself, not individual markers
    if (sourceType === 'all' || sourceType === 'basins') {
        // Basin boundary is already shown via the region polygon
        // No additional markers needed
    }
    
    if (sourceType === 'all' || sourceType === 'retention_basins') {
        const filteredWaterPoints = sourceType === 'all' ? 
            appData.waterPoints.features : 
            appData.waterPoints.features.filter(point => {
                return point.properties.type === 'retention_basin';
            });
        
        filteredWaterPoints.forEach(point => {
            const coords = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
            const props = point.properties;
            
            // Apply year filter if set
            if (currentYearFilter !== null && props.year && props.year !== currentYearFilter) {
                return; // Skip this water point
            }
            
            const markerColor = '#10b981'; // Emerald green for all retention basins
            
            const marker = L.circleMarker(coords, {
                radius: 6,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            marker.bindPopup(createWaterPointPopup(props));
            marker.on('click', function() {
                map.setView(coords, 15);
            });
            
            waterPointsLayer.addLayer(marker);
        });
    }
}

function updateFilterResult(sourceType) {
    const filterResultElement = document.getElementById('filterResult');
    let resultText = '';
    let count = 0;
    
    // Apply year filter to counts if set
    const applyYearFilter = (items) => {
        if (selectedYear === null) return items;
        return items.filter(item => item.properties.year === selectedYear);
    };
    
    switch(sourceType) {
        case 'all':
            const filteredWells = applyYearFilter(appData.wells.features);
            const filteredWaterPoints = applyYearFilter(appData.waterPoints.features);
            count = filteredWells.length + 1 + filteredWaterPoints.length;
            resultText = `Affichage de ${count} sources d'eau`;
            if (selectedYear !== null) {
                resultText += ` (${selectedYear})`;
            }
            break;
        case 'wells':
            count = applyYearFilter(appData.wells.features).length;
            resultText = `Affichage de ${count} puits`;
            if (selectedYear !== null) {
                resultText += ` (${selectedYear})`;
            }
            break;
        case 'basins':
            count = 1;
            resultText = `Affichage du bassin principal`;
            break;
        case 'retention_basins':
            count = applyYearFilter(appData.waterPoints.features.filter(p => p.properties.type === 'retention_basin')).length;
            resultText = `Affichage de ${count} bassins de rétention`;
            if (selectedYear !== null) {
                resultText += ` (${selectedYear})`;
            }
            break;
    }
    
    filterResultElement.textContent = resultText;
}

// Initialize charts
function initializeCharts() {
    createWellStatusChart();
    createBasinLevelsChart();
    createConfidenceChart();
}

function createWellStatusChart() {
    const ctx = document.getElementById('wellStatusChart').getContext('2d');
    
    charts.wellStatus = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Bassins déclarés', 'Bassins non déclarés'],
            datasets: [{
                data: [
                    appData.analytics.region_summary.active_wells,
                    appData.analytics.region_summary.inactive_wells
                ],
                backgroundColor: ['#3b82f6', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function createBasinLevelsChart() {
    const ctx = document.getElementById('basinLevelsChart').getContext('2d');
    
    // Show water level indicators for the main Berrechid basin
    const indicators = ['Niveau actuel', 'Capacité utilisée', 'Réserve'];
    const values = [65, 45, 35]; // Sample values for demonstration
    
    charts.basinLevels = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: indicators,
            datasets: [{
                label: "Niveau (%)",
                data: values,
                backgroundColor: ['#3b82f6', '#2563eb', '#1d4ed8']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function createConfidenceChart() {
    const ctx = document.getElementById('confidenceChart').getContext('2d');
    
    charts.confidence = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Élevée (>90%)', 'Moyenne (70-90%)', 'Faible (<70%)'],
            datasets: [{
                label: 'Détections',
                data: [
                    appData.analytics.detection_stats.high_confidence_detections,
                    appData.analytics.detection_stats.medium_confidence_detections,
                    appData.analytics.detection_stats.low_confidence_detections
                ],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

// Update analytics displays
function updateAnalytics() {
    const summary = appData.analytics.region_summary;
    
    // Update KPI values
    document.getElementById('kpiTotalWells').textContent = summary.total_wells;
    document.getElementById('kpiActiveWells').textContent = summary.active_wells;
    document.getElementById('kpiTotalCapacity').textContent = `1,200`; // Basin area in km²
    document.getElementById('kpiAvgLevel').textContent = `${Math.round(appData.analytics.detection_stats.avg_confidence * 100)}%`;
    
    // Update summary stats in left sidebar
    document.getElementById('totalWells').textContent = summary.total_wells;
    document.getElementById('totalBasins').textContent = summary.total_basins;
    document.getElementById('totalWaterPoints').textContent = appData.waterPoints.features.length;
    document.getElementById('avgConfidence').textContent = `${Math.round(appData.analytics.detection_stats.avg_confidence * 100)}%`;
    
    // Update region information
    updateRegionInfo();
    
    // Initialize filter result text
    updateFilterResult('all');
}

// Switch between regions
function switchRegion(regionKey) {
    appData.currentRegion = regionKey;
    
    // Remove existing region boundary
    if (regionBoundaryLayer) {
        map.removeLayer(regionBoundaryLayer);
    }
    
    // Add new region boundary
    addRegionBoundary();
    
    // Update map view
    if (regionKey === 'all_regions') {
        // Calculate bounds for all regions
        const allBounds = [];
        const regions = ['berrechid_region', 'demo_area'];
        
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
    
    // Update region info display
    updateRegionInfo();
}

// Update region information display
function updateRegionInfo() {
    const currentRegionKey = appData.currentRegion;
    
    if (currentRegionKey === 'all_regions') {
        // Calculate combined information for all regions
        const regions = ['berrechid_region', 'demo_area'];
        let totalPopulation = 0;
        let areaText = '';
        
        regions.forEach((regionKey, index) => {
            const regionData = appData[regionKey];
            if (regionData) {
                // Parse population (remove formatting)
                const popValue = parseInt(regionData.population.replace(/\s/g, ''));
                totalPopulation += popValue;
                
                // Combine area information
                if (index > 0) areaText += ' + ';
                areaText += regionData.area;
            }
        });
        
        // Update display
        document.getElementById('regionArea').textContent = areaText;
        document.getElementById('regionPopulation').textContent = totalPopulation.toLocaleString('fr-FR') + ' habitants';
        document.getElementById('regionCoords').textContent = 'Vue d\'ensemble';
    } else {
        // Single region view
        const currentRegionData = appData[currentRegionKey];
        
        // Update region information in the sidebar
        document.getElementById('regionArea').textContent = currentRegionData.area;
        document.getElementById('regionPopulation').textContent = currentRegionData.population;
        
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
    
    let isDragging = false;
    let currentSplitter = null;
    let startX = 0;
    let startLeftWidth = 0;
    let startRightWidth = 0;

    splitters.forEach(splitter => {
        splitter.addEventListener('mousedown', handleSplitterMouseDown);
    });

    function handleSplitterMouseDown(e) {
        e.preventDefault();
        isDragging = true;
        currentSplitter = e.target;
        startX = e.clientX;
        
        // Get current actual widths in pixels
        startLeftWidth = leftSidebar.offsetWidth;
        startRightWidth = rightSidebar.offsetWidth;
        
        // Add dragging class for visual feedback
        mainGrid.classList.add('dragging');
        currentSplitter.classList.add('dragging');
        
        // Add global event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
    }

    function handleMouseMove(e) {
        if (!isDragging || !currentSplitter) return;
        
        e.preventDefault();
        const deltaX = e.clientX - startX;
        const containerWidth = mainGrid.offsetWidth;
        const target = currentSplitter.dataset.target;
        
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
            mainGrid.style.gridTemplateColumns = `${newLeftWidth}px 4px ${newMapWidth}px 4px ${newRightWidth}px`;
            
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
                        chart.resize();
                    }
                });
            }
        }
    }

    function handleMouseUp(e) {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Remove dragging classes
        mainGrid.classList.remove('dragging');
        if (currentSplitter) {
            currentSplitter.classList.remove('dragging');
        }
        
        // Remove global event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Restore text selection
        document.body.style.userSelect = '';
        
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
}