import React, { useState, useEffect, useMemo } from 'react';

// Debounce function to limit the rate of function execution
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
};

const CustomizationControls = ({
  colors,
  setColors,
  bingoImage,
  handleImageUpload,
  handleRemoveImage,
  fileInputRef,
  overlayOpacity,
  setOverlayOpacity,
  fontSize,
  setFontSize,
}) => {
  const [draftColors, setDraftColors] = useState(colors);
  const [draftOverlayOpacity, setDraftOverlayOpacity] = useState(overlayOpacity);
  const [draftFontSize, setDraftFontSize] = useState(fontSize);

  useEffect(() => {
    setDraftColors(colors);
  }, [colors]);

  useEffect(() => {
    setDraftOverlayOpacity(overlayOpacity);
  }, [overlayOpacity]);

  useEffect(() => {
    setDraftFontSize(fontSize);
  }, [fontSize]);

  const debouncedSetColors = useMemo(
    () => debounce((newColors) => setColors(newColors), 200),
    [setColors]
  );

  const debouncedSetOverlayOpacity = useMemo(
    () => debounce((newOpacity) => setOverlayOpacity(newOpacity), 200),
    [setOverlayOpacity]
  );

  const debouncedSetFontSize = useMemo(
    () => debounce((newSize) => setFontSize(newSize), 200),
    [setFontSize]
  );

  const handleColorChange = (e) => {
    const { name, value } = e.target;
    const newDraftColors = {
      ...draftColors,
      [name]: value,
    };
    setDraftColors(newDraftColors);
    debouncedSetColors(newDraftColors);
  };

  const handleOverlayOpacityChange = (e) => {
    const newOpacity = parseFloat(e.target.value);
    setDraftOverlayOpacity(newOpacity);
    debouncedSetOverlayOpacity(newOpacity);
  };

  const handleFontSizeChange = (e) => {
    const newSize = parseFloat(e.target.value);
    setDraftFontSize(newSize);
    debouncedSetFontSize(newSize);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Customization</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Board BG</label>
          <input type="color" name="boardBg" value={draftColors.boardBg} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, boardBg: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Square BG</label>
          <input type="color" name="squareBg" value={draftColors.squareBg} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, squareBg: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Text Color</label>
          <input type="color" name="squareText" value={draftColors.squareText} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, squareText: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Border Color</label>
          <input type="color" name="squareBorder" value={draftColors.squareBorder} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, squareBorder: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Button BG</label>
          <input type="color" name="buttonBg" value={draftColors.buttonBg} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, buttonBg: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Marker Overlay</label>
          <input type="color" name="markedOverlay" value={draftColors.markedOverlay} onChange={handleColorChange} className="w-full h-8" />
          <button onClick={() => setColors(prev => ({ ...prev, markedOverlay: 'transparent' }))} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Set Transparent</button>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Marker Image
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
          {bingoImage && (
            <button onClick={handleRemoveImage} className="text-sm text-red-500 hover:text-red-700">Remove</button>
          )}
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Marker Opacity</label>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={draftOverlayOpacity}
            onChange={handleOverlayOpacityChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Font Size</label>
        <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={draftFontSize}
            onChange={handleFontSizeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

export default CustomizationControls;