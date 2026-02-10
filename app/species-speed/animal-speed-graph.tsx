/**
 * File overview:
 * This client component loads three CSV datasets and draws three D3 charts:
 * 1) Speed vs Diet
 * 2) Speed vs Weight
 * 3) Speed vs Endangerment
 *
 * Rendering model:
 * - React owns container elements.
 * - D3 owns SVG content inside those containers.
 * - Each render function clears and redraws its chart from scratch.
 */

/* eslint-disable */
"use client";
import { max } from "d3-array";
import { axisBottom, axisLeft } from "d3-axis";
import { csv } from "d3-fetch";
import { scaleBand, scaleLinear, scaleLog, scaleOrdinal } from "d3-scale";
import { select, type Selection } from "d3-selection";
import { useEffect, useMemo, useRef, useState } from "react";

// Allowed diet values for validation + chart ordering.
type Diet = "herbivore" | "omnivore" | "carnivore";

// Row shape for the "speed vs diet" dataset.
interface AnimalDatum {
  // Display name of the animal.
  name: string;
  // Top speed in km/h.
  speed: number;
  // One of the three normalized diet categories.
  diet: Diet;
}

// Row shape for the "speed vs weight" dataset.
interface WeightDatum {
  // Display name of the animal.
  name: string;
  // Top speed in km/h.
  speed: number;
  // Body mass in kilograms.
  bodyMass: number;
}

// Canonical order for conservation statuses on the x-axis.
const ENDANGERMENT_ORDER = [
  "Not Evaluated",
  "Data Deficient",
  "Least Concern",
  "Near Threatened",
  "Vulnerable",
  "Endangered",
  "Critically Endangered",
  "Extinct in the Wild",
  "Extinct",
] as const;

// Restrict status values to the canonical list above.
type EndangermentStatus = (typeof ENDANGERMENT_ORDER)[number];

// Row shape for the "speed vs endangerment" dataset.
interface EndangermentDatum {
  // Display name of the animal.
  name: string;
  // Top speed in km/h.
  speed: number;
  // Conservation status for chart grouping.
  endangerment: EndangermentStatus;
}

// Fixed domain and palette for diet chart consistency.
const DIET_ORDER: Diet[] = ["herbivore", "omnivore", "carnivore"];
const DIET_COLOR_RANGE = ["#16a34a", "#2563eb", "#ef4444"];

// Ordered palette from lower concern tones to higher concern tones.
const ENDANGERMENT_COLOR_RANGE = [
  "#94a3b8",
  "#60a5fa",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#be123c",
  "#7f1d1d",
];

// Runtime type guard used while parsing raw CSV strings.
function isDiet(value: string): value is Diet {
  return DIET_ORDER.includes(value as Diet);
}

// Runtime type guard used while parsing endangerment CSV rows.
function isEndangermentStatus(value: string): value is EndangermentStatus {
  return ENDANGERMENT_ORDER.includes(value as EndangermentStatus);
}

// Apply shared axis styling so all charts match theme colors.
function styleAxis(axisGroup: Selection<SVGGElement, unknown, null, undefined>) {
  axisGroup.selectAll("path").attr("stroke", "currentColor");
  axisGroup.selectAll("line").attr("stroke", "currentColor");
  axisGroup.selectAll("text").attr("fill", "currentColor").attr("font-size", 11);
}

// Use container width when possible, but enforce a minimum readable width.
function getChartWidth(container: HTMLDivElement, minWidth: number) {
  return Math.max(container.clientWidth, minWidth);
}

// Produce deterministic horizontal jitter so point clouds don't overlap perfectly.
// Deterministic means points stay in the same "random-looking" positions each render.
function deterministicJitter(index: number, spread: number) {
  const seed = Math.sin((index + 1) * 12.9898) * 43758.5453;
  const fractional = seed - Math.floor(seed);
  return (fractional - 0.5) * spread;
}

function calculateMeanSpeed(rows: { speed: number }[]) {
  return rows.reduce((sum, row) => sum + row.speed, 0) / rows.length;
}

