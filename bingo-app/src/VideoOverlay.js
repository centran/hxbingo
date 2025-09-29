import React from 'react';

const VideoOverlay = ({ src, onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ position: 'relative', width: '80%', maxWidth: '960px' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '0px',
            background: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          &times;
        </button>
        <video
          src={src}
          controls
          autoPlay
          style={{ width: '100%', maxHeight: '80vh' }}
          onEnded={onClose}
        />
      </div>
    </div>
  );
};

export default VideoOverlay;