// js/charts/sunburstChart.js

const SUNBURST_COLORS = [
    '#4E79A7', '#F28E2C', '#E15759', '#76B7B2', '#59A14F',
    '#EDC949', '#AF7AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
    '#6B8E23', '#FF6B6B', '#48DBFB', '#9B59B6', '#1ABC9C',
    '#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#E67E22'
];

function createSunburstChart(container, data, clusters) {
    console.log('Création du sunburst chart...');
    
    // Nettoyer le conteneur
    const containerEl = document.querySelector(container);
    if (!containerEl) {
        console.error('Conteneur non trouvé:', container);
        return;
    }
    
    d3.select(container).selectAll('*').remove();
    
    // Préparer les données pour le sunburst
    const sunburstData = prepareSunburstData(clusters);
    console.log('Données sunburst:', sunburstData);
    
    // Dimensions
    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight || 600;
    const radius = Math.min(width, height) / 2 - 40;
    
    // Créer SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)')
        .style('border-radius', '12px')
        .style('box-shadow', 'inset 0 1px 3px rgba(0,0,0,0.05)');
    
    const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`);
    
    // Partition layout
    const partition = d3.partition()
        .size([2 * Math.PI, radius]);
    
    const root = d3.hierarchy(sunburstData)
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);
    
    partition(root);
    
    // Arc generator
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);
    
    // Créer les arcs
    const arcs = g.selectAll('path')
        .data(root.descendants().filter(d => d.depth > 0))
        .enter()
        .append('path')
        .attr('d', arc)
        .style('fill', d => {
            if (d.depth === 1) {
                // Niveau cluster - couleur unique
                return SUNBURST_COLORS[d.data.clusterId % SUNBURST_COLORS.length];
            } else {
                // Niveau caractéristique - nuance de la couleur du cluster
                const baseColor = d3.color(SUNBURST_COLORS[d.parent.data.clusterId % SUNBURST_COLORS.length]);
                return d3.interpolateRgb(baseColor.brighter(0.8), baseColor.darker(0.3))(d.data.value / 100);
            }
        })
        .style('stroke', 'white')
        .style('stroke-width', '1.5px')
        .style('opacity', 0.9)
        .style('cursor', 'pointer')
        .style('transition', 'opacity 0.2s, filter 0.2s')
        .on('mouseover', function(event, d) {
            // Survol
            d3.select(this)
                .style('opacity', 1)
                .style('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.2))');
            
            showTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            // Retour à la normale
            d3.select(this)
                .style('opacity', 0.9)
                .style('filter', 'none');
            
            hideTooltip();
        })
        .on('click', function(event, d) {
            if (d.depth === 1) {
                selectCluster(d.data.clusterId);
            }
        });
    
    // Ajouter des labels pour les clusters
    const clusterLabels = g.selectAll('.cluster-label')
        .data(root.descendants().filter(d => d.depth === 1))
        .enter()
        .append('text')
        .attr('class', 'cluster-label')
        .attr('transform', d => {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('fill', 'white')
        .style('text-shadow', '0 1px 3px rgba(0,0,0,0.5)')
        .style('pointer-events', 'none')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text(d => `Cluster ${d.data.clusterId + 1}`);
    
    // Ajouter des labels pour les caractéristiques (plus petites)
    const featureLabels = g.selectAll('.feature-label')
        .data(root.descendants().filter(d => d.depth === 2 && (d.x1 - d.x0) > 0.1))
        .enter()
        .append('text')
        .attr('class', 'feature-label')
        .attr('transform', d => {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', '#1f2937')
        .style('pointer-events', 'none')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text(d => d.data.name.substring(0, 10));
    
    // Légende
    createSunburstLegend(svg, clusters, width, height);
    
    // Tooltip
    if (!d3.select('#sunburst-tooltip').node()) {
        d3.select(container)
            .append('div')
            .attr('id', 'sunburst-tooltip')
            .attr('class', 'sunburst-tooltip')
            .style('position', 'absolute')
            .style('padding', '12px')
            .style('background', 'white')
            .style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', 1000)
            .style('max-width', '300px')
            .style('border', '1px solid #e5e7eb')
            .style('font-family', "'Segoe UI', system-ui, sans-serif");
    }
    
    // Titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', '700')
        .style('fill', '#1f2937')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text('Visualisation des Clusters - Sunburst');
    
    // Sous-titre
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#6b7280')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text('Cliquez sur un cluster pour voir ses caractéristiques');
    
    // Fonctions d'interaction
    function showTooltip(event, d) {
        const tooltip = d3.select('#sunburst-tooltip');
        
        let content = '';
        
        if (d.depth === 1) {
            // Tooltip pour cluster
            const stats = calculateClusterStats([clusters[d.data.clusterId]])[0];
            content = `
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="color: ${SUNBURST_COLORS[d.data.clusterId % SUNBURST_COLORS.length]}; font-size: 16px;">
                        Cluster ${d.data.clusterId + 1}
                    </strong>
                    <span style="background: ${getRiskColor(stats.riskLevel)}; color: white; padding: 3px 10px; 
                          border-radius: 12px; font-size: 10px; font-weight: 700;">
                        ${stats.riskLevel.toUpperCase()}
                    </span>
                </div>
                
                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin: 8px 0; text-align: center;">
                    <div style="font-size: 24px; font-weight: 700; color: #1f2937;">${d.data.value}</div>
                    <div style="font-size: 12px; color: #6b7280;">étudiants</div>
                    <div style="margin-top: 6px; font-size: 13px; color: ${stats.depressionRate > 30 ? '#dc2626' : '#16a34a'}; font-weight: 600;">
                        ${stats.depressionRate.toFixed(1)}% déprimés
                    </div>
                </div>
                
                <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                    <div style="font-weight: 600; margin-bottom: 4px;">Caractéristiques principales:</div>
                    <div>${d.data.children.map(c => c.name).join(', ')}</div>
                </div>
            `;
        } else {
            // Tooltip pour caractéristique
            content = `
                <div style="margin-bottom: 8px;">
                    <strong style="color: #4f46e5; font-size: 14px;">${d.data.name}</strong>
                </div>
                
                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin: 8px 0; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700; color: #1f2937;">${d.data.value}</div>
                    <div style="font-size: 12px; color: #6b7280;">score moyen</div>
                </div>
                
                <div style="font-size: 12px; color: #6b7280;">
                    Cluster: <strong style="color: #1f2937;">${d.parent.data.clusterId + 1}</strong>
                </div>
            `;
        }
        
        tooltip
            .html(content)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px')
            .style('opacity', 1);
    }
    
    function hideTooltip() {
        d3.select('#sunburst-tooltip').style('opacity', 0);
    }
    
    function selectCluster(clusterId) {
    console.log('Cluster sélectionné depuis Sunburst:', clusterId);
    
    // 1. Dispatcher un événement global
    const event = new CustomEvent('sunburstClusterSelected', { 
        detail: { clusterId: clusterId } 
    });
    window.dispatchEvent(event);
    
    // 2. (Optionnel) Mettre à jour la légende si nécessaire)
    updateLegendSelection(clusterId);
}
    
    console.log('✅ Sunburst chart créé avec succès');
}

// Préparer les données pour le sunburst
function prepareSunburstData(clusters) {
    const root = {
        name: "Clusters",
        children: []
    };
    
    clusters.forEach((cluster, clusterId) => {
        if (cluster.length === 0) return;
        
        // Calculer les statistiques pour ce cluster
        const stats = calculateClusterStats([cluster])[0];
        
        // Créer l'entrée pour ce cluster
        const clusterNode = {
            name: `Cluster ${clusterId + 1}`,
            clusterId: clusterId,
            value: cluster.length,
            children: []
        };
        
        // Ajouter les caractéristiques comme enfants
        const features = [
            { name: 'Dépression', value: stats.depressionRate },
            { name: 'Stress Académique', value: stats.avgAcademic * 20 }, // Normalisé
            { name: 'Sommeil', value: stats.avgSleep * 20 }, // Normalisé
            { name: 'Stress Financier', value: stats.avgFinancial * 20 }, // Normalisé
            { name: 'CGPA', value: stats.avgCGPA * 10 }, // Normalisé
            { name: 'Satisfaction', value: stats.avgSatisfaction * 20 } // Normalisé
        ];
        
        // Garder seulement les 4 caractéristiques principales
        features.sort((a, b) => b.value - a.value);
        const topFeatures = features.slice(0, 4);
        
        topFeatures.forEach(feature => {
            clusterNode.children.push({
                name: feature.name,
                value: feature.value
            });
        });
        
        root.children.push(clusterNode);
    });
    
    return root;
}

// Calculer les statistiques des clusters (version simplifiée)
function calculateClusterStats(clusters) {
    return clusters.map((cluster, id) => {
        if (!cluster || cluster.length === 0) {
            return {
                id: id,
                size: 0,
                depressionRate: 0,
                avgAge: 0,
                avgCGPA: 0,
                avgSleep: 0,
                avgAcademic: 0,
                avgFinancial: 0,
                avgSatisfaction: 0,
                riskLevel: 'low'
            };
        }
        
        const size = cluster.length;
        const depressionRate = (cluster.filter(d => d.depression === 1).length / size) * 100;
        const avgAge = d3.mean(cluster, d => d.age) || 0;
        const avgCGPA = d3.mean(cluster, d => d.cgpa) || 0;
        const avgSleep = d3.mean(cluster, d => d.sleep_duration) || 0;
        const avgAcademic = d3.mean(cluster, d => d.academic_pressure) || 0;
        const avgFinancial = d3.mean(cluster, d => d.financial_stress) || 0;
        const avgSatisfaction = d3.mean(cluster, d => d.study_satisfaction) || 0;
        
        let riskLevel = 'low';
        if (depressionRate > 40) riskLevel = 'high';
        else if (depressionRate > 20) riskLevel = 'medium';
        
        return {
            id: id,
            size: size,
            depressionRate: depressionRate,
            avgAge: avgAge,
            avgCGPA: avgCGPA,
            avgSleep: avgSleep,
            avgAcademic: avgAcademic,
            avgFinancial: avgFinancial,
            avgSatisfaction: avgSatisfaction,
            riskLevel: riskLevel
        };
    });
}

// Obtenir la couleur du risque
function getRiskColor(riskLevel) {
    const colors = {
        high: '#dc2626',
        medium: '#f59e0b',
        low: '#16a34a'
    };
    return colors[riskLevel] || '#6b7280';
}

// Créer la légende pour le sunburst
function createSunburstLegend(svg, clusters, width, height) {
    const legend = svg.append('g')
        .attr('class', 'sunburst-legend')
        .attr('transform', `translate(${width - 220}, 80)`);
    
    // Cadre de légende
    legend.append('rect')
        .attr('width', 200)
        .attr('height', 180)
        .attr('rx', 8)
        .attr('fill', 'rgba(255, 255, 255, 0.95)')
        .style('stroke', '#e5e7eb')
        .style('stroke-width', 1)
        .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))');
    
    // Titre
    legend.append('text')
        .attr('x', 100)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('fill', '#1f2937')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text('Légende des Clusters');
    
    // Explication
    legend.append('text')
        .attr('x', 100)
        .attr('y', 45)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#6b7280')
        .style('font-family', "'Segoe UI', system-ui, sans-serif")
        .text('Cercle extérieur = Caractéristiques');
    
    // Afficher les 6 premiers clusters (ou tous si moins de 6)
    const numClustersToShow = Math.min(6, clusters.length);
    
    for (let i = 0; i < numClustersToShow; i++) {
        const y = 70 + i * 22;
        
        // Carré de couleur
        legend.append('rect')
            .attr('x', 20)
            .attr('y', y - 8)
            .attr('width', 12)
            .attr('height', 12)
            .attr('rx', 2)
            .attr('fill', SUNBURST_COLORS[i % SUNBURST_COLORS.length]);
        
        // Nom du cluster
        legend.append('text')
            .attr('x', 40)
            .attr('y', y)
            .style('font-size', '12px')
            .style('fill', '#4b5563')
            .style('font-family', "'Segoe UI', system-ui, sans-serif")
            .text(`Cluster ${i + 1}`);
        
        // Nombre d'étudiants
        legend.append('text')
            .attr('x', 180)
            .attr('y', y)
            .attr('text-anchor', 'end')
            .style('font-size', '11px')
            .style('fill', '#9ca3af')
            .style('font-family', "'Segoe UI', system-ui, sans-serif")
            .text(`${clusters[i]?.length || 0} étud.`);
    }
    
    // Note
    if (clusters.length > 6) {
        legend.append('text')
            .attr('x', 100)
            .attr('y', 170)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#9ca3af')
            .style('font-style', 'italic')
            .style('font-family', "'Segoe UI', system-ui, sans-serif")
            .text(`+ ${clusters.length - 6} clusters supplémentaires`);
    }
}