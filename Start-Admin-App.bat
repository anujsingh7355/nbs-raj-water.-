@echo off
title NBS AQUAVEDA - Admin & Backend Server
cd /d "c:\Users\pc\OneDrive\Desktop\nbs raj"
echo ===================================================
echo   NBS AQUAVEDA - Starting Backend & Admin App...
echo   Default Admin PIN: 7355
echo ===================================================
start "" "http://localhost:3000/admin"
node server.js
pause
