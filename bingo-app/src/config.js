// This file contains feature flags for the application.
// Set DND_ENABLED to false to disable the new drag-and-drop functionality.
export const FEATURES = {
  DND_ENABLED: true,
  WIN_DETECTION_ENABLED: true,
  BATTLE_MODE_ENABLED: true,
  BLACKOUT_EASTER_EGG_ENABLED: true,
};

// API Configuration
export const API_CONFIG = {
  GEMINI_API_KEY: process.env.REACT_APP_GEMINI_API_KEY || '', // Set via .env file
};
