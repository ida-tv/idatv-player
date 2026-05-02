import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Star, Search, Menu, X, Play, LayoutGrid, ChevronRight } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCategory, setActiveCategory] = useState('Все');
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Исправленная логика запуска видео (Обход Mixed Content)
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      
      // ВСЕГДА используем прокси, чтобы превратить HTTP в HTTPS
      const finalUrl = `/api/proxy?url=${encodeURIComponent(currentChannel.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, fragLoadingMaxRetry: 5 });
        hls.loadSource(finalUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(e => console.log("Auto-play blocked")));
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = finalUrl;
      }
    }
  }, [currentChannel]);

  const loadPlaylist = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', 'Избранное', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_url', url);
      setIsSettingsOpen(false);
    } catch (err) { alert("Ошибка загрузки плейлиста"); }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('idatv_url');
    if (savedUrl) { setPlaylistUrl(savedUrl); loadPlaylist(savedUrl); }
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
      <Head><title>IDATV Pro</title><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></Head>

      {/* Мобильная шапка */}
      <div className="mobile-nav">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}><Menu /></button>
        <div className="logo">IDATV<span>PRO</span></div>
        <button onClick={() => setIsSettingsOpen(true)}><Settings /></button>
      </div>

      <div className="layout">
        {/* Категории (Sidebar) */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">IDATV<span>PRO</span></div>
            <button className="close-mobile" onClick={() => setIsSidebarOpen(false)}><X /></button>
          </div>
          <nav>
            {categories.map(cat => (
              <button key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => {setActiveCategory(cat); setIsSidebarOpen(window.innerWidth > 768)}}>
                <LayoutGrid size={18} /> {cat}
              </button>
            ))}
          </nav>
        </aside>

        {/* Список каналов */}
        <section className="channels">
          <div className="search"><Search size={18} /><input placeholder="Поиск..." onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="grid">
            {filtered.map((ch, i) => (
              <div key={i} className={`card ${currentChannel?.url === ch.url ? 'active' : ''}`} onClick={() => setCurrentChannel(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/50?text=TV'} />
                <div className="details">
                  <div className="name">{ch.name}</div>
                  <div className="prog">Сейчас: {ch.group.title}</div>
                </div>
                <button className={`star ${favorites.some(f => f.url === ch.url) ? 'is-fav' : ''}`} onClick={e => toggleFav(e, ch)}><Star size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* Плеер */}
        <main className="player">
          {currentChannel ? (
            <div className="view">
              <video ref={videoRef} controls autoPlay playsInline />
              <div className="meta">
                <h1>{currentChannel.name}</h1>
                <p>{currentChannel.group.title}</p>
              </div>
            </div>
          ) : <div className="placeholder"><Play size={50} /><p>Выберите канал</p></div>}
        </main>
      </div>

      {/* Настройки */}
      {isSettingsOpen && (
        <div className="overlay">
          <div className="modal">
            <h2>Настройки</h2>
            <input placeholder="Ссылка на M3U" value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
            <button className="save" onClick={() => loadPlaylist(playlistUrl)}>Загрузить плейлист</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>Закрыть</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .app { height: 100vh; background: #000; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; overflow: hidden; }
        .mobile-nav { display: none; padding: 10px 15px; background: #111; justify-content: space-between; align-items: center; border-bottom: 1px solid #e50914; }
        .logo { font-weight: 900; font-size: 20px; }
        .logo span { color: #e50914; }
        
        .layout { display: flex; flex: 1; overflow: hidden; }
        
        .sidebar { width: 260px; background: #0a0a0a; border-right: 1px solid #222; display: flex; flex-direction: column; transition: 0.3s; }
        .sidebar-header { display: none; padding: 20px; border-bottom: 1px solid #222; }
        nav { flex: 1; overflow-y: auto; padding: 10px; }
        nav button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: none; border: none; color: #888; cursor: pointer; text-align: left; border-radius: 8px; margin-bottom: 5px; }
        nav button.active { background: #e50914; color: #fff; }

        .channels { width: 350px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search { padding: 15px; display: flex; align-items: center; gap: 10px; background: #111; }
        .search input { background: none; border: none; color: #fff; outline: none; width: 100%; }
        .grid { flex: 1; overflow-y: auto; padding: 10px; }
        .card { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; margin-bottom: 8px; position: relative; }
        .card:hover { background: #1a1a1a; }
        .card.active { background: rgba(229, 9, 20, 0.2); border: 1px solid #e50914; }
        .card img { width: 45px; height: 30px; object-fit: contain; }
        .name { font-size: 13px; font-weight: bold; }
        .prog { font-size: 10px; color: #00ff00; }
        .star { margin-left: auto; background: none; border: none; color: #444; cursor: pointer; }
        .star.is-fav { color: #ffcc00; }

        .player { flex: 1; background: #000; position: relative; display: flex; align-items: center; justify-content: center; }
        .view { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .meta { padding: 20px; background: #0a0a0a; }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; }
        .modal input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; margin: 15px 0; border-radius: 10px; }
        .save { width: 100%; padding: 12px; background: #e50914; border: none; color: #fff; border-radius: 10px; font-weight: bold; cursor: pointer; }
        .close { width: 100%; margin-top: 10px; background: none; border: none; color: #888; cursor: pointer; }

        @media (max-width: 768px) {
          .mobile-nav { display: flex; }
          .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; z-index: 2000; width: 80%; }
          .sidebar.open { left: 0; }
          .sidebar-header { display: flex; justify-content: space-between; }
          .channels { width: 100%; height: 40%; border-right: none; border-top: 1px solid #222; }
          .layout { flex-direction: column-reverse; }
          .player { height: 60%; flex: none; }
        }
      `}</style>
    </div>
  );
}
