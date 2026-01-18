// js/profiling.js

// Variables globales
// Variables globales MODIFIÉES
let rawData = [];
let processedData = [];
let clusters = [];
let currentSelection = {
    cluster: null,
    student: null,
    projection: 'tsne'
};
let isFiltering = false;
let lastFilterTime = 0;
let originalClusters = [];
let originalData = []; // NOUVEAU: Stocker les données originales complètes
let currentFilterType = 'all'; // NOUVEAU: 'all', 'cluster', 'depression', 'academic', 'suicidal'
let filterManager = null; // NOUVEAU: Référence au gestionnaire de filtres

// Variables de configuration (inchangées)
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
// Initialisation principale
async function initProfiling() {
    showLoading(true);
    
    try {
        // 1. Charger les données
        rawData = await loadData();
        
        // 2. Prétraiter les données
        processedData = preprocessStudentData(rawData);
        
        // 3. Sauvegarder les données originales COMPLÈTES
        originalData = JSON.parse(JSON.stringify(processedData));
        
        // 4. Effectuer le clustering
        clusters = performClustering(processedData, CONFIG.numClusters);
        
        // 5. Sauvegarder les clusters originaux
        originalClusters = JSON.parse(JSON.stringify(clusters));
        
        // 6. Initialiser le type de filtre
        currentFilterType = 'all';
        window.currentFilterType = 'all';
        
        // 7. Mettre à jour les KPIs
        updateKPIs();
        
        // 8. Initialiser les visualisations
        initializeVisualizations();
        
        // 9. Initialiser les événements
        initializeEventListeners();
        
        // 10. Initialiser les filtres - NOUVELLE VERSION
        filterManager = setupFilters(
            (filteredData, filterType) => {
                console.log('Callback des filtres appelé avec', filteredData.length, 'données, type:', filterType);
                handleFilterChange(filteredData, filterType);
            },
            originalData // Passer les données originales
        );
        
        // 11. Sélectionner un cluster par défaut
        selectCluster(0);
        
        // 12. Initialiser la table des couleurs
        initializeColorTable();
        
        console.log('Profiling initialisé avec succès');
        console.log('Données originales:', originalData.length, 'étudiants');
        
    } catch (error) {
        console.error("Erreur lors de l'initialisation:", error);
        alert("Erreur lors du chargement des données. Voir la console pour plus de détails.");
    } finally {
        showLoading(false);
    }
}

// Mettre à jour les KPIs
function updateKPIs() {
    const total = processedData.length;
    
    // Comptage de la dépression
    const depressed = processedData.filter(d => {
        const val = d.depression;
        if (typeof val === 'number') return val === 1;
        if (typeof val === 'string') return val.toString().trim() === '1';
        return false;
    }).length;
    
    const depressionRate = total > 0 ? ((depressed / total) * 100).toFixed(1) : '0.0';
    
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
        
        // Initialiser les boutons d'explication
        try {
            initializeExplanationButton();
            initializeRadarExplanationButton();
        } catch (error) {
            console.error('Erreur dans les boutons d\'explication:', error);
        }
        
        // Initialiser la table des couleurs
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
        
        // 4. Sunburst chart
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
        
        // 6. Sélecteur d'étudiants
        populateStudentSelector();
        
        console.log('Visualisations initialisées avec succès');
        
    } catch (error) {
        console.error('Erreur générale dans initializeVisualizations:', error);
    }
}

// CAS 1: Mode CLUSTER
function handleClusterMode(filteredData) {
    console.log('Mode CLUSTER activé');
    
    // IMPORTANT: Pour le mode cluster, on utilise TOUJOURS les données ORIGINALES
    // On ignore les données filtrées passées en paramètre
    
    // 1. Restaurer toutes les données originales
    processedData = JSON.parse(JSON.stringify(originalData));
    
    // 2. Recréer les clusters avec TOUTES les données
    const dataForClustering = processedData.map(d => ({...d}));
    clusters = performClustering(dataForClustering, CONFIG.numClusters);
    
    // 3. Mettre à jour les IDs de cluster
    processedData.forEach((student, index) => {
        if (dataForClustering[index]) {
            student.cluster_id = dataForClustering[index].cluster_id;
        }
    });
    
    // 4. Mettre à jour toutes les visualisations
    updateAllVisualizations();
    
    console.log('Mode CLUSTER activé avec', processedData.length, 'étudiants');
}

// CAS 2: Mode "Tous" (pas de filtre)
function handleAllMode() {
    console.log('Mode TOUS activé');
    
    // Restaurer l'état original complet
    restoreOriginalData();
}


// CAS 3: Autres filtres (dépression, academic, suicidal)
function handleOtherFilterMode(filteredData, filterType) {
    console.log('Mode filtre', filterType, 'activé avec', filteredData.length, 'données');
    
    // Pour les autres filtres, on utilise les données filtrées
    // MAIS on garde la structure des clusters existants
    
    // 1. Mettre à jour les données avec les données filtrées
    processedData = [...filteredData];
    
    // 2. Filtrer les clusters pour ne garder que les étudiants qui passent le filtre
    const filteredClusters = clusters.map(clusterArray => 
        clusterArray.filter(student => 
            filteredData.some(f => f.id === student.id)
        )
    ).filter(cluster => cluster.length > 0);
    
    // 3. Si tous les clusters sont vides, restaurer
    if (filteredClusters.length === 0) {
        console.warn('Tous les clusters sont vides après filtrage');
        restoreOriginalData();
        return;
    }
    
    // 4. Mettre à jour les clusters
    clusters = filteredClusters;
    
    // 5. Ajuster les IDs de cluster
    adjustClusterIDs();
    
    // 6. Mettre à jour toutes les visualisations
    updateAllVisualizations();
}


