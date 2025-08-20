
import React, { useState } from 'react';

interface FloatingMenuProps {
  onSetView: (view: 'board' | 'family') => void;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({ onSetView }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (view: 'board' | 'family') => {
    onSetView(view);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {/* Menu Pop-up */}
        {isOpen && (
          <div className="absolute bottom-full right-0 mb-4 w-48 bg-slate-900/90 backdrop-blur-md rounded-lg border border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
            <nav className="flex flex-col p-2">
              <button
                onClick={() => handleNavigation('board')}
                className="text-left w-full px-4 py-2 rounded-md text-slate-200 hover:bg-purple-600 hover:text-white transition-colors"
              >
                Vision Board
              </button>
              <button
                onClick={() => handleNavigation('family')}
                className="text-left w-full px-4 py-2 rounded-md text-slate-200 hover:bg-purple-600 hover:text-white transition-colors"
              >
                AI Family
              </button>
            </nav>
          </div>
        )}

        {/* Floating Orb Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-600 via-purple-600 to-blue-500 text-white flex items-center justify-center orb-pulse focus:outline-none focus:ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950"
          aria-label="Open navigation menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {/* A simple icon inside the orb */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FloatingMenu;
