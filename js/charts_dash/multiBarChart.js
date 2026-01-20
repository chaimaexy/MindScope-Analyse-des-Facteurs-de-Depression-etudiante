// js/charts_dash/multiBarChart.js
// Bar chart multivarié interactif 
let barChartInitialized = false;
let barChart = null;
let lineChart = null; // AJOUT: Référence au graphique en ligne
let groupBy = 'depression';
let isStacked = false;
let sortBy = 'none';
let showValues = true;
let selectedGroup = null; // Variable pour suivre le groupe sélectionné
let selectedVariable = null; // AJOUT: Variable pour suivre la variable cliquée

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
    
    // AJOUT: Créer un conteneur pour le graphique en ligne
    // Vérifier si le conteneur existe déjà (au cas où relationshipChart.js aurait déjà créé quelque chose)
    let lineChartContainer = container.select('#multi-bar-line-chart-container');
    if (lineChartContainer.empty()) {
        lineChartContainer = container
            .append('div')
            .attr('id', 'multi-bar-line-chart-container')
            .style('display', 'none')
            .style('margin-top', '20px')
            .style('padding', '15px')
            .style('background', '#f8fafc')
            .style('border-radius', '8px')
            .style('border', '1px solid #e2e8f0');
    }
    
    // AJOUT: Créer le SVG pour le graphique en ligne
    let lineSvg = lineChartContainer.select('.relationship-line-chart');
    if (lineSvg.empty()) {
        lineSvg = lineChartContainer
            .append('svg')
            .attr('width', width)
            .attr('height', 200)
            .attr('class', 'relationship-line-chart');
    }
    
    lineChart = {
        container: lineChartContainer,
        svg: lineSvg,
        width,
        height: 200,
        margin: { top: 40, right: 30, bottom: 50, left: 60 }
    };
    
    // Événements de contrôle améliorés
    setupEnhancedControls();
    
    // AJOUT : Bouton de description
    if (typeof CommentButton !== 'undefined') {
        CommentButton.attach({
            container: document
                .querySelector('#multi-bar-chart')
                .closest('.chart-card'),
            position: 'bottom-left',
            bottomOffset: 12,
            leftOffset: 12,
            content: `
                <strong>Analyse des Facteurs de Risque</strong>
                <div style="margin-top:6px; font-size:12px; color:#64748b;">
                    Ce graphique compare plusieurs facteurs (pression académique, sommeil,
                    habitudes alimentaires, stress financier) entre groupes.
                </div>
                <br/>
                <div style="font-size:12px; color:#64748b;">Cliquez sur une barre pour voir la relation avec le niveau de dépression.</div>
            `
        });
    }
    
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
            selectedGroup = null; // Réinitialiser la sélection lors du changement de groupe
            selectedVariable = null; // AJOUT: Réinitialiser la variable sélectionnée
            sortBy = 'none'; // Réinitialiser le tri
            updateMultiBarChart();
        });
    }
    
    const toggleBtn = document.getElementById('toggle-stack');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            isStacked = !isStacked;
            this.innerHTML = isStacked ? 
                '<i class="fas fa-chart-bar" aria-hidden="true" style="margin-right:6px"></i> Vue groupée' : 
                '<i class="fas fa-chart-line" aria-hidden="true" style="margin-right:6px"></i> Vue empilée';
            this.classList.toggle('active', isStacked);
            updateMultiBarChart();
        });
    }
}

