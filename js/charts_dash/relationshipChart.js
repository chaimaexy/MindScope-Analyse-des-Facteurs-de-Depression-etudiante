// js/charts_dash/relationshipChart.js
// Graphique de relation entre une variable et la dépression

let relationshipChartInitialized = false;
let relationshipChart = null;
let selectedVariable = null; // Variable pour suivre la variable sélectionnée (comme selectedCategory dans pie chart)

function initRelationshipChart() {
    if (relationshipChartInitialized) return;
    
    const container = d3.select('#relationship-chart');
    if (container.empty()) return;
    
    const width = container.node().clientWidth;
    const height = 350;
    const margin = { top: 60, right: 30, bottom: 70, left: 60 };
    
    // Créer le SVG
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'relationship-line-chart');
    
    // Ajouter un rectangle de fond
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#f8fafc')
        .attr('rx', 8);
    
    relationshipChart = {
        svg,
        width,
        height,
        margin
    };
    
    // Événement pour fermer le graphique (comme le bouton de réinitialisation du pie chart)
    document.getElementById('close-relationship-chart')?.addEventListener('click', () => {
        selectedVariable = null;
        hideRelationshipChart();
    });
    
    relationshipChartInitialized = true;
}

function showRelationshipChart(variable) {
    // Comme dans pie chart: si on clique sur la même variable, on la désélectionne
    if (selectedVariable === variable) {
        selectedVariable = null;
        hideRelationshipChart();
        return;
    }
    
    // Sinon, sélectionner cette variable
    selectedVariable = variable;
    
    // Mettre à jour le titre (comme dans pie chart)
    const variableNames = {
        'sleep_duration': 'Sommeil',
        'academic_pressure': 'Pression Académique',
        'dietary_habits': 'Habitudes Alimentaires',
        'financial_stress': 'Stress Financier'
    };
    
    const variableName = variableNames[variable] || variable;
    
    // Mettre à jour les éléments HTML - MÊME PATTERN QUE PIE CHART
    document.getElementById('selected-variable').textContent = variableName;
    document.getElementById('relationship-chart-title').innerHTML = 
        `Analyse Détail - <span id="selected-variable">${variableName}</span>`;
    
    // Afficher la section
    const section = document.getElementById('relationship-chart-section');
    if (section) {
        section.classList.remove('hidden');
        
        // Scroll vers le bas (comme feedback visuel)
        setTimeout(() => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    
    // Mettre à jour le graphique (comme updatePieChart)
    updateRelationshipChart();
}

function hideRelationshipChart() {
    const section = document.getElementById('relationship-chart-section');
    if (section) {
        section.classList.add('hidden');
    }
    // Note: On ne réinitialise pas selectedVariable ici car c'est fait dans l'appelant
    // Cela suit le pattern du pie chart où resetPieSelection() réinitialise selectedCategory
}

function updateRelationshipChart() {
    if (!relationshipChartInitialized || !relationshipChart || !selectedVariable) return;
    
    const data = getFilteredData();
    
    if (data.length === 0) {
        displayNoRelationshipDataMessage();
        return;
    }
    
    // Préparer les données selon la variable
    let chartData;
    let xLabel, yLabel;
    let color = '#3b82f6';
    
    const variableNames = {
        'sleep_duration': 'Sommeil',
        'academic_pressure': 'Pression Académique',
        'dietary_habits': 'Habitudes Alimentaires', 
        'financial_stress': 'Stress Financier'
    };
    
    const variableName = variableNames[selectedVariable] || selectedVariable;
    
    // Mettre à jour le titre
    document.getElementById('relationship-chart-title').innerHTML = 
        `Analyse Détail - <span id="selected-variable">${variableName}</span>`;
    
    switch(selectedVariable) {
        case 'sleep_duration':
            chartData = prepareSleepData(data);
            xLabel = 'Heures de sommeil par nuit';
            yLabel = '% d\'étudiants déprimés';
            color = '#3eb698'; // Vert
            break;
            
        case 'academic_pressure':
            chartData = prepareAcademicPressureData(data);
            xLabel = 'Niveau de pression académique (1-5)';
            yLabel = '% d\'étudiants déprimés';
            color = '#f25656'; // Rouge
            break;
            
        case 'dietary_habits':
            chartData = prepareDietaryHabitsData(data);
            xLabel = 'Qualité des habitudes alimentaires (1-5)';
            yLabel = '% d\'étudiants déprimés';
            color = 'hsl(34, 98%, 69%)'; // Orange
            break;
            
        case 'financial_stress':
            chartData = prepareFinancialStressData(data);
            xLabel = 'Niveau de stress financier (1-5)';
            yLabel = '% d\'étudiants déprimés';
            color = '#3761fa'; // Bleu
            break;
            
        default:
            return;
    }
    
    // Nettoyer le SVG
    relationshipChart.svg.selectAll('g').remove();
    
    // Dimensions
    const chartWidth = relationshipChart.width - relationshipChart.margin.left - relationshipChart.margin.right;
    const chartHeight = relationshipChart.height - relationshipChart.margin.top - relationshipChart.margin.bottom;
    
    // Groupe principal
    const g = relationshipChart.svg.append('g')
        .attr('transform', `translate(${relationshipChart.margin.left}, ${relationshipChart.margin.top})`);
    
    // Échelles
    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.x))
        .range([0, chartWidth])
        .nice();
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.rate) * 1.1])
        .range([chartHeight, 0])
        .nice();
    
    // Grille
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat('')
        )
        .style('stroke', '#e2e8f0')
        .style('stroke-width', 0.5)
        .style('stroke-dasharray', '2,2');
    
    // Axe X
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x))
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // Axe Y
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y)
            .tickFormat(d => `${d}%`)
        )
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // Labels des axes
    g.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 50)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '600')
        .text(xLabel);
    
    g.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', -45)
        .attr('x', -chartHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '600')
        .text(yLabel);
    
    // Ligne de tendance
    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.rate))
        .curve(d3.curveMonotoneX);
    
    // Aire sous la courbe
    const area = d3.area()
        .x(d => x(d.x))
        .y0(chartHeight)
        .y1(d => y(d.rate))
        .curve(d3.curveMonotoneX);
    
    // Dessiner l'aire
    g.append('path')
        .datum(chartData)
        .attr('class', 'line-chart-area')
        .attr('d', area)
        .attr('fill', color)
        .attr('fill-opacity', 0.1);
    
    // Dessiner la ligne
    g.append('path')
        .datum(chartData)
        .attr('class', 'line-path')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 3);
    
    // Ajouter les points
    const points = g.selectAll('.line-chart-point')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('class', 'line-chart-point')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.rate))
        .attr('r', 4)
        .attr('fill', color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            showRelationshipTooltip(event, d, selectedVariable);
            
            d3.select(this)
                .attr('r', 6)
                .attr('stroke-width', 3);
        })
        .on('mouseleave', function() {
            hideRelationshipTooltip();
            
            d3.select(this)
                .attr('r', 4)
                .attr('stroke-width', 2);
        })
        .on('click', function(event, d) {
            // Comme dans pie chart: possibilité de cliquer sur les points pour plus d'infos
            event.stopPropagation();
            console.log(`Point cliqué: ${d.x} → ${d.rate}% de dépression`);
        });
    
    // Ajouter les valeurs sur les points (si assez de données)
    chartData.forEach(d => {
        if (d.total > 3) {
            g.append('text')
                .attr('class', 'point-value')
                .attr('x', x(d.x))
                .attr('y', y(d.rate) - 10)
                .attr('text-anchor', 'middle')
                .style('font-size', '10px')
                .style('fill', '#475569')
                .style('font-weight', '600')
                .style('pointer-events', 'none')
                .text(`${d.rate}%`);
        }
    });
    
    // Ligne de référence à 50%
    g.append('line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', y(50))
        .attr('y2', y(50))
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);
    
    g.append('text')
        .attr('x', chartWidth - 5)
        .attr('y', y(50) - 5)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#94a3b8')
        .style('font-style', 'italic')
        .text('50% de référence');
    
    // Mettre à jour la légende - MÊME PATTERN QUE PIE CHART
    updateRelationshipLegend(chartData, color, selectedVariable);
}

