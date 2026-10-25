import { useEffect, useRef, useState } from 'react'

export default function EditableSelect({
  value,
  onChange,
  options = [],
  placeholder = '— pick or type —',
  allowCustom = true,
  required = false,
  style,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const showCustomOption =
    allowCustom &&
    query.trim() &&
    !filtered.some((o) => o.toLowerCase() === query.trim().toLowerCase())

  const allOptions = showCustomOption
    ? [...filtered, `Use "${query.trim()}"`]
    : filtered

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function commit(option) {
    if (option === '__custom__') {
      onChange(query.trim())
    } else {
      onChange(option)
    }
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, allOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allOptions[highlight]) {
        const isCustom = showCustomOption && highlight === allOptions.length - 1
        commit(isCustom ? '__custom__' : allOptions[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 200 }}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : (value || '')}
        placeholder={placeholder}
        required={required && !value}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => { setOpen(true); setQuery('') }}
        onKeyDown={onKeyDown}
        className={className}
        style={{ width: '100%', ...style }}
      />

      {open && allOptions.length > 0 && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 260, overflowY: 'auto',
            zIndex: 100,
            padding: 6,
          }}
        >
          {allOptions.map((opt, i) => {
            const isCustom = showCustomOption && i === allOptions.length - 1
            const isHighlighted = i === highlight
            return (
              <div
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); commit(isCustom ? '__custom__' : opt) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isHighlighted ? 'var(--primary-soft)' : 'transparent',
                  fontSize: 13,
                  color: isCustom ? 'var(--primary-hover)' : 'var(--text)',
                  fontWeight: isCustom ? 700 : 500,
                }}
              >
                {isCustom ? opt : opt}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}