// Gérer les changements de filtres avec gestion intelligente des transitions
// Gérer les changements de filtres avec gestion intelligente des transitions
function handleFilterChange(filteredData, filterType = 'all') {
    // Debounce: Empêcher les clics rapides
    const now = Date.now();
    if (isFiltering && (now - lastFilterTime < 800)) {
        console.log('Filtrage en cours, ignore ce clic');
        return;
    }
    
    lastFilterTime = now;
    isFiltering = true;
    
    // Ajouter une indication visuelle
    document.body.classList.add('filtering');
    
    console.log('Filtres appliqués, données filtrées:', filteredData.length, 'Type de filtre:', filterType);
    console.log('Type de filtre précédent:', currentFilterType);
    
    if (!filteredData || filteredData.length === 0) {
        console.warn('Aucune donnée après filtrage');
        restoreOriginalData();
        isFiltering = false;
        document.body.classList.remove('filtering');
        return;
    }
    
    // Mettre à jour le type de filtre dans window
    window.currentFilterType = filterType;
    
    try {
        const previousFilterType = currentFilterType;
        currentFilterType = filterType;
        
        console.log('Transition:', previousFilterType, '→', currentFilterType);
        
        // CAS 1: Mode CLUSTER (on recalcule les clusters)
        if (filterType === 'cluster') {
            handleClusterMode(filteredData);
        }
        // CAS 2: Mode "Tous" (on restaure tout)
        else if (filterType === 'all') {
            handleAllMode();
        }
        // CAS 3: Mode "Suicidal" - C'EST LE CHANGEMENT IMPORTANT !
        else if (filterType === 'suicidal') {
            // Pour le mode suicidal, on utilise TOUTES les données
            // Mais on va juste changer les couleurs dans le scatter plot
            handleSuicidalMode();
        }
        // CAS 4: Autres filtres (dépression, academic)
        else {
            handleOtherFilterMode(filteredData, filterType);
        }
        
        console.log('Filtrage terminé avec succès. Type courant:', currentFilterType);
        
    } catch (error) {
        console.error('Erreur lors du filtrage:', error);
        // En cas d'erreur, restaurer tout
        restoreOriginalData();
        currentFilterType = 'all';
    } finally {
        // Réactiver le filtrage après un délai
        setTimeout(() => {
            isFiltering = false;
            document.body.classList.remove('filtering');
        }, 500);
    }
}

function handleSuicidalMode() {
    console.log('Mode SUICIDAL activé - seulement changement de couleurs');
    
    // 1. Restaurer toutes les données originales
    processedData = JSON.parse(JSON.stringify(originalData));
    
    // 2. Restaurer les clusters originaux
    clusters = JSON.parse(JSON.stringify(originalClusters));
    
    // 3. Forcer le schéma de couleurs à "suicidal"
    document.getElementById('color-scheme').value = 'suicidal';
    
    // 4. Mettre à jour toutes les visualisations
    updateAllVisualizationsForSuicidalMode();
    
    console.log('Mode SUICIDAL activé avec', processedData.length, 'étudiants');
}

// Fonction spéciale pour mettre à jour les visualisations en mode suicidal
function updateAllVisualizationsForSuicidalMode() {
    console.log('Mise à jour en mode SUICIDAL avec', clusters.length, 'clusters');
    
    // A. Scatter plot avec couleurs par statut suicidaire
    updateScatterPlotForSuicidalMode();
    
    // B. KPIs
    updateKPIs();
    
    // C. Légende (pas nécessaire pour le mode suicidal)
    createClusterLegend();
    
    // D. Table des couleurs
    createColorTable();
    
    // E. Sélecteur d'étudiants
    populateStudentSelector();
    
    // F. Adapter la sélection
    adaptCurrentSelection();
    
    // G. Sunburst chart
    updateSunburstChart();
    
    console.log('Visualisations mises à jour pour le mode suicidal');
}

// Fonction pour mettre à jour le scatter plot en mode suicidal
function updateScatterPlotForSuicidalMode() {
    // Limiter les données pour le scatter plot
    let dataToDisplay = processedData;
    if (dataToDisplay.length > 1500) {
        dataToDisplay = d3.shuffle(dataToDisplay).slice(0, 1500);
    }
    
    // Fonction pour déterminer la couleur basée sur le statut suicidaire
    function getSuicidalColor(student) {
        const isSuicidal = checkIfSuicidal(student);
        return isSuicidal ? '#e15759' : '#59A14F'; // Rouge pour suicidaire, Vert pour non-suicidaire
    }
    
    // Vérifier si un étudiant a des pensées suicidaires
    function checkIfSuicidal(student) {
        const val = student.hasSuicidalThoughts || student.suicidal_thoughts || student.suicide_risk || student.suicidal;
        
        if (val === undefined || val === null) return false;
        
        if (typeof val === 'boolean') return val === true;
        if (typeof val === 'number') return val === 1;
        if (typeof val === 'string') {
            const lowerVal = val.toString().toLowerCase().trim();
            return (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'oui' || lowerVal === 'vrai');
        }
        return false;
    }
    
    // Appliquer les couleurs aux étudiants
    dataToDisplay.forEach(student => {
        student.tempColor = getSuicidalColor(student);
    });
    
    if (typeof createScatterPlot === 'function') {
        // Si votre fonction createScatterPlot accepte un paramètre de couleur personnalisé
        createScatterPlot(
            '#cluster-map',
            dataToDisplay,
            clusters,
            null, // Pas de couleurs de cluster
            currentSelection.projection,
            'suicidal' // Indiquer le mode de couleur
        );
    } else if (typeof updateScatterPlot === 'function' && scatterPlot) {
        // Sinon, utiliser la fonction updateScatterPlot existante
        updateScatterPlot('#cluster-map', dataToDisplay, clusters, currentSelection.projection, 'suicidal');
    }
}

