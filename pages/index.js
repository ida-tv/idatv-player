import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';

export default function IDATVPlayer() {
  // Состояния для данных
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  // Состояния для функций
  const [search, setSearch] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [parentalPin, setParentalPin] = useState('1234');
  const [showSettings, setShowSettings] = useState(false);

  // 1. ЗАГРУЗКА НАСТРОЕК (Плейлист, EPG, Избранное) из памяти браузера
  useEffect(() => {
    const savedPlaylist = localStorage.getItem('idatv_url') || '';
    const savedEpg = localStorage.getItem('idatv_epg') || '';
    const savedFavs = JSON.parse(localStorage.getItem('idatv_favs') || '[]');
    const savedPin = localStorage.getItem('idatv_pin') || '1234';

    setPlaylistUrl(savedPlaylist);
    setEpgUrl(savedEpg);
    setFavorites(savedFavs);
    setParentalPin(savedPin);

    if (savedPlaylist) fetchPlaylist(savedPlaylist);
  }, []);

  // 2. ПАРСИНГ ПЛЕЙЛИСТА
  const fetchPlaylist = async (url) => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const data = await res.text();
      const result = parseM3U.parse(data);
      setChannels(result.items);
      localStorage.setItem('idatv_url', url);
    } catch (e) {
      alert('Ошибка загрузки плейлиста');
    }
  };

  // 3. РОДИТЕЛЬСКИЙ КОНТРОЛЬ
  const handleSelect = (ch) => {
    const isAdult = ch.group?.title?.toLowerCase().includes('adult') || ch.name.includes('18+');
    if (isAdult && isLocked) {
      const pass = prompt('Доступ ограничен. Введите код:');
      if (pass === parentalPin) {
        setIsLocked(false);
        setCurrentChannel(ch);
      } else {
        alert('Неверный код!');
      }
    } else {
      setCurrentChannel(ch);
    }
  };

  // 4. ИЗБРАННОЕ
  const toggleFav = (e, ch) => {
    e.stopPropagation();
    let newFavs = [...favorites];
    const isExist = newFavs.find(f => f.url === ch.url);
    if (isExist) {
      newFavs = newFavs.filter(f => f.url !== ch.url);
    } else {
      newFavs.push(ch);
    }
    setFavorites(newFavs);
    localStorage.setItem('idatv_favs', JSON.stringify(newFavs));
  };

  return (
    <div className="idatv-container">
      <Head><title>IDATV Premium</title></Head>

      {/* ШАПКА С НАСТРОЙКАМИ */}
      <header className="top-nav">
        <div className="logo">IDATV <span>PLAYER</span></div>
        <div className="nav-actions">
          <input placeholder="Поиск каналов..." onChange={e => setSearch(e.target.value)} />
          <button onClick={() => setShowSettings(!showSettings)}>⚙ Настройки</button>
        </div>
      </header>

      {/* ПАНЕЛЬ НАСТРОЕК (Ты просил возможность добавлять самому) */}
      {showSettings && (
        <div className="settings-modal">
          <h3>Настройки источников</h3>
          <div className="field">
            <label>Ссылка на M3U плейлист:</label>
            <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
            <button onClick={() => fetchPlaylist(playlistUrl)}>Обновить</button>
          </div>
          <div className="field">
            <label>Ссылка на EPG (XMLTV):</label>
            <input value={epgUrl} onChange={e => {setEpgUrl(e.target.value); localStorage.setItem('idatv_epg', e.target.value)}} />
          </div>
          <div className="field">
            <label>PIN-код (Adult):</label>
            <input type="text" value={parentalPin} onChange={e => {setParentalPin(e.target.value); localStorage.setItem('idatv_pin', e.target.value)}} />
          </div>
          <button className="close-btn" onClick={() => setShowSettings(false)}>Закрыть</button>
        </div>
      )}

      <main className="layout">
        {/* СПИСОК КАНАЛОВ */}
        <aside className="channel-bar">
          {favorites.length > 0 && (
            <div className="group">
              <h4>⭐ ИЗБРАННОЕ</h4>
              {favorites.map((ch, i) => (
                <div key={i} className="ch-card" onClick={() => handleSelect(ch)}>
                  <span>{ch.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="group">
            <h4>ВСЕ КАНАЛЫ</h4>
            {channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((ch, i) => (
              <div key={i} className="ch-card" onClick={() => handleSelect(ch)}>
                <img src={ch.tvg.logo} alt="" onError={(e) => e.target.src = 'https://via.placeholder.com/40'} />
                <div className="ch-text">
                  <div className="name">{ch.name}</div>
                  <div className="epg-mini">В эфире: {ch.group?.title || 'Загрузка программы...'}</div>
                </div>
                <button className={`fav-btn ${favorites.find(f => f.url === ch.url) ? 'active' : ''}`} onClick={(e) => toggleFav(e, ch)}>★</button>
              </div>
            ))}
          </div>
        </aside>

        {/* ПЛЕЕР И АРХИВ */}
        <section className="view-port">
          {currentChannel ? (
            <div className="player-box">
              <video controls autoPlay key={currentChannel.url}>
                <source src={currentChannel.url} type="application/x-mpegURL" />
              </video>
              <div className="info-panel">
                <h2>{currentChannel.name}</h2>
                <div className="archive-mock">
                  <span>⏪ Архив:</span>
                  <button onClick={() => alert('Загрузка архива за 1 час...')}>-1ч</button>
                  <button onClick={() => alert('Загрузка архива за 2 часа...')}>-2ч</button>
                  <button onClick={() => setCurrentChannel({...currentChannel})}>В эфир</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty">Выберите канал для просмотра</div>
          )}
        </section>
      </main>

      <style jsx>{`
        .idatv-container { background: #0a0a0a; color: white; height: 100vh; display: flex; flex-direction: column; }
        .top-nav { display: flex; justify-content: space-between; padding: 10px 20px; background: #111; border-bottom: 2px solid #ff0000; align-items: center; }
        .logo span { color: #ff0000; font-weight: bold; }
        .nav-actions input { background: #222; border: 1px solid #444; color: white; padding: 5px 10px; border-radius: 4px; margin-right: 10px; }
        
        .layout { display: flex; flex: 1; overflow: hidden; }
        .channel-bar { width: 320px; background: #111; overflow-y: auto; border-right: 1px solid #222; }
        .group h4 { font-size: 10px; color: #555; padding: 10px; letter-spacing: 2px; }
        .ch-card { display: flex; align-items: center; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #1a1a1a; position: relative; }
        .ch-card:hover { background: #1a1a1a; }
        .ch-card img { width: 45px; height: 30px; object-fit: contain; margin-right: 12px; }
        .name { font-size: 13px; font-weight: bold; }
        .epg-mini { font-size: 11px; color: #00ff00; margin-top: 2px; }
        .fav-btn { margin-left: auto; background: none; border: none; color: #333; cursor: pointer; font-size: 18px; }
        .fav-btn.active { color: #ffcc00; }

        .view-port { flex: 1; background: #000; display: flex; flex-direction: column; }
        video { width: 100%; aspect-ratio: 16/9; background: #000; }
        .info-panel { padding: 20px; background: #111; }
        .archive-mock { margin-top: 15px; display: flex; gap: 10px; align-items: center; }
        .archive-mock button { background: #333; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; }

        .settings-modal { position: absolute; top: 60px; right: 20px; background: #1a1a1a; border: 1px solid #ff0000; padding: 20px; z-index: 100; width: 400px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        .field { margin-bottom: 15px; }
        .field label { display: block; font-size: 12px; color: #888; margin-bottom: 5px; }
        .field input { width: 100%; background: #000; border: 1px solid #333; color: white; padding: 8px; }
        .close-btn { background: #ff0000; width: 100%; border: none; color: white; padding: 10px; cursor: pointer; margin-top: 10px; }
        .empty { margin: auto; color: #444; font-size: 20px; }
      `}</style>
    </div>
  );
}
