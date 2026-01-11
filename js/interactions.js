// interactions.js - Version corrigée avec animations simples
// Compatible avec CSV: "Academic Pressure", "Sleep Duration", "Depression", etc.

let studentData = [];
let filteredData = [];
let lastGridData = null;
let numericExtents = null;
let currentHeatmapCell = null;
let animationEnabled = true;

let currentState = {
  factorX: "sleep_duration",
  factorY: "financial_stress",
  threshold: 0.5
};

// -------------------------
// SCHEMA DE DONNÉES (inchangé)
// -------------------------
const SCHEMA = {
  "Depression": { key: "depression", type: "binary", label: "Dépression (0/1)", parse: v => Number(v) || 0 },
  "Age": { key: "age", type: "number", label: "Âge", parse: v => +v },
  "CGPA": { key: "cgpa", type: "number", label: "CGPA", parse: v => +v },
  "Work/Study Hours": { key: "hours", type: "number", label: "Heures Travail/Étude", parse: v => +v },
  "Academic Pressure": { key: "academic_pressure", type: "ordinal5", label: "Pression Académique", parse: v => +v },
  "Work Pressure": { key: "work_pressure", type: "ordinal5", label: "Pression au Travail", parse: v => +v },
  "Study Satisfaction": { key: "study_satisfaction", type: "ordinal5", label: "Satisfaction Études", parse: v => +v },
  "Job Satisfaction": { key: "job_satisfaction", type: "ordinal5", label: "Satisfaction Travail", parse: v => +v },
  "Financial Stress": { key: "financial_stress", type: "ordinal5", label: "Stress Financier", parse: v => +v },
  "Sleep Duration": { key: "sleep_duration", type: "sleep_ordinal", label: "Durée de Sommeil", parse: v => parseSleepDuration(v) },
  "Gender": { key: "gender", type: "category", label: "Genre", parse: v => String(v ?? "").trim() },
  "City": { key: "city", type: "category", label: "Ville", parse: v => String(v ?? "").trim() },
  "Profession": { key: "profession", type: "category", label: "Profession", parse: v => String(v ?? "").trim() },
  "Degree": { key: "degree", type: "category", label: "Diplôme", parse: v => String(v ?? "").trim() },
  "Dietary Habits": { key: "diet", type: "category", label: "Habitudes Alimentaires", parse: v => String(v ?? "").trim() },
  "Family History of Mental Illness": { key: "family_history", type: "category", label: "Antécédents Familiaux", parse: v => String(v ?? "").trim() },
  "Have you ever had suicidal thoughts ?": { key: "suicidal_thoughts", type: "category", label: "Pensées Suicidaires", parse: v => String(v ?? "").trim() }
};

