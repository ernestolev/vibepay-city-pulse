param([int[]]$Ports = @(8080, 8081))
foreach ($port in $Ports) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    foreach ($c in $conn) {
      try {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
        Write-Output "killed pid $($c.OwningProcess) on port $port"
      } catch {
        Write-Output "failed to kill pid $($c.OwningProcess) on port $port"
      }
    }
  } else {
    Write-Output "port $port free"
  }
}
Start-Sleep -Seconds 2
foreach ($port in $Ports) {
  $still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($still) {
    Write-Output "port $port still in use"
  } else {
    Write-Output "port $port confirmed free"
  }
}
