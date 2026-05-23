import { useEffect, useRef } from 'react';
import type { Card } from '../types';

interface Props {
  cards: Card[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ArtPicker({ cards, selectedId, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #445',
        borderRadius: 12,
        padding: 20,
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <div style={{ color: '#ccd', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
          {cards[0]?.name} — {cards.length} art{cards.length !== 1 ? 's' : ''}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 10,
        }}>
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => { onSelect(card.id); onClose(); }}
              style={{
                cursor: 'pointer',
                border: card.id === selectedId ? '2px solid #7af' : '2px solid transparent',
                borderRadius: 8,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
              title={`${card.setName} #${card.number}`}
            >
              <img
                src={card.imageSmall}
                alt={card.name}
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
              <div style={{ fontSize: 10, color: '#889', padding: '3px 4px', textAlign: 'center', lineHeight: 1.3 }}>
                {card.setName}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
