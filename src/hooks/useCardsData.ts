import { useState, useEffect } from 'react';
import type { CardsData } from '../types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: CardsData };

export function useCardsData(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'cards.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CardsData>;
      })
      .then((data) => setState({ status: 'ok', data }))
      .catch(() =>
        setState({
          status: 'error',
          message:
            'cards.json not found. Run: node scripts/fetch-cards.mjs\n\nThen copy src/data/cards.json to public/cards.json',
        }),
      );
  }, []);

  return state;
}