function pearsonCorrelation(xValues: number[], yValues: number[]) {
  if (xValues.length !== yValues.length || xValues.length < 2) return null;

  const sampleSize = xValues.length;
  const xMean = xValues.reduce((sum, value) => sum + value, 0) / sampleSize;
  const yMean = yValues.reduce((sum, value) => sum + value, 0) / sampleSize;

  let covariance = 0;
  let xVariance = 0;
  let yVariance = 0;

  for (let index = 0; index < sampleSize; index += 1) {
    const centeredX = xValues[index]! - xMean;
    const centeredY = yValues[index]! - yMean;
    covariance += centeredX * centeredY;
    xVariance += centeredX ** 2;
    yVariance += centeredY ** 2;
  }

  if (!xVariance || !yVariance) return null;
  return covariance / Math.sqrt(xVariance * yVariance);
}

/**
 * Render chart 1: Speed vs Diet.
 * Visual encoding:
 * - Bar height = average speed per diet
 * - Faint circles = individual animal speeds
 */
function renderSpeedVsDiet(container: HTMLDivElement, data: AnimalDatum[]) {
  // D3 mutates DOM directly; clear previous SVG before drawing a fresh frame.
  container.innerHTML = "";

  // Fallback message for empty/invalid datasets.
  if (!data.length) {
    container.textContent = "No valid speed vs diet data available.";
    return;
  }

  // Chart dimensions and padded plotting region.
  const width = getChartWidth(container, 760);
  const height = 420;
  const margin = { top: 60, right: 180, bottom: 80, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Root SVG sized responsively with a stable internal viewBox.
  const svg = select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("color", "hsl(var(--foreground))");

  // Plot group translated into the padded inner drawing area.
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Color mapping for all diet-based marks.
  const color = scaleOrdinal<Diet, string>().domain(DIET_ORDER).range(DIET_COLOR_RANGE);

  // Aggregate per-diet mean speeds and sample counts for labels.
  const summaries = DIET_ORDER.map((diet) => {
    const rows = data.filter((datum) => datum.diet === diet);
    const totalSpeed = rows.reduce((acc, datum) => acc + datum.speed, 0);

    return {
      diet,
      averageSpeed: rows.length ? totalSpeed / rows.length : 0,
      count: rows.length,
    };
  });

  // Scales:
  // - x: categorical diets
  // - y: speed with headroom for labels
  const yMax = Math.max((max(data, (datum) => datum.speed) ?? 0) * 1.1, 1);
  const x = scaleBand<Diet>().domain(DIET_ORDER).range([0, innerWidth]).padding(0.25);
  const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

  // Draw average-speed bars.
  chart
    .selectAll("rect.mean-speed")
    .data(summaries)
    .join("rect")
    .attr("class", "mean-speed")
    .attr("x", (datum) => x(datum.diet) ?? 0)
    .attr("y", (datum) => y(datum.averageSpeed))
    .attr("width", x.bandwidth())
    .attr("height", (datum) => innerHeight - y(datum.averageSpeed))
    .attr("fill", (datum) => color(datum.diet))
    .attr("fill-opacity", 0.55)
    .attr("rx", 6);

  // Draw individual observations as semi-transparent points over bars.
  chart
    .selectAll("circle.samples")
    .data(data)
    .join("circle")
    .attr("class", "samples")
    .attr("cx", (datum, index) => {
      const xStart = x(datum.diet);
      const center = (xStart ?? 0) + x.bandwidth() / 2;
      return center + deterministicJitter(index, x.bandwidth() * 0.62);
    })
    .attr("cy", (datum) => y(datum.speed))
    .attr("r", 2.75)
    .attr("fill", (datum) => color(datum.diet))
    .attr("fill-opacity", 0.35);

  // Numeric average labels above each bar.
  chart
    .selectAll("text.mean-label")
    .data(summaries)
    .join("text")
    .attr("class", "mean-label")
    .attr("x", (datum) => (x(datum.diet) ?? 0) + x.bandwidth() / 2)
    .attr("y", (datum) => y(datum.averageSpeed) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 11)
    .text((datum) => `${datum.averageSpeed.toFixed(1)} km/h`);

  // Axes.
  const xAxis = chart.append("g").attr("transform", `translate(0,${innerHeight})`).call(axisBottom(x));
  styleAxis(xAxis);

  const yAxis = chart.append("g").call(axisLeft(y).ticks(7));
  styleAxis(yAxis);

  // Axis labels.
  svg
    .append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 16)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Diet");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 18)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Speed (km/h)");

  // Chart title.
  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 28)
    .attr("fill", "currentColor")
    .attr("font-size", 16)
    .attr("font-weight", 700)
    .text("Speed vs Diet");

  // Legend rendered outside plotting area on the right.
  const legend = svg.append("g").attr("transform", `translate(${margin.left + innerWidth + 12}, ${margin.top - 6})`);

  DIET_ORDER.forEach((diet, index) => {
    const row = legend.append("g").attr("transform", `translate(0, ${index * 24})`);
    row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", color(diet));
    row
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "currentColor")
      .attr("font-size", 11)
      .text(diet[0]!.toUpperCase() + diet.slice(1));
  });

  // Sample-size labels under each category.
  chart
    .selectAll("text.sample-count")
    .data(summaries)
    .join("text")
    .attr("class", "sample-count")
    .attr("x", (datum) => (x(datum.diet) ?? 0) + x.bandwidth() / 2)
    .attr("y", innerHeight + 34)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 10)
    .text((datum) => `n=${datum.count}`);
}

