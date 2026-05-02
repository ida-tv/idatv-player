import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import { Settings, Star, Lock, PlayCircle } from 'lucide-react';

export default function IDATVPlayer() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [pin, setPin] = useState('');
  const [isLocked, setIsLocked] = useState(true);

  // Загрузка избранного из памяти при старте
  useEffect(() => {
    const savedFavs = JSON.parse(localStorage.getItem('idatv_favs') || '[]');
    setFavorites(savedFavs);
  }, []);

  const loadPlaylist = async () => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const data = await res.text();
      const result = parseM3U.parse(data);
      setChannels(result.items);
    } catch (e) {
      alert('Ошибка загрузки плейлиста');
    }
  };

  const handleChannelSelect = (channel) => {
    // Проверка родительского контроля для 18+
    if (channel.group.title.toLowerCase().includes('adult') && isLocked) {
      const input = prompt("Введите пароль для взрослых каналов:");
      if (input === '1234') { // Стандартный пароль
        setIsLocked(false);
        setCurrentChannel(channel);
      } else {
        alert("Неверный код!");
      }
    } else {
      setCurrentChannel(channel);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>IDATV Player</title>
      </Head>

      <header>
        <h1>IDATV</h1>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Ссылка на M3U плейлист" 
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
          />
          <button onClick={loadPlaylist}>Загрузить</button>
        </div>
      </header>

      <main className="content">
        <aside className="sidebar">
          <h3>Каналы ({channels.length})</h3>
          <div className="channel-list">
            {channels.map((ch, idx) => (
              <div key={idx} className="channel-item" onClick={() => handleChannelSelect(ch)}>
                <img src={ch.tvg.logo} alt="" width="30" />
                <div>
                  <div className="channel-name">{ch.name}</div>
                  <div className="current-program">Сейчас: Нажмите для просмотра</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="player-area">
          {currentChannel ? (
            <div className="video-wrapper">
              <video controls autoPlay src={currentChannel.url} style={{width: '100%'}} />
              <h2>{currentChannel.name}</h2>
            </div>
          ) : (
            <div className="placeholder">Выберите канал для просмотра</div>
          )}
        </section>
      </main>

      <style jsx>{`
        .container { background: #1a1a1a; color: white; height: 100vh; display: flex; flex-direction: column; font-family: sans-serif; }
        header { padding: 20px; display: flex; justify-content: space-between; align-items: center; background: #222; }
        .content { display: flex; flex: 1; overflow: hidden; }
        .sidebar { width: 300px; border-right: 1px solid #333; overflow-y: auto; padding: 10px; }
        .channel-item { display: flex; align-items: center; padding: 10px; cursor: pointer; border-bottom: 1px solid #333; }
        .channel-item:hover { background: #333; }
        .channel-name { font-weight: bold; font-size: 14px; }
        .current-program { font-size: 11px; color: #aaa; }
        .player-area { flex: 1; padding: 20px; background: #000; display: flex; align-items: center; justify-content: center; flex-direction: column; }
        input { padding: 10px; width: 300px; border-radius: 5px; border: none; }
        button { padding: 10px 20px; margin-left: 10px; border-radius: 5px; border: none; background: #e50914; color: white; cursor: pointer; }
      `}</style>
    </div>
  );
}