function parseSleepDuration(v) {
  if (v == null) return 3;
  const s = String(v).replace(/['"]/g, "").trim().toLowerCase();
  if (s.includes("less than 5")) return 1;
  if (s.includes("5-6")) return 2;
  if (s.includes("6-7")) return 3;
  if (s.includes("7-8")) return 4;
  if (s.includes("more than 8")) return 5;
  return 3;
}

function clamp15(n, fallback = 3) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(5, Math.max(1, Math.round(x)));
}

// -------------------------
// UTILITAIRES UI (version simplifiée)
// -------------------------
function showLoading(container, message = "Chargement...") {
  d3.select(container).html(`
    <div class="loading">
      <div class="spinner"></div>
      <div>${message}</div>
    </div>
  `);
}

function showError(container, message) {
  d3.select(container).html(`
    <div class="error-message">
      <div style="font-size:48px;margin-bottom:16px">❌</div>
      <div>${message}</div>
      <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;background:#6366f1;color:white;border:none;border-radius:6px;cursor:pointer">
        Réessayer
      </button>
    </div>
  `);
}

// -------------------------
// TRAITEMENT DES DONNÉES (inchangé)
// -------------------------
function processData(rows) {
  return rows.map((r, i) => {
    const obj = { id: r.id ?? i };

    for (const [csvCol, meta] of Object.entries(SCHEMA)) {
      obj[meta.key] = meta.parse ? meta.parse(r[csvCol]) : r[csvCol];
    }

    // Normalisation ordinal5
    for (const meta of Object.values(SCHEMA)) {
      if (meta.type === "ordinal5") {
        obj[meta.key] = clamp15(obj[meta.key], 3);
      }
    }

    // Normalisation sleep
    obj.sleep_duration = clamp15(obj.sleep_duration, 3);

    // Normalisation catégories
    for (const meta of Object.values(SCHEMA)) {
      if (meta.type === "category") {
        const v = obj[meta.key];
        obj[meta.key] = (v === "" || v == null ? "Non spécifié" : v);
      }
    }

    return obj;
  });
}

function computeNumericExtents(data) {
  const ext = {};
  for (const meta of Object.values(SCHEMA)) {
    if (meta.type === "number") {
      const values = data.map(d => d[meta.key]).filter(v => Number.isFinite(v));
      ext[meta.key] = d3.extent(values);
    }
  }
  return ext;
}

// -------------------------
// LISTES DE FACTEURS
// -------------------------
function getFactorMetaByKey(key) {
  return Object.values(SCHEMA).find(m => m.key === key);
}

function selectableFactors() {
  return Object.values(SCHEMA)
    .filter(m => m.key !== "depression")
    .filter(m => ["ordinal5", "sleep_ordinal", "number"].includes(m.type))
    .map(m => ({ key: m.key, label: m.label, type: m.type }));
}

function categoryFactors() {
  return Object.values(SCHEMA)
    .filter(m => m.type === "category")
    .map(m => ({ key: m.key, label: m.label }));
}

function numericFactors() {
  return Object.values(SCHEMA)
    .filter(m => m.type === "number")
    .map(m => ({ key: m.key, label: m.label }));
}

function populateSelect(selectId, items, defaultKey) {
  const sel = d3.select(selectId);
  sel.html(items.map(it => `<option value="${it.key}">${it.label}</option>`).join(""));
  if (defaultKey) sel.property("value", defaultKey);
}

function setupDropdowns() {
  const factors = selectableFactors();
  populateSelect("#factor-x", factors, currentState.factorX);
  populateSelect("#factor-y", factors, currentState.factorY);

  const cats = categoryFactors();
  populateSelect("#group-by", cats, cats[0]?.key);

  const nums = numericFactors();
  populateSelect("#numeric-var", nums, nums[0]?.key);
}

// -------------------------
// BINNING POUR HEATMAP
// -------------------------
function binToFive(value, extent) {
  const [min, max] = extent || [0, 1];
  if (!Number.isFinite(value) || min === max) return 3;
  const t = (value - min) / (max - min);
  return Math.min(5, Math.max(1, Math.floor(t * 5) + 1));
}

function getHeatmapValue(d, factorKey) {
  const meta = getFactorMetaByKey(factorKey);
  if (!meta) return 3;

  if (meta.type === "ordinal5" || meta.type === "sleep_ordinal") {
    return clamp15(d[factorKey], 3);
  }
  if (meta.type === "number") {
    return binToFive(d[factorKey], numericExtents?.[factorKey]);
  }
  return 3;
}

// -------------------------
// INITIALISATION (version corrigée)
// -------------------------
async function initInteractions() {
  showLoading("#heatmap-container", "Chargement des données...");

  try {
    const raw = await d3.csv("data/student_depression_dataset.csv");
    studentData = processData(raw);
    filteredData = [...studentData];
    numericExtents = computeNumericExtents(studentData);

    setupDropdowns();
    setupEvents();

    updateFactorLabels();
    renderHeatmap();
    updateSimulator();
    updateInsights();
    renderBarChart();
    renderHistogram();

    console.log("✅ Données chargées :", studentData.length, "étudiants");

  } catch (e) {
    console.error("❌ Erreur :", e);
    showError("#heatmap-container", "Impossible de charger les données CSV");
  }
}

// -------------------------
// GESTION DES ÉVÉNEMENTS (version corrigée)
// -------------------------
function setupEvents() {
  d3.select("#factor-x").on("change", function() {
    currentState.factorX = this.value;
    currentHeatmapCell = null;
    updateFactorLabels();
    renderHeatmap();
    updateInsights();
    updateSimulator();
    updateFilteredData();
  });

  d3.select("#factor-y").on("change", function() {
    currentState.factorY = this.value;
    currentHeatmapCell = null;
    updateFactorLabels();
    renderHeatmap();
    updateInsights();
    updateSimulator();
    updateFilteredData();
  });

  d3.select("#risk-threshold").on("input", function() {
    currentState.threshold = this.value / 100;
    d3.select("#threshold-value").text(this.value + "%");
    renderHeatmap();
    updateInsights();
  });

  d3.select("#analyze-btn").on("click", () => {
    renderHeatmap();
    updateInsights();
    updateSimulator();
  });

  d3.select("#reset-btn").on("click", resetState);

  d3.select("#sim-x").on("input", updateSimulator);
  d3.select("#sim-y").on("input", updateSimulator);

  d3.select("#group-by").on("change", renderBarChart);
  d3.select("#numeric-var").on("change", renderHistogram);

  window.addEventListener("resize", () => {
    renderHeatmap();
    renderBarChart();
    renderHistogram();
  });
}

function updateFactorLabels() {
  const fx = getFactorMetaByKey(currentState.factorX);
  const fy = getFactorMetaByKey(currentState.factorY);

  d3.select("#factor-x-label-text").text(fx ? fx.label : currentState.factorX);
  d3.select("#factor-y-label-text").text(fy ? fy.label : currentState.factorY);
}

function updateFilteredData() {
  if (!currentHeatmapCell) {
    filteredData = [...studentData];
  } else {
    const { x, y, factorX, factorY } = currentHeatmapCell;
    filteredData = studentData.filter(d => 
      getHeatmapValue(d, factorX) === x && 
      getHeatmapValue(d, factorY) === y
    );
  }
  
  renderBarChart();
  renderHistogram();
}

// -------------------------
// HEATMAP AVEC ANIMATIONS SIMPLES
// -------------------------
function calculateGridData() {
  const gridData = [];
  const fx = currentState.factorX;
  const fy = currentState.factorY;

  for (let x = 1; x <= 5; x++) {
    for (let y = 1; y <= 5; y++) {
      const subset = studentData.filter(d =>
        getHeatmapValue(d, fx) === x && getHeatmapValue(d, fy) === y
      );

      const count = subset.length;
      const risk = count ? subset.filter(d => d.depression === 1).length / count : 0;

      gridData.push({ x, y, count, risk, factorX: fx, factorY: fy });
    }
  }
  return gridData;
}

function renderHeatmap() {
  const container = d3.select("#heatmap-container");
  container.html("");

  if (!studentData.length) {
    showLoading(container, "Aucune donnée disponible");
    return;
  }

  const width = container.node().clientWidth || 700;
  const height = 420;
  const margin = { top: 80, right: 20, bottom: 90, left: 80 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "heatmap-svg");

  lastGridData = calculateGridData();
  const gridData = lastGridData;

  const xScale = d3.scaleBand()
    .domain(d3.range(1, 6))
    .range([margin.left, width - margin.right])
    .padding(0.15);

  const yScale = d3.scaleBand()
    .domain(d3.range(1, 6))
    .range([height - margin.bottom, margin.top])
    .padding(0.15);

  const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([1, 0]);

  // Cellules avec animation
  const cells = svg.selectAll(".heatmap-cell")
    .data(gridData)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => xScale(d.x))
    .attr("y", height - margin.bottom) // Commence en bas pour animation
    .attr("width", xScale.bandwidth())
    .attr("height", 0) // Commence avec hauteur 0
    .attr("fill", d => colorScale(d.risk))
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .style("cursor", "pointer")
    .style("opacity", 0)
    .on("mouseover", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", 3)
          .attr("stroke", "#1e293b");
      }
      showCellTooltip(event, d);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke-width", currentHeatmapCell && 
            currentHeatmapCell.x === d.x && currentHeatmapCell.y === d.y ? 3 : 1)
          .attr("stroke", currentHeatmapCell && 
            currentHeatmapCell.x === d.x && currentHeatmapCell.y === d.y ? "#1e293b" : "white");
      }
      if (!currentHeatmapCell || 
          currentHeatmapCell.x !== d.x || 
          currentHeatmapCell.y !== d.y) {
        hideTooltip();
      }
    })
    .on("click", function(event, d) {
      const clickedCell = d;
      
      // Animation de sélection
      svg.selectAll(".heatmap-cell")
        .transition()
        .duration(300)
        .attr("stroke-width", 1)
        .attr("stroke", "white");
      
      d3.select(this)
        .transition()
        .duration(300)
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 3);
      
      currentHeatmapCell = clickedCell;
      updateFilteredData();
      
      // Mettre à jour le simulateur
      d3.select("#sim-x").property("value", clickedCell.x);
      d3.select("#sim-y").property("value", clickedCell.y);
      updateSimulator();
      
      showCellTooltip(event, {
        ...clickedCell,
        filtered: true
      });
    });

  // Animation des cellules
  if (animationEnabled) {
    cells.transition()
      .delay((d, i) => (d.x + d.y) * 30)
      .duration(600)
      .attr("y", d => yScale(d.y))
      .attr("height", yScale.bandwidth())
      .style("opacity", 1)
      .ease(d3.easeElasticOut);
  } else {
    cells.attr("y", d => yScale(d.y))
      .attr("height", yScale.bandwidth())
      .style("opacity", 1);
  }

  // Mettre en évidence la cellule déjà sélectionnée
  if (currentHeatmapCell) {
    const selectedCell = cells.filter(d => 
      d.x === currentHeatmapCell.x && d.y === currentHeatmapCell.y
    );
    if (!selectedCell.empty()) {
      selectedCell
        .attr("stroke", "#1e293b")
        .attr("stroke-width", 3);
    }
  }

  // Texte dans les cellules
  svg.selectAll(".cell-text")
    .data(gridData)
    .enter()
    .append("text")
    .attr("class", "cell-text")
    .attr("x", d => xScale(d.x) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.y) + yScale.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "11px")
    .style("font-weight", "600")
    .style("fill", d => (d.risk > 0.5 ? "white" : "#334155"))
    .style("opacity", 0)
    .text(d => (d.count > 0 ? `${Math.round(d.risk * 100)}%` : ""));

  if (animationEnabled) {
    svg.selectAll(".cell-text")
      .transition()
      .delay((d, i) => (d.x + d.y) * 30 + 400)
      .duration(400)
      .style("opacity", 1);
  } else {
    svg.selectAll(".cell-text").style("opacity", 1);
  }

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale))
    .attr("class", "heatmap-axis");

  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale))
    .attr("class", "heatmap-axis");

  // Titres
  const fx = getFactorMetaByKey(currentState.factorX);
  const fy = getFactorMetaByKey(currentState.factorY);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "700")
    .style("fill", "#1e293b")
    .text(`Interaction: ${fx?.label || currentState.factorX} × ${fy?.label || currentState.factorY}`);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 55)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", currentHeatmapCell ? "600" : "500")
    .style("fill", currentHeatmapCell ? "#dc2626" : "#64748b")
    .text(currentHeatmapCell ? 
      `Filtre actif: ${fx?.label || currentState.factorX}=${currentHeatmapCell.x}, ${fy?.label || currentState.factorY}=${currentHeatmapCell.y}` : 
      "Cliquez sur une cellule pour filtrer les graphiques ci-dessous"
    );

  // Légende
  drawLegend(svg, colorScale, width, height, margin);
  updateStatistics(gridData);
}

