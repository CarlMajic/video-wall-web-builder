const MM_PER_FOOT = 304.8;
const DEFAULT_COLUMNS = 10;
const DEFAULT_ROWS = 6;
const STANDARD_WALL_COLUMNS = 10;
const STANDARD_WALL_ROWS = 6;

const INFILED_PROFILE = {
  vendor: 'InfiLED',
  model: 'DB2.6 / IL-RSS-IRDB2.6mk2',
  cabinetWidthMm: 500,
  cabinetHeightMm: 500,
  cabinetDepthMm: 75.5,
  pixelPitchMm: 2.6,
  cabinetPixelsWide: 192,
  cabinetPixelsHigh: 192,
  avgWatts: 50,
  maxWatts: 150,
  weightLb: 18.52,
  brightnessNits: 2000,
  refreshHz: 7680,
};

const PROCESSOR_PROFILES = [
  {
    id: 'mx30',
    name: 'NovaStar MX30',
    ports: 10,
    pixelsPerPort: 659722,
    maxPixels: 6500000,
  },
  {
    id: 'mctrl4k',
    name: 'NovaStar MCTRL4K',
    ports: 16,
    pixelsPerPort: 650000,
    maxPixels: 8800000,
  },
];

const GROUND_SUPPORT_KIT = {
  stackingStackers: 12,
  hTubes: 9,
  stackingSkis: 4,
  dockingLocks: 12,
};

const elements = {
  columns: document.querySelector('#columns'),
  rows: document.querySelector('#rows'),
  decreaseColumns: document.querySelector('#decreaseColumns'),
  increaseColumns: document.querySelector('#increaseColumns'),
  decreaseRows: document.querySelector('#decreaseRows'),
  increaseRows: document.querySelector('#increaseRows'),
  widthMeasurement: document.querySelector('#widthMeasurement'),
  heightMeasurement: document.querySelector('#heightMeasurement'),
  pixelPitchMm: document.querySelector('#pixelPitchMm'),
  processorId: document.querySelector('#processorId'),
  voltage: document.querySelector('#voltage'),
  backupData: document.querySelector('#backupData'),
  supportMode: document.querySelector('#supportMode'),
  resetButton: document.querySelector('#resetButton'),
  exportFullJsonButton: document.querySelector('#exportFullJsonButton'),
  exportLassoCsvButton: document.querySelector('#exportLassoCsvButton'),
  exportBlenderJsonButton: document.querySelector('#exportBlenderJsonButton'),
  cabinetPixels: document.querySelector('#cabinetPixels'),
  previewNote: document.querySelector('#previewNote'),
  actualWall: document.querySelector('#actualWall'),
  panelCount: document.querySelector('#panelCount'),
  resolution: document.querySelector('#resolution'),
  processors: document.querySelector('#processors'),
  wallGrid: document.querySelector('#wallGrid'),
  panelLayout: document.querySelector('#panelLayout'),
  panelIncrement: document.querySelector('#panelIncrement'),
  totalPixels: document.querySelector('#totalPixels'),
  dataPorts: document.querySelector('#dataPorts'),
  cabinetsPerPort: document.querySelector('#cabinetsPerPort'),
  dataHomeRunsLabel: document.querySelector('#dataHomeRunsLabel'),
  dataHomeRuns: document.querySelector('#dataHomeRuns'),
  dataJumpers: document.querySelector('#dataJumpers'),
  avgWatts: document.querySelector('#avgWatts'),
  maxWatts: document.querySelector('#maxWatts'),
  circuitBasis: document.querySelector('#circuitBasis'),
  circuits: document.querySelector('#circuits'),
  powerJumpers: document.querySelector('#powerJumpers'),
  hardwareTitle: document.querySelector('#hardwareTitle'),
  hardwareSummaryList: document.querySelector('#hardwareSummaryList'),
};

let latestResult = null;

function clampWholeNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : fallback;
}

