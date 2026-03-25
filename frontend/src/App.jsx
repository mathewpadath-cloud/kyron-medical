import { useMemo } from 'react';
import ChatInterface from './components/ChatInterface';

function BackgroundOrbs() {
  return (
    <>
      {/* Large ambient orbs */}
      <div
        className="particle-orb opacity-20"
        style={{
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, #0066FF 0%, transparent 70%)',
          top: -250,
          left: -250,
          animation: 'float 28s ease-in-out infinite'
        }}
      />
      <div
        className="particle-orb opacity-15"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, #0033AA 0%, transparent 70%)',
          bottom: -200,
          right: -200,
          animation: 'floatReverse 22s ease-in-out infinite'
        }}
      />
      <div
        className="particle-orb opacity-10"
        style={{
          width: 450,
          height: 450,
          background: 'radial-gradient(circle, #0088FF 0%, transparent 70%)',
          top: '40%',
          left: '55%',
          transform: 'translate(-50%, -50%)',
          animation: 'float 35s ease-in-out infinite 8s'
        }}
      />
      {/* Grid texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,102,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,102,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
    </>
  );
}

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1.5,
      left: Math.random() * 98,
      top: Math.random() * 98,
      duration: Math.random() * 18 + 14,
      delay: Math.random() * 12,
      opacity: Math.random() * 0.35 + 0.1
    })), []
  );

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="particle-dot"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: `rgba(0, 102, 255, ${p.opacity})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`
          }}
        />
      ))}
    </>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-5 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)',
              boxShadow: '0 4px 14px rgba(0,102,255,0.4)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />
              <path
                d="M12 6v6l4 2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" fill="white" opacity="0.9" />
              <path
                d="M11 8h2M11 16h2M8 11v2M16 11v2"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight tracking-tight">
              Kyron Medical
            </div>
            <div className="text-xs font-semibold" style={{ color: '#3385FF' }}>
              Patient Portal
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div
          className="glass-card rounded-full px-4 py-2 flex items-center gap-2"
          style={{ borderColor: 'rgba(34,197,94,0.2)' }}
        >
          <div
            className="w-2 h-2 rounded-full pulse-ring"
            style={{ background: '#22c55e' }}
          />
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
            AI Online
          </span>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="min-h-screen relative" style={{ background: '#0A1628' }}>
      <BackgroundOrbs />
      <FloatingParticles />

      <Header />

      <main
        className="relative z-10 min-h-screen flex items-center justify-center px-4"
        style={{ paddingTop: '72px', paddingBottom: '24px' }}
      >
        <div className="w-full max-w-2xl">
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}
