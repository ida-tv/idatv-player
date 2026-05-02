import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';

export default function IDATVPlayer() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [search, setSearch] = useState('');

  // 1. Загрузка избранного при старте
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('idatv_favs') || '[]');
    setFavorites(saved);
  }, []);

  // 2. Загрузка и парсинг плейлиста через наш прокси
  const loadPlaylist = async () => {
    if (!playlistUrl) return alert('Введите ссылку!');
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const data = await res.text();
      const result = parseM3U.parse(data);
      setChannels(result.items);
      setFilteredChannels(result.items);
    } catch (e) {
      alert('Ошибка загрузки плейлиста. Проверьте ссылку.');
    }
  };

  // 3. Логика поиска
  useEffect(() => {
    const filtered = channels.filter(ch => 
      ch.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredChannels(filtered);
  }, [search, channels]);

  // 4. Родительский контроль (пин-код 1234)
  const handleSelectChannel = (ch) => {
    const isAdult = ch.group?.title?.toLowerCase().includes('adult') || 
                    ch.name.toLowerCase().includes('18+');
    
    if (isAdult && isLocked) {
      const pin = prompt('Введите PIN-код для доступа (1234):');
      if (pin === '1234') {
        setIsLocked(false);
        setCurrentChannel(ch);
      } else {
        alert('Неверный код!');
      }
    } else {
      setCurrentChannel(ch);
    }
  };

  // 5. Добавление в избранное
  const toggleFavorite = (e, ch) => {
    e.stopPropagation();
    let newFavs = [...favorites];
    const index = newFavs.findIndex(f => f.url === ch.url);
    if (index > -1) {
      newFavs.splice(index, 1);
    } else {
      newFavs.push(ch);
    }
    setFavorites(newFavs);
    localStorage.setItem('idatv_favs', JSON.stringify(newFavs));
  };

  return (
    <div className="app">
      <Head>
        <title>IDATV Player</title>
      </Head>

      <header className="header">
        <div className="logo">IDATV 📺</div>
        <div className="controls">
          <input 
            type="text" 
            placeholder="URL плейлиста (.m3u)" 
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <button onClick={loadPlaylist}>Загрузить</button>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <input 
            className="search"
            type="text" 
            placeholder="Поиск канала..." 
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="list">
            {/* Секция избранного */}
            {favorites.length > 0 && (
              <div className="section">
                <h4>⭐ Избранное</h4>
                {favorites.map((ch, i) => (
                  <div key={'fav'+i} className="item" onClick={() => handleSelectChannel(ch)}>
                    <span>{ch.name}</span>
                    <button onClick={(e) => toggleFavorite(e, ch)}>★</button>
                  </div>
                ))}
              </div>
            )}

            <div className="section">
              <h4>Все каналы</h4>
              {filteredChannels.map((ch, i) => (
                <div key={i} className="item" onClick={() => handleSelectChannel(ch)}>
                  <img src={ch.tvg.logo || 'https://via.placeholder.com/30'} alt="" />
                  <div className="ch-info">
                    <div className="ch-name">{ch.name}</div>
                    <div className="ch-epg">Сейчас идет: Программа передач...</div>
                  </div>
                  <button 
                    className={favorites.some(f => f.url === ch.url) ? 'fav-active' : ''}
                    onClick={(e) => toggleFavorite(e, ch)}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="player">
          {currentChannel ? (
            <div className="video-container">
              <video 
                key={currentChannel.url}
                controls 
                autoPlay 
                src={currentChannel.url} 
              />
              <div className="player-info">
                <h2>{currentChannel.name}</h2>
                <p>Группа: {currentChannel.group?.title || 'Общие'}</p>
              </div>
            </div>
          ) : (
            <div className="no-video">Выберите канал для начала просмотра</div>
          )}
        </section>
      </main>

      <style jsx>{`
        .app { background: #0f0f0f; color: white; height: 100vh; display: flex; flex-direction: column; font-family: 'Segoe UI', Tahoma, sans-serif; }
        .header { display: flex; justify-content: space-between; padding: 15px 25px; background: #1a1a1a; border-bottom: 1px solid #333; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; color: #ff0000; }
        .controls input { padding: 8px; width: 350px; background: #2a2a2a; border: 1px solid #444; color: white; border-radius: 4px; }
        .controls button { padding: 8px 20px; background: #ff0000; border: none; color: white; cursor: pointer; border-radius: 4px; margin-left: 10px; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 350px; background: #1a1a1a; display: flex; flex-direction: column; border-right: 1px solid #333; }
        .search { margin: 15px; padding: 10px; background: #2a2a2a; border: none; color: white; border-radius: 4px; }
        .list { overflow-y: auto; flex: 1; }
        .section h4 { padding: 10px 15px; color: #888; font-size: 12px; text-transform: uppercase; }
        .item { display: flex; align-items: center; padding: 10px 15px; cursor: pointer; transition: 0.2s; border-bottom: 1px solid #222; }
        .item:hover { background: #333; }
        .item img { width: 40px; height: 30px; object-fit: contain; margin-right: 15px; }
        .ch-info { flex: 1; }
        .ch-name { font-size: 14px; font-weight: 500; }
        .ch-epg { font-size: 11px; color: #888; }
        .item button { background: none; border: none; color: #444; font-size: 18px; cursor: pointer; }
        .item button.fav-active { color: #ffcc00; }
        .player { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; position: relative; }
        video { width: 100%; max-height: 80vh; outline: none; }
        .player-info { padding: 20px; background: #1a1a1a; width: 100%; position: absolute; bottom: 0; }
        .no-video { color: #555; font-size: 18px; }
      `}</style>
    </div>
  );
}
