// js/charts_dash/pieChart.js (suite)
// Pie chart de distribution de la dépression

let pieChartInitialized = false;
let pieChart = null;

function initPieChart() {
    if (pieChartInitialized) return;
    
    const container = d3.select('#depression-pie');
    if (container.empty()) return;
    
    const width = container.node().clientWidth;
    const height = 250;
    const radius = Math.min(width, height) / 2 - 40;
    
    const svg = container
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    pieChart = {
        svg,
        width,
        height,
        radius,
        arc: null,
        pie: null
    };
    
    // Initialiser les fonctions D3
    pieChart.arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);
    
    pieChart.pie = d3.pie()
        .value(d => d.value)
        .sort(null);
    
    // Événement d'export
    document.getElementById('export-pie')?.addEventListener('click', exportPieChart);
    
    pieChartInitialized = true;
}

function updatePieChart() {
    if (!pieChartInitialized || !pieChart) return;
    
    const data = getFilteredData();
    const stats = DashboardState.utils.calculateDepressionStats(data);
    
    const pieData = [
        { label: 'Non déprimé', value: stats.notDepressed, color: '#10b981' },
        { label: 'Déprimé', value: stats.depressed, color: '#ef4444' }
    ];
    
    // Nettoyer
    pieChart.svg.selectAll('*').remove();
    
    // Créer les arcs
    const arcs = pieChart.svg.selectAll('.arc')
        .data(pieChart.pie(pieData))
        .enter()
        .append('g')
        .attr('class', 'arc')
        .style('cursor', 'pointer');
    
    // Dessiner les arcs
    arcs.append('path')
        .attr('d', pieChart.arc)
        .attr('fill', d => d.data.color)
        .style('opacity', 0.8)
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .on('mouseover', function(event, d) {
            // Agrandir l'arc
            d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1.05)')
                .style('opacity', 1);
            
            // Afficher le tooltip
            showPieTooltip(event, d);
        })
        .on('mouseout', function(event, d) {
            // Réduire l'arc
            d3.select(this)
                .transition()
                .duration(200)
                .attr('transform', 'scale(1)')
                .style('opacity', 0.8);
            
            hideTooltip();
        })
        .on('click', function(event, d) {
            // Sélectionner/désélectionner
            const isDepressed = d.data.label === 'Déprimé';
            handleSelection('depression', isDepressed);
        });
    
    // Ajouter des animations
    arcs.selectAll('path')
        .transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return function(t) {
                return pieChart.arc(interpolate(t));
            };
        });
    
    // Ajouter des labels
    arcs.append('text')
        .attr('transform', d => `translate(${pieChart.arc.centroid(d)})`)
        .attr('dy', '.35em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', 'white')
        .text(d => {
            const percentage = (d.data.value / stats.total * 100).toFixed(1);
            return `${percentage}%`;
        });
    
    // Mettre à jour la légende
    updatePieLegend(pieData, stats);
}

function showPieTooltip(event, d) {
    const tooltip = d3.select('#tooltip') || createTooltip();
    
    const percentage = (d.data.value / (d.data.value + d.data.value) * 100).toFixed(1);
    
    tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`
            <div style="padding: 8px;">
                <strong style="color: ${d.data.color}">${d.data.label}</strong><br/>
                <span>Nombre: ${d.data.value} étudiants</span><br/>
                <span>Pourcentage: ${percentage}%</span>
            </div>
        `);
}

function updatePieLegend(pieData, stats) {
    const legendContainer = d3.select('#pie-legend');
    if (legendContainer.empty()) return;
    
    legendContainer.html('');
    
    const legend = legendContainer
        .append('div')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('gap', '20px')
        .style('font-size', '12px');
    
    pieData.forEach(item => {
        const percentage = (item.value / stats.total * 100).toFixed(1);
        
        const legendItem = legend
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('cursor', 'pointer')
            .on('click', () => {
                const isDepressed = item.label === 'Déprimé';
                handleSelection('depression', isDepressed);
            });
        
        legendItem
            .append('div')
            .style('width', '12px')
            .style('height', '12px')
            .style('background-color', item.color)
            .style('border-radius', '2px');
        
        legendItem
            .append('span')
            .style('color', '#475569')
            .text(`${item.label}: ${item.value} (${percentage}%)`);
    });
}

function exportPieChart() {
    if (!pieChart) return;
    
    const svgNode = pieChart.svg.node().parentNode;
    const svgData = new XMLSerializer().serializeToString(svgNode);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = function() {
        canvas.width = pieChart.width;
        canvas.height = pieChart.height;
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = 'depression-pie-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
}

function createTooltip() {
    return d3.select('body')
        .append('div')
        .attr('id', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'white')
        .style('border', '1px solid #e2e8f0')
        .style('border-radius', '6px')
        .style('padding', '5px')
        .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('display', 'none')
        .style('font-size', '12px');
}

function hideTooltip() {
    d3.select('#tooltip').style('display', 'none');
}

// Exposer les fonctions
window.initPieChart = initPieChart;
window.updatePieChart = updatePieChart;