/**
 * Render chart 2: Speed vs Weight.
 * Visual encoding:
 * - Point position (x) = body mass on a log scale
 * - Point position (y) = speed
 */
function renderSpeedVsWeight(container: HTMLDivElement, data: WeightDatum[]) {
  // Clear stale chart.
  container.innerHTML = "";

  // Fallback message when dataset is empty.
  if (!data.length) {
    container.textContent = "No valid speed vs weight data available.";
    return;
  }

  // Dimensions and margins.
  const width = getChartWidth(container, 760);
  const height = 430;
  const margin = { top: 58, right: 34, bottom: 82, left: 76 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Compute a safe log-domain:
  // - lower bound must be > 0 for log scales
  // - upper bound must exceed lower bound
  const minMass = Math.max(Math.min(...data.map((datum) => datum.bodyMass)), 0.1);
  const maxMass = Math.max(...data.map((datum) => datum.bodyMass));
  const safeMaxMass = maxMass > minMass ? maxMass : minMass * 10;

  // Build scales.
  const x = scaleLog().domain([minMass, safeMaxMass]).nice().range([0, innerWidth]);
  const yMax = Math.max((max(data, (datum) => datum.speed) ?? 0) * 1.1, 1);
  const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

  // Root SVG.
  const svg = select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("color", "hsl(var(--foreground))");

  // Translated plot region.
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Horizontal reference gridlines for easier y-value reading.
  chart
    .append("g")
    .selectAll("line.grid")
    .data(y.ticks(6))
    .join("line")
    .attr("class", "grid")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", (tickValue) => y(tickValue))
    .attr("y2", (tickValue) => y(tickValue))
    .attr("stroke", "currentColor")
    .attr("opacity", 0.15);

  // Draw scatter points with title tooltips.
  chart
    .selectAll("circle.point")
    .data(data)
    .join("circle")
    .attr("class", "point")
    .attr("cx", (datum) => x(datum.bodyMass))
    .attr("cy", (datum) => y(datum.speed))
    .attr("r", 3.5)
    .attr("fill", "#0ea5e9")
    .attr("fill-opacity", 0.6)
    .append("title")
    .text((datum) => `${datum.name}: ${datum.speed.toFixed(1)} km/h, ${datum.bodyMass.toFixed(1)} kg`);

  // Axes.
  const xAxis = chart.append("g").attr("transform", `translate(0,${innerHeight})`).call(axisBottom(x).ticks(8, "~s"));
  styleAxis(xAxis);

  const yAxis = chart.append("g").call(axisLeft(y).ticks(7));
  styleAxis(yAxis);

  // Axis labels and chart title.
  svg
    .append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 20)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Body Mass (kg, log scale)");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 18)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Speed (km/h)");

  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 30)
    .attr("fill", "currentColor")
    .attr("font-size", 16)
    .attr("font-weight", 700)
    .text("Speed vs Weight");
}

/**
 * Render chart 3: Speed vs Endangerment.
 * Visual encoding:
 * - Bar height = average speed within each status
 * - x-axis order follows conservation severity progression
 */
