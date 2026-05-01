interface TorchProps {
  color?: string
  size?: number
}

export default function Torch({ color = '#ff5a1f', size = 72 }: TorchProps) {
  return (
    <svg
      width={size * (96 / 140)}
      height={size}
      viewBox="0 0 96 140"
      style={{ display: 'block' }}
    >
      <path d="M48 6 C 40 22, 30 30, 30 46 C 30 58, 38 66, 48 66 C 58 66, 66 58, 66 46 C 66 30, 56 22, 48 6 Z" fill={color} />
      <path d="M26 68 L 70 68 L 64 82 L 32 82 Z" fill={color} />
      <rect x="30" y="84" width="36" height="4" fill={color} />
      <rect x="42" y="90" width="12" height="42" fill={color} />
      <rect x="38" y="132" width="20" height="4" fill={color} />
    </svg>
  )
}
