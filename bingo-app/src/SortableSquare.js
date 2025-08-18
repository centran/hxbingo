import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Square } from './Square';

export const SortableSquare = React.memo(({ id, square, index, colors, bingoImage, overlayOpacity, isEditing, handleTextChange, toggleMarked, boardSize, winningSquareIndices, fontSize, isHighlighted }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    boxSizing: 'border-box',
    width: `calc(100% / ${boardSize.cols})`,
    padding: '0.25rem',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Square
        square={square}
        index={index}
        colors={colors}
        bingoImage={bingoImage}
        overlayOpacity={overlayOpacity}
        isEditing={isEditing}
        handleTextChange={handleTextChange}
        toggleMarked={toggleMarked}
        boardSize={boardSize}
        winningSquareIndices={winningSquareIndices}
        fontSize={fontSize}
        isBattleSquare={false}
        isHighlighted={isHighlighted}
      />
    </div>
  );
});
