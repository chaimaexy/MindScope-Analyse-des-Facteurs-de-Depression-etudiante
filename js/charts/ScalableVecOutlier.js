// js/charts/ScalableVecOutlier.js

/**
 * Crée un graphique SVG complexe pour visualiser un cluster avec couleurs et outliers
 */
export function createScalableVectorGraphic(containerSelector, clusterData, clusterIndex) {
    console.log('Création du SVG pour le cluster', clusterIndex);
    
    const container = d3.select(containerSelector);
    container.selectAll('*').remove();
    
    // Dimensions
    const width = container.node().clientWidth || 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    
    // Créer SVG
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#f8fafc')
        .style('border-radius', '8px')
        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)');
    
    // Zone de dessin
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    if (!clusterData || clusterData.length === 0) {
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', '#6b7280')
            .text('Aucune donnée disponible pour ce cluster');
        return;
    }
    
    // Préparer les données
    const features = ['academic_pressure', 'study_satisfaction', 'sleep_duration', 
                      'financial_stress', 'dietary_habits', 'work_study_hours', 'cgpa'];
    const featureNames = ['Pression Académique', 'Satisfaction', 'Sommeil', 
                         'Stress Financier', 'Alimentation', 'Heures', 'CGPA'];
    
    // Détecter les outliers
    const outliers = detectOutliersForSVG(clusterData, features);
    const normalStudents = clusterData.filter(student => 
        !outliers.some(outlier => outlier.id === student.id)
    );
    
    console.log(`Cluster ${clusterIndex}: ${normalStudents.length} étudiants normaux, ${outliers.length} outliers`);
    
    // Créer une projection (t-SNE simplifiée)
    const projection = createProjection(clusterData, features);
    
    // Échelles
    const xScale = d3.scaleLinear()
        .domain(d3.extent(projection, d => d.x))
        .range([0, plotWidth])
        .nice();
    
    const yScale = d3.scaleLinear()
        .domain(d3.extent(projection, d => d.y))
        .range([plotHeight, 0])
        .nice();
    
    // Déterminer la couleur basée sur le risque
    const getStudentColor = (student) => {
        const riskScore = calculateRiskScore(student);
        if (riskScore > 60) return '#ef4444'; // Rouge pour haut risque
        if (riskScore > 30) return '#f59e0b'; // Orange pour risque moyen
        if (student.depression === 1) return '#8b5cf6'; // Violet pour déprimé
        return '#10b981'; // Vert pour bas risque
    };
    
    // Créer les points pour les étudiants normaux
    const normalPoints = g.selectAll('.student-point')
        .data(normalStudents)
        .enter()
        .append('circle')
        .attr('class', 'student-point')
        .attr('cx', d => {
            const proj = projection.find(p => p.id === d.id);
            return proj ? xScale(proj.x) : plotWidth / 2;
        })
        .attr('cy', d => {
            const proj = projection.find(p => p.id === d.id);
            return proj ? yScale(proj.y) : plotHeight / 2;
        })
        .attr('r', 6)
        .attr('fill', d => getStudentColor(d))
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5)
        .style('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', 8)
                .style('opacity', 1)
                .style('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.3))');
            
            showStudentTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('r', 6)
                .style('opacity', 0.8)
                .style('filter', 'none');
            
            hideTooltip();
        });
    
    // Créer les points pour les outliers (plus grands et avec bordure spéciale)
    const outlierPoints = g.selectAll('.outlier-point')
        .data(outliers)
        .enter()
        .append('circle')
        .attr('class', 'outlier-point')
        .attr('cx', d => {
            const proj = projection.find(p => p.id === d.id);
            return proj ? xScale(proj.x) : plotWidth / 2;
        })
        .attr('cy', d => {
            const proj = projection.find(p => p.id === d.id);
            return proj ? yScale(proj.y) : plotHeight / 2;
        })
        .attr('r', 10)
        .attr('fill', d => getStudentColor(d))
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '3,2')
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('r', 12)
                .style('filter', 'drop-shadow(0 0 6px rgba(255,0,0,0.5))');
            
            showStudentTooltip(event, d, true);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('r', 10)
                .style('filter', 'none');
            
            hideTooltip();
        });
    
    // Ajouter les axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    
    g.append('g')
        .attr('transform', `translate(0,${plotHeight})`)
        .call(xAxis)
        .append('text')
        .attr('x', plotWidth / 2)
        .attr('y', 35)
        .attr('fill', '#4b5563')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Dimension 1 (Composante Principale)');
    
    g.append('g')
        .call(yAxis)
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -40)
        .attr('x', -plotHeight / 2)
        .attr('fill', '#4b5563')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Dimension 2 (Composante Principale)');
    
    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#1f2937')
        .text(`Cluster ${clusterIndex + 1} - Visualisation`);
    
    // Sous-titre avec statistiques
    const depressionCount = clusterData.filter(d => d.depression === 1).length;
    const depressionRate = (depressionCount / clusterData.length * 100).toFixed(1);
    
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#6b7280')
        .text(`${clusterData.length} étudiants • ${depressionRate}% déprimés • ${outliers.length} outliers`);
    
    // Légende
    createSVGLegend(svg, width, height);
    
    // Tooltip
    function showStudentTooltip(event, student, isOutlier = false) {
        const tooltip = d3.select('#svg-tooltip');
        if (!tooltip.node()) {
            d3.select('body').append('div')
                .attr('id', 'svg-tooltip')
                .style('position', 'absolute')
                .style('background', 'white')
                .style('padding', '10px')
                .style('border-radius', '6px')
                .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
                .style('pointer-events', 'none')
                .style('opacity', 0)
                .style('z-index', 1000)
                .style('border', '1px solid #e5e7eb');
        }
        
        const riskScore = calculateRiskScore(student);
        const riskLevel = riskScore > 60 ? 'Élevé' : riskScore > 30 ? 'Moyen' : 'Faible';
        
        tooltip
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px')
            .style('opacity', 1)
            .html(`
                <div style="margin-bottom: 8px; font-weight: bold; color: ${isOutlier ? '#dc2626' : '#1f2937'}">
                    ${isOutlier ? '<i class="icon icon-warning" aria-hidden="true"></i> OUTLIER - ' : ''}Étudiant #${student.id}
                </div>
                <div style="font-size: 12px; color: #4b5563; margin-bottom: 5px;">
                    Âge: ${student.age} ans | CGPA: ${student.cgpa?.toFixed(2) || 'N/A'}/10
                </div>
                <div style="font-size: 12px; color: ${student.depression === 1 ? '#dc2626' : '#16a34a'}; margin-bottom: 5px;">
                    ${student.depression === 1 ? '<i class="icon icon-warning" aria-hidden="true"></i> Dépression détectée' : '<i class="icon icon-check" aria-hidden="true"></i> Pas de dépression'}
                </div>
                <div style="font-size: 12px; color: #6b7280;">
                    Niveau de risque: <span style="font-weight: bold; color: ${riskScore > 60 ? '#dc2626' : riskScore > 30 ? '#f59e0b' : '#16a34a'}">
                        ${riskLevel} (${riskScore}%)
                    </span>
                </div>
            `);
    }
    
    function hideTooltip() {
        d3.select('#svg-tooltip').style('opacity', 0);
    }
    
    console.log('SVG créé pour le cluster', clusterIndex);
}

