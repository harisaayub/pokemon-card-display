import type { Display } from '../types';

interface Props {
  displays: Display[];
  onChange: (displays: Display[]) => void;
  onClose: () => void;
}

let nextId = Date.now();

export function DisplayEditor({ displays, onChange, onClose }: Props) {
  const update = (id: string, field: keyof Display, value: string | number) => {
    onChange(displays.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const add = () => {
    const last = displays[displays.length - 1];
    const min = last ? last.max + 1 : 1;
    onChange([...displays, { id: String(nextId++), label: `Display ${displays.length + 1}`, min, max: min + 50 }]);
  };

  const remove = (id: string) => {
    if (displays.length <= 1) return;
    onChange(displays.filter((d) => d.id !== id));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          background: '#1a1a2e', border: '1px solid #334', borderRadius: 10,
          padding: '20px 24px', minWidth: 400, maxWidth: 520, maxHeight: '80vh',
          overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#eef' }}>Edit Displays</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#556', marginBottom: 14 }}>
          Each display is a range of Pokémon dex numbers shown as one tab.
        </div>

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 28px', gap: 6, marginBottom: 6, padding: '0 2px' }}>
          <span style={{ fontSize: 11, color: '#556' }}>Label</span>
          <span style={{ fontSize: 11, color: '#556' }}>From #</span>
          <span style={{ fontSize: 11, color: '#556' }}>To #</span>
          <span />
        </div>

        {displays.map((d) => (
          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 70px 28px', gap: 6, marginBottom: 6 }}>
            <input
              value={d.label}
              onChange={(e) => update(d.id, 'label', e.target.value)}
              style={inputStyle}
            />
            <input
              type="number" min={1} max={9999}
              value={d.min}
              onChange={(e) => update(d.id, 'min', Math.max(1, Number(e.target.value)))}
              style={inputStyle}
            />
            <input
              type="number" min={1} max={9999}
              value={d.max}
              onChange={(e) => update(d.id, 'max', Math.max(d.min, Number(e.target.value)))}
              style={inputStyle}
            />
            <button
              onClick={() => remove(d.id)}
              disabled={displays.length <= 1}
              title="Delete"
              style={{
                background: 'transparent', border: '1px solid #334', borderRadius: 4,
                color: displays.length <= 1 ? '#334' : '#866', fontSize: 12,
                cursor: displays.length <= 1 ? 'default' : 'pointer', padding: 0,
              }}
            >✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={add} style={{
            flex: 1, padding: '6px 12px', background: '#1a2a1a',
            border: '1px solid #3a5', borderRadius: 6,
            color: '#7c7', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            + Add display
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: '6px 12px', background: '#5577ff',
            border: 'none', borderRadius: 6,
            color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#0d0d1a',
  border: '1px solid #334',
  borderRadius: 5,
  color: '#eef',
  fontSize: 12,
  padding: '4px 6px',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'monospace',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#556',
  fontSize: 16,
  cursor: 'pointer',
  padding: '2px 6px',
};
