// js/profiling.js


// Variables globales
let rawData = [];
let processedData = [];
let clusters = [];
let currentSelection = {
    cluster: null,
    student: null,
    projection: 'pca'
};


// Variables de configuration
const CONFIG = {
    numClusters: 5,
    features: [
        'Academic Pressure',
        'Study Satisfaction', 
        'Sleep Duration',
        'Financial Stress',
        'Dietary Habits',
        'Work/Study Hours',
        'CGPA'
    ],
    featureKeys: [
        'academic_pressure',
        'study_satisfaction',
        'sleep_duration',
        'financial_stress',
        'dietary_habits',
        'work_study_hours',
        'cgpa'
    ]
};

// Initialisation principale
async function initProfiling() {
    showLoading(true);
    
    try {
        // 1. Charger les données
        rawData = await loadData();
        
        // 2. Prétraiter les données
        processedData = preprocessStudentData(rawData);
        
        // 3. Effectuer le clustering
        clusters = performClustering(processedData, CONFIG.numClusters);
        
        // 4. Mettre à jour les KPIs
        updateKPIs();
        
        // 5. Initialiser les visualisations
        initializeVisualizations();
        
        // 6. Initialiser les événements
        initializeEventListeners();
        
        // 7. Initialiser les filtres
        const filterManager = setupFilters(handleFilterChange);
        
        // 8. Sélectionner un cluster par défaut
        selectCluster(0);
        
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        alert("Erreur lors du chargement des données. Voir la console pour plus de détails.");
    } finally {
        showLoading(false);
    }
}

// Mettre à jour les KPIs
// Mettre à jour les KPIs
function updateKPIs() {
    const total = processedData.length;
    
    // VÉRIFIEZ CE QUI SE PASSE DANS LA CONSOLE
    console.log("Vérification des données de dépression...");
    console.log("Premier étudiant:", processedData[0]);
    console.log("Sa valeur depression:", processedData[0].depression);
    console.log("Type de depression:", typeof processedData[0].depression);
    
    // Comptez avec différentes méthodes pour déboguer
    const depressed1 = processedData.filter(d => d.depression === 1).length;
    const depressedString = processedData.filter(d => d.depression === "1").length;
    const depressedTruthy = processedData.filter(d => d.depression).length;
    const depressedGreater0 = processedData.filter(d => d.depression > 0).length;
    
    console.log(`Méthode 1 (=== 1): ${depressed1}`);
    console.log(`Méthode 2 (=== "1"): ${depressedString}`);
    console.log(`Méthode 3 (truthy): ${depressedTruthy}`);
    console.log(`Méthode 4 (> 0): ${depressedGreater0}`);
    
    // Essayez de voir toutes les valeurs uniques
    const uniqueValues = [...new Set(processedData.slice(0, 100).map(d => d.depression))];
    console.log("Valeurs uniques (100 premiers):", uniqueValues.sort((a, b) => a - b));
    
    // Utilisez la méthode qui fonctionne
    const depressed = depressed1; // ou une autre méthode selon le débogage
    
    const depressionRate = ((depressed / total) * 100).toFixed(1);
    
    console.log(`Résultat: ${depressed}/${total} = ${depressionRate}%`);
    
    // Trouver le facteur de risque principal
    const riskFactors = calculateRiskFactors();
    const mainRisk = riskFactors[0]?.name || '-';
    
    document.getElementById('total-students').textContent = total;
    document.getElementById('depression-rate').textContent = `${depressionRate}%`;
    document.getElementById('cluster-count').textContent = CONFIG.numClusters;
    document.getElementById('main-risk').textContent = mainRisk;
}

// Initialiser les visualisations
function initializeVisualizations() {
    try {
        console.log('Initialisation des visualisations...');
        
        // 1. Scatter plot
        try {
            if (typeof createScatterPlot === 'function') {
                createScatterPlot(
                    '#cluster-map',
                    processedData,
                    clusters,
                    CLUSTER_COLORS,
                    currentSelection.projection
                );
            } else {
                console.warn('createScatterPlot non disponible');
            }
        } catch (error) {
            console.error('Erreur dans scatter plot:', error);
        }
        
        // 2. Radar chart
        try {
            // Créer le radar chart avec les features
            createRadarChart('#profile-radar', CONFIG.featureKeys);
            
            // Mettre à jour avec des données par défaut
            setTimeout(() => {
                if (clusters.length > 0) {
                    const clusterData = clusters[0] || [];
                    updateRadarForCluster(clusterData);
                }
            }, 500);
            
        } catch (error) {
            console.error('Erreur dans radar chart:', error);
        }
        
        // 3. Heatmap
        try {
            if (typeof createCorrelationHeatmap === 'function') {
                createCorrelationHeatmap('#cluster-heatmap', []);
            }
        } catch (error) {
            console.error('Erreur dans heatmap:', error);
        }

        
        // 4. Small multiples
       try {
    if (typeof createSunburstChart === 'function') {
        createSunburstChart('#bubble-chart-container', processedData, clusters);
    } else {
        console.warn('createSunburstChart non disponible');
    }
} catch (error) {
    console.error('Erreur dans sunburst chart:', error);
}
        
        // 5. Légende
        createClusterLegend();
        
        // 6. Sélecteur
        populateStudentSelector();
        
        console.log('Visualisations initialisées avec succès');
        
    } catch (error) {
        console.error('Erreur générale dans initializeVisualizations:', error);
    }
}

