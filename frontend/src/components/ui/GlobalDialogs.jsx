import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import useDialogStore from '../../store/dialogStore'

export default function GlobalDialogs() {
  const { confirmState, promptState, closeConfirm, closePrompt } = useDialogStore()
  const [promptValue, setPromptValue] = useState('')

  useEffect(() => {
    if (promptState) setPromptValue(promptState.defaultValue || '')
  }, [promptState])

  const btnStyle = {
    padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
    cursor: 'pointer', border: 'none', transition: 'all 0.15s'
  }

  return (
    <>
      <Modal open={!!confirmState} onClose={() => closeConfirm(false)} title={confirmState?.title} maxWidth={400}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          {confirmState?.message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => closeConfirm(false)} style={{ ...btnStyle, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>İptal</button>
          <button onClick={() => closeConfirm(true)} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}>Onayla</button>
        </div>
      </Modal>

      <Modal open={!!promptState} onClose={() => closePrompt(null)} title={promptState?.title} maxWidth={400}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
          {promptState?.message}
        </div>
        <input
          autoFocus
          type="text"
          value={promptValue}
          onChange={e => setPromptValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') closePrompt(promptValue)
          }}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--border-medium)', background: 'var(--bg-main)',
            color: 'var(--text-primary)', outline: 'none', marginBottom: 24,
            fontSize: 14
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => closePrompt(null)} style={{ ...btnStyle, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>İptal</button>
          <button onClick={() => closePrompt(promptValue)} style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}>Tamam</button>
        </div>
      </Modal>
    </>
  )
}
