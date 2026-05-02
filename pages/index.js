import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Star, Search, Menu, X, Play, LayoutGrid, ShieldAlert } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Поля для твоих ссылок
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [parentalPin, setParentalPin] = useState('1234');
  
  // Данные плеера
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCategory, setActiveCategory] = useState('Все');
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  // Состояния UI
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdultUnlocked, setIsAdultUnlocked] = useState(false);

  // Исправленная загрузка видео через прокси
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
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

  // Функция применения твоих ссылок
  const applyConfig = async () => {
    if (!playlistUrl) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', 'Избранное', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      
      // Сохраняем всё навседу в браузер
      localStorage.setItem('idatv_url', playlistUrl);
      localStorage.setItem('idatv_epg', epgUrl);
      localStorage.setItem('idatv_pin', parentalPin);
      
      setIsSettingsOpen(false);
    } catch (err) { alert("Ошибка загрузки! Проверь ссылку на плейлист."); }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('idatv_url');
    const savedEpg = localStorage.getItem('idatv_epg');
    const savedPin = localStorage.getItem('idatv_pin');
    if (savedUrl) { setPlaylistUrl(savedUrl); applyConfig(); }
    if (savedEpg) setEpgUrl(savedEpg);
    if (savedPin) setParentalPin(savedPin);
    setFavorites(JSON.parse(localStorage.getItem('idatv_favs') || '[]'));
  }, []);

  const handleChannelSelect = (ch) => {
    const isAdult = ch.group.title?.toLowerCase().includes('adult') || ch.name.includes('18+');
    if (isAdult && !isAdultUnlocked) {
      const input = prompt("Вход ограничен. Введите ваш PIN:");
      if (input === parentalPin) {
        setIsAdultUnlocked(true);
        setCurrentChannel(ch);
      } else { alert("Неверный код!"); }
    } else {
      setCurrentChannel(ch);
    }
  };

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
      <Head><title>IDATV PRO</title></Head>

      <div className="layout">
        {/* Боковая панель: теперь кнопка Настройки всегда внизу */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <div className="logo">IDATV<span>PRO</span></div>
            <nav>
              {categories.map(cat => (
                <button key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => {setActiveCategory(cat); setIsSidebarOpen(false)}}>
                  <LayoutGrid size={18}/> {cat}
                </button>
              ))}
            </nav>
            <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={20}/> Настройки плеера
            </button>
          </div>
        </aside>

        <section className="main-view">
          <header className="mobile-bar">
            <button onClick={() => setIsSidebarOpen(true)}><Menu/></button>
            <div className="logo">IDATV<span>PRO</span></div>
            <button onClick={() => setIsSettingsOpen(true)}><Settings/></button>
          </header>

          <div className="view-split">
            {/* Список каналов */}
            <div className="channels">
              <div className="search-box"><Search size={18}/><input placeholder="Поиск..." onChange={e => setSearchTerm(e.target.value)} /></div>
              <div className="list">
                {filtered.map((ch, i) => (
                  <div key={i} className={`ch-card ${currentChannel?.url === ch.url ? 'active' : ''}`} onClick={() => handleChannelSelect(ch)}>
                    <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40?text=TV'} />
                    <div className="info">
                      <div className="name">{ch.name}</div>
                      <div className="desc">Сейчас: {ch.group.title}</div>
                    </div>
                    <button className={`fav ${favorites.some(f => f.url === ch.url) ? 'active' : ''}`} onClick={e => toggleFav(e, ch)}>
                      <Star size={14} fill={favorites.some(f => f.url === ch.url) ? "gold" : "none"}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Плеер */}
            <div className="player">
              {currentChannel ? (
                <div className="video-wrap">
                  <video ref={videoRef} controls autoPlay playsInline />
                  <div className="video-info">
                    <h1>{currentChannel.name}</h1>
                    <p>{currentChannel.group.title} • LIVE</p>
                  </div>
                </div>
              ) : <div className="no-vid"><Play size={60}/><p>Выберите канал</p></div>}
            </div>
          </div>
        </section>
      </div>

      {/* ТО САМОЕ ОКНО НАСТРОЕК ДЛЯ ТВОИХ ССЫЛОК */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Конфигурация IDATV</h2>
            <div className="group">
              <label>Твой IPTV плейлист (M3U):</label>
              <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://site.com/playlist.m3u" />
            </div>
            <div className="group">
              <label>Твой EPG (XMLTV):</label>
              <input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} placeholder="https://site.com/epg.xml" />
            </div>
            <div className="group">
              <label>PIN-код для 18+:</label>
              <input type="text" value={parentalPin} onChange={e => setParentalPin(e.target.value)} maxLength={4} />
            </div>
            <button className="apply" onClick={applyConfig}>Сохранить и загрузить</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .app { height: 100vh; background: #000; color: #fff; font-family: system-ui; overflow: hidden; }
        .layout { display: flex; height: 100%; }
        
        .sidebar { width: 260px; background: #0a0a0a; border-right: 1px solid #222; }
        .sidebar-content { display: flex; flex-direction: column; height: 100%; padding: 20px; }
        .logo { font-size: 24px; font-weight: 900; margin-bottom: 30px; }
        .logo span { color: #ff0000; }
        nav { flex: 1; overflow-y: auto; }
        nav button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: none; border: none; color: #888; cursor: pointer; border-radius: 8px; text-align: left; margin-bottom: 4px; }
        nav button.active { background: #ff0000; color: #fff; }
        .settings-btn { margin-top: auto; padding: 15px; background: #222; border: none; color: #fff; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; }

        .main-view { flex: 1; display: flex; flex-direction: column; }
        .mobile-bar { display: none; padding: 15px; background: #111; justify-content: space-between; border-bottom: 1px solid #ff0000; }
        .view-split { display: flex; flex: 1; overflow: hidden; }

        .channels { width: 340px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search-box { padding: 15px; background: #111; display: flex; align-items: center; gap: 10px; }
        .search-box input { background: none; border: none; color: #fff; outline: none; width: 100%; }
        .list { flex: 1; overflow-y: auto; padding: 10px; }
        .ch-card { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; margin-bottom: 6px; }
        .ch-card:hover { background: #1a1a1a; }
        .ch-card.active { background: rgba(255, 0, 0, 0.2); border: 1px solid #ff0000; }
        .ch-card img { width: 40px; height: 30px; object-fit: contain; }
        .name { font-size: 13px; font-weight: bold; }
        .desc { font-size: 10px; color: #00ff00; }
        .fav { margin-left: auto; background: none; border: none; color: #333; cursor: pointer; }
        .fav.active { color: gold; }

        .player { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; }
        .video-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .video-info { padding: 20px; background: #0a0a0a; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 5000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 20px; width: 90%; max-width: 450px; }
        .group { margin-bottom: 15px; }
        .group label { display: block; font-size: 12px; color: #888; margin-bottom: 8px; }
        .group input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; }
        .apply { width: 100%; padding: 12px; background: #ff0000; border: none; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .close { width: 100%; margin-top: 10px; background: none; border: none; color: #666; cursor: pointer; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-bar { display: flex; }
          .view-split { flex-direction: column-reverse; }
          .channels { width: 100%; flex: 1; }
          .player { height: 40%; flex: none; }
        }
      `}</style>
    </div>
  );
}
