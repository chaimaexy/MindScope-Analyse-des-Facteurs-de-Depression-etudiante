// js/charts_dash/indiaMap.js
// Carte de l'Inde avec états - Version corrigée

let indiaMapInitialized = false;
let indiaMap = null;
let selectedMetric = 'depression';
let indiaData = [];
let statesFeature = null;
let stateStats = {};
let colorDomains = {}; // Pour stocker les domaines dynamiques

async function initIndiaMap() {
    if (indiaMapInitialized) return;
    
    const container = d3.select('#us-map');
    if (container.empty()) return;
    
    const width = container.node().clientWidth;
    const height = 400;
    
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'india-map')
        .attr('viewBox', `0 0 ${width} ${height}`);
    
    const mapGroup = svg.append('g').attr('class', 'map-container');
    
    indiaMap = {
        svg,
        mapGroup,
        width,
        height,
        projection: null,
        path: null
    };
    
    try {
        // Charger le fichier GeoJSON
        statesFeature = await d3.json('data/india_state.geojson');
        
        console.log('Fichier GeoJSON chargé');
        console.log('Nombre d\'états:', statesFeature.features.length);
        
        // Projection
        indiaMap.projection = d3.geoMercator()
            .fitSize([width - 40, height - 40], statesFeature);
        
        indiaMap.path = d3.geoPath().projection(indiaMap.projection);
        
        // Dessiner les états
        drawStates();
        
        // Configurer la sélection de métrique
        const metricSelect = document.getElementById('map-metric');
        if (metricSelect) {
            // Force l'événement change au démarrage
            metricSelect.addEventListener('change', function() {
                selectedMetric = this.value;
                console.log('Métrique changée à:', selectedMetric);
                updateIndiaMap();
            });
            
            // Déclencher manuellement l'événement au démarrage
            setTimeout(() => {
                selectedMetric = metricSelect.value;
                console.log('Métrique initiale:', selectedMetric);
                updateIndiaMap();
            }, 100);
        } else {
            // Pas de sélecteur, on initialise quand même
            setTimeout(() => updateIndiaMap(), 100);
        }
        
        // Titre
        mapGroup.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .style('font-size', '14px')
            .style('fill', '#1e293b')
            .style('font-weight', '600')
            .style('text-shadow', '1px 1px 2px white')
            .text('🇮🇳 États de l\'Inde');
        
        indiaMapInitialized = true;
        
    } catch (error) {
        console.error('Erreur chargement carte:', error);
        displayMapError("Chargement des états indiens...");
    }
}

function drawStates() {
    // Dessiner chaque état
    const states = indiaMap.mapGroup.selectAll('.state')
        .data(statesFeature.features)
        .enter()
        .append('path')
        .attr('class', 'state')
        .attr('d', indiaMap.path)
        .attr('stroke', '#475569')
        .attr('stroke-width', 0.8)
        .attr('fill', '#f1f5f9')
        .attr('opacity', 0.9)
        .attr('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#dc2626')
                .attr('stroke-width', 2)
                .attr('opacity', 1);
            
            const stateName = getStateName(d);
            const stats = stateStats[stateName] || { count: 0 };
            showStateTooltip(event, d, stats);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('stroke', '#475569')
                .attr('stroke-width', 0.8)
                .attr('opacity', 0.9);
            hideTooltip();
        })
        .on('click', function(event, d) {
            const stateName = getStateName(d);
            console.log('État cliqué:', stateName);
            if (window.handleSelection) {
                window.handleSelection('state', stateName);
            }
        });
}

function getStateName(stateFeature) {
    const props = stateFeature.properties || {};
    return props.NAME_1 || props.name || props.STATE || props.state || 'État inconnu';
}

function updateIndiaMap() {
    if (!indiaMapInitialized || !indiaMap) return;
    
    console.log('Mise à jour de la carte avec métrique:', selectedMetric);
    
    const data = getFilteredData();
    processStateData(data);
    calculateColorDomains(); // Calculer les domaines dynamiques
    setupColorScales(); // Reconfigurer les échelles avec les bons domaines
    updateStateColors();
    updateLegend();
}

