import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import pako from 'pako';

import { FEATURES } from './config';
import { SortableSquare } from './SortableSquare';
import { Square } from './Square'; // We'll create a simple static square component
import VideoOverlay from './VideoOverlay';
import Confetti from 'react-confetti';

// Debounce function to limit the rate of function execution
const debounce = (func, delay) => {
  let timeoutId;
  return function(...args) {
    const context = this;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(context, args), delay);
  };
};

const checkWin = (squares, boardSize) => {
  const { rows, cols } = boardSize;
  const lines = [];

  // Blackout check - all squares are marked
  const isBlackout = squares.length > 0 && squares.every(s => s.isMarked);

  // Horizontal
  for (let r = 0; r < rows; r++) {
    const line = [];
    for (let c = 0; c < cols; c++) {
      line.push(r * cols + c);
    }
    if (line.every(i => squares[i]?.isMarked)) {
      lines.push(line);
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    const line = [];
    for (let r = 0; r < rows; r++) {
      line.push(r * cols + c);
    }
    if (line.every(i => squares[i]?.isMarked)) {
      lines.push(line);
    }
  }

  // Diagonals (only if it's a square board)
  if (rows === cols) {
    const diag1 = [];
    const diag2 = [];
    for (let i = 0; i < rows; i++) {
      diag1.push(i * cols + i);
      diag2.push(i * cols + (cols - 1 - i));
    }
    if (diag1.every(i => squares[i]?.isMarked)) {
      lines.push(diag1);
    }
    if (diag2.every(i => squares[i]?.isMarked)) {
      lines.push(diag2);
    }
  }

  return { lines, isBlackout };
};

const defaultColors = {
  boardBg: '#ffffff',
  squareBg: '#f3f4f6',
  squareText: '#1f2937',
  squareBorder: '#d1d5db',
  buttonBg: '#4f46e5',
  buttonText: '#ffffff',
  markedOverlay: '#d1d5db',
};

const App = () => {
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);
  const autoSaveCallback = useRef(() => {});
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
  const [colors, setColors] = useState(defaultColors);
  const [draftColors, setDraftColors] = useState(colors);

  useEffect(() => {
    setDraftColors(colors);
  }, [colors]);

  // State for the overlay opacity
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [fontSize, setFontSize] = useState(1);
  // State for the user-provided topic for AI-generated squares
  const [bingoTopic, setBingoTopic] = useState('');
  // State for the user's API key
  const [apiKey, setApiKey] = useState('');
  // State to track if the AI is generating content
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [saveLoadString, setSaveLoadString] = useState('');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [winningLines, setWinningLines] = useState([]);
  const [winningSquareIndices, setWinningSquareIndices] = useState(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleSquares, setBattleSquares] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Function to create a new board with default text
  const initializeBoard = useCallback(() => {
    const newSquares = [];
    for (let i = 0; i < boardSize.rows * boardSize.cols; i++) {
      newSquares.push({
        id: i + 1,
        text: `Square ${i + 1}`,
        isMarked: false,
      });
    }
    setSquares(newSquares);
  }, [boardSize.rows, boardSize.cols]);

  const initializeBattleBoard = useCallback(() => {
    const newBattleSquares = [];
    for (let i = 0; i < boardSize.cols; i++) {
      newBattleSquares.push({
        id: `battle-${i}`,
        text: `Battle ${i + 1}`,
        isMarked: false,
      });
    }
    setBattleSquares(newBattleSquares);
  }, [boardSize.cols]);

  const loadBoard = useCallback((encodedString) => {
    if (!encodedString) {
      return;
    }
    try {
      const decoded = fromBase64(encodedString);
      const decompressed = pako.inflate(decoded, { to: 'string' });
      const loadedData = JSON.parse(decompressed);

      if (loadedData.boardSize && loadedData.squares && loadedData.colors) {
        setBoardSize(loadedData.boardSize);
        setSquares(loadedData.squares);
        setColors(loadedData.colors);
        setBingoImage(loadedData.bingoImage || null);
        setOverlayOpacity(loadedData.overlayOpacity || 0.8);
        setFontSize(loadedData.fontSize || 1);
        setIsBattleMode(loadedData.isBattleMode || false);
        setBattleSquares(loadedData.battleSquares || []);
        setMessage('Board loaded successfully!');
      } else {
        throw new Error("Invalid save data structure.");
      }
    } catch (error) {
      console.error("Failed to load board:", error);
      setMessage('Could not load board. The code is invalid.');
    }
  }, []);

  // Effect to initialize or load the board from a cookie
  useEffect(() => {
    const getCookie = (name) => {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
          let cookie = cookies[i].trim();
          if (cookie.startsWith(name + '=')) {
              return cookie.substring(name.length + 1);
          }
      }
      return null;
    };
    const savedBoardData = getCookie('bingoBoard');
    if (savedBoardData) {
      loadBoard(savedBoardData);
    } else {
      initializeBoard();
      if (FEATURES.BATTLE_MODE_ENABLED) {
        initializeBattleBoard();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const winCheckResult = useMemo(() => {
    if (isEditing || !squares.length) {
      return { winningLines: [], winningSquareIndices: new Set(), isBlackout: false };
    }
    const { lines, isBlackout } = checkWin(squares, boardSize);
    const indices = new Set(lines.flat());
    const lineIds = lines.map(line => line.sort((a, b) => a - b).join('-'));
    return { winningLines: lineIds, winningSquareIndices: indices, isBlackout };
  }, [squares, boardSize, isEditing]);

  // Effect to check for a win whenever the squares change
  useEffect(() => {
    if (!FEATURES.WIN_DETECTION_ENABLED) return;

    const { winningLines: currentWinningLineIds, winningSquareIndices: allCurrentWinningIndices, isBlackout: currentIsBlackout } = winCheckResult;

    if (FEATURES.BLACKOUT_EASTER_EGG_ENABLED) {
      setIsBlackout(currentIsBlackout);
    }

    const newWinningSquareIndicesString = JSON.stringify(Array.from(allCurrentWinningIndices).sort());
    const oldWinningSquareIndicesString = JSON.stringify(Array.from(winningSquareIndices).sort());

    if (newWinningSquareIndicesString !== oldWinningSquareIndicesString) {
      setWinningSquareIndices(allCurrentWinningIndices);
    }

    if (JSON.stringify(currentWinningLineIds) !== JSON.stringify(winningLines)) {
      const newLinesFound = currentWinningLineIds.length > winningLines.length;
      if (newLinesFound) {
        setShowConfetti(true);
        setMessage('BINGO!');
      }
      setWinningLines(currentWinningLineIds);
    }
  }, [winCheckResult, winningLines, winningSquareIndices]);

  // Handler for changing the board dimensions
  const handleBoardSizeChange = (e) => {
    const { value } = e.target;
    const [rows, cols] = value.split('x').map(Number);
    const newSize = { rows, cols };
    setBoardSize(newSize);

    const newSquares = [];
    for (let i = 0; i < newSize.rows * newSize.cols; i++) {
      newSquares.push({
        id: i + 1,
        text: `Square ${i + 1}`,
        isMarked: false,
      });
    }
    setSquares(newSquares);

    if (FEATURES.BATTLE_MODE_ENABLED) {
        const newBattleSquares = [];
        for (let i = 0; i < newSize.cols; i++) {
          newBattleSquares.push({
            id: `battle-${i}`,
            text: `Battle ${i + 1}`,
            isMarked: false,
          });
        }
        setBattleSquares(newBattleSquares);
    }
  };

  // Handler for text changes in a square's textarea
  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    const index = parseInt(e.target.dataset.index, 10);
    setSquares(currentSquares =>
      currentSquares.map((square, i) =>
        i === index ? { ...square, text: newText } : square
      )
    );
  }, []);

  // Function to shuffle the squares array randomly
  const shuffleSquares = () => {
    const shuffledSquares = [...squares];
    for (let i = shuffledSquares.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSquares[i], shuffledSquares[j]] = [shuffledSquares[j], shuffledSquares[i]];
    }
    setSquares(shuffledSquares);
    setMessage('Squares shuffled!');
  };

  // Handler for the image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBingoImage(reader.result);
        setMessage('Marker image uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBingoImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    setMessage('Marker image removed!');
  };

  // Function to toggle the marked status of a square
  const toggleMarked = useCallback((eventOrIndex) => {
    if (isEditing) return;

    const index = typeof eventOrIndex === 'number'
      ? eventOrIndex
      : parseInt(eventOrIndex.currentTarget.dataset.index, 10);

    if (isNaN(index)) return;

    setSquares(currentSquares =>
      currentSquares.map((square, i) =>
        i === index ? { ...square, isMarked: !square.isMarked } : square
      )
    );
  }, [isEditing]);

  const debouncedSetColors = useMemo(
    () => debounce((newColors) => {
      setColors(newColors);
    }, 200),
    [] // setColors is stable and doesn't need to be a dependency
  );

  // Handler for changing colors
  const handleColorChange = (e) => {
    const { name, value } = e.target;
    const newDraftColors = {
      ...draftColors,
      [name]: value,
    };
    setDraftColors(newDraftColors);
    debouncedSetColors(newDraftColors);
  };

  // Function to generate BINGO square text using the Gemini API
  const generateBingoSquares = useCallback(async () => {
    if (!bingoTopic || !apiKey || isLoading) {
        if (!apiKey) {
            setMessage('Please enter your Gemini API key.');
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
            const newSquares = generatedItems.slice(0, boardSize.rows * boardSize.cols).map((item, index) => ({
                id: index + 1,
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
    }
  }, [apiKey, bingoTopic, boardSize, isLoading]);

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSquares((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  }, []);

  const toBase64 = (arr) => btoa(String.fromCharCode.apply(null, arr));
  const fromBase64 = (str) => new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));

  const saveToCookie = useCallback(() => {
    const saveData = {
      boardSize,
      squares,
      colors,
      bingoImage: null, // Always exclude the image from the cookie
      overlayOpacity,
      fontSize,
      isBattleMode,
      battleSquares,
    };
    try {
      const jsonString = JSON.stringify(saveData);
      const compressed = pako.deflate(jsonString);
      const encoded = toBase64(compressed);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      document.cookie = `bingoBoard=${encoded};expires=${expiryDate.toUTCString()};path=/`;
    } catch (error) {
      console.error("Failed to save board to cookie:", error);
    }
  }, [boardSize, squares, colors, overlayOpacity, fontSize, isBattleMode, battleSquares]);

  const handleSave = useCallback((options = {}) => {
    const { showMessage = true } = options;
    let saveMessage = 'Board saved to text box and cookie!';

    const saveDataForTextbox = {
      boardSize,
      squares,
      colors,
      bingoImage,
      overlayOpacity,
      fontSize,
      isBattleMode,
      battleSquares,
    };

    try {
      const jsonString = JSON.stringify(saveDataForTextbox);
      const compressed = pako.deflate(jsonString);
      const encoded = toBase64(compressed);
      setSaveLoadString(encoded);

      saveToCookie();

      if (showMessage) {
        if (bingoImage) {
            saveMessage = 'Board saved! Marker image is in the text box but not in the auto-saved cookie.';
        }
        setMessage(saveMessage);
      }
    } catch (error)
     {
      console.error("Failed to save board:", error);
      if (showMessage) {
        setMessage('Could not save board.');
      }
    }
  }, [bingoImage, boardSize, squares, colors, overlayOpacity, fontSize, isBattleMode, battleSquares, saveToCookie]);

  const handleLoad = useCallback(() => {
    if (!saveLoadString) {
      setMessage('Please paste a save code first.');
      return;
    }
    loadBoard(saveLoadString);
  }, [saveLoadString, loadBoard]);

  const handleReset = useCallback(() => {
    const defaultSize = { rows: 5, cols: 5 };
    setBoardSize(defaultSize);

    const newSquares = [];
    for (let i = 0; i < defaultSize.rows * defaultSize.cols; i++) {
      newSquares.push({
        id: i + 1,
        text: `Square ${i + 1}`,
        isMarked: false,
      });
    }
    setSquares(newSquares);

    if (FEATURES.BATTLE_MODE_ENABLED) {
        const newBattleSquares = [];
        for (let i = 0; i < defaultSize.cols; i++) {
          newBattleSquares.push({
            id: `battle-${i}`,
            text: `Battle ${i + 1}`,
            isMarked: false,
          });
        }
        setBattleSquares(newBattleSquares);
    }

    setColors(defaultColors);
    setBingoImage(null);
    setOverlayOpacity(0.8);
    setFontSize(1);
    setIsEditing(true);
    setSaveLoadString('');
    setBingoTopic('');
    setWinningLines([]);
    setWinningSquareIndices(new Set());
    setShowConfetti(false);
    setIsBlackout(false);
    setIsBattleMode(false);

    // Clear the cookie
    document.cookie = 'bingoBoard=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';

    setMessage('Board has been reset to default settings.');
  }, []);

  const debouncedGenerateBingoSquares = useMemo(
    () => debounce(generateBingoSquares, 300),
    [generateBingoSquares]
  );

  // Auto-save effect
  useEffect(() => {
    const debouncedSaveToCookie = debounce(saveToCookie, 500);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    debouncedSaveToCookie();

    return () => {
      clearTimeout(debouncedSaveToCookie);
    };
  }, [squares, boardSize, colors, overlayOpacity, fontSize, isBattleMode, battleSquares, saveToCookie]);

  const getSquareById = useCallback((id) => squares.find(s => s.id === id), [squares]);

  const handleBattleTextChange = useCallback((e) => {
    const newText = e.target.value;
    const index = parseInt(e.target.dataset.index, 10);
    setBattleSquares(currentSquares =>
      currentSquares.map((square, i) =>
        i === index ? { ...square, text: newText } : square
      )
    );
  }, []);

  const handleBattleSquareClick = useCallback(() => {
    if (isEditing || isSpinning) return;

    const markedSquaresIndices = squares.reduce((acc, square, index) => {
      if (square.isMarked) {
        acc.push(index);
      }
      return acc;
    }, []);

    if (markedSquaresIndices.length === 0) {
      setMessage('No marked squares to remove!');
      return;
    }

    setIsSpinning(true);
  }, [isEditing, isSpinning, squares]);

  useEffect(() => {
    if (!isSpinning) return;

    const markedSquaresIndices = squares.reduce((acc, square, index) => {
      if (square.isMarked) {
        acc.push(index);
      }
      return acc;
    }, []);

    let spinCount = 0;
    const maxSpins = 10 + Math.floor(Math.random() * 5); // Vary the number of spins
    let currentDelay = 100;

    const spin = () => {
      const randomIndex = Math.floor(Math.random() * markedSquaresIndices.length);
      const highlighted = markedSquaresIndices[randomIndex];
      setHighlightedIndex(highlighted);

      spinCount++;
      if (spinCount < maxSpins) {
        currentDelay *= 1.2; // Increase delay to slow down
        setTimeout(spin, currentDelay);
      } else {
        // End of spin, start flashing
        let flashCount = 0;
        const maxFlashes = 10; // 5 flashes on and off
        const flashInterval = setInterval(() => {
          setHighlightedIndex(prev => (prev === null ? highlighted : null));
          flashCount++;
          if (flashCount >= maxFlashes) {
            clearInterval(flashInterval);
            toggleMarked(highlighted);
            setIsSpinning(false);
            setHighlightedIndex(null);
            setMessage('A marked square has been removed!');
          }
        }, 150);
      }
    };

    spin();
  }, [isSpinning, squares, toggleMarked]);

  // Effect to automatically clear messages after a delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 4000); // Set a longer default timeout

      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen p-8 flex flex-col items-center font-sans" style={{ backgroundColor: colors.boardBg }}>
      {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}

      {/* The BINGO Board */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <div
          className="bingo-board flex flex-wrap p-4 rounded-2xl shadow-xl border-4"
          style={{
            borderColor: colors.squareBorder,
            backgroundColor: colors.boardBg,
            width: '100%',
            maxWidth: '800px',
          }}
        >
          {FEATURES.DND_ENABLED && isEditing ? (
            <SortableContext items={squares.map(s => s.id)} strategy={rectSortingStrategy}>
              {squares.map((square, index) => (
                <SortableSquare
                  key={square.id}
                  id={square.id}
                  square={square}
                  index={index}
                  squareBg={colors.squareBg}
                  squareBorder={colors.squareBorder}
                  squareText={colors.squareText}
                  markedOverlay={colors.markedOverlay}
                  bingoImage={bingoImage}
                  overlayOpacity={overlayOpacity}
                  isEditing={isEditing}
                  handleTextChange={handleTextChange}
                  toggleMarked={toggleMarked}
                  boardSize={boardSize}
                  winningSquareIndices={winningSquareIndices}
                  fontSize={fontSize}
                  isHighlighted={isSpinning && highlightedIndex === index}
                />
              ))}
            </SortableContext>
          ) : (
            squares.map((square, index) => (
              <Square
                key={square.id}
                square={square}
                index={index}
                squareBg={colors.squareBg}
                squareBorder={colors.squareBorder}
                squareText={colors.squareText}
                markedOverlay={colors.markedOverlay}
                bingoImage={bingoImage}
                overlayOpacity={overlayOpacity}
                isEditing={isEditing}
                handleTextChange={handleTextChange}
                toggleMarked={toggleMarked}
                boardSize={boardSize}
                winningSquareIndices={winningSquareIndices}
                fontSize={fontSize}
                isHighlighted={isSpinning && highlightedIndex === index}
              />
            ))
          )}
        </div>
        <DragOverlay>
          {activeId ? (
            <Square
              square={getSquareById(activeId)}
              boardSize={boardSize}
              squareBg={colors.squareBg}
              squareBorder={colors.squareBorder}
              squareText={colors.squareText}
              markedOverlay={colors.markedOverlay}
              bingoImage={bingoImage}
              overlayOpacity={overlayOpacity}
              isEditing={isEditing}
              winningSquareIndices={winningSquareIndices}
              fontSize={fontSize}
              isHighlighted={true}
            />
          ) : null}
        </DragOverlay>
        </DndContext>
        {FEATURES.BLACKOUT_EASTER_EGG_ENABLED && isBlackout && (
          <VideoOverlay
            src="/hxbingo/blackout.mp4"
            onClose={() => setIsBlackout(false)}
          />
        )}
      </div>

      {FEATURES.BATTLE_MODE_ENABLED && isBattleMode && (
        <div className="mt-4 w-full" style={{ maxWidth: '800px' }}>
          <div
            className="bingo-board flex flex-wrap p-2 rounded-2xl shadow-lg border-2"
            style={{
              borderColor: colors.squareBorder,
              backgroundColor: colors.boardBg,
            }}
          >
            {battleSquares.map((square, index) => (
              <Square
                key={square.id}
                square={square}
                index={index}
                squareBg={colors.squareBg}
                squareBorder={colors.squareBorder}
                squareText={colors.squareText}
                bingoImage={null}
                overlayOpacity={overlayOpacity}
                isEditing={isEditing}
                handleTextChange={handleBattleTextChange}
                toggleMarked={handleBattleSquareClick}
                boardSize={{ rows: 1, cols: boardSize.cols }}
                winningSquareIndices={new Set()}
                fontSize={fontSize}
                isBattleSquare={true}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:justify-center w-full max-w-7xl mt-8">
        {/* Board Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
          <h2 className="text-xl font-bold mb-4">Board Settings</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Board Size</label>
            <select
              name="boardSize"
              value={`${boardSize.rows}x${boardSize.cols}`}
              onChange={handleBoardSizeChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition ease-in-out"
            >
              <option value="3x3">3x3</option>
              <option value="4x4">4x4</option>
              <option value="5x5">5x5</option>
              <option value="6x6">6x6</option>
              <option value="7x7">7x7</option>
            </select>
          </div>
          <button
            onClick={shuffleSquares}
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            className="mt-4 w-full py-2 px-4 rounded-lg font-bold shadow-md hover:scale-105 transition-all duration-200"
          >
            Shuffle Board
          </button>
          <hr className="my-4" />
          <div>
            <h3 className="text-lg font-bold mb-2">💾 Save/Load Board</h3>
            <textarea
              className="w-full h-24 p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Copy code from here, or paste code to load."
              value={saveLoadString}
              onChange={(e) => setSaveLoadString(e.target.value)}
            />
            <div className="flex gap-4 mt-2">
              <button onClick={() => handleSave({ showMessage: true })} className="w-full py-2 px-4 rounded-lg font-bold shadow-md text-sm" style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}>
                Save to Text Box
              </button>
              <button onClick={handleLoad} className="w-full py-2 px-4 rounded-lg font-bold shadow-md text-sm" style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}>
                Load from Text Box
              </button>
            </div>
            <button onClick={handleReset} className="mt-2 w-full py-2 px-4 rounded-lg font-bold shadow-md text-sm bg-red-600 hover:bg-red-700 text-white">
              Reset Board
            </button>
          </div>
        </div>

        {/* Customization Controls */}
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
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Font Size</label>
            <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={fontSize}
                onChange={(e) => setFontSize(parseFloat(e.target.value))}
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
          {FEATURES.BATTLE_MODE_ENABLED && (
            <div className="flex items-center justify-center mt-4">
              <label htmlFor="battle-mode-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" id="battle-mode-toggle" className="sr-only" checked={isBattleMode} onChange={() => setIsBattleMode(!isBattleMode)} />
                  <div className="block bg-gray-700 w-14 h-8 rounded-full"></div>
                  <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                </div>
                <div className="ml-3 text-gray-700 font-medium">
                  Battle Mode
                </div>
              </label>
            </div>
          )}
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
        <h2 className="text-xl font-bold mb-4 flex justify-between items-center cursor-pointer" onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}>
          <span>✨ Generate Board Content</span>
          <svg className={`w-6 h-6 transition-transform ${isGeneratorOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </h2>
        {isGeneratorOpen && (
          <div className="space-y-4 mt-4">
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
                onClick={debouncedGenerateBingoSquares}
                disabled={isLoading}
                style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
                className={`py-2 px-6 rounded-lg font-bold shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-all duration-200'}`}
            >
                {isLoading ? 'Generating...' : '✨ Generate BINGO Squares'}
            </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded-xl shadow-lg transition-transform duration-300">
          {message}
        </div>
      )}
    </div>
  );
};

export default App;
