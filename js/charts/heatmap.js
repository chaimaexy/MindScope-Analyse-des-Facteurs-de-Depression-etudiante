// js/charts/heatmap.js - Version complète avec légende

function createCorrelationHeatmap(container, data, labels) {
    const containerEl = document.querySelector(container);
    if (!containerEl) {
        console.error('Conteneur heatmap non trouvé:', container);
        return;
    }
    
    const width = containerEl.clientWidth;
    const height = containerEl.clientHeight;
    
    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();
    
    if (!data || data.length === 0 || !labels || labels.length === 0) {
        // Message si pas de données
        d3.select(container)
            .append('div')
            .style('text-align', 'center')
            .style('padding', '40px')
            .style('color', '#64748b')
            .html(`
                <p style="margin-bottom: 10px;">📊 Matrice de Corrélation</p>
                <p style="font-size: 12px;">Sélectionnez un cluster pour voir les corrélations</p>
            `);
        return;
    }
    
    // Marges adaptatives selon la taille
    const margin = { 
        top: Math.min(60, height * 0.15), 
        right: Math.min(30, width * 0.1), 
        bottom: Math.min(100, height * 0.25), // Augmenté pour la légende
        left: Math.min(80, width * 0.2) 
    };
    
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = Math.max(100, height - margin.top - margin.bottom);
    
    // Taille de cellule adaptative
    const cellSize = Math.min(
        innerWidth / data.length,
        innerHeight / data[0].length,
        50 // Taille max
    );
    
    // Créer le SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'heatmap-svg');
    
    // Groupe principal
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Échelle de couleur améliorée
    const colorScale = d3.scaleDiverging()
        .domain([-1, 0, 1])
        .interpolator(d3.interpolateRdBu);
    
    // Créer les cellules
    const cells = g.selectAll('.heatmap-cell')
        .data(data.flatMap((row, i) => 
            row.map((value, j) => ({ 
                x: i, 
                y: j, 
                value: Math.min(1, Math.max(-1, value)), // Clamper entre -1 et 1
                labelX: labels?.[i] || `F${i}`,
                labelY: labels?.[j] || `F${j}`,
                absValue: Math.abs(value)
            }))
        ))
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => d.x * cellSize)
        .attr('y', d => d.y * cellSize)
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);
    
    // Labels X (en bas)
    g.selectAll('.x-label')
        .data(labels)
        .enter()
        .append('text')
        .attr('class', 'x-label')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', innerHeight + 20)
        .attr('text-anchor', 'middle')
        .style('font-size', Math.min(11, cellSize / 5) + 'px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .text(d => formatLabel(d, cellSize));
    
    // Labels Y (à gauche)
    g.selectAll('.y-label')
        .data(labels)
        .enter()
        .append('text')
        .attr('class', 'y-label')
        .attr('x', -10)
        .attr('y', (d, i) => i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .style('font-size', Math.min(11, cellSize / 5) + 'px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .text(d => formatLabel(d, cellSize));
    
    // AJOUT DE LA LÉGENDE DES COULEURS
    createColorLegend(svg, width, height, margin, colorScale);
    
    // Tooltip
    const tooltip = d3.select('body') // ← Changer 'container' en 'body'
    .append('div')
    .attr('class', 'heatmap-tooltip')
    .style('position', 'fixed') // ← Changer 'absolute' en 'fixed'
    .style('background', 'white')
    .style('padding', '12px')
    .style('border-radius', '8px')
    .style('box-shadow', '0 4px 20px rgba(0,0,0,0.15)')
    .style('border', '1px solid #e2e8f0')
    .style('font-size', '13px')
    .style('pointer-events', 'none')
    .style('display', 'none')
    .style('z-index', '9999')
    .style('min-width', '200px')
    .style('max-width', '300px')
    .style('font-family', 'Inter, sans-serif')
    .style('line-height', '1.4');
    
    // Événements sur les cellules
    cells.on('mouseover', function(event, d) {
        d3.select(this)
            .attr('stroke', '#1e293b')
            .attr('stroke-width', 2);
        
        tooltip
            .style('display', 'block')
            .style('opacity', 1)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <div style="margin-bottom: 8px; font-weight: 600; color: #1e293b;">
                    Corrélation
                </div>
                <div style="margin-bottom: 6px; color: #475569;">
                    <strong>${formatLabel(d.labelX, 100)}</strong> ↔ 
                    <strong>${formatLabel(d.labelY, 100)}</strong>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 8px; background: ${colorScale(d.value)}; 
                           color: ${Math.abs(d.value) > 0.5 ? 'white' : '#1e293b'}; 
                           border-radius: 4px; font-weight: 600;">
                        ${d.value.toFixed(3)}
                    </span>
                </div>
                <div style="color: #64748b; font-size: 12px;">
                    ${getCorrelationStrength(d.value)}
                </div>
            `);
    })
    .on('mouseout', function() {
        d3.select(this)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
        tooltip.style('display', 'none').style('opacity', 0);
    });
    
    // Titre centré
    svg.append('text')
        .attr('class', 'heatmap-title')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#1e293b')
        .text('Matrice de Corrélation');
}

// Fonction pour créer la légende des couleurs
function createColorLegend(svg, width, height, margin, colorScale) {
    // Dimensions de la légende
    const legendWidth = Math.min(350, width * 0.6);
    const legendHeight = 20;
    const legendX = (width - legendWidth) / 2;
    const legendY = height - 40; // Position en bas
    
    // Créer un groupe pour la légende
    const legend = svg.append('g')
        .attr('class', 'color-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Créer le dégradé
    const defs = svg.append('defs');
    const gradientId = 'color-gradient-' + Math.random().toString(36).substr(2, 9);
    
    const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('x2', '100%')
        .attr('y1', '0%')
        .attr('y2', '0%');
    
    // Ajouter les stops de couleur
    const stops = [
        { offset: '0%', color: colorScale(-1) },   // Bleu (-1)
        { offset: '50%', color: colorScale(0) },   // Blanc (0)
        { offset: '100%', color: colorScale(1) }   // Rouge (1)
    ];
    
    gradient.selectAll('stop')
        .data(stops)
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    
    // Barre de couleur
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#${gradientId})`)
        .style('stroke', '#cbd5e1')
        .style('stroke-width', 1)
        .style('border-radius', '4px');
    
    // Titre de la légende
    legend.append('text')
        .attr('class', 'legend-title')
        .attr('x', legendWidth / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .text('Force de la Corrélation');
    
    // Étiquettes des valeurs
    const labels = [
        { position: 0, text: '-1.0 (Forte négative)', anchor: 'start' },
        { position: legendWidth / 2, text: '0.0 (Neutre)', anchor: 'middle' },
        { position: legendWidth, text: '1.0 (Forte positive)', anchor: 'end' }
    ];
    
    labels.forEach(label => {
        legend.append('text')
            .attr('class', 'legend-label')
            .attr('x', label.position)
            .attr('y', legendHeight + 15)
            .attr('text-anchor', label.anchor)
            .style('font-size', '10px')
            .style('fill', '#64748b')
            .style('font-weight', '400')
            .text(label.text);
    });
    
    // Ajouter des marqueurs intermédiaires (optionnel)
    const markers = [-0.5, 0.5];
    markers.forEach(marker => {
        const xPos = (marker + 1) / 2 * legendWidth;
        
        legend.append('line')
            .attr('x1', xPos)
            .attr('x2', xPos)
            .attr('y1', legendHeight)
            .attr('y2', legendHeight + 5)
            .style('stroke', '#94a3b8')
            .style('stroke-width', 1);
        
        legend.append('text')
            .attr('x', xPos)
            .attr('y', legendHeight + 18)
            .attr('text-anchor', 'middle')
            .style('font-size', '9px')
            .style('fill', '#94a3b8')
            .text(marker.toFixed(1));
    });
}

// Formater les labels pour éviter les superpositions
function formatLabel(label, cellSize) {
    if (!label) return '';
    
    // Raccourcir les labels longs
    const maxLength = Math.floor(cellSize / 6);
    if (label.length > maxLength && maxLength > 3) {
        return label.substring(0, maxLength - 3) + '...';
    }
    
    // Formatter les noms de variables
    return label
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Obtenir la force de la corrélation
function getCorrelationStrength(value) {
    const absValue = Math.abs(value);
    if (absValue >= 0.7) return 'Corrélation forte';
    if (absValue >= 0.3) return 'Corrélation modérée';
    if (absValue >= 0.1) return 'Corrélation faible';
    return 'Pas de corrélation significative';
}

// Version alternative avec légende plus compacte
function createCompactColorLegend(svg, width, height, colorScale) {
    const legendWidth = 200;
    const legendHeight = 15;
    const legendX = width - legendWidth - 20;
    const legendY = 40;
    
    const legend = svg.append('g')
        .attr('class', 'compact-color-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
    
    // Barre de couleur
    const gradient = legend.append('defs')
        .append('linearGradient')
        .attr('id', 'compact-gradient')
        .selectAll('stop')
        .data([
            { offset: '0%', color: colorScale(-1) },
            { offset: '50%', color: colorScale(0) },
            { offset: '100%', color: colorScale(1) }
        ])
        .enter()
        .append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);
    
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#compact-gradient)')
        .style('stroke', '#cbd5e1')
        .style('stroke-width', 0.5);
    
    // Étiquettes minimales
    [-1, 0, 1].forEach((val, i) => {
        const x = (i / 2) * legendWidth;
        legend.append('text')
            .attr('x', x)
            .attr('y', legendHeight + 12)
            .attr('text-anchor', i === 0 ? 'middle' : i === 1 ? 'end' : 'start')
            .style('font-size', '9px')
            .style('fill', '#64748b')
            .text(val);
    });
    
    // Titre
    legend.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#475569')
        .text('Corrélation');
}