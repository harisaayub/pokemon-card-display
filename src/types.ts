export interface Card {
  id: string;
  name: string;
  dexNumbers: number[];
  types: string[];
  imageSmall: string;
  imageLarge: string;
  setId: string;
  setName: string;
  setReleaseDate: string;
  number: string;
}

export interface CardsData {
  fetchedAt: string;
  cards: Card[];
  byDex: Record<number, Card[]>;
}

export type SortMode = 'dex' | 'type' | 'color';

export type ArtPreference = 'latest' | 'earliest';

export interface Crop {
  top: number;    // 0–1 fraction
  bottom: number;
  left: number;
  right: number;
}

export type ColumnsMode = 'auto' | 'manual' | 'fit-to-frame';

export interface DisplaySettings {
  columnsMode: ColumnsMode;
  manualColumns: number;
  targetWidthMm: number;
  targetHeightMm: number;
}

export interface SelectedArts {
  // dexNumber -> card id
  [dexNumber: number]: string;
}

export interface DisplayPokemon {
  dexNumber: number;
  cards: Card[];
  selectedCardId: string;
}

export interface Display {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const GENERATIONS: { label: string; min: number; max: number }[] = [
  { label: 'Gen I', min: 1, max: 151 },
  { label: 'Gen II', min: 152, max: 251 },
  { label: 'Gen III', min: 252, max: 386 },
  { label: 'Gen IV', min: 387, max: 493 },
  { label: 'Gen V', min: 494, max: 649 },
  { label: 'Gen VI', min: 650, max: 721 },
  { label: 'Gen VII', min: 722, max: 809 },
  { label: 'Gen VIII', min: 810, max: 905 },
  { label: 'Gen IX', min: 906, max: 1025 },
];

export const TYPE_COLORS: Record<string, string> = {
  Fire: '#EE8130',
  Water: '#6390F0',
  Grass: '#7AC74C',
  Electric: '#F7D02C',
  Psychic: '#F95587',
  Ice: '#96D9D6',
  Dragon: '#6F35FC',
  Dark: '#705746',
  Fairy: '#D685AD',
  Normal: '#A8A77A',
  Fighting: '#C22E28',
  Flying: '#A98FF3',
  Poison: '#A33EA1',
  Ground: '#E2BF65',
  Rock: '#B6A136',
  Bug: '#A6B91A',
  Ghost: '#735797',
  Steel: '#B7B7CE',
  Colorless: '#A8A77A',
  Lightning: '#F7D02C',
  Metal: '#B7B7CE',
};

// Hue (0–360) per type, used for color sort without canvas/CORS
export const TYPE_HUE: Record<string, number> = {
  Fire: 25,
  Lightning: 50,
  Electric: 50,
  Grass: 110,
  Bug: 90,
  Water: 210,
  Ice: 190,
  Psychic: 330,
  Fairy: 320,
  Poison: 290,
  Ghost: 270,
  Dragon: 255,
  Dark: 30,
  Fighting: 10,
  Ground: 40,
  Rock: 45,
  Flying: 230,
  Steel: 220,
  Metal: 220,
  Normal: 0,
  Colorless: 0,
};

// Standard Pokemon card dimensions in mm
export const CARD_WIDTH_MM = 63;
export const CARD_HEIGHT_MM = 88;