function updateMultiBarChart() {
    // Cacher tous les tooltips avant la mise à jour
    hideAllTooltips();
    
    // AJOUT: Réinitialiser le graphique en ligne
    resetLineChart();
    
    if (!barChartInitialized || !barChart) return;
    
    const data = getFilteredData();
    const barData = calculateBarChartDataCustom(data, groupBy);
    
    if (barData.length === 0) {
        displayNoDataMessage();
        return;
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
        '#f25656', // Bleu
        '#3eb698', // Vert
        'hsl(34, 98%, 69%)', // Orange
        '#3761fa' 
    ];
    
    // Nettoyer le SVG
    barChart.svg.selectAll('g:not(.background)').remove();
    
    // Dimensions du graphique
    const chartWidth = barChart.width - barChart.margin.left - barChart.margin.right;
    const chartHeight = barChart.height - barChart.margin.top - barChart.margin.bottom;
    
    // Groupe principal
    const g = barChart.svg.append('g')
        .attr('transform', `translate(${barChart.margin.left}, ${barChart.margin.top})`);
    
    // Déterminer l'ordre des groupes (Déprimés toujours à gauche)
    let groups;
    if (groupBy === 'depression') {
        // Forcer l'ordre : Déprimés à gauche, Non déprimés à droite
        groups = ['Déprimés', 'Non déprimés'].filter(group => 
            barData.some(d => d.group === group)
        );
    } else if (groupBy === 'gender') {
        // Forcer l'ordre : Hommes à gauche, Femmes à droite
        groups = ['Hommes', 'Femmes'].filter(group => 
            barData.some(d => d.group === group)
        );
    }
    
    // Trier les données selon l'ordre forcé
    barData.sort((a, b) => {
        const indexA = groups.indexOf(a.group);
        const indexB = groups.indexOf(b.group);
        return indexA - indexB;
    });
    
    // Appliquer d'autres tris si demandé (sauf 'group' qui est déjà géré)
    if (sortBy !== 'none' && sortBy !== 'group') {
        sortBarData(barData, sortBy);
    }
    
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
    
    // Mettre à jour la légende améliorée avec bouton de réinitialisation
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
        // FORCER L'ORDRE : Déprimés en premier, Non déprimés en second
        groups['Déprimés'] = data.filter(d => d.depression === 1);
        groups['Non déprimés'] = data.filter(d => d.depression === 0);
    } else if (groupBy === 'gender') {
        // FORCER L'ORDRE : Hommes en premier, Femmes en second
        groups['Hommes'] = data.filter(d => d.gender === 'Male');
        groups['Femmes'] = data.filter(d => d.gender === 'Female');
    }
    
    // Calculer les moyennes pour chaque groupe et variable
    const result = [];
    
    // Maintenir l'ordre des clés pour forcer l'affichage
    const groupOrder = groupBy === 'depression' 
        ? ['Déprimés', 'Non déprimés'] 
        : ['Hommes', 'Femmes'];
    
    groupOrder.forEach(groupName => {
        const groupData = groups[groupName];
        if (!groupData || groupData.length === 0) return;
        
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
        .attr('class', d => `stacked-bar stacked-${d.key} ${selectedGroup === d.data.group ? 'selected' : ''}`)
        .attr('x', d => x0(d.data.group))
        .attr('y', d => y(d[1]))
        .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
        .attr('width', x0.bandwidth())
        .style('cursor', 'pointer')
        .style('opacity', d => {
            // Si un groupe est sélectionné et ce n'est pas ce groupe, réduire l'opacité
            if (selectedGroup && selectedGroup !== d.data.group) {
                return 0.3;
            }
            return 0.85;
        })
        .style('transition', 'opacity 0.2s')
        .style('rx', 2)
        .style('ry', 2)
        .on('mouseover', function(event, d) {
            const variable = d.key;
            const variableIndex = variables.indexOf(variable);
            const variableLabel = labels[variableIndex];
            const group = d.data.group;
            const value = d[1] - d[0];
            const total = d[1];
            
            showEnhancedTooltip(event, {
                group,
                variable: variableLabel,
                value,
                total,
                color: color(variable),
                isStacked: true
            });
            
            d3.select(this)
                .style('opacity', function() {
                    if (selectedGroup && selectedGroup !== group) {
                        return 0.5;
                    }
                    return 1;
                })
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
        })
        .on('mouseleave', function(event, d) {
            hideEnhancedTooltip();
            d3.select(this)
                .style('opacity', function() {
                    if (selectedGroup && selectedGroup !== d.data.group) {
                        return 0.3;
                    }
                    return 0.85;
                })
                .style('filter', 'none');
        })
        .on('click', function(event, d) {
            event.preventDefault();
            event.stopPropagation();
            
            const variable = d.key;
            console.log('Barre empilée cliquée:', variable);
            
            // AJOUT: Afficher le graphique de relation
            showMultiBarRelationshipChart(variable);
            
            // Conserver l'ancienne logique de sélection de groupe (optionnel)
            if (event.shiftKey || event.ctrlKey) {
                const group = d.data.group;
                
                // Si on clique sur un groupe déjà sélectionné, désélectionner
                if (selectedGroup === group) {
                    selectedGroup = null;
                    // Réinitialiser le filtre
                    if (typeof handleSelection === 'function') {
                        handleSelection(getSelectionTypeFromGroup(group), null);
                    }
                } else {
                    // Sinon, sélectionner ce groupe
                    selectedGroup = group;
                    // Appliquer le filtre correspondant
                    if (typeof handleSelection === 'function') {
                        handleSelection(getSelectionTypeFromGroup(group), getSelectionValueFromGroup(group));
                    }
                }
                
                // Re-dessiner le graphique avec la nouvelle sélection
                updateMultiBarChart();
            }
        });
    
    // Ajouter les valeurs sur les barres
    if (showValues) {
        layers.selectAll('rect')
            .each(function(d, i) {
                const variable = d.key;
                const value = d[1] - d[0];
                const group = d.data.group;
                const xPos = x0(group) + x0.bandwidth() / 2;
                const yPos = y(d[1] - value / 2);
                
                if (value > 0.3) {
                    g.append('text')
                        .attr('class', 'bar-value')
                        .attr('x', xPos)
                        .attr('y', yPos)
                        .attr('text-anchor', 'middle')
                        .attr('dy', '0.35em')
                        .style('font-size', '9px')
                        .style('fill', d => selectedGroup && selectedGroup !== group ? '#94a3b8' : 'white')
                        .style('font-weight', '600')
                        .style('text-shadow', d => selectedGroup && selectedGroup !== group ? 'none' : '1px 1px 2px rgba(0,0,0,0.3)')
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
                .style('fill', selectedGroup && selectedGroup !== d.group ? '#94a3b8' : '#1e293b')
                .style('font-weight', selectedGroup && selectedGroup !== d.group ? '500' : '700')
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
            .attr('class', d => `bar bar-${variable} ${selectedGroup === d.group ? 'selected' : ''}`)
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
            .style('opacity', d => {
                // Si un groupe est sélectionné et ce n'est pas ce groupe, réduire l'opacité
                if (selectedGroup && selectedGroup !== d.group) {
                    return 0.3;
                }
                return 0.85;
            })
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
                    .style('opacity', function() {
                        if (selectedGroup && selectedGroup !== d.group) {
                            return 0.5;
                        }
                        return 1;
                    })
                    .style('transform', 'translateY(-2px)')
                    .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))');
            })
            .on('mouseleave', function(event, d) {
                hideEnhancedTooltip();
                d3.select(this)
                    .style('opacity', function() {
                        if (selectedGroup && selectedGroup !== d.group) {
                            return 0.3;
                        }
                        return 0.85;
                    })
                    .style('transform', 'translateY(0)')
                    .style('filter', 'none');
            })
            .on('click', function(event, d) {
                event.preventDefault();
                event.stopPropagation();
                
                const group = d.group;
                const variable = variables[i];
                
                console.log('Barre cliquée:', group, variable);
                
                // AJOUT: Afficher le graphique de relation
                showMultiBarRelationshipChart(variable);
                
                // Conserver l'ancienne logique de sélection de groupe (optionnel)
                if (event.shiftKey || event.ctrlKey) {
                    // Si on clique sur un groupe déjà sélectionné, désélectionner
                    if (selectedGroup === group) {
                        selectedGroup = null;
                        // Réinitialiser le filtre
                        if (typeof handleSelection === 'function') {
                            handleSelection(getSelectionTypeFromGroup(group), null);
                        }
                    } else {
                        // Sinon, sélectionner ce groupe
                        selectedGroup = group;
                        // Appliquer le filtre correspondant
                        if (typeof handleSelection === 'function') {
                            handleSelection(getSelectionTypeFromGroup(group), getSelectionValueFromGroup(group));
                        }
                    }
                    
                    // Re-dessiner le graphique avec la nouvelle sélection
                    updateMultiBarChart();
                }
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
                        .style('fill', selectedGroup && selectedGroup !== d.group ? '#94a3b8' : '#475569')
                        .style('font-weight', '600')
                        .style('pointer-events', 'none')
                        .text(value.toFixed(1));
                }
            });
        }
    });
}

