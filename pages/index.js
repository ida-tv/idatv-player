import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Play, Search, Menu, X } from 'lucide-react';

export default function IDATVPlayer() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Твои настройки
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  
  // Данные
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCat, setActiveCat] = useState('Все');
  const [currentCh, setCurrentCh] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Запуск видео (Исправлено)
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      const streamUrl = `/api/proxy?url=${encodeURIComponent(currentCh.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        hlsRef.current = hls;
      } else {
        video.src = streamUrl;
      }
    }
  }, [currentCh]);

  // Загрузка твоего плейлиста
  const applySettings = async () => {
    if (!playlistUrl) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const data = await res.text();
      const parsed = parseM3U.parse(data);
      setChannels(parsed.items);
      setCategories(['Все', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_url', playlistUrl);
      localStorage.setItem('idatv_epg', epgUrl);
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка в ссылке!"); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('idatv_url');
    if (saved) { setPlaylistUrl(saved); applySettings(); }
    setEpgUrl(localStorage.getItem('idatv_epg') || '');
  }, []);

  const filtered = channels.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) && 
    (activeCat === 'Все' || c.group.title === activeCat)
  );

  return (
    <div className="idatv">
      <Head><title>IDATV PLAYER</title></Head>

      {/* ШАПКА - ТУТ КНОПКА НАСТРОЕК */}
      <header className="header">
        <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}><Menu/></button>
        <div className="logo">IDATV<span>PRO</span></div>
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={20}/> <span>НАСТРОЙКИ</span>
        </button>
      </header>

      <div className="content">
        {/* Категории */}
        <aside className={`sidebar ${isSidebarOpen ? 'show' : ''}`}>
          <div className="side-head"><h3>ГРУППЫ</h3><button onClick={() => setIsSidebarOpen(false)}><X/></button></div>
          <div className="cats">
            {categories.map(cat => (
              <button key={cat} className={activeCat === cat ? 'active' : ''} onClick={() => {setActiveCat(cat); setIsSidebarOpen(false)}}>
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Список и Видео */}
        <div className="main">
          <div className="channels">
            <div className="search-in"><Search size={18}/><input placeholder="Поиск..." onChange={e => setSearch(e.target.value)}/></div>
            <div className="list">
              {filtered.map((ch, i) => (
                <div key={i} className={`ch ${currentCh?.url === ch.url ? 'on' : ''}`} onClick={() => setCurrentCh(ch)}>
                  <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
                  <div className="info"><div className="n">{ch.name}</div><div className="g">{ch.group.title}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="player">
            {currentCh ? (
              <div className="video-wrap">
                <video ref={videoRef} controls autoPlay playsInline />
                <div className="v-details"><h1>{currentCh.name}</h1></div>
              </div>
            ) : <div className="empty"><Play size={64}/><p>ВЫБЕРИТЕ КАНАЛ</p></div>}
          </div>
        </div>
      </div>

      {/* ТВОЕ ОКНО ДЛЯ ВВОДА ССЫЛОК */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>НАСТРОЙКИ ПЛЕЕРА</h2>
            <div className="input-box">
              <label>ССЫЛКА НА ПЛЕЙЛИСТ (.M3U):</label>
              <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="http://..." />
            </div>
            <div className="input-box">
              <label>ССЫЛКА НА EPG (XML):</label>
              <input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} placeholder="http://..." />
            </div>
            <button className="apply" onClick={applySettings}>СОХРАНИТЬ И ЗАГРУЗИТЬ</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>ОТМЕНА</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .idatv { height: 100vh; background: #000; color: #fff; display: flex; flex-direction: column; font-family: sans-serif; }
        .header { height: 60px; background: #111; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; border-bottom: 1px solid #f00; }
        .logo { font-size: 24px; font-weight: 900; }
        .logo span { color: #f00; }
        .settings-btn { background: #f00; border: none; color: #fff; padding: 10px 15px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: bold; }
        
        .content { flex: 1; display: flex; overflow: hidden; position: relative; }
        .sidebar { width: 250px; background: #0a0a0a; border-right: 1px solid #222; display: flex; flex-direction: column; transition: 0.3s; }
        .side-head { display: none; padding: 20px; justify-content: space-between; }
        .cats { flex: 1; overflow-y: auto; padding: 10px; }
        .cats button { width: 100%; text-align: left; background: none; border: none; color: #888; padding: 12px; cursor: pointer; border-radius: 5px; }
        .cats button.active { background: #f00; color: #fff; }

        .main { flex: 1; display: flex; overflow: hidden; }
        .channels { width: 320px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search-in { padding: 15px; background: #111; display: flex; align-items: center; gap: 10px; }
        .search-in input { background: none; border: none; color: #fff; outline: none; width: 100%; }
        .list { flex: 1; overflow-y: auto; padding: 10px; }
        .ch { display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer; border-radius: 8px; }
        .ch.on { background: rgba(255, 0, 0, 0.2); border: 1px solid #f00; }
        .ch img { width: 40px; height: 30px; object-fit: contain; }
        .n { font-size: 13px; font-weight: bold; }
        .g { font-size: 10px; color: #0f0; }

        .player { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; }
        .video-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .v-details { padding: 20px; background: #0a0a0a; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 999; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 90%; max-width: 400px; }
        .input-box { margin-bottom: 20px; }
        .input-box label { display: block; font-size: 11px; color: #666; margin-bottom: 8px; }
        .input-box input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; }
        .apply { width: 100%; padding: 15px; background: #f00; border: none; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .close { width: 100%; margin-top: 10px; background: none; border: none; color: #444; cursor: pointer; }

        @media (max-width: 768px) {
          .sidebar { position: absolute; left: -100%; z-index: 100; height: 100%; width: 80%; }
          .sidebar.show { left: 0; }
          .side-head { display: flex; }
          .main { flex-direction: column-reverse; }
          .channels { width: 100%; flex: 1; }
          .player { height: 40%; flex: none; }
          .menu-btn { display: block; background: none; border: none; color: #fff; }
        }
      `}</style>
    </div>
  );
}
