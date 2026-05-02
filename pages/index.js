import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Play, Search, Menu, X, Star } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Конфигурация
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [pin, setPin] = useState('1234');
  
  // Данные
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCat, setActiveCat] = useState('Все');
  const [currentCh, setCurrentCh] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Запуск трансляции
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      // Используем прокси для обхода Mixed Content и CORS
      const streamUrl = `/api/proxy?url=${encodeURIComponent(currentCh.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, fragLoadingMaxRetry: 10 });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else {
        video.src = streamUrl;
      }
    }
  }, [currentCh]);

  const saveConfig = async () => {
    if (!playlistUrl) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', 'Избранное', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_v2', JSON.stringify({ playlistUrl, epgUrl, pin }));
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка плейлиста!"); }
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('idatv_v2') || '{}');
    if (saved.playlistUrl) {
      setPlaylistUrl(saved.playlistUrl);
      setEpgUrl(saved.epgUrl || '');
      setPin(saved.pin || '1234');
      saveConfig();
    }
    setFavorites(JSON.parse(localStorage.getItem('idatv_favs') || '[]'));
  }, []);

  const filtered = channels.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) && 
    (activeCat === 'Все' || (activeCat === 'Избранное' ? favorites.some(f => f.url === c.url) : c.group.title === activeCat))
  );

  return (
    <div className="app">
      <Head><title>IDATV PRO PLAYER</title></Head>

      <header className="navbar">
        <div className="logo">IDATV<span>PRO</span></div>
        <div className="actions">
          <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={20}/> <span>НАСТРОЙКИ</span>
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {categories.map(cat => (
            <button key={cat} className={activeCat === cat ? 'active' : ''} onClick={() => setActiveCat(cat)}>{cat}</button>
          ))}
        </aside>

        <section className="channel-pane">
          <div className="search-bar"><Search size={16}/><input placeholder="Поиск каналов..." onChange={e => setSearch(e.target.value)}/></div>
          <div className="items">
            {filtered.map((ch, i) => (
              <div key={i} className={`ch-item ${currentCh?.url === ch.url ? 'active' : ''}`} onClick={() => setCurrentCh(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
                <div className="details">
                  <div className="name">{ch.name}</div>
                  <div className="epg-text">Сейчас: {ch.group.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <main className="player-pane">
          {currentCh ? (
            <div className="v-box">
              <video ref={videoRef} controls autoPlay playsInline />
              <div className="v-meta">
                <h1>{currentCh.name}</h1>
                <p>Группа: {currentCh.group.title}</p>
              </div>
            </div>
          ) : <div className="empty"><Play size={64}/><p>Выберите канал для просмотра</p></div>}
        </main>
      </div>

      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>ПАРАМЕТРЫ ПЛЕЕРА</h2>
            <div className="field"><label>Плейлист (M3U):</label><input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} /></div>
            <div className="field"><label>Телепрограмма (XMLTV):</label><input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} /></div>
            <div className="field"><label>PIN для 18+:</label><input value={pin} onChange={e => setPin(e.target.value)} /></div>
            <button className="save-btn" onClick={saveConfig}>СОХРАНИТЬ И ЗАГРУЗИТЬ</button>
            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>ОТМЕНА</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .app { height: 100vh; background: #000; color: #fff; display: flex; flex-direction: column; font-family: sans-serif; }
        .navbar { display: flex; justify-content: space-between; padding: 15px 20px; background: #111; border-bottom: 2px solid red; }
        .logo span { color: red; font-weight: bold; }
        .settings-trigger { background: red; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: bold; }
        .layout { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 220px; background: #0a0a0a; overflow-y: auto; padding: 10px; border-right: 1px solid #222; }
        .sidebar button { width: 100%; text-align: left; padding: 12px; background: none; border: none; color: #888; cursor: pointer; margin-bottom: 5px; border-radius: 5px; }
        .sidebar button.active { background: red; color: #fff; }
        .channel-pane { width: 320px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search-bar { padding: 12px; background: #111; display: flex; align-items: center; gap: 8px; }
        .search-bar input { background: none; border: none; color: #fff; outline: none; flex: 1; }
        .items { flex: 1; overflow-y: auto; padding: 10px; }
        .ch-item { display: flex; gap: 12px; padding: 10px; border-radius: 8px; cursor: pointer; margin-bottom: 5px; border-bottom: 1px solid #111; }
        .ch-item:hover { background: #1a1a1a; }
        .ch-item.active { background: rgba(255, 0, 0, 0.2); border: 1px solid red; }
        .ch-item img { width: 45px; height: 35px; object-fit: contain; }
        .name { font-size: 13px; font-weight: bold; }
        .epg-text { font-size: 10px; color: #00ff00; }
        .player-pane { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; }
        .v-box { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .v-meta { padding: 20px; background: #0a0a0a; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 450px; display: flex; flex-direction: column; gap: 15px; }
        .field label { display: block; font-size: 11px; color: #666; margin-bottom: 5px; }
        .field input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 5px; }
        .save-btn { background: red; color: #fff; padding: 12px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .close-btn { background: none; border: none; color: #444; cursor: pointer; }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .channel-pane { width: 100%; height: 40%; }
          .layout { flex-direction: column-reverse; }
          .player-pane { height: 60%; flex: none; }
        }
      `}</style>
    </div>
  );
}
