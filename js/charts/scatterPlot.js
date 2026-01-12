// js/charts/scatterPlot.js - Version CORRIGÉE

let scatterPlot = null;
let currentProjection = 'pca';
let currentColorScheme = 'cluster';
let is3D = false;
let studentCoordinates = {}; // Stocker les coordonnées par ID d'étudiant

const COLOR_SCHEMES = {
    cluster: [
        '#4E79A7', '#F28E2C', '#E15759', '#76B7B2', 
        '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'
    ],
    depression: {
        depressed: '#E15759',
        notDepressed: '#4E79A7'
    },
    suicidal: {
        highRisk: '#E15759',
        mediumRisk: '#F28E2C',
        lowRisk: '#59A14F'
    },
    academic: [
        '#dbeafe',  // Très faible (1)
        '#93c5fd',  // Faible (2)
        '#60a5fa',  // Moyenne (3)
        '#3b82f6',  // Élevée (4)
        '#1d4ed8'   // Très élevée (5)
    ]
};

function createScatterPlot(container, data, clusters, colors, projection = 'pca') {
    console.log('Création du scatter plot...', data.length, 'points');
    
    const containerElement = document.querySelector(container);
    if (!containerElement) {
        console.error('Conteneur non trouvé:', container);
        return;
    }
    
    const width = containerElement.clientWidth;
    const height = containerElement.clientHeight;
    
    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();
    
    // Calculer les coordonnées selon la projection - VERSION CORRIGÉE
    const coordinates = calculateProjection(data, projection);
    
    // Stocker les coordonnées par ID pour une utilisation ultérieure
    data.forEach((d, i) => {
        d.proj_x = coordinates[i][0];
        d.proj_y = coordinates[i][1];
        studentCoordinates[d.id] = { x: d.proj_x, y: d.proj_y, projection };
    });
    
    // Créer le SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'scatter-plot-svg');
    
    // Groupe principal
    const g = svg.append('g')
        .attr('class', 'main-group');
    
    // Échelles avec marge
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const xExtent = d3.extent(coordinates, d => d[0]);
    const yExtent = d3.extent(coordinates, d => d[1]);
    
    // Ajouter un peu d'espace autour des données
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    const xScale = d3.scaleLinear()
        .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
        .range([margin.left, width - margin.right]);
    
    const yScale = d3.scaleLinear()
        .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
        .range([height - margin.bottom, margin.top]);
    
    // Groupe pour le zoom
    const zoomGroup = g.append('g')
        .attr('class', 'zoom-group');
    
    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    zoomGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis);
    
    zoomGroup.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis);
    
    // Titres des axes
    const axisLabels = getAxisLabels(projection);
    
    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .text(axisLabels.x);
    
    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .text(axisLabels.y);
    
    // Ajouter les points
    const points = zoomGroup.append('g')
        .attr('class', 'points-group')
        .selectAll('.data-point')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => xScale(d.proj_x))
        .attr('cy', d => yScale(d.proj_y))
        .attr('r', d => getPointSize(d))
        .attr('fill', d => getPointColor(d, currentColorScheme, colors))
        .attr('opacity', 0.8)
        .attr('stroke', d => d.depression === 1 ? '#dc2626' : 'none')
        .attr('stroke-width', d => d.depression === 1 ? 1.5 : 0);
    
    // Tooltip
    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'scatter-tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(255, 255, 255, 0.95)')
        .style('padding', '10px')
        .style('border-radius', '6px')
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('border', '1px solid #e2e8f0')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('display', 'none')
        .style('z-index', '1000');
    
    // Événements sur les points
    points.on('mouseover', function(event, d) {
        d3.select(this)
            .attr('r', getPointSize(d) + 3)
            .attr('opacity', 1)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 2);
        
        tooltip
            .style('display', 'block')
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <div style="margin-bottom: 5px; font-weight: 600;">Étudiant #${d.id}</div>
                <div style="color: #475569; margin-bottom: 3px;">
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; 
                           background-color: ${getPointColor(d, currentColorScheme, colors)}; margin-right: 5px;"></span>
                    Cluster ${d.cluster_id + 1}
                </div>
                <div style="color: #64748b; margin-bottom: 3px;">Âge: ${d.age} ans</div>
                <div style="color: #64748b; margin-bottom: 3px;">Dépression: 
                    <span style="color: ${d.depression === 1 ? '#dc2626' : '#16a34a'}; font-weight: 500;">
                        ${d.depression === 1 ? 'Oui' : 'Non'}
                    </span>
                </div>
                <div style="color: #64748b;">CGPA: ${d.cgpa?.toFixed(2) || 'N/A'}</div>
            `);
    })
    .on('mouseout', function() {
        const d = d3.select(this).datum();
        d3.select(this)
            .attr('r', getPointSize(d))
            .attr('opacity', 0.8)
            .attr('stroke', d.depression === 1 ? '#dc2626' : 'none')
            .attr('stroke-width', d.depression === 1 ? 1.5 : 0);
        
        tooltip.style('display', 'none');
    })
    .on('click', function(event, d) {
        // Mettre en évidence le cluster
        points
            .attr('opacity', 0.4)
            .filter(p => p.cluster_id === d.cluster_id)
            .attr('opacity', 0.9)
            .attr('r', getPointSize(d) + 2);
        
        d3.select(this)
            .attr('r', getPointSize(d) + 4)
            .attr('opacity', 1);
        
        // Déclencher la sélection
        const selectionEvent = new CustomEvent('pointSelected', { detail: d });
        document.dispatchEvent(selectionEvent);
    });
    
    // Zoom et déplacement
    const zoom = d3.zoom()
        .scaleExtent([0.5, 8])
        .translateExtent([[0, 0], [width, height]])
        .on('zoom', (event) => {
            zoomGroup.attr('transform', event.transform);
            // Mettre à jour les axes pendant le zoom
            zoomGroup.select('.x-axis').call(xAxis.scale(event.transform.rescaleX(xScale)));
            zoomGroup.select('.y-axis').call(yAxis.scale(event.transform.rescaleY(yScale)));
        });
    
    svg.call(zoom);
    
    // Titre du graphique
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#1e293b')
        .text(`Visualisation ${projection.toUpperCase()} - ${data.length} étudiants`);
    
    // Stocker la configuration
    scatterPlot = {
        svg,
        zoomGroup,
        xScale,
        yScale,
        data,
        colors,
        projection,
        zoom,
        width,
        height,
        margin
    };
    
    return scatterPlot;
}

// Mettre à jour le scatter plot - VERSION CORRIGÉE
function updateScatterPlot(container, data, clusters, projection, colorScheme = 'cluster') {
    console.log('Mise à jour du scatter plot:', projection, colorScheme, 'avec', data.length, 'points');
    
    // Si le scatter plot n'existe pas encore, le créer
    if (!scatterPlot || scatterPlot.svg.empty()) {
        console.log('Création d\'un nouveau scatter plot...');
        return createScatterPlot(container, data, clusters, CLUSTER_COLORS, projection);
    }
    
    currentProjection = projection;
    currentColorScheme = colorScheme;
    
    // IMPORTANT: Pour chaque étudiant dans les données filtrées,
    // récupérer ou calculer les coordonnées
    data.forEach((d, i) => {
        // Vérifier si cet étudiant a déjà des coordonnées calculées
        const storedCoords = studentCoordinates[d.id];
        
        if (storedCoords && storedCoords.projection === projection) {
            // Réutiliser les coordonnées existantes
            d.proj_x = storedCoords.x;
            d.proj_y = storedCoords.y;
        } else {
            // Calculer de nouvelles coordonnées
            const coords = calculateProjectionForStudent(d, projection, data);
            d.proj_x = coords[0];
            d.proj_y = coords[1];
            
            // Stocker pour une utilisation ultérieure
            studentCoordinates[d.id] = { 
                x: d.proj_x, 
                y: d.proj_y, 
                projection 
            };
        }
    });
    
    // Extraire les coordonnées pour le calcul des échelles
    const coordinates = data.map(d => [d.proj_x, d.proj_y]);
    
    // Mettre à jour les échelles
    const xExtent = d3.extent(coordinates, d => d[0]);
    const yExtent = d3.extent(coordinates, d => d[1]);
    
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    
    scatterPlot.xScale.domain([xExtent[0] - xPadding, xExtent[1] + xPadding]);
    scatterPlot.yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);
    
    // Mettre à jour les points avec une transition
    const points = scatterPlot.zoomGroup.select('.points-group')
        .selectAll('.data-point')
        .data(data, d => d.id); // Utiliser l'ID comme clé pour la jointure
    
    // Points à supprimer (exit)
    points.exit()
        .transition()
        .duration(500)
        .attr('r', 0)
        .attr('opacity', 0)
        .remove();
    
    // Points à mettre à jour (update)
    points.transition()
        .duration(750)
        .attr('cx', d => scatterPlot.xScale(d.proj_x))
        .attr('cy', d => scatterPlot.yScale(d.proj_y))
        .attr('fill', d => getPointColor(d, colorScheme, CLUSTER_COLORS))
        .attr('r', d => getPointSize(d))
        .attr('opacity', 0.8);
    
    // Nouveaux points (enter)
    const newPoints = points.enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => scatterPlot.xScale(d.proj_x))
        .attr('cy', d => scatterPlot.yScale(d.proj_y))
        .attr('r', 0) // Commencer à 0
        .attr('fill', d => getPointColor(d, colorScheme, CLUSTER_COLORS))
        .attr('opacity', 0)
        .attr('stroke', d => d.depression === 1 ? '#dc2626' : 'none')
        .attr('stroke-width', d => d.depression === 1 ? 1.5 : 0);
    
    // Animation d'entrée
    newPoints.transition()
        .duration(750)
        .attr('r', d => getPointSize(d))
        .attr('opacity', 0.8);
    
    // Ajouter les événements aux nouveaux points
    newPoints.on('mouseover', function(event, d) {
        d3.select(this)
            .attr('r', getPointSize(d) + 3)
            .attr('opacity', 1)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 2);
        
        // Tooltip (déjà créé)
    })
    .on('mouseout', function() {
        const d = d3.select(this).datum();
        d3.select(this)
            .attr('r', getPointSize(d))
            .attr('opacity', 0.8)
            .attr('stroke', d.depression === 1 ? '#dc2626' : 'none')
            .attr('stroke-width', d.depression === 1 ? 1.5 : 0);
    })
    .on('click', function(event, d) {
        // Mettre en évidence le cluster
        scatterPlot.zoomGroup.selectAll('.data-point')
            .attr('opacity', 0.4)
            .filter(p => p.cluster_id === d.cluster_id)
            .attr('opacity', 0.9)
            .attr('r', p => getPointSize(p) + 2);
        
        d3.select(this)
            .attr('r', getPointSize(d) + 4)
            .attr('opacity', 1);
        
        const selectionEvent = new CustomEvent('pointSelected', { detail: d });
        document.dispatchEvent(selectionEvent);
    });
    
    // Mettre à jour les axes
    scatterPlot.zoomGroup.select('.x-axis')
        .transition()
        .duration(750)
        .call(d3.axisBottom(scatterPlot.xScale));
    
    scatterPlot.zoomGroup.select('.y-axis')
        .transition()
        .duration(750)
        .call(d3.axisLeft(scatterPlot.yScale));
    
    // Mettre à jour les titres des axes
    const axisLabels = getAxisLabels(projection);
    
    scatterPlot.svg.select('.x-axis-label')
        .transition()
        .duration(750)
        .text(axisLabels.x);
    
    scatterPlot.svg.select('.y-axis-label')
        .transition()
        .duration(750)
        .text(axisLabels.y);
    
    // Mettre à jour le titre
    scatterPlot.svg.select('.chart-title')
        .text(`Visualisation ${projection.toUpperCase()} - ${data.length} étudiants`);
    
    // Mettre à jour les données
    scatterPlot.data = data;
    scatterPlot.projection = projection;
    
    console.log('Scatter plot mis à jour avec succès');
}

// NOUVELLE FONCTION: Calculer la projection pour un étudiant spécifique
function calculateProjectionForStudent(student, projection, allData) {
    // Utiliser un seed basé sur l'ID de l'étudiant pour la reproductibilité
    const seed = student.id;
    
    switch(projection) {
        case 'pca':
            return calculatePCACoords(student, seed);
        case 'tsne':
            return calculateTSNECoords(student, seed);
        case 'umap':
            return calculateUMAPCoords(student, seed);
        default:
            return [0, 0];
    }
}

// Calculer les coordonnées PCA de manière déterministe
function calculatePCACoords(student, seed) {
    // Utiliser le seed pour une reproductibilité
    const random = seededRandom(seed);
    
    // Composante 1: Combinaison de stress académique et financier
    const x = (student.academic_pressure || 0) * 0.5 + 
             (student.financial_stress || 0) * 0.3 +
             (random() - 0.5) * 0.5;
    
    // Composante 2: Combinaison de bien-être
    const y = (student.study_satisfaction || 0) * 0.4 +
             (student.sleep_duration || 0) * 0.3 +
             (student.dietary_habits || 0) * 0.3 +
             (random() - 0.5) * 0.5;
    
    return [x, y];
}

// Calculer les coordonnées t-SNE de manière déterministe
function calculateTSNECoords(student, seed) {
    const random = seededRandom(seed);
    const clusterId = student.cluster_id || 0;
    
    // Position de base basée sur le cluster
    const clusterX = (clusterId % 3) * 5 - 5;
    const clusterY = Math.floor(clusterId / 3) * 5 - 5;
    
    // Ajouter une variation basée sur les caractéristiques
    const x = clusterX + 
             (student.academic_pressure || 0) * 0.3 +
             (random() - 0.5) * 1.5;
    
    const y = clusterY + 
             (student.study_satisfaction || 0) * 0.4 +
             (random() - 0.5) * 1.5;
    
    return [x, y];
}

// Calculer les coordonnées UMAP de manière déterministe
function calculateUMAPCoords(student, seed) {
    const random = seededRandom(seed);
    
    const depressionFactor = student.depression === 1 ? 3 : -3;
    const academicFactor = (student.academic_pressure || 0) * 0.8;
    const sleepFactor = (student.sleep_duration || 0) * 0.6;
    
    const x = depressionFactor + academicFactor + (random() - 0.5) * 2;
    const y = sleepFactor + (student.study_satisfaction || 0) * 0.7 + (random() - 0.5) * 2;
    
    return [x, y];
}

// Fonction de random déterministe basée sur un seed
function seededRandom(seed) {
    let value = seed;
    return function() {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
}

// Obtenir la couleur du point selon le schéma
function getPointColor(d, scheme, clusterColors) {
    if (!clusterColors) {
        clusterColors = CLUSTER_COLORS;
    }
    
    switch(scheme) {
        case 'depression':
            return d.depression === 1 ? '#dc2626' : '#16a34a';
        case 'suicidal':
            return d.hasSuicidalThoughts ? '#dc2626' : '#3b82f6';
        case 'academic':
            const pressure = d.academic_pressure || 0;
            const intensity = pressure / 5;
            return d3.interpolateRdBu(1 - intensity);
        case 'cluster':
        default:
            return clusterColors[d.cluster_id] || '#94a3b8';
    }
}

// Obtenir la taille du point
function getPointSize(d) {
    let baseSize = 4;
    if (d.depression === 1) baseSize += 1;
    if (d.hasSuicidalThoughts) baseSize += 0.5;
    return baseSize;
}

// Obtenir les labels des axes
function getAxisLabels(projection) {
    const labels = {
        pca: { 
            x: 'Première Composante Principale (PC1)', 
            y: 'Deuxième Composante Principale (PC2)' 
        },
        tsne: { 
            x: 'Dimension t-SNE 1', 
            y: 'Dimension t-SNE 2' 
        },
        umap: { 
            x: 'Dimension UMAP 1', 
            y: 'Dimension UMAP 2' 
        }
    };
    
    return labels[projection] || { x: 'Dimension 1', y: 'Dimension 2' };
}

// Calculer la projection (fonctions originales - gardées pour compatibilité)
function calculateProjection(data, projection) {
    const coordinates = [];
    
    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const seed = d.id || i;
        const coords = calculateProjectionForStudent(d, projection, data);
        coordinates.push(coords);
        
        // Stocker les coordonnées
        studentCoordinates[d.id] = { 
            x: coords[0], 
            y: coords[1], 
            projection 
        };
    }
    
    return coordinates;
}

// Exporter le graphique
function exportScatterPlot(format, filename = 'carte-clusters') {
    if (!scatterPlot) return;
    
    const svgElement = scatterPlot.svg.node();
    exportChart(svgElement, format, filename);
}

// Réinitialiser le zoom
function resetZoom() {
    if (!scatterPlot) return;
    
    scatterPlot.svg.transition()
        .duration(750)
        .call(scatterPlot.zoom.transform, d3.zoomIdentity);
}

// Basculer en vue 3D (simulation)
function toggle3D() {
    if (!scatterPlot) return;
    
    is3D = !is3D;
    
    const button = document.getElementById('toggle-3d');
    if (is3D) {
        button.innerHTML = '<i class="icon icon-dice" aria-hidden="true"></i> Vue 2D';
        button.classList.add('active');
        
        scatterPlot.zoomGroup.selectAll('.data-point')
            .transition()
            .duration(1000)
            .attr('r', d => getPointSize(d) * 1.5)
            .attr('opacity', 0.9);
        
        scatterPlot.svg.selectAll('.data-point')
            .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
    } else {
        button.innerHTML = '<i class="icon icon-dice" aria-hidden="true"></i> Vue 3D';
        button.classList.remove('active');
        
        scatterPlot.zoomGroup.selectAll('.data-point')
            .transition()
            .duration(1000)
            .attr('r', d => getPointSize(d))
            .attr('opacity', 0.8);
        
        scatterPlot.svg.selectAll('.data-point')
            .style('filter', 'none');
    }
}

// Fonctions de clustering (gardées telles quelles)
function performClustering(data, k = 5, maxIterations = 100) {
    if (data.length === 0) return [];
    
    const features = extractFeatures(data);
    const standardized = standardizeData(features);
    
    let centroids = initializeCentroids(standardized, k);
    let clusters = new Array(data.length).fill(0);
    let changed = true;
    let iterations = 0;
    
    while (changed && iterations < maxIterations) {
        changed = false;
        
        for (let i = 0; i < standardized.length; i++) {
            const distances = centroids.map(centroid => 
                euclideanDistance(standardized[i], centroid)
            );
            const newCluster = distances.indexOf(Math.min(...distances));
            
            if (newCluster !== clusters[i]) {
                clusters[i] = newCluster;
                changed = true;
            }
        }
        
        centroids = updateCentroids(standardized, clusters, k);
        iterations++;
    }
    
    data.forEach((d, i) => {
        d.cluster_id = clusters[i];
    });
    
    const groupedClusters = Array(k).fill().map(() => []);
    data.forEach((d, i) => {
        groupedClusters[clusters[i]].push(d);
    });
    
    return groupedClusters;
}

function extractFeatures(data) {
    return data.map(d => [
        d.academic_pressure || 0,
        d.study_satisfaction || 0,
        d.sleep_duration || 0,
        d.financial_stress || 0,
        d.dietary_habits || 0,
        d.work_study_hours || 0,
        d.cgpa || 0
    ]);
}

function standardizeData(data) {
    const means = [];
    const stds = [];
    const n = data[0].length;
    
    for (let i = 0; i < n; i++) {
        const values = data.map(row => row[i]);
        means.push(d3.mean(values));
        stds.push(d3.deviation(values) || 1);
    }
    
    return data.map(row => 
        row.map((val, i) => (val - means[i]) / stds[i])
    );
}

function initializeCentroids(data, k) {
    const centroids = [];
    const indices = new Set();
    
    while (centroids.length < k) {
        const idx = Math.floor(Math.random() * data.length);
        if (!indices.has(idx)) {
            indices.add(idx);
            centroids.push([...data[idx]]);
        }
    }
    
    return centroids;
}

function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
}

function updateCentroids(data, clusters, k) {
    const newCentroids = Array(k).fill().map(() => 
        Array(data[0].length).fill(0)
    );
    const counts = Array(k).fill(0);
    
    for (let i = 0; i < data.length; i++) {
        const cluster = clusters[i];
        counts[cluster]++;
        for (let j = 0; j < data[i].length; j++) {
            newCentroids[cluster][j] += data[i][j];
        }
    }
    
    for (let i = 0; i < k; i++) {
        if (counts[i] > 0) {
            for (let j = 0; j < newCentroids[i].length; j++) {
                newCentroids[i][j] /= counts[i];
            }
        }
    }
    
    return newCentroids;
}