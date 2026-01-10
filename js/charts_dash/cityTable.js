// js/charts_dash/cityTable.js
// Tableau des villes avec moyennes

let cityTableInitialized = false;
let currentSort = 'city';
let sortOrder = 'asc';

function initCityTable() {
    if (cityTableInitialized) return;
    
    // Événement de tri
    const sortSelect = document.getElementById('table-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentSort = this.value;
            updateCityTable();
        });
    }
    
    cityTableInitialized = true;
}

function updateCityTable() {
    const container = document.getElementById('city-table');
    if (!container) return;
    
    const data = getFilteredData();
    const cityStats = DashboardState.utils.calculateCityStats(data);
    
    // Convertir en tableau et trier
    let tableData = Object.entries(cityStats).map(([city, stats]) => ({
        city,
        avgSatisfaction: stats.avgSatisfaction,
        avgCGPA: stats.avgCGPA,
        count: stats.count,
        depressionRate: stats.depressionRate
    }));
    
    // Trier les données
    tableData.sort((a, b) => {
        let comparison = 0;
        
        switch(currentSort) {
            case 'city':
                comparison = a.city.localeCompare(b.city);
                break;
            case 'satisfaction':
                comparison = b.avgSatisfaction - a.avgSatisfaction;
                break;
            case 'cgpa':
                comparison = b.avgCGPA - a.avgCGPA;
                break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Calculer les totaux
    const totals = {
        city: 'TOTAL',
        avgSatisfaction: d3.mean(tableData, d => d.avgSatisfaction),
        avgCGPA: d3.mean(tableData, d => d.avgCGPA),
        count: d3.sum(tableData, d => d.count),
        depressionRate: d3.mean(tableData, d => d.depressionRate)
    };
    
    // Rendre le tableau
    renderCityTable(tableData, totals);
}

function renderCityTable(data, totals) {
    const container = document.getElementById('city-table');
    container.innerHTML = '';
    
    const table = document.createElement('table');
    
    // En-tête
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Ville</th>
            <th>Nb Étudiants</th>
            <th>Satisfaction Étude (moy)</th>
            <th>CGPA (moy)</th>
            <th>Taux Dépression</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Corps
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => handleSelection('city', row.city);
        
        tr.innerHTML = `
            <td>${row.city}</td>
            <td>${row.count}</td>
            <td>${row.avgSatisfaction.toFixed(2)}</td>
            <td>${row.avgCGPA.toFixed(2)}</td>
            <td>${(row.depressionRate * 100).toFixed(1)}%</td>
        `;
        
        tr.onmouseenter = function() {
            this.style.backgroundColor = '#f8fafc';
        };
        
        tr.onmouseleave = function() {
            this.style.backgroundColor = '';
        };
        
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    // Pied de table
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `
        <tr>
            <td><strong>${totals.city}</strong></td>
            <td><strong>${totals.count}</strong></td>
            <td><strong>${totals.avgSatisfaction.toFixed(2)}</strong></td>
            <td><strong>${totals.avgCGPA.toFixed(2)}</strong></td>
            <td><strong>${(totals.depressionRate * 100).toFixed(1)}%</strong></td>
        </tr>
    `;
    table.appendChild(tfoot);
    
    container.appendChild(table);
}

// Exposer les fonctions
window.initCityTable = initCityTable;
window.updateCityTable = updateCityTable;