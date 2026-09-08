'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

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

function formatFeet(mm: number) {
  return `${(mm / MM_PER_FOOT).toFixed(2)} ft`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function clampNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function compactFeet(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildBlenderLayout({
  requestedWidthFt,
  requestedHeightFt,
  pixelPitchMm,
  supportMode,
  towerSpacingM,
  includeHTubes,
  addRightEdgeTower,
  result,
}: {
  requestedWidthFt: number;
  requestedHeightFt: number;
  pixelPitchMm: number;
  supportMode: 'GROUND' | 'FLOWN';
  towerSpacingM: number;
  includeHTubes: boolean;
  addRightEdgeTower: boolean;
  result: {
    columns: number;
    rows: number;
    cabinets: number;
    actualWidthMm: number;
    actualHeightMm: number;
    totalPixelsWide: number;
    totalPixelsHigh: number;
  };
}) {
  return {
    schema: 'majic.video_wall.blender_layout',
    version: 1,
    source: 'Video Wall Web Builder',
    vendor: INFILED_PROFILE.vendor,
    model: INFILED_PROFILE.model,
    wall_name: `Video Wall ${result.columns}x${result.rows}`,
    columns: result.columns,
    rows: result.rows,
    support_mode: supportMode,
    support_spacing: towerSpacingM.toFixed(1),
    include_h_tubes: supportMode === 'GROUND' && includeHTubes,
    add_right_edge_tower: supportMode === 'GROUND' && addRightEdgeTower,
    requested_width_ft: requestedWidthFt,
    requested_height_ft: requestedHeightFt,
    actual_width_mm: result.actualWidthMm,
    actual_height_mm: result.actualHeightMm,
    pixel_pitch_mm: pixelPitchMm,
    total_pixels_width: result.totalPixelsWide,
    total_pixels_height: result.totalPixelsHigh,
    cabinet_count: result.cabinets,
  };
}

function buildLassoRows({
  result,
  supportMode,
}: {
  result: {
    cabinets: number;
    processors: number;
    dataHomeRuns: number;
    dataJumpers: number;
    circuits: number;
    powerJumpers: number;
    brackets1000: number;
    brackets500: number;
    towers: number;
    stackers: number;
    hTubes: number;
    totalPixelsWide: number;
    totalPixelsHigh: number;
  };
  supportMode: 'GROUND' | 'FLOWN';
}) {
  const note = `${INFILED_PROFILE.model}; ${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)} px`;
  return [
    { category: 'Video Wall', sku: '', item: 'InfiLED DB2.6 LED Cabinet', quantity: result.cabinets, unit: 'each', notes: note },
    { category: 'Video Processing', sku: '', item: PROCESSOR_PROFILE.name, quantity: result.processors, unit: 'each', notes: 'Estimated from pixel count and data ports' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Home Run', quantity: result.dataHomeRuns, unit: 'each', notes: 'One home run per calculated data port' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Jumper', quantity: result.dataJumpers, unit: 'each', notes: 'Starter estimate; confirm shop cable rule' },
    { category: 'Power', sku: '', item: '20A Video Wall Circuit', quantity: result.circuits, unit: 'each', notes: 'Estimated from max watts at 80 percent load' },
    { category: 'Power', sku: '', item: 'Video Wall Power Jumper', quantity: result.powerJumpers, unit: 'each', notes: 'Placeholder estimate; confirm manufacturer chain limits' },
    { category: 'Hardware', sku: '', item: 'InfiLED 1000mm Hanging Bracket', quantity: result.brackets1000, unit: 'each', notes: supportMode },
    { category: 'Hardware', sku: '', item: 'InfiLED 500mm Hanging Bracket', quantity: result.brackets500, unit: 'each', notes: supportMode },
    { category: 'Ground Support', sku: '', item: 'InfiLED Support Tower', quantity: result.towers, unit: 'each', notes: 'Ground support only' },
    { category: 'Ground Support', sku: '', item: 'InfiLED Stacking Stacker', quantity: result.stackers, unit: 'each', notes: 'Ground support only' },
    { category: 'Ground Support', sku: '', item: 'InfiLED H-Tube', quantity: result.hTubes, unit: 'each', notes: 'Ground support only' },
  ].filter((row) => row.quantity > 0);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function Home() {
  const [requestedWidthFt, setRequestedWidthFt] = useState(DEFAULT_WIDTH_FT);
  const [requestedHeightFt, setRequestedHeightFt] = useState(DEFAULT_HEIGHT_FT);
  const [pixelPitchMm, setPixelPitchMm] = useState(INFILED_PROFILE.pixelPitchMm);
  const [supportMode, setSupportMode] = useState<'GROUND' | 'FLOWN'>('GROUND');
  const [towerSpacingM, setTowerSpacingM] = useState(1);
  const [includeHTubes, setIncludeHTubes] = useState(true);
  const [addRightEdgeTower, setAddRightEdgeTower] = useState(false);

  const result = useMemo(() => {
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
    };
  }, [
    addRightEdgeTower,
    includeHTubes,
    pixelPitchMm,
    requestedHeightFt,
    requestedWidthFt,
    supportMode,
    towerSpacingM,
  ]);

  function resetBuilder() {
    setRequestedWidthFt(DEFAULT_WIDTH_FT);
    setRequestedHeightFt(DEFAULT_HEIGHT_FT);
    setPixelPitchMm(INFILED_PROFILE.pixelPitchMm);
    setSupportMode('GROUND');
    setTowerSpacingM(1);
    setIncludeHTubes(true);
    setAddRightEdgeTower(false);
  }

  function blenderLayout() {
    return buildBlenderLayout({
      requestedWidthFt,
      requestedHeightFt,
      pixelPitchMm,
      supportMode,
      towerSpacingM,
      includeHTubes,
      addRightEdgeTower,
      result,
    });
  }

  function exportBlenderJson() {
    const layout = blenderLayout();
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-wall-blender-${result.columns}x${result.rows}-infiled-db2-6.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportLassoCsv() {
    const rows = buildLassoRows({ result, supportMode });
    const headers = ['Category', 'SKU', 'Item', 'Quantity', 'Unit', 'Notes'];
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        [row.category, row.sku, row.item, row.quantity, row.unit, row.notes].map(csvEscape).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-wall-lasso-${result.columns}x${result.rows}-infiled-db2-6.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportFullJson() {
    const blender_layout = blenderLayout();
    const lasso_rows = buildLassoRows({ result, supportMode });
    const payload = {
      schema: 'majic.video_wall.web_builder',
      version: 1,
      profile: INFILED_PROFILE,
      processor: PROCESSOR_PROFILE,
      request: {
        widthFt: requestedWidthFt,
        heightFt: requestedHeightFt,
        pixelPitchMm,
        supportMode,
        towerSpacingM,
        includeHTubes,
        addRightEdgeTower,
      },
      result,
      blender_layout,
      lasso_rows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-wall-full-${result.columns}x${result.rows}-infiled-db2-6.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <div className="builder">
        <header className="toolbar">
          <div className="brand">
            <img className="brand-logo" src="/assets/majic-logo.png" alt="Majic Productions" />
            <div>
              <p className="eyebrow">Majic Productions</p>
              <h1>Video Wall Builder</h1>
              <p className="subtitle">
                Sales sizing draft for fitting whole video wall cabinets inside a requested wall size.
              </p>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="secondary-button" onClick={resetBuilder}>
              Reset
            </button>
            <button type="button" className="secondary-button" onClick={exportFullJson}>
              Full JSON
            </button>
            <button type="button" className="secondary-button" onClick={exportLassoCsv}>
              LASSO CSV
            </button>
            <button type="button" className="primary-button" onClick={exportBlenderJson}>
              Blender JSON
            </button>
          </div>
        </header>

        <section className="controls" aria-label="Wall controls">
          <Field label="Width Ft">
            <input
              className="control-input"
              type="number"
              min="1"
              step="0.5"
              value={requestedWidthFt}
              onChange={(event) => setRequestedWidthFt(Number(event.target.value))}
            />
          </Field>
          <Field label="Height Ft">
            <input
              className="control-input"
              type="number"
              min="1"
              step="0.5"
              value={requestedHeightFt}
              onChange={(event) => setRequestedHeightFt(Number(event.target.value))}
            />
          </Field>
          <Field label="Vendor">
            <select className="control-input" value="infiled" disabled>
              <option value="infiled">InfiLED</option>
            </select>
          </Field>
          <Field label="Panel">
            <select className="control-input" value="db2.6" disabled>
              <option value="db2.6">DB2.6 / 500 mm</option>
            </select>
          </Field>
          <Field label="Pixel Pitch">
            <input
              className="control-input"
              type="number"
              min="0.5"
              step="0.01"
              value={pixelPitchMm}
              onChange={(event) => setPixelPitchMm(Number(event.target.value))}
            />
          </Field>
          <Field label="Support">
            <select
              className="control-input"
              value={supportMode}
              onChange={(event) => setSupportMode(event.target.value as 'GROUND' | 'FLOWN')}
            >
              <option value="GROUND">Ground</option>
              <option value="FLOWN">Flown</option>
            </select>
          </Field>
          <Field label="Tower Spacing">
            <select
              className="control-input"
              value={towerSpacingM}
              onChange={(event) => setTowerSpacingM(Number(event.target.value))}
              disabled={supportMode === 'FLOWN'}
            >
              <option value={1}>1000 mm</option>
              <option value={1.5}>1500 mm</option>
            </select>
          </Field>
          <div className="toggle-stack">
            <label>
              <input
                type="checkbox"
                checked={includeHTubes}
                onChange={(event) => setIncludeHTubes(event.target.checked)}
                disabled={supportMode === 'FLOWN'}
              />
              H-tubes
            </label>
            <label>
              <input
                type="checkbox"
                checked={addRightEdgeTower}
                onChange={(event) => setAddRightEdgeTower(event.target.checked)}
                disabled={supportMode === 'FLOWN'}
              />
              Right tower
            </label>
          </div>
        </section>

        <section className="workspace">
          <section className="panel profile-panel">
            <PanelHeading title="Panel Profile" note={`${INFILED_PROFILE.vendor} ${INFILED_PROFILE.model}`} />
            <div className="parts-list">
              <Row label="Cabinet size" value="500 mm x 500 mm" />
              <Row label="Cabinet depth" value={`${INFILED_PROFILE.cabinetDepthMm} mm`} />
              <Row label="Cabinet pixels" value={`${result.cabinetPixelsWide} x ${result.cabinetPixelsHigh}`} />
              <Row label="Cabinet weight" value={`${INFILED_PROFILE.weightLb} lb`} />
              <Row label="Brightness" value={`${formatNumber(INFILED_PROFILE.brightnessNits)} nits`} />
              <Row label="Refresh rate" value={`${formatNumber(INFILED_PROFILE.refreshHz)} Hz`} />
            </div>
          </section>

          <section className="panel preview-panel">
            <PanelHeading
              title="Wall Preview"
              note={`${result.columns} columns x ${result.rows} rows, fit under requested size`}
            />
            <div className="count-strip">
              <Stat label="Actual Wall" value={`${formatFeet(result.actualWidthMm)} x ${formatFeet(result.actualHeightMm)}`} />
              <Stat label="Panels" value={`${result.cabinets}`} />
              <Stat
                label="Resolution"
                value={`${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)}`}
              />
              <Stat label="Processors" value={`${result.processors} x ${PROCESSOR_PROFILE.name}`} />
            </div>
            <div className="preview-stage">
              <div
                className="wall-grid"
                style={{
                  gridTemplateColumns: `repeat(${result.columns}, minmax(18px, 1fr))`,
                  aspectRatio: `${result.columns} / ${result.rows}`,
                }}
              >
                {Array.from({ length: result.cabinets }).map((_, index) => (
                  <div key={index} className="cabinet-cell" />
                ))}
              </div>
            </div>
            <div className="fit-summary">
              <Row
                label="Client requested"
                value={`${compactFeet(requestedWidthFt)} ft x ${compactFeet(requestedHeightFt)} ft`}
              />
              <Row label="Fit shortfall" value={`${formatFeet(result.shortWidthMm)} x ${formatFeet(result.shortHeightMm)}`} />
              <Row label="Total pixels" value={formatNumber(result.totalPixels)} />
            </div>
          </section>

          <section className="panel summary-panel">
            <PanelHeading title="Parts Summary" note="Starter counts for sales review" />
            <div className="summary-grid">
              <Summary title="Signal">
                <Row label="Data ports" value={result.dataPorts} />
                <Row label="Cabinets per port" value={result.cabinetsPerPort} />
                <Row label="Data home runs" value={result.dataHomeRuns} />
                <Row label="Panel data jumpers" value={result.dataJumpers} />
              </Summary>
              <Summary title="Power">
                <Row label="Average watts" value={formatNumber(result.avgWatts)} />
                <Row label="Maximum watts" value={formatNumber(result.maxWatts)} />
                <Row label="20A circuits at 80%" value={result.circuits} />
                <Row label="Power jumpers" value={result.powerJumpers} />
              </Summary>
              <Summary title="Ground Hardware">
                <Row label="1000 mm brackets" value={result.brackets1000} />
                <Row label="500 mm brackets" value={result.brackets500} />
                <Row label="Support towers" value={result.towers} />
                <Row label="Stackers" value={result.stackers} />
                <Row label="H-tubes" value={result.hTubes} />
              </Summary>
            </div>
          </section>

          <section className="panel status-panel">
            <PanelHeading title="Spec Status" note="Needs final shop confirmation" />
            <p>
              {INFILED_PROFILE.sourceNote} Power chain limits and processor choice still need shop rules
              or manufacturer paperwork before this becomes quote-ready.
            </p>
          </section>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="control-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PanelHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="count-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Summary({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="summary-block">
      <h3>{title}</h3>
      <div className="parts-list">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="part-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
