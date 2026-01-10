
var Utils = {
    // Convertir les valeurs catégorielles en scores numériques

    mapScore: function(value) {
        if (value === undefined || value === null || value === '') return 3;
        
        const mapping = {
            // Stress/Niveaux
            'Low': 1, 'Moderate': 3, 'High': 5,
            'Very Low': 1, 'Very High': 5,
            
            // Habitudes alimentaires
            'Unhealthy': 1, 'Moderate': 3, 'Healthy': 5,
            
            // Durée de sommeil
            'Less than 5 hours': 1,
            '5-6 hours': 2,
            '7-8 hours': 4,
            'More than 8 hours': 5,
            
            // Satisfaction
            'Very Dissatisfied': 1,
            'Dissatisfied': 2,
            'Neutral': 3,
            'Satisfied': 4,
            'Very Satisfied': 5
        };
        
        return mapping[value] || (isNaN(value) ? 3 : +value);
    },

           // Ajoutez à votre Utils existant
    normalizeIndianCity: function(cityName) {
        if (!cityName) return 'Unknown';
        
        const cityMap = {
            // Villes majeures
            'Mumbai': 'Mumbai',
            'Delhi': 'Delhi',
            'Bangalore': 'Bangalore',
            'Chennai': 'Chennai',
            'Hyderabad': 'Hyderabad',
            'Kolkata': 'Kolkata',
            'Pune': 'Pune',
            'Ahmedabad': 'Ahmedabad',
            'Jaipur': 'Jaipur',
            'Lucknow': 'Lucknow',
            
            // Villes de votre dataset
            'Nagpur': 'Nagpur',
            'Visakhapatnam': 'Visakhapatnam',
            'Vadodara': 'Vadodara',
            'Srinagar': 'Srinagar',
            'Varanasi': 'Varanasi',
            'Thane': 'Thane',
            'Nashik': 'Nashik',
            'Kalyan': 'Kalyan',
            'Ghaziabad': 'Ghaziabad',
            'Faridabad': 'Faridabad',
            'Surat': 'Surat',
            'Rajkot': 'Rajkot',
            'Bhopal': 'Bhopal',
            'Indore': 'Indore',
            'Kanpur': 'Kanpur',
            'Agra': 'Agra',
            'Meerut': 'Meerut',
            'Ludhiana': 'Ludhiana',
            'Patna': 'Patna',
            'Vasai-Virar': 'Vasai-Virar',
            
            // Corrections
            'Khaziabad': 'Ghaziabad',
            'Less Delhi': 'Delhi',
            'Less than 5 Kalyan': 'Kalyan',
            
            // Noms atypiques mappés sur des villes réelles
            'Bhavna': 'Mumbai',
            'Gaurav': 'Delhi',
            'Harsh': 'Bangalore',
            'Harsha': 'Pune',
            'Kibara': 'Delhi',
            'Mihir': 'Mumbai',
            'Mira': 'Mumbai',
            'Nalini': 'Bangalore',
            'Nalyan': 'Kalyan',
            'Nandini': 'Bangalore',
            'Rashi': 'Mumbai',
            'Reyansh': 'Delhi',
            'Saanvi': 'Bangalore',
            'Vaanya': 'Delhi',
            
            // Diplômes et valeurs non-ville
            'M.Com': 'Unknown',
            'M.Tech': 'Unknown',
            'ME': 'Unknown',
            '3': 'Unknown'
        };
        
        const normalized = cityMap[cityName] || cityName;
        
        // Vérifier si c'est encore un nom atypique
        const nonCityNames = ['3', 'Bhavna', 'Gaurav', 'Harsh', 'Harsha', 'Kibara', 
                            'Mihir', 'Mira', 'Nalini', 'Nalyan', 'Nandini', 
                            'Rashi', 'Reyansh', 'Saanvi', 'Vaanya',
                            'M.Com', 'M.Tech', 'ME'];
        
        if (nonCityNames.includes(normalized)) {
            return 'Unknown';
        }
        
        return normalized;
    },

    // Nouvelle fonction pour obtenir les coordonnées d'une ville
    getCityCoordinates: function(cityName) {
        const coordinates = {
            'Mumbai': [72.8777, 19.0760],
            'Delhi': [77.1025, 28.7041],
            'Bangalore': [77.5946, 12.9716],
            'Chennai': [80.2707, 13.0827],
            'Hyderabad': [78.4867, 17.3850],
            'Kolkata': [88.3639, 22.5726],
            'Pune': [73.8567, 18.5204],
            'Ahmedabad': [72.5714, 23.0225],
            'Jaipur': [75.7873, 26.9124],
            'Lucknow': [80.9462, 26.8467],
            'Nagpur': [79.0882, 21.1458],
            'Visakhapatnam': [83.2185, 17.6868],
            'Vadodara': [73.1812, 22.3072],
            'Srinagar': [74.7973, 34.0837],
            'Varanasi': [82.9739, 25.3176],
            'Thane': [72.9762, 19.2183],
            'Nashik': [73.7898, 19.9975],
            'Kalyan': [73.1305, 19.2354],
            'Ghaziabad': [77.4390, 28.6692],
            'Faridabad': [77.3190, 28.4089],
            'Surat': [72.8311, 21.1702],
            'Rajkot': [70.8029, 22.3039],
            'Bhopal': [77.4126, 23.2599],
            'Indore': [75.8577, 22.7196],
            'Kanpur': [80.3319, 26.4499],
            'Agra': [78.0081, 27.1767],
            'Meerut': [77.7039, 28.9845],
            'Ludhiana': [75.8573, 30.9010],
            'Patna': [85.1376, 25.5941],
            'Vasai-Virar': [72.8397, 19.4700]
        };
        
        return coordinates[cityName] || [77.1025, 28.7041]; // Delhi par défaut
    },
    // Normaliser entre 0 et 1
    normalize: function(value, min, max) {
        if (max === min) return 0.5;
        return (value - min) / (max - min);
    },
    
    // Calculer des moyennes pondérées
    calculateWeightedAverage: function(data, features, weights) {
        const averages = {};
        features.forEach((f, i) => {
            const weight = weights?.[i] || 1;
            const values = data.map(d => d[f]).filter(v => v !== undefined);
            averages[f] = values.length > 0 ? 
                d3.mean(values) * weight : 0;
        });
        return averages;
    },
    
    // Formater les nombres
    formatNumber: function(num, decimals = 2) {
        return num.toFixed(decimals);
    },
    
    // Calculer le pourcentage
    calculatePercentage: function(part, total) {
        if (total === 0) return 0;
        return (part / total) * 100;
    },
    
    // Obtenir le nom du cluster
    getClusterName: function(clusterId) {
        const names = [
            'Résilients',
            'À Risque Modéré',
            'Haut Risque',
            'Équilibre Précaire',
            'Performants Stressés'
        ];
        return names[clusterId] || `Cluster ${clusterId + 1}`;
    },
    
    // Obtenir la couleur du cluster
    getClusterColor: function(clusterId) {
        const colors = ['#4E79A7', '#F28E2C', '#E15759', '#76B7B2', '#59A14F'];
        return colors[clusterId % colors.length];
    },
    
    // Générer un ID unique
    generateId: function() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }
};

