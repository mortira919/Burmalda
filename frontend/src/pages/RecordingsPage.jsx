import React, { useEffect, useState, useCallback } from 'react';
import { recordingsApi, clientsApi, leadsApi } from '../api/client';
import { formatDate } from '../utils/helpers';
import { Mic, Trash2, Play, Pause, User, Target, Pencil, Check, X } from 'lucide-react';
import VoiceRecorder from '../components/VoiceRecorder';
import { useSync } from '../hooks/useSync';

function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onDurationChange={e => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#76B900', color: '#000' }}>
        {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden cursor-pointer" style={{ background: '#2A2A2A' }}
          onClick={e => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}>
          <div className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
        <span className="text-xs font-mono text-gray-600 w-10 text-right">{fmt(progress)}</span>
      </div>
    </div>
  );
}

function NoteEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');
  if (!editing) return (
    <div className="flex items-start gap-2">
      <p className="text-xs text-gray-600 flex-1 italic">{value || 'Нет заметок'}</p>
      <button onClick={() => setEditing(true)} className="text-gray-700 hover:text-gray-400 flex-shrink-0"><Pencil size={11} /></button>
    </div>
  );
  return (
    <div className="flex gap-2">
      <input className="input text-xs flex-1 py-1" value={text} onChange={e => setText(e.target.value)} autoFocus />
      <button onClick={() => { onSave(text); setEditing(false); }} className="text-green-500 hover:text-green-400"><Check size={14} /></button>
      <button onClick={() => setEditing(false)} className="text-gray-600 hover:text-gray-400"><X size={14} /></button>
    </div>
  );
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkForm, setLinkForm] = useState({ type: 'client', id: '' });
  const [tick, setTick] = useState(0);

  const load = () => Promise.all([
    recordingsApi.getAll(),
    clientsApi.getAll(),
    leadsApi.getAll(),
  ]).then(([r, c, l]) => {
    setRecordings(r.data);
    setClients(c.data);
    setLeads(l.data);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [tick]);
  useSync(useCallback(() => setTick(t => t + 1), []));

  const handleSave = async (blob, seconds, ext) => {
    const fd = new FormData();
    fd.append('audio', blob, `recording.${ext}`);
    fd.append('duration', seconds);
    if (linkForm.id) {
      if (linkForm.type === 'client') fd.append('clientId', linkForm.id);
      else fd.append('leadId', linkForm.id);
    }
    await recordingsApi.upload(fd);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить запись?')) return;
    await recordingsApi.delete(id);
    load();
  };

  const handleNote = async (id, notes) => {
    await recordingsApi.patch(id, { notes });
    load();
  };

  const fmt = (s) => {
    if (!s) return '';
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="page-title flex items-center gap-2"><Mic size={22} className="text-primary-500" /> Записи звонков</h1>
        <p className="page-sub">{recordings.length} записей</p>
      </div>

      {/* Record panel */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white text-sm">Новая запись</h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">Привязать к</label>
            <div className="flex gap-2">
              <select className="input py-1.5 text-sm w-28"
                value={linkForm.type} onChange={e => setLinkForm({ type: e.target.value, id: '' })}>
                <option value="client">Клиент</option>
                <option value="lead">Лид</option>
              </select>
              <select className="input py-1.5 text-sm w-48"
                value={linkForm.id} onChange={e => setLinkForm(p => ({ ...p, id: e.target.value }))}>
                <option value="">— без привязки —</option>
                {(linkForm.type === 'client' ? clients : leads).map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
          <VoiceRecorder onSave={handleSave} />
        </div>
        <p className="text-xs text-gray-700">Нажми «Записать» → говори → «Остановить» — запись сохранится автоматически</p>
      </div>

      {/* Recordings list */}
      <div className="space-y-3">
        {recordings.length === 0 && (
          <div className="card text-center py-12 text-gray-700">Нет записей</div>
        )}
        {recordings.map(rec => (
          <div key={rec.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-600">{formatDate(rec.createdAt)}</span>
                  {rec.duration && <span className="text-xs text-gray-700 font-mono">{fmt(rec.duration)}</span>}
                  {rec.client && (
                    <span className="badge bg-white/5 text-gray-400 border border-white/10 text-xs flex items-center gap-1">
                      <User size={9} /> {rec.client.name}
                    </span>
                  )}
                  {rec.lead && (
                    <span className="badge bg-white/5 text-gray-400 border border-white/10 text-xs flex items-center gap-1">
                      <Target size={9} /> {rec.lead.name}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <NoteEditor value={rec.notes} onSave={(notes) => handleNote(rec.id, notes)} />
                </div>
              </div>
              <button onClick={() => handleDelete(rec.id)} className="text-gray-700 hover:text-red-400 flex-shrink-0 mt-0.5">
                <Trash2 size={14} />
              </button>
            </div>
            <AudioPlayer url={recordingsApi.fileUrl(rec.filename)} />
          </div>
        ))}
      </div>
    </div>
  );
}
