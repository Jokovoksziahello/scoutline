<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CsiTi Pizza Admin</title>
<link rel="stylesheet" href="/style.css">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#111111">
</head>
<body class="admin"><div style="background:#111;color:white;text-align:center;padding:10px;font-weight:900">ÚJ VERZIÓ 6 – INGYENES WEB SERVICE – SZÍNES ÁLLAPOTOK ÉS TÖRLÉS</div>
<div id="login" class="login">
  <h1>Admin</h1>
  <form id="loginForm" class="form">
    <input name="password" type="password" placeholder="Jelszó" required>
    <button class="btn dark">Belépés</button>
  </form>
  <p>Alap jelszó: csiti123</p>
</div>

<div id="panel" class="admin-wrap" hidden>
  <div class="admin-head">
    <div>
      <span class="kicker">CSITI PIZZA</span>
      <h1>Rendelések</h1>
    </div>
    <button id="sound" class="btn dark">Hang és valódi push bekapcsolása</button>
  </div>

  <nav class="admin-tabs">
    <button class="admin-tab active" data-admin-view="ordersView">Rendelések</button>
    <button class="admin-tab" data-admin-view="summaryView">Rendelés összesítő</button>
  </nav>
  <section id="ordersView" class="admin-view active">
  <div class="status-legend">
    <span class="legend new">Új</span>
    <span class="legend making">Készítés alatt</span>
    <span class="legend ready">Kész</span>
    <span class="legend delivered">Átadva</span>
  </div>

  <div id="orders"></div>
  </section>

  <section id="summaryView" class="admin-view">
    <div class="summary-head">
      <div><span class="kicker">ÖSSZESÍTÉS</span><h2>Rendelés összesítő</h2></div>
      <button id="refreshSummary" class="btn dark">Frissítés</button>
    </div>
    <div class="period-stats">
      <div class="period-card"><span>Mai rendelések</span><b id="todayOrders">0</b></div>
      <div class="period-card"><span>Ebben a hónapban rendelt pizzák</span><b id="monthPizzas">0</b></div>
      <div class="period-card"><span>Havi rendelések</span><b id="monthOrders">0</b></div>
      <div class="period-card"><span>Jelenlegi rendelések</span><b id="currentOrdersCount">0</b></div>
    </div><div class="summary-stats" id="summaryStats"></div>
    <div class="summary-table-wrap">
      <table class="summary-table">
        <thead><tr><th>Pizza</th><th>Méret</th><th>Darab</th><th>Állapotok</th></tr></thead>
        <tbody id="summaryBody"></tbody>
      </table>
    </div>
    <div class="summary-by-order"><h3>Rendelésenkénti bontás</h3><div id="summaryOrders"></div></div>
  </section>
</div>

<div id="toast" class="toast"></div>
<script src="/admin.js"></script>
</body>
</html>