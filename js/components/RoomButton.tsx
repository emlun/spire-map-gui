import React from 'react';

import { RoomDef } from 'types/map';

import styles from './RoomButton.module.css';


interface Props {
  isSelected?: boolean,
  room: RoomDef,
  onClick?: () => void,
}

export default function RoomButton({
  isSelected,
  room,
  onClick,
}: Props) {
  return <button type="button"
    className={
      styles["room-button"]
      + ' ' + styles["icon"]
      + ' ' + styles["icon-" + room.typ]
      + (isSelected ? ' ' + styles["selected"] : '')
    }
    onClick={ onClick }
    title={ room.typ }
  >
    { room.typ }
  </button>;
}
