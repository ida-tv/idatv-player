import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';

export default function IDATVPlayer() {
  const videoRef = useRef(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('Все');
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [parentalPin, setParentalPin] = useState('1234');

  // 1. Инициализация видеоплеера (HLS)
  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentChannel.url;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
  }, [currentChannel]);

  // 2. Загрузка данных из локальной памяти
  useEffect(() => {
    const savedUrl = localStorage.getItem('idatv_url');
    const savedFavs = JSON.parse(localStorage.getItem('idatv_favs') || '[]');
    setFavorites(savedFavs);
    if (savedUrl) {
      setPlaylistUrl(savedUrl);
      fetchPlaylist(savedUrl);
    }
  }, []);

  // 3. Функция загрузки и парсинга плейлиста + Группы
  const fetchPlaylist = async (url) => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const data = await res.text();
      const result = parseM3U.parse(data);
      
      setChannels(result.items);
      // Извлекаем уникальные группы
      const uniqueGroups = ['Все', ...new Set(result.items.map(item => item.group.title).filter(Boolean))];
      setGroups(uniqueGroups);
      localStorage.setItem('idatv_url', url);
    } catch (e) {
      alert('Ошибка: Плеер не смог загрузить данные. Проверьте ссылку.');
    }
  };

  const handleSelect = (ch) => {
    const isAdult = ch.group?.title?.toLowerCase().includes('adult') || ch.name.includes('18+');
    if (isAdult) {
      const pass = prompt('Канал 18+. Введите код:');
      if (pass !== parentalPin) return alert('Доступ закрыт');
    }
    setCurrentChannel(ch);
  };

  const filteredChannels = channels.filter(ch => 
    (selectedGroup === 'Все' || ch.group.title === selectedGroup)
  );

  return (
    <div className="idatv">
      <Head><title>IDATV Player</title></Head>

      <header className="bar">
        <div className="logo">IDATV <span>PRO</span></div>
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={() => setShowSettings(!showSettings)}>⚙ Настройки</button>
      </header>

      {showSettings && (
        <div className="modal">
          <input placeholder="Ссылка на M3U" value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
          <button onClick={() => fetchPlaylist(playlistUrl)}>Применить</button>
        </div>
      )}

      <div className="main">
        <aside className="sidebar">
          {filteredChannels.map((ch, i) => (
            <div key={i} className="card" onClick={() => handleSelect(ch)}>
              <img src={ch.tvg.logo} alt="" onError={(e) => e.target.src='https://via.placeholder.com/40'} />
              <div className="info">
                <div className="name">{ch.name}</div>
                <div className="epg">Программа: {ch.group.title}</div>
              </div>
            </div>
          ))}
        </aside>

        <main className="player">
          {currentChannel ? (
            <div className="vp">
              <video ref={videoRef} controls />
              <div className="details">
                <h1>{currentChannel.name}</h1>
                <div className="archive">
                  <button onClick={() => videoRef.current.currentTime -= 3600}>⏪ -1 час (Архив)</button>
                  <button onClick={() => videoRef.current.currentTime += 3600}>⏩ +1 час</button>
                </div>
              </div>
            </div>
          ) : <div className="empty">Выберите трансляцию</div>}
        </main>
      </div>

      <style jsx>{`
        .idatv { display: flex; flex-direction: column; height: 100vh; background: #000; color: #fff; font-family: sans-serif; }
        .bar { display: flex; gap: 20px; padding: 15px; background: #111; border-bottom: 1px solid #ff0000; align-items: center; }
        .logo span { color: #ff0000; }
        select { background: #222; color: #fff; border: 1px solid #444; padding: 5px; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 350px; overflow-y: auto; background: #0a0a0a; border-right: 1px solid #222; }
        .card { display: flex; padding: 10px; border-bottom: 1px solid #1a1a1a; cursor: pointer; align-items: center; }
        .card:hover { background: #1a1a1a; }
        .card img { width: 50px; height: 35px; object-fit: contain; margin-right: 10px; }
        .name { font-size: 14px; font-weight: bold; }
        .epg { font-size: 11px; color: #00ff00; }
        .player { flex: 1; display: flex; flex-direction: column; background: #000; }
        video { width: 100%; max-height: 70vh; background: #000; }
        .details { padding: 20px; }
        .archive { margin-top: 10px; display: flex; gap: 10px; }
        .archive button { background: #222; color: #fff; border: 1px solid #444; padding: 8px; cursor: pointer; }
        .modal { position: absolute; top: 70px; right: 20px; background: #111; padding: 20px; border: 1px solid #ff0000; z-index: 10; }
      `}</style>
    </div>
  );
}
