export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('No URL');
  try {
    const response = await fetch(url);
    const data = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (e) {
    res.status(500).send("Error loading text data");
  }
}
