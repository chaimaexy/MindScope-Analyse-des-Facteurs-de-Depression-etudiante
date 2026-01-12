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
// Initialisation principale - VERSION FINALE
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
        
        // 7. Initialiser les filtres avec la fonction de callback
        const filterManager = setupFilters((filteredData) => {
            console.log('Callback des filtres appelé avec', filteredData.length, 'données');
            handleFilterChange(filteredData);
        });
        
        // 8. Sélectionner un cluster par défaut
        selectCluster(0);
        
        // 9. Initialiser la table des couleurs
        initializeColorTable();
        
        console.log('Profiling initialisé avec succès');
        
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
        
        try {
            initializeExplanationButton();
        } catch (error) {
            console.error('Erreur dans le bouton d\'explication:', error);
        }
        try {
    initializeRadarExplanationButton();
} catch (error) {
    console.error('Erreur dans le bouton d\'explication radar:', error);
}
         try {
            initializeColorTable();
            setupClusterClickInTable();
        } catch (error) {
            console.error('Erreur dans la table des couleurs:', error);
        }
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
                    ${d.depression === 1 ? '<i class="icon icon-warning" aria-hidden="true"></i>' : '<i class="icon icon-check" aria-hidden="true"></i>'}
                </span>
            </div>
        `);
    
    // Informations principales
    cards.append('div')
        .attr('class', 'student-info')
        .html(d => `
            <div style="font-size: 11px;">
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
    
    
    console.log('Affichage mis à jour pour l\'étudiant #' + student.id);
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
                <h4><i class="icon icon-doc" aria-hidden="true"></i> Étudiant #${student.id}</h4>
                <div class="detail-status">
                    <span class="depression-status ${student.depression === 1 ? 'depressed' : 'healthy'}">
                        ${student.depression === 1 ? '<i class="icon icon-warning" aria-hidden="true"></i> Déprimé' : '<i class="icon icon-check" aria-hidden="true"></i> Sain'}
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
                <div class="comparison-title"><i class="icon icon-trend" aria-hidden="true"></i> Comparaison avec son cluster:</div>
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
    console.log('Mise à jour du radar pour étudiant #' + student.id);
    
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
    
    console.log('Radar mis à jour');
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
     //updateOutliers();
    
    // Mettre à jour le badge de risque
    updateRiskBadge(clusterData);
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
    console.log('Mise à jour du radar pour étudiant', student);
    
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
// Gérer les changements de filtres - VERSION COMPLÈTE
function handleFilterChange(filteredData) {
    console.log('Filtres appliqués, données filtrées:', filteredData.length);
    
    if (!filteredData || filteredData.length === 0) {
        console.warn('Aucune donnée après filtrage');
        // Vous pouvez afficher un message ou réinitialiser
        return;
    }
    
    // 1. Réappliquer le clustering sur les données filtrées
    try {
        clusters = performClustering(filteredData, CONFIG.numClusters);
        console.log('Clusters recalculés:', clusters.length);
    } catch (error) {
        console.error('Erreur lors du clustering:', error);
        // Si le clustering échoue, utiliser les clusters existants avec filtres
        clusters = clusters.map(cluster => 
            cluster.filter(student => 
                filteredData.some(f => f.id === student.id)
            )
        ).filter(cluster => cluster.length > 0);
    }
    
    // 2. Mettre à jour les données traitées avec les données filtrées
    processedData = filteredData;
    
    // 3. Mettre à jour toutes les visualisations
    
    // A. Scatter plot
    if (typeof updateScatterPlot === 'function' && scatterPlot) {
        updateScatterPlot('#cluster-map', filteredData, clusters, currentSelection.projection, currentColorScheme);
    } else if (typeof createScatterPlot === 'function') {
        createScatterPlot(
            '#cluster-map',
            filteredData,
            clusters,
            CLUSTER_COLORS,
            currentSelection.projection
        );
    }
    
    // B. KPIs
    updateKPIs();
    
    // C. Légende
    createClusterLegend();
    
    // D. Table des couleurs
    createColorTable();
    
    // E. Sélecteur d'étudiants
    populateStudentSelector();
    
    // F. Radar chart
    if (currentSelection.student) {
        // Si un étudiant est sélectionné, vérifier s'il est toujours dans les données filtrées
        const selectedStudent = filteredData.find(d => d.id === currentSelection.student.id);
        if (selectedStudent) {
            currentSelection.student = selectedStudent;
            updateRadarForStudent(selectedStudent);
        } else {
            // Sinon, sélectionner le cluster
            currentSelection.student = null;
            if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
                const clusterData = clusters[currentSelection.cluster] || [];
                updateRadarForCluster(clusterData);
            } else {
                selectCluster(0);
            }
        }
    } else if (currentSelection.cluster !== null) {
        // Si un cluster est sélectionné
        if (clusters[currentSelection.cluster] && clusters[currentSelection.cluster].length > 0) {
            const clusterData = clusters[currentSelection.cluster];
            updateRadarForCluster(clusterData);
            updateClusterStats(clusterData);
            updateClusterHeatmap(clusterData);
            updateRiskBadge(clusterData);
        } else {
            selectCluster(0);
        }
    } else {
        // Par défaut, sélectionner le premier cluster
        selectCluster(0);
    }
    
    // G. Sunburst chart
    try {
        if (typeof createSunburstChart === 'function') {
            createSunburstChart('#bubble-chart-container', filteredData, clusters);
        }
    } catch (error) {
        console.error('Erreur dans la mise à jour du sunburst:', error);
    }
    
    // H. Heatmap (si un cluster est sélectionné)
    if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
        const clusterData = clusters[currentSelection.cluster];
        updateClusterHeatmap(clusterData);
    }
    
    console.log('Toutes les visualisations mises à jour avec les filtres');
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
        //updateOutliers();
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