// AJOUT: Fonction pour afficher le graphique de relation (renommée pour éviter les conflits)
function showMultiBarRelationshipChart(variable) {
    console.log('Affichage du graphique de relation (multiBar):', variable);
    
    // Mettre à jour la variable sélectionnée
    selectedVariable = variable;
    
    // Récupérer les données filtrées
    const data = getFilteredData();
    console.log('Données filtrées pour le graphique en ligne:', data.length, 'éléments');
    
    // Préparer les données pour le graphique en ligne
    const lineData = prepareLineChartData(data, variable);
    console.log('Données préparées pour le graphique en ligne:', lineData);
    
    // Vérifier si lineChart est défini
    if (!lineChart || !lineChart.container) {
        console.error('lineChart ou lineChart.container non défini');
        return;
    }
    
    // Afficher le conteneur
    lineChart.container.style('display', 'block');
    console.log('Conteneur du graphique en ligne affiché');
    
    // Dessiner le graphique en ligne
    drawLineChart(lineData, variable);
    
    // Ajouter un bouton pour fermer le graphique
    addCloseButton();
}

// AJOUT: Fonction pour préparer les données du graphique en ligne
function prepareLineChartData(data, variable) {
    // Créer des bins pour la variable (groupes de valeurs)
    const bins = {};
    
    console.log('Préparation des données pour variable:', variable);
    
    // Pour chaque point de donnée
    data.forEach(d => {
        // Vérifier si la variable existe dans les données
        if (d[variable] === undefined || d[variable] === null) {
            return; // Ignorer les valeurs manquantes
        }
        
        // Arrondir la valeur de la variable pour créer des groupes
        // Pour sleep_duration (heures), on arrondit à l'entier le plus proche
        // Pour les autres variables (1-5), on arrondit à 1 décimale
        let value;
        if (variable === 'sleep_duration') {
            value = Math.round(d[variable]); // Arrondir à l'entier pour le sommeil
        } else {
            value = Math.round(d[variable] * 10) / 10; // Arrondir à 1 décimale
        }
        
        if (!bins[value]) {
            bins[value] = {
                variableValue: value,
                depressionValues: [],
                count: 0
            };
        }
        
        // Ajouter le niveau de dépression (0 ou 1)
        if (d.depression !== undefined && d.depression !== null) {
            bins[value].depressionValues.push(d.depression);
            bins[value].count++;
        }
    });
    
    console.log('Bins créés:', Object.keys(bins).length);
    
    // Calculer la moyenne de dépression pour chaque bin
    const result = Object.values(bins)
        .map(bin => ({
            x: bin.variableValue,
            y: bin.depressionValues.length > 0 ? d3.mean(bin.depressionValues) * 100 : 0, // Pourcentage de dépression
            count: bin.count
        }))
        .filter(item => item.count > 0) // Filtrer les bins vides
        .sort((a, b) => a.x - b.x); // Trier par valeur de variable
    
    console.log('Résultat final:', result);
    return result;
}

