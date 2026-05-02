import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Search, Menu, List, Play, ChevronRight } from 'lucide-react';

export default function IDATV_Eternal() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCat, setActiveCat] = useState('Все');
  const [currentCh, setCurrentCh] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // КРИТИЧЕСКИЙ ФУНКЦИОНАЛ: Запуск видео
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      
      // Используем мощный внешний CORS-прокси, который не упадет как Vercel
      const streamUrl = `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(currentCh.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hls.loadSource(currentCh.url); // Пробуем сначала напрямую
        hls.attachMedia(video);
        
        // Если прямая ссылка не заводится (ошибка CORS), переключаем на прокси автоматически
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.details === 'manifestLoadError') {
            hls.loadSource(streamUrl);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else {
        video.src = currentCh.url;
      }
    }
  }, [currentCh]);

  const loadPlaylist = async (url) => {
    if (!url) return;
    try {
      // Плейлист грузим через наш внутренний API (он короткий, Vercel его потянет)
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_eternal_cfg', url);
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка! Проверь ссылку."); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('idatv_eternal_cfg');
    if (saved) { setPlaylistUrl(saved); loadPlaylist(saved); }
  }, []);

  return (
    <div className="idatv">
      <Head>
        <title>IDATV ETERNAL</title>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </Head>

      <div className="ui-wrapper">
        {/* Боковая панель (Категории) */}
        <aside className="sidebar">
          <div className="logo">IDATV<span>PRO</span></div>
          <div className="nav-scroll">
            {categories.map(c => (
              <button key={c} className={activeCat === c ? 'active' : ''} onClick={() => setActiveCat(c)}>
                <List size={16}/> {c}
              </button>
            ))}
          </div>
          <button className="set-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={18}/> Настройки</button>
        </aside>

        {/* Список каналов */}
        <section className="list-pane">
          <div className="search-box"><Search size={18}/><input placeholder="Поиск..." onChange={e => setSearch(e.target.value)} /></div>
          <div className="ch-grid">
            {channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (activeCat === 'Все' || c.group.title === activeCat)).map((ch, i) => (
              <div key={i} className={`ch-card ${currentCh?.url === ch.url ? 'active' : ''}`} onClick={() => setCurrentCh(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
                <div className="ch-info">
                  <b>{ch.name}</b>
                  <span>{ch.group.title}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Плеер и Инфо */}
        <main className="player-pane">
          {currentCh ? (
            <div className="video-content">
              <div className="screen"><video ref={videoRef} controls autoPlay playsInline /></div>
              <div className="epg-box">
                <div className="epg-header">СЕЙЧАС В ЭФИРЕ</div>
                <div className="epg-current">
                  <h2>{currentCh.name}</h2>
                  <div className="progress-bg"><div className="progress-bar" style={{width: '35%'}}></div></div>
                  <p>Канал транслируется в реальном времени. Группа: {currentCh.group.title}</p>
                </div>
              </div>
            </div>
          ) : <div className="no-ch"><Play size={64}/><p>ВЫБЕРИТЕ ТРАНСЛЯЦИЮ</p></div>}
        </main>
      </div>

      {/* Окно настроек */}
      {isSettingsOpen && (
        <div className="modal-wrap">
          <div className="modal">
            <h2>Настройки плейлиста</h2>
            <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="Вставьте ссылку .m3u" />
            <button className="apply" onClick={() => loadPlaylist(playlistUrl)}>ЗАГРУЗИТЬ</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>ЗАКРЫТЬ</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .idatv { height: 100vh; background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow: hidden; }
        .ui-wrapper { display: flex; height: 100%; }
        
        .sidebar { width: 240px; background: #0a0a0a; border-right: 1px solid #1a1a1a; display: flex; flex-direction: column; }
        .logo { padding: 25px; font-weight: 900; font-size: 22px; border-bottom: 1px solid #1a1a1a; }
        .logo span { color: #e50914; }
        .nav-scroll { flex: 1; overflow-y: auto; padding: 10px; }
        .nav-scroll button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; background: none; border: none; color: #666; cursor: pointer; text-align: left; transition: 0.2s; }
        .nav-scroll button.active { background: #e50914; color: #fff; border-radius: 8px; }
        .set-btn { margin: 15px; padding: 12px; background: #1a1a1a; border: 1px solid #333; color: #fff; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; }

        .list-pane { width: 320px; background: #050505; border-right: 1px solid #1a1a1a; display: flex; flex-direction: column; }
        .search-box { padding: 15px; background: #0f0f0f; display: flex; align-items: center; gap: 10px; }
        .search-box input { background: none; border: none; color: #fff; width: 100%; outline: none; }
        .ch-grid { flex: 1; overflow-y: auto; padding: 10px; }
        .ch-card { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 5px; }
        .ch-card.active { background: rgba(229, 9, 20, 0.2); border: 1px solid #e50914; }
        .ch-card img { width: 40px; height: 30px; object-fit: contain; }
        .ch-info b { font-size: 13px; display: block; }
        .ch-info span { font-size: 10px; color: #00ff00; }

        .player-pane { flex: 1; background: #000; position: relative; }
        .video-content { display: flex; flex-direction: column; height: 100%; }
        .screen { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; max-height: 100%; outline: none; }
        
        .epg-box { height: 200px; background: #0a0a0a; padding: 25px; border-top: 1px solid #1a1a1a; }
        .epg-header { color: #e50914; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
        .progress-bg { height: 4px; background: #222; border-radius: 2px; margin: 15px 0; overflow: hidden; }
        .progress-bar { height: 100%; background: #e50914; }

        .modal-wrap { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 400px; }
        .modal input { width: 100%; padding: 12px; background: #000; border: 1px solid #333; color: #fff; border-radius: 8px; margin: 15px 0; }
        .apply { width: 100%; padding: 12px; background: #e50914; border: none; color: #fff; font-weight: bold; border-radius: 8px; cursor: pointer; }
        .close { width: 100%; margin-top: 10px; background: none; border: none; color: #555; cursor: pointer; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .list-pane { width: 100%; height: 40%; }
          .ui-wrapper { flex-direction: column-reverse; }
          .player-pane { height: 60%; flex: none; }
        }
      `}</style>
    </div>
  );
}
