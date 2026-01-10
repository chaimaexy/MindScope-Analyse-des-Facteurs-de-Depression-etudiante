import { state, subscribe, updateState } from './dashboardState.js';
import { processData } from './utils/process.js';
import { drawKPIs } from './sections/kpis.js';
import { drawDistribution } from './sections/distribution.js';
import { drawPCA } from './sections/pcaScatter.js';
import { drawParallelCoords } from './sections/parallelCoords.js';
import { drawDivergingBars } from './sections/divergingBar.js';
import { drawHeatmap } from './sections/heatmap.js';
import { drawSankey } from './sections/sankey.js';

async function initDashboard() {
    const raw = await d3.csv("data/student_depression_dataset.csv");
    
    // 1. Pré-traitement (PCA, Clustering, Nettoyage)
    const data = processData(raw);
    
    // 2. Initialiser l'état
    updateState({ rawData: data, filteredData: data });

    // 3. Setup des événements UI
    d3.select("#genderFilter").on("change", function() {
        updateState({ filters: { ...state.filters, gender: this.value } });
    });

    d3.select("#reset-filters").on("click", () => {
        location.reload(); // Simple reset
    });

    // 4. Souscrire au rendu (Rendu initial + chaque mise à jour)
    subscribe(renderAllSections);
    
    // Premier rendu
    renderAllSections(state);
}

function renderAllSections(currentState) {
    const data = currentState.filteredData;
    
    // Mise à jour du compteur de texte
    d3.select("#filter-status").text(`Affichage de ${data.length.toLocaleString()} étudiants`);

    // Section 1 & 2
    drawKPIs(data, "#kpi-container");
    drawDistribution(data, "#distribution-chart");

    // Section 3
    drawPCA(data, "#pca-scatter");
    drawParallelCoords(data, "#parallel-coords");

    // Section 4
    drawDivergingBars(data, "#diverging-bar");
    drawHeatmap(data, "#correlation-heatmap");

    // Section 5
    drawSankey(data, "#sankey-diagram");
}

initDashboard();