// AJOUT: Fonction pour dessiner le graphique en ligne
function drawLineChart(lineData, variable) {
    console.log('Dessin du graphique en ligne avec', lineData.length, 'points');
    
    if (!lineChart || lineData.length === 0) {
        // Afficher un message si pas de données
        lineChart.svg.selectAll('*').remove();
        lineChart.svg.append('text')
            .attr('x', lineChart.width / 2)
            .attr('y', lineChart.height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#64748b')
            .text('Données insuffisantes pour afficher la relation');
        return;
    }
    
    // Nettoyer le SVG
    lineChart.svg.selectAll('*').remove();
    
    // Dimensions du graphique
    const chartWidth = lineChart.width - lineChart.margin.left - lineChart.margin.right;
    const chartHeight = lineChart.height - lineChart.margin.top - lineChart.margin.bottom;
    
    // Groupe principal
    const g = lineChart.svg.append('g')
        .attr('transform', `translate(${lineChart.margin.left}, ${lineChart.margin.top})`);
    
    // Échelles
    const x = d3.scaleLinear()
        .domain([d3.min(lineData, d => d.x) - 0.5, d3.max(lineData, d => d.x) + 0.5])
        .range([0, chartWidth])
        .nice();
    
    const yMax = d3.max(lineData, d => d.y);
    const y = d3.scaleLinear()
        .domain([0, Math.max(100, yMax * 1.1)])
        .range([chartHeight, 0])
        .nice();
    
    // Ligne
    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveMonotoneX);
    
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
    
    // Ligne du graphique
    g.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Points
    g.selectAll('.point')
        .data(lineData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', d => Math.min(Math.sqrt(d.count) * 1.5 + 3, 10)) // Taille proportionnelle au nombre d'observations
        .attr('fill', '#3b82f6')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            showLineTooltip(event, d, variable);
        })
        .on('mouseleave', function() {
            hideLineTooltip();
        });
    
    // Axe X
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => {
            if (variable === 'sleep_duration') {
                return d + 'h'; // Format heures pour le sommeil
            }
            return d.toFixed(variable === 'sleep_duration' ? 0 : 1); // Format avec précision appropriée
        }))
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // Axe Y
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).tickFormat(d => d + '%'))
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // Titre de l'axe X
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '600')
        .text(getVariableLabel(variable));
    
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
        .text('Taux de dépression (%)');
    
    // Titre du graphique
    g.append('text')
        .attr('class', 'chart-title')
        .attr('x', chartWidth / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#1e293b')
        .style('font-weight', '700')
        .text(`Relation entre ${getVariableLabel(variable).split(' (')[0]} et dépression`);
    
    // Ajouter une ligne de régression
    addRegressionLine(g, lineData, x, y, chartWidth, chartHeight);
}

