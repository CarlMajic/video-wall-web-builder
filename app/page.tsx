'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

const MM_PER_FOOT = 304.8;
const INCHES_PER_MM = 0.0393701;
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
] as const;

const GROUND_SUPPORT_KIT = {
  dualHeaderFooters: 5,
  stackingStackers: 12,
  hTubes: 9,
  stackingSkis: 4,
  dockingLocks: 12,
};

function formatFeet(mm: number) {
  return `${(mm / MM_PER_FOOT).toFixed(2)} ft`;
}

function formatInches(mm: number) {
  return `${(mm * INCHES_PER_MM).toFixed(2)} in`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function clampWholeNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : fallback;
}

function formatVoltage(value: number) {
  return `${value}V`;
}

function buildBlenderLayout({
  processorName,
  backupData,
  voltage,
  pixelPitchMm,
  supportMode,
  result,
}: {
  processorName: string;
  backupData: boolean;
  voltage: number;
  pixelPitchMm: number;
  supportMode: 'GROUND' | 'FLOWN';
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
    support_spacing: '1.0',
    include_h_tubes: supportMode === 'GROUND',
    add_right_edge_tower: false,
    requested_width_ft: result.actualWidthMm / MM_PER_FOOT,
    requested_height_ft: result.actualHeightMm / MM_PER_FOOT,
    processor: processorName,
    backup_data: backupData,
    power_voltage: voltage,
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
  processorName,
  backupData,
  voltage,
}: {
  result: {
    cabinets: number;
    processors: number;
    dataHomeRuns: number;
    dataJumpers: number;
    circuits: number;
    powerJumpers: number;
    dualHeaderFooters: number;
    singleHeaderFooters: number;
    groundSupportKits: number;
    stackingStackers: number;
    stackingSkis: number;
    hTubes: number;
    dockingLocks: number;
    needsGroundReview: boolean;
    totalPixelsWide: number;
    totalPixelsHigh: number;
  };
  supportMode: 'GROUND' | 'FLOWN';
  processorName: string;
  backupData: boolean;
  voltage: number;
}) {
  const note = `${INFILED_PROFILE.model}; ${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)} px`;
  const hardwareCategory = supportMode === 'FLOWN' ? 'Flown Hardware' : 'Ground Hardware';
  const groundReviewNote = result.needsGroundReview
    ? 'Ground-support plan requires technician or Production Manager review'
    : 'Included as complete IE ground support kit';

  return [
    { category: 'Video Wall', sku: '', item: 'InfiLED DB2.6 LED Cabinet', quantity: result.cabinets, unit: 'each', notes: note },
    { category: 'Video Processing', sku: '', item: processorName, quantity: result.processors, unit: 'each', notes: 'Estimated from pixel count and data ports' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Home Run', quantity: result.dataHomeRuns, unit: 'each', notes: backupData ? 'Main and backup data runs' : 'Without backup data' },
    { category: 'Signal', sku: '', item: 'Video Wall Data Jumper', quantity: result.dataJumpers, unit: 'each', notes: 'Matched to panel count for spares' },
    { category: 'Power', sku: '', item: '20A Video Wall Circuit', quantity: result.circuits, unit: 'each', notes: `16A usable at ${formatVoltage(voltage)}` },
    { category: 'Power', sku: '', item: 'Video Wall Power Jumper', quantity: result.powerJumpers, unit: 'each', notes: 'Matched to panel count for spares' },
    { category: hardwareCategory, sku: '', item: 'Dual Header/Footer', quantity: result.dualHeaderFooters, unit: 'each', notes: supportMode },
    { category: hardwareCategory, sku: '', item: 'Single Header/Footer', quantity: result.singleHeaderFooters, unit: 'each', notes: supportMode },
    { category: 'Ground Support', sku: '', item: 'Ground Support Kit', quantity: result.groundSupportKits, unit: 'kit', notes: groundReviewNote },
    { category: 'Ground Support', sku: '', item: 'Stacking Stacker', quantity: result.stackingStackers, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'H-Tube', quantity: result.hTubes, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'Stacking Ski', quantity: result.stackingSkis, unit: 'each', notes: 'Kit contents for standard wall' },
    { category: 'Ground Support', sku: '', item: 'Docking Lock', quantity: result.dockingLocks, unit: 'each', notes: 'Kit contents for standard wall' },
  ].filter((row) => row.quantity > 0);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function Home() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [pixelPitchMm, setPixelPitchMm] = useState(INFILED_PROFILE.pixelPitchMm);
  const [processorId, setProcessorId] = useState<(typeof PROCESSOR_PROFILES)[number]['id']>('mx30');
  const [voltage, setVoltage] = useState(120);
  const [backupData, setBackupData] = useState(false);
  const [supportMode, setSupportMode] = useState<'GROUND' | 'FLOWN'>('GROUND');

  const processor = PROCESSOR_PROFILES.find((profile) => profile.id === processorId) ?? PROCESSOR_PROFILES[0];

  const result = useMemo(() => {
    const wallColumns = clampWholeNumber(columns, DEFAULT_COLUMNS);
    const wallRows = clampWholeNumber(rows, DEFAULT_ROWS);
    const pitch = Number.isFinite(pixelPitchMm) && pixelPitchMm > 0 ? pixelPitchMm : INFILED_PROFILE.pixelPitchMm;
    const actualWidthMm = wallColumns * INFILED_PROFILE.cabinetWidthMm;
    const actualHeightMm = wallRows * INFILED_PROFILE.cabinetHeightMm;
    const cabinets = wallColumns * wallRows;
    const cabinetPixelsWide =
      pitch === INFILED_PROFILE.pixelPitchMm
        ? INFILED_PROFILE.cabinetPixelsWide
        : Math.round(INFILED_PROFILE.cabinetWidthMm / pitch);
    const cabinetPixelsHigh =
      pitch === INFILED_PROFILE.pixelPitchMm
        ? INFILED_PROFILE.cabinetPixelsHigh
        : Math.round(INFILED_PROFILE.cabinetHeightMm / pitch);
    const totalPixelsWide = wallColumns * cabinetPixelsWide;
    const totalPixelsHigh = wallRows * cabinetPixelsHigh;
    const totalPixels = totalPixelsWide * totalPixelsHigh;
    const cabinetPixels = cabinetPixelsWide * cabinetPixelsHigh;
    const cabinetsPerPort = Math.max(1, Math.floor(processor.pixelsPerPort / cabinetPixels));
    const dataPorts = Math.ceil(cabinets / cabinetsPerPort);
    const processors = Math.max(Math.ceil(dataPorts / processor.ports), Math.ceil(totalPixels / processor.maxPixels));
    const maxWatts = cabinets * INFILED_PROFILE.maxWatts;
    const avgWatts = cabinets * INFILED_PROFILE.avgWatts;
    const safeCircuitWatts = voltage * 16;
    const circuits = Math.ceil(maxWatts / safeCircuitWatts);
    const dualHeaderFooters = Math.floor(wallColumns / 2);
    const singleHeaderFooters = wallColumns % 2;
    const isStandardOrSmaller = wallColumns <= STANDARD_WALL_COLUMNS && wallRows <= STANDARD_WALL_ROWS;
    const includeGroundKit = supportMode === 'GROUND' && isStandardOrSmaller;
    const needsGroundReview = supportMode === 'GROUND' && !isStandardOrSmaller;

    return {
      columns: wallColumns,
      rows: wallRows,
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
    };
  }, [backupData, columns, pixelPitchMm, processor, rows, supportMode, voltage]);

  function resetBuilder() {
    setColumns(DEFAULT_COLUMNS);
    setRows(DEFAULT_ROWS);
    setPixelPitchMm(INFILED_PROFILE.pixelPitchMm);
    setProcessorId('mx30');
    setVoltage(120);
    setBackupData(false);
    setSupportMode('GROUND');
  }

  function blenderLayout() {
    return buildBlenderLayout({
      processorName: processor.name,
      backupData,
      voltage,
      pixelPitchMm,
      supportMode,
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
    const rows = buildLassoRows({ result, supportMode, processorName: processor.name, backupData, voltage });
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
    const lasso_rows = buildLassoRows({ result, supportMode, processorName: processor.name, backupData, voltage });
    const payload = {
      schema: 'majic.video_wall.web_builder',
      version: 1,
      profile: INFILED_PROFILE,
      processor,
      request: {
        columns,
        rows,
        pixelPitchMm,
        processorId,
        voltage,
        backupData,
        supportMode,
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
                Sales sizing draft for InfiLED panel counts, processing, power, and support review.
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
          <Field label="Width Panels">
            <PanelStepper
              value={columns}
              onChange={setColumns}
              measurement={`${formatFeet(result.actualWidthMm)} wide`}
              ariaLabel="Wall width in panels"
            />
          </Field>
          <Field label="Height Panels">
            <PanelStepper
              value={rows}
              onChange={setRows}
              measurement={`${formatFeet(result.actualHeightMm)} tall`}
              ariaLabel="Wall height in panels"
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
          <Field label="Processor">
            <select
              className="control-input"
              value={processorId}
              onChange={(event) => setProcessorId(event.target.value as (typeof PROCESSOR_PROFILES)[number]['id'])}
            >
              {PROCESSOR_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Voltage">
            <select
              className="control-input"
              value={voltage}
              onChange={(event) => setVoltage(Number(event.target.value))}
            >
              <option value={120}>120V</option>
              <option value={208}>208V</option>
            </select>
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
          <div className="toggle-stack">
            <label>
              <input
                type="checkbox"
                checked={backupData}
                onChange={(event) => setBackupData(event.target.checked)}
              />
              Backup data
            </label>
          </div>
        </section>

        <section className="workspace">
          <section className="panel profile-panel">
            <PanelHeading title="Panel Profile" note={`${INFILED_PROFILE.vendor} ${INFILED_PROFILE.model}`} />
            <div className="parts-list">
              <Row
                label="Cabinet size"
                value={`500 mm x 500 mm (${formatInches(INFILED_PROFILE.cabinetWidthMm)} x ${formatInches(
                  INFILED_PROFILE.cabinetHeightMm,
                )})`}
              />
              <Row label="Cabinet depth" value={`${INFILED_PROFILE.cabinetDepthMm} mm (${formatInches(INFILED_PROFILE.cabinetDepthMm)})`} />
              <Row label="Cabinet pixels" value={`${result.cabinetPixelsWide} x ${result.cabinetPixelsHigh}`} />
              <Row label="Cabinet weight" value={`${INFILED_PROFILE.weightLb} lb`} />
              <Row label="Average / max power" value={`${INFILED_PROFILE.avgWatts}W / ${INFILED_PROFILE.maxWatts}W`} />
              <Row label="Brightness" value={`${formatNumber(INFILED_PROFILE.brightnessNits)} nits`} />
              <Row label="Refresh rate" value={`${formatNumber(INFILED_PROFILE.refreshHz)} Hz`} />
            </div>
          </section>

          <section className="panel preview-panel">
            <PanelHeading
              title="Wall Preview"
              note={`${result.columns} columns x ${result.rows} rows, adjusted in 500 mm panel increments`}
            />
            <div className="count-strip">
              <Stat label="Actual Wall" value={`${formatFeet(result.actualWidthMm)} x ${formatFeet(result.actualHeightMm)}`} />
              <Stat label="Panels" value={`${result.cabinets}`} />
              <Stat
                label="Resolution"
                value={`${formatNumber(result.totalPixelsWide)} x ${formatNumber(result.totalPixelsHigh)}`}
              />
              <Stat label="Processors" value={`${result.processors} x ${processor.name}`} />
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
                label="Panel layout"
                value={`${result.columns} columns x ${result.rows} rows`}
              />
              <Row label="Panel increment" value={`${formatFeet(INFILED_PROFILE.cabinetWidthMm)} per panel`} />
              <Row label="Total pixels" value={formatNumber(result.totalPixels)} />
            </div>
          </section>

          <section className="panel summary-panel">
            <PanelHeading title="Parts Summary" note="Starter counts for sales review" />
            <div className="summary-grid">
              <Summary title="Signal">
                <Row label="Data ports" value={result.dataPorts} />
                <Row label="Cabinets per port" value={result.cabinetsPerPort} />
                <Row label={backupData ? 'Data home runs with backup' : 'Data home runs without backup'} value={result.dataHomeRuns} />
                <Row label="Panel data jumpers" value={result.dataJumpers} />
              </Summary>
              <Summary title="Power">
                <Row label="Average watts" value={formatNumber(result.avgWatts)} />
                <Row label="Maximum watts" value={formatNumber(result.maxWatts)} />
                <Row label="Circuit basis" value={`16A usable (20A circuit at 80%) at ${formatVoltage(voltage)}`} />
                <Row label="Required circuits" value={result.circuits} />
                <Row label="Power jumpers" value={result.powerJumpers} />
              </Summary>
              <Summary title={supportMode === 'FLOWN' ? 'Flown Hardware' : 'Ground Hardware'}>
                <Row label="Dual Header/Footer" value={result.dualHeaderFooters} />
                <Row label="Single Header/Footer" value={result.singleHeaderFooters} />
                {supportMode === 'GROUND' ? (
                  <>
                    <Row label="Ground Support Kit" value={result.groundSupportKits || 'Review required'} />
                    {result.groundSupportKits ? (
                      <>
                        <Row label="Stacking Stackers" value={result.stackingStackers} />
                        <Row label="H-Tubes" value={result.hTubes} />
                        <Row label="Stacking Skis" value={result.stackingSkis} />
                        <Row label="Docking Locks" value={result.dockingLocks} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <Row label="Ground-support items" value="Not included" />
                )}
              </Summary>
            </div>
          </section>

        </section>
      </div>
    </main>
  );
}

function PanelStepper({
  value,
  onChange,
  measurement,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  measurement: string;
  ariaLabel: string;
}) {
  return (
    <div className="stepper" aria-label={ariaLabel}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label={`Decrease ${ariaLabel}`}>
        -
      </button>
      <input
        className="control-input"
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(event) => onChange(clampWholeNumber(Number(event.target.value), value))}
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label={`Increase ${ariaLabel}`}>
        +
      </button>
      <small>{measurement}</small>
    </div>
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
