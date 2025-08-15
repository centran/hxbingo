import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const SortableSquare = React.memo(({ id, square, index, colors, bingoImage, overlayOpacity, isEditing, handleTextChange, toggleMarked, boardSize, winningSquareIndices }) => {
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
    <div ref={setNodeRef} style={style} {...attributes} className={winningSquareIndices.has(index) ? 'winning-square' : ''}>
      <div
        onClick={() => toggleMarked(index)}
        style={{
            backgroundColor: colors.squareBg,
            borderColor: colors.squareBorder,
            color: colors.squareText,
            backgroundImage: square.isMarked && bingoImage ? `url(${bingoImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            width: '100%',
            aspectRatio: '1 / 1',
        }}
        className="relative flex items-center justify-center text-center rounded-lg transition-all duration-200 border-2"
      >
        {isEditing && (
          <div
            {...listeners}
            className="absolute top-1 right-1 p-1 cursor-grab rounded-full hover:bg-gray-200"
            style={{ color: colors.squareText, zIndex: 20 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle>
            </svg>
          </div>
        )}
        {square.isMarked && (
            <div
                className="absolute inset-0 rounded-lg"
                style={{backgroundColor: colors.markedOverlay, opacity: overlayOpacity}}
            ></div>
        )}
        {isEditing ? (
          <textarea
            className="w-full h-full text-center p-1 bg-transparent resize-none border-none focus:outline-none focus:ring-0"
            value={square.text}
            onChange={(e) => handleTextChange(index, e)}
            style={{ color: colors.squareText, zIndex: 10 }}
          />
        ) : (
          <p className="text-sm font-semibold leading-tight z-10">{square.text}</p>
        )}
      </div>
    </div>
  );
});