function processStateData(data) {
    // Réinitialiser les statistiques
    stateStats = {};
    
    // Mapping ville → état
    const cityToState = {
        // Maharashtra
        'Mumbai': 'Maharashtra',
        'Pune': 'Maharashtra',
        'Nagpur': 'Maharashtra',
        'Thane': 'Maharashtra',
        'Nashik': 'Maharashtra',
        'Kalyan': 'Maharashtra',
        'Vasai': 'Maharashtra',
        'Aurangabad': 'Maharashtra',
        'Solapur': 'Maharashtra',
        'Kolhapur': 'Maharashtra',
        'Navi Mumbai': 'Maharashtra',
        
        // Delhi
        'Delhi': 'NCT of Delhi',
        'New Delhi': 'NCT of Delhi',
        'Less Delhi': 'NCT of Delhi',
        
        // Karnataka
        'Bangalore': 'Karnataka',
        'Mysore': 'Karnataka',
        'Hubli': 'Karnataka',
        'Mangalore': 'Karnataka',
        
        // Tamil Nadu
        'Chennai': 'Tamil Nadu',
        'Coimbatore': 'Tamil Nadu',
        'Madurai': 'Tamil Nadu',
        'Tiruchirappalli': 'Tamil Nadu',
        
        // Telangana
        'Hyderabad': 'Telangana',
        'Warangal': 'Telangana',
        
        // West Bengal
        'Kolkata': 'West Bengal',
        'Howrah': 'West Bengal',
        'Durgapur': 'West Bengal',
        
        // Gujarat
        'Ahmedabad': 'Gujarat',
        'Vadodara': 'Gujarat',
        'Surat': 'Gujarat',
        'Rajkot': 'Gujarat',
        'Bhavnagar': 'Gujarat',
        
        // Rajasthan
        'Jaipur': 'Rajasthan',
        'Jodhpur': 'Rajasthan',
        'Udaipur': 'Rajasthan',
        'Kota': 'Rajasthan',
        
        // Uttar Pradesh
        'Lucknow': 'Uttar Pradesh',
        'Varanasi': 'Uttar Pradesh',
        'Kanpur': 'Uttar Pradesh',
        'Agra': 'Uttar Pradesh',
        'Meerut': 'Uttar Pradesh',
        'Allahabad': 'Uttar Pradesh',
        'Ghaziabad': 'Uttar Pradesh',
        'Noida': 'Uttar Pradesh',
        
        // Madhya Pradesh
        'Bhopal': 'Madhya Pradesh',
        'Indore': 'Madhya Pradesh',
        'Jabalpur': 'Madhya Pradesh',
        'Gwalior': 'Madhya Pradesh',
        
        // Andhra Pradesh
        'Visakhapatnam': 'Andhra Pradesh',
        'Vijayawada': 'Andhra Pradesh',
        'Guntur': 'Andhra Pradesh',
        
        // Kerala
        'Thiruvananthapuram': 'Kerala',
        'Kochi': 'Kerala',
        'Kozhikode': 'Kerala',
        
        // Punjab
        'Ludhiana': 'Punjab',
        'Amritsar': 'Punjab',
        'Jalandhar': 'Punjab',
        
        // Bihar
        'Patna': 'Bihar',
        'Gaya': 'Bihar',
        
        // Odisha
        'Bhubaneswar': 'Odisha',
        'Cuttack': 'Odisha',
        
        // Assam
        'Guwahati': 'Assam',
        
        // Jammu and Kashmir
        'Srinagar': 'Jammu and Kashmir',
        'Jammu': 'Jammu and Kashmir',
        
        // Haryana
        'Faridabad': 'Haryana',
        'Gurgaon': 'Haryana',
        
        // Uttarakhand
        'Dehradun': 'Uttarakhand',
        
        // Corrections pour les noms atypiques de ton dataset
        '3': 'Karnataka', // Bangalore
        'Bhavna': 'Maharashtra', // Mumbai
        'Gaurav': 'NCT of Delhi',
        'Harsh': 'Karnataka',
        'Harsha': 'Maharashtra',
        'Kibara': 'NCT of Delhi',
        'Mihir': 'Maharashtra',
        'Mira': 'Maharashtra',
        'Nalini': 'Karnataka',
        'Nalyan': 'Maharashtra',
        'Nandini': 'Karnataka',
        'Rashi': 'Maharashtra',
        'Reyansh': 'NCT of Delhi',
        'Saanvi': 'Karnataka',
        'Vaanya': 'NCT of Delhi'
    };
    
    // Compter les étudiants par état
    data.forEach(student => {
        let city = student.city;
        if (!city || city === 'Unknown' || city === '' || city === 'M.Com' || city === 'M.Tech' || city === 'ME') return;
        
        city = city.toString().trim();
        
        // Chercher l'état
        let stateName = cityToState[city];
        
        // Si pas trouvé, essayer avec les premières lettres
        if (!stateName && city.length > 3) {
            for (const [cityName, state] of Object.entries(cityToState)) {
                if (city.toLowerCase().startsWith(cityName.toLowerCase().substring(0, 3))) {
                    stateName = state;
                    break;
                }
            }
        }
        
        if (!stateName) {
            console.log('Ville non mappée:', city);
            return;
        }
        
        // Initialiser les stats
        if (!stateStats[stateName]) {
            stateStats[stateName] = {
                name: stateName,
                count: 0,
                totalCGPA: 0,
                totalSatisfaction: 0,
                depressedCount: 0,
                totalSleep: 0,
                students: [] // Stocker les étudiants pour calculs
            };
        }
        
        const stats = stateStats[stateName];
        stats.count++;
        stats.totalCGPA += student.cgpa || 0;
        stats.totalSatisfaction += student.study_satisfaction || 0;
        stats.totalSleep += student.sleep_duration || 0;
        stats.students.push(student);
        
        if (student.depression === 1) {
            stats.depressedCount++;
        }
    });
    
    // Calculer les moyennes
    Object.keys(stateStats).forEach(stateName => {
        const stats = stateStats[stateName];
        if (stats.count > 0) {
            stats.avgCGPA = stats.totalCGPA / stats.count;
            stats.avgSatisfaction = stats.totalSatisfaction / stats.count;
            stats.depressionRate = stats.depressedCount / stats.count;
            stats.avgSleep = stats.totalSleep / stats.count;
        }
    });
    
    console.log(`${Object.keys(stateStats).length} états avec données`);
}

