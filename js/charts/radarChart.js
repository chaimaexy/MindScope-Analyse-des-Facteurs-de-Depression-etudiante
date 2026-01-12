// js/charts/radarChart.js - VERSION COMPLÈTE CORRIGÉE

let radarChartInstance = null;

// Définir les échelles maximales pour chaque feature
const FEATURE_RANGES = {
    'academic_pressure': { min: 0, max: 5 },
    'study_satisfaction': { min: 0, max: 5 },
    'sleep_duration': { min: 0, max: 5 },
    'financial_stress': { min: 0, max: 5 },
    'dietary_habits': { min: 0, max: 5 },
    'work_study_hours': { min: 0, max: 10 },
    'cgpa': { min: 0, max: 10 }
};

// AJOUTEZ CE MAPPING (il manquait)
const FEATURE_MAPPING = {
    'Academic Pressure': 'academic_pressure',
    'Study Satisfaction': 'study_satisfaction', 
    'Sleep Duration': 'sleep_duration',
    'Financial Stress': 'financial_stress',
    'Dietary Habits': 'dietary_habits',
    'Work/Study Hours': 'work_study_hours',
    'CGPA': 'cgpa'
};

// Inverser le mapping aussi
const REVERSE_FEATURE_MAPPING = {
    'academic_pressure': 'Academic Pressure',
    'study_satisfaction': 'Study Satisfaction',
    'sleep_duration': 'Sleep Duration',
    'financial_stress': 'Financial Stress',
    'dietary_habits': 'Dietary Habits',
    'work_study_hours': 'Work/Study Hours',
    'cgpa': 'CGPA'
};

// Normaliser les données selon leur échelle respective
function normalizeData(data, features) {
    console.log('Normalisation - données entrantes:', data);
    console.log('Normalisation - features demandées:', features);
    
    const normalized = {};
    
    features.forEach(displayName => {
        // Convertir le nom d'affichage en clé technique
        const technicalKey = FEATURE_MAPPING[displayName] || displayName;
        
        // Trouver la valeur
        let value;
        
        // Essayer dans l'ordre : clé technique, nom d'affichage, ou chercher
        if (data[technicalKey] !== undefined) {
            value = data[technicalKey];
        } else if (data[displayName] !== undefined) {
            value = data[displayName];
        } else {
            // Recherche par clés disponibles
            const availableKeys = Object.keys(data);
            const foundKey = availableKeys.find(key => 
                key.toLowerCase() === technicalKey.toLowerCase() ||
                key.toLowerCase().replace(/_/g, ' ') === displayName.toLowerCase()
            );
            value = foundKey ? data[foundKey] : 0;
        }
        
        const range = FEATURE_RANGES[technicalKey] || { min: 0, max: 5 };
        
        if (value === undefined || value === null) {
            normalized[displayName] = 0;
            console.warn(`Valeur non trouvée pour ${displayName} (${technicalKey})`);
        } else {
            // Normaliser entre 0 et 5 pour l'affichage radar
            normalized[displayName] = (value - range.min) / (range.max - range.min) * 5;
            console.log(`Normalisé ${displayName}: ${value} -> ${normalized[displayName]}`);
        }
    });
    
    console.log('Résultat normalisation:', normalized);
    return normalized;
}

// Initialiser le radar chart
function createRadarChart(container, features) {
    console.log('Création du radar chart avec features:', features);
    
    const containerElement = document.querySelector(container);
    if (!containerElement) {
        console.error('Conteneur radar non trouvé:', container);
        return;
    }
    
    // Nettoyer le conteneur
    containerElement.innerHTML = '';
    
    const width = containerElement.clientWidth || 500;
    const height = 400;
    
    // Taille du radar
    const size = Math.min(width, height) - 80;
    const radius = size / 2;
    
    // Créer le SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'radar-svg');

    // Groupe principal centré
    const g = svg.append('g')
        .attr('transform', `translate(${width/2}, ${height/2})`);
    
    // Stocker la configuration
    radarChartInstance = {
        svg,
        g,
        radius,
        width,
        height,
        features: features || [],
        size
    };
    
    // Dessiner la grille vide
    drawRadarGrid();
    
    console.log('Radar chart initialisé avec succès');
    return radarChartInstance;
}

