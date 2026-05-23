import { useState, useMemo, useCallback } from 'react';
import { useCardsData } from './hooks/useCardsData';
import { CardGrid } from './components/CardGrid';
import { FrameCalculator } from './components/FrameCalculator';
import { CropSettings, type SampleCard } from './components/CropSettings';
import { ArtPreferencePanel } from './components/ArtPreference';
import type { SortMode, SelectedArts, DisplayPokemon, Crop, ArtPreference, DisplaySettings } from './types';
import { GENERATIONS } from './types';

const CARD_SIZES = [
  { label: 'XS', value: 40 },
  { label: 'S', value: 60 },
  { label: 'M', value: 80 },
  { label: 'L', value: 100 },
  { label: 'XL', value: 130 },
];

const DEFAULT_CROP: Crop = { top: 0, bottom: 0, left: 0, right: 0 };
const DEFAULT_DISPLAY: DisplaySettings = {
  columnsMode: 'auto',
  manualColumns: 16,
  targetWidthMm: 600,
  targetHeightMm: 400,
};

export default function App() {
  const state = useCardsData();
  const [genIndex, setGenIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('dex');
  const [selectedArts, setSelectedArts] = useState<SelectedArts>({});
  const [cardSize, setCardSize] = useState(80);
  const [gapMm, setGapMm] = useState(3);
  const [borderMm, setBorderMm] = useState(20);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [artPref, setArtPref] = useState<ArtPreference>('latest');
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY);
  const [customOrder, setCustomOrder] = useState<Record<number, number[]>>({});

  const gen = GENERATIONS[genIndex];

  const pokemonList = useMemo((): DisplayPokemon[] => {
    if (state.status !== 'ok') return [];
    const { byDex } = state.data;

    const dexNumbers: number[] = [];
    for (let n = gen.min; n <= gen.max; n++) {
      if (byDex[n]) dexNumbers.push(n);
    }

    const ordered =
      customOrder[genIndex] && customOrder[genIndex].length === dexNumbers.length
        ? customOrder[genIndex]
        : dexNumbers;

    return ordered.map((dex) => {
      const cards = byDex[dex] ?? [];
      const selectedId = selectedArts[dex] ?? cards[0]?.id ?? '';
      return { dexNumber: dex, cards, selectedCardId: selectedId };
    });
  }, [state, gen, selectedArts, customOrder, genIndex]);

  // Auto column count for 'auto' mode
  const autoColumns = useMemo(() => {
    if (pokemonList.length === 0) return 1;
    const visW = 1 - crop.left - crop.right;
    const visH = 1 - crop.top - crop.bottom;
    const aspect = (88 * visH) / (63 * visW);
    return Math.ceil(Math.sqrt(pokemonList.length * aspect));
  }, [pokemonList.length, crop]);

  const resolvedColumns =
    displaySettings.columnsMode === 'manual'
      ? displaySettings.manualColumns
      : displaySettings.columnsMode === 'auto'
        ? autoColumns
        : (() => {
            const cardW = 63 * (1 - crop.left - crop.right);
            const usableW = displaySettings.targetWidthMm - 2 * borderMm;
            return Math.max(1, Math.floor((usableW + gapMm) / (cardW + gapMm)));
          })();

  const resolvedRows = Math.ceil(pokemonList.length / resolvedColumns);

  const sampleCards = useMemo((): SampleCard[] =>
    pokemonList.map((p) => {
      const card = p.cards.find((c) => c.id === p.selectedCardId) ?? p.cards[0];
      return { label: `#${p.dexNumber} ${card?.name ?? ''}`, imageUrl: card?.imageSmall ?? '' };
    }),
    [pokemonList],
  );

  const handleSelectArt = useCallback((dexNumber: number, cardId: string) => {
    setSelectedArts((prev) => ({ ...prev, [dexNumber]: cardId }));
  }, []);

  const handleReorder = useCallback(
    (newList: DisplayPokemon[]) => {
      setCustomOrder((prev) => ({ ...prev, [genIndex]: newList.map((p) => p.dexNumber) }));
    },
    [genIndex],
  );

  const handleApplyArtPref = useCallback(
    (scope: 'generation' | 'all') => {
      if (state.status !== 'ok') return;
      const { byDex } = state.data;

      const pickCard = (cards: typeof byDex[number]) => {
        if (!cards?.length) return null;
        const sorted = [...cards].sort((a, b) => {
          const da = a.setReleaseDate ?? '';
          const db = b.setReleaseDate ?? '';
          return artPref === 'latest' ? db.localeCompare(da) : da.localeCompare(db);
        });
        return sorted[0].id;
      };

      const ranges =
        scope === 'generation'
          ? [gen]
          : GENERATIONS;

      setSelectedArts((prev) => {
        const next = { ...prev };
        for (const g of ranges) {
          for (let dex = g.min; dex <= g.max; dex++) {
            const id = pickCard(byDex[dex]);
            if (id) next[dex] = id;
          }
        }
        return next;
      });
    },
    [state, gen, artPref],
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', color: '#ccd', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,13,26,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #223',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#eef', whiteSpace: 'nowrap' }}>
          Pokémon Card Display
        </span>

        {/* Generation tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {GENERATIONS.map((g, i) => (
            <button key={i} onClick={() => setGenIndex(i)} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: i === genIndex ? '#5577ff' : '#1a1a30',
              color: i === genIndex ? '#fff' : '#889',
              transition: 'all 0.15s',
            }}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Grid columns control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: '#556' }}>cols</span>
          <button
            onClick={() => {
              const next = Math.max(1, resolvedColumns - 1);
              setDisplaySettings(s => ({ ...s, columnsMode: 'manual', manualColumns: next }));
            }}
            style={gridBtnStyle}
          >−</button>
          <input
            type="number"
            min={1}
            max={100}
            value={resolvedColumns}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value));
              setDisplaySettings(s => ({ ...s, columnsMode: 'manual', manualColumns: v }));
            }}
            style={{
              width: 40, padding: '2px 4px', textAlign: 'center',
              background: '#0d0d1a', border: '1px solid #334', borderRadius: 4,
              color: '#eef', fontSize: 12, fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => {
              const next = resolvedColumns + 1;
              setDisplaySettings(s => ({ ...s, columnsMode: 'manual', manualColumns: next }));
            }}
            style={gridBtnStyle}
          >+</button>
          <span style={{ fontSize: 11, color: '#445' }}>× {resolvedRows}</span>
          <button
            onClick={() => setDisplaySettings(s => ({ ...s, columnsMode: 'auto' }))}
            title="Reset to auto"
            style={{ ...gridBtnStyle, fontSize: 9, padding: '2px 6px', color: displaySettings.columnsMode === 'auto' ? '#7af' : '#445' }}
          >auto</button>
        </div>

        {/* Sort mode */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {(['dex', 'type', 'color'] as SortMode[]).map((mode) => (
            <button key={mode} onClick={() => setSortMode(mode)} style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid',
              borderColor: sortMode === mode ? '#7af' : '#334',
              cursor: 'pointer', fontSize: 12,
              background: sortMode === mode ? '#1a2a40' : 'transparent',
              color: sortMode === mode ? '#7af' : '#778',
              transition: 'all 0.15s',
            }}>
              {mode === 'dex' ? '#' : mode === 'type' ? 'Type' : 'Color'}
            </button>
          ))}
        </div>

        {/* Card size */}
        <div style={{ display: 'flex', gap: 4 }}>
          {CARD_SIZES.map(({ label, value }) => (
            <button key={label} onClick={() => setCardSize(value)} style={{
              padding: '4px 8px', borderRadius: 6, border: '1px solid',
              borderColor: cardSize === value ? '#fa7' : '#334',
              cursor: 'pointer', fontSize: 11,
              background: cardSize === value ? '#2a1a10' : 'transparent',
              color: cardSize === value ? '#fa7' : '#778',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, padding: '16px 20px', alignItems: 'flex-start' }}>
        {/* Main grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {state.status === 'loading' && (
            <div style={{ color: '#778', padding: 40, textAlign: 'center' }}>Loading card data…</div>
          )}
          {state.status === 'error' && (
            <div style={{
              color: '#f88', padding: 32, maxWidth: 560, lineHeight: 1.7,
              background: '#1a0d0d', borderRadius: 8, border: '1px solid #533',
              whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13,
            }}>
              {state.message}
            </div>
          )}
          {state.status === 'ok' && (
            <>
              <div style={{ color: '#556', fontSize: 12, marginBottom: 8 }}>
                {gen.label} · {pokemonList.length} Pokémon · drag to rearrange · click badge to change art
              </div>
              <div style={{ overflowX: 'auto' }}>
                <CardGrid
                  pokemonList={pokemonList}
                  selectedArts={selectedArts}
                  sortMode={sortMode}
                  cardSize={cardSize}
                  crop={crop}
                  columns={resolvedColumns}
                  onSelectArt={handleSelectArt}
                  onReorder={handleReorder}
                />
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
          <FrameCalculator
            pokemonCount={pokemonList.length}
            crop={crop}
            gapMm={gapMm}
            borderMm={borderMm}
            settings={displaySettings}
            onSettingsChange={setDisplaySettings}
            resolvedColumns={resolvedColumns}
            resolvedRows={resolvedRows}
          />

          {/* Gap + border settings */}
          <div style={{
            background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
            padding: '12px 16px', fontSize: 13, color: '#aab',
          }}>
            <div style={{ fontWeight: 600, color: '#ccd', marginBottom: 10, fontSize: 14 }}>
              Spacing
            </div>
            <Slider label="Gap (mm)" value={gapMm} min={0} max={20} onChange={setGapMm} />
            <Slider label="Border (mm)" value={borderMm} min={0} max={100} onChange={setBorderMm} />
          </div>

          <CropSettings crop={crop} onChange={setCrop} sampleCards={sampleCards} />

          <ArtPreferencePanel
            preference={artPref}
            onPreferenceChange={setArtPref}
            onApply={handleApplyArtPref}
          />

          {state.status === 'ok' && (
            <div style={{
              background: '#1a1a2e', border: '1px solid #334', borderRadius: 8,
              padding: '10px 14px', fontSize: 11, color: '#445',
            }}>
              {state.data.cards.length.toLocaleString()} printings · fetched {new Date(state.data.fetchedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const gridBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #334',
  borderRadius: 4,
  color: '#778',
  fontSize: 13,
  cursor: 'pointer',
  padding: '1px 6px',
  lineHeight: 1,
};

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ color: '#789', fontSize: 12 }}>{label}</span>
        <span style={{ color: '#eef', fontSize: 12, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </label>
  );
}
