// js/charts_dash/insights.js
// Génération d'insights automatiques

let insightsInitialized = false;

function initInsights() {
    if (insightsInitialized) return;
    
    // Événements
    const insightSelect = document.getElementById('insight-type');
    if (insightSelect) {
        insightSelect.addEventListener('change', updateInsights);
    }
    
    // Boutons d'export
    document.getElementById('export-dashboard')?.addEventListener('click', exportDashboard);
    document.getElementById('generate-report')?.addEventListener('click', generateReport);
    document.getElementById('share-insights')?.addEventListener('click', shareInsights);
    
    insightsInitialized = true;
}

function updateInsights() {
    const data = getFilteredData();
    if (!data || data.length === 0) return;
    
    const insightType = document.getElementById('insight-type').value;
    
    switch(insightType) {
        case 'correlations':
            showCorrelations(data);
            break;
        case 'trends':
            showTrends(data);
            break;
        case 'anomalies':
            showAnomalies(data);
            break;
    }
}

function showCorrelations(data) {
    // Calculer les corrélations
    const correlations = calculateCorrelations(data);
    
    // Afficher les 3 corrélations les plus fortes
    const topCorrelations = correlations
        .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
        .slice(0, 3);
    
    let correlationText = '';
    topCorrelations.forEach(corr => {
        const direction = corr.correlation > 0 ? 'positive' : 'négative';
        const strength = Math.abs(corr.correlation) > 0.7 ? 'forte' : 
                        Math.abs(corr.correlation) > 0.4 ? 'modérée' : 'faible';
        
        correlationText += `
            <div class="correlation-item">
                <strong>${corr.var1} ↔ ${corr.var2}</strong><br/>
                <span>Corrélation ${strength} ${direction} (${corr.correlation.toFixed(2)})</span>
            </div>
        `;
    });
    
    document.getElementById('correlation-text').innerHTML = correlationText;
    
    // Recommendations basées sur les corrélations
    let recommendations = '';
    if (correlations.some(c => c.var1.includes('sleep') && c.var2.includes('depression'))) {
        recommendations += '• Améliorer la qualité du sommeil pourrait réduire la dépression<br/>';
    }
    if (correlations.some(c => c.var1.includes('satisfaction') && c.var2.includes('academic'))) {
        recommendations += '• Réduire la pression académique augmenterait la satisfaction<br/>';
    }
    if (correlations.some(c => c.var1.includes('financial') && c.var2.includes('stress'))) {
        recommendations += '• Un soutien financier réduirait le stress<br/>';
    }
    
    document.getElementById('recommendation-text').innerHTML = recommendations || 
        '• Aucune recommandation spécifique pour les données actuelles';
    
    // Identifier les risques principaux
    identifyRisks(data);
}

function calculateCorrelations(data) {
    const variables = [
        'academic_pressure',
        'sleep_duration',
        'financial_stress',
        'study_satisfaction',
        'cgpa',
        'depression'
    ];
    
    const correlations = [];
    
    for (let i = 0; i < variables.length; i++) {
        for (let j = i + 1; j < variables.length; j++) {
            const var1 = variables[i];
            const var2 = variables[j];
            
            const values1 = data.map(d => d[var1]).filter(v => !isNaN(v));
            const values2 = data.map(d => d[var2]).filter(v => !isNaN(v));
            
            if (values1.length > 0 && values2.length > 0) {
                const correlation = pearsonCorrelation(values1, values2);
                correlations.push({
                    var1: getVariableLabel(var1),
                    var2: getVariableLabel(var2),
                    correlation: correlation
                });
            }
        }
    }
    
    return correlations;
}

function pearsonCorrelation(x, y) {
    const n = x.length;
    const meanX = d3.mean(x);
    const meanY = d3.mean(y);
    
    let num = 0;
    let denX = 0;
    let denY = 0;
    
    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;
        num += diffX * diffY;
        denX += diffX * diffX;
        denY += diffY * diffY;
    }
    
    return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
}

function getVariableLabel(variable) {
    const labels = {
        'academic_pressure': 'Pression Académique',
        'sleep_duration': 'Sommeil',
        'financial_stress': 'Stress Financier',
        'study_satisfaction': 'Satisfaction',
        'cgpa': 'CGPA',
        'depression': 'Dépression'
    };
    
    return labels[variable] || variable;
}