// Créer la légende des clusters
// Créer la légende des clusters
function createClusterLegend() {
    const legendContainer = d3.select('#cluster-legend');
    legendContainer.selectAll('*').remove();
    
    const legend = legendContainer
        .selectAll('.legend-item')
        .data(clusters)
        .enter()
        .append('div')
        .attr('class', 'legend-item')
        .classed('active', (d, i) => i === 0);
    
    legend.append('div')
        .attr('class', 'legend-color')
        .style('background-color', (d, i) => CLUSTER_COLORS[i]);
    
    legend.append('span')
        .text((d, i) => `Cluster ${i + 1} (${d.length} étudiants)`);
    
    // Événement de clic - CORRIGEZ ICI
    legend.on('click', function(event, d, i) {
        console.log('Légende cliquée, index:', i, 'type de i:', typeof i);
        if (i !== undefined) {
            selectCluster(i);
        } else {
            // Essayer de trouver l'index autrement
            const index = Array.from(legendContainer.selectAll('.legend-item').nodes()).indexOf(this);
            console.log('Index trouvé via DOM:', index);
            if (index !== -1) {
                selectCluster(index);
            }
        }
        d3.selectAll('.legend-item').classed('active', false);
        d3.select(this).classed('active', true);
    });
}

// Populer le sélecteur d'étudiants
// Populer le sélecteur d'étudiants
function populateStudentSelector() {
    const container = d3.select('#student-selector');
    container.selectAll('*').remove();
    
    // Prendre un échantillon REPRÉSENTATIF (pas juste 1 sur 20)
    const sampleStudents = getRepresentativeStudents();
    
    console.log('Sélecteur d\'étudiants:', sampleStudents.length, 'étudiants représentatifs');
    
    const cards = container
        .selectAll('.student-card')
        .data(sampleStudents)
        .enter()
        .append('div')
        .attr('class', 'student-card')
        .attr('title', d => `Cliquez pour voir le profil détaillé de l'étudiant #${d.id}`)
        .classed('selected', (d, i) => i === 0);
    
    // Header avec nom et statut
    cards.append('div')
        .attr('class', 'student-header')
        .html(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <span class="student-name" style="font-weight: 600;">Étudiant #${d.id}</span>
                <span class="student-depression-badge ${d.depression === 1 ? 'depressed' : 'healthy'}">
                    ${d.depression === 1 ? '⚠️' : '✅'}
                </span>
            </div>
        `);
    
    // Informations principales
    cards.append('div')
        .attr('class', 'student-info')
        .html(d => `
            <div style="font-size: 11px; color: #64748b;">
                <div>Âge: ${d.age} ans</div>
                <div>CGPA: ${d.cgpa?.toFixed(2) || 'N/A'}/10</div>
                <div>Cluster: <span style="color: #4f46e5; font-weight: 500;">${d.cluster_id + 1}</span></div>
            </div>
        `);
    
    // Score de risque
    cards.append('div')
        .attr('class', 'student-risk')
        .html(d => {
            const riskScore = calculateStudentRiskScore(d);
            const riskLevel = getRiskLevel(riskScore);
            return `
                <div style="margin-top: 5px; font-size: 10px;">
                    <div style="background: ${riskLevel.color}; color: white; padding: 2px 6px; 
                         border-radius: 10px; text-align: center; font-weight: 500;">
                        ${riskLevel.label}
                    </div>
                </div>
            `;
        });
    
    // Événement de clic
    cards.on('click', function(event, d) {
        console.log('Étudiant sélectionné:', d.id, 'Cluster:', d.cluster_id + 1);
        
        // Mettre à jour la sélection visuelle
        d3.selectAll('.student-card').classed('selected', false);
        d3.select(this).classed('selected', true);
        
        // Sélectionner l'étudiant
        selectStudent(d);
        
        // Mettre à jour le mode de comparaison automatiquement
        document.getElementById('comparison-mode').value = 'student-vs-cluster';
        
        // Forcer la mise à jour du radar
        updateRadarForStudent(d);
    });
    
    // Sélectionner le premier étudiant par défaut
    if (sampleStudents.length > 0) {
        selectStudent(sampleStudents[0]);
    }
}

// === FONCTIONS MANQUANTES À AJOUTER ===

// 1. Calculer le score de risque d'un étudiant
function calculateStudentRiskScore(student) {
    if (!student) return 0;
    
    let score = 0;
    
    // Facteurs de risque avec pondérations
    const riskFactors = {
        depression: { weight: 30, value: student.depression === 1 ? 1 : 0 },
        suicidal: { weight: 25, value: student.hasSuicidalThoughts ? 1 : 0 },
        academic_pressure: { weight: 15, value: (student.academic_pressure || 0) / 5 },
        sleep_duration: { 
            weight: 15, 
            value: student.sleep_duration <= 2 ? 1 : student.sleep_duration <= 3 ? 0.5 : 0 
        },
        financial_stress: { weight: 10, value: (student.financial_stress || 0) / 5 },
        family_history: { weight: 5, value: student.family_history ? 1 : 0 }
    };
    
    // Calculer le score total
    for (const factor in riskFactors) {
        score += riskFactors[factor].weight * riskFactors[factor].value;
    }
    
    return Math.min(100, Math.round(score));
}

// 2. Obtenir le niveau de risque
function getRiskLevel(score) {
    if (score >= 60) {
        return { label: 'Risque Élevé', color: '#dc2626' };
    } else if (score >= 30) {
        return { label: 'Risque Moyen', color: '#f59e0b' };
    } else {
        return { label: 'Faible Risque', color: '#16a34a' };
    }
}

// 3. Sélectionner un étudiant (version simplifiée)
function selectStudent(student) {
    console.log(' Sélection de l\'étudiant #' + student.id);
    
    if (!student) {
        console.error('Aucun étudiant fourni');
        return;
    }
    
    // Mettre à jour la sélection globale
    currentSelection.student = student;
    currentSelection.cluster = student.cluster_id;
    
    // Mettre à jour l'affichage
    updateDisplayForStudent(student);
}

// 4. Mettre à jour l'affichage pour un étudiant
function updateDisplayForStudent(student) {
    // A. Mettre à jour l'ID du cluster
    const clusterIdEl = document.getElementById('current-cluster-id');
    if (clusterIdEl) {
        clusterIdEl.textContent = (student.cluster_id + 1).toString();
    }
    
    // B. Obtenir les données du cluster
    const clusterData = clusters[student.cluster_id] || [];
    
    // C. Mettre à jour les statistiques du cluster
    updateClusterStats(clusterData);
    
    // D. Mettre à jour le badge de risque
    updateRiskBadge(clusterData);
    
    // E. Mettre à jour le heatmap
    updateClusterHeatmap(clusterData);
    
    // F. Afficher le résumé de l'étudiant
    showStudentSummary(student, clusterData);
    
    // G. Mettre à jour les autres visualisations
    updateBubbleChart();
    
    
    console.log('✅ Affichage mis à jour pour l\'étudiant #' + student.id);
}

// 5. Afficher le résumé de l'étudiant
function showStudentSummary(student, clusterData) {
    // Créer ou trouver le conteneur
    let summaryContainer = document.getElementById('student-summary-container');
    
    if (!summaryContainer) {
        summaryContainer = document.createElement('div');
        summaryContainer.id = 'student-summary-container';
        summaryContainer.className = 'student-summary';
        
        // Insérer après le sélecteur
        const selector = document.getElementById('student-selector');
        if (selector && selector.parentNode) {
            selector.parentNode.insertBefore(summaryContainer, selector.nextSibling);
        }
    }
    
    // Calculer quelques comparaisons
    const comparisons = [];
    CONFIG.featureKeys.forEach((key, index) => {
        const studentVal = student[key] || 0;
        const clusterAvg = d3.mean(clusterData.map(d => d[key] || 0)) || 0;
        
        if (clusterAvg > 0) {
            const diffPercent = ((studentVal - clusterAvg) / clusterAvg * 100).toFixed(1);
            comparisons.push({
                feature: CONFIG.features[index] || key,
                student: studentVal,
                cluster: clusterAvg,
                diff: diffPercent
            });
        }
    });
    
    // Trier par plus grande différence
    comparisons.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    
    // HTML du résumé
    const riskScore = calculateStudentRiskScore(student);
    const riskLevel = getRiskLevel(riskScore);
    
    summaryContainer.innerHTML = `
        <div class="student-detail-card">
            <div class="detail-header">
                <h4>📋 Étudiant #${student.id}</h4>
                <div class="detail-status">
                    <span class="depression-status ${student.depression === 1 ? 'depressed' : 'healthy'}">
                        ${student.depression === 1 ? '⚠️ Déprimé' : '✅ Sain'}
                    </span>
                    <span class="risk-badge" style="background: ${riskLevel.color}">
                        ${riskLevel.label} (${riskScore}%)
                    </span>
                </div>
            </div>
            
            <div class="detail-stats">
                <div class="stat-item">
                    <div class="stat-label">Âge</div>
                    <div class="stat-value">${student.age} ans</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">CGPA</div>
                    <div class="stat-value">${student.cgpa?.toFixed(2) || 'N/A'}/10</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Cluster</div>
                    <div class="stat-value cluster-value">${student.cluster_id + 1}</div>
                </div>
            </div>
            
            ${comparisons.length > 0 ? `
            <div class="comparisons">
                <div class="comparison-title">📈 Comparaison avec son cluster:</div>
                <div class="comparison-items">
                    ${comparisons.slice(0, 3).map(comp => `
                        <div class="comparison-item">
                            <span class="comparison-feature">${comp.feature}:</span>
                            <span class="comparison-value ${parseFloat(comp.diff) > 0 ? 'higher' : 'lower'}">
                                ${Math.abs(comp.diff)}% ${parseFloat(comp.diff) > 0 ? 'plus haut' : 'plus bas'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// 6. Mettre à jour le radar pour un étudiant
function updateRadarForStudent(student) {
    console.log('🔄 Mise à jour du radar pour étudiant #' + student.id);
    
    // Vérifier si le radar est initialisé
    if (!radarChartInstance) {
        console.warn('Radar chart non initialisé');
        return;
    }
    
    // Obtenir les données du cluster
    const clusterData = clusters[student.cluster_id] || [];
    
    // Calculer les moyennes du cluster
    const clusterMeans = {};
    CONFIG.featureKeys.forEach(key => {
        const values = clusterData.map(d => d[key] || 0);
        clusterMeans[key] = d3.mean(values) || 0;
    });
    
    // Mettre à jour le radar
    updateRadarChart(
        '#profile-radar',
        student,               // Données étudiant
        clusterMeans,          // Moyennes du cluster
        CONFIG.featureKeys,    // Features à afficher
        `Étudiant #${student.id} vs Cluster ${student.cluster_id + 1}` // Titre
    );
    
    console.log('✅ Radar mis à jour');
}



// Obtenir des étudiants représentatifs
function getRepresentativeStudents() {
    // Prendre 2 étudiants de chaque cluster
    const studentsByCluster = {};
    
    processedData.forEach(student => {
        if (!studentsByCluster[student.cluster_id]) {
            studentsByCluster[student.cluster_id] = [];
        }
        studentsByCluster[student.cluster_id].push(student);
    });
    
    const representativeStudents = [];
    
    // Pour chaque cluster, prendre 2 étudiants (1 déprimé, 1 non déprimé si possible)
    Object.keys(studentsByCluster).forEach(clusterId => {
        const clusterStudents = studentsByCluster[clusterId];
        
        // Prendre un étudiant déprimé
        const depressedStudent = clusterStudents.find(s => s.depression === 1);
        if (depressedStudent) {
            representativeStudents.push(depressedStudent);
        }
        
        // Prendre un étudiant non déprimé
        const healthyStudent = clusterStudents.find(s => s.depression === 0);
        if (healthyStudent) {
            representativeStudents.push(healthyStudent);
        }
        
        // Si pas assez, ajouter des étudiants aléatoires
        if (representativeStudents.filter(s => s.cluster_id == clusterId).length < 2) {
            const randomStudent = clusterStudents[Math.floor(Math.random() * clusterStudents.length)];
            if (randomStudent && !representativeStudents.includes(randomStudent)) {
                representativeStudents.push(randomStudent);
            }
        }
    });
    
    // Limiter à 12 étudiants max
    return representativeStudents.slice(0, 12);
}

// Calculer un score de risque pour un étudiant
function calculateStudentRiskScore(student) {
    let score = 0;
    
    // Facteurs de risque
    if (student.depression === 1) score += 30;
    if (student.hasSuicidalThoughts) score += 25;
    if (student.academic_pressure >= 4) score += 15;
    if (student.sleep_duration <= 2) score += 15;
    if (student.financial_stress >= 4) score += 10;
    if (student.family_history) score += 5;
    
    return Math.min(100, score);
}

// Obtenir le niveau de risque
function getRiskLevel(score) {
    if (score >= 60) {
        return { label: 'Risque Élevé', color: '#dc2626' };
    } else if (score >= 30) {
        return { label: 'Risque Moyen', color: '#f59e0b' };
    } else {
        return { label: 'Faible Risque', color: '#16a34a' };
    }
}


// Sélectionner un cluster
function selectCluster(clusterIndex) {
    // VALIDATION IMPORTANTE
    if (clusterIndex === undefined || clusterIndex === null) {
        console.error('ClusterIndex est undefined!', clusterIndex);
        console.trace(); // Voir d'où vient l'appel
        return;
    }
    
    // Convertir en nombre si c'est une chaîne
    clusterIndex = parseInt(clusterIndex);
    
    // Vérifier les limites
    if (clusterIndex < 0 || clusterIndex >= clusters.length) {
        console.warn(`Index de cluster invalide: ${clusterIndex}. Doit être entre 0 et ${clusters.length - 1}`);
        clusterIndex = 0; // Revenir au cluster par défaut
    }
    
    console.log('Sélection du cluster:', clusterIndex, 'type:', typeof clusterIndex);
    
    currentSelection.cluster = clusterIndex;
    currentSelection.student = null;
    
    // Mettre à jour l'affichage
    document.getElementById('current-cluster-id').textContent = clusterIndex + 1;
    
    // Prendre directement les données du tableau clusters
    const clusterData = clusters[clusterIndex] || [];
    console.log('Données du cluster:', clusterData.length, 'étudiants');
    
    if (clusterData.length === 0) {
        console.warn('Cluster vide à l\'index', clusterIndex);
        console.log('Taille de clusters:', clusters.length);
        console.log('Clusters disponibles:', clusters.map((c, i) => `[${i}]: ${c.length}`));
    }
    
    // Calculer les statistiques du cluster
    updateClusterStats(clusterData);
    
    // Mettre à jour la heatmap
    updateClusterHeatmap(clusterData);
    
    // Mettre à jour le radar chart
    updateRadarForCluster(clusterData);
    
    // Mettre à jour les small multiples
    updateBubbleChart();
    
    // Mettre à jour les outliers
     updateOutliers();
    
    // Mettre à jour le badge de risque
    updateRiskBadge(clusterData);
}

function updateOutliers() {
    if (currentSelection.cluster !== null) {
        const clusterData = processedData.filter(d => d.cluster_id === currentSelection.cluster);
        const outliers = detectOutliers(clusterData, CONFIG.featureKeys);
        displayOutliers('#outliers-list', outliers);
    }
}

// Mettre à jour les statistiques du cluster
// Mettre à jour les statistiques du cluster - VERSION ULTIME
function updateClusterStats(clusterData) {
    const container = d3.select('#cluster-stats');
    container.selectAll('*').remove();
    
    // Fonction helper pour calculer les moyennes en toute sécurité
    const safeMean = (data, key) => {
        if (!data || data.length === 0) return 0;
        const values = data.map(d => d[key]).filter(v => v !== undefined && v !== null);
        return values.length > 0 ? d3.mean(values) : 0;
    };
    
    // DEBUG: Afficher les 3 premiers étudiants du cluster
    console.log('=== DEBUG CLUSTER DATA ===');
    if (clusterData.length > 0) {
        clusterData.slice(0, 3).forEach((student, i) => {
            console.log(`Student ${i+1}: ID=${student.id}, suicidal="${student.hasSuicidalThoughts}", type=${typeof student.hasSuicidalThoughts}`);
        });
    }
    
    // Fonction de comptage robuste POUR LES PENSÉES SUICIDAIRES
    const countSuicidalThoughts = (data) => {
        if (!data || data.length === 0) return 0;
        
        let count = 0;
        data.forEach((student, index) => {
            const val = student.hasSuicidalThoughts;
            
            // DEBUG détaillé pour les 5 premiers
            if (index < 5) {
                console.log(`  [${index}] ID ${student.id}: suicidal = "${val}" (${typeof val})`);
            }
            
            if (val === undefined || val === null) return;
            
            let isSuicidal = false;
            
            // Vérifier selon le type
            if (typeof val === 'boolean') {
                isSuicidal = val === true;
            } else if (typeof val === 'number') {
                isSuicidal = val === 1;
            } else if (typeof val === 'string') {
                const lowerVal = val.toString().toLowerCase().trim();
                // CORRECTION IMPORTANTE: "false" en chaîne doit retourner false
                // "true" en chaîne doit retourner true
                isSuicidal = (lowerVal === 'true' || 
                             lowerVal === 'yes' || 
                             lowerVal === '1' || 
                             lowerVal === 'oui' ||
                             lowerVal === 'y');
            }
            
            if (isSuicidal) {
                count++;
                if (index < 5) {
                    console.log(`    → COMPTÉ comme suicidaire`);
                }
            }
        });
        
        console.log(`Total suicidal in cluster: ${count}/${data.length}`);
        return count;
    };
    
    // Fonction pour compter la dépression
    const countDepression = (data) => {
        if (!data || data.length === 0) return 0;
        
        return data.filter(d => {
            const val = d.depression;
            if (typeof val === 'number') return val === 1;
            if (typeof val === 'string') return val.toString().trim() === '1' || val.toLowerCase().trim() === 'yes';
            if (typeof val === 'boolean') return val === true;
            return false;
        }).length;
    };
    
    const clusterSize = clusterData.length;
    const depressionCount = countDepression(clusterData);
    const suicidalCount = countSuicidalThoughts(clusterData);
    
    const depressionRate = clusterSize > 0 ? (depressionCount / clusterSize * 100) : 0;
    const suicidalRate = clusterSize > 0 ? (suicidalCount / clusterSize * 100) : 0;
    
    console.log('=== RÉSULTATS CLUSTER ===');
    console.log(`Taille: ${clusterSize}`);
    console.log(`Dépression: ${depressionCount} (${depressionRate.toFixed(1)}%)`);
    console.log(`Suicidaire: ${suicidalCount} (${suicidalRate.toFixed(1)}%)`);
    
    const stats = [
        {
            label: 'Taille du Cluster',
            value: clusterSize,
            unit: 'étudiants'
        },
        {
            label: 'Taux de Dépression',
            value: depressionRate.toFixed(1),
            unit: '%'
        },
       
        {
            label: 'Âge Moyen',
            value: safeMean(clusterData, 'age').toFixed(1),
            unit: 'ans'
        },
        {
            label: 'CGPA Moyen',
            value: safeMean(clusterData, 'cgpa').toFixed(2),
            unit: '/10'
        },
        {
            label: 'Stress Académique',
            value: safeMean(clusterData, 'academic_pressure').toFixed(1),
            unit: '/5'
        }
    ];
    
    const statItems = container
        .selectAll('.stat-item')
        .data(stats)
        .enter()
        .append('div')
        .attr('class', 'stat-item');
    
    statItems.append('div')
        .attr('class', 'stat-label')
        .text(d => d.label);
    
    statItems.append('div')
        .attr('class', 'stat-value')
        .html(d => `${d.value} <small>${d.unit}</small>`);
}

// Mettre à jour la heatmap du cluster
function updateClusterHeatmap(clusterData) {
    // Extraire les données pour la heatmap
    const heatmapData = CONFIG.featureKeys.map(key => {
        return CONFIG.featureKeys.map(otherKey => {
            const values1 = clusterData.map(d => d[key]);
            const values2 = clusterData.map(d => d[otherKey]);
            return calculateCorrelation(values1, values2);
        });
    });
    
    createCorrelationHeatmap('#cluster-heatmap', heatmapData, CONFIG.features);
}

// Mettre à jour le radar chart pour un cluster
function updateRadarForCluster(clusterData) {
    // Calculer les moyennes du cluster
    const clusterMeans = {};
    CONFIG.featureKeys.forEach(key => {
        clusterMeans[key] = d3.mean(clusterData, d => d[key]);
    });
    
    // Calculer les moyennes globales
    const globalMeans = {};
    CONFIG.featureKeys.forEach(key => {
        globalMeans[key] = d3.mean(processedData, d => d[key]);
    });
    
    updateRadarChart('#profile-radar', clusterMeans, globalMeans, CONFIG.features, 'Cluster vs Global');
}

// Mettre à jour le radar chart pour un étudiant
function updateRadarForStudent(student) {
    console.log('🔄 Mise à jour du radar pour étudiant', student);
    
    // Vérifier les données de l'étudiant
    console.log('Données étudiant disponibles:', {
        academic_pressure: student.academic_pressure,
        study_satisfaction: student.study_satisfaction,
        sleep_duration: student.sleep_duration,
        financial_stress: student.financial_stress,
        dietary_habits: student.dietary_habits,
        work_study_hours: student.work_study_hours,
        cgpa: student.cgpa
    });
    
    // Obtenir les données du cluster
    const clusterData = clusters[student.cluster_id] || [];
    
    // Calculer les moyennes du cluster
    const clusterMeans = {};
    CONFIG.featureKeys.forEach(key => {
        const values = clusterData.map(d => d[key] || 0);
        clusterMeans[key] = d3.mean(values) || 0;
    });
    
    console.log('Moyennes cluster:', clusterMeans);
    
    // Utiliser CONFIG.features (noms d'affichage) au lieu de CONFIG.featureKeys
    updateRadarChart(
        '#profile-radar',
        student,               // Données étudiant
        clusterMeans,          // Moyennes du cluster
        CONFIG.features,       // Noms d'affichage (pas les clés techniques)
        `Étudiant #${student.id} vs Cluster ${student.cluster_id + 1}`
    );
}

function calculateBubbleChartStats(clusters, sizeMetric = 'size') {
    if (!clusters || clusters.length === 0) {
        console.warn('Aucun cluster disponible pour calculer les statistiques');
        return [];
    }
    
    return clusters.map((cluster, id) => {
        if (!cluster || cluster.length === 0) {
            return {
                id: id,
                size: 10, // Taille minimale
                depressionRate: 0,
                avgAge: 0,
                avgCGPA: 0,
                avgSleep: 0,
                avgAcademic: 0,
                avgFinancial: 0,
                riskLevel: 'low'
            };
        }
        
        // Calculer les moyennes
        const size = cluster.length;
        const depressionRate = (cluster.filter(d => d.depression === 1).length / size) * 100;
        const avgAge = d3.mean(cluster, d => d.age) || 0;
        const avgCGPA = d3.mean(cluster, d => d.cgpa) || 0;
        const avgSleep = d3.mean(cluster, d => d.sleep_duration) || 0;
        const avgAcademic = d3.mean(cluster, d => d.academic_pressure) || 0;
        const avgFinancial = d3.mean(cluster, d => d.financial_stress) || 0;
        
        // Déterminer le niveau de risque
        let riskLevel = 'low';
        if (depressionRate > 40) riskLevel = 'high';
        else if (depressionRate > 20) riskLevel = 'medium';
        
        // Calculer la taille selon la métrique choisie
        let bubbleSize = size; // Par défaut: taille du cluster
        
        if (sizeMetric === 'depression') {
            bubbleSize = depressionRate * 2; // Multiplier pour mieux visualiser
        } else if (sizeMetric === 'academic') {
            bubbleSize = avgAcademic * 20; // 1-5 scale -> 20-100
        } else if (sizeMetric === 'financial') {
            bubbleSize = avgFinancial * 20; // 1-5 scale -> 20-100
        }
        
        // S'assurer que la taille n'est pas trop petite
        bubbleSize = Math.max(20, bubbleSize);
        
        return {
            id: id,
            size: bubbleSize,
            originalSize: size, // Garder la taille originale
            depressionRate: depressionRate,
            avgAge: avgAge,
            avgCGPA: avgCGPA,
            avgSleep: avgSleep,
            avgAcademic: avgAcademic,
            avgFinancial: avgFinancial,
            riskLevel: riskLevel
        };
    });
}
// Mettre à jour les small multiples
function updateBubbleChart() {
    console.log('Mise à jour du bubble chart...');
    
    // Vérifier si les éléments existent
    const sizeByElement = document.getElementById('bubble-size');
    const colorByElement = document.getElementById('bubble-color');
    
    if (!sizeByElement || !colorByElement) {
        console.warn('Éléments de contrôle du bubble chart non trouvés');
        return;
    }
    
    const sizeBy = sizeByElement.value;
    const colorBy = colorByElement.value;
    
    console.log('Options sélectionnées - Taille:', sizeBy, 'Couleur:', colorBy);
    
    // Recalculer les stats avec les nouvelles options
    const clusterStats = calculateBubbleChartStats(clusters, sizeBy);
    
    // Mettre à jour le graphique
    updateBubbleVisualization(clusterStats, sizeBy, colorBy);
}

// Fonction pour mettre à jour la visualisation du bubble chart
function updateBubbleVisualization(clusterStats, sizeBy, colorBy) {
    console.log('Mise à jour de la visualisation bubble avec:', clusterStats.length, 'clusters');
    
    const container = document.getElementById('bubble-chart-container');
    if (!container) {
        console.error('Conteneur bubble chart non trouvé');
        return;
    }
    
    // Vérifier si createBubbleChart accepte les nouveaux paramètres
    try {
    if (typeof createSunburstChart === 'function') {
        createSunburstChart('#bubble-chart-container', processedData, clusters);
    } else {
        console.warn('createSunburstChart non disponible');
    }
} catch (error) {
    console.error('Erreur dans sunburst chart:', error);
}
}



// Mettre à jour le badge de risque
function updateRiskBadge(clusterData) {
    const depressionRate = clusterData.filter(d => d.depression === 1).length / clusterData.length;
    const badge = document.getElementById('cluster-risk-badge');
    
    badge.className = 'cluster-risk-badge';
    
    if (depressionRate < 0.2) {
        badge.textContent = 'Risque Faible';
        badge.classList.add('low');
    } else if (depressionRate < 0.4) {
        badge.textContent = 'Risque Moyen';
        badge.classList.add('medium');
    } else {
        badge.textContent = 'Risque Élevé';
        badge.classList.add('high');
    }
}

// Calculer les facteurs de risque
function calculateRiskFactors() {
    const factors = CONFIG.features.map((name, index) => {
        const key = CONFIG.featureKeys[index];
        const correlation = calculateCorrelation(
            processedData.map(d => d[key]),
            processedData.map(d => d.depression)
        );
        return {
            name: name,
            correlation: Math.abs(correlation),
            direction: correlation > 0 ? 'positif' : 'négatif'
        };
    });
    
    return factors.sort((a, b) => b.correlation - a.correlation);
}

// Calculer la corrélation de Pearson
function calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// Gérer les changements de filtres
function handleFilterChange(filteredData) {
    // Réappliquer le clustering sur les données filtrées
    clusters = performClustering(filteredData, CONFIG.numClusters);
    
    // Mettre à jour toutes les visualisations
    updateScatterPlot('#cluster-map', filteredData, clusters, currentSelection.projection);
    updateKPIs();
    createClusterLegend();
    populateStudentSelector();
    
    // Réinitialiser la sélection
    if (currentSelection.cluster !== null && currentSelection.cluster < clusters.length) {
        selectCluster(currentSelection.cluster);
    } else {
        selectCluster(0);
    }
}

// Initialiser les événements
function initializeEventListeners() {
    // Changement de type de projection
    d3.select('#projection-type').on('change', function() {
        currentSelection.projection = this.value;
        updateScatterPlot('#cluster-map', processedData, clusters, currentSelection.projection, currentColorScheme);
    });
    
    // Changement de schéma de couleurs
    d3.select('#color-scheme').on('change', function() {
        currentColorScheme = this.value;
        updateScatterPlot('#cluster-map', processedData, clusters, currentSelection.projection, currentColorScheme);
    });
    
    // Bouton 3D
    d3.select('#toggle-3d').on('click', function() {
        // Implémenter la vue 3D (avec Three.js si nécessaire)
        console.log('Basculer en vue 3D');
    });
    
    // Réinitialiser le zoom
    d3.select('#reset-zoom').on('click', function() {
        // Réinitialiser le zoom du scatter plot
        console.log('Réinitialiser le zoom');
    });
    
    // Mode de comparaison radar
    d3.select('#comparison-mode').on('change', function() {
        const mode = this.value;
        if (currentSelection.student) {
            updateRadarForStudent(currentSelection.student);
        } else if (currentSelection.cluster !== null) {
            const clusterData = processedData.filter(d => d.cluster_id === currentSelection.cluster);
            updateRadarForCluster(clusterData);
        }
    });
    
    // Variable de distribution
    d3.select('#distribution-variable').on('change', function() {
        updateBubbleChart();
    });
    
    // Métrique d'outliers
    d3.select('#outlier-metric').on('change', function() {
        updateOutliers();
    });
    
    // Voir les recommandations
    d3.select('#show-recommendations').on('click', function() {
        showRecommendations();
    });
    
    // Fermer le modal
    d3.select('.close-modal').on('click', function() {
        document.getElementById('recommendations-modal').style.display = 'none';
    });
    
    // Exporter les graphiques
    d3.select('#exportMapSVG').on('click', () => exportChart('cluster-map', 'svg', 'carte-clusters.svg'));
    d3.select('#exportMapPNG').on('click', () => exportChart('cluster-map', 'png', 'carte-clusters.png'));
    d3.select('#exportRadarSVG').on('click', () => exportChart('profile-radar', 'svg', 'radar-profil.svg'));
    d3.select('#exportRadarPNG').on('click', () => exportChart('profile-radar', 'png', 'radar-profil.png'));
    
    // Exporter le plan
    d3.select('#export-plan').on('click', exportActionPlan);
}

// Afficher les recommandations
function showRecommendations() {
    if (currentSelection.cluster === null) return;
    
    const clusterData = processedData.filter(d => d.cluster_id === currentSelection.cluster);
    const recommendations = generateRecommendations(clusterData);
    
    const planContainer = d3.select('#action-plan');
    planContainer.selectAll('*').remove();
    
    recommendations.forEach((rec, i) => {
        planContainer.append('div')
            .attr('class', `action-plan-item ${rec.priority}`)
            .html(`
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <div class="action-details">
                    <span class="priority">Priorité: ${rec.priority}</span>
                    <span class="impact">Impact estimé: ${rec.impact}</span>
                </div>
            `);
    });
    
    document.getElementById('recommendations-modal').style.display = 'block';
}

// Générer des recommandations basées sur le cluster
function generateRecommendations(clusterData) {
    const depressionRate = clusterData.filter(d => d.depression === 1).length / clusterData.length;
    const avgSleep = d3.mean(clusterData, d => d.sleep_duration);
    const avgAcademic = d3.mean(clusterData, d => d.academic_pressure);
    const avgFinancial = d3.mean(clusterData, d => d.financial_stress);
    
    const recommendations = [];
    
    if (depressionRate > 0.4) {
        recommendations.push({
            title: 'Intervention Psychologique Immédiate',
            description: 'Organiser des séances de counselling obligatoires avec le service de santé universitaire.',
            priority: 'high-priority',
            impact: 'Élevé'
        });
    }
    
    if (avgSleep < 2.5) {
        recommendations.push({
            title: 'Ateliers de Gestion du Sommeil',
            description: 'Programme de 4 semaines sur l\'hygiène du sommeil et techniques de relaxation.',
            priority: 'medium-priority',
            impact: 'Moyen-Élevé'
        });
    }
    
    if (avgAcademic > 3.5) {
        recommendations.push({
            title: 'Mentorat Académique',
            description: 'Mettre en place un système de mentorat par les pairs pour la gestion du stress académique.',
            priority: 'medium-priority',
            impact: 'Moyen'
        });
    }
    
    if (avgFinancial > 3) {
        recommendations.push({
            title: 'Aide Financière et Bourses',
            description: 'Identifier les étudiants éligibles aux aides existantes et simplifier les démarches.',
            priority: 'high-priority',
            impact: 'Élevé'
        });
    }
    
    // Recommandation générale
    recommendations.push({
        title: 'Groupe de Soutien Par les Pairs',
        description: 'Créer un espace sécurisé pour le partage d\'expériences et l\'entraide.',
        priority: 'low-priority',
        impact: 'Moyen'
    });
    
    return recommendations;
}

// Exporter le plan d'action
function exportActionPlan() {
    const planContent = document.getElementById('action-plan').innerText;
    const blob = new Blob([planContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-action-cluster-${currentSelection.cluster + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Afficher/masquer le loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', initProfiling);