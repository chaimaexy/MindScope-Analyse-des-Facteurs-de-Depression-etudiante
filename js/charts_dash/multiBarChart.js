// js/charts_dash/multiBarChart.js
// Bar chart multivarié interactif - Version Professionnelle

let barChartInitialized = false;
let barChart = null;
let groupBy = 'depression';
let isStacked = false;
let sortBy = 'none';
let showValues = true;

function initMultiBarChart() {
    if (barChartInitialized) return;
    
    const container = d3.select('#multi-bar-chart');
    if (container.empty()) return;
    
    const width = container.node().clientWidth;
    const height = 300;
    const margin = { top: 50, right: 30, bottom: 80, left: 60 };
    
    // Créer le SVG avec un fond
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'professional-bar-chart');
    
    // Ajouter un rectangle de fond pour le style
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#f8fafc')
        .attr('rx', 8);
    
    barChart = {
        svg,
        width,
        height,
        margin
    };
    
    // Événements de contrôle améliorés
    setupEnhancedControls();
    
    barChartInitialized = true;
}

function setupEnhancedControls() {
    const groupSelect = document.getElementById('bar-group');
    if (groupSelect) {
        // Retirer l'option "Grouper par Ville"
        const cityOption = groupSelect.querySelector('option[value="city"]');
        if (cityOption) {
            cityOption.remove();
        }
        
        // Mettre la valeur par défaut sur "depression"
        groupSelect.value = 'depression';
        
        groupSelect.addEventListener('change', function() {
            groupBy = this.value;
            updateMultiBarChart();
        });
    }
    
    const toggleBtn = document.getElementById('toggle-stack');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            isStacked = !isStacked;
            this.innerHTML = isStacked ? 
                '<span>📊</span> Vue groupée' : 
                '<span>📈</span> Vue empilée';
            this.classList.toggle('active', isStacked);
            updateMultiBarChart();
        });
    }
    
    // Ajouter un contrôle de tri si non présent dans le HTML
    // const existingSort = document.getElementById('bar-sort');
    // if (!existingSort) {
    //     const controlsContainer = document.querySelector('.card-header .chart-controls');
    //     if (controlsContainer) {
    //         const sortSelect = document.createElement('select');
    //         sortSelect.id = 'bar-sort';
    //         sortSelect.className = 'control-select';
    //         sortSelect.innerHTML = `
    //             <option value="none">Trier par...</option>
    //             <option value="value">Valeur maximale</option>
    //             <option value="group">Groupe</option>
    //             <option value="variance">Variation</option>
    //         `;
    //         controlsContainer.appendChild(sortSelect);
            
    //         sortSelect.addEventListener('change', function() {
    //             sortBy = this.value;
    //             updateMultiBarChart();
    //         });
    //     }
    // }
}

function updateMultiBarChart() {
    // Cacher tous les tooltips avant la mise à jour
    hideAllTooltips();
    
    if (!barChartInitialized || !barChart) return;
    
    const data = getFilteredData();
    const barData = calculateBarChartDataCustom(data, groupBy);
    
    if (barData.length === 0) {
        displayNoDataMessage();
        return;
    }
    
    // Trier les données si nécessaire
    if (sortBy !== 'none') {
        sortBarData(barData, sortBy);
    }
    
    // Configuration personnalisée sans "Pression Travail"
    const variables = [
        'academic_pressure',
        'sleep_duration',
        'dietary_habits',
        'financial_stress'
    ];
    
    const labels = [
        'Pression Académique',
        'Sommeil',
        'Habitudes Alimentaires',
        'Stress Financier'
    ];
    
    const colors = [
        '#3b82f6', // Bleu
        '#10b981', // Vert
        '#f59e0b', // Orange
        '#ef4444'  // Rouge
    ];
    
    // Nettoyer le SVG
    barChart.svg.selectAll('g:not(.background)').remove();
    
    // Dimensions du graphique
    const chartWidth = barChart.width - barChart.margin.left - barChart.margin.right;
    const chartHeight = barChart.height - barChart.margin.top - barChart.margin.bottom;
    
    // Groupe principal
    const g = barChart.svg.append('g')
        .attr('transform', `translate(${barChart.margin.left}, ${barChart.margin.top})`);
    
    // Échelles
    const groups = barData.map(d => d.group);
    
    // Échelle X (groupes)
    const x0 = d3.scaleBand()
        .domain(groups)
        .range([0, chartWidth])
        .padding(0.3);
    
    // Échelle Y avec marge pour les labels
    let maxValue;
    
    if (isStacked) {
        // Pour le mode empilé, calculer la somme maximale des variables
        maxValue = d3.max(barData, d => 
            d3.sum(variables, v => d[v] || 0)
        );
    } else {
        // Pour le mode groupé, calculer la valeur maximale individuelle
        maxValue = d3.max(barData, d => 
            d3.max(variables, v => d[v] || 0)
        );
    }
    
    const y = d3.scaleLinear()
        .domain([0, maxValue * 1.15])
        .range([chartHeight, 0])
        .nice();
    
    // Grille horizontale
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat('')
        )
        .style('stroke', '#e2e8f0')
        .style('stroke-width', 0.5)
        .style('stroke-dasharray', '2,2');
    
    // Axe X avec rotation des labels si nécessaire
    const xAxis = g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x0));
    
    // Rotation des labels si trop longs
    xAxis.selectAll('text')
        .style('font-size', '11px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .attr('transform', function() {
            const textLength = this.getComputedTextLength();
            return textLength > x0.bandwidth() ? 'rotate(-45)' : '';
        })
        .attr('dy', '0.35em')
        .attr('dx', '-0.5em');
    
    // Axe Y avec formatage
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y)
            .tickFormat(d => d.toFixed(1))
        )
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // Titre de l'axe Y
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('y', -45)
        .attr('x', -chartHeight / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '600')
        .text('Score moyen (1-5)');
    
    // Titre du graphique
    g.append('text')
        .attr('class', 'chart-title')
        .attr('x', chartWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#1e293b')
        .style('font-weight', '700')
        .text(getChartTitle());
    
    // Dessiner les barres
    if (isStacked) {
        drawStackedBars(g, barData, variables, labels, colors, x0, y, chartHeight);
    } else {
        drawGroupedBars(g, barData, variables, labels, colors, x0, y, chartHeight);
    }
    
    // Mettre à jour la légende améliorée
    updateEnhancedLegend(barData, variables, labels, colors);
}

