// js/charts_dash/radarChart.js
// Radar chart des caractéristiques

let radarChartInitialized = false;
let radarChart = null;
let radarType = 'all';

function initRadarChart() {
    if (radarChartInitialized) return;
    
    const container = d3.select('#radar-chart');
    if (container.empty()) return;
    
    const width = container.node().clientWidth;
    const height = 250;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height);

     CommentButton.attach({
        container: document.querySelector('#radar-chart').closest('.chart-card'),
        content: `
            <strong>📡 Profil radar</strong><br/><br/>
            Ce graphique compare plusieurs dimensions
            du bien-être étudiant (pression académique,
            sommeil, stress financier, etc.).<br/><br/>
            Les valeurs sont normalisées sur une échelle
            commune pour permettre la comparaison.
        `
    });
    
    radarChart = {
        svg,
        width,
        height,
        margin,
        config: DashboardState.config.radarChart
    };
    
    // Événement de changement de type
    const typeSelect = document.getElementById('radar-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            radarType = this.value;
            updateRadarChart();
        });
    }

    radarChartInitialized = true;
}

function updateRadarChart() {
    if (!radarChartInitialized || !radarChart) return;
    
    const data = getFilteredData();
    let filteredData = data;
    
    // Filtrer selon le type sélectionné
    if (radarType === 'depressed') {
        filteredData = data.filter(d => d.depression === 1);
    } else if (radarType === 'not_depressed') {
        filteredData = data.filter(d => d.depression === 0);
    }
    
    if (filteredData.length === 0) {
        radarChart.svg.html('');
        radarChart.svg.append('text')
            .attr('x', radarChart.width / 2)
            .attr('y', radarChart.height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#94a3b8')
            .text('Aucune donnée disponible');
        return;
    }
    
    // Calculer les moyennes
    const averages = DashboardState.utils.calculateRadarData(filteredData);
    
    // Nettoyer
    radarChart.svg.html('');
    
    // Dimensions du radar
    const radius = Math.min(radarChart.width, radarChart.height) / 2 - 40;
    const centerX = radarChart.width / 2;
    const centerY = radarChart.height / 2;
    
    // Variables et angles
    const variables = radarChart.config.variables;
    const angleSlice = (Math.PI * 2) / variables.length;
    
    // Échelle pour les valeurs
    const maxValues = {
        academic_pressure: 5,
        sleep_duration: 5,
        financial_stress: 5,
        study_satisfaction: 5,
        cgpa: 10,
        work_study_hours: 12
    };
    
    const rScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, radius]);
    
    // Dessiner les cercles concentriques
    const levels = 5;
    for (let i = 0; i <= levels; i++) {
        const levelFactor = radius * (i / levels);
        
        radarChart.svg.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', levelFactor)
            .style('fill', 'none')
            .style('stroke', '#e2e8f0')
            .style('stroke-width', 0.5);
    }
    
    // Dessiner les axes (lignes radiales)
    variables.forEach((variable, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        
        // Ligne de l'axe
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        radarChart.svg.append('line')
            .attr('x1', centerX)
            .attr('y1', centerY)
            .attr('x2', x)
            .attr('y2', y)
            .style('stroke', '#cbd5e1')
            .style('stroke-width', 1);
        
        // Étiquette
        const label = radarChart.config.labels[i] || variable;
        const labelX = centerX + (radius + 15) * Math.cos(angle);
        const labelY = centerY + (radius + 15) * Math.sin(angle);
        
        radarChart.svg.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', (angle > Math.PI/2 && angle < 3*Math.PI/2) ? 'end' : 'start')
            .style('font-size', '10px')
            .style('fill', '#64748b')
            .text(label);
    });
    
    // Calculer les points du radar
    const radarPoints = [];
    variables.forEach((variable, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const normalizedValue = averages[variable] / maxValues[variable];
        const value = Math.min(1, normalizedValue);
        
        const x = centerX + rScale(value) * Math.cos(angle);
        const y = centerY + rScale(value) * Math.sin(angle);
        
        radarPoints.push({ x, y });
    });
    
    // Dessiner la forme du radar
    const radarLine = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveLinearClosed);
    
    radarChart.svg.append('path')
        .datum(radarPoints)
        .attr('d', radarLine)
        .style('fill', 'rgba(59, 130, 246, 0.2)')
        .style('stroke', '#3b82f6')
        .style('stroke-width', 2)
        .style('opacity', 0.8);
    
    // Ajouter les points
    radarPoints.forEach((point, i) => {
        radarChart.svg.append('circle')
            .attr('cx', point.x)
            .attr('cy', point.y)
            .attr('r', 4)
            .style('fill', '#3b82f6')
            .style('stroke', 'white')
            .style('stroke-width', 1.5);
        
        // Valeur numérique
        const variable = variables[i];
        const value = averages[variable];
        const maxValue = maxValues[variable];
        
        radarChart.svg.append('text')
            .attr('x', point.x + 8)
            .attr('y', point.y - 8)
            .style('font-size', '9px')
            .style('fill', '#475569')
            .style('font-weight', '600')
            .text(value.toFixed(1));
    });
    
    // Ajouter le titre
    const title = radarChart.svg.append('text')
        .attr('x', centerX)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569');
    
    let titleText = 'Profil moyen';
    if (radarType === 'depressed') titleText += ' (Déprimés)';
    else if (radarType === 'not_depressed') titleText += ' (Non déprimés)';
    
    title.text(titleText);
}

// Exposer les fonctions
window.initRadarChart = initRadarChart;
window.updateRadarChart = updateRadarChart;