function calculateColorDomains() {
    // Calculer les domaines réels pour chaque métrique
    
    const statesWithData = Object.values(stateStats).filter(s => s.count > 0);
    
    if (statesWithData.length === 0) {
        colorDomains = {
            depression: [0, 0.5],
            cgpa: [6, 9],
            satisfaction: [2, 4.5],
            count: [0, 10]
        };
        return;
    }
    
    // Pour la dépression: min 40%, max 63%
    const depressionValues = statesWithData.map(s => s.depressionRate || 0);
    const depressionMin = Math.max(0, Math.min(...depressionValues) * 0.9); // 10% en dessous du min
    const depressionMax = Math.min(1, Math.max(...depressionValues) * 1.1); // 10% au dessus du max
    
    // Pour CGPA: trouver la vraie plage
    const cgpaValues = statesWithData.map(s => s.avgCGPA || 0).filter(v => v > 0);
    const cgpaMin = Math.max(5, (Math.min(...cgpaValues) * 0.95).toFixed(2)); // 5% en dessous
    const cgpaMax = Math.min(10, (Math.max(...cgpaValues) * 1.05).toFixed(2)); // 5% au dessus
    
    // Pour satisfaction: trouver la vraie plage
    const satisfactionValues = statesWithData.map(s => s.avgSatisfaction || 0).filter(v => v > 0);
    const satisfactionMin = Math.max(1, (Math.min(...satisfactionValues) * 0.95).toFixed(2));
    const satisfactionMax = Math.min(5, (Math.max(...satisfactionValues) * 1.05).toFixed(2));
    
    // Pour le nombre d'étudiants
    const countValues = statesWithData.map(s => s.count || 0);
    const countMax = Math.max(...countValues);
    
    colorDomains = {
        depression: [depressionMin, depressionMax],
        cgpa: [cgpaMin, cgpaMax],
        satisfaction: [satisfactionMin, satisfactionMax],
        count: [0, countMax]
    };
    
    console.log('Domaines de couleur calculés:', colorDomains);
}

function setupColorScales() {
    const domains = colorDomains;
    
    indiaMap.colorScales = {
        depression: d3.scaleSequential(d3.interpolateReds)
            .domain(domains.depression)
            .clamp(true),
        
        cgpa: d3.scaleSequential(d3.interpolateGreens)
            .domain(domains.cgpa)
            .clamp(true),
        
        satisfaction: d3.scaleSequential(d3.interpolateBlues)
            .domain(domains.satisfaction)
            .clamp(true),
        
        count: d3.scaleSequential(d3.interpolatePurples)
            .domain(domains.count)
            .clamp(true)
    };
    
    console.log('Échelles configurées pour:', selectedMetric, 'avec domaine:', domains[selectedMetric]);
}

