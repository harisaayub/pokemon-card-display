import { useState, useCallback, useEffect } from 'react';
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
import { TYPE_COLORS, TYPE_HUE } from '../types';
import { ArtPicker } from './ArtPicker';

interface SortableCardProps {
  pokemon: DisplayPokemon;
  cardSize: number;
  crop: Crop;
  onArtClick: (dex: number) => void;
}

function SortableCard({ pokemon, cardSize, crop, onArtClick }: SortableCardProps) {
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

  // Crop: the outer box is the visible (cropped) size
  const visW = 1 - crop.left - crop.right;
  const visH = 1 - crop.top - crop.bottom;
  const naturalH = cardSize * (88 / 63);
  const displayW = Math.round(cardSize * visW);
  const displayH = Math.round(naturalH * visH);
  // Image is scaled up so the full card fills the container, then offset to show only the crop window
  const imgW = cardSize;
  const imgH = naturalH;
  const imgLeft = -Math.round(crop.left * cardSize);
  const imgTop = -Math.round(crop.top * naturalH);

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
              border: '1.5px solid #334',
              position: 'relative',
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
                }}
                loading="lazy"
                draggable={false}
              />
            </div>

            {hasMultiple && (
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
  onSelectArt: (dexNumber: number, cardId: string) => void;
  onReorder: (newList: DisplayPokemon[]) => void;
}

export function CardGrid({
  pokemonList,
  sortMode,
  cardSize,
  crop,
  columns,
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
      // Sort by type hue — reliable without CORS canvas extraction
      setSortedList([...pokemonList].sort((a, b) => {
        const ta = a.cards.find((c) => c.id === a.selectedCardId)?.types?.[0] ?? '';
        const tb = b.cards.find((c) => c.id === b.selectedCardId)?.types?.[0] ?? '';
        const ha = TYPE_HUE[ta] ?? 0;
        const hb = TYPE_HUE[tb] ?? 0;
        if (ha !== hb) return ha - hb;
        return a.dexNumber - b.dexNumber;
      }));
    }
  }, [sortMode, pokemonList]);

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