function drawLegend(svg, colorScale, width, height, margin) {
  const legendWidth = 300;
  const legendHeight = 20;
  const legendX = (width - legendWidth) / 2;
  const legendY = height - 50;

  const legendGroup = svg.append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  const defs = svg.append("defs");
  const gradientId = "heatmap-gradient-" + Date.now();
  
  const gradient = defs.append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  [0, 0.25, 0.5, 0.75, 1].forEach(offset => {
    gradient.append("stop")
      .attr("offset", `${offset * 100}%`)
      .attr("stop-color", colorScale(1 - offset));
  });

  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", `url(#${gradientId})`)
    .style("rx", 4)
    .style("stroke", "#cbd5e1")
    .style("stroke-width", 1);

  legendGroup.append("text")
    .attr("x", 0)
    .attr("y", -5)
    .style("font-size", "11px")
    .style("fill", "#64748b")
    .style("font-weight", "500")
    .text("Faible risque");

  legendGroup.append("text")
    .attr("x", legendWidth)
    .attr("y", -5)
    .attr("text-anchor", "end")
    .style("font-size", "11px")
    .style("fill", "#64748b")
    .style("font-weight", "500")
    .text("Haut risque");

  [0, 0.25, 0.5, 0.75, 1].forEach(offset => {
    const xPos = offset * legendWidth;
    
    legendGroup.append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", legendHeight)
      .attr("y2", legendHeight + 5)
      .style("stroke", "#94a3b8")
      .style("stroke-width", 1);
    
    legendGroup.append("text")
      .attr("x", xPos)
      .attr("y", legendHeight + 18)
      .attr("text-anchor", offset === 1 ? "end" : offset === 0 ? "start" : "middle")
      .style("font-size", "10px")
      .style("fill", "#64748b")
      .text(`${Math.round((1 - offset) * 100)}%`);
  });
}

