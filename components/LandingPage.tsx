import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-4">
      <div className="bg-slate-950/40 backdrop-blur-md p-8 md:p-12 rounded-2xl shadow-2xl shadow-purple-500/20 border border-purple-500/30">
        <h1 
          className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-400 font-display animate-pulse" 
          style={{textShadow: '0 0 15px rgba(236, 72, 153, 0.6), 0 0 25px rgba(168, 85, 247, 0.4)'}}
        >
          AI Vision Board
        </h1>
        <p className="mt-4 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
          Where brilliant ideas meet stunning visuals. Brainstorm, define, and bring your vision to life with the power of generative AI.
        </p>
        <button
          onClick={onEnter}
          className="mt-10 px-8 py-4 text-xl font-semibold rounded-full bg-gradient-to-br from-pink-600 via-purple-600 to-blue-500 text-white orb-pulse focus:outline-none focus:ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950 transition-transform transform hover:scale-105"
        >
          Enter The Vision
        </button>
      </div>
    </div>
  );
};

export default LandingPage;