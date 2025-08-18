import React from 'react';

export const Square = React.memo(({ square, index, colors, bingoImage, overlayOpacity, isEditing, handleTextChange, toggleMarked, boardSize, winningSquareIndices, fontSize, isBattleSquare = false, isHighlighted = false }) => {
  const style = {
    boxSizing: 'border-box',
    width: `calc(100% / ${boardSize.cols})`,
    padding: '0.25rem',
  };

  const squareClasses = [
    'relative', 'flex', 'items-center', 'justify-center', 'text-center', 'rounded-lg', 'transition-all', 'duration-200', 'border-2',
    isBattleSquare ? 'battle-square' : '',
    isHighlighted ? 'highlighted-square' : '',
    winningSquareIndices && winningSquareIndices.has(index) ? 'winning-square' : ''
  ].filter(Boolean).join(' ');

  return (
    <div style={style}>
      <div
        onClick={() => toggleMarked(index)}
        style={{
            backgroundColor: colors.squareBg,
            borderColor: colors.squareBorder,
            color: colors.squareText,
            backgroundImage: square.isMarked && bingoImage && !isBattleSquare ? `url(${bingoImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
            width: '100%',
            aspectRatio: '1 / 1',
        }}
        className={squareClasses}
      >
        {isEditing && (
          <div
            className="absolute top-1 right-1 p-1"
            style={{ color: colors.squareText, zIndex: 20 }}
          >
          </div>
        )}
        {square.isMarked && !isBattleSquare && (
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
            style={{ color: colors.squareText, zIndex: 10, fontSize: `${fontSize}em` }}
          />
        ) : (
          <p className="text-sm font-semibold leading-tight z-10" style={{ fontSize: `${fontSize}em` }}>{square.text}</p>
        )}
      </div>
    </div>
  );
});
