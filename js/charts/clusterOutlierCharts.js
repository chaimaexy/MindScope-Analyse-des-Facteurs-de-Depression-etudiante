// js/charts/clusterOutliersChart.js

/**
 * Crée un graphique montrant les étudiants d'un cluster avec les outliers en couleur distincte
 * @param {string} containerId - ID du conteneur SVG
 * @param {Array} clusterData - Données du cluster
 * @param {Array} outliers - Liste des outliers détectés
 * @param {number} clusterId - ID du cluster
 */
function createClusterOutliersChart(containerId, clusterData, outliers, clusterId) {

    const container = d3.select(containerId);
    container.selectAll('*').remove();

    if (!clusterData || clusterData.length === 0) {
        container.append('div').text('Aucune donnée');
        return;
    }

    // 1️⃣ Map ID → score d’outlier
    const scoreById = new Map(outliers.map(o => [o.id, o.outlierScore]));

    // 2️⃣ Préparer les données triées par ID
    const data = clusterData
        .slice()
        .sort((a, b) => a.id - b.id)
        .map(d => ({
            id: d.id,
            cgpa: d.cgpa,
            age: d.age,
            score: scoreById.get(d.id) || 0
        }));

    // 3️⃣ Dimensions
    const width = 520;
    const height = 360;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    // 4️⃣ Scales
    const xExtent = d3.extent(data, d => d.cgpa);
    const yExtent = d3.extent(data, d => d.age);

    const xScale = d3.scaleLinear().domain(xExtent).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain(yExtent).range([height - margin.bottom, margin.top]);

    // Couleur selon score d’outlier : rouge = fort outlier, bleu = faible
    const maxScore = 10; 

    // 5️⃣ Calculer la taille des rectangles (pour 5000 étudiants)
    const rectWidth = Math.max((width - margin.left - margin.right) / 100, 1);
    const rectHeight = Math.max((height - margin.top - margin.bottom) / 50, 1);

    const color = d => d.score > 0 ? 'red' : 'blue';


    // 6️⃣ Ajouter les rectangles pour chaque étudiant
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.cgpa) - rectWidth / 2)
        .attr('y', d => yScale(d.age) - rectHeight / 2)
        .attr('width', rectWidth)
        .attr('height', rectHeight)
        .attr('fill', color)
        .append('title')
        .text(d => `ID: ${d.id}\nCGPA: ${d.cgpa}\nAge: ${d.age}\nScore Outlier: ${d.score.toFixed(2)}`);

    // 7️⃣ Axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

    // 8️⃣ Labels et titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .style('font-weight', '600')
        .text(`Cluster ${clusterId + 1} — Heatmap des Étudiants`);

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .text('CGPA');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text('Âge');
}











/**
 * Sélectionne les 2 features les plus discriminantes pour la visualisation
 */
function selectMostDiscriminantFeatures(clusterData, allFeatures) {
    if (!clusterData || clusterData.length < 2) {
        return { x: allFeatures[0], y: allFeatures[1] };
    }
    
    // Calculer la variance pour chaque feature
    const variances = allFeatures.map(feature => {
        const values = clusterData.map(d => d[feature] || 0).filter(v => !isNaN(v));
        if (values.length < 2) return { feature, variance: 0 };
        
        const mean = d3.mean(values);
        const variance = d3.mean(values.map(v => Math.pow(v - mean, 2)));
        return { feature, variance };
    });
    
    // Trier par variance décroissante
    variances.sort((a, b) => b.variance - a.variance);
    
    return {
        x: variances[0]?.feature || allFeatures[0],
        y: variances[1]?.feature || allFeatures[1]
    };
}

/**
 * Calcule un score d'outlier simplifié pour un étudiant
 */
function calculateOutlierScore(student, clusterData) {
    if (!student || !clusterData || clusterData.length === 0) return 0;
    
    const features = CONFIG.featureKeys.filter(key => 
        student[key] !== undefined && student[key] !== null
    );
    
    let totalDistance = 0;
    
    features.forEach(key => {
        const studentValue = student[key] || 0;
        const clusterValues = clusterData.map(d => d[key] || 0);
        const mean = d3.mean(clusterValues);
        const std = Math.sqrt(d3.mean(clusterValues.map(v => Math.pow(v - mean, 2))));
        
        if (std > 0) {
            const zScore = Math.abs((studentValue - mean) / std);
            totalDistance += zScore;
        }
    });
    
    return totalDistance / features.length;
}