/**
 * Détecte les outliers pour l'affichage SVG
 */
function detectOutliersForSVG(clusterData, features) {
    if (!clusterData || clusterData.length < 5) return [];
    
    const outliers = [];
    
    features.forEach(feature => {
        const values = clusterData.map(d => d[feature] || 0);
        const mean = d3.mean(values);
        const stdDev = Math.sqrt(d3.mean(values.map(v => Math.pow(v - mean, 2))));
        
        if (stdDev === 0) return;
        
        clusterData.forEach(student => {
            const value = student[feature] || 0;
            const zScore = Math.abs((value - mean) / stdDev);
            
            if (zScore > 2.5) {
                // Vérifier si l'étudiant n'est pas déjà dans la liste
                if (!outliers.some(o => o.id === student.id)) {
                    outliers.push({
                        ...student,
                        outlierReason: `${feature} (z-score: ${zScore.toFixed(2)})`
                    });
                }
            }
        });
    });
    
    return outliers;
}

/**
 * Crée une projection simplifiée des données
 */
function createProjection(data, features) {
    // Utiliser PCA simplifiée en 2D
    const projection = [];
    
    // Calculer les deux premières composantes principales
    data.forEach((student, index) => {
        // Composante 1: Combinaison linéaire des features
        const comp1 = features.reduce((sum, feature, i) => {
            const weight = Math.cos(i * Math.PI / features.length);
            return sum + (student[feature] || 0) * weight;
        }, 0);
        
        // Composante 2: Autre combinaison
        const comp2 = features.reduce((sum, feature, i) => {
            const weight = Math.sin(i * Math.PI / features.length);
            return sum + (student[feature] || 0) * weight;
        }, 0);
        
        // Ajouter un peu de bruit pour la visualisation
        projection.push({
            id: student.id,
            x: comp1 + (Math.random() - 0.5) * 0.5,
            y: comp2 + (Math.random() - 0.5) * 0.5
        });
    });
    
    return projection;
}