function formatFeet(mm) {
  return `${(mm / MM_PER_FOOT).toFixed(2)} ft`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatVoltage(value) {
  return `${value}V`;
}

function selectedProcessor() {
  return PROCESSOR_PROFILES.find((profile) => profile.id === elements.processorId.value) ?? PROCESSOR_PROFILES[0];
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
    support_spacing: '1.0',
    include_h_tubes: request.supportMode === 'GROUND',
    add_right_edge_tower: false,
    requested_width_ft: result.actualWidthMm / MM_PER_FOOT,
    requested_height_ft: result.actualHeightMm / MM_PER_FOOT,
    processor: request.processor.name,
    backup_data: request.backupData,
    power_voltage: request.voltage,
    actual_width_mm: result.actualWidthMm,
    actual_height_mm: result.actualHeightMm,
    pixel_pitch_mm: request.pixelPitchMm,
    total_pixels_width: result.totalPixelsWide,
    total_pixels_height: result.totalPixelsHigh,
    cabinet_count: result.cabinets,
  };
}

function buildLassoRows(result, request) {
  const note = `${INFILED_PROFILE.model}; ${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)} px`;
  const hardwareCategory = request.supportMode === 'FLOWN' ? 'Flown Hardware' : 'Ground Hardware';
  const groundReviewNote = result.needsGroundReview
    ? 'Ground-support plan requires technician or Production Manager review'
    : 'Included as complete IE ground support kit';

  return [
    { category: 'Video Wall', sku: '', item: 'InfiLED DB2.6 LED Cabinet', quantity: result.cabinets, unit: 'each', notes: note },
    { category: 'Video Processing', sku: '', item: request.processor.name, quantity: result.processors, unit: 'each', notes: 'Estimated from pixel count and data ports' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Home Run', quantity: result.dataHomeRuns, unit: 'each', notes: request.backupData ? 'Main and backup data runs' : 'Without backup data' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Jumper', quantity: result.dataJumpers, unit: 'each', notes: 'Matched to panel count for spares' },
    { category: 'Power', sku: '', item: '20A Video Wall Circuit', quantity: result.circuits, unit: 'each', notes: `16A usable at ${formatVoltage(request.voltage)}` },
    { category: 'Power', sku: '', item: 'Video Wall Power Jumper', quantity: result.powerJumpers, unit: 'each', notes: 'Matched to panel count for spares' },
    { category: hardwareCategory, sku: '', item: 'Dual Header/Footer', quantity: result.dualHeaderFooters, unit: 'each', notes: request.supportMode },
    { category: hardwareCategory, sku: '', item: 'Single Header/Footer', quantity: result.singleHeaderFooters, unit: 'each', notes: request.supportMode },
    { category: 'Ground Support', sku: '', item: 'Ground Support Kit', quantity: result.groundSupportKits, unit: 'kit', notes: groundReviewNote },
    { category: 'Ground Support', sku: '', item: 'Stacking Stacker', quantity: result.stackingStackers, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'H-Tube', quantity: result.hTubes, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'Stacking Ski', quantity: result.stackingSkis, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'Docking Lock', quantity: result.dockingLocks, unit: 'each', notes: 'Kit contents for standard wall' },
  ].filter((row) => row.quantity > 0);
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function calculate() {
  const columns = clampWholeNumber(Number(elements.columns.value), DEFAULT_COLUMNS);
  const rows = clampWholeNumber(Number(elements.rows.value), DEFAULT_ROWS);
  const pixelPitchMm = Number(elements.pixelPitchMm.value);
  const pitch = Number.isFinite(pixelPitchMm) && pixelPitchMm > 0 ? pixelPitchMm : INFILED_PROFILE.pixelPitchMm;
  const processor = selectedProcessor();
  const voltage = Number(elements.voltage.value);
  const backupData = elements.backupData.checked;
  const supportMode = elements.supportMode.value;
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
  const cabinetPixels = cabinetPixelsWide * cabinetPixelsHigh;
  const cabinetsPerPort = Math.max(1, Math.floor(processor.pixelsPerPort / cabinetPixels));
  const dataPorts = Math.ceil(cabinets / cabinetsPerPort);
  const processors = Math.max(Math.ceil(dataPorts / processor.ports), Math.ceil(totalPixels / processor.maxPixels));
  const maxWatts = cabinets * INFILED_PROFILE.maxWatts;
  const avgWatts = cabinets * INFILED_PROFILE.avgWatts;
  const safeCircuitWatts = voltage * 16;
  const circuits = Math.ceil(maxWatts / safeCircuitWatts);
  const dualHeaderFooters = Math.floor(columns / 2);
  const singleHeaderFooters = columns % 2;
  const includeGroundKit = supportMode === 'GROUND' && columns <= STANDARD_WALL_COLUMNS && rows <= STANDARD_WALL_ROWS;
  const needsGroundReview = supportMode === 'GROUND' && !includeGroundKit;

  return {
    request: {
      columns,
      rows,
      pixelPitchMm: pitch,
      processorId: processor.id,
      processor,
      voltage,
      backupData,
      supportMode,
    },
    result: {
      columns,
      rows,
      cabinets,
      actualWidthMm,
      actualHeightMm,
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
      safeCircuitWatts,
      dataHomeRuns: backupData ? dataPorts * 2 : dataPorts,
      dataJumpers: cabinets,
      powerJumpers: cabinets,
      dualHeaderFooters,
      singleHeaderFooters,
      groundSupportKits: includeGroundKit ? 1 : 0,
      stackingStackers: includeGroundKit ? GROUND_SUPPORT_KIT.stackingStackers : 0,
      stackingSkis: includeGroundKit ? GROUND_SUPPORT_KIT.stackingSkis : 0,
      hTubes: includeGroundKit ? GROUND_SUPPORT_KIT.hTubes : 0,
      dockingLocks: includeGroundKit ? GROUND_SUPPORT_KIT.dockingLocks : 0,
      needsGroundReview,
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

function renderHardwareSummary(result, supportMode) {
  const rows = [
    ['Dual Header/Footer', result.dualHeaderFooters],
    ['Single Header/Footer', result.singleHeaderFooters],
  ];

  if (supportMode === 'GROUND') {
    rows.push(['Ground Support Kit', result.groundSupportKits || 'Review required']);

    if (result.groundSupportKits) {
      rows.push(
        ['Stacking Stackers', result.stackingStackers],
        ['H-Tubes', result.hTubes],
        ['Stacking Skis', result.stackingSkis],
        ['Docking Locks', result.dockingLocks],
      );
    }
  } else {
    rows.push(['Ground-support items', 'Not included']);
  }

  elements.hardwareSummaryList.replaceChildren(
    ...rows.map(([label, value]) => {
      const row = document.createElement('div');
      const rowLabel = document.createElement('span');
      const rowValue = document.createElement('strong');
      row.className = 'part-row';
      rowLabel.textContent = String(label);
      rowValue.textContent = String(value);
      row.append(rowLabel, rowValue);
      return row;
    }),
  );
}

function update() {
  const { request, result } = calculate();
  latestResult = {
    schema: 'majic.video_wall.web_builder',
    version: 1,
    profile: INFILED_PROFILE,
    processor: request.processor,
    request,
    result,
    blender_layout: buildBlenderLayout(request, result),
    lasso_rows: buildLassoRows(result, request),
  };

  elements.columns.value = String(result.columns);
  elements.rows.value = String(result.rows);
  elements.widthMeasurement.textContent = `${formatFeet(result.actualWidthMm)} wide`;
  elements.heightMeasurement.textContent = `${formatFeet(result.actualHeightMm)} tall`;
  elements.cabinetPixels.textContent = `${result.cabinetPixelsWide} x ${result.cabinetPixelsHigh}`;
  elements.previewNote.textContent = `${result.columns} columns x ${result.rows} rows, adjusted in 500 mm panel increments`;
  elements.actualWall.textContent = `${formatFeet(result.actualWidthMm)} x ${formatFeet(result.actualHeightMm)}`;
  elements.panelCount.textContent = String(result.cabinets);
  elements.resolution.textContent = `${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)}`;
  elements.processors.textContent = `${result.processors} x ${request.processor.name}`;
  elements.panelLayout.textContent = `${result.columns} columns x ${result.rows} rows`;
  elements.panelIncrement.textContent = `${formatFeet(INFILED_PROFILE.cabinetWidthMm)} per panel`;
  elements.totalPixels.textContent = formatNumber(result.totalPixels);
  elements.dataPorts.textContent = String(result.dataPorts);
  elements.cabinetsPerPort.textContent = String(result.cabinetsPerPort);
  elements.dataHomeRunsLabel.textContent = request.backupData
    ? 'Data home runs with backup'
    : 'Data home runs without backup';
  elements.dataHomeRuns.textContent = String(result.dataHomeRuns);
  elements.dataJumpers.textContent = String(result.dataJumpers);
  elements.avgWatts.textContent = formatNumber(result.avgWatts);
  elements.maxWatts.textContent = formatNumber(result.maxWatts);
  elements.circuitBasis.textContent = `16A usable (20A circuit at 80%) at ${formatVoltage(request.voltage)}`;
  elements.circuits.textContent = String(result.circuits);
  elements.powerJumpers.textContent = String(result.powerJumpers);
  elements.hardwareTitle.textContent = request.supportMode === 'FLOWN' ? 'Flown Hardware' : 'Ground Hardware';

  renderHardwareSummary(result, request.supportMode);
  renderWallGrid(result.columns, result.rows, result.cabinets);
}

function changeColumns(delta) {
  elements.columns.value = String(Math.max(1, clampWholeNumber(Number(elements.columns.value), DEFAULT_COLUMNS) + delta));
  update();
}

function changeRows(delta) {
  elements.rows.value = String(Math.max(1, clampWholeNumber(Number(elements.rows.value), DEFAULT_ROWS) + delta));
  update();
}

function resetBuilder() {
  elements.columns.value = String(DEFAULT_COLUMNS);
  elements.rows.value = String(DEFAULT_ROWS);
  elements.pixelPitchMm.value = String(INFILED_PROFILE.pixelPitchMm);
  elements.processorId.value = 'mx30';
  elements.voltage.value = '120';
  elements.backupData.checked = false;
  elements.supportMode.value = 'GROUND';
  update();
}

function exportBlenderJson() {
  const blob = new Blob([JSON.stringify(latestResult.blender_layout, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `video-wall-blender-${latestResult.result.columns}x${latestResult.result.rows}-infiled-db2-6.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportLassoCsv() {
  const headers = ['Category', 'SKU', 'Item', 'Quantity', 'Unit', 'Notes'];
  const lines = [
    headers.join(','),
    ...latestResult.lasso_rows.map((row) =>
      [row.category, row.sku, row.item, row.quantity, row.unit, row.notes].map(csvEscape).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `video-wall-lasso-${latestResult.result.columns}x${latestResult.result.rows}-infiled-db2-6.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportFullJson() {
  const blob = new Blob([JSON.stringify(latestResult, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `video-wall-full-${latestResult.result.columns}x${latestResult.result.rows}-infiled-db2-6.json`;
  link.click();
  URL.revokeObjectURL(url);
}

[
  elements.columns,
  elements.rows,
  elements.pixelPitchMm,
  elements.processorId,
  elements.voltage,
  elements.backupData,
  elements.supportMode,
].forEach((element) => {
  element.addEventListener('input', update);
  element.addEventListener('change', update);
});

elements.decreaseColumns.addEventListener('click', () => changeColumns(-1));
elements.increaseColumns.addEventListener('click', () => changeColumns(1));
elements.decreaseRows.addEventListener('click', () => changeRows(-1));
elements.increaseRows.addEventListener('click', () => changeRows(1));
elements.resetButton.addEventListener('click', resetBuilder);
elements.exportFullJsonButton.addEventListener('click', exportFullJson);
elements.exportLassoCsvButton.addEventListener('click', exportLassoCsv);
elements.exportBlenderJsonButton.addEventListener('click', exportBlenderJson);

update();
