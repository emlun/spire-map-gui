import React, { useState } from 'react';
import _ from 'underscore';

import { MapMode } from 'types/state';

import styles from './MapModeSelector.module.css';


interface Props {
  mapMode?: MapMode,
  setMapMode: (value: MapMode) => void,
  onReset?: () => void,
}

export default function MapModeSelector({
  mapMode,
  setMapMode,
  onReset,
}: Props) {
  const [radioId1, ] = useState(_.uniqueId('MapModeSelector-radio-'));
  const [radioId2, ] = useState(_.uniqueId('MapModeSelector-radio-'));

  return <p>
    { 'Map mode: '}

    <input type="radio"
      id={ radioId1 }
      checked={ mapMode === "manual" }
      onChange={ (event) => setMapMode(event.target.checked ? "manual" : "seeded") }
    />
    <label htmlFor={ radioId1 }>Manual</label>

    <input type="radio"
      id={ radioId2 }
      checked={ mapMode === "seeded" }
      onChange={ (event) => setMapMode(event.target.checked ? "seeded" : "manual") }
    />
    <label htmlFor={ radioId2 }>Seeded</label>

    { onReset &&
      <button type="button"
        className={ styles["reset"] }
        onClick={ onReset }
      >
        Reset
      </button>
    }
  </p>;
}