// AJOUT: Fonction pour obtenir le label d'une variable
function getVariableLabel(variable) {
    const labels = {
        'academic_pressure': 'Pression Académique (1-5)',
        'sleep_duration': 'Durée de Sommeil (heures)',
        'dietary_habits': 'Habitudes Alimentaires (1-5)',
        'financial_stress': 'Stress Financier (1-5)'
    };
    return labels[variable] || variable;
}

// AJOUT: Fonction pour ajouter une ligne de régression
function addRegressionLine(g, lineData, xScale, yScale, width, height) {
    if (lineData.length < 2) return;
    
    // Calculer la régression linéaire simple
    const n = lineData.length;
    const sumX = d3.sum(lineData, d => d.x);
    const sumY = d3.sum(lineData, d => d.y);
    const sumXY = d3.sum(lineData, d => d.x * d.y);
    const sumX2 = d3.sum(lineData, d => d.x * d.x);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Créer les points pour la ligne de régression
    const xRange = xScale.domain();
    const regressionData = [
        { x: xRange[0], y: slope * xRange[0] + intercept },
        { x: xRange[1], y: slope * xRange[1] + intercept }
    ];
    
    // Dessiner la ligne de régression
    const regressionLine = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));
    
    g.append('path')
        .datum(regressionData)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('d', regressionLine);
    
    // Ajouter la légende pour la ligne de régression
    const slopeText = slope > 0 ? `+${slope.toFixed(2)}` : slope.toFixed(2);
    g.append('text')
        .attr('x', width - 10)
        .attr('y', 20)
        .attr('text-anchor', 'end')
        .style('font-size', '10px')
        .style('fill', '#ef4444')
        .style('font-weight', '500')
        .text(`Tendance: ${slopeText}% par unité`);
}

