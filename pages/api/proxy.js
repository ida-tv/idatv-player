export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Referer': url
      }
    });

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/x-mpegURL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');

    // Передаем данные потоком напрямую
    const readableStream = response.body;
    const reader = readableStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error) {
    res.status(500).send('Streaming Error');
  }
}
