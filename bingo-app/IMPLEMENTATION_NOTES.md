# Bingo App - Drag and Drop to Context Menu Implementation

## Overview
Replaced the drag-and-drop feature with a hamburger menu (three dots) dropdown that provides move and image upload functionality for individual squares.

## Changes Made

### 1. **New File: imageUtils.js**
   - `compressAndResizeImage()`: Resizes images to fit square dimensions and compresses them as JPEG (0.7 quality)
   - `estimateDataUrlSize()`: Calculates the size of a data URL for display
   - `formatBytes()`: Formats byte sizes into human-readable format (Bytes, KB, MB)
   - Images are centered and maintain aspect ratio with white background fill

### 2. **New File: SquareContextMenu.js**
   - Hamburger menu button (three vertical dots) in the top-right corner of each square
   - Dropdown menu with four move options:
     - Move Up (↑)
     - Move Down (↓)
     - Move Left (←)
     - Move Right (→)
   - Image upload option (🖼️) with file input
   - Menu closes when clicking outside
   - Menu closes after selecting an option

### 3. **Modified: Square.js**
   - Imported `SquareContextMenu` component
   - Updated component signature to accept: `onMoveSquare`, `onSquareImageUpload`, `setMessage`
   - Updated background image logic to prioritize individual square images over global bingoImage
   - Replaced empty hamburger div with `SquareContextMenu` component
   - Displays both individual and global marker images when marked

### 4. **Modified: SortableSquare.js**
   - Imported `SquareContextMenu` component
   - Updated component signature to accept move and image handlers
   - Updated background image logic to support individual square images
   - Replaced drag-and-drop menu icon with `SquareContextMenu` component
   - Removed unused `listeners` variable from useSortable hook

### 5. **Modified: App.js**
   - Imported image utilities: `compressAndResizeImage`, `estimateDataUrlSize`, `formatBytes`
   - Updated square data structure to include `image: null` field
   - Added `handleMoveSquare()` function:
     - Swaps squares in specified direction (up/down/left/right)
     - Respects board boundaries
     - Only works in editing mode
   - Added `handleSquareImageUpload()` function:
     - Compresses and resizes uploaded images
     - Stores in individual square's image field
     - Shows size feedback to user
   - Updated all `Square` and `SortableSquare` renderings to pass new handlers
   - Individual square images are automatically saved/loaded with the board

## Features

### Move Functionality
- Swaps the current square with adjacent squares
- Movement is prevented at board edges
- Available only during editing mode

### Image Upload
- Upload images directly to individual squares
- Automatic resizing to 200x200 pixels
- Automatic compression to JPEG format (70% quality)
- Images fill the square while maintaining aspect ratio
- Size estimation displayed in feedback message
- Individual images take precedence over global marker image

## Data Structure
Each square now contains:
```javascript
{
  id: number,
  text: string,
  isMarked: boolean,
  image: string | null  // Data URL of compressed image
}
```

## Storage & Persistence
- Individual square images are persisted in:
  - Browser cookies (auto-save)
  - Save/Load text box
- Global marker images are not saved in cookies but are included in save/load text box
- All images are base64-encoded data URLs

## Browser Compatibility
- Works in all modern browsers supporting:
  - Canvas API for image resizing/compression
  - FileReader API for image upload
  - Data URLs

## Performance Considerations
- Image compression reduces storage size significantly
- JPEG compression at 70% quality provides good balance between quality and size
- Individual square images are optional - board works normally without them
