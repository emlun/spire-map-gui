import React from 'react';

import { RoomDef } from 'types/map';

import styles from './RoomButton.module.css';


interface Props {
  room: RoomDef,
  onClick?: () => void,
}

export default function RoomButton({
  room,
  onClick,
}: Props) {
  return <button type="button"
    className={
      styles["room-button"]
      + ' ' + styles["icon"]
      + ' ' + styles["icon-" + room.typ]
    }
    onClick={ onClick }
    title={ room.typ }
  >
    { room.typ }
  </button>;
}
