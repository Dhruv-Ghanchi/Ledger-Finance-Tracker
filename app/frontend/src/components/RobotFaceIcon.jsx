import React from 'react';

export default function RobotFaceIcon({ className }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <rect x="10" y="30" width="80" height="50" rx="25" fill="#e0f2fe" />
      
      {/* Face/Screen */}
      <rect x="20" y="40" width="60" height="26" rx="10" fill="#0f172a" />
      
      {/* Eyes */}
      <circle cx="35" cy="53" r="5" fill="#22d3ee" className="drop-shadow-[0_0_2px_#22d3ee]" />
      <circle cx="65" cy="53" r="5" fill="#22d3ee" className="drop-shadow-[0_0_2px_#22d3ee]" />
      
      {/* Mouth */}
      <path d="M 47 58 Q 50 61, 53 58" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      
      {/* Antenna */}
      <path d="M 50 30 L 50 15" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="12" r="5" fill="#0ea5e9" />
    </svg>
  );
}
