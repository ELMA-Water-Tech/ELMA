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
    let barChart = null;
    let showSingleYear = false; // Toggle between cumulative and single year view
    
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
        const slider = document.getElementById('yearSlider');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const backToMapBtn = document.getElementById('backToMap');
        const logoutButton = document.getElementById('logoutButton');

        if (!slider || !playPauseBtn || !resetBtn) {
            console.error('History visualization elements not found');
            return;
        }

        // Back to map navigation
        if (backToMapBtn) {
            backToMapBtn.addEventListener('click', function() {
                window.location.href = 'index.html';
            });
        }

        // Logout functionality
        if (logoutButton) {
            logoutButton.addEventListener('click', function() {
                const modal = document.getElementById('logoutModal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
            });
        }

        // Logout modal handlers
        const confirmLogout = document.getElementById('confirmLogout');
        const cancelLogout = document.getElementById('cancelLogout');
        
        if (confirmLogout) {
            confirmLogout.addEventListener('click', function() {
                sessionStorage.removeItem('elmaLicenseVerified');
                window.location.href = 'login.html';
            });
        }
        
        if (cancelLogout) {
            cancelLogout.addEventListener('click', function() {
                const modal = document.getElementById('logoutModal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        }

        // Slider change
        slider.addEventListener('input', function() {
            currentYear = parseInt(this.value);
            showSingleYear = false; // Return to cumulative view when using slider
            updateVisualization();
            updateBarChartHighlight();
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
            resizeVisualization();
        });

        // Load zone name
        loadZoneName();
        
        // Update date display
        updateDateTime();
        
        // Load data and initialize visualization
        console.log('Starting to load basin data...');
        loadBasinData().then(() => {
            console.log('Basin data loaded successfully, initializing SVG...');
            // Small delay to ensure DOM is fully rendered and flexbox has calculated dimensions
            setTimeout(() => {
                initializeSVG();
                updateVisualization();
            }, 100);
        }).catch(error => {
            console.error('Failed to load basin data:', error);
        });
    }

    async function loadZoneName() {
        try {
            const response = await fetch('data/geojson/demo_berrechid_by_years/zone_info.txt');
            const text = await response.text();
            
            // Parse "name = Zone Name" format
            const match = text.match(/name\s*=\s*(.+)/i);
            if (match && match[1]) {
                document.getElementById('historyZoneName').textContent = match[1].trim();
            } else {
                document.getElementById('historyZoneName').textContent = 'Périmètre du pilote';
            }
        } catch (error) {
            console.error('Error loading zone name:', error);
            document.getElementById('historyZoneName').textContent = 'Périmètre du pilote';
        }
    }

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
            if (slider) {
                slider.min = minYear;
                slider.max = maxYear;
                slider.value = minYear;
                console.log('Slider updated');
            } else {
                console.error('Slider element not found');
            }

            console.log(`Total loaded: ${basinData.length} basin points from ${minYear} to ${maxYear}`);
            createLegend();
            createYearMarkers();
            initBarChart();
        } catch (error) {
            console.error('Error loading basin data:', error);
        }
    }

    function initializeSVG() {
        const svg = document.getElementById('historyVisualization');
        if (!svg) {
            console.error('SVG element not found');
            return;
        }
        
        const container = svg.parentElement;
        
        // Get the actual rendered dimensions of the SVG (flexbox will size it automatically)
        const rect = svg.getBoundingClientRect();
        svgWidth = rect.width > 0 ? rect.width : 800; // Fallback to 800 if not yet rendered
        svgHeight = rect.height > 0 ? rect.height : 500; // Fallback to 500 if not yet rendered
        
        console.log('Initializing SVG with dimensions:', svgWidth, 'x', svgHeight);
        
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
        if (!svg) {
            console.error('SVG element not found in updateVisualization');
            return;
        }
        
        console.log('Updating visualization for year:', currentYear);
        console.log('Total basin data points:', basinData.length);
        
        // Clear existing content
        svg.innerHTML = '';

        // Filter basins based on view mode
        const visibleBasins = showSingleYear 
            ? basinData.filter(b => b.year === currentYear)  // Single year only
            : basinData.filter(b => b.year <= currentYear);  // Cumulative

        console.log('Visible basins:', visibleBasins.length, 'Mode:', showSingleYear ? 'Single Year' : 'Cumulative');

        // Count basins for the current year only (not cumulative)
        const currentYearBasinCount = basinData.filter(b => b.year === currentYear).length;

        // Update stats
        document.getElementById('currentYearDisplay').textContent = currentYear;
        document.getElementById('visibleBasinsCount').textContent = currentYearBasinCount;

        if (visibleBasins.length === 0) {
            // Show empty state
            console.log('No basins to display');
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', svgWidth / 2);
            text.setAttribute('y', svgHeight / 2);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#86868b');
            text.setAttribute('font-size', '16');
            text.textContent = 'Aucun bassin détecté pour cette période';
            svg.appendChild(text);
            
            // Update bar chart highlight even when no basins
            updateBarChartHighlight();
            return;
        }
        
        console.log('Drawing', visibleBasins.length, 'basins on SVG...');

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

        // Add axis labels
        // X-axis label (bottom center)
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', svgWidth / 2);
        xLabel.setAttribute('y', svgHeight - 10);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('fill', '#86868b');
        xLabel.setAttribute('font-size', '12');
        xLabel.setAttribute('font-weight', '500');
        xLabel.textContent = 'Longitude (X)';
        svg.appendChild(xLabel);

        // Y-axis label (left side, rotated)
        const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabel.setAttribute('x', 15);
        yLabel.setAttribute('y', svgHeight / 2);
        yLabel.setAttribute('text-anchor', 'middle');
        yLabel.setAttribute('fill', '#86868b');
        yLabel.setAttribute('font-size', '12');
        yLabel.setAttribute('font-weight', '500');
        yLabel.setAttribute('transform', `rotate(-90, 15, ${svgHeight / 2})`);
        yLabel.textContent = 'Latitude (Y)';
        svg.appendChild(yLabel);

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

        // Update bar chart highlight
        updateBarChartHighlight();
    }

    function initBarChart() {
        const canvas = document.getElementById('basinsBarChart');
        if (!canvas) {
            console.error('Bar chart canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Count basins per year
        const basinCountsByYear = {};
        for (let year = minYear; year <= maxYear; year++) {
            basinCountsByYear[year] = basinData.filter(b => b.year === year).length;
        }

        const years = Object.keys(basinCountsByYear).map(Number);
        const counts = years.map(year => basinCountsByYear[year]);
        const backgroundColors = years.map(year => yearColors[year]);

        barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Nombre de bassins',
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `Bassins: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 10,
                            color: '#86868b',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            color: '#1d1d1f',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const year = years[index];
                        currentYear = year;
                        showSingleYear = true; // Enable single year view when clicking on bar
                        document.getElementById('yearSlider').value = year;
                        updateVisualization();
                        updateBarChartHighlight();
                    }
                }
            }
        });

        console.log('Bar chart initialized with', years.length, 'years');
        updateBarChartHighlight();
    }

    function updateBarChartHighlight() {
        if (!barChart) return;

        // Update bar styling based on view mode and current year
        const years = barChart.data.labels;
        
        if (showSingleYear) {
            // Single year mode: only selected year is highlighted
            const borderWidths = years.map(year => year === currentYear ? 3 : 1);
            const backgroundColors = years.map(year => {
                const baseColor = yearColors[year];
                return year === currentYear ? baseColor : baseColor + '30'; // Dim all except selected
            });
            barChart.data.datasets[0].backgroundColor = backgroundColors;
            barChart.data.datasets[0].borderWidth = borderWidths;
        } else {
            // Cumulative mode: all years up to current are highlighted
            const borderWidths = years.map(year => year === currentYear ? 3 : 1);
            const backgroundColors = years.map(year => {
                const baseColor = yearColors[year];
                return year <= currentYear ? baseColor : baseColor + '30'; // Dim future years
            });
            barChart.data.datasets[0].backgroundColor = backgroundColors;
            barChart.data.datasets[0].borderWidth = borderWidths;
        }

        barChart.update('none'); // Update without animation
    }

    function createLegend() {
        const legendContainer = document.getElementById('historyLegend');
        if (!legendContainer) {
            console.error('Legend container not found');
            return;
        }
        
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
        
        console.log('Created legend with', years.length, 'years');
    }

    function createYearMarkers() {
        const markerContainer = document.getElementById('yearMarkers');
        if (!markerContainer) {
            console.error('Year markers container not found');
            return;
        }
        
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
        
        console.log('Created year markers from', minYear, 'to', maxYear);
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
        showSingleYear = false; // Return to cumulative view when playing
        
        // Change to pause icon
        const playIcon = document.getElementById('playIcon');
        playIcon.innerHTML = '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>';
        playIcon.style.marginLeft = '0'; // Center pause icon
        
        playInterval = setInterval(() => {
            if (currentYear < maxYear) {
                currentYear++;
                document.getElementById('yearSlider').value = currentYear;
                updateVisualization();
                updateBarChartHighlight();
            } else {
                stopAnimation();
            }
        }, 1000); // 1 second per year
    }

    function stopAnimation() {
        isPlaying = false;
        
        // Change to play icon
        const playIcon = document.getElementById('playIcon');
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        playIcon.style.marginLeft = '1px'; // Optical alignment for play triangle
        
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

    function resetVisualization() {
        stopAnimation();
        currentYear = minYear;
        showSingleYear = false; // Return to cumulative view when resetting
        document.getElementById('yearSlider').value = minYear;
        updateVisualization();
        updateBarChartHighlight();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHistoryVisualization);
    } else {
        initHistoryVisualization();
    }

})();