// Fonction personnalisée pour calculer les données du bar chart
function calculateBarChartDataCustom(data, groupBy = 'depression') {
    const variables = [
        'academic_pressure',
        'sleep_duration',
        'dietary_habits',
        'financial_stress'
    ];
    
    const groups = {};
    
    // Grouper les données
    if (groupBy === 'depression') {
        groups['Déprimés'] = data.filter(d => d.depression === 1);
        groups['Non déprimés'] = data.filter(d => d.depression === 0);
    } else if (groupBy === 'gender') {
        groups['Hommes'] = data.filter(d => d.gender === 'Male');
        groups['Femmes'] = data.filter(d => d.gender === 'Female');
    }
    
    // Calculer les moyennes pour chaque groupe et variable
    const result = [];
    
    Object.entries(groups).forEach(([groupName, groupData]) => {
        if (groupData.length === 0) return;
        
        const groupResult = { group: groupName };
        
        variables.forEach(variable => {
            const values = groupData.map(d => d[variable] || 0).filter(v => !isNaN(v));
            groupResult[variable] = values.length > 0 ? d3.mean(values) : 0;
        });
        
        result.push(groupResult);
    });
    
    return result;
}

function drawStackedBars(g, barData, variables, labels, colors, x0, y, chartHeight) {
    // Préparer les données pour le stacking
    const stack = d3.stack()
        .keys(variables)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);
    
    const stackedData = stack(barData);
    const color = d3.scaleOrdinal()
        .domain(variables)
        .range(colors);
    
    // Dessiner les barres empilées
    const layers = g.selectAll('.layer')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => color(d.key));
    
    layers.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('class', d => `stacked-bar stacked-${d.key}`)
        .attr('x', d => x0(d.data.group))
        .attr('y', d => y(d[1]))  // y correspond à la partie supérieure du segment
        .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))  // Hauteur positive
        .attr('width', x0.bandwidth())
        .style('cursor', 'pointer')
        .style('opacity', 0.85)
        .style('transition', 'opacity 0.2s')
        .style('rx', 2)
        .style('ry', 2)
        .on('mouseover', function(event, d) {
            const variable = d.key;
            const variableIndex = variables.indexOf(variable);
            const variableLabel = labels[variableIndex];
            const group = d.data.group;
            const value = d[1] - d[0];  // Valeur de ce segment
            const total = d[1];  // Somme cumulative à ce point
            
            showEnhancedTooltip(event, {
                group,
                variable: variableLabel,
                value,
                total,
                color: color(variable),
                isStacked: true
            });
            
            d3.select(this)
                .style('opacity', 1)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
        })
        .on('mouseleave', function() {
            hideEnhancedTooltip();
            d3.select(this)
                .style('opacity', 0.85)
                .style('filter', 'none');
        })
        .on('click', function(event, d) {
            const group = d.data.group;
            handleSelection(getSelectionTypeFromGroup(group), getSelectionValueFromGroup(group));
        });
    
    // Ajouter les valeurs sur les barres
    if (showValues) {
        layers.selectAll('rect')
            .each(function(d, i) {
                const variable = d.key;
                const value = d[1] - d[0];
                const group = d.data.group;
                const xPos = x0(group) + x0.bandwidth() / 2;
                const yPos = y(d[1] - value / 2);  // Position au milieu du segment
                
                if (value > 0.3) {
                    g.append('text')
                        .attr('class', 'bar-value')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .style('font-size', '9px')
                        .style('fill', 'white')
                        .style('font-weight', '600')
                        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.3)')
                        .style('pointer-events', 'none')
                        .text(value.toFixed(1));
                }
            });
    }
    
    // Ajouter le total sur le dessus de chaque barre
    barData.forEach(d => {
        const total = d3.sum(variables, v => d[v] || 0);
        const xPos = x0(d.group) + x0.bandwidth() / 2;
        const yPos = y(total) - 8;
        
        if (total > 0) {
            g.append('text')
                .attr('class', 'total-value')
                .attr('x', xPos)
                .attr('y', yPos)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('fill', '#1e293b')
                .style('font-weight', '700')
                .style('pointer-events', 'none')
                .text(total.toFixed(1));
        }
    });
}