function updateStatistics(gridData) {
  const filled = gridData.filter(d => d.count > 0);
  if (!filled.length) {
    d3.select("#max-risk").text("—");
    d3.select("#interaction-strength").text("—");
    return;
  }

  const maxRisk = d3.max(filled, d => d.risk);
  const highRiskCells = filled.filter(d => d.risk > currentState.threshold).length;
  const totalCells = filled.length;

  d3.select("#max-risk").text(`${Math.round(maxRisk * 100)}%`);

  let strength = "Faible";
  if (highRiskCells > totalCells * 0.3) strength = "Forte";
  else if (highRiskCells > totalCells * 0.1) strength = "Modérée";
  d3.select("#interaction-strength").text(strength);
}

// -------------------------
// SIMULATEUR AVEC ANIMATIONS SIMPLES
// -------------------------
function calculateRisk(x, y) {
  const gridData = lastGridData || calculateGridData();
  const cell = gridData.find(d => d.x === x && d.y === y);
  if (cell && cell.count > 0) return cell.risk;

  const fx = currentState.factorX;
  const fy = currentState.factorY;

  const similar = studentData.filter(d =>
    Math.abs(getHeatmapValue(d, fx) - x) <= 1 &&
    Math.abs(getHeatmapValue(d, fy) - y) <= 1
  );

  if (similar.length) {
    return similar.filter(d => d.depression === 1).length / similar.length;
  }
  return Math.min(0.8, (x + y) / 10);
}