// Fonction principale de mise à jour
function updateRadarChart(container, data1, data2, features, title = 'Comparaison') {
    console.log('Mise à jour du radar avec:', {
        data1,
        data2,
        features,
        title
    });
    
    // VÉRIFIER SI LES DONNÉES SONT VALIDES
    if (!data1) {
        console.error('Données 1 manquantes');
        return;
    }
    
    // Normaliser les données
    const normalizedData1 = normalizeData(data1, features);
    const normalizedData2 = data2 ? normalizeData(data2, features) : null;
    
    console.log('Données normalisées:', { normalizedData1, normalizedData2 });
    
    if (!radarChartInstance) {
        console.log('Création du radar chart...');
        createRadarChart(container, features);
    }
    
    const { g, radius } = radarChartInstance;
    
    // Nettoyer les anciennes données
    g.selectAll('.radar-area').remove();
    g.selectAll('.radar-point').remove();
    g.selectAll('.radar-label').remove();
    g.selectAll('.radar-title').remove();
    g.selectAll('.radar-legend').remove();
    
    // Nombre de features
    const numFeatures = features.length;
    const angleSlice = (Math.PI * 2) / numFeatures;
    
    // Échelle (0-5 pour nos métriques normalisées)
    const scale = d3.scaleLinear()
        .domain([0, 5])
        .range([0, radius]);
    
    // Fonction pour tracer les lignes
    const radarLine = d3.lineRadial()
        .radius(d => scale(d.value))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);
    
    // Préparer les données pour le radar
    const prepareRadarData = (data, features) => {
        return features.map((displayName, i) => {
            const value = data[displayName] !== undefined ? data[displayName] : 0;
            return {
                axis: displayName, // Utiliser le nom d'affichage
                value: value,
                originalKey: FEATURE_MAPPING[displayName] || displayName
            };
        });
    };
    
    const radarData1 = prepareRadarData(normalizedData1, features);
    const radarData2 = normalizedData2 ? prepareRadarData(normalizedData2, features) : null;
    
    console.log('Données radar préparées:', { radarData1, radarData2 });
    
    // Dessiner la première série
    const area1 = g.append('path')
        .datum(radarData1)
        .attr('class', 'radar-area radar-series-1')
        .attr('d', radarLine)
        .style('fill', 'rgba(79, 70, 229, 0.2)')
        .style('stroke', '#4f46e5')
        .style('stroke-width', 2)
        .style('fill-opacity', 0.4);
    
    // Ajouter les points pour la série 1
    radarData1.forEach((d, i) => {
        const angle = i * angleSlice;
        const pointRadius = scale(d.value);
        const x = pointRadius * Math.sin(angle);
        const y = pointRadius * -Math.cos(angle);
        
        g.append('circle')
            .attr('class', 'radar-point')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 4)
            .style('fill', '#4f46e5')
            .style('stroke', 'white')
            .style('stroke-width', 2);
    });
    
    // Dessiner la deuxième série si disponible
    if (radarData2) {
        const area2 = g.append('path')
            .datum(radarData2)
            .attr('class', 'radar-area radar-series-2')
            .attr('d', radarLine)
            .style('fill', 'rgba(245, 158, 11, 0.1)')
            .style('stroke', '#f59e0b')
            .style('stroke-width', 2)
            .style('stroke-dasharray', '5,3');
        
        // Points pour la série 2
        radarData2.forEach((d, i) => {
            const angle = i * angleSlice;
            const pointRadius = scale(d.value);
            const x = pointRadius * Math.sin(angle);
            const y = pointRadius * -Math.cos(angle);
            
            g.append('circle')
                .attr('class', 'radar-point')
                .attr('cx', x)
                .attr('cy', y)
                .attr('r', 4)
                .style('fill', '#f59e0b')
                .style('stroke', 'white')
                .style('stroke-width', 2);
        });
    }
    
    // Ajouter les labels des axes
    features.forEach((displayName, i) => {
        const angle = i * angleSlice;
        const labelRadius = radius + 35;
        const x = labelRadius * Math.sin(angle);
        const y = labelRadius * -Math.cos(angle);
        
        g.append('text')
            .attr('class', 'radar-label')
            .attr('x', x)
            .attr('y', y)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '12px')
            .style('fill', '#475569')
            .style('font-weight', '500')
            .text(displayName);
    });
    
    // Titre
    g.append('text')
        .attr('class', 'radar-title')
        .attr('x', 0)
        .attr('y', -radius - 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#1e293b')
        .text(title);
    
    // Légende
    const legend = g.append('g')
        .attr('class', 'radar-legend')
        .attr('transform', `translate(${-radius + 20}, ${radius + 40})`);
    
    // Série 1
    legend.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 6)
        .style('fill', '#4f46e5');
    
    legend.append('text')
        .attr('x', 15)
        .attr('y', 4)
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .text(getSeriesLabel('series1', title));
    
    // Série 2 si disponible
    if (radarData2) {
        legend.append('circle')
            .attr('cx', 120)
            .attr('cy', 0)
            .attr('r', 6)
            .style('fill', '#f59e0b');
        
        legend.append('text')
            .attr('x', 135)
            .attr('y', 4)
            .style('font-size', '12px')
            .style('fill', '#475569')
            .style('font-weight', '500')
            .text(getSeriesLabel('series2', title));
    }
    
    console.log('Radar mis à jour avec succès');
}

