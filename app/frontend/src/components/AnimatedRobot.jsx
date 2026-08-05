import React from 'react';

export default function AnimatedRobot({ className }) {
  return (
    <svg 
      viewBox="-20 -20 240 240" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          @keyframes shadow-pulse {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(0.7); opacity: 0.1; }
          }
          @keyframes wave {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-25deg); }
            75% { transform: rotate(25deg); }
          }
          @keyframes blink {
            0%, 2%, 100% { transform: scaleY(1); }
            1% { transform: scaleY(0.1); }
          }
          @keyframes bubble-pop {
            0%, 15% { transform: scale(0) rotate(-10deg); opacity: 0; }
            20% { transform: scale(1.1) rotate(2deg); opacity: 1; }
            25%, 75% { transform: scale(1) rotate(0deg); opacity: 1; }
            80% { transform: scale(1.1) rotate(2deg); opacity: 1; }
            85%, 100% { transform: scale(0) rotate(-10deg); opacity: 0; }
          }
          .animate-float { animation: float 3s ease-in-out infinite; transform-origin: center; }
          .animate-shadow { animation: shadow-pulse 3s ease-in-out infinite; transform-origin: center; }
          .animate-wave { animation: wave 2.5s ease-in-out infinite; transform-origin: 60px 110px; }
          .animate-blink { animation: blink 4s infinite; transform-origin: center; }
          .animate-bubble { animation: bubble-pop 6s ease-in-out infinite; transform-origin: 55px 55px; }
        `}
      </style>
      
      {/* Floor Shadow */}
      <ellipse cx="100" cy="170" rx="40" ry="6" fill="#0F52BA" className="animate-shadow" />
      
      <g className="animate-float">
        {/* Arm (Left - waving) */}
        <path d="M 70 110 Q 30 120, 35 85" stroke="#bae6fd" strokeWidth="10" strokeLinecap="round" className="animate-wave" />
        
        {/* Arm (Right) */}
        <path d="M 130 110 Q 160 120, 155 140" stroke="#bae6fd" strokeWidth="10" strokeLinecap="round" />
        
        {/* Body */}
        <rect x="65" y="95" width="70" height="55" rx="27.5" fill="#e0f2fe" />
        
        {/* Body Details (little belly lines) */}
        <path d="M 85 130 L 115 130" stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" />
        
        {/* Neck */}
        <rect x="90" y="85" width="20" height="15" fill="#cbd5e1" />
        
        {/* Head */}
        <rect x="55" y="45" width="90" height="50" rx="25" fill="#e0f2fe" />
        
        {/* Face/Screen */}
        <rect x="65" y="55" width="70" height="26" rx="10" fill="#0f172a" />
        
        {/* Eyes */}
        <g className="animate-blink" style={{ transformOrigin: '100px 68px' }}>
          <circle cx="85" cy="68" r="4" fill="#22d3ee" className="drop-shadow-[0_0_3px_#22d3ee]" />
          <circle cx="115" cy="68" r="4" fill="#22d3ee" className="drop-shadow-[0_0_3px_#22d3ee]" />
          {/* Cute little mouth */}
          <path d="M 97 73 Q 100 75, 103 73" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
        
        {/* Antenna */}
        <path d="M 100 45 L 100 25" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="25" r="5" fill="#0ea5e9" />
        
        {/* Speech Bubble */}
        <g className="animate-bubble">
          <path d="M -5 25 Q -5 5, 35 5 Q 75 5, 75 25 Q 75 40, 60 45 L 55 55 L 50 43 Q -5 40, -5 25 Z" fill="#ffffff" stroke="#38bdf8" strokeWidth="2" />
          <text x="35" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#0ea5e9" textAnchor="middle">MAY I</text>
          <text x="35" y="34" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#0ea5e9" textAnchor="middle">HELP YOU?</text>
        </g>
      </g>
    </svg>
  );
}
