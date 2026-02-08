import React, { useState, useRef, useEffect } from 'react';

const SquareContextMenu = ({
  index,
  onMove,
  onImageUpload,
  squareText,
  onClose,
  setMessage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImageUpload(file, index);
      setIsOpen(false);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleMoveClick = () => {
    // signal to start free-move mode
    onMove(index, 'start');
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-0 right-0 p-1 cursor-pointer rounded-full hover:bg-gray-200 transition-colors z-40"
        title="Square options menu"
        aria-label="Open square menu"
        style={{ width: '24px', height: '24px' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-6 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-max"
        >
          <button
            onClick={handleMoveClick}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium flex items-center gap-2 border-b"
          >
            <span>✥</span> Move
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium flex items-center gap-2"
          >
            <span>🖼️</span> Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      )}
    </>
  );
};

export default SquareContextMenu;