function updateStateColors() {
    if (!indiaMap.mapGroup) return;
    
    const scale = indiaMap.colorScales[selectedMetric];
    if (!scale) {
        console.error('Échelle non trouvée pour:', selectedMetric);
        return;
    }
    
    indiaMap.mapGroup.selectAll('.state')
        .transition()
        .duration(500)
        .attr('fill', function(d) {
            const stateName = getStateName(d);
            const stats = stateStats[stateName];
            
            if (!stats || stats.count === 0) {
                return '#f8fafc'; // Gris clair pour états sans données
            }
            
            let value;
            switch(selectedMetric) {
                case 'depression':
                    value = stats.depressionRate || 0;
                    break;
                case 'cgpa':
                    value = stats.avgCGPA || 0;
                    break;
                case 'satisfaction':
                    value = stats.avgSatisfaction || 0;
                    break;
                case 'count':
                    value = stats.count || 0;
                    break;
                default:
                    value = 0;
            }
            
            // Appliquer la couleur
            return scale(value);
        });
}

function showStateTooltip(event, stateFeature, stats) {
    const tooltip = createTooltip();
    const stateName = getStateName(stateFeature);
    
    let metricValue, metricLabel, extraInfo = '';
    
    switch(selectedMetric) {
        case 'depression':
            metricValue = stats.depressionRate ? (stats.depressionRate * 100).toFixed(1) + '%' : 'N/A';
            metricLabel = 'Taux Dépression';
            extraInfo = `Plage: ${(colorDomains.depression[0]*100).toFixed(1)}%-${(colorDomains.depression[1]*100).toFixed(1)}%`;
            break;
        case 'cgpa':
            metricValue = stats.avgCGPA ? stats.avgCGPA.toFixed(2) : 'N/A';
            metricLabel = 'CGPA Moyen';
            extraInfo = `Plage: ${colorDomains.cgpa[0].toFixed(2)}-${colorDomains.cgpa[1].toFixed(2)}`;
            break;
        case 'satisfaction':
            metricValue = stats.avgSatisfaction ? stats.avgSatisfaction.toFixed(1) : 'N/A';
            metricLabel = 'Satisfaction';
            extraInfo = `Plage: ${colorDomains.satisfaction[0].toFixed(1)}-${colorDomains.satisfaction[1].toFixed(1)}`;
            break;
        case 'count':
            metricValue = stats.count || 0;
            metricLabel = 'Nombre Étudiants';
            extraInfo = `Max: ${colorDomains.count[1]}`;
            break;
    }
    
    tooltip
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px')
        .style('display', 'block')
        .html(`
            <div style="min-width: 250px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="font-size: 15px; color: #1e293b;">${stateName}</strong>
                    <span style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 12px;">
                        ${stats.count || 0} étudiant${stats.count !== 1 ? 's' : ''}
                    </span>
                </div>
                
                ${stats.count > 0 ? `
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
                        <span style="font-size: 13px; color: #475569; font-weight: 500;">${metricLabel}:</span>
                        <strong style="font-size: 16px; color: ${getMetricColor()}; padding: 4px 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                            ${metricValue}
                        </strong>
                    </div>
                    
                    <div style="font-size: 11px; color: #64748b; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
                            <div>📊 CGPA: <strong>${stats.avgCGPA ? stats.avgCGPA.toFixed(2) : 'N/A'}</strong></div>
                            <div>😊 Satisfaction: <strong>${stats.avgSatisfaction ? stats.avgSatisfaction.toFixed(1) : 'N/A'}/5</strong></div>
                            <div>😔 Dépression: <strong>${stats.depressionRate ? (stats.depressionRate * 100).toFixed(1) : '0'}%</strong></div>
                            <div>😴 Sommeil: <strong>${stats.avgSleep ? stats.avgSleep.toFixed(1) : 'N/A'}/5</strong></div>
                        </div>
                        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
                            ${extraInfo}
                        </div>
                    </div>
                </div>
                ` : `
                <div style="background: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 10px; text-align: center;">
                    <div style="color: #dc2626; font-size: 13px;">
                        ⚠️ Aucun étudiant de cet état
                    </div>
                </div>
                `}
                
                <div style="font-size: 11px; color: #64748b; text-align: center; padding: 6px; background: #f1f5f9; border-radius: 6px;">
                    👆 Cliquer pour filtrer cet état
                </div>
            </div>
        `);
}

function getMetricColor() {
    switch(selectedMetric) {
        case 'depression': return '#dc2626';
        case 'cgpa': return '#16a34a';
        case 'satisfaction': return '#2563eb';
        case 'count': return '#7c3aed';
        default: return '#475569';
    }
}