// Obtenir le label de la série
function getSeriesLabel(series, title) {
    if (title.includes('Global')) {
        return series === 'series1' ? 'Cluster' : 'Moyenne Globale';
    } else if (title.includes('Étudiant')) {
        return series === 'series1' ? 'Étudiant' : 'Moyenne Cluster';
    } else if (title.includes('Cluster') && title.includes('vs')) {
        const matches = title.match(/Cluster (\d+) vs Cluster (\d+)/);
        if (matches) {
            return series === 'series1' ? `Cluster ${matches[1]}` : `Cluster ${matches[2]}`;
        }
        return series === 'series1' ? 'Cluster 1' : 'Cluster 2';
    }
    return series === 'series1' ? 'Série 1' : 'Série 2';
}

// Dessiner la grille du radar
function drawRadarGrid() {
    if (!radarChartInstance) return;
    
    const { g, radius } = radarChartInstance;
    
    // Nettoyer l'ancienne grille
    g.selectAll('.radar-circle-grid').remove();
    g.selectAll('.radar-axis').remove();
    g.selectAll('.radar-level-label').remove();
    
    // 5 niveaux concentriques (0-5)
    const levels = 5;
    const levelRadius = radius / levels;
    
    // Cercles concentriques
    for (let i = 0; i <= levels; i++) {
        const currentRadius = levelRadius * i;
        
        g.append('circle')
            .attr('class', 'radar-circle-grid')
            .attr('r', currentRadius)
            .style('fill', 'none')
            .style('stroke', '#e2e8f0')
            .style('stroke-width', 1)
            .style('stroke-dasharray', i === levels ? 'none' : '2,2');
        
        // Labels des niveaux
        if (i > 0 && i < levels) {
            g.append('text')
                .attr('class', 'radar-level-label')
                .attr('x', currentRadius + 5)
                .attr('y', -5)
                .style('font-size', '10px')
                .style('fill', '#94a3b8')
                .style('font-weight', '500')
                .text(i);
        }
    }
    
    // Axes (lignes du centre vers l'extérieur)
    if (radarChartInstance.features && radarChartInstance.features.length > 0) {
        const numFeatures = radarChartInstance.features.length;
        const angleSlice = (Math.PI * 2) / numFeatures;
        
        for (let i = 0; i < numFeatures; i++) {
            const angle = i * angleSlice;
            const x = radius * Math.sin(angle);
            const y = radius * -Math.cos(angle);
            
            g.append('line')
                .attr('class', 'radar-axis')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', y)
                .style('stroke', '#cbd5e1')
                .style('stroke-width', 1);
        }
    }
}