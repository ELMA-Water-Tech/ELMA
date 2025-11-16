// AquaDetect - Historical Basins Visualization

(function() {
    'use strict';

    let basinData = [];
    let currentYear = 2017;
    let isPlaying = false;
    let playInterval = null;
    let svgWidth, svgHeight;
    let minYear = 2017;
    let maxYear = 2025;
    
    // Year colors (different color per year)
    const yearColors = {
        2017: '#FF9500', // Orange
        2018: '#FFCC00', // Yellow
        2019: '#34C759', // Green
        2020: '#00C7BE', // Teal
        2021: '#30B0C7', // Light Blue
        2022: '#007AFF', // Blue
        2023: '#5856D6', // Purple
        2024: '#AF52DE', // Purple-Pink
        2025: '#FF2D55'  // Pink
    };

    // Initialize the visualization
    function initHistoryVisualization() {
        const historyButton = document.getElementById('historyButton');
        const closeButton = document.getElementById('closeHistoryModal');
        const modal = document.getElementById('historyModal');
        const slider = document.getElementById('yearSlider');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (!historyButton || !modal) {
            console.error('History visualization elements not found');
            return;
        }

        // Open modal
        historyButton.addEventListener('click', function() {
            openHistoryModal();
        });

        // Close modal
        closeButton.addEventListener('click', function() {
            closeHistoryModal();
        });

        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeHistoryModal();
            }
        });

        // Slider change
        slider.addEventListener('input', function() {
            currentYear = parseInt(this.value);
            updateVisualization();
        });

        // Play/Pause button
        playPauseBtn.addEventListener('click', function() {
            togglePlayPause();
        });

        // Reset button
        resetBtn.addEventListener('click', function() {
            resetVisualization();
        });

        // Window resize
        window.addEventListener('resize', function() {
            if (!modal.classList.contains('hidden')) {
                resizeVisualization();
            }
        });

        createYearMarkers();
    }

    function openHistoryModal() {
        const modal = document.getElementById('historyModal');
        modal.classList.remove('hidden');
        
        // Load data and initialize visualization
        loadBasinData().then(() => {
            initializeSVG();
            updateVisualization();
        });
    }

    function closeHistoryModal() {
        const modal = document.getElementById('historyModal');
        modal.classList.add('hidden');
        stopAnimation();
    }

    async function loadBasinData() {
        try {
            basinData = [];
            
            // Load data for each year
            const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
            const loadPromises = years.map(year => 
                fetch(`data/geojson/demo_berrechid_by_years/demo_berrechid_${year}.geojson`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to load data for year ${year}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Extract point features
                        const yearBasins = data.features
                            .filter(f => f.geometry.type === 'Point')
                            .map(f => ({
                                id: f.id || `${year}-${f.geometry.coordinates.join(',')}`,
                                x: f.geometry.coordinates[0],
                                y: f.geometry.coordinates[1],
                                year: parseInt(f.properties.year) || year,
                                count: f.properties.count || 1,
                                properties: f.properties
                            }));
                        
                        basinData.push(...yearBasins);
                        console.log(`Loaded ${yearBasins.length} basins for year ${year}`);
                    })
                    .catch(error => {
                        console.warn(`Error loading year ${year}:`, error);
                    })
            );

            // Wait for all years to load
            await Promise.all(loadPromises);

            // Update slider
            const slider = document.getElementById('yearSlider');
            slider.min = minYear;
            slider.max = maxYear;
            slider.value = minYear;

            console.log(`Total loaded: ${basinData.length} basin points from ${minYear} to ${maxYear}`);
            createLegend();
        } catch (error) {
            console.error('Error loading basin data:', error);
        }
    }

    function initializeSVG() {
        const svg = document.getElementById('historyVisualization');
        const container = svg.parentElement;
        
        // Account for controls on left (60px + 16px gap) and legend on right (120px + 16px gap)
        svgWidth = container.clientWidth - 212;
        svgHeight = 320; // Fixed height to match CSS
        
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    }

    function resizeVisualization() {
        initializeSVG();
        updateVisualization();
    }

    function updateVisualization() {
        const svg = document.getElementById('historyVisualization');
        
        // Clear existing content
        svg.innerHTML = '';

        // Filter basins up to current year
        const visibleBasins = basinData.filter(b => b.year <= currentYear);
        const newBasins = basinData.filter(b => b.year === currentYear);

        // Update stats
        document.getElementById('currentYearDisplay').textContent = currentYear;
        document.getElementById('visibleBasinsCount').textContent = visibleBasins.length;
        document.getElementById('newBasinsCount').textContent = newBasins.length;

        if (visibleBasins.length === 0) {
            // Show empty state
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', svgWidth / 2);
            text.setAttribute('y', svgHeight / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#86868b');
            text.setAttribute('font-size', '16');
            text.textContent = 'Aucun bassin détecté pour cette période';
            svg.appendChild(text);
            return;
        }

        // Calculate bounds for scaling
        const xCoords = visibleBasins.map(b => b.x);
        const yCoords = visibleBasins.map(b => b.y);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        // Add padding
        const padding = 40;
        const xRange = maxX - minX;
        const yRange = maxY - minY;
        
        // Use independent scales for better space utilization
        const xScale = (svgWidth - 2 * padding) / xRange;
        const yScale = (svgHeight - 2 * padding) / yRange;

        // Helper function to transform coordinates
        const transformX = (x) => padding + (x - minX) * xScale;
        const transformY = (y) => svgHeight - (padding + (y - minY) * yScale); // Invert Y axis

        // Draw grid
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('class', 'grid');
        
        // Vertical grid lines (5 lines)
        for (let i = 0; i <= 4; i++) {
            const x = padding + (i / 4) * (svgWidth - 2 * padding);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x);
            line.setAttribute('y1', padding);
            line.setAttribute('x2', x);
            line.setAttribute('y2', svgHeight - padding);
            line.setAttribute('stroke', '#e5e5e7');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '4 4');
            gridGroup.appendChild(line);
        }
        
        // Horizontal grid lines (5 lines)
        for (let i = 0; i <= 4; i++) {
            const y = padding + (i / 4) * (svgHeight - 2 * padding);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', padding);
            line.setAttribute('y1', y);
            line.setAttribute('x2', svgWidth - padding);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#e5e5e7');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('stroke-dasharray', '4 4');
            gridGroup.appendChild(line);
        }
        
        svg.appendChild(gridGroup);

        // Draw basins
        visibleBasins.forEach(basin => {
            const cx = transformX(basin.x);
            const cy = transformY(basin.y);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', 5);
            circle.setAttribute('fill', yearColors[basin.year] || '#86868b');
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', 1.5);
            circle.setAttribute('class', 'basin-point');
            
            // Add animation for new basins
            if (basin.year === currentYear) {
                circle.classList.add('basin-point-new');
            }

            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `Bassin #${basin.id}\nAnnée: ${basin.year}`;
            circle.appendChild(title);

            svg.appendChild(circle);
        });
    }

    function createLegend() {
        const legendContainer = document.getElementById('historyLegend');
        legendContainer.innerHTML = '';

        const years = Object.keys(yearColors).map(Number).filter(y => y >= minYear && y <= maxYear);
        
        years.forEach(year => {
            const item = document.createElement('div');
            item.className = 'history-legend-item';

            const symbol = document.createElement('div');
            symbol.className = 'history-legend-symbol';
            symbol.style.backgroundColor = yearColors[year];

            const label = document.createElement('span');
            label.className = 'history-legend-label';
            label.textContent = year;

            item.appendChild(symbol);
            item.appendChild(label);
            legendContainer.appendChild(item);
        });
    }

    function createYearMarkers() {
        const markerContainer = document.getElementById('yearMarkers');
        markerContainer.innerHTML = '';

        const years = [];
        for (let y = minYear; y <= maxYear; y++) {
            years.push(y);
        }

        years.forEach(year => {
            const marker = document.createElement('div');
            marker.className = 'history-year-marker';
            marker.textContent = year;
            markerContainer.appendChild(marker);
        });
    }

    function togglePlayPause() {
        if (isPlaying) {
            stopAnimation();
        } else {
            startAnimation();
        }
    }

    function startAnimation() {
        isPlaying = true;
        document.getElementById('playIcon').textContent = '⏸️';
        
        playInterval = setInterval(() => {
            if (currentYear < maxYear) {
                currentYear++;
                document.getElementById('yearSlider').value = currentYear;
                updateVisualization();
            } else {
                stopAnimation();
            }
        }, 1000); // 1 second per year
    }

    function stopAnimation() {
        isPlaying = false;
        document.getElementById('playIcon').textContent = '▶️';
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

    function resetVisualization() {
        stopAnimation();
        currentYear = minYear;
        document.getElementById('yearSlider').value = minYear;
        updateVisualization();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHistoryVisualization);
    } else {
        initHistoryVisualization();
    }

})();

