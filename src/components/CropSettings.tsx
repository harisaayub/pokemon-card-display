import { useRef, useEffect, useState, useCallback } from 'react';
import type { Crop } from '../types';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from '../types';

export interface SampleCard {
  label: string;
  imageUrl: string;
}

interface Props {
  crop: Crop;
  onChange: (c: Crop) => void;
  sampleCards?: SampleCard[];
}

const CARD_W = 176;
const CARD_H = Math.round(CARD_W * (88 / 63)); // ≈ 246px
// Minimum fraction that must remain visible on each axis combined
const MIN_VISIBLE = 0.05;

type Edge = keyof Crop;

export function CropSettings({ crop, onChange, sampleCards }: Props) {
  const [symH, setSymH] = useState(false); // left = right
  const [symV, setSymV] = useState(false); // top = bottom
  const [sampleIdx, setSampleIdx] = useState(0);

  const clampedIdx = sampleCards && sampleCards.length > 0
    ? Math.min(sampleIdx, sampleCards.length - 1)
    : 0;
  const sampleImageUrl = sampleCards?.[clampedIdx]?.imageUrl;
  const sampleLabel = sampleCards?.[clampedIdx]?.label ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingEdge = useRef<Edge | null>(null);

  const clampCrop = useCallback((next: Crop): Crop => ({
    top:    Math.max(0, Math.min(next.top,    1 - MIN_VISIBLE - next.bottom)),
    bottom: Math.max(0, Math.min(next.bottom, 1 - MIN_VISIBLE - next.top)),
    left:   Math.max(0, Math.min(next.left,   1 - MIN_VISIBLE - next.right)),
    right:  Math.max(0, Math.min(next.right,  1 - MIN_VISIBLE - next.left)),
  }), []);

  const applyEdge = (edge: Edge, frac: number) => {
    let next = { ...crop, [edge]: frac };
    if (symH && (edge === 'left' || edge === 'right')) {
      next.left = frac;
      next.right = frac;
    }
    if (symV && (edge === 'top' || edge === 'bottom')) {
      next.top = frac;
      next.bottom = frac;
    }
    onChange(clampCrop(next));
  };

  // Auto-detect white border by sampling pixels along each edge
  const [detecting, setDetecting] = useState(false);
  const detectBorder = useCallback(() => {
    if (!sampleImageUrl) return;
    setDetecting(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, W, H).data;

      const px = (x: number, y: number) => {
        const i = (Math.round(y) * W + Math.round(x)) * 4;
        return { r: data[i], g: data[i+1], b: data[i+2] };
      };
      // "border-like" = bright and low-saturation (white/cream/light grey)
      const isBorder = (x: number, y: number) => {
        const { r, g, b } = px(x, y);
        const brightness = (r + g + b) / 3;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        return brightness > 200 && saturation < 40;
      };
      // Sample along the center column / row to find where border ends
      const SAMPLES = 8; // sample at multiple horizontal/vertical positions
      const findEdge = (axis: 'top' | 'bottom' | 'left' | 'right') => {
        let best = 0;
        for (let s = 0; s < SAMPLES; s++) {
          const t = (s + 1) / (SAMPLES + 1);
          let edge = 0;
          if (axis === 'top') {
            const x = W * t;
            for (let y = 0; y < H * 0.5; y++) {
              if (!isBorder(x, y)) { edge = Math.max(edge, y / H); break; }
            }
          } else if (axis === 'bottom') {
            const x = W * t;
            for (let y = H - 1; y > H * 0.5; y--) {
              if (!isBorder(x, y)) { edge = Math.max(edge, (H - 1 - y) / H); break; }
            }
          } else if (axis === 'left') {
            const y = H * t;
            for (let x = 0; x < W * 0.5; x++) {
              if (!isBorder(x, y)) { edge = Math.max(edge, x / W); break; }
            }
          } else {
            const y = H * t;
            for (let x = W - 1; x > W * 0.5; x--) {
              if (!isBorder(x, y)) { edge = Math.max(edge, (W - 1 - x) / W); break; }
            }
          }
          best = Math.max(best, edge);
        }
        return best;
      };

      const detected: Crop = {
        top:    findEdge('top'),
        bottom: findEdge('bottom'),
        left:   findEdge('left'),
        right:  findEdge('right'),
      };
      onChange(clampCrop(detected));
      setDetecting(false);
    };
    img.onerror = () => setDetecting(false);
    img.src = sampleImageUrl;
  }, [sampleImageUrl, onChange, clampCrop]);

  // Pointer events for dragging crop handles on the card preview
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const edge = draggingEdge.current;
      if (!edge || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let frac: number;
      if (edge === 'top')    frac = (e.clientY - rect.top)    / rect.height;
      else if (edge === 'bottom') frac = (rect.bottom - e.clientY) / rect.height;
      else if (edge === 'left')  frac = (e.clientX - rect.left)   / rect.width;
      else                       frac = (rect.right - e.clientX)  / rect.width;
      applyEdge(edge, Math.max(0, frac));
    };
    const onUp = () => { draggingEdge.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const startDrag = (edge: Edge) => (e: React.PointerEvent) => {
    e.preventDefault();
    draggingEdge.current = edge;
  };

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const mm  = (v: number, full: number) => `${(v * full).toFixed(1)}mm`;

  // Handle positions in px
  const topPx    = crop.top    * CARD_H;
  const bottomPx = crop.bottom * CARD_H;
  const leftPx   = crop.left   * CARD_W;
  const rightPx  = crop.right  * CARD_W;

  const HANDLE_HIT = 14; // hit area width/height in px
  const HANDLE_VIS = 2;  // visible line thickness

  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
      padding: '12px 16px', fontSize: 13, color: '#aab',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, color: '#ccd', fontSize: 14 }}>Crop</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SymCheck label="H sym" checked={symH} onChange={setSymH} title="Left = Right" />
          <SymCheck label="V sym" checked={symV} onChange={setSymV} title="Top = Bottom" />
          {sampleImageUrl && (
            <button
              onClick={detectBorder}
              disabled={detecting}
              title="Auto-detect white card border from image"
              style={{
                background: 'transparent', border: '1px solid #556', borderRadius: 4,
                color: detecting ? '#445' : '#7af', fontSize: 10, cursor: detecting ? 'wait' : 'pointer',
                padding: '2px 6px',
              }}
            >
              {detecting ? '…' : 'Detect'}
            </button>
          )}
          <button
            onClick={() => onChange({ top: 0, bottom: 0, left: 0, right: 0 })}
            style={{
              background: 'transparent', border: '1px solid #334', borderRadius: 4,
              color: '#556', fontSize: 10, cursor: 'pointer', padding: '2px 6px',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Card navigation */}
      {sampleCards && sampleCards.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, minWidth: 0 }}>
          <button
            onClick={() => setSampleIdx((i) => (i - 1 + sampleCards.length) % sampleCards.length)}
            style={navBtnStyle}
          >‹</button>
          <span style={{
            flex: 1, fontSize: 11, color: '#889', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sampleLabel}
          </span>
          <button
            onClick={() => setSampleIdx((i) => (i + 1) % sampleCards.length)}
            style={navBtnStyle}
          >›</button>
        </div>
      )}

      {/* Interactive card preview */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: CARD_W,
          height: CARD_H,
          margin: '0 auto 14px',
          borderRadius: 4,
          overflow: 'hidden',
          cursor: 'crosshair',
          touchAction: 'none',
          userSelect: 'none',
          background: '#0d0d1a',
        }}
      >
        {/* Card image */}
        {sampleImageUrl ? (
          <img
            src={sampleImageUrl}
            alt="Sample card"
            style={{ width: CARD_W, height: CARD_H, display: 'block', pointerEvents: 'none' }}
            draggable={false}
          />
        ) : (
          <div style={{ width: CARD_W, height: CARD_H, background: '#1a2040' }} />
        )}

        {/* Dark overlay for cropped regions */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* top */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topPx, background: 'rgba(0,0,0,0.6)' }} />
          {/* bottom */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: bottomPx, background: 'rgba(0,0,0,0.6)' }} />
          {/* left */}
          <div style={{ position: 'absolute', top: topPx, bottom: bottomPx, left: 0, width: leftPx, background: 'rgba(0,0,0,0.6)' }} />
          {/* right */}
          <div style={{ position: 'absolute', top: topPx, bottom: bottomPx, right: 0, width: rightPx, background: 'rgba(0,0,0,0.6)' }} />
        </div>

        {/* Keep-region border */}
        <div style={{
          position: 'absolute',
          top: topPx, bottom: bottomPx, left: leftPx, right: rightPx,
          border: '1.5px solid #7af',
          pointerEvents: 'none',
        }} />

        {/* Drag handles */}
        {/* Top */}
        <Handle
          style={{ top: topPx - HANDLE_HIT / 2, left: 0, right: 0, height: HANDLE_HIT, cursor: 'row-resize' }}
          lineStyle={{ top: HANDLE_HIT / 2 - HANDLE_VIS / 2, left: 0, right: 0, height: HANDLE_VIS }}
          onPointerDown={startDrag('top')}
        />
        {/* Bottom */}
        <Handle
          style={{ bottom: bottomPx - HANDLE_HIT / 2, left: 0, right: 0, height: HANDLE_HIT, cursor: 'row-resize' }}
          lineStyle={{ bottom: HANDLE_HIT / 2 - HANDLE_VIS / 2, left: 0, right: 0, height: HANDLE_VIS }}
          onPointerDown={startDrag('bottom')}
        />
        {/* Left */}
        <Handle
          style={{ left: leftPx - HANDLE_HIT / 2, top: 0, bottom: 0, width: HANDLE_HIT, cursor: 'col-resize' }}
          lineStyle={{ left: HANDLE_HIT / 2 - HANDLE_VIS / 2, top: 0, bottom: 0, width: HANDLE_VIS }}
          onPointerDown={startDrag('left')}
        />
        {/* Right */}
        <Handle
          style={{ right: rightPx - HANDLE_HIT / 2, top: 0, bottom: 0, width: HANDLE_HIT, cursor: 'col-resize' }}
          lineStyle={{ right: HANDLE_HIT / 2 - HANDLE_VIS / 2, top: 0, bottom: 0, width: HANDLE_VIS }}
          onPointerDown={startDrag('right')}
        />
      </div>

      {/* Numeric readouts + fine-tune sliders */}
      {(
        [
          { key: 'top'    as Edge, label: 'Top',    fullMm: CARD_HEIGHT_MM },
          { key: 'bottom' as Edge, label: 'Bottom', fullMm: CARD_HEIGHT_MM },
          { key: 'left'   as Edge, label: 'Left',   fullMm: CARD_WIDTH_MM  },
          { key: 'right'  as Edge, label: 'Right',  fullMm: CARD_WIDTH_MM  },
        ] as const
      ).map(({ key, label, fullMm }) => {
        const maxFrac = key === 'top' || key === 'bottom'
          ? Math.max(0, 1 - MIN_VISIBLE - crop[key === 'top' ? 'bottom' : 'top'])
          : Math.max(0, 1 - MIN_VISIBLE - crop[key === 'left' ? 'right' : 'left']);
        return (
          <label key={key} style={{ display: 'block', marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: '#789', fontSize: 11 }}>{label}</span>
              <span style={{ color: '#eef', fontSize: 11, fontFamily: 'monospace' }}>
                {pct(crop[key])} · {mm(crop[key], fullMm)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxFrac}
              step={0.001}
              value={crop[key]}
              onChange={(e) => applyEdge(key, Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
        );
      })}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #334',
  borderRadius: 4,
  color: '#7af',
  fontSize: 16,
  cursor: 'pointer',
  padding: '0 6px',
  lineHeight: 1.4,
  flexShrink: 0,
};

function Handle({
  style,
  lineStyle,
  onPointerDown,
}: {
  style: React.CSSProperties;
  lineStyle: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      style={{ position: 'absolute', ...style }}
      onPointerDown={onPointerDown}
    >
      <div style={{
        position: 'absolute',
        background: '#7af',
        ...lineStyle,
      }} />
    </div>
  );
}

function SymCheck({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <label title={title} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#7af', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 11, color: checked ? '#7af' : '#556' }}>{label}</span>
    </label>
  );
}
