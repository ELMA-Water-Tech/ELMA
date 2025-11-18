// AquaDetect Platform - Advanced Analytics

// Authentication check
function checkAuthentication() {
    const isValid = sessionStorage.getItem('elma_license_valid');
    const loginTime = sessionStorage.getItem('elma_login_time');
    const license = sessionStorage.getItem('elma_license');
    
    if (!isValid || !loginTime || !license) {
        return false;
    }
    
    const timeElapsed = Date.now() - parseInt(loginTime);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (timeElapsed >= twentyFourHours) {
        sessionStorage.removeItem('elma_license');
        sessionStorage.removeItem('elma_license_valid');
        sessionStorage.removeItem('elma_login_time');
        return false;
    }
    
    return true;
}

// Global variables
let charts = {};
let currentZone = 'segmentation';
let currentPeriod = {
    start: '2020-01-01',
    end: new Date().toISOString().split('T')[0]
};

// Sample data generator
function generateTimeSeriesData(startDate, endDate, baseValue, variance, trend = 0) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    for (let i = 0; i <= months; i++) {
        const date = new Date(start);
        date.setMonth(date.getMonth() + i);
        
        const seasonalFactor = Math.sin((date.getMonth() / 12) * Math.PI * 2) * variance * 0.3;
        const randomFactor = (Math.random() - 0.5) * variance;
        const trendFactor = (i / months) * trend;
        
        const value = Math.max(0, baseValue + seasonalFactor + randomFactor + trendFactor);
        
        data.push({
            x: date.toISOString().split('T')[0],
            y: Math.round(value * 100) / 100
        });
    }
    
    return data;
}

// Zone-specific data configurations
const zoneConfigs = {
    segmentation: {
        name: 'Périmètre du pilote',
        precipitation: { base: 300, variance: 130, trend: -12 },
        piezometry: { base: 42, variance: 7, trend: -4 },
        temperature: { base: 17.5, variance: 11.5, trend: 1.3 },
        waterLevel: { base: 14, variance: 4.5, trend: -1.8 },
        evaporation: { base: 1750, variance: 290, trend: 45 }
    },
    nappe: {
        name: 'Nappe de Berrechid',
        precipitation: { base: 280, variance: 120, trend: -15 },
        piezometry: { base: 45, variance: 8, trend: -5 },
        temperature: { base: 18, variance: 12, trend: 1.5 },
        waterLevel: { base: 12.5, variance: 4, trend: -2 },
        evaporation: { base: 1800, variance: 300, trend: 50 }
    },
    zone_1: {
        name: 'Zone 1 - Nord',
        precipitation: { base: 350, variance: 150, trend: -8 },
        piezometry: { base: 52, variance: 10, trend: -4 },
        temperature: { base: 16, variance: 10, trend: 1.0 },
        waterLevel: { base: 18, variance: 6, trend: -1 },
        evaporation: { base: 1600, variance: 260, trend: 35 }
    },
    zone_2: {
        name: 'Zone 2 - Sud',
        precipitation: { base: 220, variance: 100, trend: -20 },
        piezometry: { base: 35, variance: 7, trend: -6 },
        temperature: { base: 20, variance: 13, trend: 2.0 },
        waterLevel: { base: 10, variance: 3, trend: -2.5 },
        evaporation: { base: 2000, variance: 350, trend: 60 }
    },
    zone_3: {
        name: 'Zone 3 - Est',
        precipitation: { base: 290, variance: 130, trend: -12 },
        piezometry: { base: 42, variance: 8, trend: -4.5 },
        temperature: { base: 19, variance: 12, trend: 1.6 },
        waterLevel: { base: 14, variance: 4.5, trend: -1.8 },
        evaporation: { base: 1850, variance: 320, trend: 55 }
    },
    zone_4: {
        name: 'Zone 4 - Ouest',
        precipitation: { base: 310, variance: 135, trend: -11 },
        piezometry: { base: 48, variance: 9, trend: -3.5 },
        temperature: { base: 17.5, variance: 11, trend: 1.3 },
        waterLevel: { base: 16, variance: 5, trend: -1.2 },
        evaporation: { base: 1750, variance: 290, trend: 45 }
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }
    
    initializeApp();
});

function initializeApp() {
    updateDateTime();
    
    // Set default end date to today
    document.getElementById('endDate').value = currentPeriod.end;
    
    initializeEventListeners();
    loadZoneData(currentZone);
    initializeCharts();
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

function initializeEventListeners() {
    // Zone selector
    document.getElementById('zoneSelector').addEventListener('change', function() {
        currentZone = this.value;
        loadZoneData(currentZone);
        updateAllCharts();
    });
    
    // Date range
    document.getElementById('startDate').addEventListener('change', function() {
        currentPeriod.start = this.value;
    });
    
    document.getElementById('endDate').addEventListener('change', function() {
        currentPeriod.end = this.value;
    });
    
    // Update button
    document.getElementById('updateCharts').addEventListener('click', function() {
        updateAllCharts();
    });
    
    // Parameter checkboxes
    ['showPrecipitation', 'showPiezometry', 'showTemperature', 'showEvaporation'].forEach(id => {
        document.getElementById(id).addEventListener('change', function() {
            updateChartVisibility();
        });
    });
    
    // Navigation
    document.getElementById('backToMap').addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    
    // Logout
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
        logout();
    });
    
    logoutModal.addEventListener('click', function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.add('hidden');
        }
    });
    
    // Export buttons
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    
    // Trend button
    document.getElementById('showTrendLines').addEventListener('click', toggleTrendLines);
}

