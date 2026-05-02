import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Search, List, Play, ChevronRight, X } from 'lucide-react';

export default function IDATV_Ultimate() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Конфиг
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Данные
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все каналы']);
  const [activeCat, setActiveCat] = useState('Все каналы');
  const [currentCh, setCurrentCh] = useState(null);
  const [search, setSearch] = useState('');

  // Логика запуска видео
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      // Используем прокси для обхода Mixed Content
      const streamUrl = `/api/proxy?url=${encodeURIComponent(currentCh.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, fragLoadingMaxRetry: 5 });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else {
        video.src = streamUrl;
      }
    }
  }, [currentCh]);

  const loadPlaylist = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все каналы', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_v5', JSON.stringify({ playlistUrl: url, epgUrl }));
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка загрузки!"); }
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('idatv_v5') || '{}');
    if (saved.playlistUrl) {
      setPlaylistUrl(saved.playlistUrl);
      setEpgUrl(saved.epgUrl || '');
      loadPlaylist(saved.playlistUrl);
    }
  }, []);

  return (
    <div className="idatv">
      <Head><title>IDATV Premium Player</title></Head>

      <div className="layout">
        {/* Панель категорий слева */}
        <aside className="sidebar">
          <div className="side-logo">IDATV<span>PRO</span></div>
          <div className="cat-list">
            {categories.map(cat => (
              <button key={cat} className={activeCat === cat ? 'active' : ''} onClick={() => setActiveCat(cat)}>
                <List size={16} /> {cat}
              </button>
            ))}
          </div>
          <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={20} /> Настройки
          </button>
        </aside>

        {/* Список каналов (как в примере) */}
        <section className="channel-pane">
          <div className="search-wrap"><Search size={18}/><input placeholder="Поиск..." onChange={e => setSearch(e.target.value)}/></div>
          <div className="items">
            {channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (activeCat === 'Все каналы' || c.group.title === activeCat)).map((ch, i) => (
              <div key={i} className={`ch-card ${currentCh?.url === ch.url ? 'active' : ''}`} onClick={() => setCurrentCh(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
                <div className="ch-info">
                  <b>{ch.name}</b>
                  <span>Эфир: {ch.group.title}</span>
                </div>
                <ChevronRight size={14} color="#333" />
              </div>
            ))}
          </div>
        </section>

        {/* Плеер и EPG (под плеером) */}
        <main className="player-pane">
          {currentCh ? (
            <div className="view-content">
              <div className="video-holder">
                <video ref={videoRef} controls autoPlay playsInline />
              </div>
              <div className="epg-panel">
                <div className="epg-tabs">
                  <button className="active">Сейчас и далее</button>
                  <button>По дням</button>
                </div>
                <div className="epg-content">
                  <div className="epg-item active">
                    <div className="time">Сейчас в эфире:</div>
                    <div className="prog-name">{currentCh.name} — Трансляция запущена</div>
                    <div className="prog-desc">Группа: {currentCh.group.title}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : <div className="empty-state"><Play size={80}/><p>Выберите канал для просмотра</p></div>}
        </main>
      </div>

      {/* Модальное окно настроек */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Конфигурация IDATV</h3>
            <div className="field">
              <label>M3U Плейлист:</label>
              <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="http://..." />
            </div>
            <div className="field">
              <label>EPG Ссылка (XML):</label>
              <input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} placeholder="http://..." />
            </div>
            <button className="btn-save" onClick={() => loadPlaylist(playlistUrl)}>Применить</button>
            <button className="btn-cancel" onClick={() => setIsSettingsOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .idatv { height: 100vh; background: #0f1218; color: #fff; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        .layout { display: flex; height: 100%; }
        
        .sidebar { width: 240px; background: #161b22; display: flex; flex-direction: column; border-right: 1px solid #2d333b; }
        .side-logo { padding: 25px; font-size: 22px; font-weight: 800; border-bottom: 1px solid #2d333b; }
        .side-logo span { color: #2f81f7; }
        .cat-list { flex: 1; overflow-y: auto; padding: 10px; }
        .cat-list button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: none; border: none; color: #8b949e; cursor: pointer; text-align: left; border-radius: 6px; }
        .cat-list button.active { background: rgba(47, 129, 247, 0.15); color: #58a6ff; }
        .settings-trigger { margin: 15px; padding: 12px; background: #21262d; border: 1px solid #30363d; color: #fff; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 10px; }

        .channel-pane { width: 320px; background: #0d1117; border-right: 1px solid #2d333b; display: flex; flex-direction: column; }
        .search-wrap { padding: 15px; background: #161b22; display: flex; align-items: center; gap: 10px; }
        .search-wrap input { background: none; border: none; color: #fff; outline: none; width: 100%; }
        .items { flex: 1; overflow-y: auto; }
        .ch-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid #21262d; cursor: pointer; }
        .ch-card:hover { background: #161b22; }
        .ch-card.active { background: #1c2128; border-left: 3px solid #2f81f7; }
        .ch-card img { width: 45px; height: 32px; object-fit: contain; }
        .ch-info b { font-size: 13px; display: block; }
        .ch-info span { font-size: 10px; color: #3fb950; }

        .player-pane { flex: 1; background: #000; position: relative; }
        .view-content { display: flex; flex-direction: column; height: 100%; }
        .video-holder { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; max-height: 100%; outline: none; }
        
        .epg-panel { height: 250px; background: #0d1117; border-top: 1px solid #2d333b; padding: 20px; }
        .epg-tabs { display: flex; gap: 20px; border-bottom: 1px solid #2d333b; margin-bottom: 15px; }
        .epg-tabs button { padding: 10px 0; background: none; border: none; color: #8b949e; cursor: pointer; border-bottom: 2px solid transparent; }
        .epg-tabs button.active { color: #2f81f7; border-bottom-color: #2f81f7; }
        .epg-item { padding: 15px; background: #161b22; border-radius: 8px; border-left: 4px solid #3fb950; }
        .time { color: #3fb950; font-size: 12px; font-weight: bold; }
        .prog-name { font-size: 16px; font-weight: bold; margin: 5px 0; }
        .prog-desc { font-size: 13px; color: #8b949e; }

        .empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #30363d; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .modal { background: #161b22; padding: 30px; border-radius: 12px; width: 450px; border: 1px solid #30363d; }
        .field { margin-bottom: 15px; }
        .field label { display: block; font-size: 12px; color: #8b949e; margin-bottom: 8px; }
        .field input { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 6px; }
        .btn-save { width: 100%; padding: 12px; background: #238636; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; }
        .btn-cancel { width: 100%; margin-top: 10px; background: none; border: none; color: #8b949e; cursor: pointer; }
      `}</style>
    </div>
  );
}