// AJOUT: Fonction pour afficher le tooltip du graphique en ligne
function showLineTooltip(event, data, variable) {
    const tooltip = createLineTooltip();
    
    tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px')
        .html(`
            <div class="tooltip-container" style="background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 250px;">
                <div class="tooltip-header" style="padding: 12px; background: #3b82f6; color: white; border-radius: 8px 8px 0 0;">
                    <strong style="font-size: 13px;">${getVariableLabel(variable).split(' (')[0]} = ${data.x}${variable === 'sleep_duration' ? 'h' : ''}</strong>
                </div>
                <div class="tooltip-body" style="padding: 12px;">
                    <div style="margin-bottom: 8px;">
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Taux de dépression</div>
                        <div style="font-size: 20px; color: #3b82f6; font-weight: 700;">${data.y.toFixed(1)}%</div>
                    </div>
                    <div style="font-size: 11px; color: #64748b; padding: 6px; background: #f8fafc; border-radius: 4px;">
                        <i class="fas fa-users" style="margin-right: 4px;"></i>
                        ${data.count} observation${data.count > 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        `);
}

// AJOUT: Fonction pour créer le tooltip du graphique en ligne
function createLineTooltip() {
    let tooltip = d3.select('#multi-bar-line-tooltip');
    
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('id', 'multi-bar-line-tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '8px')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.1)')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('font-family', 'system-ui, sans-serif');
    }
    
    return tooltip;
}

// AJOUT: Fonction pour cacher le tooltip du graphique en ligne
function hideLineTooltip() {
    d3.select('#multi-bar-line-tooltip')
        .style('display', 'none');
}

// AJOUT: Fonction pour ajouter un bouton de fermeture
function addCloseButton() {
    // Retirer le bouton existant s'il y en a un
    lineChart.container.select('.close-line-chart').remove();
    
    // Ajouter le bouton
    const closeButton = lineChart.container
        .append('button')
        .attr('class', 'close-line-chart')
        .style('position', 'absolute')
        .style('top', '10px')
        .style('right', '10px')
        .style('padding', '6px 12px')
        .style('background', '#ef4444')
        .style('color', 'white')
        .style('border', 'none')
        .style('border-radius', '4px')
        .style('cursor', 'pointer')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('z-index', '10')
        .html('<i class="fas fa-times" style="margin-right:4px"></i>Fermer')
        .on('click', function() {
            hideLineChart();
        });
}

// AJOUT: Fonction pour cacher le graphique en ligne
function hideLineChart() {
    if (lineChart) {
        lineChart.container.style('display', 'none');
        selectedVariable = null;
        console.log('Graphique en ligne caché');
    }
}

// AJOUT: Fonction pour réinitialiser le graphique en ligne
function resetLineChart() {
    if (lineChart) {
        lineChart.container.style('display', 'none');
        selectedVariable = null;
        console.log('Graphique en ligne réinitialisé');
    }
}

