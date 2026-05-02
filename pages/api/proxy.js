export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    // Передаем заголовки, чтобы браузер понял, что это видео-стрим
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/x-mpegURL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Читаем поток данных и отдаем его пользователю
    const data = await response.arrayBuffer();
    res.status(200).send(Buffer.from(data));
  } catch (error) {
    res.status(500).send('Proxy Error');
  }
}
