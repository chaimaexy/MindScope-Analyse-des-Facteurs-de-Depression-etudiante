// js/dashboard.js
// Initialisation principale du dashboard

let dashboardState = {
    filteredData: [],
    currentSelection: null,
    filters: {
        gender: 'all',
        city: 'all',
        degree: 'all',
        depression: 'all'
    }
};

async function initDashboard() {
    showLoading(true);
    
    try {
        console.log('Initialisation du dashboard...');
        
        // 1. Charger les données
        const studentData = window.getStudentData();
        console.log('DEBUG: studentData loaded', studentData ? studentData.length : 'null');

        
        // 2. Initialiser l'état
        dashboardState.filteredData = studentData;
        
        // 3. Remplir les filtres
        populateCityFilter(studentData);
        
        // 4. Initialiser les événements
        setupFilterEvents();
        
        // 5. Initialiser les visualisations
        initAllCharts();
        
        // 6. Initialiser les insights
        if (typeof initInsights === 'function') initInsights();
        
        // 7. Mettre à jour tout
        updateAllCharts();
        updateGlobalStats(studentData);
        updateDashboardKPIs(studentData);
        if (typeof updateInsights === 'function') updateInsights();
        
        console.log('✅ Dashboard initialisé avec succès');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du dashboard:', error);
        alert('Erreur lors du chargement du dashboard. Voir la console pour plus de détails.');
    } finally {
        showLoading(false);
    }
}

function updateDashboardKPIs(data) {
    const total = data.length;
    const depressed = data.filter(d => d.depression === 1).length;
    const depressionRate = total > 0 ? (depressed / total * 100).toFixed(1) : 0;
    const avgCGPA = total > 0 ? d3.mean(data, d => d.cgpa).toFixed(2) : 0;
    const avgSatisfaction = total > 0 ? d3.mean(data, d => d.study_satisfaction).toFixed(1) : 0;
    
    // Mettre à jour les KPIs dans le header
    const kpiTotal = document.getElementById('kpi-total');
    const kpiDepression = document.getElementById('kpi-depression');
    const kpiCgpa = document.getElementById('kpi-cgpa');
    const kpiSatisfaction = document.getElementById('kpi-satisfaction');
    
    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiDepression) kpiDepression.textContent = depressionRate + '%';
    if (kpiCgpa) kpiCgpa.textContent = avgCGPA;
    if (kpiSatisfaction) kpiSatisfaction.textContent = avgSatisfaction;
}

function populateCityFilter(data) {
    const cityFilter = document.getElementById('cityFilter');
    if (!cityFilter) return;
    
    const cityCleanup = {
        'Khaziabad': 'Ghaziabad',
        'Less Delhi': 'Delhi',
        'Less than 5 Kalyan': 'Kalyan',
        'M.Com': null,
        'M.Tech': null,
        'ME': null
    };
    
    const cityCounts = {};
    data.forEach(student => {
        let city = student.city;
        if (!city || city === 'Unknown') return;
        
        city = city.toString().trim();
        
        if (cityCleanup[city]) {
            if (cityCleanup[city] === null) return;
            city = cityCleanup[city];
        }
        
        const nonCityNames = ['3', 'Bhavna', 'Gaurav', 'Harsh', 'Harsha', 'Kibara', 
                             'Mihir', 'Mira', 'Nalini', 'Nalyan', 'Nandini', 
                             'Rashi', 'Reyansh', 'Saanvi', 'Vaanya'];
        
        if (nonCityNames.includes(city)) return;
        
        cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    
    const sortedCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([city]) => city);
    
    while (cityFilter.options.length > 1) {
        cityFilter.remove(1);
    }
    
    sortedCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = `${city} (${cityCounts[city]})`;
        cityFilter.appendChild(option);
    });
}

function setupFilterEvents() {
    const genderFilter = document.getElementById('genderFilter');
    const cityFilter = document.getElementById('cityFilter');
    const degreeFilter = document.getElementById('degreeFilter');
    const depressionFilter = document.getElementById('depressionFilter');
    const resetButton = document.getElementById('reset-filters');
    
    if (genderFilter) {
        genderFilter.addEventListener('change', function() {
            dashboardState.filters.gender = this.value;
            applyFilters();
        });
    }
    
    if (cityFilter) {
        cityFilter.addEventListener('change', function() {
            dashboardState.filters.city = this.value;
            applyFilters();
        });
    }
    
    if (degreeFilter) {
        degreeFilter.addEventListener('change', function() {
            dashboardState.filters.degree = this.value;
            applyFilters();
        });
    }
    
    if (depressionFilter) {
        depressionFilter.addEventListener('change', function() {
            dashboardState.filters.depression = this.value;
            applyFilters();
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            dashboardState.filters = {
                gender: 'all',
                city: 'all',
                degree: 'all',
                depression: 'all'
            };
            
            if (genderFilter) genderFilter.value = 'all';
            if (cityFilter) cityFilter.value = 'all';
            if (degreeFilter) degreeFilter.value = 'all';
            if (depressionFilter) depressionFilter.value = 'all';
            
            applyFilters();
        });
    }
}