function drawGroupedBars(g, barData, variables, labels, colors, x0, y, chartHeight) {
    // Échelle X (variables à l'intérieur des groupes)
    const x1 = d3.scaleBand()
        .domain(variables)
        .range([0, x0.bandwidth()])
        .padding(0.1);
    
    variables.forEach((variable, i) => {
        const bars = g.selectAll(`.bar-${variable}`)
            .data(barData)
            .enter()
            .append('rect')
            .attr('class', `bar bar-${variable}`)
            .attr('x', d => x0(d.group) + x1(variable))
            .attr('y', d => {
                const val = d[variable];
                return val != null ? y(val) : y(0);
            })
            .attr('width', x1.bandwidth())
            .attr('height', d => {
                const val = d[variable];
                return val != null ? chartHeight - y(val) : 0;
            })
            .attr('fill', colors[i])
            .style('cursor', 'pointer')
            .style('opacity', 0.85)
            .style('transition', 'all 0.2s')
            .style('rx', 3)
            .style('ry', 3)
            .on('mouseover', function(event, d) {
                const value = d[variable];
                const variableLabel = labels[i];
                
                showEnhancedTooltip(event, {
                    group: d.group,
                    variable: variableLabel,
                    value,
                    color: colors[i],
                    isStacked: false
                });
                
                d3.select(this)
                    .style('opacity', 1)
                    .style('transform', 'translateY(-2px)')
                    .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))');
            })
            .on('mouseleave', function() {
                hideEnhancedTooltip();
                d3.select(this)
                    .style('opacity', 0.85)
                    .style('transform', 'translateY(0)')
                    .style('filter', 'none');
            })
            .on('click', function(event, d) {
                handleSelection(getSelectionTypeFromGroup(d.group), getSelectionValueFromGroup(d.group));
            });
        
        // Ajouter les valeurs sur les barres
        if (showValues) {
            bars.each(function(d) {
                const value = d[variable];
                if (value > 0) {
                    g.append('text')
                        .attr('class', 'bar-value')
                        .attr('x', x0(d.group) + x1(variable) + x1.bandwidth() / 2)
                        .attr('y', y(value) - 5)
                        .attr('text-anchor', 'middle')
                        .style('font-size', '10px')
                        .style('fill', '#475569')
                        .style('font-weight', '600')
                        .style('pointer-events', 'none')
                        .text(value.toFixed(1));
                }
            });
        }
    });
}