function renderSpeedVsEndangerment(container: HTMLDivElement, data: EndangermentDatum[]) {
  // Clear stale chart.
  container.innerHTML = "";

  // Fallback message when dataset is empty.
  if (!data.length) {
    container.textContent = "No valid speed vs endangerment data available.";
    return;
  }

  // Dimensions and margins with extra bottom space for rotated labels.
  const width = getChartWidth(container, 860);
  const height = 460;
  const margin = { top: 64, right: 36, bottom: 130, left: 76 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Aggregate speed totals and counts by endangerment status.
  const aggregates = new Map<EndangermentStatus, { sum: number; count: number }>();

  data.forEach((datum) => {
    const current = aggregates.get(datum.endangerment);
    if (current) {
      current.sum += datum.speed;
      current.count += 1;
      return;
    }

    aggregates.set(datum.endangerment, { sum: datum.speed, count: 1 });
  });

  // Build ordered chart rows in canonical status order.
  const chartData = ENDANGERMENT_ORDER.filter((status) => aggregates.has(status)).map((status) => {
    const aggregate = aggregates.get(status)!;
    return {
      status,
      averageSpeed: aggregate.sum / aggregate.count,
      count: aggregate.count,
    };
  });

  // Guard against the case where no rows survived validation.
  if (!chartData.length) {
    container.textContent = "No valid speed vs endangerment data available.";
    return;
  }

  // Scales.
  const x = scaleBand<EndangermentStatus>()
    .domain(chartData.map((datum) => datum.status))
    .range([0, innerWidth])
    .padding(0.2);

  const yMax = Math.max((max(chartData, (datum) => datum.averageSpeed) ?? 0) * 1.12, 1);
  const y = scaleLinear().domain([0, yMax]).nice().range([innerHeight, 0]);

  // Status-to-color mapping.
  const color = scaleOrdinal<EndangermentStatus, string>().domain(ENDANGERMENT_ORDER).range(ENDANGERMENT_COLOR_RANGE);

  // Root SVG and translated plotting group.
  const svg = select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("color", "hsl(var(--foreground))");

  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Draw average-speed bars per status.
  chart
    .selectAll("rect.endangerment-bar")
    .data(chartData)
    .join("rect")
    .attr("class", "endangerment-bar")
    .attr("x", (datum) => x(datum.status) ?? 0)
    .attr("y", (datum) => y(datum.averageSpeed))
    .attr("width", x.bandwidth())
    .attr("height", (datum) => innerHeight - y(datum.averageSpeed))
    .attr("rx", 5)
    .attr("fill", (datum) => color(datum.status))
    .attr("fill-opacity", 0.8);

  // Value labels above bars show mean speed and sample count.
  chart
    .selectAll("text.endangerment-value")
    .data(chartData)
    .join("text")
    .attr("class", "endangerment-value")
    .attr("x", (datum) => (x(datum.status) ?? 0) + x.bandwidth() / 2)
    .attr("y", (datum) => y(datum.averageSpeed) - 8)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 10.5)
    .text((datum) => `${datum.averageSpeed.toFixed(1)} (n=${datum.count})`);

  // Axes.
  const xAxis = chart.append("g").attr("transform", `translate(0,${innerHeight})`).call(axisBottom(x));
  styleAxis(xAxis);

  // Rotate long status labels to avoid overlaps.
  xAxis
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-28)")
    .attr("dx", "-0.65em")
    .attr("dy", "0.15em");

  const yAxis = chart.append("g").call(axisLeft(y).ticks(7));
  styleAxis(yAxis);

  // Axis labels + chart title.
  svg
    .append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", height - 18)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Endangerment Status");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + innerHeight / 2))
    .attr("y", 18)
    .attr("fill", "currentColor")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Average Speed (km/h)");

  svg
    .append("text")
    .attr("x", margin.left)
    .attr("y", 30)
    .attr("fill", "currentColor")
    .attr("font-size", 16)
    .attr("font-weight", 700)
    .text("Speed vs Endangerment");
}

