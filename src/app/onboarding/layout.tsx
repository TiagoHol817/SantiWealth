export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f1117',
        backgroundImage: [
          'radial-gradient(ellipse 70% 50% at 80% 10%, rgba(212,175,55,0.06) 0%, transparent 60%)',
          'radial-gradient(ellipse 50% 40% at 15% 85%, rgba(99,102,241,0.04) 0%, transparent 55%)',
          'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 28px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      {children}
    </div>
  )
}