// CAS 1: Transition VERS le mode CLUSTER
function handleTransitionToClusterMode() {
    console.log('Transition VERS mode CLUSTER');
    
    // Pour le mode CLUSTER, on utilise TOUJOURS TOUTES les données originales
    // Peu importe d'où on vient
    
    // 1. Restaurer toutes les données originales
    processedData = JSON.parse(JSON.stringify(originalData));
    
    // 2. Recréer les clusters avec TOUTES les données
    const dataForClustering = processedData.map(d => ({...d}));
    clusters = performClustering(dataForClustering, CONFIG.numClusters);
    
    // 3. Mettre à jour les IDs de cluster
    processedData.forEach((student, index) => {
        if (dataForClustering[index]) {
            student.cluster_id = dataForClustering[index].cluster_id;
        }
    });
    
    // 4. Mettre à jour toutes les visualisations
    updateAllVisualizationsForClusterMode();
    
    console.log('Mode CLUSTER activé avec', processedData.length, 'étudiants');
}

// CAS 2: Transition DEPUIS le mode CLUSTER
function handleTransitionFromClusterMode(filteredData) {
    console.log('Transition DEPUIS mode CLUSTER vers', currentFilterType);
    
    // Quand on quitte le mode cluster, on a deux options:
    // A. Si le filtre est "all" → restaurer l'état original
    // B. Si c'est un autre filtre → appliquer le filtre sur les données originales
    
    if (currentFilterType === 'all') {
        // A. Retour à l'état original
        restoreOriginalData();
    } else {
        // B. Appliquer le nouveau filtre sur les données originales
        // Reconstruire les clusters originaux filtrés
        const filteredClusters = originalClusters.map(clusterArray => 
            clusterArray.filter(student => 
                filteredData.some(f => f.id === student.id)
            )
        ).filter(cluster => cluster.length > 0);
        
        // Mettre à jour les données
        processedData = filteredData;
        clusters = filteredClusters;
        
        // Ajuster les IDs de cluster
        adjustClusterIDs();
        
        // Mettre à jour les visualisations
        updateAllVisualizationsForFilterMode();
    }
}

// CAS 3: Mode "Tous" (pas de filtre)
function handleAllFilterMode(filteredData) {
    console.log('Mode TOUS activé');
    
    // Restaurer l'état original complet
    restoreOriginalData();
}

// CAS 4: Transition entre filtres normaux
function handleNormalFilterTransition(filteredData) {
    console.log('Transition entre filtres normaux vers', currentFilterType);
    
    // Pour les transitions entre filtres normaux, on filtre les clusters existants
    const filteredClusters = clusters.map(clusterArray => 
        clusterArray.filter(student => 
            filteredData.some(f => f.id === student.id)
        )
    ).filter(cluster => cluster.length > 0);
    
    // Si tous les clusters sont vides, restaurer
    if (filteredClusters.length === 0) {
        console.warn('Tous les clusters sont vides après filtrage');
        restoreOriginalData();
        return;
    }
    
    // Mettre à jour les données et clusters
    processedData = filteredData;
    clusters = filteredClusters;
    
    // Ajuster les IDs de cluster
    adjustClusterIDs();
    
    // Mettre à jour les visualisations
    updateAllVisualizationsForFilterMode();
}

// Restaurer les données originales COMPLÈTES
// Restaurer les données originales COMPLÈTES
function restoreOriginalData() {
    console.log('Restauration des données originales COMPLÈTES');
    
    // 1. Restaurer les données
    processedData = JSON.parse(JSON.stringify(originalData));
    
    // 2. Restaurer les clusters
    clusters = JSON.parse(JSON.stringify(originalClusters));
    
    // 3. Mettre à jour toutes les visualisations
    updateAllVisualizations();
    
    // 4. Réinitialiser la sélection
    selectCluster(0);
    
    console.log('Données restaurées:', processedData.length, 'étudiants');
}