export default function AnimalSpeedGraph() {
  // Refs to chart containers that D3 will render into.
  const speedVsDietRef = useRef<HTMLDivElement>(null);
  const speedVsWeightRef = useRef<HTMLDivElement>(null);
  const speedVsEndangermentRef = useRef<HTMLDivElement>(null);

  // Parsed datasets (one state slice per chart).
  const [dietData, setDietData] = useState<AnimalDatum[]>([]);
  const [weightData, setWeightData] = useState<WeightDatum[]>([]);
  const [endangermentData, setEndangermentData] = useState<EndangermentDatum[]>([]);

  // Shared error message displayed when any CSV fails to load.
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const analysisPoints = useMemo(() => {
    const points: string[] = [];

    if (dietData.length) {
      const dietSummaries = DIET_ORDER.map((diet) => {
        const rows = dietData.filter((datum) => datum.diet === diet);
        return {
          diet,
          count: rows.length,
          averageSpeed: rows.length ? calculateMeanSpeed(rows) : 0,
        };
      }).filter((summary) => summary.count > 0);

      if (dietSummaries.length >= 2) {
        const sortedBySpeed = [...dietSummaries].sort((a, b) => b.averageSpeed - a.averageSpeed);
        const fastestDiet = sortedBySpeed[0]!;
        const slowestDiet = sortedBySpeed[sortedBySpeed.length - 1]!;
        const speedGap = fastestDiet.averageSpeed - slowestDiet.averageSpeed;

        points.push(
          `Diet: ${fastestDiet.diet} species average ${fastestDiet.averageSpeed.toFixed(
            1,
          )} km/h (n=${fastestDiet.count}), which is ${speedGap.toFixed(1)} km/h faster than ${slowestDiet.diet} species (${slowestDiet.averageSpeed.toFixed(1)} km/h, n=${slowestDiet.count}).`,
        );
      }
    }

    if (weightData.length >= 2) {
      const fastestSpecies = weightData.reduce((currentBest, datum) =>
        datum.speed > currentBest.speed ? datum : currentBest,
      );
      const lightestSpecies = weightData.reduce((currentLightest, datum) =>
        datum.bodyMass < currentLightest.bodyMass ? datum : currentLightest,
      );
      const heaviestSpecies = weightData.reduce((currentHeaviest, datum) =>
        datum.bodyMass > currentHeaviest.bodyMass ? datum : currentHeaviest,
      );

      const massSpeedCorrelation = pearsonCorrelation(
        weightData.map((datum) => Math.log10(datum.bodyMass)),
        weightData.map((datum) => datum.speed),
      );

      const trendLabel =
        massSpeedCorrelation === null
          ? "no measurable mass-speed trend"
          : massSpeedCorrelation > 0.2
            ? "a weak positive mass-speed trend"
            : massSpeedCorrelation < -0.2
              ? "a weak negative mass-speed trend"
              : "a very weak mass-speed trend";

      const correlationText =
        massSpeedCorrelation === null ? "" : ` (r=${massSpeedCorrelation.toFixed(2)} on log mass)`;

      points.push(
        `Weight: body mass spans from ${lightestSpecies.bodyMass.toFixed(2)} kg (${lightestSpecies.name}) to ${heaviestSpecies.bodyMass.toFixed(
          0,
        )} kg (${heaviestSpecies.name}), with ${trendLabel}${correlationText}; the fastest species in this view is ${fastestSpecies.name} at ${fastestSpecies.speed.toFixed(1)} km/h.`,
      );
    }

    if (endangermentData.length) {
      const statusSummaries = ENDANGERMENT_ORDER.map((status) => {
        const rows = endangermentData.filter((datum) => datum.endangerment === status);
        return {
          status,
          count: rows.length,
          averageSpeed: rows.length ? calculateMeanSpeed(rows) : 0,
        };
      }).filter((summary) => summary.count > 0);

      // Prefer statuses with enough samples so tiny categories do not dominate the headline insight.
      const primarySummaries = statusSummaries.filter((summary) => summary.count >= 5);
      const analysisSummaries = primarySummaries.length >= 2 ? primarySummaries : statusSummaries;

      if (analysisSummaries.length >= 2) {
        const sortedBySpeed = [...analysisSummaries].sort((a, b) => b.averageSpeed - a.averageSpeed);
        const fastestStatus = sortedBySpeed[0]!;
        const slowestStatus = sortedBySpeed[sortedBySpeed.length - 1]!;
        const speedGap = fastestStatus.averageSpeed - slowestStatus.averageSpeed;

        points.push(
          `Endangerment: ${fastestStatus.status} species average ${fastestStatus.averageSpeed.toFixed(
            1,
          )} km/h (n=${fastestStatus.count}), compared with ${slowestStatus.averageSpeed.toFixed(1)} km/h for ${slowestStatus.status} species (n=${slowestStatus.count}), a ${speedGap.toFixed(
            1,
          )} km/h gap.`,
        );
      }
    }

    return points;
  }, [dietData, endangermentData, weightData]);

  // Load and normalize all CSV files exactly once on mount.
  useEffect(() => {
    // Protect state updates if component unmounts before async work finishes.
    let isCancelled = false;

    async function loadAllChartsData() {
      try {
        // Fetch all datasets in parallel, and map each row into strongly typed objects.
        const [dietRows, weightRows, endangermentRows] = await Promise.all([
          csv("/data/speed%20vs%20diet.csv", (row) => {
            // Normalize string fields from CSV.
            const name = row.name?.trim() ?? "";
            const speed = Number(row.speed);
            const rawDiet = row.diet?.trim().toLowerCase() ?? "";

            // Return null to drop invalid rows from D3's parsed output.
            if (!name || !Number.isFinite(speed) || !isDiet(rawDiet)) return null;
            return { name, speed, diet: rawDiet };
          }),
          csv("/data/speed%20vs%20weight.csv", (row) => {
            // Normalize and coerce numeric fields.
            const name = row.name?.trim() ?? "";
            const speed = Number(row.speed);
            const bodyMass = Number(row.body_mass);

            // Log-scale chart requires bodyMass > 0.
            if (!name || !Number.isFinite(speed) || !Number.isFinite(bodyMass) || bodyMass <= 0) return null;
            return { name, speed, bodyMass };
          }),
          csv("/data/speed%20vs%20endangerment.csv", (row) => {
            // Normalize the status text and validate against the canonical list.
            const name = row.name?.trim() ?? "";
            const speed = Number(row.speed);
            const status = row.endangerment?.trim() ?? "";

            if (!name || !Number.isFinite(speed) || !isEndangermentStatus(status)) return null;
            return { name, speed, endangerment: status };
          }),
        ]);

        // Ignore responses if component is already gone.
        if (isCancelled) return;

        // Commit parsed data to state and clear any previous load error.
        setDietData(dietRows);
        setWeightData(weightRows);
        setEndangermentData(endangermentRows);
        setLoadingError(null);
      } catch (error) {
        // Ignore late failures after unmount.
        if (isCancelled) return;

        // Convert unknown error type to a user-facing message.
        const message = error instanceof Error ? error.message : "Unknown CSV loading error.";
        setLoadingError(`Could not load chart data: ${message}`);
      }
    }

    // Start async loading.
    void loadAllChartsData();

    // Cleanup toggle for unmount safety.
    return () => {
      isCancelled = true;
    };
  }, []);

  // Re-render diet chart whenever its data array changes.
  useEffect(() => {
    if (!speedVsDietRef.current) return;
    renderSpeedVsDiet(speedVsDietRef.current, dietData);
  }, [dietData]);

  // Re-render weight chart whenever its data array changes.
  useEffect(() => {
    if (!speedVsWeightRef.current) return;
    renderSpeedVsWeight(speedVsWeightRef.current, weightData);
  }, [weightData]);

  // Re-render endangerment chart whenever its data array changes.
  useEffect(() => {
    if (!speedVsEndangermentRef.current) return;
    renderSpeedVsEndangerment(speedVsEndangermentRef.current, endangermentData);
  }, [endangermentData]);

  return (
    <div className="space-y-8">
      {/* Surface CSV/data loading failures above all chart sections. */}
      {loadingError ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100">{loadingError}</p>
      ) : null}

      {analysisPoints.length ? (
        <section className="rounded-md border border-border/60 bg-muted/30 p-4">
          <h3 className="text-base font-semibold">Analysis</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysisPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Chart section 1: diet comparison. */}
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Diet chart: bars show average speed by diet, while faint dots preserve individual animal speeds.
        </p>
        {/* D3 mounts the diet chart SVG into this container div. */}
        <div ref={speedVsDietRef} className="w-full rounded-md border border-border/60 bg-background p-2" />
      </section>

      {/* Chart section 2: speed vs body mass scatter plot. */}
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Weight chart: scatter plot with log-scaled body mass so tiny and very large species are visible at once.
        </p>
        {/* D3 mounts the weight chart SVG into this container div. */}
        <div ref={speedVsWeightRef} className="w-full rounded-md border border-border/60 bg-background p-2" />
      </section>

      {/* Chart section 3: ordered conservation status bar chart. */}
      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Endangerment chart: ordered bars compare average speed by conservation category and avoid alphabetical bias.
        </p>
        {/* D3 mounts the endangerment chart SVG into this container div. */}
        <div ref={speedVsEndangermentRef} className="w-full rounded-md border border-border/60 bg-background p-2" />
      </section>
    </div>
  );
}
