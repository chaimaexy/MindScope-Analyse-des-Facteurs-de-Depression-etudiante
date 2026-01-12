// js/charts/smallMultiples.js - VERSION SIMPLIFIÉE POUR TEST

const SMALL_MULTIPLES_COLORS = ['#4E79A7', '#F28E2C', '#E15759', '#76B7B2', '#59A14F'];

function createSmallMultiples(container, data, clusters, variable) {
    console.log('=== DEBUG CREATE SMALL MULTIPLES ===');
    console.log('Container:', container);
    console.log('Données reçues:', data?.length || 0);
    console.log('Clusters reçus:', clusters?.length || 0);
    console.log('Variable:', variable);
    
    // Vérifier que le conteneur existe
    const containerElement = document.querySelector(container);
    console.log('Élément conteneur trouvé:', !!containerElement);
    console.log('Dimensions conteneur:', containerElement?.clientWidth, 'x', containerElement?.clientHeight);
    
    if (!containerElement) {
        console.error('Conteneur non trouvé:', container);
        return;
    }
    
    // Nettoyer le conteneur
    d3.select(container).selectAll('*').remove();
    
    // Vérifier les données
    if (!data || data.length === 0) {
        console.error('Pas de données!');
        showErrorMessage(container, 'Aucune donnée disponible');
        return;
    }
    
    if (!clusters || clusters.length === 0) {
        console.error('Pas de clusters!');
        showErrorMessage(container, 'Aucun cluster disponible');
        return;
    }
    
    // Créer un message de test simple
    const testMessage = `
        <div style="text-align: center; padding: 40px;">
            <h3 style="color: #4f46e5;">Test Small Multiples</h3>
            <p>Données: ${data.length} étudiants</p>
            <p>Clusters: ${clusters.length}</p>
            <p>Variable: ${variable}</p>
            <p>Dimensions: ${containerElement.clientWidth} x ${containerElement.clientHeight}</p>
            <div style="margin-top: 20px; color: #16a34a;">
                Le script fonctionne!
            </div>
        </div>
    `;
    
    d3.select(container)
        .append('div')
        .html(testMessage);
    
    // Créer un SVG simple pour tester
    const svg = d3.select(container)
        .append('svg')
        .attr('width', containerElement.clientWidth)
        .attr('height', 300)
        .style('background', '#f8fafc');
    
    // Ajouter un titre
    svg.append('text')
        .attr('x', containerElement.clientWidth / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Small Multiples - Version Test');
    
    // Afficher quelques statistiques
    const numClusters = clusters.length;
    const yStart = 80;
    
    clusters.forEach((cluster, i) => {
        const x = 50 + (i * 150);
        const y = yStart;
        
        // Carré de couleur pour le cluster
        svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', SMALL_MULTIPLES_COLORS[i % SMALL_MULTIPLES_COLORS.length]);
        
        // Nom du cluster
        svg.append('text')
            .attr('x', x + 25)
            .attr('y', y + 15)
            .style('font-size', '12px')
            .text(`Cluster ${i + 1}`);
        
        // Taille du cluster
        svg.append('text')
            .attr('x', x)
            .attr('y', y + 50)
            .style('font-size', '11px')
            .style('fill', '#666')
            .text(`${cluster.length} étudiants`);
        
        // Valeur moyenne si disponible
        if (cluster.length > 0) {
            const values = cluster.map(d => d[variable]).filter(v => v !== undefined);
            if (values.length > 0) {
                const avg = d3.mean(values);
                svg.append('text')
                    .attr('x', x)
                    .attr('y', y + 70)
                    .style('font-size', '11px')
                    .style('fill', '#dc2626')
                    .text(`Avg: ${avg?.toFixed(1) || 'N/A'}`);
            }
        }
    });
    
    console.log('Small multiples test créé avec succès');
}

function showErrorMessage(container, message) {
    d3.select(container)
        .append('div')
        .style('text-align', 'center')
        .style('padding', '60px 20px')
        .style('color', '#666')
        .style('background', '#f8fafc')
        .style('border-radius', '8px')
        .style('border', '2px dashed #d1d5db')
        .html(`
            <h4 style="color: #dc2626; margin-bottom: 10px;"><i class="icon icon-warning" aria-hidden="true"></i> Erreur d'affichage</h4>
            <p>${message}</p>
            <p style="font-size: 12px; margin-top: 10px; color: #9ca3af;">
                Vérifiez la console pour plus de détails
            </p>
        `);
}