// Mettre à jour les autres composants
// Mettre à jour les autres composants
function updateOtherComponents() {
    // Mettre à jour le radar si une sélection existe
    if (currentSelection.student) {
        const selectedStudent = processedData.find(d => d.id === currentSelection.student.id);
        if (selectedStudent) {
            updateRadarForStudent(selectedStudent);
        }
    } else if (currentSelection.cluster !== null && clusters[currentSelection.cluster]) {
        const clusterData = clusters[currentSelection.cluster];
        updateRadarForCluster(clusterData);
        updateClusterStats(clusterData);
        updateClusterHeatmap(clusterData);
        updateRiskBadge(clusterData);
    }
    
    // Ajoutez cette vérification pour le mode suicidal
    if (currentFilterType === 'suicidal') {
        // Compter les étudiants avec pensées suicidaires
        const suicidalCount = processedData.filter(d => {
            const val = d.hasSuicidalThoughts;
            if (typeof val === 'boolean') return val === true;
            if (typeof val === 'number') return val === 1;
            if (typeof val === 'string') {
                const lowerVal = val.toString().toLowerCase().trim();
                return (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1');
            }
            return false;
        }).length;
        
        const suicidalRate = processedData.length > 0 ? 
            ((suicidalCount / processedData.length) * 100).toFixed(1) : '0.0';
        
        console.log(`Mode suicidal: ${suicidalCount}/${processedData.length} étudiants (${suicidalRate}%)`);
    }
}

// Mettre à jour toutes les visualisations en mode cluster
// Mettre à jour toutes les visualisations
function updateAllVisualizations() {
    console.log('Mise à jour de toutes les visualisations avec', clusters.length, 'clusters');
    
    // A. Scatter plot
    updateScatterPlotForFilter();
    
    // B. KPIs
    updateKPIs();
    
    // C. Légende
    createClusterLegend();
    
    // D. Table des couleurs
    createColorTable();
    
    // E. Sélecteur d'étudiants
    populateStudentSelector();
    
    // F. Adapter la sélection
    adaptCurrentSelection();
    
    // G. Sunburst chart
    updateSunburstChart();
    
    // H. Mettre à jour les autres composants
    updateOtherComponents();
}

// Mettre à jour toutes les visualisations en mode filtre
function updateAllVisualizationsForFilterMode() {
    console.log('Mise à jour en mode FILTRE avec', clusters.length, 'clusters');
    
    // A. Scatter plot
    updateScatterPlotForFilter();
    
    // B. KPIs
    updateKPIs();
    
    // C. Légende
    createClusterLegend();
    
    // D. Table des couleurs
    createColorTable();
    
    // E. Sélecteur d'étudiants
    populateStudentSelector();
    
    // F. Adapter la sélection
    adaptCurrentSelection();
    
    // G. Sunburst chart
    updateSunburstChart();
}

// Ajuster les IDs de cluster après filtrage
// Ajuster les IDs de cluster après filtrage
function adjustClusterIDs() {
    const newClusters = clusters.filter(cluster => cluster.length > 0);
    
    // Mettre à jour les cluster_id des étudiants
    newClusters.forEach((cluster, newIndex) => {
        cluster.forEach(student => {
            student.cluster_id = newIndex;
        });
    });
    
    clusters = newClusters;
}
// Créer la légende des clusters
function createClusterLegend() {
    const legendContainer = d3.select('#cluster-legend');
    legendContainer.selectAll('*').remove();
    
    if (clusters.length === 0) return;
    
    const legend = legendContainer
        .selectAll('.legend-item')
        .data(clusters)
        .enter()
        .append('div')
        .attr('class', 'legend-item')
        .classed('active', (d, i) => i === currentSelection.cluster);
    
    legend.append('div')
        .attr('class', 'legend-color')
        .style('background-color', (d, i) => CLUSTER_COLORS[i % CLUSTER_COLORS.length]);
    
    legend.append('span')
        .text((d, i) => `Cluster ${i + 1} (${d.length} étudiants)`);
    
    // Événement de clic
    legend.on('click', function(event, d, i) {
        if (i !== undefined && clusters[i]) {
            selectCluster(i);
        }
        d3.selectAll('.legend-item').classed('active', false);
        d3.select(this).classed('active', true);
    });
}

// Populer le sélecteur d'étudiants
function populateStudentSelector() {
    const container = d3.select('#student-selector');
    container.selectAll('*').remove();
    
    if (processedData.length === 0) return;
    
    // Prendre un échantillon représentatif
    const sampleStudents = getRepresentativeStudents();
    
    if (sampleStudents.length === 0) return;
    
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
        
        // Mettre à jour le mode de comparaison
        document.getElementById('comparison-mode').value = 'student-vs-cluster';
        
        // Forcer la mise à jour du radar
        updateRadarForStudent(d);
    });
    
    // Sélectionner le premier étudiant par défaut
    if (sampleStudents.length > 0) {
        selectStudent(sampleStudents[0]);
    }
}

// Obtenir des étudiants représentatifs
function getRepresentativeStudents() {
    const studentsByCluster = {};
    
    processedData.forEach(student => {
        if (!studentsByCluster[student.cluster_id]) {
            studentsByCluster[student.cluster_id] = [];
        }
        studentsByCluster[student.cluster_id].push(student);
    });
    
    const representativeStudents = [];
    
    // Pour chaque cluster, prendre 2 étudiants
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

// Dans votre fichier filters.js ou la fonction setupFilters
// Dans votre fichier profiling.js, modifiez la fonction setupFilters
function setupFilters(onFilterChange, allData) {
    console.log('Initialisation des filtres avec', allData.length, 'données');
    
    // Stocker une référence à toutes les données
    const allOriginalData = allData || [];
    
    // Récupérer tous les boutons de filtre
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Initialiser l'état des filtres
    let currentActiveFilter = 'all';
    
    // Fonction pour appliquer un filtre (MODIFIÉE)
    function applyFilter(data, filterType) {
        if (!data || data.length === 0) return [];
        
        switch(filterType) {
            case 'depression':
                // FILTRER: seulement les déprimés
                return data.filter(d => d.depression === 1);
            case 'suicidal':
                // NE PAS FILTRER: retourner toutes les données
                // Le changement de couleur se fera dans le scatter plot
                return [...data];
            case 'academic':
                // FILTRER: pression académique élevée
                return data.filter(d => d.academic_pressure >= 4);
            case 'cluster':
                // Mode cluster: retourner toutes les données
                return [...data];
            case 'all':
            default:
                // Toutes les données
                return [...data];
        }
    }
    
    // Quand un filtre change
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterType = this.dataset.filter;
            console.log('Type de filtre sélectionné:', filterType);
            
            // Mettre à jour l'interface
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            let filteredData;
            
            // IMPORTANT: Pour le mode "suicidal", envoyer TOUTES les données
            if (filterType === 'suicidal' || filterType === 'cluster' || filterType === 'all') {
                filteredData = [...allOriginalData]; // TOUTES les données
            } else {
                // Pour les autres filtres (dépression, academic), appliquer le filtre
                filteredData = applyFilter(allOriginalData, filterType);
            }
            
            console.log(`Filtre ${filterType} appliqué: ${filteredData.length}/${allOriginalData.length} étudiants`);
            
            // Appeler le callback avec les données filtrées ET le type de filtre
            onFilterChange(filteredData, filterType);
            
            // Mettre à jour l'état
            currentActiveFilter = filterType;
        });
    });
    
    // Retourner l'interface de contrôle
    return {
        getCurrentFilter: () => currentActiveFilter,
        applyFilter: (filterType) => {
            const button = document.querySelector(`.filter-btn[data-filter="${filterType}"]`);
            if (button) {
                button.click();
            }
        },
        resetFilters: () => {
            const allButton = document.querySelector('.filter-btn[data-filter="all"]');
            if (allButton) {
                allButton.click();
            }
        }
    };
}