function createTooltip() {
    let tooltip = d3.select('#india-state-tooltip');
    
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('id', 'india-state-tooltip')
            .style('position', 'absolute')
            .style('background', 'white')
            .style('border', '1px solid #e2e8f0')
            .style('border-radius', '10px')
            .style('padding', '15px')
            .style('box-shadow', '0 10px 25px -5px rgba(0,0,0,0.1)')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('font-family', 'system-ui, sans-serif')
            .style('max-width', '280px');
    }
    
    return tooltip;
}

function hideTooltip() {
    d3.select('#india-state-tooltip').style('display', 'none');
}

function updateLegend() {
    if (!indiaMap || !indiaMap.mapGroup) return;
    
    indiaMap.mapGroup.selectAll('.map-legend').remove();
    
    const legendWidth = 200;
    const legendHeight = 14;
    const legendX = indiaMap.width - legendWidth - 20;
    const legendY = 30;
    
    const legend = indiaMap.mapGroup.append('g')
        .attr('class', 'map-legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);
    
    const defs = legend.append('defs');
    const gradientId = 'gradient-' + Date.now();
    const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
    
    const colors = getLegendColors();
    colors.forEach((color, i) => {
        gradient.append('stop')
            .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
            .attr('stop-color', color);
    });
    
    legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#${gradientId})`)
        .style('rx', 6)
        .style('opacity', 0.9);
    
    // Titre avec l'icône
    legend.append('text')
        .attr('x', 0)
        .attr('y', -5)
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '600')
        .text(getLegendTitle());
    
    // Labels avec valeurs réelles
    const domain = colorDomains[selectedMetric] || [0, 1];
    
    legend.append('text')
        .attr('x', 0)
        .attr('y', legendHeight + 16)
        .style('font-size', '11px')
        .style('fill', '#64748b')
        .style('font-weight', '500')
        .text(getLegendMinValue(domain[0]));
    
    legend.append('text')
        .attr('x', legendWidth)
        .attr('y', legendHeight + 16)
        .attr('text-anchor', 'end')
        .style('font-size', '11px')
        .style('fill', '#64748b')
        .style('font-weight', '500')
        .text(getLegendMaxValue(domain[1]));
}

function getLegendColors() {
    switch(selectedMetric) {
        case 'depression':
            // Rouge plus varié
            return ['#ffedea', '#ffcec5', '#ffad9f', '#ff8a75', '#ff5533', '#e63900', '#cc2200'];
        case 'cgpa':
            // Vert plus contrasté
            return ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#4caf50', '#388e3c', '#1b5e20'];
        case 'satisfaction':
            // Bleu plus contrasté
            return ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#1e88e5', '#0d47a1'];
        case 'count':
            // Violet plus contrasté
            return ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#8e24aa', '#6a1b9a'];
        default:
            return ['#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#334155'];
    }
}

function getLegendTitle() {
    switch(selectedMetric) {
        case 'depression': return '😔 Taux de Dépression';
        case 'cgpa': return '📊 CGPA Moyen';
        case 'satisfaction': return '😊 Satisfaction';
        case 'count': return '👥 Nombre d\'Étudiants';
        default: return '📈 Métrique';
    }
}

function getLegendMinValue(value) {
    switch(selectedMetric) {
        case 'depression': return (value * 100).toFixed(0) + '%';
        case 'cgpa': return value.toFixed(1);
        case 'satisfaction': return value.toFixed(1);
        case 'count': return Math.round(value);
        default: return 'Min';
    }
}

function getLegendMaxValue(value) {
    switch(selectedMetric) {
        case 'depression': return (value * 100).toFixed(0) + '%';
        case 'cgpa': return value.toFixed(1);
        case 'satisfaction': return value.toFixed(1);
        case 'count': return Math.round(value) + '+';
        default: return 'Max';
    }
}

function displayMapError(message) {
    if (!indiaMap.svg) return;
    
    indiaMap.svg.selectAll('*').remove();
    
    indiaMap.svg.append('text')
        .attr('x', indiaMap.width / 2)
        .attr('y', indiaMap.height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#475569')
        .style('font-size', '14px')
        .style('font-weight', '500')
        .text(message);
}

// Exposer les fonctions
window.initIndiaMap = initIndiaMap;
window.updateIndiaMap = updateIndiaMap;
window.initUSMap = initIndiaMap;
window.updateUSMap = updateIndiaMap;