/**
 * Affiche une liste améliorée des outliers
 */
function displayEnhancedOutliersList(containerId, outliers) {
    const container = d3.select(containerId);
    container.selectAll('*').remove();
    
    if (!outliers || outliers.length === 0) {
        container.append('div')
            .style('text-align', 'center')
            .style('padding', '20px')
            .style('color', '#16a34a')
            .html(`
                <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
                <div style="font-size: 14px; font-weight: 600;">Aucun outlier détecté</div>
                <div style="font-size: 12px;">Tous les étudiants suivent les tendances du cluster</div>
            `);
        return;
    }
    
    // Trier par score décroissant
    const sortedOutliers = [...outliers].sort((a, b) => b.outlierScore - a.outlierScore);
    
    // Créer un conteneur de tableau
    const table = container.append('table')
        .style('width', '100%')
        .style('border-collapse', 'collapse')
        .style('font-size', '12px');
    
    // En-tête
    const thead = table.append('thead');
    thead.append('tr')
        .selectAll('th')
        .data(['Étudiant', 'Score Outlier', 'Raisons', 'Statut', 'Actions'])
        .enter()
        .append('th')
        .text(d => d)
        .style('text-align', 'left')
        .style('padding', '12px 8px')
        .style('background', '#f9fafb')
        .style('border-bottom', '2px solid #e5e7eb')
        .style('color', '#374151')
        .style('font-weight', '600');
    
    // Corps
    const tbody = table.append('tbody');
    
    const rows = tbody.selectAll('tr')
        .data(sortedOutliers)
        .enter()
        .append('tr')
        .style('border-bottom', '1px solid #f3f4f6')
        .style('transition', 'background 0.2s');
    
    rows.on('mouseover', function() {
        d3.select(this).style('background', '#f9fafb');
    })
    .on('mouseout', function() {
        d3.select(this).style('background', 'white');
    });
    
    // Cellules
    rows.append('td')
        .style('padding', '12px 8px')
        .html(d => `
            <div style="font-weight: 600; color: #1f2937;">
                Étudiant #${d.student?.id || 'N/A'}
            </div>
            <div style="font-size: 11px; color: #6b7280;">
                Âge: ${d.student?.age || 'N/A'} ans
            </div>
        `);
    
    rows.append('td')
        .style('padding', '12px 8px')
        .html(d => {
            const score = d.outlierScore || 0;
            let color = '#16a34a';
            if (score > 2) color = '#dc2626';
            else if (score > 1.5) color = '#f59e0b';
            
            return `
                <div style="display: inline-block; background: ${color}; 
                      color: white; padding: 4px 8px; border-radius: 12px; 
                      font-weight: 600; font-size: 11px;">
                    ${score.toFixed(2)}
                </div>
            `;
        });
    
    rows.append('td')
        .style('padding', '12px 8px')
        .html(d => `
            <div style="max-width: 200px;">
                ${(d.reasons || []).slice(0, 2).map(reason => `
                    <div style="margin-bottom: 2px; font-size: 11px; color: #4b5563;">
                        • ${reason}
                    </div>
                `).join('')}
            </div>
        `);
    
    rows.append('td')
        .style('padding', '12px 8px')
        .html(d => {
            const isDepressed = d.student?.depression === 1;
            return `
                <div style="display: inline-block; 
                      background: ${isDepressed ? '#fee2e2' : '#dcfce7'}; 
                      color: ${isDepressed ? '#991b1b' : '#166534'}; 
                      padding: 4px 8px; border-radius: 12px; 
                      font-weight: 500; font-size: 11px;">
                    ${isDepressed ? '⚠️ Déprimé' : '✅ Sain'}
                </div>
            `;
        });
    
    rows.append('td')
        .style('padding', '12px 8px')
        .html(d => `
            <button class="view-student-btn" 
                    data-student="${d.student?.id}"
                    style="background: #4f46e5; color: white; border: none; 
                           padding: 6px 12px; border-radius: 6px; font-size: 11px;
                           cursor: pointer; transition: background 0.2s;">
                👁️ Voir
            </button>
        `);
    
    // Événements pour les boutons
    container.selectAll('.view-student-btn').on('click', function(event) {
        event.stopPropagation();
        const studentId = parseInt(d3.select(this).attr('data-student'));
        const student = processedData.find(d => d.id === studentId);
        if (student) {
            selectStudent(student);
        }
    });
}