function identifyRisks(data) {
    const risks = [];
    
    // Analyser les moyennes
    const avgSleep = d3.mean(data, d => d.sleep_duration);
    const avgAcademic = d3.mean(data, d => d.academic_pressure);
    const avgFinancial = d3.mean(data, d => d.financial_stress);
    const depressionRate = d3.mean(data, d => d.depression);
    
    if (avgSleep < 2.5) {
        risks.push('Sommeil insuffisant détecté');
    }
    if (avgAcademic > 3.5) {
        risks.push('Pression académique élevée');
    }
    if (avgFinancial > 3.5) {
        risks.push('Stress financier important');
    }
    if (depressionRate > 0.3) {
        risks.push('Taux de dépression inquiétant');
    }
    
    let riskText = risks.length > 0 ? 
        risks.map(r => `• ${r}`).join('<br/>') : 
        'Aucun risque majeur identifié';
    
    document.getElementById('risk-text').innerHTML = riskText;
}

function showTrends(data) {
    // Analyser les tendances par ville ou autre dimension
    const cityStats = DashboardState.utils.calculateCityStats(data);
    const cities = Object.keys(cityStats).slice(0, 3);
    
    let trendText = cities.map(city => {
        const stats = cityStats[city];
        return `
            <div class="trend-item">
                <strong>${city}</strong><br/>
                <span>Dépression: ${(stats.depressionRate * 100).toFixed(1)}%</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('correlation-text').innerHTML = trendText;
    
    // Recommendations
    document.getElementById('recommendation-text').innerHTML = 
        '• Analyser les différences régionales pour interventions ciblées';
    
    // Risques
    document.getElementById('risk-text').innerHTML = 
        '• Variabilité géographique des indicateurs de santé mentale';
}

function showAnomalies(data) {
    // Détecter les anomalies
    const anomalies = detectAnomalies(data);
    
    let anomalyText = anomalies.slice(0, 3).map(anomaly => {
        return `
            <div class="anomaly-item">
                <strong>${anomaly.type}</strong><br/>
                <span>${anomaly.description}</span>
            </div>
        `;
    }).join('');
    
    document.getElementById('correlation-text').innerHTML = anomalyText || 'Aucune anomalie détectée';
    
    // Recommendations
    document.getElementById('recommendation-text').innerHTML = 
        anomalies.length > 0 ? 
        '• Examiner les cas atypiques pour comprendre les extrêmes' :
        '• Données cohérentes, pas d\'intervention urgente nécessaire';
    
    // Risques
    document.getElementById('risk-text').innerHTML = 
        anomalies.length > 0 ?
        '• Présence de valeurs extrêmes nécessitant investigation' :
        '• Distribution normale des données';
}

function detectAnomalies(data) {
    const anomalies = [];
    
    // Détecter les valeurs extrêmes
    const cgpaValues = data.map(d => d.cgpa).filter(v => !isNaN(v));
    const sleepValues = data.map(d => d.sleep_duration).filter(v => !isNaN(v));
    
    if (cgpaValues.length > 0) {
        const meanCGPA = d3.mean(cgpaValues);
        const stdCGPA = Math.sqrt(d3.variance(cgpaValues));
        
        const lowCGPA = data.filter(d => d.cgpa < meanCGPA - 2 * stdCGPA);
        const highCGPA = data.filter(d => d.cgpa > meanCGPA + 2 * stdCGPA);
        
        if (lowCGPA.length > 0) {
            anomalies.push({
                type: 'CGPA Bas',
                description: `${lowCGPA.length} étudiants avec CGPA très bas`
            });
        }
        
        if (highCGPA.length > 0) {
            anomalies.push({
                type: 'CGPA Haut',
                description: `${highCGPA.length} étudiants avec CGPA très haut`
            });
        }
    }
    
    // Détecter combinaisons à risque
    const highRiskStudents = data.filter(d => 
        d.depression === 1 && 
        d.sleep_duration < 2 && 
        d.academic_pressure > 4
    );
    
    if (highRiskStudents.length > 0) {
        anomalies.push({
            type: 'Risque Élevé',
            description: `${highRiskStudents.length} étudiants à haut risque combiné`
        });
    }
    
    return anomalies;
}

function exportDashboard() {
    alert('Export du dashboard en cours...');
    // Implémentez l'export ici
}

function generateReport() {
    alert('Génération du rapport PDF...');
    // Implémentez la génération de PDF ici
}

function shareInsights() {
    alert('Partage des insights...');
    // Implémentez le partage ici
}

// Exposer les fonctions
window.initInsights = initInsights;
window.updateInsights = updateInsights;