// Fonction d'export de graphique
function exportChart(chartId, format, filename) {
    const svgElement = document.querySelector(`#${chartId} svg`);
    if (!svgElement) {
        console.error("SVG element not found for export:", chartId);
        return;
    }
    
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);
    
    // Ajouter les styles
    const style = document.createElement('style');
    style.innerHTML = `
        .data-point { cursor: pointer; }
        .radar-area { fill-opacity: 0.3; }
        .tooltip { font-family: 'Inter', sans-serif; }
    `;
    
    svgString = svgString.replace('<svg', `<svg>${serializer.serializeToString(style)}`);
    
    if (format === "svg") {
        const blob = new Blob([svgString], {type: "image/svg+xml"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else if (format === "png") {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
            canvas.width = svgElement.clientWidth;
            canvas.height = svgElement.clientHeight;
            ctx.drawImage(img, 0, 0);
            
            const pngUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
        };
        
        img.onerror = (error) => {
            console.error("Error loading SVG for PNG export:", error);
            alert("Erreur lors de l'export PNG. L'export SVG est recommandé.");
        };
        
        img.src = url;
    }
}

// Fonction pour télécharger les données
function downloadData(data, filename = 'data.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Fonction pour copier dans le presse-papier
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
        });
}

// Fonction de débogage
function debugLog(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] ${message}`, data);
    }
}
if (typeof window.CLUSTER_COLORS === 'undefined') {
    window.CLUSTER_COLORS = [
        '#4E79A7', // Bleu - Cluster 1
        '#F28E2C', // Orange - Cluster 2
        '#E15759', // Rouge - Cluster 3
        '#76B7B2', // Vert-bleu - Cluster 4
        '#59A14F', // Vert - Cluster 5
        '#EDC949', // Jaune - Cluster 6
        '#AF7AA1', // Violet - Cluster 7
        '#FF9DA7'  // Rose - Cluster 8
    ];
}