function updateSimulator() {
  const xVal = +d3.select("#sim-x").property("value");
  const yVal = +d3.select("#sim-y").property("value");

  d3.select("#sim-x-value").text(xVal);
  d3.select("#sim-y-value").text(yVal);

  const risk = calculateRisk(xVal, yVal);
  const riskPercent = Math.round(risk * 100);

  d3.select("#risk-value").text(`Risque estimé: ${riskPercent}%`);

  let level = "Faible";
  let color = "#10b981";
  let bgColor = "#f0fdf4";

  if (riskPercent > 70) { level = "Très Élevé"; color = "#dc2626"; bgColor = "#fef2f2"; }
  else if (riskPercent > 50) { level = "Élevé"; color = "#ef4444"; bgColor = "#fef2f2"; }
  else if (riskPercent > 30) { level = "Modéré"; color = "#f59e0b"; bgColor = "#fef3c7"; }

  d3.select("#risk-label")
    .text(level)
    .style("background", bgColor)
    .style("color", color)
    .style("padding", "6px 16px")
    .style("border-radius", "20px")
    .style("display", "inline-block");

  const fx = getFactorMetaByKey(currentState.factorX)?.label || currentState.factorX;
  const fy = getFactorMetaByKey(currentState.factorY)?.label || currentState.factorY;

  let insight = "";
  if (riskPercent > 70) insight = `Combinaison critique: ${fx} (${xVal}) + ${fy} (${yVal}).`;
  else if (riskPercent > 50) insight = `Risque élevé: agir sur ${xVal < 3 ? fx : fy}.`;
  else if (riskPercent > 30) insight = `Risque modéré: surveiller l'équilibre ${fx}/${fy}.`;
  else insight = `Risque faible: combinaison plutôt favorable.`;

  d3.select("#simulator-insight-text").text(insight);
}

// -------------------------
// INSIGHTS (inchangé)
// -------------------------
function updateInsights() {
  const gridData = lastGridData || calculateGridData();

  const dangerous = gridData
    .filter(d => d.count > 5 && d.risk > 0.7)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 3);

  const safe = gridData
    .filter(d => d.count > 5 && d.risk < 0.2)
    .sort((a, b) => a.risk - b.risk)
    .slice(0, 3);

  const thresholds = findThresholds(gridData);

  updateInsightText("danger-combinations", dangerous, "dangereuses", "⚠️");
  updateInsightText("safe-combinations", safe, "sûres", "✅");
  updateThresholdsText(thresholds);
}

function findThresholds(gridData) {
  const thresholds = [];

  for (let x = 2; x <= 4; x++) {
    for (let y = 2; y <= 4; y++) {
      const cell = gridData.find(d => d.x === x && d.y === y);
      const neighbors = gridData.filter(d =>
        Math.abs(d.x - x) <= 1 &&
        Math.abs(d.y - y) <= 1 &&
        !(d.x === x && d.y === y)
      );

      if (cell && neighbors.length) {
        const avg = d3.mean(neighbors.map(n => n.risk));
        if (Math.abs(cell.risk - avg) > 0.3) {
          thresholds.push({ x, y, risk: cell.risk, diff: Math.abs(cell.risk - avg) });
        }
      }
    }
  }
  return thresholds.sort((a, b) => b.diff - a.diff).slice(0, 3);
}

