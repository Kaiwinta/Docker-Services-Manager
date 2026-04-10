<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docker Services Manager</title>
  <link rel="stylesheet" href="public/style.css">
</head>
<body>

<header>
  <div class="header-left">
    <div class="logo">
      <img src="public/assets/logo.svg" alt="Somehow a whale?" />
    </div>
    <div>
      <h1>Docker Services Manager</h1>
      <div class="host" id="host-label">loading...</div>
    </div>
  </div>
  <div class="header-right">
    <button class="btn-refresh" onclick="loadContainers()">↻ Refresh</button>
  </div>
</header>

<div id="main">
  <!-- Here will be the list of containers... -->
</div>

<div class="footer">
  <div class="footer-stat">Running : <span id="count-running">—</span></div>
  <div class="footer-stat">Stopped : <span id="count-stopped">—</span></div>
</div>

</body>
</html>