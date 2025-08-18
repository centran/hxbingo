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

const getComplementaryColor = (hex) => {
    if (!hex || typeof hex !== 'string') return '#FF0000';

    const hexValue = hex.replace('#', '');
    if (!/^[0-9A-F]{3,6}$/i.test(hexValue)) {
        return '#FF0000'; // Default to red if invalid hex
    }

    let r, g, b;
    if (hexValue.length === 3) {
        r = parseInt(hexValue[0] + hexValue[0], 16);
        g = parseInt(hexValue[1] + hexValue[1], 16);
        b = parseInt(hexValue[2] + hexValue[2], 16);
    } else if (hexValue.length === 6) {
        r = parseInt(hexValue.substring(0, 2), 16);
        g = parseInt(hexValue.substring(2, 4), 16);
        b = parseInt(hexValue.substring(4, 6), 16);
    } else {
        return '#FF0000'; // Fallback for invalid length
    }

    r /= 255; g /= 255; b /= 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
            default: h = 0;
        }
        h /= 6;
    }

    h = (h + 0.5) % 1;

    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
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

  const divStyle = {
      backgroundColor: colors.squareBg,
      borderColor: colors.squareBorder,
      color: colors.squareText,
      backgroundImage: square.isMarked && bingoImage && !isBattleSquare ? `url(${bingoImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: 'overlay',
      width: '100%',
      aspectRatio: '1 / 1',
  };

  if (isHighlighted) {
    divStyle.borderColor = getComplementaryColor(colors.squareBg);
  }

  return (
    <div style={style}>
      <div
        onClick={toggleMarked}
        style={divStyle}
        className={squareClasses}
        data-index={index}
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
            onChange={handleTextChange}
            data-index={index}
            style={{ color: colors.squareText, zIndex: 10, fontSize: `${fontSize}em` }}
          />
        ) : (
          <p className="text-sm font-semibold leading-tight z-10" style={{ fontSize: `${fontSize}em` }}>{square.text}</p>
        )}
      </div>
    </div>
  );
});