// Fonctions de préparation des données (inchangées)
function prepareSleepData(data) {
    const groups = {};
    
    data.forEach(d => {
        const hours = Math.round(d.sleep_duration);
        if (!groups[hours]) {
            groups[hours] = { total: 0, depressed: 0 };
        }
        groups[hours].total++;
        if (d.depression === 1) {
            groups[hours].depressed++;
        }
    });
    
    return Object.entries(groups)
        .map(([hours, stats]) => ({
            x: parseInt(hours),
            total: stats.total,
            depressed: stats.depressed,
            rate: Math.round((stats.depressed / stats.total) * 100)
        }))
        .sort((a, b) => a.x - b.x);
}

function prepareAcademicPressureData(data) {
    const groups = {};
    
    for (let i = 1; i <= 5; i++) {
        const groupData = data.filter(d => Math.round(d.academic_pressure) === i);
        if (groupData.length > 0) {
            const depressed = groupData.filter(d => d.depression === 1).length;
            groups[i] = {
                x: i,
                total: groupData.length,
                depressed: depressed,
                rate: Math.round((depressed / groupData.length) * 100)
            };
        }
    }
    
    return Object.values(groups);
}

function prepareDietaryHabitsData(data) {
    const groups = {};
    
    for (let i = 1; i <= 5; i++) {
        const groupData = data.filter(d => Math.round(d.dietary_habits) === i);
        if (groupData.length > 0) {
            const depressed = groupData.filter(d => d.depression === 1).length;
            groups[i] = {
                x: i,
                total: groupData.length,
                depressed: depressed,
                rate: Math.round((depressed / groupData.length) * 100)
            };
        }
    }
    
    return Object.values(groups);
}

