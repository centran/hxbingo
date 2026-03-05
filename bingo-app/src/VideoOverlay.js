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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ position: 'relative', width: '90%', height: '90%' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'white',
            color: 'black',
            border: '2px solid black',
            borderRadius: '50%',
            width: '35px',
            height: '35px',
            fontSize: '24px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
          }}
        >
          &times;
        </button>
        <video
          src={src}
          controls
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.75rem' }}
          onEnded={onClose}
        />
      </div>
    </div>
  );
};

export default VideoOverlay;