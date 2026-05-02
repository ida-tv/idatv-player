import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Star, Search, ChevronRight, Play, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [pin, setPin] = useState('1234');

  // Инициализация видео с исправлением Mixed Content
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();

      const video = videoRef.current;
      
      // ИСПРАВЛЕНИЕ: Всегда прогоняем через прокси для обхода Mixed Content (HTTP -> HTTPS)
      const streamUrl = `/api/proxy?url=${encodeURIComponent(currentChannel.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    }
  }, [currentChannel]);

  // Загрузка плейлиста
  const loadPlaylist = async (url) => {
    if (!url) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      
      setChannels(parsed.items);
      const cats = ['Все', 'Избранное', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))];
      setCategories(cats);
      localStorage.setItem('idatv_url', url);
      setIsSettingsOpen(false);
    } catch (err) {
      alert("Ошибка загрузки плейлиста. Проверьте ссылку.");
    }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('idatv_url');
    if (savedUrl) { setPlaylistUrl(savedUrl); loadPlaylist(savedUrl); }
    const savedFavs = JSON.parse(localStorage.getItem('idatv_favs') || '[]');
    setFavorites(savedFavs);
  }, []);

  const handleChannelClick = (ch) => {
    const isAdult = ch.group.title?.toLowerCase().includes('adult') || ch.name.includes('18+');
    if (isAdult) {
      const input = prompt("Вход ограничен. Введите PIN:");
      if (input !== pin) return alert("Доступ запрещен");
    }
    setCurrentChannel(ch);
  };

  const toggleFav = (e, ch) => {
    e.stopPropagation();
    const isFav = favorites.some(f => f.url === ch.url);
    const newFavs = isFav 
      ? favorites.filter(f => f.url !== ch.url) 
      : [...favorites, ch];
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
    <div className="app-container">
      <Head><title>IDATV Premium</title></Head>

      <aside className="cat-sidebar">
        <div className="logo-box">IDATV<span>PRO</span></div>
        <nav>
          {categories.map(cat => (
            <button key={cat} className={activeCategory === cat ? 'active' : ''} onClick={() => setActiveCategory(cat)}>
              {cat === 'Все' ? <LayoutGrid size={18}/> : <ChevronRight size={16}/>}
              <span>{cat}</span>
            </button>
          ))}
        </nav>
        <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}>
          <Settings size={20}/> Настройки
        </button>
      </aside>

      <section className="channel-section">
        <div className="search-box"><Search size={18} /><input placeholder="Поиск..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
        <div className="channel-grid">
          {filtered.map((ch, i) => (
            <motion.div layout key={i} className={`channel-card ${currentChannel?.url === ch.url ? 'playing' : ''}`} onClick={() => handleChannelClick(ch)}>
              <div className="img-wrapper">
                <img src={ch.tvg.logo} alt="" onError={(e) => e.target.src='https://via.placeholder.com/100?text=TV'} />
                {currentChannel?.url === ch.url && <div className="play-overlay"><Play fill="white" size={16}/></div>}
              </div>
              <div className="ch-info">
                <span className="name">{ch.name}</span>
                <div className="epg-bar"><div className="progress" style={{width: '60%'}}></div></div>
                <span className="epg-text">Сейчас: {ch.group.title}</span>
              </div>
              <button className={`fav-star ${favorites.some(f => f.url === ch.url) ? 'active' : ''}`} onClick={(e) => toggleFav(e, ch)}>
                <Star size={14} fill={favorites.some(f => f.url === ch.url) ? "#ffcc00" : "none"}/>
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      <main className="player-section">
        {currentChannel ? (
          <div className="video-container">
            <video ref={videoRef} controls autoPlay />
            <div className="video-details">
              <h1>{currentChannel.name}</h1>
              <div className="tags">
                <span className="tag live">LIVE</span>
                <span className="tag group">{currentChannel.group.title}</span>
              </div>
            </div>
          </div>
        ) : <div className="welcome"><Play size={60}/><p>Выберите канал</p></div>}
      </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="overlay">
            <motion.div initial={{y:50}} animate={{y:0}} className="modal">
              <h2>Настройки</h2>
              <div className="input-group">
                <label>M3U Ссылка:</label>
                <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
              </div>
              <div className="input-group">
                <label>PIN-код:</label>
                <input value={pin} onChange={e => setPin(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button className="save" onClick={() => loadPlaylist(playlistUrl)}>Сохранить</button>
                <button className="cancel" onClick={() => setIsSettingsOpen(false)}>Закрыть</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .app-container { display: flex; height: 100vh; background: #050505; color: #eee; font-family: 'Inter', sans-serif; overflow: hidden; }
        .cat-sidebar { width: 240px; background: #0f0f0f; display: flex; flex-direction: column; padding: 20px; border-right: 1px solid #222; }
        .logo-box { font-size: 24px; font-weight: 900; margin-bottom: 30px; }
        .logo-box span { color: #e50914; }
        nav { flex: 1; overflow-y: auto; }
        nav button { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; background: none; border: none; color: #888; cursor: pointer; border-radius: 8px; margin-bottom: 4px; text-align: left; }
        nav button.active { background: #e50914; color: #fff; }
        .channel-section { width: 380px; display: flex; flex-direction: column; background: #0a0a0a; border-right: 1px solid #222; }
        .search-box { padding: 20px; display: flex; align-items: center; gap: 10px; background: #0f0f0f; }
        .search-box input { flex: 1; background: none; border: none; color: #fff; outline: none; }
        .channel-grid { flex: 1; overflow-y: auto; padding: 10px; }
        .channel-card { display: flex; gap: 12px; padding: 10px; border-radius: 12px; cursor: pointer; margin-bottom: 8px; position: relative; }
        .channel-card.playing { background: rgba(229, 9, 20, 0.2); border: 1px solid #e50914; }
        .img-wrapper { width: 80px; height: 50px; border-radius: 6px; overflow: hidden; background: #000; position: relative; }
        .img-wrapper img { width: 100%; height: 100%; object-fit: contain; }
        .ch-info { flex: 1; }
        .name { font-size: 13px; font-weight: 600; display: block; }
        .epg-bar { height: 3px; background: #333; border-radius: 2px; margin: 4px 0; overflow: hidden; }
        .progress { height: 100%; background: #e50914; }
        .epg-text { font-size: 10px; color: #666; }
        .fav-star { background: none; border: none; cursor: pointer; color: #444; }
        .fav-star.active { color: #ffcc00; }
        .player-section { flex: 1; background: #000; }
        video { width: 100%; height: 70vh; background: #000; }
        .video-details { padding: 20px; }
        .tag { padding: 4px 8px; background: #333; border-radius: 4px; font-size: 10px; margin-right: 8px; }
        .live { background: #e50914; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 400px; }
        .input-group { margin-bottom: 15px; }
        .input-group input { width: 100%; padding: 10px; background: #000; border: 1px solid #333; color: #fff; border-radius: 5px; }
        .save { background: #e50914; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 100%; font-weight: bold; }
      `}</style>
    </div>
  );
}
