/*
  loadAndRenderChart
  This function loads a CSV file using D3, binds the data to SVG rectangles,
  and renders a simple bar chart to verify that CSV fetching and DOM updates
  work correctly on GitHub Pages.
*/
function loadAndRenderChart() {
  const svg = d3.select("svg");
  const width = 500;
  const height = 300;
  const margin = 40;

  d3.csv("./data/test.csv", d3.autoType).then(data => {

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([margin, width - margin])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height - margin, margin]);

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d.name))
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - margin - yScale(d.value));

  }).catch(err => {
    console.error("CSV loading failed:", err);
  });
}

loadAndRenderChart();