function showEnhancedTooltip(event, data) {
    // Cacher d'abord tous les tooltips
    hideAllTooltips();
    
    const tooltip = createEnhancedTooltip();
    
    const percentage = data.isStacked ? 
        ((data.value / data.total) * 100).toFixed(1) : 
        ((data.value / 5) * 100).toFixed(1);
    
    const riskLevel = getRiskLevel(data.value, data.variable);
    
    tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px')
        .html(`
            <div class="tooltip-container">
                <div class="tooltip-header" style="background: ${data.color}; padding: 10px 12px; color: white; border-radius: 10px 10px 0 0;">
                    <strong style="font-size: 14px;">${data.group}</strong>
                    <span class="tooltip-risk ${riskLevel.class}" style="float: right; font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.2);">
                        ${riskLevel.text}
                    </span>
                </div>
                <div class="tooltip-body" style="padding: 12px;">
                    <div class="tooltip-metric" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span class="metric-label" style="font-size: 13px; color: #475569; font-weight: 500;">${data.variable}</span>
                        <span class="metric-value" style="font-size: 18px; color: ${data.color}; font-weight: 700;">${data.value.toFixed(2)}</span>
                    </div>
                    <div class="tooltip-progress" style="margin-bottom: 10px;">
                        <div class="progress-bar" style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div class="progress-fill" style="width: ${percentage}%; background: ${data.color}; height: 100%;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                            <span style="font-size: 10px; color: #64748b;">0</span>
                            <span class="progress-text" style="font-size: 11px; color: #475569; font-weight: 500;">${percentage}%</span>
                            <span style="font-size: 10px; color: #64748b;">5</span>
                        </div>
                    </div>
                    ${data.isStacked ? `
                    <div class="tooltip-total" style="font-size: 11px; color: #64748b; padding: 8px; background: #f8fafc; border-radius: 6px; margin-bottom: 10px;">
                        Total du segment: <strong>${data.total.toFixed(2)}</strong>
                    </div>
                    ` : ''}
                    <div class="tooltip-actions" style="text-align: center; font-size: 11px; color: #94a3b8; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                        👆 Cliquer pour filtrer ce groupe
                    </div>
                </div>
            </div>
        `);
}

function createEnhancedTooltip() {
    let tooltip = d3.select('#enhanced-bar-tooltip');
    
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('id', 'enhanced-bar-tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '10px')
            .style('padding', '0')
            .style('box-shadow', '0 10px 25px -5px rgba(0,0,0,0.1)')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('font-family', 'system-ui, sans-serif')
            .style('max-width', '300px')
            .style('overflow', 'hidden');
    }
    
    return tooltip;
}

function hideEnhancedTooltip() {
    d3.select('#enhanced-bar-tooltip')
        .style('display', 'none');
}

function hideAllTooltips() {
    // Cacher tous les tooltips possibles
    d3.select('#enhanced-bar-tooltip').style('display', 'none');
    d3.select('#tooltip').style('display', 'none');
    d3.select('#india-state-tooltip').style('display', 'none');
}

function getRiskLevel(value, variable) {
    const thresholds = {
        'Pression Académique': { high: 4, medium: 3 },
        'Stress Financier': { high: 4, medium: 3 },
        'Sommeil': { high: 2, medium: 3 },
        'Habitudes Alimentaires': { high: 2, medium: 3 }
    };
    
    const variableKey = variable.includes('Pression') ? 'Pression Académique' : 
                      variable.includes('Stress') ? 'Stress Financier' :
                      variable.includes('Sommeil') ? 'Sommeil' :
                      variable.includes('Habitudes') ? 'Habitudes Alimentaires' : variable;
    
    const threshold = thresholds[variableKey] || { high: 4, medium: 3 };
    
    let riskClass = '';
    let riskText = '';
    
    if (variableKey === 'Sommeil' || variableKey === 'Habitudes Alimentaires') {
        if (value <= threshold.high) {
            riskText = 'Risque Élevé';
            riskClass = 'high-risk';
        } else if (value <= threshold.medium) {
            riskText = 'Risque Moyen';
            riskClass = 'medium-risk';
        } else {
            riskText = 'Faible Risque';
            riskClass = 'low-risk';
        }
    } else {
        if (value >= threshold.high) {
            riskText = 'Risque Élevé';
            riskClass = 'high-risk';
        } else if (value >= threshold.medium) {
            riskText = 'Risque Moyen';
            riskClass = 'medium-risk';
        } else {
            riskText = 'Faible Risque';
            riskClass = 'low-risk';
        }
    }
    
    return { text: riskText, class: riskClass };
}

