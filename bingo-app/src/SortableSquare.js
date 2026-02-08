import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SquareContextMenu from './SquareContextMenu';

export const SortableSquare = React.memo(({ id, square, index, squareBg, squareBorder, squareText, markedOverlay, bingoImage, overlayOpacity, isEditing, handleTextChange, toggleMarked, boardSize, winningSquareIndices, fontSize, onMoveSquare, onSquareImageUpload, setMessage, isBeingMoved = false }) => {
  const {
    attributes,
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
    <div ref={setNodeRef} style={style} {...attributes} className={winningSquareIndices.has(index) ? 'winning-square' : ''}>
      <div
        onClick={toggleMarked}
        data-index={index}
        style={{
          backgroundColor: squareBg,
          borderColor: squareBorder,
          color: squareText,
          backgroundImage: (isEditing && square.image) || square.image || (square.isMarked && bingoImage) ? `url(${square.image || bingoImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          aspectRatio: '1 / 1',
          opacity: isBeingMoved ? 0.25 : 1,
          pointerEvents: isBeingMoved ? 'none' : 'auto',
        }}
        className="relative flex items-center justify-center text-center rounded-lg transition-all duration-200 border-2"
      >
        {isEditing && onMoveSquare && onSquareImageUpload && (
          <SquareContextMenu
            index={index}
            onMove={onMoveSquare}
            onImageUpload={onSquareImageUpload}
            squareText={square.text}
            setMessage={setMessage}
          />
        )}
        {square.isMarked && (
            <div
                className="absolute inset-0 rounded-lg"
                style={{backgroundColor: markedOverlay, opacity: overlayOpacity}}
            ></div>
        )}
        {isEditing ? (
          <textarea
            className="w-full h-full text-center p-1 bg-transparent resize-none border-none focus:outline-none focus:ring-0"
            value={square.text}
            onChange={handleTextChange}
            data-index={index}
            style={{ color: squareText, zIndex: 10, fontSize: `${fontSize}em` }}
          />
        ) : (
          <p className="text-sm font-semibold leading-tight z-10" style={{ fontSize: `${fontSize}em` }}>{square.text}</p>
        )}
      </div>
    </div>
  );
});