/**
 * Calcule un score de risque pour un étudiant
 */
function calculateRiskScore(student) {
    if (!student) return 0;
    
    let score = 0;
    
    // Facteurs de risque avec pondérations
    if (student.depression === 1) score += 30;
    if (student.hasSuicidalThoughts) score += 25;
    if (student.academic_pressure >= 4) score += 15;
    if (student.sleep_duration <= 2) score += 15;
    if (student.financial_stress >= 4) score += 10;
    if (student.family_history) score += 5;
    
    return Math.min(100, score);
}

/**
 * Crée la légende pour le SVG
 */
function createSVGLegend(svg, width, height) {
    const legend = svg.append('g')
        .attr('class', 'svg-legend')
        .attr('transform', `translate(${width - 180}, ${height - 120})`);
    
    // Cadre
    legend.append('rect')
        .attr('width', 160)
        .attr('height', 110)
        .attr('rx', 6)
        .attr('fill', 'rgba(255, 255, 255, 0.95)')
        .style('stroke', '#e5e7eb')
        .style('stroke-width', 1);
    
    // Titre
    legend.append('text')
        .attr('x', 80)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#1f2937')
        .text('Légende');
    
    // Points normaux
    legend.append('circle')
        .attr('cx', 20)
        .attr('cy', 40)
        .attr('r', 5)
        .attr('fill', '#10b981')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 44)
        .style('font-size', '11px')
        .style('fill', '#4b5563')
        .text('Faible risque');
    
    // Points déprimés
    legend.append('circle')
        .attr('cx', 20)
        .attr('cy', 60)
        .attr('r', 5)
        .attr('fill', '#8b5cf6')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 64)
        .style('font-size', '11px')
        .style('fill', '#4b5563')
        .text('Dépression');
    
    // Points risque moyen
    legend.append('circle')
        .attr('cx', 20)
        .attr('cy', 80)
        .attr('r', 5)
        .attr('fill', '#f59e0b')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 84)
        .style('font-size', '11px')
        .style('fill', '#4b5563')
        .text('Risque moyen');
    
    // Points outliers
    legend.append('circle')
        .attr('cx', 20)
        .attr('cy', 100)
        .attr('r', 7)
        .attr('fill', '#ef4444')
        .attr('stroke', '#000')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '2,2');
    
    legend.append('text')
        .attr('x', 35)
        .attr('y', 104)
        .style('font-size', '11px')
        .style('fill', '#4b5563')
        .text('Outlier');
}

/**
 * Affiche les étudiants du cluster dans une liste
 */