// Sélectionner le premier cluster disponible
// Sélectionner le premier cluster disponible
function selectFirstAvailableCluster() {
    if (clusters.length > 0 && clusters[0].length > 0) {
        selectCluster(0);
    } else {
        // Trouver le premier cluster non vide
        const firstNonEmptyIndex = clusters.findIndex(cluster => cluster.length > 0);
        if (firstNonEmptyIndex !== -1) {
            selectCluster(firstNonEmptyIndex);
        } else {
            console.warn('Aucun cluster non vide trouvé');
            currentSelection.cluster = null;
        }
    }
}
// Adapter la sélection courante
// Adapter la sélection courante
function adaptCurrentSelection() {
    // Si un étudiant est sélectionné
    if (currentSelection.student) {
        const selectedStudent = processedData.find(d => d.id === currentSelection.student.id);
        if (selectedStudent) {
            currentSelection.student = selectedStudent;
        } else {
            // L'étudiant n'est plus dans les données filtrées
            currentSelection.student = null;
            selectFirstAvailableCluster();
        }
    } 
    // Si un cluster est sélectionné
    else if (currentSelection.cluster !== null) {
        if (currentSelection.cluster < clusters.length && 
            clusters[currentSelection.cluster] && 
            clusters[currentSelection.cluster].length > 0) {
            // Le cluster existe toujours
            // La mise à jour des stats se fera dans updateOtherComponents
        } else {
            // Le cluster n'existe plus
            selectFirstAvailableCluster();
        }
    } else {
        // Aucune sélection, prendre la première disponible
        selectFirstAvailableCluster();
    }
}

// Mettre à jour le scatter plot
// Mettre à jour le scatter plot
function updateScatterPlotForFilter() {
    // Limiter les données pour le scatter plot
    let dataToDisplay = processedData;
    if (dataToDisplay.length > 1500) {
        dataToDisplay = d3.shuffle(dataToDisplay).slice(0, 1500);
    }
    
    if (typeof updateScatterPlot === 'function' && scatterPlot) {
        updateScatterPlot('#cluster-map', dataToDisplay, clusters, currentSelection.projection, currentColorScheme);
    } else if (typeof createScatterPlot === 'function') {
        createScatterPlot(
            '#cluster-map',
            dataToDisplay,
            clusters,
            CLUSTER_COLORS,
            currentSelection.projection
        );
    }
}