// ============================================================================
// FONCTIONNALITÉS AJOUTÉES : SVG CLUSTER ET SCROLL AUTOMATIQUE
// ============================================================================

/**
 * Initialise la visualisation SVG et l'écouteur d'événements pour le sunburst
 */
function initializeSVGVisualization() {
    console.log('Initialisation de la visualisation SVG...');
    
    // Écouter l'événement du sunburst
    window.addEventListener('sunburstClusterSelected', (event) => {
        const clusterId = event.detail.clusterId;
        console.log('Événement reçu du sunburst pour cluster:', clusterId);
        
        if (clusterId !== undefined && clusters[clusterId]) {
            // Sélectionner le cluster (utilise la fonction existante)
            selectCluster(clusterId);
            
            // Mettre à jour la visualisation SVG
            updateClusterSVGVisualization(clusterId);
            
            // Scroll vers la section SVG
            scrollToSVGSection();
        }
    });
    
    // Initialiser les boutons d'export et de toggle
    setupSVGControls();
    
    // Créer le SVG pour le cluster par défaut (0) au démarrage
    if (clusters.length > 0) {
        setTimeout(() => {
            updateClusterSVGVisualization(0);
        }, 1000);
    }
    
    console.log('Visualisation SVG initialisée');
}

/**
 * Met à jour la visualisation SVG pour un cluster spécifique
 */
function updateClusterSVGVisualization(clusterId) {
    console.log('Mise à jour SVG pour cluster:', clusterId);
    
    if (!clusters[clusterId]) {
        console.warn('Cluster', clusterId, 'non trouvé');
        return;
    }
    
    const clusterData = clusters[clusterId];
    
  /*  // 1. Créer le graphique SVG
    if (typeof createScalableVectorGraphic === 'function') {
        createScalableVectorGraphic('#scalable-svg-container', clusterData, clusterId);
    } else {
        console.warn('createScalableVectorGraphic non disponible');
        showSVGErrorMessage('#scalable-svg-container', 'Fonction SVG non disponible');
    }*/
    
    // 2. Afficher les étudiants du cluster
    /*if (typeof displayClusterStudents === 'function') {
        displayClusterStudents('#cluster-students-list', clusterData, clusterId);
    } else {
        console.warn('displayClusterStudents non disponible');
        showSVGErrorMessage('#cluster-students-list', 'Fonction d\'affichage des étudiants non disponible');
    }*/
    
    // 3. Afficher les outliers du cluster
   /* if (typeof displayClusterOutliers === 'function') {
        displayClusterOutliers(clusterData, '#cluster-outliers-list', CONFIG.featureKeys);
    } else {
        console.warn('displayClusterOutliers non disponible');
        showSVGErrorMessage('#cluster-outliers-list', 'Fonction d\'affichage des outliers non disponible');
    }*/
    
    // 4. Mettre à jour le titre de la section
    updateSVGTitle(clusterId);
}

/**
 * Fait défiler la page vers la section SVG
 */
function scrollToSVGSection() {
    const section = document.getElementById('scalableVecOutlier');
    if (section) {
        // Petit délai pour laisser le temps à la page de se mettre à jour
        setTimeout(() => {
            section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start'
            });
            
            // Effet visuel de surbrillance
            highlightSVGSection(section);
        }, 300);
    } else {
        console.warn('Section scalableVecOutlier non trouvée');
    }
}

/**
 * Met en surbrillance la section SVG
 */
function highlightSVGSection(section) {
    if (!section) return;
    
    // Sauvegarder les styles originaux
    const originalBackground = section.style.backgroundColor;
    const originalBoxShadow = section.style.boxShadow;
    const originalTransition = section.style.transition;
    
    // Appliquer l'effet de surbrillance
    section.style.transition = 'background-color 0.5s, box-shadow 0.5s';
    section.style.backgroundColor = '#fffbeb';
    section.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.4)';
    
    // Retirer l'effet après 2 secondes
    setTimeout(() => {
        section.style.backgroundColor = originalBackground;
        section.style.boxShadow = originalBoxShadow;
        
        // Après l'animation, rétablir la transition d'origine
        setTimeout(() => {
            section.style.transition = originalTransition;
        }, 500);
    }, 2000);
}

