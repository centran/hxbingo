import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';
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
import { GoogleGenerativeAI } from '@google/generative-ai';
import pako from 'pako';

import { FEATURES, API_CONFIG } from './config';
import { SortableSquare } from './SortableSquare';
import { Square } from './Square'; // We'll create a simple static square component
import VideoOverlay from './VideoOverlay';
import Confetti from 'react-confetti';
import CustomizationControls from './CustomizationControls';
import { compressAndResizeImage, estimateDataUrlSize, formatBytes } from './imageUtils';

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

const generateEmptyBoard = (rows, cols, boardId = 1) => {
  const newSquares = [];
  for (let i = 0; i < rows * cols; i++) {
    newSquares.push({
      id: `${boardId}-${i + 1}`,
      text: '',
      isMarked: false,
      image: null,
    });
  }
  return newSquares;
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
  const boardRefs = useRef({});
  const [movingIndex, setMovingIndex] = useState(null);
  const [movingBoardId, setMovingBoardId] = useState(null);
  const [movingPos, setMovingPos] = useState({ x: 0, y: 0 });
  const [movingCellSize, setMovingCellSize] = useState(0);
  const suppressClickRef = useRef(false);
  // State for the board's dimensions
  const [boardSize, setBoardSize] = useState({ rows: 5, cols: 5 });
  // State for multiple boards
  const [boards, setBoards] = useState([]);
  // State to toggle between editing and playing modes
  const [isEditing, setIsEditing] = useState(true);
  // State for the uploaded image to be used as a marker
  const [bingoImage, setBingoImage] = useState(null);
  // State for a message to the user (e.g., "Image uploaded!")
  const [message, setMessage] = useState('');
  // State for custom colors
  const [colors, setColors] = useState(defaultColors);

  // State for the overlay opacity
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [fontSize, setFontSize] = useState(1.8);
  // Default font size: two steps down from max (max 2, step 0.1 => 2 - 0.2 = 1.8)
  // State for the user-provided topic for AI-generated squares
  const [bingoTopic, setBingoTopic] = useState('');
  // State for the user's API key
  const [apiKey, setApiKey] = useState(API_CONFIG.GEMINI_API_KEY);
  // State to track if the AI is generating content
  const [isLoading, setIsLoading] = useState(false);
  const [activeSquareId, setActiveSquareId] = useState(null);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [saveLoadString, setSaveLoadString] = useState('');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [boardsWinningData, setBoardsWinningData] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [isBlackout, setIsBlackout] = useState(false);
  const [hasSeenBlackout, setHasSeenBlackout] = useState(false);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [isBattleModeLock, setIsBattleModeLock] = useState(false);
  const [battleSquares, setBattleSquares] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [highlightedBoardId, setHighlightedBoardId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Function to create a new board with default text
  const initializeBoard = useCallback(() => {
    setBoards([{
      id: Date.now(),
      title: 'Board 1',
      squares: generateEmptyBoard(boardSize.rows, boardSize.cols, Date.now())
    }]);
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

        if (loadedData.boardSize && (loadedData.boards || loadedData.squares) && loadedData.colors) {
        setBoardSize(loadedData.boardSize);
        if (loadedData.boards) {
          setBoards(loadedData.boards);
        } else {
          // Migration for old single-board save data
          setBoards([{
            id: Date.now(),
            title: 'Board 1',
            squares: loadedData.squares
          }]);
        }
        setColors(loadedData.colors);
        setBingoImage(loadedData.bingoImage || null);
        setOverlayOpacity(loadedData.overlayOpacity || 0.8);
        setFontSize(loadedData.fontSize || 1.8);
        setIsBattleMode(loadedData.isBattleMode || false);
        setIsBattleModeLock(loadedData.isBattleModeLock || false);
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

  const winCheckResults = useMemo(() => {
    if (isEditing || !boards.length) {
      return { results: {}, globalIsBlackout: false };
    }
    const results = {};
    let globalIsBlackout = false;
    boards.forEach(board => {
      const { lines, isBlackout } = checkWin(board.squares, boardSize);
      const indices = new Set(lines.flat());
      const lineIds = lines.map(line => line.sort((a, b) => a - b).join('-'));
      results[board.id] = { winningLines: lineIds, winningSquareIndices: indices, isBlackout };
      if (isBlackout) globalIsBlackout = true;
    });
    return { results, globalIsBlackout };
  }, [boards, boardSize, isEditing]);

  // Effect to check for a win whenever the squares change
  useEffect(() => {
    if (!FEATURES.WIN_DETECTION_ENABLED) return;

    const { results: currentResults, globalIsBlackout } = winCheckResults;

    if (FEATURES.BLACKOUT_EASTER_EGG_ENABLED) {
      if (globalIsBlackout && !hasSeenBlackout) {
        setIsBlackout(true);
        setHasSeenBlackout(true);
      } else if (!globalIsBlackout) {
        setIsBlackout(false);
        setHasSeenBlackout(false);
      }
    }

    let anyNewWin = false;
    Object.keys(currentResults).forEach(boardId => {
      const currentBoardResult = currentResults[boardId];
      const prevBoardResult = boardsWinningData[boardId] || { winningLines: [], winningSquareIndices: new Set() };

      if (currentBoardResult.winningLines.length > prevBoardResult.winningLines.length) {
        anyNewWin = true;
      }
    });

    if (anyNewWin) {
      setShowConfetti(true);
      setMessage('BINGO!');
    }

    setBoardsWinningData(currentResults);
  }, [winCheckResults, boardsWinningData, hasSeenBlackout]);

  // Handler for changing the board dimensions
  const handleBoardSizeChange = (e) => {
    const { value } = e.target;
    const [rows, cols] = value.split('x').map(Number);
    const newSize = { rows, cols };
    setBoardSize(newSize);

    setBoards(currentBoards => currentBoards.map(board => ({
      ...board,
      squares: generateEmptyBoard(newSize.rows, newSize.cols, board.id)
    })));

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

  const addBoard = () => {
    const lastBoard = boards[boards.length - 1];
    const newBoardId = Date.now();
    const newSquares = generateEmptyBoard(boardSize.rows, boardSize.cols, newBoardId);

    if (lastBoard) {
      lastBoard.squares.forEach((sq, i) => {
        if (sq.text) {
          newSquares[i].text = sq.text;
        }
      });
    }

    setBoards([...boards, {
      id: newBoardId,
      title: `Board ${boards.length + 1}`,
      squares: newSquares
    }]);
    setMessage('New board added!');
  };

  const deleteBoard = (boardId) => {
    if (boards.length <= 1) {
      setMessage('Cannot delete the last board.');
      return;
    }
    setBoards(boards.filter(b => b.id !== boardId));
    setMessage('Board deleted.');
  };

  const handleTitleChange = (boardId, newTitle) => {
    setBoards(currentBoards =>
      currentBoards.map(board =>
        board.id === boardId ? { ...board, title: newTitle } : board
      )
    );
  };

  // Handler for text changes in a square's textarea
  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    const index = parseInt(e.target.dataset.index, 10);
    const boardId = parseInt(e.target.dataset.boardId, 10);

    setBoards(currentBoards =>
      currentBoards.map(board =>
        board.id === boardId
          ? {
              ...board,
              squares: board.squares.map((square, i) =>
                i === index ? { ...square, text: newText } : square
              )
            }
          : board
      )
    );
  }, []);

  // Function to shuffle the squares array randomly
  const shuffleSquares = (boardId) => {
    setBoards(currentBoards =>
      currentBoards.map(board => {
        if (board.id === boardId) {
          const shuffledSquares = [...board.squares];
          for (let i = shuffledSquares.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledSquares[i], shuffledSquares[j]] = [shuffledSquares[j], shuffledSquares[i]];
          }
          return { ...board, squares: shuffledSquares };
        }
        return board;
      })
    );
    setMessage('Squares shuffled!');
  };

  const shuffleAllBoards = () => {
    setBoards(currentBoards =>
      currentBoards.map(board => {
        const shuffledSquares = [...board.squares];
        for (let i = shuffledSquares.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledSquares[i], shuffledSquares[j]] = [shuffledSquares[j], shuffledSquares[i]];
        }
        return { ...board, squares: shuffledSquares };
      })
    );
    setMessage('All boards shuffled');
  };

  // Handler for the image file upload
  const handleImageUpload = (eventOrUrl) => {
    let fileOrUrl;
    if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files) {
      fileOrUrl = eventOrUrl.target.files[0];
    } else {
      fileOrUrl = eventOrUrl;
    }

    if (fileOrUrl) {
      if (typeof fileOrUrl === 'string') {
        setBingoImage(fileOrUrl);
        setMessage('Marker image selected!');
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBingoImage(reader.result);
          setMessage('Marker image uploaded!');
        };
        reader.readAsDataURL(fileOrUrl);
      }
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
  const toggleMarked = useCallback((boardId, index) => {
    if (isEditing) return;

    setBoards(currentBoards => {
      const board = currentBoards.find(b => b.id === boardId);
      if (!board) return currentBoards;
      const clickedSquare = board.squares[index];
      if (!clickedSquare) return currentBoards;

      const newMarkedStatus = !clickedSquare.isMarked;
      const searchText = clickedSquare.text.trim().toLowerCase();
      let lockedCount = 0;

      const newBoards = currentBoards.map(b => ({
        ...b,
        squares: b.squares.map((sq, sqIdx) => {
          // If it's the exact square clicked, always toggle it.
          if (b.id === boardId && sq.id === clickedSquare.id) {
            return { ...sq, isMarked: newMarkedStatus };
          }
          // If it has matching non-empty text, handle it.
          if (searchText && sq.text.trim().toLowerCase() === searchText) {
            // If Battle Mode Lock is on and we're unmarking, don't unmark if it's in a winning line
            if (isBattleMode && isBattleModeLock && !newMarkedStatus) {
              const winningIndices = boardsWinningData[b.id]?.winningSquareIndices || new Set();
              if (winningIndices.has(sqIdx)) {
                lockedCount++;
                return sq;
              }
            }
            return { ...sq, isMarked: newMarkedStatus };
          }
          return sq;
        })
      }));

      if (lockedCount > 0) {
        setTimeout(() => {
          setMessage(`${lockedCount} square${lockedCount > 1 ? 's' : ''} remained marked because ${lockedCount > 1 ? 'they are' : 'it is'} in a winning line.`);
        }, 0);
      }

      return newBoards;
    });
  }, [isEditing, isBattleMode, isBattleModeLock, boardsWinningData, setMessage]);

  // Handler for moving a square in a direction
  const handleMoveSquare = useCallback((boardId, index, direction) => {
    if (!isEditing) return;

    // If direction is 'start', enter free-move mode for this square
    if (direction === 'start') {
      const boardEl = boardRefs.current[boardId];
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      const cols = boardSize.cols;
      const cellSize = rect.width / cols;
      const row = Math.floor(index / cols);
      const col = index % cols;
      const centerX = rect.left + col * cellSize + cellSize / 2;
      const centerY = rect.top + row * cellSize + cellSize / 2;
      setMovingCellSize(cellSize);
      setMovingPos({ x: centerX, y: centerY });
      setMovingIndex(index);
      setMovingBoardId(boardId);
      // suppress the click that initiated move so it doesn't immediately place
      suppressClickRef.current = true;
      setMessage('Click to place the square, or press Esc to cancel.');
      return;
    }

    // fallback: support directional moves (kept for compatibility)
    setBoards(currentBoards =>
      currentBoards.map(board => {
        if (board.id === boardId) {
          const newSquares = [...board.squares];
          const { rows, cols } = boardSize;
          let newIndex = index;

          // Calculate new index based on direction
          switch (direction) {
            case 'up':
              if (index >= cols) {
                newIndex = index - cols;
              }
              break;
            case 'down':
              if (index < rows * cols - cols) {
                newIndex = index + cols;
              }
              break;
            case 'left':
              if (index % cols !== 0) {
                newIndex = index - 1;
              }
              break;
            case 'right':
              if ((index + 1) % cols !== 0) {
                newIndex = index + 1;
              }
              break;
            default:
              return board;
          }

          // Swap squares
          if (newIndex !== index) {
            [newSquares[index], newSquares[newIndex]] = [newSquares[newIndex], newSquares[index]];
            setMessage(`Square moved ${direction}!`);
          }
          return { ...board, squares: newSquares };
        }
        return board;
      })
    );
  }, [isEditing, boardSize, setMessage]);

  // Free-move mode: track mouse and handle drop / cancel
  useEffect(() => {
    if (movingIndex === null || movingBoardId === null) return;

    const handleMouseMove = (e) => {
      setMovingPos({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e) => {
      // ignore the first click immediately after starting move
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }

      const boardEl = boardRefs.current[movingBoardId];
      if (!boardEl) {
        setMovingIndex(null);
        setMovingBoardId(null);
        return;
      }
      const rect = boardEl.getBoundingClientRect();
      const cols = boardSize.cols;
      const rows = boardSize.rows;
      const cellSize = rect.width / cols;
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      let col = Math.floor(relX / cellSize);
      let row = Math.floor(relY / cellSize);
      if (col < 0) col = 0;
      if (col >= cols) col = cols - 1;
      if (row < 0) row = 0;
      if (row >= rows) row = rows - 1;
      const dropIndex = row * cols + col;

      setBoards(currentBoards =>
        currentBoards.map(board => {
          if (board.id === movingBoardId) {
            const arr = [...board.squares];
            const item = arr.splice(movingIndex, 1)[0];
            arr.splice(dropIndex, 0, item);
            return { ...board, squares: arr };
          }
          return board;
        })
      );

      setMessage('Square moved!');
      setMovingIndex(null);
      setMovingBoardId(null);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setMovingIndex(null);
        setMovingBoardId(null);
        setMessage('Move canceled');
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [movingIndex, movingBoardId, boardSize]);

  // Handler for uploading an image to a specific square
  const handleSquareImageUpload = useCallback(async (boardId, index, file) => {
    try {
      const compressedImage = await compressAndResizeImage(file, 200);
      const sizeInBytes = estimateDataUrlSize(compressedImage);
      
      setBoards(currentBoards =>
        currentBoards.map(board =>
          board.id === boardId
            ? {
                ...board,
                squares: board.squares.map((square, i) =>
                  i === index ? { ...square, image: compressedImage } : square
                )
              }
            : board
        )
      );
      
      setMessage(`Image uploaded for square! (${formatBytes(sizeInBytes)})`);
    } catch (error) {
      console.error('Error uploading square image:', error);
      setMessage('Error uploading image. Please try again.');
    }
  }, [setMessage]);

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

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Generate a list of exactly ${boardSize.rows * boardSize.cols} items related to '${bingoTopic}'. The items should be single-word or short phrases, suitable for a BINGO card. Return ONLY a valid JSON array of strings with no additional text. Example format: ["item1", "item2", "item3"]`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse the response to extract the JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const generatedItems = JSON.parse(jsonMatch[0]);
        setBoards(currentBoards => currentBoards.map((board, bIdx) => {
          if (bIdx === 0) {
            return {
              ...board,
              squares: generatedItems.slice(0, boardSize.rows * boardSize.cols).map((item, index) => ({
                id: `${board.id}-${index + 1}`,
                text: item,
                isMarked: false,
                image: null,
              }))
            };
          }
          return board;
        }));
        setMessage('Bingo squares generated for Board 1!');
      } else {
        setMessage('Could not parse generated content. Please try again.');
      }

    } catch (error) {
        console.error('Error generating bingo squares:', error);
        if (error.message && error.message.includes('API key')) {
          setMessage('Invalid API key. Please check your Gemini API key.');
        } else {
          setMessage('Error generating squares. Check the console for details.');
        }
    } finally {
        setIsLoading(false);
    }
  }, [apiKey, bingoTopic, boardSize, isLoading]);

  const handleDragStart = useCallback((event) => {
    setActiveSquareId(event.active.id);
    // Find boardId for the active square
    const boardId = boards.find(b => b.squares.some(s => s.id === event.active.id))?.id;
    setActiveBoardId(boardId);
  }, [boards]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBoards((currentBoards) => {
        return currentBoards.map(board => {
          if (board.id === activeBoardId) {
            const oldIndex = board.squares.findIndex((item) => item.id === active.id);
            const newIndex = board.squares.findIndex((item) => item.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
              return { ...board, squares: arrayMove(board.squares, oldIndex, newIndex) };
            }
          }
          return board;
        });
      });
    }
    setActiveSquareId(null);
    setActiveBoardId(null);
  }, [activeBoardId]);

  const toBase64 = (arr) => btoa(String.fromCharCode.apply(null, arr));
  const fromBase64 = (str) => new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));

  const saveToCookie = useCallback(() => {
    const saveData = {
      boardSize,
      boards,
      colors,
      bingoImage: null, // Always exclude the global image from the cookie
      overlayOpacity,
      fontSize,
      isBattleMode,
      isBattleModeLock,
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
  }, [boardSize, boards, colors, overlayOpacity, fontSize, isBattleMode, isBattleModeLock, battleSquares]);

  const handleSave = useCallback((options = {}) => {
    const { showMessage = true } = options;
    let saveMessage = 'Board saved to text box and cookie!';

    const saveDataForTextbox = {
      boardSize,
      boards,
      colors,
      bingoImage,
      overlayOpacity,
      fontSize,
      isBattleMode,
      isBattleModeLock,
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
            saveMessage = 'Board saved! Global marker image is in the text box but not in the auto-saved cookie. Individual square images are saved in both.';
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
  }, [bingoImage, boardSize, boards, colors, overlayOpacity, fontSize, isBattleMode, isBattleModeLock, battleSquares, saveToCookie]);

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
    const initialBoardId = Date.now();
    setBoards([{
      id: initialBoardId,
      title: 'Board 1',
      squares: generateEmptyBoard(defaultSize.rows, defaultSize.cols, initialBoardId)
    }]);

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
    setFontSize(1.8);
    setIsEditing(true);
    setSaveLoadString('');
    setBingoTopic('');
    setBoardsWinningData({});
    setShowConfetti(false);
    setIsBlackout(false);
    setIsBattleMode(false);
    setIsBattleModeLock(false);

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
  }, [boards, boardSize, colors, overlayOpacity, fontSize, isBattleMode, isBattleModeLock, battleSquares, saveToCookie]);

  const getSquareById = useCallback((id) => {
    for (const board of boards) {
      const sq = board.squares.find(s => s.id === id);
      if (sq) return sq;
    }
    return null;
  }, [boards]);

  const getAvailableMarkedSquares = useCallback(() => {
    let available = [];
    boards.forEach(board => {
      const boardWinningIndices = boardsWinningData[board.id]?.winningSquareIndices || new Set();
      board.squares.forEach((square, index) => {
        if (square.isMarked) {
          if (!isBattleModeLock || !boardWinningIndices.has(index)) {
            available.push({ boardId: board.id, index });
          }
        }
      });
    });
    return available;
  }, [boards, isBattleModeLock, boardsWinningData]);

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

    const availableSquares = getAvailableMarkedSquares();

    if (availableSquares.length === 0) {
      setMessage('No available squares to remove!');
      return;
    }

    setIsSpinning(true);
  }, [isEditing, isSpinning, getAvailableMarkedSquares]);

  useEffect(() => {
    if (!isSpinning) return;

    const availableSquares = getAvailableMarkedSquares();

    if (availableSquares.length === 0) {
      setIsSpinning(false);
      return;
    }

    let spinCount = 0;
    const maxSpins = 10 + Math.floor(Math.random() * 5); // Vary the number of spins
    let currentDelay = 100;

    const spin = () => {
      const randomIndex = Math.floor(Math.random() * availableSquares.length);
      const highlighted = availableSquares[randomIndex];
      setHighlightedIndex(highlighted.index);
      setHighlightedBoardId(highlighted.boardId);

      spinCount++;
      if (spinCount < maxSpins) {
        currentDelay *= 1.2; // Increase delay to slow down
        setTimeout(spin, currentDelay);
      } else {
        // End of spin, start flashing
        let flashCount = 0;
        const maxFlashes = 10; // 5 flashes on and off
        const flashInterval = setInterval(() => {
          setHighlightedIndex(prev => (prev === null ? highlighted.index : null));
          flashCount++;
          if (flashCount >= maxFlashes) {
            clearInterval(flashInterval);
            toggleMarked(highlighted.boardId, highlighted.index);
            setIsSpinning(false);
            setHighlightedIndex(null);
            setHighlightedBoardId(null);
            setMessage('A marked square has been removed!');
          }
        }, 150);
      }
    };

    spin();
  }, [isSpinning, toggleMarked, getAvailableMarkedSquares]);

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
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center font-sans" style={{ backgroundColor: colors.boardBg }}>
      {showConfetti && <Confetti recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}

      {/* The BINGO Boards */}
      <div className="bingo-board-container mb-8">
        {boards.map((board) => (
          <div key={board.id} className="board-wrapper">
            <div className="flex flex-col mb-2">
              <div className="flex items-center justify-between mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={board.title}
                    onChange={(e) => handleTitleChange(board.id, e.target.value)}
                    className="text-xl font-bold bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none px-2 py-1 w-full mr-4"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-center w-full" style={{ color: colors.squareText }}>{board.title}</h2>
                )}
                {isEditing && (
                  <button
                    onClick={() => deleteBoard(board.id)}
                    className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                    title="Delete Board"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div
                ref={(el) => (boardRefs.current[board.id] = el)}
                className="bingo-board flex flex-wrap p-4 rounded-2xl shadow-xl border-4"
                style={{
                  borderColor: colors.squareBorder,
                  backgroundColor: colors.boardBg,
                  width: '100%',
                }}
              >
                {FEATURES.DND_ENABLED && isEditing ? (
                  <SortableContext items={board.squares.map(s => s.id)} strategy={rectSortingStrategy}>
                    {board.squares.map((square, index) => (
                      <SortableSquare
                        key={square.id}
                        id={square.id}
                        square={square}
                        index={index}
                        boardId={board.id}
                        squareBg={colors.squareBg}
                        squareBorder={colors.squareBorder}
                        squareText={colors.squareText}
                        markedOverlay={colors.markedOverlay}
                        bingoImage={bingoImage}
                        overlayOpacity={overlayOpacity}
                        isEditing={isEditing}
                        handleTextChange={handleTextChange}
                        toggleMarked={() => toggleMarked(board.id, index)}
                        boardSize={boardSize}
                        winningSquareIndices={boardsWinningData[board.id]?.winningSquareIndices || new Set()}
                        isBattleModeLock={isBattleModeLock}
                        fontSize={fontSize}
                        isHighlighted={isSpinning && highlightedBoardId === board.id && highlightedIndex === index}
                        isBeingMoved={movingBoardId === board.id && movingIndex === index}
                        onMoveSquare={(idx, dir) => handleMoveSquare(board.id, idx, dir)}
                        onSquareImageUpload={(file, idx) => handleSquareImageUpload(board.id, idx, file)}
                        setMessage={setMessage}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  board.squares.map((square, index) => (
                    <Square
                      key={square.id}
                      square={square}
                      index={index}
                      boardId={board.id}
                      squareBg={colors.squareBg}
                      squareBorder={colors.squareBorder}
                      squareText={colors.squareText}
                      markedOverlay={colors.markedOverlay}
                      bingoImage={bingoImage}
                      overlayOpacity={overlayOpacity}
                      isEditing={isEditing}
                      handleTextChange={handleTextChange}
                      toggleMarked={() => toggleMarked(board.id, index)}
                      boardSize={boardSize}
                      winningSquareIndices={boardsWinningData[board.id]?.winningSquareIndices || new Set()}
                      isBattleModeLock={isBattleModeLock}
                      fontSize={fontSize}
                      isHighlighted={isSpinning && highlightedBoardId === board.id && highlightedIndex === index}
                      isBeingMoved={movingBoardId === board.id && movingIndex === index}
                      onMoveSquare={(idx, dir) => handleMoveSquare(board.id, idx, dir)}
                      onSquareImageUpload={(file, idx) => handleSquareImageUpload(board.id, idx, file)}
                      setMessage={setMessage}
                    />
                  ))
                )}
              </div>
              {movingBoardId === board.id && movingIndex !== null && boardRefs.current[board.id] && (
                (() => {
                  const rect = boardRefs.current[board.id].getBoundingClientRect();
                  const left = movingPos.x - rect.left - (movingCellSize / 2);
                  const top = movingPos.y - rect.top - (movingCellSize / 2);
                  const sq = board.squares[movingIndex];
                  return (
                    <div style={{ position: 'absolute', left, top, width: movingCellSize, height: movingCellSize, pointerEvents: 'none', zIndex: 60 }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: sq?.image ? `url(${sq.image})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.squareBg,
                        border: `2px solid ${colors.squareBorder}`,
                        borderRadius: 8,
                      }}>
                        {!sq?.image && <span style={{ color: colors.squareText, fontSize: `${fontSize}em` }}>{sq?.text}</span>}
                      </div>
                    </div>
                  );
                })()
              )}
              <DragOverlay>
                {activeSquareId && activeBoardId === board.id ? (
                  <Square
                    square={getSquareById(activeSquareId)}
                    boardSize={boardSize}
                    squareBg={colors.squareBg}
                    squareBorder={colors.squareBorder}
                    squareText={colors.squareText}
                    markedOverlay={colors.markedOverlay}
                    bingoImage={bingoImage}
                    overlayOpacity={overlayOpacity}
                    isEditing={isEditing}
                    winningSquareIndices={boardsWinningData[board.id]?.winningSquareIndices || new Set()}
                    fontSize={fontSize}
                    isHighlighted={true}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ))}

        {isEditing && (
          <div className="flex items-center justify-center">
            <button
              onClick={addBoard}
              className="w-16 h-16 rounded-full bg-indigo-600 text-white text-4xl flex items-center justify-center hover:scale-110 transition-all shadow-lg"
              title="Add New Board"
            >
              +
            </button>
          </div>
        )}
      </div>

      {FEATURES.BLACKOUT_EASTER_EGG_ENABLED && isBlackout && (
        <VideoOverlay
          src="/hxbingo/blackout.mp4"
          onClose={() => setIsBlackout(false)}
        />
      )}

      {FEATURES.BATTLE_MODE_ENABLED && isBattleMode && (
        <div className="mt-8 w-full" style={{ maxWidth: '800px' }}>
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
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
            className="w-full py-2 px-4 rounded-lg font-bold shadow-md hover:scale-105 transition-all duration-200 mb-4"
          >
            {isEditing ? 'Start Playing' : 'Edit Board'}
          </button>
          {FEATURES.BATTLE_MODE_ENABLED && (
            <div className="flex items-center justify-center mb-4">
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
          {FEATURES.BATTLE_MODE_ENABLED && isBattleMode && (
            <div className="flex items-center justify-center mb-4">
              <label htmlFor="battle-mode-lock-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" id="battle-mode-lock-toggle" className="sr-only" checked={isBattleModeLock} onChange={() => setIsBattleModeLock(!isBattleModeLock)} />
                  <div className="block bg-gray-700 w-14 h-8 rounded-full"></div>
                  <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                </div>
                <div className="ml-3 text-gray-700 font-medium">
                  Lock Winning Squares
                </div>
              </label>
            </div>
          )}
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
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-sm font-medium text-gray-700">Shuffle Board</label>
            <button
              onClick={shuffleAllBoards}
              style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
              className="w-full py-2 px-4 rounded-lg font-bold shadow-md text-xs hover:scale-105 transition-all duration-200"
            >
              SHUFFLE ALL
            </button>
            <div className="grid grid-cols-2 gap-2">
              {boards.map((board, idx) => (
                <button
                  key={board.id}
                  onClick={() => shuffleSquares(board.id)}
                  style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
                  className="py-2 px-4 rounded-lg font-bold shadow-md text-xs hover:scale-105 transition-all duration-200"
                >
                  Board {idx + 1}
                </button>
              ))}
            </div>
          </div>
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
        <CustomizationControls
          colors={colors}
          setColors={setColors}
          bingoImage={bingoImage}
          handleImageUpload={handleImageUpload}
          handleRemoveImage={handleRemoveImage}
          fileInputRef={fileInputRef}
          overlayOpacity={overlayOpacity}
          setOverlayOpacity={setOverlayOpacity}
          fontSize={fontSize}
          setFontSize={setFontSize}
        />
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
