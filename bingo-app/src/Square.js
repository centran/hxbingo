import React from 'react';

// Helper function to convert hex to rgba, handling potential invalid hex codes gracefully
const hexToRgba = (hex, alpha) => {
  // Ensure hex is a string and remove '#'
  const hexValue = String(hex).replace('#', '');

  // Basic validation for hex code
  if (!/^[0-9A-F]{6}$/i.test(hexValue)) {
    // Return a default color or transparent if the hex is invalid
    return `rgba(200, 200, 200, ${alpha})`; // A neutral grey as a fallback
  }

  const r = parseInt(hexValue.substring(0, 2), 16);
  const g = parseInt(hexValue.substring(2, 4), 16);
  const b = parseInt(hexValue.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
  ].join(' ');

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
                style={{backgroundColor: hexToRgba(colors.markedOverlay, overlayOpacity)}}
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