function prepareFinancialStressData(data) {
    const groups = {};
    
    for (let i = 1; i <= 5; i++) {
        const groupData = data.filter(d => Math.round(d.financial_stress) === i);
        if (groupData.length > 0) {
            const depressed = groupData.filter(d => d.depression === 1).length;
            groups[i] = {
                x: i,
                total: groupData.length,
                depressed: depressed,
                rate: Math.round((depressed / groupData.length) * 100)
            };
        }
    }
    
    return Object.values(groups);
}

function showRelationshipTooltip(event, d, variable) {
    const variableNames = {
        'sleep_duration': 'heures de sommeil',
        'academic_pressure': 'niveau de pression académique',
        'dietary_habits': 'qualité des habitudes alimentaires',
        'financial_stress': 'niveau de stress financier'
    };
    
    const tooltip = d3.select('#relationship-tooltip');
    if (tooltip.empty()) {
        d3.select('body')
            .append('div')
            .attr('id', 'relationship-tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('box-shadow', '0 4px 20px rgba(0,0,0,0.1)')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('font-family', 'system-ui, sans-serif')
            .style('font-size', '12px')
            .style('max-width', '300px');
    }
    
    tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px')
        .html(`
            <div style="margin-bottom: 8px;">
                <strong style="color: #1e293b;">${d.x} ${variableNames[variable] || ''}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b;">Étudiants déprimés:</span>
                <span style="font-weight: 600; color: #ef4444;">${d.depressed}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b;">Total étudiants:</span>
                <span style="font-weight: 600; color: #1e293b;">${d.total}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Taux de dépression:</span>
                <span style="font-weight: 700; color: #3b82f6;">${d.rate}%</span>
            </div>
        `);
}

function hideRelationshipTooltip() {
    d3.select('#relationship-tooltip')
        .style('display', 'none');
}

// Légende avec bouton de réinitialisation - MÊME PATTERN QUE PIE CHART
function updateRelationshipLegend(chartData, color, variable) {
    const legendContainer = d3.select('#relationship-legend');
    if (legendContainer.empty()) return;
    
    legendContainer.html('');
    
    const variableNames = {
        'sleep_duration': 'Sommeil',
        'academic_pressure': 'Pression Académique',
        'dietary_habits': 'Habitudes Alimentaires',
        'financial_stress': 'Stress Financier'
    };
    
    const variableName = variableNames[variable] || variable;
    const avgRate = d3.mean(chartData, d => d.rate);
    const minRate = d3.min(chartData, d => d.rate);
    const maxRate = d3.max(chartData, d => d.rate);
    
    const legend = legendContainer
        .append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '20px')
        .style('font-size', '12px')
        .style('flex-wrap', 'wrap');
    
    // Informations sur la variable - comme les légendes du pie chart
    const variableInfo = legend
        .append('div')
        .attr('class', 'legend-item')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '10px')
        .style('padding', '8px 12px')
        .style('background', 'white')
        .style('border', `2px solid ${color}`) // Bordure colorée comme sélectionnée
        .style('border-radius', '6px')
        .style('cursor', 'pointer')
        .style('transition', 'all 0.2s ease')
        .on('click', () => {
            // Si on clique sur la légende, ça ferme le graphique (comme re-cliquer sur la barre)
            selectedVariable = null;
            hideRelationshipChart();
        });
    
    variableInfo
        .append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('background-color', color)
        .style('border-radius', '3px')
        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.2)');
    
    const textContainer = variableInfo
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column');
    
    textContainer
        .append('div')
        .style('font-size', '12px')
        .style('font-weight', '700') // Gras car sélectionné
        .style('color', color) // Couleur de la variable
        .text(variableName);
    
    textContainer
        .append('div')
        .style('font-size', '10px')
        .style('color', '#64748b')
        .text(`Taux: ${minRate}% - ${maxRate}% (moy: ${avgRate.toFixed(1)}%)`);
    
    // Bouton de fermeture/réinitialisation - COMME PIE CHART
    const resetButton = legend
        .append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '6px')
        .style('padding', '8px 12px')
        .style('background', '#f1f5f9')
        .style('border', '1px solid #e2e8f0')
        .style('border-radius', '6px')
        .style('cursor', 'pointer')
        .style('color', '#475569')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('transition', 'all 0.2s')
        .on('mouseover', function() {
            d3.select(this)
                .style('background', '#e2e8f0')
                .style('transform', 'translateY(-1px)');
        })
        .on('mouseleave', function() {
            d3.select(this)
                .style('background', '#f1f5f9')
                .style('transform', 'translateY(0)');
        })
        .on('click', () => {
            // Réinitialiser la sélection - MÊME QUE PIE CHART
            selectedVariable = null;
            hideRelationshipChart();
        });
    
    resetButton
        .append('svg')
        .attr('width', '14')
        .attr('height', '14')
        .style('fill', '#64748b')
        .html('<path d="M10.5 1.5a1.5 1.5 0 1 0-3 0v1.2a6 6 0 1 0 6 0V1.5Z"/>');
    
    resetButton
        .append('span')
        .text('Fermer l\'analyse');
}

function displayNoRelationshipDataMessage() {
    relationshipChart.svg.selectAll('g').remove();
    
    relationshipChart.svg.append('text')
        .attr('x', relationshipChart.width / 2)
        .attr('y', relationshipChart.height / 2 - 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#94a3b8')
        .style('font-weight', '500')
        .text('Données insuffisantes');
    
    relationshipChart.svg.append('text')
        .attr('x', relationshipChart.width / 2)
        .attr('y', relationshipChart.height / 2 + 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#64748b')
        .text('Ajustez les filtres pour afficher l\'analyse');
}

// Fonction pour réinitialiser la sélection (peut être appelée depuis d'autres graphiques) - COMME PIE CHART
function resetRelationshipSelection() {
    selectedVariable = null;
    hideRelationshipChart();
}

// Exposer les fonctions - COMME PIE CHART
window.initRelationshipChart = initRelationshipChart;
window.updateRelationshipChart = updateRelationshipChart;
window.showRelationshipChart = showRelationshipChart;
window.hideRelationshipChart = hideRelationshipChart;
window.resetRelationshipSelection = resetRelationshipSelection;