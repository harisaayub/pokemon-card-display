import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DisplayPokemon, SortMode, Crop } from '../types';
import { TYPE_COLORS } from '../types';
import { ArtPicker } from './ArtPicker';
import { getAverageColor, rgbToHsl } from '../utils/colorExtract';

// 10 distinct colours that read well on dark backgrounds
const ISLAND_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#51cf66', '#339af0',
  '#cc5de8', '#f06595', '#20c997', '#a9e34b', '#74c0fc',
];

interface IslandInfo {
  rank: number;   // 1 = largest island
  size: number;
  color: string;
}

function computeIslands(
  list: DisplayPokemon[],
  collected: Set<number>,
  columns: number,
): Map<number, IslandInfo> {
  const n = list.length;
  const visited = new Uint8Array(n);
  const islands: number[][] = [];

  const isCollected = (i: number) => i >= 0 && i < n && collected.has(list[i].dexNumber);

  const neighbors = (i: number): number[] => {
    const col = i % columns;
    const out: number[] = [];
    if (col > 0)            out.push(i - 1);
    if (col < columns - 1)  out.push(i + 1);
    if (i >= columns)        out.push(i - columns);
    if (i + columns < n)     out.push(i + columns);
    return out;
  };

  for (let start = 0; start < n; start++) {
    if (!isCollected(start) || visited[start]) continue;
    const island: number[] = [];
    const queue = [start];
    visited[start] = 1;
    while (queue.length) {
      const cur = queue.shift()!;
      island.push(cur);
      for (const nb of neighbors(cur)) {
        if (!visited[nb] && isCollected(nb)) {
          visited[nb] = 1;
          queue.push(nb);
        }
      }
    }
    islands.push(island);
  }

  // Largest island first
  islands.sort((a, b) => b.length - a.length);

  const result = new Map<number, IslandInfo>();
  islands.forEach((members, rank) => {
    const info: IslandInfo = { rank: rank + 1, size: members.length, color: ISLAND_COLORS[rank % ISLAND_COLORS.length] };
    for (const idx of members) {
      result.set(list[idx].dexNumber, info);
    }
  });
  return result;
}

interface SortableCardProps {
  pokemon: DisplayPokemon;
  cardSize: number;
  crop: Crop;
  cleanView: boolean;
  collected: boolean;
  island: IslandInfo | null;
  onArtClick: (dex: number) => void;
}

function SortableCard({ pokemon, cardSize, crop, cleanView, collected, island, onArtClick }: SortableCardProps) {
  const card = pokemon.cards.find((c) => c.id === pokemon.selectedCardId) ?? pokemon.cards[0];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(pokemon.dexNumber) });

  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const hasMultiple = pokemon.cards.length > 1;
  const typeColor = card?.types?.[0] ? TYPE_COLORS[card.types[0]] ?? '#888' : '#888';

  const visW = 1 - crop.left - crop.right;
  const visH = 1 - crop.top - crop.bottom;
  const naturalH = cardSize * (88 / 63);
  const displayW = Math.round(cardSize * visW);
  const displayH = Math.round(naturalH * visH);
  const imgW = cardSize;
  const imgH = naturalH;
  const imgLeft = -Math.round(crop.left * cardSize);
  const imgTop = -Math.round(crop.top * naturalH);

  // In island mode: dim cards that aren't collected
  const dimmed = island === null && !collected ? false : (island !== null && !island) ? true : false;
  // If islands mode is active (island prop could be null meaning "no island for this card")
  // We detect islands mode by whether the parent passed a non-undefined island value
  // — handled via the showIslands prop flow: always pass IslandInfo|null when on

  const borderColor = island ? island.color : '#334';
  const borderWidth = island ? 2 : 1.5;

  return (
    <div ref={setNodeRef} style={wrapperStyle} {...attributes}>
      <div
        style={{ width: displayW, cursor: 'grab', position: 'relative', userSelect: 'none' }}
        {...listeners}
      >
        {card ? (
          <>
            {/* Crop container */}
            <div style={{
              width: displayW,
              height: displayH,
              overflow: 'hidden',
              borderRadius: 3,
              border: `${borderWidth}px solid ${borderColor}`,
              position: 'relative',
              boxShadow: island ? `0 0 6px 1px ${island.color}55` : undefined,
            }}>
              <img
                src={card.imageSmall}
                alt={card.name}
                style={{
                  position: 'absolute',
                  width: imgW,
                  height: imgH,
                  left: imgLeft,
                  top: imgTop,
                  display: 'block',
                  opacity: dimmed ? 0.35 : 1,
                }}
                loading="lazy"
                draggable={false}
              />
            </div>

            {/* Island badge — replaces plain ✓ when islands mode on */}
            {island ? (
              <div style={{
                position: 'absolute',
                top: 3,
                left: 3,
                background: island.color,
                color: '#000',
                fontSize: 8,
                borderRadius: 3,
                padding: '1px 3px',
                fontWeight: 800,
                pointerEvents: 'none',
                lineHeight: 1.3,
                opacity: 0.92,
              }}>
                {island.rank}
                <span style={{ fontSize: 7, fontWeight: 400, marginLeft: 1 }}>/{island.size}</span>
              </div>
            ) : collected ? (
              <div style={{
                position: 'absolute',
                top: 3,
                left: 3,
                background: 'rgba(0,180,80,0.85)',
                color: '#fff',
                fontSize: 8,
                borderRadius: 3,
                padding: '1px 3px',
                fontWeight: 700,
                pointerEvents: 'none',
                lineHeight: 1.3,
              }}>✓</div>
            ) : null}

            {hasMultiple && !cleanView && (
              <div
                onClick={(e) => { e.stopPropagation(); onArtClick(pokemon.dexNumber); }}
                title={`${pokemon.cards.length} arts available`}
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  background: 'rgba(0,0,0,0.75)',
                  color: '#cef',
                  fontSize: 9,
                  borderRadius: 4,
                  padding: '1px 4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  pointerEvents: 'auto',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {pokemon.cards.length}
              </div>
            )}

            {!cleanView && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                  padding: '8px 4px 2px',
                  borderRadius: '0 0 3px 3px',
                  fontSize: Math.max(8, cardSize * 0.09),
                  color: '#eef',
                  textAlign: 'center',
                  lineHeight: 1.1,
                  pointerEvents: 'none',
                }}
              >
                <span style={{ color: typeColor, fontWeight: 600 }}>#{pokemon.dexNumber}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: displayW, height: displayH,
            background: '#1a1a2e', borderRadius: 4, border: '1px dashed #334',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#445', fontSize: 10,
          }}>
            #{pokemon.dexNumber}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  pokemonList: DisplayPokemon[];
  sortMode: SortMode;
  cardSize: number;
  crop: Crop;
  columns: number;
  cleanView: boolean;
  showIslands: boolean;
  collected: Set<number>;
  onSelectArt: (dexNumber: number, cardId: string) => void;
  onReorder: (newList: DisplayPokemon[]) => void;
}

