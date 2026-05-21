import React, { useEffect, useState, useCallback, useRef } from 'react';
import { recordingsApi, clientsApi, leadsApi } from '../api/client';
import { formatDate } from '../utils/helpers';
import { Mic, Trash2, Play, Pause, User, Target, Sparkles, Upload, ChevronDown, ChevronUp, Plus, Copy, ExternalLink, Download } from 'lucide-react';
import VoiceRecorder from '../components/VoiceRecorder';
import { useSync } from '../hooks/useSync';
import { useNavigate } from 'react-router-dom';

function AudioPlayer({ url }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const fmt = (s) => (!s || !isFinite(s)) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
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
            style={{ width: duration ? `${(progress/duration)*100}%` : '0%' }} />
        </div>
        <span className="text-xs font-mono text-gray-600 w-10 text-right">{fmt(progress)}</span>
      </div>
    </div>
  );
}

const AI_STUDIO_PROMPT = `Ты — ассистент менеджера IT-студии. Прослушай аудиозапись разговора с потенциальным клиентом и верни ТОЛЬКО валидный JSON без markdown, без пояснений:

{
  "name": "имя или название компании клиента",
  "phone": "номер телефона если упоминался",
  "projectEssence": "суть проекта в 1-2 предложениях",
  "projectType": "сайт / мобильное приложение / веб-приложение / дизайн / другое",
  "techStack": "технологии если упоминались",
  "budget": "бюджет если упоминался",
  "deadline": "сроки если упоминались",
  "requirements": ["требование 1", "требование 2"],
  "openQuestions": ["что нужно уточнить у клиента"],
  "tzDraft": "черновик технического задания на основе разговора"
}`;

