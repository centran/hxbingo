import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const App = () => {
  // State for the board's dimensions
  const [boardSize, setBoardSize] = useState({ rows: 5, cols: 5 });
  // State for the squares, each with text and marked status
  const [squares, setSquares] = useState([]);
  // State to toggle between editing and playing modes
  const [isEditing, setIsEditing] = useState(true);
  // State for the uploaded image to be used as a marker
  const [bingoImage, setBingoImage] = useState(null);
  // State for a message to the user (e.g., "Image uploaded!")
  const [message, setMessage] = useState('');
  // State for custom colors
  const [colors, setColors] = useState({
    boardBg: '#ffffff',
    squareBg: '#f3f4f6',
    squareText: '#1f2937',
    squareBorder: '#d1d5db',
    buttonBg: '#4f46e5',
    buttonText: '#ffffff',
    markedOverlay: '#d1d5db',
  });
  // State for the overlay opacity
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  // State for the user-provided topic for AI-generated squares
  const [bingoTopic, setBingoTopic] = useState('');
  // State for the user's API key
  const [apiKey, setApiKey] = useState('');
  // State to track if the AI is generating content
  const [isLoading, setIsLoading] = useState(false);

  // Function to create a new board with default text
  const initializeBoard = useCallback(() => {
    const newSquares = [];
    for (let i = 0; i < boardSize.rows * boardSize.cols; i++) {
      newSquares.push({
        text: `Square ${i + 1}`,
        isMarked: false,
      });
    }
    setSquares(newSquares);
  }, [boardSize.rows, boardSize.cols]);

  // Effect to initialize the board when the component mounts or board size changes
  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  // Handler for changing the board dimensions
  const handleBoardSizeChange = (e) => {
    const { name, value } = e.target;
    setBoardSize((prev) => ({
      ...prev,
      [name]: Math.max(1, parseInt(value) || 1),
    }));
  };

  // Handler for text changes in a square's textarea
  const handleTextChange = (index, e) => {
    const newSquares = [...squares];
    newSquares[index].text = e.target.value;
    setSquares(newSquares);
  };

  // Function to shuffle the squares array randomly
  const shuffleSquares = () => {
    const shuffledSquares = [...squares];
    for (let i = shuffledSquares.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSquares[i], shuffledSquares[j]] = [shuffledSquares[j], shuffledSquares[i]];
    }
    setSquares(shuffledSquares);
    setMessage('Squares shuffled!');
    setTimeout(() => setMessage(''), 3000);
  };

  // Handler for the image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBingoImage(reader.result);
        setMessage('Marker image uploaded!');
        setTimeout(() => setMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to toggle the marked status of a square
  const toggleMarked = (index) => {
    if (!isEditing) {
      const newSquares = [...squares];
      newSquares[index].isMarked = !newSquares[index].isMarked;
      setSquares(newSquares);
    }
  };

  // Handler for changing colors
  const handleColorChange = (e) => {
    const { name, value } = e.target;
    setColors((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to generate BINGO square text using the Gemini API
  const generateBingoSquares = async () => {
    if (!bingoTopic || !apiKey || isLoading) {
        if (!apiKey) {
            setMessage('Please enter your Gemini API key.');
            setTimeout(() => setMessage(''), 3000);
        }
        return;
    }
    setIsLoading(true);
    setMessage('Generating squares...');

    const prompt = `Generate a list of exactly ${boardSize.rows * boardSize.cols} items related to '${bingoTopic}'. The items should be single-word or short phrases, suitable for a BINGO card. The output should be a JSON array of strings. Do not include any text before or after the JSON.`;
    
    let chatHistory = [];
    chatHistory.push({ role: "user", parts: [{ text: prompt }] });

    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "STRING"
                }
            }
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const result = await response.json();
        const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (jsonText) {
            const generatedItems = JSON.parse(jsonText);
            const newSquares = generatedItems.slice(0, boardSize.rows * boardSize.cols).map(item => ({
                text: item,
                isMarked: false,
            }));
            setSquares(newSquares);
            setMessage('Bingo squares generated!');
        } else {
            setMessage('Could not generate squares. Please try again.');
        }

    } catch (error) {
        console.error('Error generating bingo squares:', error);
        setMessage('Error generating squares. Check the console for details.');
    } finally {
        setIsLoading(false);
        setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleOnDragEnd = (result) => {
    if (!result.destination || !isEditing) {
      return;
    }

    const items = Array.from(squares);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSquares(items);
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center font-sans" style={{ backgroundColor: colors.boardBg }}>
      
      <div className="flex flex-col gap-6 md:flex-row md:justify-center w-full max-w-7xl mb-8">
        {/* Board Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Board Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rows</label>
              <input
                type="number"
                name="rows"
                value={boardSize.rows}
                onChange={handleBoardSizeChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition ease-in-out"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Columns</label>
              <input
                type="number"
                name="cols"
                value={boardSize.cols}
                onChange={handleBoardSizeChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition ease-in-out"
              />
            </div>
          </div>
          <button
            onClick={shuffleSquares}
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            className="mt-4 w-full py-2 px-4 rounded-lg font-bold shadow-md hover:scale-105 transition-all duration-200"
          >
            Shuffle Board
          </button>
        </div>

        {/* Customization Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Customization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Board BG</label>
              <input type="color" name="boardBg" value={colors.boardBg} onChange={handleColorChange} className="w-full h-8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Square BG</label>
              <input type="color" name="squareBg" value={colors.squareBg} onChange={handleColorChange} className="w-full h-8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Text Color</label>
              <input type="color" name="squareText" value={colors.squareText} onChange={handleColorChange} className="w-full h-8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Border Color</label>
              <input type="color" name="squareBorder" value={colors.squareBorder} onChange={handleColorChange} className="w-full h-8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Button BG</label>
              <input type="color" name="buttonBg" value={colors.buttonBg} onChange={handleColorChange} className="w-full h-8" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Marker Overlay</label>
              <input type="color" name="markedOverlay" value={colors.markedOverlay} onChange={handleColorChange} className="w-full h-8" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Marker Opacity</label>
            <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Image Upload and Play/Edit Mode */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Marker & Mode</h2>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Marker Image
          </label>
          <input
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
          />
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            className="mt-4 w-full py-2 px-4 rounded-lg font-bold shadow-md hover:scale-105 transition-all duration-200"
          >
            {isEditing ? 'Start Playing' : 'Edit Board'}
          </button>
        </div>
      </div>

      {/* Gemini API Feature */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 w-full max-w-7xl mb-8">
        <h2 className="text-xl font-bold mb-4">✨ Generate Board Content</h2>
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    Your Gemini API Key
                </label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key here"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition ease-in-out"
                />
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <label className="block text-sm font-medium text-gray-700">
                        Topic for your BINGO squares:
                    </label>
                    <input
                        type="text"
                        value={bingoTopic}
                        onChange={(e) => setBingoTopic(e.target.value)}
                        placeholder="e.g., 'Camping essentials', 'Famous landmarks'"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition ease-in-out"
                    />
                </div>
                <button
                onClick={generateBingoSquares}
                disabled={isLoading}
                style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
                className={`py-2 px-6 rounded-lg font-bold shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-all duration-200'}`}
            >
                {isLoading ? 'Generating...' : '✨ Generate BINGO Squares'}
            </button>
        </div>
        </div>
      </div>
      
      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded-xl shadow-lg transition-transform duration-300">
          {message}
        </div>
      )}

      {/* The BINGO Board */}
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Droppable droppableId="bingo-board">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="bingo-board grid gap-2 p-4 rounded-2xl shadow-xl border-4"
              style={{
                borderColor: colors.squareBorder,
                backgroundColor: colors.boardBg,
                gridTemplateColumns: `repeat(${boardSize.cols}, minmax(0, 1fr))`,
                aspectRatio: `${boardSize.cols} / ${boardSize.rows}`,
                width: '100%',
                maxWidth: '800px',
              }}
            >
              {squares.map((square, index) => (
                <Draggable key={index} draggableId={String(index)} index={index} isDragDisabled={!isEditing}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => toggleMarked(index)}
                      style={{
                        backgroundColor: colors.squareBg,
                        borderColor: colors.squareBorder,
                        color: colors.squareText,
                        backgroundImage: square.isMarked && bingoImage ? `url(${bingoImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundBlendMode: 'overlay',
                        ...provided.draggableProps.style,
                      }}
                      className="relative flex items-center justify-center text-center p-2 rounded-lg transition-all duration-200 border-2"
                    >
                      {/* Overlay to ensure text is visible when marked */}
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
                          style={{ color: colors.squareText }}
                        />
                      ) : (
                        <p className="text-sm font-semibold leading-tight z-10">{square.text}</p>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default App;
