import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MicOff } from 'lucide-react';

const secure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';

export default function VoiceRecorder({ onSave, disabled }) {
  const [state, setState] = useState('idle'); // idle | recording | uploading
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/ogg;codecs=opus';
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setState('uploading');
        await onSave(blob, seconds, ext);
        setState('idle');
        setSeconds(0);
      };
      mr.start(1000);
      mediaRef.current = mr;
      setState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setState('idle');
    }
  };

  const stop = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
  };

  if (state === 'recording') return (
    <button type="button" onClick={stop}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all animate-pulse"
      style={{ background: '#7f1d1d', border: '1px solid #ef4444' }}>
      <Square size={14} fill="currentColor" />
      Остановить · {fmt(seconds)}
    </button>
  );

  if (state === 'uploading') return (
    <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-500"
      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
      <Loader2 size={14} className="animate-spin" /> Сохранение...
    </button>
  );

  if (!secure) return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-600"
      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
      title="Микрофон требует HTTPS. Используй «Загрузить файл»">
      <MicOff size={14} />
      Запись недоступна (HTTP)
    </div>
  );

  return (
    <button type="button" onClick={start} disabled={disabled}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: disabled ? '#555' : '#76B900' }}>
      <Mic size={14} />
      Записать
    </button>
  );
}