// Fonction pour exporter le plan d'action
function exportActionPlan() {
    try {
        // Vérifier si un cluster est sélectionné
        if (currentSelection.cluster === null || !clusters[currentSelection.cluster]) {
            alert('Veuillez d\'abord sélectionner un cluster pour générer un plan d\'action.');
            return;
        }
        
        const clusterData = clusters[currentSelection.cluster];
        if (!clusterData || clusterData.length === 0) {
            alert('Le cluster sélectionné ne contient pas de données.');
            return;
        }
        
        // Calculer les statistiques du cluster
        const clusterStats = {
            size: clusterData.length,
            depressionRate: (clusterData.filter(d => d.depression === 1).length / clusterData.length * 100).toFixed(1),
            suicidalRate: (clusterData.filter(d => d.hasSuicidalThoughts === true).length / clusterData.length * 100).toFixed(1),
            avgAge: d3.mean(clusterData, d => d.age).toFixed(1),
            avgCGPA: d3.mean(clusterData, d => d.cgpa).toFixed(2),
            avgAcademicPressure: d3.mean(clusterData, d => d.academic_pressure).toFixed(2),
            avgSleep: d3.mean(clusterData, d => d.sleep_duration).toFixed(1)
        };
        
        // Déterminer le niveau de risque
        let riskLevel = 'Faible';
        if (clusterStats.depressionRate > 40) riskLevel = 'Élevé';
        else if (clusterStats.depressionRate > 20) riskLevel = 'Moyen';
        
        // Identifier les facteurs de risque principaux
        const riskFactors = calculateRiskFactors().slice(0, 3);
        
        // Générer le contenu du plan d'action
        const actionPlan = `
PLAN D'ACTION - CLUSTER ${currentSelection.cluster + 1}
===============================================

📊 STATISTIQUES DU CLUSTER
--------------------------
• Nombre d'étudiants : ${clusterStats.size}
• Taux de dépression : ${clusterStats.depressionRate}%
• Taux de pensées suicidaires : ${clusterStats.suicidalRate}%
• Âge moyen : ${clusterStats.avgAge} ans
• CGPA moyen : ${clusterStats.avgCGPA}/10
• Niveau de risque : ${riskLevel}

🎯 FACTEURS DE RISQUE PRINCIPAUX
--------------------------------
${riskFactors.map((factor, i) => `${i + 1}. ${factor.name} (corrélation: ${factor.correlation.toFixed(2)})`).join('\n')}

💡 RECOMMANDATIONS
------------------
1. Interventions priorisées :
   - ${riskLevel === 'Élevé' ? 'Intervention immédiate recommandée' : riskLevel === 'Moyen' ? 'Suivi rapproché nécessaire' : 'Surveillance régulière'}
   - Session de sensibilisation à la santé mentale
   - Accès facilité aux services de soutien

2. Actions académiques :
   - Adaptation des charges de travail
   - Tutorat par les pairs
   - Flexibilité dans les échéances

3. Support psychologique :
   - ${clusterStats.suicidalRate > 10 ? 'Référencement systématique au service de santé' : 'Consultations disponibles sur demande'}
   - Groupes de soutien par les pairs
   - Formation des enseignants à la détection

📈 INDICATEURS DE SUIVI
-----------------------
• Réduction du taux de dépression de 20% en 6 mois
• Augmentation de la satisfaction académique de 15%
• Amélioration de la durée moyenne de sommeil de 1 heure
• 100% des étudiants à risque orientés vers un soutien

🕐 DATE DE GÉNÉRATION : ${new Date().toLocaleDateString('fr-FR')}
👥 RESPONSABLE : Service de santé universitaire

---
Ce plan est généré automatiquement et doit être personnalisé
en fonction du contexte spécifique de votre établissement.
        `;
        
        // Créer et télécharger le fichier
        const blob = new Blob([actionPlan], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan-action-cluster-${currentSelection.cluster + 1}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('Plan d\'action exporté pour le cluster', currentSelection.cluster + 1);
        
    } catch (error) {
        console.error('Erreur lors de l\'export du plan d\'action:', error);
        alert('Erreur lors de l\'export du plan d\'action. Voir la console pour plus de détails.');
    }
}

// Mettre à jour le sunburst chart
// Mettre à jour le sunburst chart
function updateSunburstChart() {
    try {
        if (typeof createSunburstChart === 'function') {
            createSunburstChart('#bubble-chart-container', processedData, clusters);
        }
    } catch (error) {
        console.error('Erreur dans la mise à jour du sunburst:', error);
    }
}
// ==================== FONCTIONS EXISTANTES (gardées telles quelles) ====================

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

// Sélectionner un étudiant
function selectStudent(student) {
    console.log('Sélection de l\'étudiant #' + student.id);
    
    if (!student) return;
    
    currentSelection.student = student;
    currentSelection.cluster = student.cluster_id;
    
    // Mettre à jour l'affichage
    updateDisplayForStudent(student);
}

// Mettre à jour l'affichage pour un étudiant
function updateDisplayForStudent(student) {
    // Mettre à jour l'ID du cluster
    const clusterIdEl = document.getElementById('current-cluster-id');
    if (clusterIdEl) {
        clusterIdEl.textContent = (student.cluster_id + 1).toString();
    }
    
    // Obtenir les données du cluster
    const clusterData = clusters[student.cluster_id] || [];
    
    // Mettre à jour les statistiques du cluster
    updateClusterStats(clusterData);
    
    // Mettre à jour le badge de risque
    updateRiskBadge(clusterData);
    
    // Mettre à jour le heatmap
    updateClusterHeatmap(clusterData);
    
    // Afficher le résumé de l'étudiant
    showStudentSummary(student, clusterData);
    
    // Mettre à jour les autres visualisations
    updateBubbleChart();
    
    console.log('Affichage mis à jour pour l\'étudiant #' + student.id);
}

// Afficher le résumé de l'étudiant
function showStudentSummary(student, clusterData) {
    let summaryContainer = document.getElementById('student-summary-container');
    
    if (!summaryContainer) {
        summaryContainer = document.createElement('div');
        summaryContainer.id = 'student-summary-container';
        summaryContainer.className = 'student-summary';
        
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

// Sélectionner un cluster
function selectCluster(clusterIndex) {
    if (clusterIndex === undefined || clusterIndex === null) {
        console.error('ClusterIndex est undefined!', clusterIndex);
        return;
    }
    
    clusterIndex = parseInt(clusterIndex);
    
    // Vérifier les limites
    if (clusterIndex < 0 || clusterIndex >= clusters.length) {
        console.warn(`Index de cluster invalide: ${clusterIndex}. Doit être entre 0 et ${clusters.length - 1}`);
        clusterIndex = 0;
    }
    
    console.log('Sélection du cluster:', clusterIndex);
    
    currentSelection.cluster = clusterIndex;
    currentSelection.student = null;
    
    // Mettre à jour l'affichage
    document.getElementById('current-cluster-id').textContent = clusterIndex + 1;
    
    const clusterData = clusters[clusterIndex] || [];
    
    // Calculer les statistiques du cluster
    updateClusterStats(clusterData);
    
    // Mettre à jour la heatmap
    updateClusterHeatmap(clusterData);
    
    // Mettre à jour le radar chart
    updateRadarForCluster(clusterData);
    
    // Mettre à jour les small multiples
    updateBubbleChart();
    
    // Mettre à jour le badge de risque
    updateRiskBadge(clusterData);
    
    // Mettre à jour la légende
    updateLegendSelection(clusterIndex);
}

// Mettre à jour la sélection dans la légende
function updateLegendSelection(clusterIndex) {
    d3.selectAll('.legend-item')
        .classed('active', (d, i) => i === clusterIndex);
}

// Mettre à jour les statistiques du cluster
function updateClusterStats(clusterData) {
    const container = d3.select('#cluster-stats');
    container.selectAll('*').remove();
    
    if (!clusterData || clusterData.length === 0) {
        container.html('<div class="no-data">Aucune donnée disponible</div>');
        return;
    }
    
    const safeMean = (data, key) => {
        if (!data || data.length === 0) return 0;
        const values = data.map(d => d[key]).filter(v => v !== undefined && v !== null);
        return values.length > 0 ? d3.mean(values) : 0;
    };
    
    const countDepression = (data) => {
        if (!data || data.length === 0) return 0;
        return data.filter(d => {
            const val = d.depression;
            if (typeof val === 'number') return val === 1;
            if (typeof val === 'string') return val.toString().trim() === '1';
            return false;
        }).length;
    };
    
    const countSuicidal = (data) => {
        if (!data || data.length === 0) return 0;
        return data.filter(d => {
            const val = d.hasSuicidalThoughts;
            if (typeof val === 'boolean') return val === true;
            if (typeof val === 'number') return val === 1;
            if (typeof val === 'string') {
                const lowerVal = val.toString().toLowerCase().trim();
                return (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1');
            }
            return false;
        }).length;
    };
    
    const clusterSize = clusterData.length;
    const depressionCount = countDepression(clusterData);
    const suicidalCount = countSuicidal(clusterData);
    
    const depressionRate = clusterSize > 0 ? (depressionCount / clusterSize * 100) : 0;
    const suicidalRate = clusterSize > 0 ? (suicidalCount / clusterSize * 100) : 0;
    
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
            label: 'Taux de Pensées Suicidaires',
            value: suicidalRate.toFixed(1),
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
    if (!clusterData || clusterData.length === 0) return;
    
    const heatmapData = CONFIG.featureKeys.map(key => {
        return CONFIG.featureKeys.map(otherKey => {
            const values1 = clusterData.map(d => d[key] || 0);
            const values2 = clusterData.map(d => d[otherKey] || 0);
            return calculateCorrelation(values1, values2);
        });
    });
    
    if (typeof createCorrelationHeatmap === 'function') {
        createCorrelationHeatmap('#cluster-heatmap', heatmapData, CONFIG.features);
    }
}

// Mettre à jour le radar chart pour un cluster
function updateRadarForCluster(clusterData) {
    if (!clusterData || clusterData.length === 0) return;
    
    const clusterMeans = {};
    CONFIG.featureKeys.forEach(key => {
        clusterMeans[key] = d3.mean(clusterData, d => d[key] || 0) || 0;
    });
    
    const globalMeans = {};
    CONFIG.featureKeys.forEach(key => {
        globalMeans[key] = d3.mean(processedData, d => d[key] || 0) || 0;
    });
    
    if (typeof updateRadarChart === 'function') {
        updateRadarChart('#profile-radar', clusterMeans, globalMeans, CONFIG.features, 'Cluster vs Global');
    }
}

// Mettre à jour le radar chart pour un étudiant
function updateRadarForStudent(student) {
    const clusterData = clusters[student.cluster_id] || [];
    
    const clusterMeans = {};
    CONFIG.featureKeys.forEach(key => {
        const values = clusterData.map(d => d[key] || 0);
        clusterMeans[key] = d3.mean(values) || 0;
    });
    
    if (typeof updateRadarChart === 'function') {
        updateRadarChart(
            '#profile-radar',
            student,
            clusterMeans,
            CONFIG.features,
            `Étudiant #${student.id} vs Cluster ${student.cluster_id + 1}`
        );
    }
}

// Mettre à jour les small multiples
function updateBubbleChart() {
    const sizeByElement = document.getElementById('bubble-size');
    const colorByElement = document.getElementById('bubble-color');
    
    if (!sizeByElement || !colorByElement) {
        console.warn('Éléments de contrôle du bubble chart non trouvés');
        return;
    }
    
    const sizeBy = sizeByElement.value;
    const colorBy = colorByElement.value;
    
    const clusterStats = calculateBubbleChartStats(clusters, sizeBy);
    updateBubbleVisualization(clusterStats, sizeBy, colorBy);
}

// Fonction pour mettre à jour la visualisation du bubble chart
function updateBubbleVisualization(clusterStats, sizeBy, colorBy) {
    const container = document.getElementById('bubble-chart-container');
    if (!container) {
        console.error('Conteneur bubble chart non trouvé');
        return;
    }
    
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

// Calculer les statistiques pour le bubble chart
function calculateBubbleChartStats(clusters, sizeMetric = 'size') {
    if (!clusters || clusters.length === 0) {
        console.warn('Aucun cluster disponible pour calculer les statistiques');
        return [];
    }
    
    return clusters.map((cluster, id) => {
        if (!cluster || cluster.length === 0) {
            return {
                id: id,
                size: 10,
                depressionRate: 0,
                avgAge: 0,
                avgCGPA: 0,
                avgSleep: 0,
                avgAcademic: 0,
                avgFinancial: 0,
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
        
        let riskLevel = 'low';
        if (depressionRate > 40) riskLevel = 'high';
        else if (depressionRate > 20) riskLevel = 'medium';
        
        let bubbleSize = size;
        
        if (sizeMetric === 'depression') {
            bubbleSize = depressionRate * 2;
        } else if (sizeMetric === 'academic') {
            bubbleSize = avgAcademic * 20;
        } else if (sizeMetric === 'financial') {
            bubbleSize = avgFinancial * 20;
        }
        
        bubbleSize = Math.max(20, bubbleSize);
        
        return {
            id: id,
            size: bubbleSize,
            originalSize: size,
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

// Mettre à jour le badge de risque
function updateRiskBadge(clusterData) {
    if (!clusterData || clusterData.length === 0) return;
    
    const depressionRate = clusterData.filter(d => d.depression === 1).length / clusterData.length;
    const badge = document.getElementById('cluster-risk-badge');
    
    if (!badge) return;
    
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
            processedData.map(d => d[key] || 0),
            processedData.map(d => d.depression || 0)
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

// Initialiser les événements
// Initialiser les événements
function initializeEventListeners() {
    // Changement de type de projection
    d3.select('#projection-type').on('change', function() {
        currentSelection.projection = this.value;
        
        let dataToDisplay = processedData;
        if (dataToDisplay.length > 1500) {
            dataToDisplay = d3.shuffle(dataToDisplay).slice(0, 1500);
        }
        
        if (typeof updateScatterPlot === 'function') {
            updateScatterPlot('#cluster-map', dataToDisplay, clusters, currentSelection.projection, currentColorScheme);
        }
    });
    
    // Changement de schéma de couleurs
    d3.select('#color-scheme').on('change', function() {
        currentColorScheme = this.value;
        
        let dataToDisplay = processedData;
        if (dataToDisplay.length > 1500) {
            dataToDisplay = d3.shuffle(dataToDisplay).slice(0, 1500);
        }
        
        if (typeof updateScatterPlot === 'function') {
            updateScatterPlot('#cluster-map', dataToDisplay, clusters, currentSelection.projection, currentColorScheme);
        }
        
        // Mettre à jour la table des couleurs
        updateActiveColorCard(this.value);
    });
    
    // Mode de comparaison radar
    d3.select('#comparison-mode').on('change', function() {
        const mode = this.value;
        if (currentSelection.student) {
            updateRadarForStudent(currentSelection.student);
        } else if (currentSelection.cluster !== null) {
            const clusterData = clusters[currentSelection.cluster] || [];
            updateRadarForCluster(clusterData);
        }
    });
    
    // Variable de distribution
    d3.select('#distribution-variable').on('change', function() {
        updateBubbleChart();
    });
    
    // Exporter les graphiques
    d3.select('#exportMapSVG').on('click', () => exportChart('cluster-map', 'svg', 'carte-clusters.svg'));
    d3.select('#exportMapPNG').on('click', () => exportChart('cluster-map', 'png', 'carte-clusters.png'));
    d3.select('#exportRadarSVG').on('click', () => exportChart('profile-radar', 'svg', 'radar-profil.svg'));
    d3.select('#exportRadarPNG').on('click', () => exportChart('profile-radar', 'png', 'radar-profil.png'));
    
    // Exporter le plan - AJOUTEZ CETTE LIGNE
    d3.select('#export-plan').on('click', exportActionPlan);
}

// Fonction pour créer la table des couleurs
function createColorTable() {
    const container = document.getElementById('color-table-container');
    if (!container) {
        console.warn('Conteneur de table des couleurs non trouvé');
        return;
    }
    
    container.innerHTML = '';
    
    if (typeof window.CLUSTER_COLORS === 'undefined') {
        window.CLUSTER_COLORS = [
            '#4E79A7', '#F28E2C', '#E15759', '#76B7B2', 
            '#59A14F', '#EDC949', '#AF7AA1', '#FF9DA7'
        ];
    }
    
    const actualClusters = clusters.length;
    
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
    
    const colorSchemes = [
        {
            id: 'cluster',
            title: 'Par Cluster',
            icon: '<i class="icon icon-palette" aria-hidden="true"></i>',
            description: 'Groupes d\'étudiants similaires identifiés par K-means',
            colors: Array.from({ length: actualClusters }, (_, i) => {
                const stats = clusterStats[i] || { size: 0, depressionRate: 0 };
                const color = window.CLUSTER_COLORS[i] || window.CLUSTER_COLORS[i % window.CLUSTER_COLORS.length];
                
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
                    color: '#E15759',
                    description: 'Risque élevé de dépression' 
                },
                { 
                    label: 'Non déprimé', 
                    color: '#16a34a',
                    description: 'Santé mentale normale' 
                }
            ]
        },
        {
            id: 'suicidal',
            title: 'Par Pensées Suicidaires',
            icon: '<i class="icon icon-warning" aria-hidden="true"></i>',
            description: 'Présence de pensées suicidaires',
            colors: [
                { 
                    label: 'Avec pensées suicidaires', 
                    color: '#e15759', // Rouge
                    description: 'Pensées suicidaires présentes' 
                },
                { 
                    label: 'Sans pensées suicidaires', 
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
                    color: '#1e3a8a',
                    description: 'Pression minimale' 
                },
                { 
                    label: 'Faible (2)', 
                    color: '#3b82f6',
                    description: 'Pression légère' 
                },
                { 
                    label: 'Moyenne (3)', 
                    color: '#93c5fd',
                    description: 'Pression modérée' 
                },
                { 
                    label: 'Élevée (4)', 
                    color: '#fca5a5',
                    description: 'Pression importante' 
                },
                { 
                    label: 'Très élevée (5)', 
                    color: '#dc2626',
                    description: 'Pression extrême' 
                }
            ]
        }
    ];
    
    colorSchemes.forEach(scheme => {
        const card = document.createElement('div');
        card.className = 'color-scheme-card';
        card.dataset.scheme = scheme.id;
        
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
        
        card.addEventListener('click', () => {
            if (colorSchemeSelect) {
                colorSchemeSelect.value = scheme.id;
                const changeEvent = new Event('change');
                colorSchemeSelect.dispatchEvent(changeEvent);
                updateActiveColorCard(scheme.id);
            }
        });
        
        container.appendChild(card);
    });
    
    setupColorTableToggle();
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
        const isCollapsed = tableContainer.classList.contains('collapsed');
        toggleButton.textContent = isCollapsed ? '▶' : '▼';
        
        toggleButton.addEventListener('click', () => {
            const isCollapsed = tableContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                tableContainer.classList.remove('collapsed');
                tableContainer.classList.add('expanded');
                toggleButton.textContent = '▼';
            } else {
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
        
        const colorSchemeSelect = document.getElementById('color-scheme');
        if (colorSchemeSelect) {
            colorSchemeSelect.addEventListener('change', function() {
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
                selectCluster(clusterIndex);
                
                document.querySelectorAll('.color-item[data-cluster]').forEach(item => {
                    item.classList.remove('selected');
                });
                colorItem.classList.add('selected');
                
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

    container.innerHTML = '';

    // Création du bouton
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

    container.innerHTML = '';

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
    
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 1px 3px rgba(99, 102, 241, 0.3)';
    });

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

    container.style.position = 'relative';
    container.appendChild(button);
    container.appendChild(box);

    button.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = box.style.display === 'block';
        box.style.display = isVisible ? 'none' : 'block';
        
        if (box.style.display === 'block') {
            box.style.opacity = '0';
            box.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                box.style.transition = 'opacity 0.3s, transform 0.3s';
                box.style.opacity = '1';
                box.style.transform = 'translateY(0)';
            }, 10);
            
            button.innerHTML = '💬';
            button.style.background = '#000000';
        } else {
            button.innerHTML = '💬';
            button.style.background = '#000000';
        }
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            box.style.display = 'none';
            button.innerHTML = '💬';
            button.style.background = '#000000';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box.style.display === 'block') {
            box.style.display = 'none';
            button.innerHTML = '💬';
            button.style.background = '#000000';
        }
    });
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

// Ajouter les styles CSS
const profilingStyles = document.createElement('style');
profilingStyles.textContent = `
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
    
    .filtering {
        pointer-events: none;
        opacity: 0.7;
        transition: opacity 0.3s;
    }
    
    .filtering::after {
        content: 'Chargement...';
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
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
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-size: 18px;
        color: #4f46e5;
    }
    
    .student-card {
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .student-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .student-card.selected {
        border-color: #4f46e5;
        background-color: #f5f3ff;
    }
    
    .legend-item.active {
        background-color: #f5f3ff;
        border-color: #4f46e5;
        font-weight: 600;
    }
    
    .no-data {
        padding: 20px;
        text-align: center;
        color: #6b7280;
        font-style: italic;
    }
`;
document.head.appendChild(profilingStyles);