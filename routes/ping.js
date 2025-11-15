// server/routes/ping.js
router.get("/ping", (req, res) => {
  res.status(200).send("pong");
});