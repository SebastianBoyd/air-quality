# Backend
Data fetching 
  - run scheduled jobs to fetch data from sensor over http, later I should change this to mqtt
  - APScheduler (probably better) or cron to schedule jobs

API Sever
- flask based
- use flask-caching for performance 
- flask-sqlalchemy for database connection
- nginx production server proxies to flask server

# Frontend
Current status
- Right now everything is plain HTML and JS 
- Later I want to add charts and maybe use a frontend framework

Charting
- a few different options: D3 (powerful but annoying), ECharts, vega-lite, vega?
- should be very flexible and customizable

Serving
- nginx directly serves static assets

Frameworks?
- could use popular framework such as React or Vue.js
- or I could keep it simple with plain HTML, js
