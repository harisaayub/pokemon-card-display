import { useState, useMemo, useCallback } from 'react';
import type { Card, DisplayPokemon } from '../types';

interface Props {
  pokemonInDisplay: DisplayPokemon[];
  byDex: Record<number, Card[]>;
  collected: Set<number>;
  onToggle: (dex: number) => void;
  onClear: () => void;
}

function getBaseName(dex: number, byDex: Record<number, Card[]>): string {
  const cards = byDex[dex] ?? [];
  if (!cards.length) return `#${dex}`;
  return cards.reduce((s, c) => (c.name.length < s.length ? c.name : s), cards[0].name);
}

export function CollectionPanel({ pokemonInDisplay, byDex, collected, onToggle, onClear }: Props) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  // Build name → dex lookup from all available card names
  const nameToDex = useMemo(() => {
    const map = new Map<string, number>();
    for (const [dexStr, cards] of Object.entries(byDex)) {
      const dex = Number(dexStr);
      for (const card of cards) {
        const full = card.name.toLowerCase().trim();
        map.set(full, dex);
        const first = full.split(/[\s-]/)[0];
        if (!map.has(first)) map.set(first, dex);
      }
    }
    return map;
  }, [byDex]);

  const missing = useMemo(
    () => pokemonInDisplay.filter((p) => !collected.has(p.dexNumber)).sort((a, b) => a.dexNumber - b.dexNumber),
    [pokemonInDisplay, collected],
  );

  const handleSubmit = useCallback(() => {
    const raw = input.trim();
    if (!raw) return;

    const tokens = raw.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    let found = 0;
    let notFound: string[] = [];

    for (const token of tokens) {
      const asNum = parseInt(token, 10);
      if (!isNaN(asNum) && byDex[asNum]) {
        onToggle(asNum);
        found++;
      } else {
        const dex = nameToDex.get(token.toLowerCase());
        if (dex != null) {
          onToggle(dex);
          found++;
        } else {
          notFound.push(token);
        }
      }
    }

    setFeedback(
      notFound.length
        ? `Toggled ${found}. Not found: ${notFound.join(', ')}`
        : `Toggled ${found}`,
    );
    setInput('');
    setTimeout(() => setFeedback(null), 3000);
  }, [input, byDex, nameToDex, onToggle]);

  const collectedInDisplay = pokemonInDisplay.filter((p) => collected.has(p.dexNumber)).length;

  const missingText = missing
    .map((p) => `#${String(p.dexNumber).padStart(3, '0')} ${getBaseName(p.dexNumber, byDex)}`)
    .join('\n');

  const copyMissing = () => {
    navigator.clipboard.writeText(missingText).catch(() => {});
  };

  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
      padding: '12px 16px', fontSize: 13, color: '#aab',
    }}>
      <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 10, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Collection</span>
        <span style={{ fontSize: 12, fontWeight: 400, color: missing.length === 0 ? '#7f7' : '#fa7' }}>
          {collectedInDisplay} / {pokemonInDisplay.length}
        </span>
      </div>

      {/* Input */}
      <div style={{ marginBottom: 8 }}>
        <textarea
          placeholder={'Enter dex numbers or names,\none per line or comma-separated'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0d0d1a', border: '1px solid #334', borderRadius: 5,
            color: '#eef', fontSize: 11, fontFamily: 'monospace',
            padding: '5px 7px', resize: 'vertical',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: feedback ? 6 : 10 }}>
        <button onClick={handleSubmit} style={actionBtnStyle('#5577ff')}>
          Toggle have
        </button>
        <button
          onClick={() => {
            if (confirm('Clear all collected marks?')) onClear();
          }}
          style={actionBtnStyle('#553')}
        >
          Clear all
        </button>
      </div>

      {feedback && (
        <div style={{ fontSize: 11, color: '#7af', marginBottom: 8 }}>{feedback}</div>
      )}

      {/* Missing list toggle */}
      <button
        onClick={() => setShowMissing((v) => !v)}
        style={{
          width: '100%', background: 'transparent', border: '1px solid #334',
          borderRadius: 5, color: '#889', fontSize: 11, cursor: 'pointer',
          padding: '4px 8px', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between',
        }}
      >
        <span>Missing ({missing.length})</span>
        <span>{showMissing ? '▲' : '▼'}</span>
      </button>

      {showMissing && (
        <div style={{ marginTop: 6 }}>
          {missing.length === 0 ? (
            <div style={{ fontSize: 11, color: '#7f7', padding: '4px 0' }}>All collected!</div>
          ) : (
            <>
              <button onClick={copyMissing} style={{ ...actionBtnStyle('#334'), marginBottom: 6, width: '100%' }}>
                Copy list
              </button>
              <div style={{
                maxHeight: 200, overflowY: 'auto',
                background: '#0d0d1a', borderRadius: 5, padding: '4px 6px',
                fontSize: 11, fontFamily: 'monospace', color: '#aab',
                border: '1px solid #223',
              }}>
                {missing.map((p) => (
                  <div
                    key={p.dexNumber}
                    onClick={() => onToggle(p.dexNumber)}
                    style={{
                      padding: '1px 0', cursor: 'pointer', display: 'flex', gap: 6,
                    }}
                    title="Click to mark collected"
                  >
                    <span style={{ color: '#556' }}>#{String(p.dexNumber).padStart(3, '0')}</span>
                    <span>{getBaseName(p.dexNumber, byDex)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = (bg: string): React.CSSProperties => ({
  flex: 1,
  padding: '4px 8px',
  background: bg,
  border: 'none',
  borderRadius: 5,
  color: '#eef',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
});