function logout() {
    sessionStorage.removeItem('elma_license');
    sessionStorage.removeItem('elma_license_valid');
    sessionStorage.removeItem('elma_login_time');
    window.location.href = 'login.html';
}

function loadZoneData(zone) {
    const config = zoneConfigs[zone];
    if (!config) return;
    
    // Update statistics
    const precipData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end, 
        config.precipitation.base, config.precipitation.variance, config.precipitation.trend);
    const piezoData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.piezometry.base, config.piezometry.variance, config.piezometry.trend);
    
    const avgPrecip = precipData.reduce((sum, d) => sum + d.y, 0) / precipData.length;
    const avgPiezo = piezoData.reduce((sum, d) => sum + d.y, 0) / piezoData.length;
    
    // Calculate trend
    const firstPiezo = piezoData[0].y;
    const lastPiezo = piezoData[piezoData.length - 1].y;
    const trendPercent = ((lastPiezo - firstPiezo) / firstPiezo * 100);
    
    // Calculate recharge rate (simplified)
    const rechargeRate = Math.max(0, Math.min(100, (avgPrecip / 300) * 100));
    
    document.getElementById('avgPrecipitation').textContent = Math.round(avgPrecip);
    document.getElementById('avgPiezometry').textContent = avgPiezo.toFixed(1);
    document.getElementById('waterTrend').textContent = trendPercent.toFixed(1);
    document.getElementById('rechargeRate').textContent = Math.round(rechargeRate);
    
    // Color code the trend
    const trendElement = document.getElementById('waterTrend');
    if (trendPercent < -5) {
        trendElement.style.color = '#ef4444';
    } else if (trendPercent < 0) {
        trendElement.style.color = '#f59e0b';
    } else {
        trendElement.style.color = '#10b981';
    }
}

function initializeCharts() {
    // Precipitation Chart
    const precipCtx = document.getElementById('precipitationChart').getContext('2d');
    charts.precipitation = new Chart(precipCtx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Précipitations (mm)',
                data: [],
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: getTimeSeriesOptions('mm', 'Précipitations annuelles')
    });
    
    // Piezometry Chart
    const piezoCtx = document.getElementById('piezometryChart').getContext('2d');
    charts.piezometry = new Chart(piezoCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Niveau piézométrique (m)',
                data: [],
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    reverse: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'm (profondeur)'
                    }
                }
            }
        }
    });
    
    // Temperature & Evapotranspiration Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    charts.temperature = new Chart(tempCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Température (°C)',
                    data: [],
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Évapotranspiration (mm)',
                    data: [],
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: getDualAxisOptions()
    });
    
    // Trend Analysis Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Précipitations',
                    data: [],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Piézométrie',
                    data: [],
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: getTrendOptions()
    });
    
    updateAllCharts();
}

function getTimeSeriesOptions(unit, title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month',
                    displayFormats: {
                        month: 'MMM yyyy'
                    }
                },
                title: {
                    display: true,
                    text: 'Date'
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: unit
                }
            }
        }
    };
}

function getDualAxisOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Température (°C)'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Évapotranspiration (mm)'
                },
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    };
}

function getTrendOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'year'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Précipitations (mm)'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                reverse: true,
                title: {
                    display: true,
                    text: 'Piézométrie (m)'
                },
                grid: {
                    drawOnChartArea: false
                }
            }
        }
    };
}

function updateAllCharts() {
    const config = zoneConfigs[currentZone];
    if (!config) return;
    
    // Generate data
    const precipData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.precipitation.base, config.precipitation.variance, config.precipitation.trend);
    const piezoData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.piezometry.base, config.piezometry.variance, config.piezometry.trend);
    const tempData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.temperature.base, config.temperature.variance, config.temperature.trend);
    const evapData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.evaporation.base, config.evaporation.variance, config.evaporation.trend);
    
    // Update precipitation chart
    charts.precipitation.data.datasets[0].data = precipData;
    charts.precipitation.update();
    
    // Update piezometry chart
    charts.piezometry.data.datasets[0].data = piezoData;
    charts.piezometry.update();
    
    // Update temperature chart
    charts.temperature.data.datasets[0].data = tempData;
    charts.temperature.data.datasets[1].data = evapData;
    charts.temperature.update();
    
    // Update trend chart
    charts.trend.data.datasets[0].data = precipData;
    charts.trend.data.datasets[1].data = piezoData;
    charts.trend.update();
    
    // Update zone stats
    loadZoneData(currentZone);
}

function updateChartVisibility() {
    // This function can be extended to show/hide specific datasets
    updateAllCharts();
}

function toggleTrendLines() {
    // Toggle trend lines on the trend chart
    const button = document.getElementById('showTrendLines');
    button.textContent = button.textContent.includes('Afficher') ? 
        'Masquer les tendances' : 'Afficher les tendances';
    
    // Add trend line logic here
    console.log('Toggle trend lines');
}

function exportToCSV() {
    const config = zoneConfigs[currentZone];
    const precipData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.precipitation.base, config.precipitation.variance, config.precipitation.trend);
    const piezoData = generateTimeSeriesData(currentPeriod.start, currentPeriod.end,
        config.piezometry.base, config.piezometry.variance, config.piezometry.trend);
    
    let csv = 'Date,Précipitations (mm),Piézométrie (m)\n';
    precipData.forEach((p, i) => {
        csv += `${p.x},${p.y},${piezoData[i].y}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elma_analytics_${currentZone}_${Date.now()}.csv`;
    a.click();
}

function exportToPDF() {
    window.print();
}

