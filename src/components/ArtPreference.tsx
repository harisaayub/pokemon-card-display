import type { ArtPreference } from '../types';

interface Props {
  preference: ArtPreference;
  onPreferenceChange: (p: ArtPreference) => void;
  onApply: (scope: 'generation' | 'all') => void;
}

export function ArtPreferencePanel({ preference, onPreferenceChange, onApply }: Props) {
  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
      padding: '12px 16px', fontSize: 13, color: '#aab',
    }}>
      <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 10, fontSize: 14 }}>
        Art Preference
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['latest', 'earliest'] as ArtPreference[]).map((p) => (
          <button
            key={p}
            onClick={() => onPreferenceChange(p)}
            style={{
              flex: 1, padding: '4px 8px', borderRadius: 6,
              border: '1px solid',
              borderColor: preference === p ? '#fa7' : '#334',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: preference === p ? '#2a1a10' : 'transparent',
              color: preference === p ? '#fa7' : '#778',
            }}
          >
            {p === 'latest' ? 'Latest' : 'Earliest'}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#556', marginBottom: 10, lineHeight: 1.5 }}>
        {preference === 'latest'
          ? 'Selects the most recently printed card for each Pokémon.'
          : 'Selects the earliest (original) card for each Pokémon.'}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onApply('generation')}
          style={applyBtnStyle}
        >
          Apply to gen
        </button>
        <button
          onClick={() => onApply('all')}
          style={{ ...applyBtnStyle, borderColor: '#556', color: '#889' }}
        >
          Apply to all
        </button>
      </div>
    </div>
  );
}

const applyBtnStyle: React.CSSProperties = {
  flex: 1, padding: '4px 8px', borderRadius: 6,
  border: '1px solid #7af',
  cursor: 'pointer', fontSize: 11, fontWeight: 600,
  background: '#1a2a40', color: '#7af',
};
