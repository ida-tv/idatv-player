// pages/api/proxy.js
export default async function handler(req, res) {
  const { url } = req.query;
  const response = await fetch(url);
  const data = await response.text();
  res.status(200).send(data);
}
