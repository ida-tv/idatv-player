export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');
  try {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/x-mpegURL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const data = await response.arrayBuffer();
    res.status(200).send(Buffer.from(data));
  } catch (e) { res.status(500).send('Proxy Error'); }
}
