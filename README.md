# Lumina | Mental Health Analytics Dashboard

Lumina is a professional data visualization platform designed to explore and analyze risk factors associated with student depression. The application provides interactive tools to transform complex datasets into actionable insights for educators and mental health professionals.

## Project Objectives

The platform focuses on three primary analytical pillars:

* **Global Exploration:** Identification of demographic and geographic trends within student populations.
* **Profiling and Clustering:** Utilizing dimensionality reduction algorithms (PCA, t-SNE, UMAP) to group students with similar behavioral patterns.
* **Comparative Analysis:** Benchmarking individual or group data against global averages to identify outliers.

## Technical Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **Data Visualization:** D3.js v7 for dynamic charting, mapping, and interactive SVG rendering.
* **Machine Learning:** * TensorFlow.js for client-side statistical processing.
* UMAP-JS for non-linear dimensionality reduction.


* **Mapping:** TopoJSON and D3-geo for geographic data visualization.

## Project Structure

```text
├── index.html              # Main Dashboard (Overview)
├── profils.html            # Clustering and individual profile analysis
├── css/
│   ├── style.css           # Global styles and variables
│   ├── style_dash.css      # Dashboard layout and KPI styling
│   └── profiling.css       # Specific styles for clustering visualizations
├── js/
│   ├── main.js             # Data loading and application initialization
│   ├── utils.js            # Formatter and statistical utility functions
│   ├── dashboard.js        # Logic for the overview page
│   ├── profile.js          # Logic for the clustering page
│   ├── charts_dash/        # D3.js components for the Dashboard
│   │   ├── indiaMap.js
│   │   ├── pieChart.js
│   │   └── multiBarChart.js
│   └── charts/             # D3.js components for Profiling
│       ├── clustering.js
│       ├── radarChart.js
│       └── outliers.js
└── package.json            # Project dependencies and scripts

```

## Installation and Deployment

The project uses JavaScript modules and requires a local server environment to handle data requests via Fetch API.

1. **Clone the repository**:
```bash
git clone https://github.com/your-account/lumina-dashboard.git

```


2. **Install dependencies**:
```bash
npm install

```


3. **Start the development server**:
```bash
npm start

```


4. **View the application**:
Open your browser and navigate to `http://localhost:8080`.

## Core Features

* **Synchronized Filtering:** A global sidebar allows users to filter by Gender, City, and Education Level, updating all charts in real-time.
* **Automated Insights:** Dynamic generation of text summaries highlighting correlations and identified risks within the current selection.
* **Interactive Projections:** Toggle between different clustering algorithms to view high-dimensional data in 2D or 3D spaces.
* **Export Capability:** Tools to export specific charts or generate a comprehensive PDF report for offline analysis.

## License

This project is licensed under the MIT License.

---
