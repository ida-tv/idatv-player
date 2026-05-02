import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Play, Search, LayoutGrid, X, Star } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Настройки
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState(['Все']);
  const [activeCat, setActiveCat] = useState('Все');
  const [currentCh, setCurrentCh] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Логика видео
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      const proxiedUrl = `/api/proxy?url=${encodeURIComponent(currentCh.url)}`;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        hlsRef.current = hls;
      } else {
        video.src = proxiedUrl;
      }
    }
  }, [currentCh]);

  const applyConfig = async () => {
    if (!playlistUrl) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      setCategories(['Все', ...new Set(parsed.items.map(i => i.group.title).filter(Boolean))]);
      localStorage.setItem('idatv_cfg', JSON.stringify({ playlistUrl, epgUrl }));
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка загрузки"); }
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('idatv_cfg') || '{}');
    if (saved.playlistUrl) {
      setPlaylistUrl(saved.playlistUrl);
      setEpgUrl(saved.epgUrl || '');
      applyConfig();
    }
  }, []);

  return (
    <div className="app">
      <Head><title>IDATV PRO</title></Head>

      <header className="nav">
        <div className="logo">IDATV<span>PRO</span></div>
        <button className="setup" onClick={() => setIsSettingsOpen(true)}><Settings/> НАСТРОЙКИ</button>
      </header>

      <div className="main">
        <aside className="groups">
          {categories.map(c => (
            <button key={c} className={activeCat === c ? 'active' : ''} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </aside>

        <section className="list-area">
          <div className="search-box"><Search size={16}/><input placeholder="Поиск..." onChange={e => setSearch(e.target.value)}/></div>
          <div className="list">
            {channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (activeCat === 'Все' || c.group.title === activeCat)).map((ch, i) => (
              <div key={i} className={`ch ${currentCh?.url === ch.url ? 'on' : ''}`} onClick={() => setCurrentCh(ch)}>
                <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
                <div className="info"><b>{ch.name}</b><p>Группа: {ch.group.title}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="player-area">
          {currentCh ? (
            <div className="video-box">
              <video ref={videoRef} controls autoPlay playsInline />
              <div className="meta"><h1>{currentCh.name}</h1></div>
            </div>
          ) : <div className="empty"><Play size={64}/><p>ВЫБЕРИТЕ КАНАЛ</p></div>}
        </section>
      </div>

      {isSettingsOpen && (
        <div className="modal">
          <div className="modal-in">
            <h3>ПАРАМЕТРЫ</h3>
            <label>Плейлист (M3U):</label>
            <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
            <label>Программа (EPG):</label>
            <input value={epgUrl} onChange={e => setEpgUrl(e.target.value)} />
            <button className="save" onClick={applyConfig}>СОХРАНИТЬ</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>ЗАКРЫТЬ</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .app { height: 100vh; display: flex; flex-direction: column; background: #000; color: #fff; font-family: sans-serif; }
        .nav { display: flex; justify-content: space-between; padding: 15px; background: #111; border-bottom: 2px solid red; }
        .logo span { color: red; font-weight: bold; }
        .setup { background: red; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; display: flex; gap: 8px; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .groups { width: 180px; background: #0a0a0a; overflow-y: auto; padding: 10px; border-right: 1px solid #222; }
        .groups button { width: 100%; text-align: left; padding: 10px; background: none; border: none; color: #888; cursor: pointer; }
        .groups button.active { background: red; color: #fff; border-radius: 5px; }
        .list-area { width: 320px; background: #050505; border-right: 1px solid #222; display: flex; flex-direction: column; }
        .search-box { padding: 10px; background: #111; display: flex; align-items: center; gap: 8px; }
        .search-box input { background: none; border: none; color: #fff; outline: none; }
        .list { flex: 1; overflow-y: auto; padding: 10px; }
        .ch { display: flex; gap: 10px; padding: 10px; cursor: pointer; border-bottom: 1px solid #111; }
        .ch.on { background: #222; border-left: 3px solid red; }
        .ch img { width: 40px; height: 30px; object-fit: contain; }
        .info b { font-size: 13px; display: block; }
        .info p { font-size: 10px; color: #0f0; }
        .player-area { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; }
        .video-box { width: 100%; height: 100%; display: flex; flex-direction: column; }
        video { width: 100%; flex: 1; background: #000; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-in { background: #1a1a1a; padding: 30px; border-radius: 15px; width: 400px; display: flex; flex-direction: column; gap: 10px; }
        .modal-in input { padding: 10px; background: #000; border: 1px solid #333; color: #fff; border-radius: 5px; }
        .save { background: red; color: #fff; border: none; padding: 10px; cursor: pointer; font-weight: bold; }
        .close { background: none; border: none; color: #555; cursor: pointer; }

        @media (max-width: 768px) {
          .groups { display: none; }
          .list-area { width: 100%; height: 40%; }
          .main { flex-direction: column-reverse; }
          .player-area { height: 60%; flex: none; }
        }
      `}</style>
    </div>
  );
}
