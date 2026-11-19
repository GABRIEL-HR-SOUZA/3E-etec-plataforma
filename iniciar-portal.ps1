# Script para iniciar o Back-end Quarkus (SQLite) e o Front-end Angular do Portal de Vagas ETEC Cuiabá
Write-Host "Iniciando Back-end Java 21 + Quarkus + SQLite na porta 8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; & 'C:\Users\Gabriel\.maven\apache-maven-3.9.9\bin\mvn.cmd' quarkus:dev"

Write-Host "Iniciando Front-end Angular na porta 4200..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm start"