function updateInsightText(elementId, combos, label, icon) {
  const el = d3.select(`#${elementId}`);
  if (!combos.length) {
    el.text(`Aucune combinaison ${label} identifiée`);
    return;
  }

  const fx = getFactorMetaByKey(currentState.factorX)?.label || currentState.factorX;
  const fy = getFactorMetaByKey(currentState.factorY)?.label || currentState.factorY;

  el.html(combos.map(c =>
    `${icon} ${fx}=${c.x}, ${fy}=${c.y} (${Math.round(c.risk * 100)}%, n=${c.count})`
  ).join("<br>"));
}

function updateThresholdsText(thresholds) {
  const el = d3.select("#thresholds-text");
  if (!thresholds.length) {
    el.text("Pas de seuil critique évident");
    return;
  }

  const fx = getFactorMetaByKey(currentState.factorX)?.label || currentState.factorX;
  const fy = getFactorMetaByKey(currentState.factorY)?.label || currentState.factorY;

  el.html(thresholds.map(t => 
    `⚡ Seuil critique à ${fx}=${t.x}, ${fy}=${t.y} (${Math.round(t.risk * 100)}%)`
  ).join("<br>"));
}

// -------------------------
// BAR CHART AVEC ANIMATIONS
// -------------------------
function renderBarChart() {
  const container = d3.select("#bar-container");
  container.html("");

  const groupKey = d3.select("#group-by").property("value");
  if (!groupKey) {
    container.html("<div class='loading'>Sélectionnez une variable catégorielle</div>");
    return;
  }

  const width = container.node().clientWidth || 600;
  const height = 380;
  const margin = { top: 70, right: 20, bottom: 100, left: 70 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "bar-chart-svg");

  // Utiliser filteredData
  const groups = d3.group(filteredData, d => d[groupKey] ?? "Non spécifié");
  let arr = Array.from(groups, ([category, rows]) => {
    const total = rows.length;
    const depressed = rows.filter(r => r.depression === 1).length;
    return {
      category,
      total,
      depressed,
      rate: total > 0 ? depressed / total : 0,
      label: `${category} (n=${total})`
    };
  });

  arr = arr.filter(d => d.total > 0);
  arr.sort((a, b) => b.rate - a.rate);
  arr = arr.slice(0, 10);

  if (arr.length === 0) {
    container.html("<div class='loading'>Pas de données pour cette catégorie</div>");
    return;
  }

  // Scales
  const x = d3.scaleBand()
    .domain(arr.map(d => d.category))
    .range([margin.left, width - margin.right])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, Math.max(0.5, d3.max(arr, d => d.rate) || 0.5)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-35)")
    .style("font-size", "11px");

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")))
    .style("font-size", "11px");

  // Barres avec animation
  const bars = svg.selectAll("rect.bar")
    .data(arr)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.category))
    .attr("width", x.bandwidth())
    .attr("y", height - margin.bottom)
    .attr("height", 0)
    .attr("fill", currentHeatmapCell ? "#dc2626" : "#6366f1")
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", currentHeatmapCell ? "#ef4444" : "#818cf8");
      }
      showBarTooltip(event, d);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill", currentHeatmapCell ? "#dc2626" : "#6366f1");
      }
      hideTooltip();
    });

  // Animation des barres
  if (animationEnabled) {
    bars.transition()
      .delay((d, i) => i * 80)
      .duration(800)
      .attr("y", d => y(d.rate))
      .attr("height", d => (height - margin.bottom) - y(d.rate))
      .ease(d3.easeElasticOut);
  } else {
    bars.attr("y", d => y(d.rate))
      .attr("height", d => (height - margin.bottom) - y(d.rate));
  }

  // Labels des barres
  svg.selectAll("text.bar-label")
    .data(arr)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.category) + x.bandwidth() / 2)
    .attr("y", d => y(d.rate) - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "600")
    .style("fill", "#334155")
    .text(d => `${Math.round(d.rate * 100)}%`);

  // Titre
  const meta = getFactorMetaByKey(groupKey);
  let titleText = `Taux de dépression par ${meta?.label || groupKey}`;
  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", currentHeatmapCell ? "15px" : "16px")
    .style("font-weight", "700")
    .style("fill", currentHeatmapCell ? "#dc2626" : "#1e293b")
    .text(titleText);

  // Sous-titre
  const totalFiltered = filteredData.length;
  const totalAll = studentData.length;
  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", currentHeatmapCell ? "600" : "500")
    .style("fill", currentHeatmapCell ? "#dc2626" : "#64748b")
    .text(currentHeatmapCell ? 
      `${totalFiltered} étudiants (${Math.round(totalFiltered/totalAll*100)}% du total)` :
      `${totalAll} étudiants (100% du total)`
    );
}

