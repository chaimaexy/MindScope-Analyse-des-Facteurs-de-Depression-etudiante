// js/exportPDF.js

// Fonction pour initialiser l'export PDF
function initPDFExport() {
    const exportBtn = document.getElementById('export-pdf-btn');
    const exportStatus = document.getElementById('export-status');
    
    if (!exportBtn) return;
    
    exportBtn.addEventListener('click', async () => {
        await exportToPDF();
    });
    
    // Optionnel: Mettre à jour le statut de la bibliothèque
    checkLibraryStatus();
}

// Vérifier si la bibliothèque html2pdf est disponible
async function checkLibraryStatus() {
    if (typeof html2pdf === 'undefined') {
        console.log('html2pdf.js non chargé, chargement en cours...');
        showExportStatus('info', 'Chargement de la bibliothèque PDF...');
        
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            showExportStatus('success', 'Bibliothèque PDF chargée avec succès!', 2000);
        } catch (error) {
            showExportStatus('error', 'Erreur de chargement de la bibliothèque PDF');
        }
    }
}

// Charger un script dynamiquement
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Fonction principale d'export PDF
async function exportToPDF() {
    const exportBtn = document.getElementById('export-pdf-btn');
    const originalText = exportBtn.innerHTML;
    
    try {
        // Désactiver le bouton pendant l'export
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="icon icon-spinner" aria-hidden="true"></i> Génération du PDF...';
        
        showExportStatus('info', 'Préparation de l\'export PDF...');
        
        // Vérifier que la bibliothèque est chargée
        if (typeof html2pdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }
        
        // Préparer le contenu pour l'export
        const content = prepareContentForExport();
        
        // Configuration pour l'export
        const options = {
            margin: [15, 15, 15, 15],
            filename: `dashboard-sante-mentale-${getFormattedDate()}.pdf`,
            image: { 
                type: 'jpeg', 
                quality: 0.98 
            },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a3', 
                orientation: 'landscape',
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'] 
            }
        };
        
        // Générer le PDF
        showExportStatus('info', 'Génération du PDF en cours...');
        
        await html2pdf().from(content).set(options).save();
        
        // Succès
        showExportStatus('success', 'PDF exporté avec succès! Le téléchargement a commencé.');
        
        // Réactiver le bouton après un délai
        setTimeout(() => {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalText;
            hideExportStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Erreur lors de l\'export PDF:', error);
        showExportStatus('error', `Erreur: ${error.message || 'Échec de l\'export PDF'}`);
        
        // Réactiver le bouton
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
    }
}

// Préparer le contenu pour l'export
function prepareContentForExport() {
    // Créer un clone du contenu principal
    const mainContent = document.querySelector('.main-content').cloneNode(true);
    
    // Appliquer des styles spécifiques pour l'impression
    applyPrintStyles(mainContent);
    
    // Créer un conteneur pour l'export
    const exportContainer = document.createElement('div');
    exportContainer.className = 'pdf-export-container';
    
    // Ajouter un en-tête
    const header = createPDFHeader();
    exportContainer.appendChild(header);
    
    // Ajouter le contenu cloné
    exportContainer.appendChild(mainContent);
    
    // Ajouter un pied de page
    const footer = createPDFFooter();
    exportContainer.appendChild(footer);
    
    return exportContainer;
}

// Créer l'en-tête du PDF
function createPDFHeader() {
    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #4f46e5; color: white; border-radius: 8px 8px 0 0;">
            <div>
                <h1 style="margin: 0; font-size: 24px; font-weight: 600;">LUMINA - Dashboard Santé Mentale</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Analyse des clusters étudiants - Export du ${getFormattedDate()}</p>
            </div>
            <div style="background: white; color: #4f46e5; padding: 8px 16px; border-radius: 20px; font-weight: 600;">
                CONFIDENTIEL
            </div>
        </div>
    `;
    return header;
}

// Créer le pied de page du PDF
function createPDFFooter() {
    const footer = document.createElement('div');
    footer.className = 'pdf-footer';
    footer.innerHTML = `
        <div style="padding: 15px; background: #f1f5f9; border-radius: 0 0 8px 8px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <strong>LUMINA Analytics</strong> - Système d'analyse de santé mentale étudiante
                </div>
                <div>
                    Page générée le ${new Date().toLocaleString('fr-FR')}
                </div>
            </div>
            <div style="margin-top: 10px; text-align: center; font-size: 11px; color: #94a3b8;">
                Ce document contient des informations confidentielles destinées à un usage interne uniquement.
            </div>
        </div>
    `;
    return footer;
}

// Appliquer les styles d'impression
function applyPrintStyles(content) {
    // Masquer les éléments interactifs
    const elementsToHide = content.querySelectorAll('button, select, input, .student-selector, .comment-button, .tooltip');
    elementsToHide.forEach(el => {
        el.style.display = 'none';
    });
    
    // Ajuster les styles pour l'impression
    content.style.padding = '20px';
    content.style.backgroundColor = 'white';
    
    // Ajuster les graphiques pour l'impression
    const charts = content.querySelectorAll('.chart-container, .bubble-chart');
    charts.forEach(chart => {
        chart.style.height = 'auto';
        chart.style.minHeight = '300px';
    });
    
    // Ajouter des bordures aux cartes
    const cards = content.querySelectorAll('.chart-card');
    cards.forEach(card => {
        card.style.border = '1px solid #e2e8f0';
        card.style.boxShadow = 'none';
    });
}

// Obtenir la date formatée
function getFormattedDate() {
    const now = new Date();
    return now.toISOString().split('T')[0].replace(/-/g, '');
}

// Afficher un message de statut
function showExportStatus(type, message, autoHide = 5000) {
    const statusElement = document.getElementById('export-status');
    if (!statusElement) return;
    
    statusElement.className = `export-status show ${type}`;
    statusElement.textContent = message;
    statusElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳'}
            </span>
            <span>${message}</span>
        </div>
    `;
    
    if (autoHide) {
        setTimeout(() => {
            hideExportStatus();
        }, autoHide);
    }
}

// Masquer le message de statut
function hideExportStatus() {
    const statusElement = document.getElementById('export-status');
    if (statusElement) {
        statusElement.classList.remove('show');
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Attendre que la page soit complètement chargée
    setTimeout(() => {
        initPDFExport();
    }, 1000);
});

// Ajouter des styles CSS pour l'export PDF
const pdfStyles = document.createElement('style');
pdfStyles.textContent = `
    @media print {
        body * {
            visibility: hidden;
        }
        .pdf-export-container, .pdf-export-container * {
            visibility: visible;
        }
        .pdf-export-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
        }
    }
    
    .pdf-export-container {
        font-family: 'Inter', sans-serif;
        background: white;
        color: #1e293b;
        max-width: 100%;
    }
    
    .pdf-header, .pdf-footer {
        page-break-inside: avoid;
    }
    
    .chart-card {
        page-break-inside: avoid;
        break-inside: avoid;
    }
    
    /* Assurer que les graphiques sont visibles */
    .chart-container svg {
        max-width: 100% !important;
        height: auto !important;
    }
    
    /* Forcer les couleurs pour l'impression */
    @media print {
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
    }
`;
document.head.appendChild(pdfStyles);