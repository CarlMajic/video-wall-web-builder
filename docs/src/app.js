const MM_PER_FOOT = 304.8;
const DEFAULT_WIDTH_FT = 20;
const DEFAULT_HEIGHT_FT = 10;

const INFILED_PROFILE = {
  vendor: 'InfiLED',
  model: 'DB2.6 / IL-RSS-IRDB2.6mk2',
  cabinetWidthMm: 500,
  cabinetHeightMm: 500,
  cabinetDepthMm: 75.5,
  pixelPitchMm: 2.6,
  cabinetPixelsWide: 192,
  cabinetPixelsHigh: 192,
  avgWatts: 60,
  maxWatts: 180,
  weightLb: 18.52,
  brightnessNits: 2000,
  refreshHz: 7680,
  sourceNote:
    'Matched from the DB2.6 model number against InfiLED public specs. Confirm the full IL-RSS-IRDB2.6mk2 label before final quoting.',
};

const PROCESSOR_PROFILE = {
  name: 'NovaStar MCTRL600',
  ports: 4,
  pixelsPerPort: 650000,
};

const elements = {
  requestedWidthFt: document.querySelector('#requestedWidthFt'),
  requestedHeightFt: document.querySelector('#requestedHeightFt'),
  pixelPitchMm: document.querySelector('#pixelPitchMm'),
  supportMode: document.querySelector('#supportMode'),
  towerSpacingM: document.querySelector('#towerSpacingM'),
  includeHTubes: document.querySelector('#includeHTubes'),
  addRightEdgeTower: document.querySelector('#addRightEdgeTower'),
  resetButton: document.querySelector('#resetButton'),
  exportButton: document.querySelector('#exportButton'),
  cabinetPixels: document.querySelector('#cabinetPixels'),
  previewNote: document.querySelector('#previewNote'),
  actualWall: document.querySelector('#actualWall'),
  panelCount: document.querySelector('#panelCount'),
  resolution: document.querySelector('#resolution'),
  processors: document.querySelector('#processors'),
  wallGrid: document.querySelector('#wallGrid'),
  requestedSize: document.querySelector('#requestedSize'),
  shortfall: document.querySelector('#shortfall'),
  totalPixels: document.querySelector('#totalPixels'),
  dataPorts: document.querySelector('#dataPorts'),
  cabinetsPerPort: document.querySelector('#cabinetsPerPort'),
  dataHomeRuns: document.querySelector('#dataHomeRuns'),
  dataJumpers: document.querySelector('#dataJumpers'),
  avgWatts: document.querySelector('#avgWatts'),
  maxWatts: document.querySelector('#maxWatts'),
  circuits: document.querySelector('#circuits'),
  powerJumpers: document.querySelector('#powerJumpers'),
  brackets1000: document.querySelector('#brackets1000'),
  brackets500: document.querySelector('#brackets500'),
  towers: document.querySelector('#towers'),
  stackers: document.querySelector('#stackers'),
  hTubes: document.querySelector('#hTubes'),
};

let latestResult = null;

function clampNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function formatFeet(mm) {
  return `${(mm / MM_PER_FOOT).toFixed(2)} ft`;
}