// -------------------------
// HISTOGRAMME AVEC ANIMATIONS
// -------------------------
function renderHistogram() {
  const container = d3.select("#hist-container");
  container.html("");

  const varKey = d3.select("#numeric-var").property("value");
  if (!varKey) {
    container.html("<div class='loading'>Sélectionnez une variable numérique</div>");
    return;
  }

  const width = container.node().clientWidth || 600;
  const height = 380;
  const margin = { top: 70, right: 20, bottom: 90, left: 70 };

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "histogram-svg");

  // Utiliser filteredData
  const values0 = filteredData.filter(d => d.depression === 0).map(d => d[varKey]).filter(v => Number.isFinite(v));
  const values1 = filteredData.filter(d => d.depression === 1).map(d => d[varKey]).filter(v => Number.isFinite(v));
  const allValues = values0.concat(values1);

  if (allValues.length === 0) {
    container.html("<div class='loading'>Pas de données numériques pour cette variable</div>");
    return;
  }

  // Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(allValues))
    .nice()
    .range([margin.left, width - margin.right]);

  // Create bins
  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(15);

  const b0 = bins(values0);
  const b1 = bins(values1);

  const maxCount = Math.max(
    d3.max(b0, d => d.length) || 0,
    d3.max(b1, d => d.length) || 0
  );

  const y = d3.scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .style("font-size", "11px");

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .style("font-size", "11px");

  // Barres avec animation (sans dépression)
  const bars0 = svg.selectAll("rect.h0")
    .data(b0)
    .enter()
    .append("rect")
    .attr("class", "h0")
    .attr("x", d => x(d.x0) + 1)
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("y", height - margin.bottom)
    .attr("height", 0)
    .attr("fill", currentHeatmapCell ? "#f87171" : "#60a5fa")
    .attr("opacity", 0.7)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.9);
      }
      showHistTooltip(event, d, 0);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.7);
      }
      hideTooltip();
    });

  // Barres avec animation (avec dépression)
  const bars1 = svg.selectAll("rect.h1")
    .data(b1)
    .enter()
    .append("rect")
    .attr("class", "h1")
    .attr("x", d => x(d.x0) + 1)
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("y", height - margin.bottom)
    .attr("height", 0)
    .attr("fill", currentHeatmapCell ? "#dc2626" : "#ef4444")
    .attr("opacity", 0.6)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.9);
      }
      showHistTooltip(event, d, 1);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function() {
      if (animationEnabled) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.6);
      }
      hideTooltip();
    });

  // Animation des hauteurs
  if (animationEnabled) {
    bars0.transition()
      .delay((d, i) => i * 40)
      .duration(600)
      .attr("y", d => y(d.length))
      .attr("height", d => (height - margin.bottom) - y(d.length))
      .ease(d3.easeCubicOut);

    bars1.transition()
      .delay((d, i) => i * 40 + 200)
      .duration(600)
      .attr("y", d => y(d.length))
      .attr("height", d => (height - margin.bottom) - y(d.length))
      .ease(d3.easeCubicOut);
  } else {
    bars0.attr("y", d => y(d.length))
      .attr("height", d => (height - margin.bottom) - y(d.length));
    bars1.attr("y", d => y(d.length))
      .attr("height", d => (height - margin.bottom) - y(d.length));
  }

  // Titre
  const meta = getFactorMetaByKey(varKey);
  let titleText = `Distribution de ${meta?.label || varKey} par statut de dépression`;
  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", currentHeatmapCell ? "15px" : "16px")
    .style("font-weight", "700")
    .style("fill", currentHeatmapCell ? "#dc2626" : "#1e293b")
    .text(titleText);
}

// -------------------------
// RÉINITIALISATION
// -------------------------
function resetState() {
  currentState = { factorX: "sleep_duration", factorY: "financial_stress", threshold: 0.5 };
  currentHeatmapCell = null;

  d3.select("#factor-x").property("value", currentState.factorX);
  d3.select("#factor-y").property("value", currentState.factorY);
  d3.select("#risk-threshold").property("value", 50);
  d3.select("#threshold-value").text("50%");
  d3.select("#sim-x").property("value", 3);
  d3.select("#sim-y").property("value", 3);

  updateFactorLabels();
  renderHeatmap();
  updateSimulator();
  updateInsights();
  renderBarChart();
  renderHistogram();
}

