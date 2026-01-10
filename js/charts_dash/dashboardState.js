// js/charts_dash/dashboardState.js
// État global pour la synchronisation entre les graphiques

const DashboardState = {
    // Données actuelles
    currentData: [],
    
    // Sélection active
    selection: {
        type: null, // 'city', 'depression', 'gender', 'degree'
        value: null
    },
    
    // Configuration des graphiques
    config: {
        pieChart: {
            colors: ['#10b981', '#ef4444'],
            labels: ['Non déprimé', 'Déprimé']
        },
        radarChart: {
            variables: [
                'academic_pressure',
                'sleep_duration',
                'financial_stress',
                'study_satisfaction',
                'cgpa',
                'work_study_hours'
            ],
            labels: [
                'Pression Académique',
                'Qualité Sommeil',
                'Stress Financier',
                'Satisfaction Études',
                'CGPA',
                'Heures d\'Étude'
            ]
        },
        barChart: {
            variables: [
                'academic_pressure',
                'sleep_duration',
                'dietary_habits',
                'work_pressure',
                'financial_stress'
            ],
            labels: [
                'Pression Académique',
                'Sommeil',
                'Habitudes Alimentaires',
                'Pression Travail',
                'Stress Financier'
            ],
            colors: [
                '#3b82f6', // Bleu
                '#10b981', // Vert
                '#f59e0b', // Orange
                '#8b5cf6', // Violet
                '#ef4444'  // Rouge
            ]
        }
    },
    
    // Fonctions utilitaires
    utils: {
        // Calculer les moyennes par ville
        calculateCityStats: function(data) {
            const cityStats = {};
            
            data.forEach(student => {
                const city = student.city;
                if (!city || city === 'Unknown') return;
                
                if (!cityStats[city]) {
                    cityStats[city] = {
                        count: 0,
                        totalSatisfaction: 0,
                        totalCGPA: 0,
                        depressedCount: 0
                    };
                }
                
                cityStats[city].count++;
                cityStats[city].totalSatisfaction += student.study_satisfaction || 0;
                cityStats[city].totalCGPA += student.cgpa || 0;
                if (student.depression === 1) {
                    cityStats[city].depressedCount++;
                }
            });
            
            // Calculer les moyennes
            Object.keys(cityStats).forEach(city => {
                cityStats[city].avgSatisfaction = cityStats[city].totalSatisfaction / cityStats[city].count;
                cityStats[city].avgCGPA = cityStats[city].totalCGPA / cityStats[city].count;
                cityStats[city].depressionRate = cityStats[city].depressedCount / cityStats[city].count;
            });
            
            return cityStats;
        },
        
        // Calculer les statistiques de dépression
        calculateDepressionStats: function(data) {
            const total = data.length;
            const depressed = data.filter(d => d.depression === 1).length;
            const notDepressed = total - depressed;
            
            return {
                total,
                depressed,
                notDepressed,
                depressionRate: total > 0 ? depressed / total : 0
            };
        },
        
        // Calculer les moyennes pour le radar chart
        calculateRadarData: function(data) {
            const variables = DashboardState.config.radarChart.variables;
            const result = {};
            
            variables.forEach(variable => {
                const values = data.map(d => d[variable] || 0).filter(v => !isNaN(v));
                result[variable] = values.length > 0 ? d3.mean(values) : 0;
            });
            
            return result;
        },
        
        // Calculer les données pour le bar chart
        calculateBarChartData: function(data, groupBy = 'depression') {
            const variables = DashboardState.config.barChart.variables;
            const groups = {};
            
            // Grouper les données
            if (groupBy === 'depression') {
                groups['Déprimés'] = data.filter(d => d.depression === 1);
                groups['Non déprimés'] = data.filter(d => d.depression === 0);
            } else if (groupBy === 'gender') {
                groups['Hommes'] = data.filter(d => d.gender === 'Male');
                groups['Femmes'] = data.filter(d => d.gender === 'Female');
            } else if (groupBy === 'city') {
                // Prendre les 5 villes principales
                const cityStats = this.calculateCityStats(data);
                const topCities = Object.entries(cityStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5);
                
                topCities.forEach(([city, stats]) => {
                    groups[city] = data.filter(d => d.city === city);
                });
            }
            
            // Calculer les moyennes pour chaque groupe et variable
            const result = [];
            
            Object.entries(groups).forEach(([groupName, groupData]) => {
                const groupResult = { group: groupName };
                
                variables.forEach(variable => {
                    const values = groupData.map(d => d[variable] || 0).filter(v => !isNaN(v));
                    groupResult[variable] = values.length > 0 ? d3.mean(values) : 0;
                });
                
                result.push(groupResult);
            });
            
            return result;
        },
        // Dans DashboardState.utils, ajoutez :
        calculateIndiaCityStats: function(data) {
            const stats = {};
            
            data.forEach(student => {
                const city = student.city;
                if (!city || city === 'Unknown') return;
                
                if (!stats[city]) {
                    stats[city] = {
                        city: city,
                        state: this.getIndianState(city),
                        count: 0,
                        totalCGPA: 0,
                        totalSatisfaction: 0,
                        depressedCount: 0,
                        totalSleep: 0,
                        totalDiet: 0
                    };
                }
                
                stats[city].count++;
                stats[city].totalCGPA += student.cgpa || 0;
                stats[city].totalSatisfaction += student.study_satisfaction || 0;
                stats[city].totalSleep += student.sleep_duration || 0;
                stats[city].totalDiet += student.dietary_habits || 0;
                
                if (student.depression === 1) {
                    stats[city].depressedCount++;
                }
            });
            
            // Calculer les moyennes
            Object.keys(stats).forEach(city => {
                stats[city].avgCGPA = stats[city].totalCGPA / stats[city].count;
                stats[city].avgSatisfaction = stats[city].totalSatisfaction / stats[city].count;
                stats[city].depressionRate = stats[city].depressedCount / stats[city].count;
                stats[city].avgSleep = stats[city].totalSleep / stats[city].count;
                stats[city].avgDiet = stats[city].totalDiet / stats[city].count;
            });
            
            return stats;
        },

        getIndianState: function(city) {
            // Même fonction que dans indiaMap.js
            const cityStateMap = {
                'Mumbai': 'Maharashtra',
                'Pune': 'Maharashtra',
                'Nagpur': 'Maharashtra',
                // ... etc
            };
            return cityStateMap[city] || 'Unknown';
        },

        // Ajoutez à DashboardState.utils
        normalizeIndianCity: function(cityName) {
            if (!cityName) return 'Unknown';
            
            const cityMap = {
                // Standardisation des noms
                'Mumbai': 'Mumbai',
                'Bombay': 'Mumbai',
                'Delhi': 'Delhi',
                'New Delhi': 'Delhi',
                'Bangalore': 'Bangalore',
                'Bengaluru': 'Bangalore',
                'Chennai': 'Chennai',
                'Madras': 'Chennai',
                'Kolkata': 'Kolkata',
                'Calcutta': 'Kolkata',
                'Pune': 'Pune',
                'Ahmedabad': 'Ahmedabad',
                'Hyderabad': 'Hyderabad',
                'Jaipur': 'Jaipur',
                'Lucknow': 'Lucknow',
                'Nagpur': 'Nagpur',
                'Visakhapatnam': 'Visakhapatnam',
                'Vadodara': 'Vadodara',
                'Srinagar': 'Srinagar',
                'Varanasi': 'Varanasi',
                'Thane': 'Thane',
                'Nashik': 'Nashik',
                
                // Corrections de fautes
                'Khaziabad': 'Ghaziabad',
                
                // Nettoyage des entrées problématiques
                'Less Delhi': 'Delhi',
                'Less than 5 Kalyan': 'Kalyan',
                
                // Noms atypiques (à mapper sur des villes réelles)
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
                'Vaanya': 'Delhi'
            };
            
            return cityMap[cityName] || cityName;
},

// Fonction pour vérifier si c'est une vraie ville
isValidIndianCity: function(cityName) {
    const validCities = [
        'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
        'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
        'Nagpur', 'Visakhapatnam', 'Vadodara', 'Srinagar',
        'Varanasi', 'Thane', 'Nashik', 'Kalyan', 'Ghaziabad',
        'Faridabad', 'Surat', 'Rajkot', 'Bhopal', 'Indore',
        'Kanpur', 'Agra', 'Meerut', 'Ludhiana', 'Patna',
        'Vasai-Virar', 'Coimbatore', 'Kochi', 'Chandigarh'
    ];
    
    return validCities.includes(cityName);
}
    }
};

// Exposer globalement
window.DashboardState = DashboardState;