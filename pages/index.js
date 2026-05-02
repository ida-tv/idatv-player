import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Star, Search, Menu, X, Play, LayoutGrid } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Данные и ссылки
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCategory, setActiveCategory] = useState('Все');
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  // Состояния интерфейса
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Запуск видео через прокси для обхода блокировок Mixed Content
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      
      // ИСПРАВЛЕНИЕ: Всегда используем прокси, чтобы скрыть http от браузера
      const secureUrl = `/api/proxy?url=${encodeURIComponent(currentChannel.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(secureUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = secureUrl;
      }
    }
  }, [currentChannel]);

  const loadData = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', 'Избранное', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_url', url);
    } catch (err) { console.error("Load error"); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('idatv_url');
    if (saved) { setPlaylistUrl(saved); loadData(saved); }
    setFavorites(JSON.parse(localStorage.getItem('idatv_favs') || '[]'));
  }, []);

  const toggleFav = (e, ch) => {
    e.stopPropagation();
    const isFav = favorites.some(f => f.url === ch.url);
    const newFavs = isFav ? favorites.filter(f => f.url !== ch.url) : [...favorites, ch];
    setFavorites(newFavs);
    localStorage.setItem('idatv_favs', JSON.stringify(newFavs));
  };

  const filtered = channels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === 'Все') return matchesSearch;
    if (activeCategory === 'Избранное') return matchesSearch && favorites.some(f => f.url === ch.url);
    return matchesSearch && ch.group.title === activeCategory;
  });

  return (
    <div className="app">
      <Head><title>IDATV PRO</title><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></Head>

      {/* Верхняя панель для мобильных */}
      <header className="mobile-header">
        <button onClick={() => setIsSidebarOpen(true)}><Menu color="white"/></button>
        <div className="logo">IDATV<span>PRO</span></div>
        <button onClick={() => setIsSettingsOpen(true)}><Settings color="white"/></button>
      </header>

      <div className="content">
        {/* Боковое меню (категории) */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-top">
            <div className="logo">IDATV<span>PRO</span></div>
            <button onClick={() => setIsSidebarOpen(false)}><X color="white"/></button>
          </div>
          <nav>
            {categories.map(cat => (
              <button key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => {setActiveCategory(cat); setIsSidebarOpen(false)}}>
                <LayoutGrid size={18}/> {cat}
              </button>
            ))}
          </nav>
        </aside>

        {/* Список каналов */}
        <section className="channel-list">
          <div className="search-wrap">
            <Search size={18} color="#666"/>
            <input placeholder="Поиск каналов..." onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="list-container">
            {filtered.map((ch, i) => (
              <div key={i} className={`ch-card ${currentChannel?.url === ch.url ? 'active' : ''}`} onClick={() => setCurrentChannel(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40?text=TV'} />
                <div className="ch-info">
                  <div className="name">{ch.name}</div>
                  <div className="epg-mini">Сейчас: {ch.group.title}</div>
                </div>
                <button className={`fav ${favorites.some(f => f.url === ch.url) ? 'active' : ''}`} onClick={e => toggleFav(e, ch)}>
                  <Star size={14} fill={favorites.some(f => f.url === ch.url) ? "#ffcc00" : "none"}/>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Плеер */}
        <main className="player-area">
          {currentChannel ? (
            <div className="video-box">
              <video ref={videoRef} controls autoPlay playsInline />
              <div className="video-meta">
                <h1>{currentChannel.name}</h1>
                <span>{currentChannel.group.title}</span>
              </div>
            </div>
          ) : <div className="no-video"><Play size={60}/><p>Выберите канал</p></div>}
        </main>
      </div>

      {/* Окно настроек */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Настройки IDATV</h3>
            <div className="input-group">
              <label>Плейлист (M3U):</label>
              <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="input-group">
              <label>Телепрограмма (EPG XML):</label>
              <input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} placeholder="https://..." />
            </div>
            <button className="save-btn" onClick={() => {loadData(playlistUrl); setIsSettingsOpen(false)}}>Сохранить и обновить</button>
            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .app { display: flex; flex-direction: column; height: 100vh; background: #000; color: #fff; font-family: sans-serif; overflow: hidden; }
        .mobile-header { display: none; padding: 10px 15px; background: #111; justify-content: space-between; align-items: center; border-bottom: 1px solid #ff0000; }
        .logo { font-weight: 900; font-size: 22px; }
        .logo span { color: #ff0000; }
        
        .content { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 250px; background: #0a0a0a; border-right: 1px solid #222; display: flex; flex-direction: column; transition: 0.3s; }
        .sidebar-top { display: none; padding: 20px; justify-content: space-between; border-bottom: 1px solid #222; }
        nav { flex: 1; overflow-y: auto; padding: 10px; }
        nav button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: none; border: none; color: #888; cursor: pointer; border-radius: 8px; margin-bottom: 4px; text-align: left; }
        nav button.active { background: #ff0000; color: #fff; }

        .channel-list { width: 350px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search-wrap { padding: 15px; display: flex; align-items: center; gap: 10px; background: #111; }
        .search-wrap input { background: none; border: none; color: #fff; outline: none; width: 100%; }
        .list-container { flex: 1; overflow-y: auto; padding: 10px; }
        .ch-card { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; margin-bottom: 6px; }
        .ch-card:hover { background: #1a1a1a; }
        .ch-card.active { background: rgba(255, 0, 0, 0.2); border: 1px solid #ff0000; }
        .ch-card img { width: 45px; height: 30px; object-fit: contain; }
        .name { font-size: 13px; font-weight: bold; }
        .epg-mini { font-size: 10px; color: #00ff00; }
        .fav { margin-left: auto; background: none; border: none; color: #444; cursor: pointer; }
        .fav.active { color: #ffcc00; }

        .player-area { flex: 1; background: #000; position: relative; display: flex; align-items: center; justify-content: center; }
        .video-box { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .video-meta { padding: 20px; background: #0a0a0a; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 90%; max-width: 450px; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-size: 12px; color: #888; margin-bottom: 8px; }
        .input-group input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; }
        .save-btn { width: 100%; padding: 12px; background: #ff0000; border: none; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .close-btn { width: 100%; margin-top: 10px; background: none; border: none; color: #666; cursor: pointer; }

        @media (max-width: 768px) {
          .mobile-header { display: flex; }
          .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; z-index: 3000; width: 80%; }
          .sidebar.open { left: 0; }
          .sidebar-top { display: flex; }
          .channel-list { width: 100%; height: 45%; border-right: none; }
          .content { flex-direction: column-reverse; }
          .player-area { height: 55%; flex: none; }
        }
      `}</style>
    </div>
  );
}
