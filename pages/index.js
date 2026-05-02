import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import parseM3U from 'iptv-playlist-parser';
import Hls from 'hls.js';
import { Settings, Play, Search, ShieldCheck } from 'lucide-react';

export default function IDATVPro() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState([]);
  const [activeCat, setActiveCat] = useState('Все');
  const [currentCh, setCurrentCh] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Запуск видео напрямую (без прокси Vercel)
  useEffect(() => {
    if (currentCh && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const video = videoRef.current;
      const streamUrl = currentCh.url;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hlsRef.current = hls;
      } else {
        video.src = streamUrl;
      }
    }
  }, [currentCh]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(playlistUrl)}`);
      const text = await res.text();
      const parsed = parseM3U.parse(text);
      setChannels(parsed.items);
      localStorage.setItem('idatv_v3', playlistUrl);
      setIsSettingsOpen(false);
    } catch (e) { alert("Ошибка загрузки плейлиста"); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('idatv_v3');
    if (saved) { setPlaylistUrl(saved); }
  }, []);

  return (
    <div className="idatv">
      <Head><title>IDATV PRO</title></Head>

      <header className="header">
        <div className="logo">IDATV<span>PRO</span></div>
        <button className="set-btn" onClick={() => setIsSettingsOpen(true)}><Settings/> НАСТРОЙКИ</button>
      </header>

      <main className="main">
        <div className="list">
          {channels.map((ch, i) => (
            <div key={i} className="item" onClick={() => setCurrentCh(ch)}>
              <img src={ch.tvg.logo} alt="" onError={e => e.target.src='https://via.placeholder.com/40'} />
              <div>
                <div className="name">{ch.name}</div>
                <div className="group">{ch.group.title}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="player">
          {currentCh ? (
            <video ref={videoRef} controls autoPlay />
          ) : <div className="empty">Выберите канал</div>}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Вставьте ссылку на M3U:</h3>
            <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} />
            <button className="save" onClick={loadData}>ЗАГРУЗИТЬ</button>
            <button className="close" onClick={() => setIsSettingsOpen(false)}>ЗАКРЫТЬ</button>
            <p style={{fontSize: '10px', color: '#666', marginTop: '10px'}}>
              *Если видео не грузится, установите в браузер расширение "Allow CORS".
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .idatv { height: 100vh; background: #000; color: #fff; display: flex; flex-direction: column; font-family: sans-serif; }
        .header { display: flex; justify-content: space-between; padding: 15px; background: #111; border-bottom: 2px solid red; }
        .logo span { color: red; font-weight: bold; }
        .set-btn { background: red; color: #fff; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; display: flex; gap: 8px; }
        .main { display: flex; flex: 1; overflow: hidden; }
        .list { width: 300px; background: #0a0a0a; overflow-y: auto; border-right: 1px solid #222; }
        .item { display: flex; align-items: center; gap: 10px; padding: 10px; cursor: pointer; border-bottom: 1px solid #111; }
        .item:hover { background: #1a1a1a; }
        .item img { width: 40px; height: 30px; object-fit: contain; }
        .name { font-size: 13px; font-weight: bold; }
        .group { font-size: 10px; color: #0f0; }
        .player { flex: 1; background: #000; display: flex; align-items: center; justify-content: center; }
        video { width: 100%; height: 100%; max-height: 80vh; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; }
        .modal-content { background: #1a1a1a; padding: 30px; border-radius: 10px; width: 400px; display: flex; flex-direction: column; gap: 15px; }
        .modal-content input { padding: 10px; background: #000; border: 1px solid #333; color: #fff; }
        .save { background: red; color: #fff; border: none; padding: 10px; cursor: pointer; }
        .close { background: none; border: none; color: #555; cursor: pointer; }
      `}</style>
    </div>
  );
}
