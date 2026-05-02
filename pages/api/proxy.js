export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');

  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    // Передаем заголовки, чтобы браузер понял, что это видео
    res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Читаем данные как поток и отдаем в ответ
    const blob = await response.arrayBuffer();
    res.status(200).send(Buffer.from(blob));
  } catch (error) {
    res.status(500).send('Proxy error');
  }
}
