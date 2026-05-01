const BAR_COUNT = 14

export default function Waveform() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flex: 1,
        justifyContent: 'flex-end',
        height: 22,
      }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 2,
            background: '#fff',
            height: `${4 + Math.abs(Math.sin((i + 1) * 0.6)) * 16}px`,
            animation: `lbWave 0.9s ${i * 0.05}s ease-in-out infinite alternate`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  )
}
