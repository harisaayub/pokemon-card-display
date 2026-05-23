import { useState } from 'react';
import type { Crop, DisplaySettings } from '../types';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from '../types';

interface Props {
  pokemonCount: number;
  crop: Crop;
  gapMm: number;
  borderMm: number;
  settings: DisplaySettings;
  onSettingsChange: (s: DisplaySettings) => void;
  resolvedColumns: number;
  resolvedRows: number;
  imperial: boolean;
}

export function FrameCalculator({
  pokemonCount,
  crop,
  gapMm,
  borderMm,
  settings,
  onSettingsChange,
  resolvedColumns,
  resolvedRows,
  imperial,
}: Props) {
  const [fitW, setFitW] = useState(600);
  const [fitH, setFitH] = useState(400);

  const cardW = CARD_WIDTH_MM * (1 - crop.left - crop.right);
  const cardH = CARD_HEIGHT_MM * (1 - crop.top - crop.bottom);

  let columns = resolvedColumns;
  let rows = resolvedRows;

  if (settings.columnsMode === 'fit-to-frame') {
    const usableW = settings.targetWidthMm - 2 * borderMm;
    const usableH = settings.targetHeightMm - 2 * borderMm;
    columns = Math.max(1, Math.floor((usableW + gapMm) / (cardW + gapMm)));
    rows = Math.max(1, Math.floor((usableH + gapMm) / (cardH + gapMm)));
  }

  const frameW = columns * cardW + (columns - 1) * gapMm + 2 * borderMm;
  const frameH = rows * cardH + (rows - 1) * gapMm + 2 * borderMm;

  // "How many fit" calculator (always visible, independent of layout mode)
  const fitCols = Math.max(1, Math.floor((fitW - 2 * borderMm + gapMm) / (cardW + gapMm)));
  const fitRows = Math.max(1, Math.floor((fitH - 2 * borderMm + gapMm) / (cardH + gapMm)));
  const fitTotal = fitCols * fitRows;

  const fmt = (mm: number) => imperial
    ? `${(mm / 25.4).toFixed(2)}"`
    : `${(mm / 10).toFixed(1)} cm`;
  const fmtCard = (mm: number) => imperial
    ? `${(mm / 25.4).toFixed(2)}"`
    : `${(mm / 10).toFixed(1)} cm`;

  const fits = settings.columnsMode === 'fit-to-frame' ? columns * rows : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Frame size readout */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
        padding: '12px 16px', fontSize: 13, color: '#aab',
      }}>
        <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 8, fontSize: 14 }}>
          Frame Size
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
          <span style={{ color: '#789' }}>Width</span>
          <span style={{ color: '#eef' }}>{fmt(frameW)}</span>
          <span style={{ color: '#789' }}>Height</span>
          <span style={{ color: '#eef' }}>{fmt(frameH)}</span>
          <span style={{ color: '#789' }}>Grid</span>
          <span style={{ color: '#eef' }}>{columns} × {rows}</span>
          {fits != null && (
            <>
              <span style={{ color: '#789' }}>Fits</span>
              <span style={{ color: fits >= pokemonCount ? '#7f7' : '#fa7' }}>
                {fits} / {pokemonCount}
              </span>
            </>
          )}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#556', borderTop: '1px solid #334', paddingTop: 6 }}>
          {fmtCard(cardW)} × {fmtCard(cardH)} card · {gapMm}mm gap · {borderMm}mm border
        </div>
      </div>

      {/* Layout mode */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
        padding: '12px 16px', fontSize: 13, color: '#aab',
      }}>
        <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 10, fontSize: 14 }}>
          Layout
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {(['auto', 'manual', 'fit-to-frame'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSettingsChange({ ...settings, columnsMode: mode })}
              style={{
                flex: 1, padding: '3px 6px', borderRadius: 5, border: '1px solid',
                borderColor: settings.columnsMode === mode ? '#7af' : '#334',
                cursor: 'pointer', fontSize: 10, fontWeight: 600,
                background: settings.columnsMode === mode ? '#1a2a40' : 'transparent',
                color: settings.columnsMode === mode ? '#7af' : '#667',
              }}
            >
              {mode === 'auto' ? 'Auto' : mode === 'manual' ? 'Columns' : 'Fit to size'}
            </button>
          ))}
        </div>

        {settings.columnsMode === 'manual' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#789', fontSize: 12 }}>Columns</span>
            <input
              type="number" min={1} max={50} value={settings.manualColumns}
              onChange={(e) => onSettingsChange({ ...settings, manualColumns: Math.max(1, Number(e.target.value)) })}
              style={numInputStyle}
            />
            <span style={{ color: '#556', fontSize: 11 }}>
              → {Math.ceil(pokemonCount / settings.manualColumns)} rows
            </span>
          </label>
        )}

        {settings.columnsMode === 'fit-to-frame' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#789', fontSize: 12, minWidth: 36 }}>W (mm)</span>
              <input
                type="number" min={50} max={3000} value={settings.targetWidthMm}
                onChange={(e) => onSettingsChange({ ...settings, targetWidthMm: Number(e.target.value) })}
                style={numInputStyle}
              />
              <span style={{ color: '#556', fontSize: 11 }}>{fmt(settings.targetWidthMm)}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#789', fontSize: 12, minWidth: 36 }}>H (mm)</span>
              <input
                type="number" min={50} max={3000} value={settings.targetHeightMm}
                onChange={(e) => onSettingsChange({ ...settings, targetHeightMm: Number(e.target.value) })}
                style={numInputStyle}
              />
              <span style={{ color: '#556', fontSize: 11 }}>{fmt(settings.targetHeightMm)}</span>
            </label>
          </div>
        )}

        {settings.columnsMode === 'auto' && (
          <div style={{ fontSize: 11, color: '#556' }}>
            Auto-calculates nearest square grid for {pokemonCount} Pokémon
          </div>
        )}
      </div>

      {/* How many fit calculator */}
      <div style={{
        background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
        padding: '12px 16px', fontSize: 13, color: '#aab',
      }}>
        <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 10, fontSize: 14 }}>
          How many fit?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#789', fontSize: 12, minWidth: 36 }}>W (mm)</span>
            <input
              type="number" min={50} max={5000} value={fitW}
              onChange={(e) => setFitW(Math.max(50, Number(e.target.value)))}
              style={numInputStyle}
            />
            <span style={{ color: '#556', fontSize: 11 }}>{fmt(fitW)}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#789', fontSize: 12, minWidth: 36 }}>H (mm)</span>
            <input
              type="number" min={50} max={5000} value={fitH}
              onChange={(e) => setFitH(Math.max(50, Number(e.target.value)))}
              style={numInputStyle}
            />
            <span style={{ color: '#556', fontSize: 11 }}>{fmt(fitH)}</span>
          </label>
        </div>
        <div style={{
          background: '#0d0d1a', borderRadius: 6, padding: '8px 10px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px',
        }}>
          <span style={{ color: '#789', fontSize: 11 }}>Columns</span>
          <span style={{ color: '#eef', fontSize: 11, fontFamily: 'monospace' }}>{fitCols}</span>
          <span style={{ color: '#789', fontSize: 11 }}>Rows</span>
          <span style={{ color: '#eef', fontSize: 11, fontFamily: 'monospace' }}>{fitRows}</span>
          <span style={{ color: '#789', fontSize: 11 }}>Max cards</span>
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
            color: fitTotal >= pokemonCount ? '#7f7' : '#fa7',
          }}>
            {fitTotal}
            {fitTotal < pokemonCount && (
              <span style={{ fontSize: 10, fontWeight: 400, color: '#fa7', marginLeft: 4 }}>
                ({pokemonCount - fitTotal} won't fit)
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

const numInputStyle: React.CSSProperties = {
  width: 68,
  padding: '3px 6px',
  background: '#0d0d1a',
  border: '1px solid #334',
  borderRadius: 5,
  color: '#eef',
  fontSize: 13,
  fontFamily: 'monospace',
};