// -------------------------
// TOOLTIP (inchangé)
// -------------------------
function ensureTooltip() {
  let t = d3.select("body").select(".tooltip");
  if (t.empty()) {
    t = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("z-index", "1000")
      .style("display", "none")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #e2e8f0")
      .style("border-radius", "8px")
      .style("padding", "12px")
      .style("box-shadow", "0 4px 20px rgba(0,0,0,0.15)")
      .style("backdrop-filter", "blur(4px)")
      .style("font-family", "Inter, sans-serif");
  }
  return t;
}

function showCellTooltip(event, d) {
  const t = ensureTooltip();
  const fx = getFactorMetaByKey(d.factorX)?.label || d.factorX;
  const fy = getFactorMetaByKey(d.factorY)?.label || d.factorY;
  const riskPercent = Math.round(d.risk * 100);
  
  const isSelected = currentHeatmapCell && 
                     currentHeatmapCell.x === d.x && 
                     currentHeatmapCell.y === d.y;

  let filterInfo = "";
  if (isSelected) {
    filterInfo = `<p style="margin:4px 0;font-size:12px;color:#dc2626;font-weight:600">
      ✓ Filtre actif - Les graphiques ci-dessous montrent ces ${d.count} étudiants
    </p>`;
  } else if (d.filtered) {
    filterInfo = `<p style="margin:4px 0;font-size:12px;color:#3b82f6;font-weight:600">
      ✓ Filtre appliqué - ${d.count} étudiants sélectionnés
    </p>`;
  }

  t.html(`
    <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">${fx} = ${d.x}, ${fy} = ${d.y}</h4>
    <p style="margin:4px 0;font-size:12px;color:#64748b">${d.count} étudiant${d.count !== 1 ? "s" : ""}</p>
    ${filterInfo}
    <div style="font-weight:700;font-size:16px;color:${d.risk > 0.5 ? '#dc2626' : '#10b981'}">${riskPercent}% de risque</div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8">
      ${isSelected ? 'Cliquez ailleurs pour annuler le filtre' : 'Cliquez pour filtrer les graphiques'}
    </p>
  `);

  t.style("display", "block");
  moveTooltip(event);
}

function showBarTooltip(event, d) {
  const t = ensureTooltip();
  const filterInfo = currentHeatmapCell ? 
    `<p style="margin:4px 0;font-size:11px;color:#dc2626;font-weight:600">
      🔴 Données filtrées par la heatmap
    </p>` : "";
  
  t.html(`
    <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">${d.category}</h4>
    ${filterInfo}
    <p style="margin:4px 0;font-size:12px;color:#64748b">Total: ${d.total} étudiants</p>
    <div style="font-weight:700;font-size:16px;color:#6366f1">${Math.round(d.rate * 100)}% de dépression</div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8">${d.depressed} cas sur ${d.total}</p>
  `);
  t.style("display", "block");
  moveTooltip(event);
}

function showHistTooltip(event, d, depressionStatus) {
  const t = ensureTooltip();
  const status = depressionStatus === 1 ? "Avec dépression" : "Sans dépression";
  const color = depressionStatus === 1 ? 
    (currentHeatmapCell ? "#dc2626" : "#ef4444") : 
    (currentHeatmapCell ? "#f87171" : "#60a5fa");
  
  const filterInfo = currentHeatmapCell ? 
    `<p style="margin:4px 0;font-size:11px;color:#dc2626;font-weight:600">
      🔴 Données filtrées par la heatmap
    </p>` : "";
  
  t.html(`
    <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">${status}</h4>
    ${filterInfo}
    <p style="margin:4px 0;font-size:12px;color:#64748b">Intervalle: ${d.x0.toFixed(1)} à ${d.x1.toFixed(1)}</p>
    <div style="font-weight:700;font-size:16px;color:${color}">${d.length} étudiant${d.length !== 1 ? 's' : ''}</div>
    <p style="margin:8px 0 0 0;font-size:11px;color:#94a3b8">Fréquence de distribution</p>
  `);
  t.style("display", "block");
  moveTooltip(event);
}

function moveTooltip(event) {
  const t = ensureTooltip();
  t.style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 15) + "px");
}

function hideTooltip() {
  ensureTooltip().style("display", "none");
}

// -------------------------
// DÉMARRAGE
// -------------------------
document.addEventListener("DOMContentLoaded", initInteractions);

// Debug utilities
window.interactions = {
  get studentData() { return studentData; },
  get filteredData() { return filteredData; },
  get currentState() { return currentState; },
  get currentHeatmapCell() { return currentHeatmapCell; },
  get animationEnabled() { return animationEnabled; },
  set animationEnabled(value) { animationEnabled = value; },
  renderHeatmap,
  renderBarChart,
  renderHistogram,
  resetState
};