function compactFeet(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function buildBlenderLayout(request, result) {
  return {
    schema: 'majic.video_wall.blender_layout',
    version: 1,
    source: 'Video Wall Web Builder',
    vendor: INFILED_PROFILE.vendor,
    model: INFILED_PROFILE.model,
    wall_name: `Video Wall ${result.columns}x${result.rows}`,
    columns: result.columns,
    rows: result.rows,
    support_mode: request.supportMode,
    support_spacing: request.towerSpacingM.toFixed(1),
    include_h_tubes: request.supportMode === 'GROUND' && request.includeHTubes,
    add_right_edge_tower: request.supportMode === 'GROUND' && request.addRightEdgeTower,
    requested_width_ft: request.widthFt,
    requested_height_ft: request.heightFt,
    actual_width_mm: result.actualWidthMm,
    actual_height_mm: result.actualHeightMm,
    pixel_pitch_mm: request.pixelPitchMm,
    total_pixels_width: result.totalPixelsWide,
    total_pixels_height: result.totalPixelsHigh,
    cabinet_count: result.cabinets,
  };
}

function calculate() {
  const requestedWidthFt = Number(elements.requestedWidthFt.value);
  const requestedHeightFt = Number(elements.requestedHeightFt.value);
  const pixelPitchMm = Number(elements.pixelPitchMm.value);
  const supportMode = elements.supportMode.value;
  const towerSpacingM = Number(elements.towerSpacingM.value);
  const includeHTubes = elements.includeHTubes.checked;
  const addRightEdgeTower = elements.addRightEdgeTower.checked;
  const widthMm = clampNumber(requestedWidthFt, DEFAULT_WIDTH_FT) * MM_PER_FOOT;
  const heightMm = clampNumber(requestedHeightFt, DEFAULT_HEIGHT_FT) * MM_PER_FOOT;
  const pitch = clampNumber(pixelPitchMm, INFILED_PROFILE.pixelPitchMm);
  const columns = Math.max(1, Math.floor(widthMm / INFILED_PROFILE.cabinetWidthMm));
  const rows = Math.max(1, Math.floor(heightMm / INFILED_PROFILE.cabinetHeightMm));
  const actualWidthMm = columns * INFILED_PROFILE.cabinetWidthMm;
  const actualHeightMm = rows * INFILED_PROFILE.cabinetHeightMm;
  const cabinets = columns * rows;
  const cabinetPixelsWide =
    pitch === INFILED_PROFILE.pixelPitchMm
      ? INFILED_PROFILE.cabinetPixelsWide
      : Math.round(INFILED_PROFILE.cabinetWidthMm / pitch);
  const cabinetPixelsHigh =
    pitch === INFILED_PROFILE.pixelPitchMm
      ? INFILED_PROFILE.cabinetPixelsHigh
      : Math.round(INFILED_PROFILE.cabinetHeightMm / pitch);
  const totalPixelsWide = columns * cabinetPixelsWide;
  const totalPixelsHigh = rows * cabinetPixelsHigh;
  const totalPixels = totalPixelsWide * totalPixelsHigh;
  const cabinetsPerPort = Math.max(
    1,
    Math.floor(PROCESSOR_PROFILE.pixelsPerPort / (cabinetPixelsWide * cabinetPixelsHigh)),
  );
  const dataPorts = Math.ceil(cabinets / cabinetsPerPort);
  const processors = Math.ceil(dataPorts / PROCESSOR_PROFILE.ports);
  const maxWatts = cabinets * INFILED_PROFILE.maxWatts;
  const avgWatts = cabinets * INFILED_PROFILE.avgWatts;
  const safeCircuitWatts = 120 * 20 * 0.8;
  const circuits = Math.ceil(maxWatts / safeCircuitWatts);
  const widthM = actualWidthMm / 1000;
  const heightM = actualHeightMm / 1000;
  const towers = [];

  for (let value = 0; value < widthM - 0.0001; value += towerSpacingM) {
    towers.push(value);
  }

  if (addRightEdgeTower && Math.abs((towers.at(-1) ?? -1) - widthM) > 0.001) {
    towers.push(widthM);
  }

  const stackerLevels = Math.max(1, Math.ceil(heightM));
  const hTubes =
    supportMode === 'GROUND' && includeHTubes
      ? Math.max(0, towers.length - 1) * stackerLevels
      : 0;

  return {
    request: {
      widthFt: requestedWidthFt,
      heightFt: requestedHeightFt,
      pixelPitchMm,
      supportMode,
      towerSpacingM,
      includeHTubes,
      addRightEdgeTower,
    },
    result: {
      columns,
      rows,
      cabinets,
      actualWidthMm,
      actualHeightMm,
      shortWidthMm: widthMm - actualWidthMm,
      shortHeightMm: heightMm - actualHeightMm,
      cabinetPixelsWide,
      cabinetPixelsHigh,
      totalPixelsWide,
      totalPixelsHigh,
      totalPixels,
      dataPorts,
      processors,
      cabinetsPerPort,
      avgWatts,
      maxWatts,
      circuits,
      dataHomeRuns: dataPorts,
      dataJumpers: Math.max(0, cabinets - dataPorts),
      powerJumpers: Math.max(0, cabinets - circuits),
      brackets1000: Math.floor(columns / 2),
      brackets500: columns % 2,
      towers: supportMode === 'GROUND' ? towers.length : 0,
      stackerLevels: supportMode === 'GROUND' ? stackerLevels : 0,
      stackers: supportMode === 'GROUND' ? towers.length * stackerLevels : 0,
      hTubes,
    },
  };
}

function renderWallGrid(columns, rows, cabinets) {
  elements.wallGrid.style.gridTemplateColumns = `repeat(${columns}, minmax(18px, 1fr))`;
  elements.wallGrid.style.aspectRatio = `${columns} / ${rows}`;
  elements.wallGrid.replaceChildren();

  for (let index = 0; index < cabinets; index += 1) {
    const cell = document.createElement('div');
    cell.className = 'cabinet-cell';
    elements.wallGrid.append(cell);
  }
}

function update() {
  const { request, result } = calculate();
  latestResult = {
    schema: 'majic.video_wall.web_builder',
    version: 1,
    profile: INFILED_PROFILE,
    processor: PROCESSOR_PROFILE,
    request,
    result,
    blender_layout: buildBlenderLayout(request, result),
  };

  const flown = request.supportMode === 'FLOWN';
  elements.towerSpacingM.disabled = flown;
  elements.includeHTubes.disabled = flown;
  elements.addRightEdgeTower.disabled = flown;

  elements.cabinetPixels.textContent = `${result.cabinetPixelsWide} x ${result.cabinetPixelsHigh}`;
  elements.previewNote.textContent = `${result.columns} columns x ${result.rows} rows, fit under requested size`;
  elements.actualWall.textContent = `${formatFeet(result.actualWidthMm)} x ${formatFeet(result.actualHeightMm)}`;
  elements.panelCount.textContent = String(result.cabinets);
  elements.resolution.textContent = `${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)}`;
  elements.processors.textContent = `${result.processors} x ${PROCESSOR_PROFILE.name}`;
  elements.requestedSize.textContent = `${compactFeet(request.widthFt)} ft x ${compactFeet(request.heightFt)} ft`;
  elements.shortfall.textContent = `${formatFeet(result.shortWidthMm)} x ${formatFeet(result.shortHeightMm)}`;
  elements.totalPixels.textContent = formatNumber(result.totalPixels);
  elements.dataPorts.textContent = String(result.dataPorts);
  elements.cabinetsPerPort.textContent = String(result.cabinetsPerPort);
  elements.dataHomeRuns.textContent = String(result.dataHomeRuns);
  elements.dataJumpers.textContent = String(result.dataJumpers);
  elements.avgWatts.textContent = formatNumber(result.avgWatts);
  elements.maxWatts.textContent = formatNumber(result.maxWatts);
  elements.circuits.textContent = String(result.circuits);
  elements.powerJumpers.textContent = String(result.powerJumpers);
  elements.brackets1000.textContent = String(result.brackets1000);
  elements.brackets500.textContent = String(result.brackets500);
  elements.towers.textContent = String(result.towers);
  elements.stackers.textContent = String(result.stackers);
  elements.hTubes.textContent = String(result.hTubes);
  renderWallGrid(result.columns, result.rows, result.cabinets);
}

function resetBuilder() {
  elements.requestedWidthFt.value = String(DEFAULT_WIDTH_FT);
  elements.requestedHeightFt.value = String(DEFAULT_HEIGHT_FT);
  elements.pixelPitchMm.value = String(INFILED_PROFILE.pixelPitchMm);
  elements.supportMode.value = 'GROUND';
  elements.towerSpacingM.value = '1';
  elements.includeHTubes.checked = true;
  elements.addRightEdgeTower.checked = false;
  update();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `video-wall-${latestResult.result.columns}x${latestResult.result.rows}-infiled-db2-6.json`;
  link.click();
  URL.revokeObjectURL(url);
}

[
  elements.requestedWidthFt,
  elements.requestedHeightFt,
  elements.pixelPitchMm,
  elements.supportMode,
  elements.towerSpacingM,
  elements.includeHTubes,
  elements.addRightEdgeTower,
].forEach((element) => {
  element.addEventListener('input', update);
  element.addEventListener('change', update);
});

elements.resetButton.addEventListener('click', resetBuilder);
elements.exportButton.addEventListener('click', exportJson);

update();