function AnalysisPanel({ rec, onRefresh }) {
  const [open, setOpen] = useState(!!rec.analysis);
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState(rec.analysis ? (() => { try { return JSON.parse(rec.analysis); } catch { return null; } })() : null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [copied, setCopied] = useState(false);
  const [parsing, setParsing] = useState(false);
  const navigate = useNavigate();

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_STUDIO_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openAiStudio = async () => {
    await copyPrompt();
    window.open('https://aistudio.google.com/prompts/new_chat', '_blank');
  };

  const parseAndSave = async () => {
    const text = pasteText.trim();
    if (!text) return;
    setParsing(true);
    try {
      let parsed;
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        alert('Не удалось найти JSON в ответе. Убедись что скопировал полный ответ от ИИ.');
        setParsing(false);
        return;
      }
      await recordingsApi.patch(rec.id, { analysis: JSON.stringify(parsed) });
      setResult(parsed);
      setPasteText('');
      onRefresh();
    } catch {
      alert('Ошибка парсинга JSON. Попробуй скопировать ответ ещё раз.');
    } finally {
      setParsing(false);
    }
  };

  const createLead = async () => {
    if (!result) return;
    setCreatingLead(true);
    try {
      await leadsApi.create({
        name: result.name || 'Без имени',
        phone: result.phone || '',
        notes: [
          result.projectEssence && `Суть: ${result.projectEssence}`,
          result.projectType && `Тип: ${result.projectType}`,
          result.techStack && `Стек: ${result.techStack}`,
          result.budget && `Бюджет: ${result.budget}`,
          result.deadline && `Сроки: ${result.deadline}`,
          result.requirements?.length && `Требования:\n${result.requirements.map(r => `• ${r}`).join('\n')}`,
          result.openQuestions?.length && `Вопросы:\n${result.openQuestions.map(q => `• ${q}`).join('\n')}`,
        ].filter(Boolean).join('\n\n'),
        status: 'needs_tz',
      });
      navigate('/leads');
    } catch {
      alert('Ошибка создания лида');
      setCreatingLead(false);
    }
  };

  return (
    <div className="pt-2" style={{ borderTop: '1px solid #1A1A1A' }}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-primary-500 hover:text-primary-400 font-medium">
        <Sparkles size={12} />
        {result ? 'ТЗ готово — посмотреть' : 'Получить транскрипцию и ТЗ через AI Studio'}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!result && (
            <div className="rounded-xl p-3 space-y-3" style={{ background: '#0A0A0A', border: '1px solid #1E1E1E' }}>
              <p className="text-xs text-gray-500 font-medium">Инструкция — 3 шага:</p>
              <div className="space-y-2">
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: '#76B900', color: '#000' }}>1</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-300">Скачай аудио и открой AI Studio</p>
                    <div className="flex gap-2 mt-1.5">
                      <a href={recordingsApi.fileUrl(rec.filename)} download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#aaa' }}>
                        <Download size={12} /> Скачать аудио
                      </a>
                      <button onClick={openAiStudio}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#76B900' }}>
                        <ExternalLink size={12} />
                        Открыть AI Studio
                        {copied && <span className="text-green-400 ml-1">· промпт скопирован!</span>}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: '#76B900', color: '#000' }}>2</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-300">В AI Studio: загрузи аудио → вставь промпт (уже скопирован) → отправь</p>
                    <button onClick={copyPrompt}
                      className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: copied ? '#76B900' : '#666' }}>
                      <Copy size={11} /> {copied ? 'Скопировано!' : 'Скопировать промпт'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: '#76B900', color: '#000' }}>3</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-300 mb-1.5">Скопируй ответ от ИИ и вставь сюда</p>
                    <textarea
                      className="input resize-none text-xs font-mono"
                      rows={4}
                      placeholder={'{\n  "name": "Артём",\n  "phone": "+7 701...",\n  ...\n}'}
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                    />
                    <button onClick={parseAndSave} disabled={parsing || !pasteText.trim()}
                      className="btn-primary text-xs mt-2 flex items-center gap-2">
                      <Sparkles size={12} />
                      {parsing ? 'Обрабатываю...' : 'Применить и заполнить поля'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#0F0F0F', border: '1px solid #212121' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-primary-500" /> Результат анализа
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => setResult(null)}
                    className="text-xs text-gray-600 hover:text-gray-400">Переделать</button>
                  <button onClick={createLead} disabled={creatingLead}
                    className="btn-primary text-xs py-1.5 flex items-center gap-1.5">
                    <Plus size={12} /> {creatingLead ? 'Создаём...' : 'Создать лид'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  ['Клиент', result.name],
                  ['Телефон', result.phone],
                  ['Тип проекта', result.projectType],
                  ['Стек', result.techStack],
                  ['Бюджет', result.budget],
                  ['Сроки', result.deadline],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-600">{label}</p>
                    <p className="text-sm text-gray-200">{value}</p>
                  </div>
                ))}
              </div>

              {result.projectEssence && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Суть проекта</p>
                  <p className="text-sm text-gray-300">{result.projectEssence}</p>
                </div>
              )}
              {result.requirements?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Требования</p>
                  <ul className="space-y-0.5">
                    {result.requirements.map((r, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-primary-600">•</span>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.openQuestions?.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-600 mb-1">Уточнить у клиента</p>
                  <ul className="space-y-0.5">
                    {result.openQuestions.map((q, i) => (
                      <li key={i} className="text-sm text-yellow-500/80 flex gap-2"><span>?</span>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.tzDraft && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Черновик ТЗ</p>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{result.tzDraft}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
  const fileInputRef = useRef(null);

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

  const uploadAudio = async (blob, seconds, ext) => {
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

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('audio', file, file.name);
    if (linkForm.id) {
      if (linkForm.type === 'client') fd.append('clientId', linkForm.id);
      else fd.append('leadId', linkForm.id);
    }
    await recordingsApi.uploadFile(fd);
    load();
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить запись?')) return;
    await recordingsApi.delete(id);
    load();
  };

  const fmt = (s) => !s ? '' : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="page-title flex items-center gap-2"><Mic size={22} className="text-primary-500" /> Записи звонков</h1>
        <p className="page-sub">{recordings.length} записей</p>
      </div>

      {/* Record / Upload panel */}
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
          <VoiceRecorder onSave={uploadAudio} />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#aaa' }}>
            <Upload size={14} /> Загрузить файл
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={uploadFile} />
        </div>
        <p className="text-xs text-gray-700">После записи нажми «Анализ через ИИ» — Claude составит черновик ТЗ и ты сможешь сразу создать лид</p>
      </div>

      {/* List */}
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
                  {rec.analysis && (
                    <span className="badge text-xs" style={{ background: '#76B900/10', color: '#76B900', border: '1px solid #76B90030' }}>
                      ТЗ готово
                    </span>
                  )}
                </div>
                {rec.notes && <p className="text-xs text-gray-600 mt-1.5 italic">{rec.notes}</p>}
              </div>
              <button onClick={() => handleDelete(rec.id)} className="text-gray-700 hover:text-red-400 flex-shrink-0 mt-0.5">
                <Trash2 size={14} />
              </button>
            </div>
            <AudioPlayer url={recordingsApi.fileUrl(rec.filename)} />
            <AnalysisPanel rec={rec} onRefresh={load} />
          </div>
        ))}
      </div>
    </div>
  );
}