function updateEnhancedLegend(barData, variables, labels, colors) {
    const legendContainer = d3.select('#bar-legend');
    if (legendContainer.empty()) return;
    
    legendContainer.html('');
    
    const legend = legendContainer
        .append('div')
        .attr('class', 'enhanced-legend')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '20px')
        .style('flex-wrap', 'wrap')
        .style('padding', '15px')
        .style('background', '#f8fafc')
        .style('border-radius', '8px')
        .style('margin-top', '10px');
    
    variables.forEach((variable, i) => {
        const label = labels[i];
        const color = colors[i];
        
        const meanValue = d3.mean(barData, d => d[variable]);
        const maxValue = d3.max(barData, d => d[variable]);
        const minValue = d3.min(barData, d => d[variable]);
        
        const legendItem = legend
            .append('div')
            .attr('class', 'legend-item')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px')
            .style('padding', '8px 12px')
            .style('background', 'white')
            .style('border-radius', '6px')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.05)')
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                highlightVariable(variable);
            })
            .on('mouseleave', function() {
                resetVariableHighlight();
            })
            .on('click', () => {
                highlightVariable(variable);
            });
        
        legendItem
            .append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', color)
            .style('border-radius', '3px')
            .style('box-shadow', '0 1px 3px rgba(0,0,0,0.2)');
        
        const textContainer = legendItem
            .append('div')
            .style('display', 'flex')
            .style('flex-direction', 'column');
        
        textContainer
            .append('div')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#1e293b')
            .text(label);
        
        textContainer
            .append('div')
            .style('font-size', '10px')
            .style('color', '#64748b')
            .text(`Moy: ${meanValue.toFixed(1)} | Min: ${minValue.toFixed(1)} | Max: ${maxValue.toFixed(1)}`);
    });
    
    const modeLegend = legendContainer
        .append('div')
        .style('text-align', 'center')
        .style('font-size', '11px')
        .style('color', '#64748b')
        .style('margin-top', '10px');
    
    modeLegend.html(`
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 6px 12px; border-radius: 6px;">
            <div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 2px;"></div>
            <span>Barres groupées</span>
            <div style="width: 8px; height: 8px; background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444); border-radius: 2px;"></div>
            <span>Barres empilées</span>
        </div>
    `);
}

function getChartTitle() {
    const titles = {
        'depression': 'Facteurs de Risque par Statut Dépression',
        'gender': 'Comparaison des Facteurs par Genre'
    };
    return titles[groupBy] || 'Analyse Multivariée des Facteurs';
}

function sortBarData(barData, sortType) {
    const variables = [
        'academic_pressure',
        'sleep_duration',
        'dietary_habits',
        'financial_stress'
    ];
    
    barData.sort((a, b) => {
        switch(sortType) {
            case 'value':
                const sumA = d3.sum(variables, v => a[v]);
                const sumB = d3.sum(variables, v => b[v]);
                return sumB - sumA;
                
            case 'group':
                return a.group.localeCompare(b.group);
                
            case 'variance':
                const valuesA = variables.map(v => a[v]);
                const valuesB = variables.map(v => b[v]);
                const varA = d3.variance(valuesA) || 0;
                const varB = d3.variance(valuesB) || 0;
                return varB - varA;
                
            default:
                return 0;
        }
    });
}

function displayNoDataMessage() {
    barChart.svg.html('');
    
    barChart.svg.append('rect')
        .attr('width', barChart.width)
        .attr('height', barChart.height)
        .attr('fill', '#f8fafc')
        .attr('rx', 8);
    
    barChart.svg.append('text')
        .attr('x', barChart.width / 2)
        .attr('y', barChart.height / 2 - 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', '#94a3b8')
        .style('font-weight', '500')
        .text('📊');
    
    barChart.svg.append('text')
        .attr('x', barChart.width / 2)
        .attr('y', barChart.height / 2 + 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#64748b')
        .text('Aucune donnée disponible');
    
    barChart.svg.append('text')
        .attr('x', barChart.width / 2)
        .attr('y', barChart.height / 2 + 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#94a3b8')
        .text('Ajustez les filtres pour afficher les données');
}

function highlightVariable(variable) {
    const variables = [
        'academic_pressure',
        'sleep_duration',
        'dietary_habits',
        'financial_stress'
    ];
    
    const index = variables.indexOf(variable);
    if (index === -1) return;
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const color = colors[index];
    
    barChart.svg.selectAll('.bar')
        .transition()
        .duration(300)
        .style('opacity', 0.3);
    
    barChart.svg.selectAll(`.bar-${variable}`)
        .transition()
        .duration(300)
        .style('opacity', 1)
        .style('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.3))');
}

function resetVariableHighlight() {
    barChart.svg.selectAll('.bar')
        .transition()
        .duration(300)
        .style('opacity', 0.85)
        .style('filter', 'none');
}

function getSelectionTypeFromGroup(group) {
    if (group === 'Déprimés' || group === 'Non déprimés') return 'depression';
    if (group === 'Hommes' || group === 'Femmes') return 'gender';
    return 'city';
}

function getSelectionValueFromGroup(group) {
    if (group === 'Déprimés') return true;
    if (group === 'Non déprimés') return false;
    if (group === 'Hommes') return 'Male';
    if (group === 'Femmes') return 'Female';
    return group;
}

// Exposer les fonctions
window.initMultiBarChart = initMultiBarChart;
window.updateMultiBarChart = updateMultiBarChart;