function showEnhancedTooltip(event, data) {
    // Cacher d'abord tous les tooltips
    hideAllTooltips();
    
    const tooltip = createEnhancedTooltip();
    
    const percentage = data.isStacked ? 
        ((data.value / data.total) * 100).toFixed(1) : 
        ((data.value / 5) * 100).toFixed(1);
    
    const riskLevel = getRiskLevel(data.value, data.variable);
    
    // Ajouter une instruction pour la sélection/désélection
    const clickAction = selectedGroup === data.group ? 
        'Cliquer pour réinitialiser la sélection' : 
        'Cliquer pour sélectionner ce groupe';
    
    tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px')
        .html(`
            <div class="tooltip-container">
                <div class="tooltip-header" style="background: ${data.color}; padding: 10px 12px; color: white; border-radius: 10px 10px 0 0;">
                    <strong style="font-size: 14px;">${data.group}</strong>
                    ${selectedGroup === data.group ? 
                    '<span class="tooltip-selected" style="float: right; font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.3);"><i class="fas fa-check" style="margin-right:4px"></i>Sélectionné</span>' : ''}
                    <span class="tooltip-risk ${riskLevel.class}" style="float: right; font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(255,255,255,0.2); margin-right: ${selectedGroup === data.group ? '8px' : '0'};">
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
                        <i class="fas fa-hand-point-up" style="margin-right:6px"></i>${clickAction}
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
    d3.select('#multi-bar-line-tooltip').style('display', 'none'); // AJOUT
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
        .style('flex-direction', 'column')
        .style('gap', '15px')
        .style('padding', '15px')
        .style('background', '#f8fafc')
        .style('border-radius', '8px')
        .style('margin-top', '10px');
    
    // Première ligne : les variables
    const variablesRow = legend
        .append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '20px')
        .style('flex-wrap', 'wrap');
    
    variables.forEach((variable, i) => {
        const label = labels[i];
        const color = colors[i];
        
        const meanValue = d3.mean(barData, d => d[variable]);
        const maxValue = d3.max(barData, d => d[variable]);
        const minValue = d3.min(barData, d => d[variable]);
        
        const legendItem = variablesRow
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
            .on('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                console.log('Légende cliquée:', variable);
                
                // Afficher le graphique de relation lorsqu'on clique sur la légende
                showMultiBarRelationshipChart(variable);
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
    
    // Deuxième ligne : mode et bouton de réinitialisation
    const actionsRow = legend
        .append('div')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('align-items', 'center')
        .style('margin-top', '10px')
        .style('padding-top', '10px')
        .style('border-top', '1px solid #e2e8f0');
    
    // Mode d'affichage
    const modeLegend = actionsRow
        .append('div')
        .style('display', 'inline-flex')
        .style('align-items', 'center')
        .style('gap', '8px')
        .style('font-size', '11px')
        .style('color', '#64748b');
    
    // BOUTON DE RÉINITIALISATION - CORRIGÉ
    if (selectedGroup) {
        const resetButton = actionsRow
            .append('button')
            .attr('class', 'reset-button')
            .attr('type', 'button') // IMPORTANT: Spécifier le type
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('padding', '6px 12px')
            .style('background', '#f1f5f9')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('color', '#475569')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('transition', 'all 0.2s')
            .style('outline', 'none')
            .style('font-family', 'inherit')
            .style('border', 'none') // Éviter les conflits de styles
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#e2e8f0')
                    .style('transform', 'translateY(-1px)')
                    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
            })
            .on('mouseleave', function() {
                d3.select(this)
                    .style('background', '#f1f5f9')
                    .style('transform', 'translateY(0)')
                    .style('box-shadow', 'none');
            })
            .on('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                console.log('Bouton réinitialiser cliqué', selectedGroup);
                
                // Réinitialiser la sélection
                selectedGroup = null;
                selectedVariable = null;
                
                // Réinitialiser le filtre si la fonction existe
                if (typeof handleSelection === 'function') {
                    // Utiliser null pour les deux paramètres
                    handleSelection(null, null);
                } else {
                    console.warn('handleSelection non disponible');
                }
                
                // Réinitialiser le graphique en ligne
                resetLineChart();
                
                // Forcer une mise à jour complète
                updateMultiBarChart();
                
                // Feedback visuel
                d3.select(this)
                    .style('background', '#10b981')
                    .style('color', 'white')
                    .transition()
                    .duration(300)
                    .style('background', '#f1f5f9')
                    .style('color', '#475569');
            })
            .on('keydown', function(event) {
                // Permettre l'activation avec la touche Entrée
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    d3.select(this).dispatch('click');
                }
            });
        
        resetButton.html(`
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Réinitialiser (${selectedGroup})
        `);
        
        // Ajouter un attribut tabindex pour l'accessibilité
        resetButton.attr('tabindex', '0');
    } else {
        // Afficher un état indiquant que le graphique est déjà à l'état par défaut
        const stateInfo = actionsRow
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('padding', '6px 12px')
            .style('background', '#f8fafc')
            .style('border', '1px solid #d1fae5')
            .style('border-radius', '6px')
            .style('color', '#059669')
            .style('font-size', '12px')
            .style('font-weight', '500');
        
        stateInfo.html(`
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Affichage par défaut (${groupBy === 'depression' ? 'Déprimés ↔ Non déprimés' : 'Hommes ↔ Femmes'})
        `);
    }
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
                // Le tri par groupe est déjà géré dans updateMultiBarChart
                return 0;
                
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
        .text('Aucune donnée');
    
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
        .style('opacity', function(d) {
            // Conserver l'opacité pour les groupes sélectionnés
            if (selectedGroup && d.group === selectedGroup) {
                return 0.85;
            }
            return 0.3;
        });
    
    barChart.svg.selectAll(`.bar-${variable}`)
        .transition()
        .duration(300)
        .style('opacity', function(d) {
            // Conserver l'opacité pour les groupes sélectionnés
            if (selectedGroup && d.group === selectedGroup) {
                return 1;
            }
            return 0.85;
        })
        .style('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.3))');
}

function resetVariableHighlight() {
    barChart.svg.selectAll('.bar')
        .transition()
        .duration(300)
        .style('opacity', function(d) {
            // Restaurer l'opacité selon la sélection
            if (selectedGroup && selectedGroup !== d.group) {
                return 0.3;
            }
            return 0.85;
        })
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

// Fonction pour réinitialiser complètement le bar chart
function resetBarChartToDefault() {
    // Réinitialiser toutes les variables
    selectedGroup = null;
    selectedVariable = null; // AJOUT
    groupBy = 'depression';
    isStacked = false;
    sortBy = 'none';
    showValues = true;
    
    // AJOUT: Réinitialiser le graphique en ligne
    resetLineChart();
    
    // Mettre à jour les contrôles UI
    const groupSelect = document.getElementById('bar-group');
    if (groupSelect) {
        groupSelect.value = 'depression';
    }
    
    const toggleBtn = document.getElementById('toggle-stack');
    if (toggleBtn) {
        toggleBtn.innerHTML = '<i class="fas fa-chart-line" aria-hidden="true" style="margin-right:6px"></i> Vue empilée';
        toggleBtn.classList.remove('active');
    }
    
    // Réinitialiser le filtre si la fonction existe
    if (typeof handleSelection === 'function') {
        handleSelection(null, null);
    }
    
    // Mettre à jour le graphique
    updateMultiBarChart();
    
    // Feedback visuel
    if (barChart && barChart.svg) {
        // Flash vert pour indiquer la réinitialisation
        const flash = barChart.svg
            .append('rect')
            .attr('width', barChart.width)
            .attr('height', barChart.height)
            .attr('fill', 'rgba(16, 185, 129, 0.15)')
            .attr('rx', 8)
            .style('pointer-events', 'none')
            .style('z-index', 100);
        
        flash.transition()
            .duration(800)
            .style('opacity', 0)
            .remove();
    }
}

// Fonction pour réinitialiser uniquement la sélection
function resetBarChartSelection() {
    console.log('resetBarChartSelection appelée');
    
    // Réinitialiser la sélection
    selectedGroup = null;
    selectedVariable = null; // AJOUT: Réinitialiser la variable sélectionnée
    
    // Réinitialiser le filtre si la fonction existe
    if (typeof handleSelection === 'function') {
        console.log('Appel de handleSelection(null, null)');
        handleSelection(null, null);
    } else {
        console.warn('handleSelection non disponible');
    }
    
    // AJOUT: Réinitialiser le graphique en ligne
    resetLineChart();
    
    // Forcer un redessin
    if (barChartInitialized && barChart) {
        console.log('Mise à jour du graphique');
        updateMultiBarChart();
    }
}

// Exposer les fonctions avec des noms uniques
window.initMultiBarChart = initMultiBarChart;
window.updateMultiBarChart = updateMultiBarChart;
window.resetBarChartSelection = resetBarChartSelection;
window.resetBarChartToDefault = resetBarChartToDefault;
window.showMultiBarRelationshipChart = showMultiBarRelationshipChart;
window.hideMultiBarLineChart = hideLineChart;
window.resetMultiBarLineChart = resetLineChart;