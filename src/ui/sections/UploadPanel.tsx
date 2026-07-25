import { useId, useRef, useState } from 'react';
import { MAX_FILE_SIZE_MB } from '../../appInfo';
import { UploadIcon } from '../components/icons';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
}

export function UploadPanel({ onFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const hintId = useId();

  function pick(): void {
    if (busy) return;
    inputRef.current?.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file && !busy) onFile(file);
    // Reset so re-selecting the same file still triggers change.
    event.target.value = '';
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragActive(false);
    if (busy) return; // ignore drops while an analysis is in progress
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`dropzone${dragActive ? ' dropzone--active' : ''}${busy ? ' dropzone--disabled' : ''}`}
      aria-busy={busy}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <UploadIcon />
      <p>
        <strong>將檔案拖放到這裡，或</strong>
      </p>
      <p>
        <button type="button" className="btn btn--primary" onClick={pick} disabled={busy}>
          {busy ? '分析中… Analysing…' : '選擇檔案 Choose file'}
        </button>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="visually-hidden"
        aria-describedby={hintId}
        disabled={busy}
        onChange={handleChange}
      />
      <p id={hintId} className="dropzone__hint">
        支援 .xlsx 與 .csv，單檔上限 {MAX_FILE_SIZE_MB} MB。不支援有密碼保護的 Excel。
        <br />
        Supports .xlsx and .csv, up to {MAX_FILE_SIZE_MB} MB per file.
      </p>
    </div>
  );
}
