import React, { useState } from 'react';
import _ from 'underscore';

import styles from './FloatInput.module.css';


interface Props {
  value: number,
  onChange: (value: number) => void,
}

function FloatInput({
  value,
  onChange,
}: Props) {
  const [rawValue, setRawValue] = useState(value?.toString());
  const onRawChanged = (event: { target: { value: string } }) => {
    setRawValue(event.target.value);
    const parsed = parseFloat(event.target.value);
    if (!_.isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <input type="text"
      className={ styles["FloatInput"]}
      value={ rawValue }
      onChange={ onRawChanged }
    />
  );
}

export default FloatInput;