export function CardGrid({
  pokemonList,
  sortMode,
  cardSize,
  crop,
  columns,
  cleanView,
  showIslands,
  collected,
  onSelectArt,
  onReorder,
}: Props) {
  const [pickerDex, setPickerDex] = useState<number | null>(null);
  const [sortedList, setSortedList] = useState<DisplayPokemon[]>(pokemonList);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (sortMode === 'dex') {
      setSortedList([...pokemonList].sort((a, b) => a.dexNumber - b.dexNumber));
    } else if (sortMode === 'type') {
      setSortedList([...pokemonList].sort((a, b) => {
        const ta = a.cards.find((c) => c.id === a.selectedCardId)?.types?.[0] ?? '';
        const tb = b.cards.find((c) => c.id === b.selectedCardId)?.types?.[0] ?? '';
        if (ta !== tb) return ta.localeCompare(tb);
        return a.dexNumber - b.dexNumber;
      }));
    } else if (sortMode === 'color') {
      Promise.all(
        pokemonList.map(async (p) => {
          const card = p.cards.find((c) => c.id === p.selectedCardId) ?? p.cards[0];
          const rgb = await getAverageColor(card?.imageSmall ?? '', crop);
          return { pokemon: p, hsl: rgbToHsl(...rgb) };
        }),
      ).then((items) => {
        items.sort((a, b) => {
          const dh = a.hsl[0] - b.hsl[0];
          if (Math.abs(dh) > 0.015) return dh;
          return b.hsl[1] - a.hsl[1];
        });
        setSortedList(items.map((i) => i.pokemon));
      });
    }
  }, [sortMode, pokemonList, crop]);

  const islandMap = useMemo(
    () => showIslands ? computeIslands(sortedList, collected, columns) : null,
    [showIslands, sortedList, collected, columns],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setSortedList((prev) => {
        const oldIdx = prev.findIndex((p) => String(p.dexNumber) === active.id);
        const newIdx = prev.findIndex((p) => String(p.dexNumber) === over.id);
        const next = arrayMove(prev, oldIdx, newIdx);
        onReorder(next);
        return next;
      });
    },
    [onReorder],
  );

  const pickerPokemon = pickerDex != null ? pokemonList.find((p) => p.dexNumber === pickerDex) : null;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sortedList.map((p) => String(p.dexNumber))}
          strategy={rectSortingStrategy}
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, max-content)`, gap: 4 }}>
            {sortedList.map((pokemon) => (
              <SortableCard
                key={pokemon.dexNumber}
                pokemon={pokemon}
                cardSize={cardSize}
                crop={crop}
                cleanView={cleanView}
                collected={collected.has(pokemon.dexNumber)}
                island={islandMap ? (islandMap.get(pokemon.dexNumber) ?? null) : null}
                onArtClick={(dex) => setPickerDex(dex)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {pickerPokemon && (
        <ArtPicker
          cards={pickerPokemon.cards}
          selectedId={pickerPokemon.selectedCardId}
          onSelect={(id) => onSelectArt(pickerPokemon.dexNumber, id)}
          onClose={() => setPickerDex(null)}
        />
      )}
    </>
  );
}
