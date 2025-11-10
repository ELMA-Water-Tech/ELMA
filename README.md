# AquaDetect Platform

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)

**AquaDetect** is an advanced satellite-based water resource detection and management platform for monitoring, analyzing, and managing water retention basins and groundwater in the Berrechid region, Morocco.

## 🌟 Features

- 🗺️ **Interactive Mapping** - Leaflet.js-powered interactive maps with satellite imagery
- 📊 **Real-time KPIs** - Dynamic tracking of surface area, basin count, and evolution
- 🔍 **Region Selection** - Navigate between different study zones
- 📈 **Advanced Analytics** - Detailed graphs on precipitation, piezometry, and trends
- 📍 **Lambert Coordinates** - Morocco Conformal Conic projection system (EPSG:26191)
- 👁️ **Layer Control** - Selective display of segmentations and basins
- 🎓 **Onboarding Guide** - Clean Apple-style tutorial for first-time users
- 🔐 **Secure Access** - License-based authentication system

## 📁 Project Structure

```
aquadetect-platform/
├── index.html              # Main dashboard page
├── login.html              # Authentication page
├── analytics.html          # Advanced analytics page
├── documentation.html      # User documentation
│
├── assets/                 # Static assets
│   └── images/
│       └── bg.jpg         # Background image
│
├── css/                   # Stylesheets
│   ├── style.css         # Main application styles
│   ├── login.css         # Login page styles
│   ├── analytics.css     # Analytics page styles
│   └── onboarding.css    # Onboarding guide styles
│
├── js/                    # JavaScript modules
│   ├── app.js            # Main application logic
│   ├── login.js          # Authentication logic
│   ├── analytics.js      # Analytics charts and data
│   └── onboarding.js     # Interactive onboarding guide
│
├── data/                  # Data files
│   ├── geojson/          # Geographic data
│   │   ├── segmentation_analysis.geojson
│   │   ├── bassin.geojson
│   │   ├── demoarea.geojson
│   │   └── water_points.geojson
│   ├── csv/              # Tabular data
│   │   └── nappeBerrechid.csv
│   └── shapefiles/       # ESRI shapefiles
│       ├── bassin.shp
│       └── bassin.shx
│
├── docs/                  # Documentation
│   └── ONBOARDING_README.md
│
├── notebooks/            # Jupyter notebooks
│   └── converter.ipynb
│
├── deploy.py             # Deployment script
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server (for local development)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd aquadetect-platform
```

2. Start a local web server:
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server -p 8000
```

3. Open your browser:
```
http://localhost:8000/login.html
```

### Default License Code

```
ABH2025-C8N-MG3-2P9-XY
```

## 🛠️ Technologies

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Mapping**: Leaflet.js 1.9.4
- **Charts**: Chart.js
- **Geospatial**: Turf.js, Proj4js
- **Data Formats**: GeoJSON, CSV, Shapefiles

## 📊 Data Sources

- **Segmentation Analysis**: Satellite imagery analysis results
- **Basin Detection**: AI-powered water basin identification
- **Piezometry**: Groundwater level measurements
- **Precipitation**: Historical rainfall data

## 🎨 Design Philosophy

AquaDetect follows Apple's Human Interface Guidelines:
- Clean, minimal design
- Intuitive navigation
- Professional typography
- Subtle animations
- High contrast and readability

## 📱 Responsive Design

The platform is optimized for:
- Desktop (1920x1080+)
- Laptop (1366x768+)
- Tablet (768px+)

## 🔒 Security

- License-based authentication
- Session management (24-hour validity)
- Automatic logout on session expiration
- Secure data transmission

## 📈 KPI Calculations

### Superficie (Hectares)
Uses Turf.js geodesic area calculation for precision:
```javascript
const polygon = turf.polygon(coordinates);
const areaInM2 = turf.area(polygon);
const areaInHa = areaInM2 / 10000;
```

### Visible Statistics
Real-time updates based on map viewport:
- Filters features within current bounds
- Recalculates on zoom/pan events
- Point-in-polygon checks

## 🌍 Coordinate Systems

**Display**: Morocco Lambert Conformal Conic (EPSG:26191)
- Projection: Lambert Conformal Conic
- Datum: Merchich
- Units: Meters
- Zone: Morocco

**Storage**: WGS84 (EPSG:4326)
- Standard latitude/longitude format

## 📖 Documentation

- User Guide: `/documentation.html`
- Onboarding README: `/docs/ONBOARDING_README.md`
- API Reference: Contact development team

## 🤝 Contributing

This is a proprietary project. For contributions or questions:
- Email: support@aquadetect.com
- Internal Team: Slack #aquadetect

## 📝 License

© 2025 AquaDetect. All rights reserved.

This is proprietary software. Unauthorized copying, modification, or distribution is strictly prohibited.

## 🔄 Version History

### v0.1.0 (Current)
- ✅ Initial platform release
- ✅ Interactive map with region selection
- ✅ Dynamic KPI calculations
- ✅ Advanced analytics dashboard
- ✅ Onboarding guide system
- ✅ Documentation page
- ✅ Professional project structure

## 📞 Support

For technical support or questions:
- **Email**: support@aquadetect.com
- **Phone**: +212 XXX XXX XXX
- **Hours**: Mon-Fri, 9:00-18:00 (GMT+1)

## 🎯 Roadmap

- [ ] Multi-language support (French, English, Arabic)
- [ ] Mobile app (iOS/Android)
- [ ] Real-time satellite data integration
- [ ] Advanced ML predictions
- [ ] Export reports (PDF, Excel)
- [ ] User role management
- [ ] API for third-party integration

---

**Built with ❤️ for sustainable water resource management**