/**
 * Initialise les contrôles de la section SVG
 */
function setupSVGControls() {
    // Bouton d'export SVG
    const exportButton = document.getElementById('export-svg');
    if (exportButton) {
        exportButton.addEventListener('click', exportSVG);
    }
    
    // Bouton de changement de vue
    const toggleButton = document.getElementById('toggle-view');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleSVGView);
    }
}

/**
 * Exporte le SVG actuel
 */
function exportSVG() {
    const svgElement = document.querySelector('#scalable-svg-container svg');
    if (!svgElement) {
        alert('Aucun graphique SVG à exporter');
        return;
    }
    
    try {
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);
        
        // Ajouter la déclaration XML si elle n'existe pas
        if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `cluster-${currentSelection.cluster !== null ? currentSelection.cluster + 1 : 'unknown'}-visualisation.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('SVG exporté avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'export SVG:', error);
        alert('Erreur lors de l\'export du SVG');
    }
}

/**
 * Change la vue du SVG (simple alternance)
 */
let currentSVGView = 'scatter';
function toggleSVGView() {
    if (currentSVGView === 'scatter') {
        currentSVGView = 'radial';
        console.log('Changement vers vue radiale');
        // Ici vous pourriez appeler une fonction différente pour créer un graphique radial
    } else {
        currentSVGView = 'scatter';
        console.log('Changement vers vue scatter');
        // Revenir à la vue scatter plot
    }
    
    // Mettre à jour le bouton
    const toggleButton = document.getElementById('toggle-view');
    if (toggleButton) {
        toggleButton.innerHTML = currentSVGView === 'scatter' ? '<i class="icon icon-refresh" aria-hidden="true"></i> Vue Radiale' : '<i class="icon icon-refresh" aria-hidden="true"></i> Vue Scatter';
    }
    
    // Re-créer le SVG avec la nouvelle vue si un cluster est sélectionné
    if (currentSelection.cluster !== null) {
        updateClusterSVGVisualization(currentSelection.cluster);
    }
}

/**
 * Affiche un message d'erreur dans un conteneur SVG
 */
function showSVGErrorMessage(containerSelector, message) {
    const container = d3.select(containerSelector);
    container.selectAll('*').remove();
    
    container.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .style('color', '#6b7280')
        .style('text-align', 'center')
        .style('padding', '20px')
        .html(`
            <div style="font-size: 48px; margin-bottom: 20px;"><i class="icon icon-warning" aria-hidden="true"></i></div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">Fonctionnalité temporairement indisponible</div>
            <div style="font-size: 14px;">${message}</div>
        `);
}

/**
 * Met à jour le titre de la section SVG
 */
function updateSVGTitle(clusterId) {
    const titleElement = document.querySelector('#scalableVecOutlier .card-header h3');
    if (titleElement) {
        const studentCount = clusters[clusterId] ? clusters[clusterId].length : 0;
        const depressedCount = clusters[clusterId] ? clusters[clusterId].filter(d => d.depression === 1).length : 0;
        const depressionRate = studentCount > 0 ? (depressedCount / studentCount * 100).toFixed(1) : 0;
        
        titleElement.innerHTML = `<i class="icon icon-palette" aria-hidden="true"></i> Cluster ${clusterId + 1} - ${studentCount} étudiants (${depressionRate}% déprimés)`;
    }
}

/**
 * Étend la fonction selectCluster existante pour inclure la mise à jour SVG
 * (Surcharge douce sans remplacer la fonction existante)
 */
const originalSelectCluster = window.selectCluster;
window.selectCluster = function(clusterIndex) {
    // Appeler la fonction originale
    if (typeof originalSelectCluster === 'function') {
        originalSelectCluster(clusterIndex);
    }
    
    // Ajouter la mise à jour SVG
    updateClusterSVGVisualization(clusterIndex);
};

// ============================================================================
// MODIFICATION DE LA FONCTION D'INITIALISATION PRINCIPALE
// ============================================================================

// Modifiez légèrement la fonction initProfiling pour inclure l'initialisation SVG
const originalInitProfiling = window.initProfiling;
window.initProfiling = async function() {
    // Appeler la fonction originale
    if (typeof originalInitProfiling === 'function') {
        await originalInitProfiling();
    }
    
    // Initialiser la visualisation SVG après l'initialisation principale
    setTimeout(() => {
        initializeSVGVisualization();
    }, 500);
};

// ============================================================================
// STYLES CSS DYNAMIQUES POUR LA SECTION SVG
// ============================================================================

// Ajoutez ces styles dynamiquement s'ils ne sont pas déjà dans votre CSS
function addSVGStyles() {
    const styleId = 'svg-section-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Styles pour la section SVG */
            .svg-content-container {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            @media (max-width: 1200px) {
                .svg-content-container {
                    flex-direction: column;
                }
            }
            
            .svg-container {
                flex: 3;
                background: white;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                min-height: 400px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .cluster-students-container {
                flex: 2;
                background: white;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                max-height: 400px;
                overflow-y: auto;
            }
            
            .cluster-students-container h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #1f2937;
                font-size: 16px;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
            }
            
            .cluster-students-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .student-card-svg {
                background: #f8fafc;
                border-radius: 6px;
                padding: 10px;
                border-left: 4px solid #4f46e5;
                transition: all 0.2s;
            }
            
            .student-card-svg:hover {
                background: #f1f5f9;
                transform: translateX(4px);
            }
            
            .outliers-section {
                background: white;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-top: 20px;
            }
            
            .outliers-section h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #dc2626;
                font-size: 16px;
            }
            
            .outliers-list {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .outlier-item {
                background: #fee2e2;
                color: #991b1b;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                border: 1px solid #fecaca;
            }
            
            /* Styles pour les points SVG */
            .student-point, .outlier-point {
                transition: r 0.2s, opacity 0.2s;
            }
            
            .student-point:hover, .outlier-point:hover {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}


// Ajouter les styles au chargement
document.addEventListener('DOMContentLoaded', addSVGStyles);

// Fonction pour initialiser le bouton d'explication
// Fonction pour initialiser le bouton d'explication
function initializeExplanationButton() {
    const explanationContent = `
        <div style="color: #1f2937; line-height: 1.5;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <div style="background: #4f46e5; color: white; padding: 8px 10px; border-radius: 6px; font-size: 20px;">
                    <i class="icon icon-target" aria-hidden="true"></i>
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                        Explorer la Carte des Clusters
                    </h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
                        Découvrez les profils cachés de vos étudiants
                    </p>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #4f46e5;">
                <p style="margin: 0; font-size: 13px;">
                    <strong><i class="icon icon-sparkle" aria-hidden="true"></i> Visualisez l'invisible :</strong> Cette carte révèle les groupes naturels d'étudiants 
                    partageant des caractéristiques similaires de santé mentale et académique.
                </p>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <i class="icon icon-palette" aria-hidden="true"></i> Comment lire cette carte :
                </h5>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; align-items: start; gap: 8px;">
                        <span style="background: #dc2626; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">●</span>
                        <span style="font-size: 12px;"><strong>Points rouges</strong> : Étudiants à risque élevé de dépression</span>
                    </div>
                    <div style="display: flex; align-items: start; gap: 8px;">
                        <span style="background: #6366f1; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">●</span>
                        <span style="font-size: 12px;"><strong>Points bleus</strong> : Étudiants en bonne santé mentale</span>
                    </div>
                    <div style="display: flex; align-items: start; gap: 8px;">
                        <span style="border: 2px solid #10b981; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;"><i class="icon icon-search" aria-hidden="true" style="font-size:10px;"></i></span>
                        <span style="font-size: 12px;"><strong>Distance entre points</strong> = Similarité entre profils étudiants</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <i class="icon icon-wrench" aria-hidden="true"></i> Vos super-pouvoirs :
                </h5>
                <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
                    <li><strong>Cliquez sur un étudiant</strong> : Zoom sur son profil détaillé</li>
                    <li><strong>Survolez un point</strong> : Agrandissement instantané</li>
                    <li><strong>Changez la projection</strong> : PCA, t-SNE ou UMAP</li>
                    <li><strong>Personnalisez les couleurs</strong> : Par cluster, risque, ou caractéristique</li>
                </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 12px; border-radius: 8px; border: 1px solid #bae6fd;">
                <div style="display: flex; align-items: start; gap: 8px;">
                    <div style="background: #0ea5e9; color: white; padding: 6px; border-radius: 6px; font-size: 14px;">
                        <i class="icon icon-light" aria-hidden="true"></i>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #0369a1; font-weight: 500;">
                            <strong>Astuce Pro :</strong> Utilisez t-SNE pour mieux voir les clusters distincts, 
                            et UMAP pour conserver la structure globale des données.
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 11px; color: #0c4a6e;">
                            Les groupes éloignés ont des profils très différents !
                        </p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
                <span><i class="icon icon-graduation" aria-hidden="true"></i> 27,898 étudiants analysés</span>
                <span><i class="icon icon-refresh" aria-hidden="true"></i> Mise à jour en temps réel</span>
            </div>
        </div>
    `;
    
    const container = document.querySelector('#cluster-explanation-btn');
    if (!container) return;

    // NETTOYAGE : On vide le conteneur avant d'ajouter quoi que ce soit
    container.innerHTML = ''; 

    // Création du bouton avec effet hover
    const button = document.createElement('button');
    button.className = 'comment-button';
    button.innerHTML = '💬';
    button.title = 'Guide d\'utilisation - Cliquez pour ouvrir';
    
    // Création de la boîte d'explication
    const box = document.createElement('div');
    box.className = 'comment-box';
    box.innerHTML = explanationContent;
    box.style.display = 'none';

    // Ajout des éléments
    container.appendChild(button);
    container.appendChild(box);

    // Gestion du clic sur le bouton
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = box.style.display === 'block';
        box.style.display = isVisible ? 'none' : 'block';
        
        // Animation d'apparition
        if (box.style.display === 'block') {
            box.style.opacity = '0';
            box.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                box.style.transition = 'opacity 0.3s, transform 0.3s';
                box.style.opacity = '1';
                box.style.transform = 'translateY(0)';
            }, 10);
        }
    });

    // Fermer en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            box.style.display = 'none';
        }
    });

    // Fermer avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box.style.display === 'block') {
            box.style.display = 'none';
        }
    });

    console.log('Bouton d\'explication créé avec une interface attirante');
}

// Fonction pour créer la table des couleurs
// Fonction pour créer la table des couleurs avec les vraies couleurs des clusters
function createColorTable() {
    const container = document.getElementById('color-table-container');
    if (!container) {
        console.warn('Conteneur de table des couleurs non trouvé');
        return;
    }
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // S'assurer que CLUSTER_COLORS est disponible
    if (typeof window.CLUSTER_COLORS === 'undefined') {
        console.warn('CLUSTER_COLORS non défini, utilisation des couleurs par défaut');
        window.CLUSTER_COLORS = [
            '#4E79A7', '#F28E2C', '#E15759', '#76B7B2', 
            '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'
        ];
    }
    
    // Obtenir le nombre réel de clusters
    const actualClusters = clusters.length;
    console.log(`Création table couleurs avec ${actualClusters} clusters`);
    console.log('Couleurs disponibles:', window.CLUSTER_COLORS);
    
    // Calculer les statistiques de chaque cluster pour les descriptions
    const clusterStats = clusters.map((cluster, index) => {
        if (!cluster || cluster.length === 0) {
            return { size: 0, depressionRate: 0, avgAge: 0, avgCGPA: 0 };
        }
        
        const depressedCount = cluster.filter(d => d.depression === 1).length;
        const depressionRate = (depressedCount / cluster.length * 100).toFixed(1);
        const avgAge = d3.mean(cluster, d => d.age) || 0;
        const avgCGPA = d3.mean(cluster, d => d.cgpa) || 0;
        
        return {
            size: cluster.length,
            depressionRate: depressionRate,
            avgAge: avgAge.toFixed(1),
            avgCGPA: avgCGPA.toFixed(2)
        };
    });
    
    // Définir les différents schémas de couleur
    const colorSchemes = [
        {
            id: 'cluster',
            title: 'Par Cluster',
            icon: '<i class="icon icon-palette" aria-hidden="true"></i>',
            description: 'Groupes d\'étudiants similaires identifiés par K-means',
            colors: Array.from({ length: actualClusters }, (_, i) => {
                const stats = clusterStats[i] || { size: 0, depressionRate: 0 };
                const color = window.CLUSTER_COLORS[i] || window.CLUSTER_COLORS[i % window.CLUSTER_COLORS.length];
                
                // Description dynamique basée sur les stats
                let description = `${stats.size} étudiants`;
                if (stats.depressionRate > 0) {
                    description += `, ${stats.depressionRate}% déprimés`;
                }
                
                return {
                    label: `Cluster ${i + 1}`,
                    color: color,
                    description: '',
                    clusterIndex: i
                };
            })
        },
        {
            id: 'depression',
            title: 'Par Dépression',
            icon: '<i class="icon icon-sad" aria-hidden="true"></i>',
            description: 'Statut dépressif des étudiants',
            colors: [
                { 
                    label: 'Déprimé', 
                    color: '#E15759', // Rouge du cluster 3
                    description: 'Risque élevé de dépression' 
                },
                { 
                    label: 'Non déprimé', 
                    color: '#16a34a', // Vert du cluster 4
                    description: 'Santé mentale normale' 
                }
            ]
        },
        {
            id: 'suicidal',
            title: 'Par Pensées Suicidaires',
            icon: '<i class="icon icon-warning" aria-hidden="true"></i>',
            description: 'Niveau de risque suicidaire',
            colors: [
                { 
                    label: 'Risque élevé', 
                    color: '#E15759', // Rouge
                    description: 'Pensées suicidaires présentes' 
                },
                { 
                    label: 'Risque moyen', 
                    color: '#F28E2C', // Orange
                    description: 'Facteurs de risque modérés' 
                },
                { 
                    label: 'Faible risque', 
                    color: '#59A14F', // Vert
                    description: 'Aucune pensée suicidaire' 
                }
            ]
        },
        {
            id: 'academic',
            title: 'Par Pression Académique',
            icon: '<i class="icon icon-book" aria-hidden="true"></i>',
            description: 'Niveau de stress académique (échelle 1-5)',
            colors: [
                { 
                    label: 'Très faible (1)', 
                    // Gradient rouge-bleu - BLEU FONCÉ pour faible pression
                    color: '#1e3a8a', // Bleu foncé
                    description: 'Pression minimale' 
                },
                { 
                    label: 'Faible (2)', 
                    color: '#3b82f6', // Bleu
                    description: 'Pression légère' 
                },
                { 
                    label: 'Moyenne (3)', 
                    color: '#93c5fd', // Bleu clair (milieu du gradient)
                    description: 'Pression modérée' 
                },
                { 
                    label: 'Élevée (4)', 
                    color: '#fca5a5', // Rouge clair
                    description: 'Pression importante' 
                },
                { 
                    label: 'Très élevée (5)', 
                    // Gradient rouge-bleu - ROUGE pour forte pression
                    color: '#dc2626', // Rouge foncé
                    description: 'Pression extrême' 
                }
            ]
        }
    ];
    
    // Créer une carte pour chaque schéma de couleur
    colorSchemes.forEach(scheme => {
        const card = document.createElement('div');
        card.className = 'color-scheme-card';
        card.dataset.scheme = scheme.id;
        
        // Marquer comme actif si c'est le schéma courant
        const colorSchemeSelect = document.getElementById('color-scheme');
        const currentScheme = colorSchemeSelect ? colorSchemeSelect.value : 'cluster';
        const isActive = scheme.id === currentScheme;
        
        if (isActive) {
            card.classList.add('active');
        }
        
        card.innerHTML = `
            <div class="color-scheme-header">
                <div class="color-scheme-icon">${scheme.icon}</div>
                <div class="color-scheme-title">${scheme.title}</div>
                <div class="color-scheme-status ${isActive ? 'active' : ''}">
                    ${isActive ? '● Actif' : '○ Inactif'}
                </div>
            </div>
            <div class="color-scheme-description">
                ${scheme.description}
            </div>
            <div class="color-items">
                ${scheme.colors.map(item => `
                    <div class="color-item" ${item.clusterIndex !== undefined ? `data-cluster="${item.clusterIndex}"` : ''}>
                        <div class="color-sample" style="background-color: ${item.color};"></div>
                        <div class="color-label">${item.label}</div>
                        <div class="color-value">${item.description}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Ajouter un événement de clic pour changer de schéma
        card.addEventListener('click', () => {
            if (colorSchemeSelect) {
                colorSchemeSelect.value = scheme.id;
                // Déclencher l'événement de changement
                const changeEvent = new Event('change');
                colorSchemeSelect.dispatchEvent(changeEvent);
                
                // Mettre à jour les cartes actives
                updateActiveColorCard(scheme.id);
            }
        });
        
        container.appendChild(card);
    });
    
    // Ajouter la fonctionnalité de toggle
    setupColorTableToggle();
    
    console.log(`Table des couleurs créée avec ${actualClusters} clusters`);
}

// Fonction pour mettre à jour la carte active
function updateActiveColorCard(activeSchemeId) {
    document.querySelectorAll('.color-scheme-card').forEach(card => {
        const schemeId = card.dataset.scheme;
        const isActive = schemeId === activeSchemeId;
        
        card.classList.toggle('active', isActive);
        
        const statusElement = card.querySelector('.color-scheme-status');
        if (statusElement) {
            statusElement.textContent = isActive ? '● Actif' : '○ Inactif';
            statusElement.classList.toggle('active', isActive);
        }
    });
}

// Fonction pour configurer le toggle de la table
function setupColorTableToggle() {
    const toggleButton = document.querySelector('.toggle-color-table');
    const tableContainer = document.querySelector('.color-table-container');
    
    if (toggleButton && tableContainer) {
        // Vérifier l'état initial
        const isCollapsed = tableContainer.classList.contains('collapsed');
        toggleButton.textContent = isCollapsed ? '▶' : '▼';
        
        toggleButton.addEventListener('click', () => {
            const isCollapsed = tableContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Déplier
                tableContainer.classList.remove('collapsed');
                tableContainer.classList.add('expanded');
                toggleButton.textContent = '▼';
            } else {
                // Replier
                tableContainer.classList.add('collapsed');
                tableContainer.classList.remove('expanded');
                toggleButton.textContent = '▶';
            }
        });
    }
}

// Fonction pour initialiser la table des couleurs
function initializeColorTable() {
    try {
        createColorTable();
        
        // Écouter les changements de schéma de couleur
        const colorSchemeSelect = document.getElementById('color-scheme');
        if (colorSchemeSelect) {
            colorSchemeSelect.addEventListener('change', function() {
                // Mettre à jour visuellement quelle carte est active
                updateActiveColorCard(this.value);
            });
        }
    } catch (error) {
        console.error('Erreur lors de la création de la table des couleurs:', error);
    }
}

function setupClusterClickInTable() {
    document.addEventListener('click', function(e) {
        const colorItem = e.target.closest('.color-item[data-cluster]');
        if (colorItem) {
            const clusterIndex = parseInt(colorItem.dataset.cluster);
            if (!isNaN(clusterIndex)) {
                // Sélectionner le cluster
                selectCluster(clusterIndex);
                
                // Mettre en surbrillance l'élément
                document.querySelectorAll('.color-item[data-cluster]').forEach(item => {
                    item.classList.remove('selected');
                });
                colorItem.classList.add('selected');
                
                // Fermer la table si elle est ouverte
                const tableContainer = document.querySelector('.color-table-container');
                const toggleButton = document.querySelector('.toggle-color-table');
                if (tableContainer && !tableContainer.classList.contains('collapsed')) {
                    tableContainer.classList.add('collapsed');
                    tableContainer.classList.remove('expanded');
                    if (toggleButton) {
                        toggleButton.textContent = '▶';
                    }
                }
            }
        }
    });
}

// Fonction pour initialiser le bouton d'explication du radar
function initializeRadarExplanationButton() {
    const explanationContent = `
        <div style="color: #1f2937; line-height: 1.5; max-width: 350px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 8px 10px; border-radius: 6px; font-size: 20px;">
                    <i> 💬</i>
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                        Guide du Radar Comparatif
                    </h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">
                        Analysez les profils sous tous les angles
                    </p>
                </div>
            </div>
            
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #8b5cf6;">
                <p style="margin: 0; font-size: 13px;">
                    <strong><i class="icon icon-target" aria-hidden="true"></i> Comparez visuellement :</strong> Ce radar vous permet de superposer deux profils 
                    (étudiant vs cluster ou cluster vs global) pour identifier immédiatement 
                    les forces et faiblesses.
                </p>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <i class="icon icon-palette" aria-hidden="true"></i> Comment lire ce radar :
                </h5>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: #4f46e5; border-radius: 50%; flex-shrink: 0;"></div>
                        <span style="font-size: 12px;"><strong>Ligne bleue continue</strong> : Profil principal</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 50%; border: 2px solid #f59e0b; flex-shrink: 0;"></div>
                        <span style="font-size: 12px;"><strong>Ligne orange pointillée</strong> : Profil de comparaison</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="icon icon-pin" aria-hidden="true" style="font-size:12px"></i></div>
                        <span style="font-size: 12px;"><strong>Plus c'est éloigné du centre</strong> = Valeur plus élevée</span>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <i class="icon icon-search" aria-hidden="true"></i> Les 7 dimensions analysées :
                </h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                    <div style="background: #f0f9ff; padding: 6px; border-radius: 4px;">
                        <strong><i class="icon icon-book" aria-hidden="true"></i> Pression Acad.</strong>
                        <div style="color: #0369a1;">Stress des études</div>
                    </div>
                    <div style="background: #f0fdf4; padding: 6px; border-radius: 4px;">
                        <strong><i class="icon icon-smile" aria-hidden="true"></i> Satisfaction</strong>
                        <div style="color: #166534;">Plaire aux études</div>
                    </div>
                    <div style="background: #fef2f2; padding: 6px; border-radius: 4px;">
                        <strong><i class="icon icon-sleep" aria-hidden="true"></i> Sommeil</strong>
                        <div style="color: #991b1b;">Durée & qualité</div>
                    </div>
                    <div style="background: #fef3c7; padding: 6px; border-radius: 4px;">
                        <strong><i class="icon icon-money" aria-hidden="true"></i> Stress Financier</strong>
                        <div style="color: #92400e;">Problèmes d'argent</div>
                    </div>
                    <div style="background: #f3f4f6; padding: 6px; border-radius: 4px;">
                        <strong><i class="icon icon-food" aria-hidden="true"></i> Alimentation</strong>
                        <div style="color: #4b5563;">Habits alimentaires</div>
                    </div>
                    <div style="background: #f5f3ff; padding: 6px; border-radius: 4px;">
                        <strong>⏱️ Heures Travail</strong>
                        <div style="color: #5b21b6;">Travail + Études</div>
                    </div>
                    <div style="background: #ecfdf5; padding: 6px; border-radius: 4px; grid-column: span 2;">
                        <strong><i class="icon icon-trophy" aria-hidden="true"></i> CGPA</strong>
                        <div style="color: #047857;">Moyenne académique /10</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                    <i class="icon icon-refresh" aria-hidden="true"></i> Modes de comparaison :
                </h5>
                <div style="font-size: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="color: #4f46e5; font-weight: 600;">• Cluster vs Global</span>
                        <span style="color: #6b7280;">: Compare un cluster à la moyenne de tous les étudiants</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #4f46e5; font-weight: 600;">• Étudiant vs Cluster</span>
                        <span style="color: #6b7280;">: Compare un étudiant à son cluster</span>
                    </div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%); padding: 10px; border-radius: 8px; border: 1px solid #e9d5ff;">
                <div style="display: flex; align-items: start; gap: 8px;">
                    <div style="background: #8b5cf6; color: white; padding: 6px; border-radius: 6px; font-size: 14px;">
                        <i class="icon icon-light" aria-hidden="true"></i>
                    </div>
                    <div>
                        <p style="margin: 0; font-size: 12px; color: #7c3aed; font-weight: 500;">
                            <strong>Signaux d'alerte :</strong> Recherchez les zones où le profil s'éloigne 
                            significativement de la référence. Les écarts >20% sont significatifs.
                        </p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 15px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af;">
                <span><i class="icon icon-trend" aria-hidden="true"></i> Données normalisées</span>
                <span><i class="icon icon-target" aria-hidden="true"></i> 7 dimensions clés</span>
            </div>
        </div>
    `;
    
    const container = document.querySelector('#radar-explanation-btn');
    if (!container) return;

    // NETTOYAGE : On vide le conteneur avant d'ajouter quoi que ce soit
    container.innerHTML = '';

    // Création du bouton avec effet hover
    const button = document.createElement('button');
    button.className = 'comment-button radar-comment-button';
    button.innerHTML = '💬';
    button.title = 'Guide du graphique radar - Cliquez pour ouvrir';
    button.style.cssText = `
        background: #000000;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
        box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
    `;
    
    // Effet hover
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 1px 3px rgba(99, 102, 241, 0.3)';
    });

    // Création de la boîte d'explication
    const box = document.createElement('div');
    box.className = 'comment-box radar-comment-box';
    box.innerHTML = explanationContent;
    box.style.cssText = `
        display: none;
        position: absolute;
        top: 40px;
        right: 0;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border: 1px solid #e5e7eb;
        z-index: 1000;
        max-width: 380px;
        max-height: 80vh;
        overflow-y: auto;
        animation: fadeIn 0.3s ease-out;
    `;

    // Ajout des éléments
    container.style.position = 'relative';
    container.appendChild(button);
    container.appendChild(box);

    // Gestion du clic sur le bouton
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = box.style.display === 'block';
        box.style.display = isVisible ? 'none' : 'block';
        
        // Animation d'apparition
        if (box.style.display === 'block') {
            box.style.opacity = '0';
            box.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                box.style.transition = 'opacity 0.3s, transform 0.3s';
                box.style.opacity = '1';
                box.style.transform = 'translateY(0)';
            }, 10);
            
            // Changer le bouton
            button.innerHTML = '💬';
            button.style.background = '#000000';
        } else {
            button.innerHTML = '💬';
            button.style.background = '#000000';
        }
    });

    // Fermer en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            box.style.display = 'none';
            button.innerHTML = '💬';
            button.style.background ='#000000';
        }
    });

    // Fermer avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box.style.display === 'block') {
            box.style.display = 'none';
            button.innerHTML = '💬';
            button.style.background = '#000000';
        }
    });

    console.log('Bouton d\'explication du radar créé');
}

// Ajoutez aussi le CSS pour l'animation
const radarStyles = document.createElement('style');
radarStyles.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .radar-comment-button:hover {
        opacity: 0.9;
    }
    
    .radar-comment-box::-webkit-scrollbar {
        width: 6px;
    }
    
    .radar-comment-box::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }
    
    .radar-comment-box::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    
    .radar-comment-box::-webkit-scrollbar-thumb:hover {
        background: #0c0c0c;
    }
`;
document.head.appendChild(radarStyles);

// Fonction pour mettre à jour toutes les visualisations
function updateAllVisualizations(filteredData, clusters) {
    console.log('Mise à jour de toutes les visualisations...');
    
    // 1. Scatter plot
    if (typeof updateScatterPlot === 'function' && scatterPlot) {
        updateScatterPlot('#cluster-map', filteredData, clusters, currentSelection.projection, currentColorScheme);
    }
    
    // 2. Sunburst
    try {
        if (typeof createSunburstChart === 'function') {
            const container = document.getElementById('bubble-chart-container');
            if (container) {
                container.innerHTML = '';
                createSunburstChart('#bubble-chart-container', filteredData, clusters);
            }
        }
    } catch (error) {
        console.error('Erreur dans la mise à jour du sunburst:', error);
    }
    
    // 3. Radar chart (si un étudiant ou cluster est sélectionné)
    if (currentSelection.student) {
        const student = filteredData.find(d => d.id === currentSelection.student.id);
        if (student) {
            updateRadarForStudent(student);
        }
    } else if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
        updateRadarForCluster(clusters[currentSelection.cluster]);
    }
    
    // 4. Heatmap (si un cluster est sélectionné)
    if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
        updateClusterHeatmap(clusters[currentSelection.cluster]);
    }
    
    // 5. Statistiques (si un cluster est sélectionné)
    if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
        updateClusterStats(clusters[currentSelection.cluster]);
    }
    
    console.log('Toutes les visualisations mises à jour');
}