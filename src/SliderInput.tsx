interface SliderInputProps {
  label: string
  value: number
  valueLabel?: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function SliderInput({ label, value, valueLabel, min, max, step = 1, onChange }: SliderInputProps) {
  const displayedValue = valueLabel ?? String(value)

  return (
    <div className="slider-input">
      <div className="slider-input-header">
        <span className="input-description">{label}</span>
        <span className="slider-value">{displayedValue}</span>
      </div>
      <input
        className="slider-track"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={displayedValue}
        onChange={(event) => { onChange(Number(event.target.value)) }}
      />
    </div>
  )
}

export default SliderInput