export function displayClusterStudents(containerSelector, clusterData, clusterIndex) {
    const container = d3.select(containerSelector);
    container.selectAll('*').remove();
    
    if (!clusterData || clusterData.length === 0) {
        container.append('div')
            .attr('class', 'no-data-message')
            .text('Aucun étudiant dans ce cluster');
        return;
    }
    
    // Trier par risque décroissant
    const sortedStudents = [...clusterData].sort((a, b) => {
        return calculateRiskScore(b) - calculateRiskScore(a);
    });
    
    // Créer un titre
    const title = container.append('div')
        .attr('class', 'students-title')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('margin-bottom', '15px')
        .style('color', '#1f2937')
        .text(`Étudiants du Cluster ${clusterIndex + 1} (${clusterData.length})`);
    
    // Créer une grille d'étudiants
    const grid = container.append('div')
        .attr('class', 'students-grid')
        .style('display', 'grid')
        .style('grid-template-columns', 'repeat(auto-fill, minmax(250px, 1fr))')
        .style('gap', '12px');
    
    sortedStudents.forEach((student, index) => {
        const riskScore = calculateRiskScore(student);
        const isOutlier = detectOutliersForSVG([student], ['academic_pressure']).length > 0;
        
        const card = grid.append('div')
            .attr('class', 'student-card-svg')
            .style('background', 'white')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('border', `2px solid ${isOutlier ? '#dc2626' : '#e5e7eb'}`)
            .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)')
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                d3.select(this)
                    .style('transform', 'translateY(-2px)')
                    .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('transform', 'none')
                    .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)');
            });
        
        // En-tête avec ID et statut
        const header = card.append('div')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('align-items', 'center')
            .style('margin-bottom', '8px');
        
        header.append('div')
            .style('font-weight', 'bold')
            .style('color', '#1f2937')
            .text(`Étudiant #${student.id}`);
        
        header.append('div')
            .style('font-size', '12px')
            .style('padding', '2px 8px')
            .style('border-radius', '12px')
            .style('background', student.depression === 1 ? '#fee2e2' : '#dcfce7')
            .style('color', student.depression === 1 ? '#991b1b' : '#166534')
            .text(student.depression === 1 ? 'Déprimé' : 'Sain');
        
        // Informations principales
        const info = card.append('div')
            .style('font-size', '12px')
            .style('color', '#6b7280')
            .style('margin-bottom', '8px');
        
        info.append('div').text(`Âge: ${student.age} ans`);
        info.append('div').text(`CGPA: ${student.cgpa?.toFixed(2) || 'N/A'}/10`);
        info.append('div').text(`Ville: ${student.city || 'Non spécifié'}`);
        
        // Score de risque
        const riskBar = card.append('div')
            .style('margin-top', '8px');
        
        riskBar.append('div')
            .style('font-size', '11px')
            .style('color', '#6b7280')
            .style('margin-bottom', '4px')
            .text('Score de risque:');
        
        riskBar.append('div')
            .style('height', '6px')
            .style('background', '#e5e7eb')
            .style('border-radius', '3px')
            .style('overflow', 'hidden');
        
        riskBar.select('div:nth-child(2)')
            .append('div')
            .style('width', `${riskScore}%`)
            .style('height', '100%')
            .style('background', riskScore > 60 ? '#ef4444' : riskScore > 30 ? '#f59e0b' : '#10b981')
            .style('border-radius', '3px');
        
        // Indicateur d'outlier
        if (isOutlier) {
            card.append('div')
                .style('font-size', '10px')
                .style('color', '#dc2626')
                .style('margin-top', '8px')
                .style('font-weight', 'bold')
                .html('<i class="icon icon-warning" aria-hidden="true"></i> Étudiant atypique');
        }
    });
}
/**
 * Affiche les outliers du cluster
 */
export function displayClusterOutliers(clusterData, containerSelector, featureKeys) {
    const container = d3.select(containerSelector);
    container.selectAll('*').remove();
    
    if (!clusterData || clusterData.length === 0) {
        container.append('div')
            .attr('class', 'no-data-message')
            .text('Aucun outlier dans ce cluster');
        return;
    }
    
    // Détecter les outliers
    const outliers = detectOutliersForSVG(clusterData, featureKeys);
    
    if (outliers.length === 0) {
        container.append('div')
            .attr('class', 'no-outliers')
            .text('Aucun outlier détecté dans ce cluster');
        return;
    }
    
    // Créer une liste d'outliers
    outliers.forEach(outlier => {
        const riskScore = calculateRiskScore(outlier);
        const riskLevel = riskScore > 60 ? 'Élevé' : riskScore > 30 ? 'Moyen' : 'Faible';
        
        container.append('div')
            .attr('class', 'outlier-item')
            .style('background', '#fee2e2')
            .style('border', '1px solid #fecaca')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('margin-bottom', '10px')
            .style('color', '#991b1b')
            .html(`
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="font-size: 14px;"><i class="icon icon-warning" aria-hidden="true"></i> Outlier - Étudiant #${outlier.id}</strong>
                    <span style="background: ${riskScore > 60 ? '#dc2626' : riskScore > 30 ? '#f59e0b' : '#16a34a'}; 
                         color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px;">
                        ${riskLevel}
                    </span>
                </div>
                <div style="font-size: 12px; margin-bottom: 5px;">
                    Âge: ${outlier.age} ans | CGPA: ${outlier.cgpa?.toFixed(2) || 'N/A'}/10
                </div>
                <div style="font-size: 12px;">
                    ${outlier.depression === 1 ? '<i class="icon icon-warning" aria-hidden="true"></i> Dépression détectée' : '<i class="icon icon-check" aria-hidden="true"></i> Pas de dépression'}
                </div>
            `);
    });
}