function applyFilters() {
    const allData = window.getStudentData();
    if (!allData) return;
    
    let filtered = [...allData];
    const filters = dashboardState.filters;
    
    if (filters.gender !== 'all') {
        filtered = filtered.filter(d => d.gender === filters.gender);
    }
    
    if (filters.city !== 'all') {
        filtered = filtered.filter(d => d.city === filters.city);
    }
    
    if (filters.degree !== 'all') {
        filtered = filtered.filter(d => {
            const degree = d.degree.toLowerCase();
            if (filters.degree === 'Bachelor') return degree.includes('bachelor');
            if (filters.degree === 'Master') return degree.includes('master');
            if (filters.degree === 'PhD') return degree.includes('doctor') || degree.includes('phd');
            return true;
        });
    }
    
    if (filters.depression !== 'all') {
        filtered = filtered.filter(d => 
            filters.depression === 'depressed' ? 
            d.depression === 1 : d.depression === 0
        );
    }
    
    dashboardState.filteredData = filtered;
    updateGlobalStats(filtered);
    updateDashboardKPIs(filtered);
    updateAllCharts();
    
    if (typeof updateInsights === 'function') {
        updateInsights();
    }
    
    console.log(`Filtres appliqués: ${filtered.length} étudiants`);
}

function updateGlobalStats(data) {
    const total = data.length;
    const depressed = data.filter(d => d.depression === 1).length;
    const depressionRate = total > 0 ? (depressed / total * 100).toFixed(1) : 0;
    const avgCGPA = total > 0 ? d3.mean(data, d => d.cgpa).toFixed(2) : 0;
    
    const totalElement = document.getElementById('total-students');
    const rateElement = document.getElementById('depression-rate');
    const cgpaElement = document.getElementById('avg-cgpa');
    
    if (totalElement) totalElement.textContent = total;
    if (rateElement) rateElement.textContent = depressionRate + '%';
    if (cgpaElement) cgpaElement.textContent = avgCGPA;
}

function initAllCharts() {
    // Essayer d'abord la carte de l'Inde, sinon la carte US
    if (typeof initIndiaMap === 'function') {
        initIndiaMap();
    } else if (typeof initUSMap === 'function') {
        initUSMap();
    }
    
    if (typeof initPieChart === 'function') initPieChart();
    if (typeof initCityTable === 'function') initCityTable();
    if (typeof initRadarChart === 'function') initRadarChart();
    if (typeof initMultiBarChart === 'function') initMultiBarChart();
}

function updateAllCharts() {
    // Essayer d'abord la carte de l'Inde, sinon la carte US
    if (typeof updateIndiaMap === 'function') {
        updateIndiaMap();
    } else if (typeof updateUSMap === 'function') {
        updateUSMap();
    }
    
    if (typeof updatePieChart === 'function') updatePieChart();
    if (typeof updateCityTable === 'function') updateCityTable();
    if (typeof updateRadarChart === 'function') updateRadarChart();
    if (typeof updateMultiBarChart === 'function') updateMultiBarChart();
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function handleSelection(type, data) {
    dashboardState.currentSelection = { type, data };
    
    if (type === 'city') {
        dashboardState.filters.city = data;
        const cityFilter = document.getElementById('cityFilter');
        if (cityFilter) cityFilter.value = data;
        applyFilters();
    } else if (type === 'depression') {
        dashboardState.filters.depression = data ? 'depressed' : 'not_depressed';
        const depressionFilter = document.getElementById('depressionFilter');
        if (depressionFilter) {
            depressionFilter.value = data ? 'depressed' : 'not_depressed';
        }
        applyFilters();
    } else if (type === 'gender') {
        dashboardState.filters.gender = data;
        const genderFilter = document.getElementById('genderFilter');
        if (genderFilter) genderFilter.value = data;
        applyFilters();
    } else if (type === 'degree') {
        dashboardState.filters.degree = data;
        const degreeFilter = document.getElementById('degreeFilter');
        if (degreeFilter) degreeFilter.value = data;
        applyFilters();
    }
    
    updateAllCharts();
}

function resetSelection() {
    dashboardState.currentSelection = null;
    updateAllCharts();
}

function getFilteredData() {
    return dashboardState.filteredData;
}

function getDashboardState() {
    return dashboardState;
}

// Exposer les fonctions
window.initDashboard = initDashboard;
window.handleSelection = handleSelection;
window.resetSelection = resetSelection;
window.getFilteredData = getFilteredData;
window.getDashboardState = getDashboardState;