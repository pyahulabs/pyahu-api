# Prueba todos los endpoints de la API, uno por uno, y muestra cada respuesta.
# Uso (con el servidor andando):  powershell -ExecutionPolicy Bypass -File scripts\probar-api.ps1
# Crea un usuario y datos de prueba nuevos en cada corrida.
# El archivo está guardado en UTF-8 con BOM: sin BOM, PowerShell 5.1 lee mal las tildes.
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$api = 'http://localhost:3000'

# Hace un pedido HTTP y muestra método, ruta, código de estado y respuesta.
# Invoke-WebRequest tira una excepción con los 4xx/5xx: el catch la convierte en salida normal.
function Pedir($metodo, $ruta, $cuerpo, $token) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $p = @{ Method = $metodo; Uri = "$api$ruta"; Headers = $headers; UseBasicParsing = $true
          ContentType = 'application/json; charset=utf-8' }
  if ($null -ne $cuerpo) { $p.Body = [Text.Encoding]::UTF8.GetBytes(($cuerpo | ConvertTo-Json -Compress)) }
  try {
    $r = Invoke-WebRequest @p
    $codigo = [int]$r.StatusCode
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  } catch {
    $codigo = [int]$_.Exception.Response.StatusCode
    $texto = $_.ErrorDetails.Message
  }
  $color = if ($codigo -lt 300) { 'Green' } else { 'Yellow' }
  Write-Host ''
  Write-Host "$metodo $ruta -> $codigo" -ForegroundColor $color
  if ($texto) { Write-Host ('  ' + ($texto -replace '"token":"[^"]+"', '"token":"eyJ... (recortado)"')) }
  if ($texto) { try { return $texto | ConvertFrom-Json } catch {} }
}

$email = "prueba$(Get-Random)@pyahulabs.com"
$clave = 'unaClaveSegura123'

Write-Host '== Autenticación ==' -ForegroundColor Cyan
Pedir GET '/estado' | Out-Null
Pedir POST '/auth/registro' @{ nombre = 'Nicolás'; email = $email; password = $clave } | Out-Null
Pedir POST '/auth/registro' @{ nombre = 'Nicolás'; email = $email; password = $clave } | Out-Null   # 409: email repetido
Pedir POST '/auth/login' @{ email = $email; password = 'otra' } | Out-Null                          # 401
$token = (Pedir POST '/auth/login' @{ email = $email; password = $clave }).token
Pedir GET '/clientes' | Out-Null                                                                     # 401: sin token

Write-Host ''
Write-Host '== Clientes ==' -ForegroundColor Cyan
$cliente = Pedir POST '/clientes' @{ nombre = "Café Ka'a"; email = 'hola@cafekaa.com.py'; telefono = '+595 981 123456'; ruc_ci = '80012345-6' } $token
Pedir POST '/clientes' @{ nombre = 'Sin datos'; telefono = 'llamame' } $token | Out-Null              # 400: validación
Pedir GET "/clientes/$($cliente.id)" $null $token | Out-Null

Write-Host ''
Write-Host '== Proyectos ==' -ForegroundColor Cyan
$proyecto = Pedir POST '/proyectos' @{ cliente_id = $cliente.id; nombre = 'Sitio web con menú'; estado = 'en_curso'; monto_total = 3500000 } $token
Pedir PUT "/proyectos/$($proyecto.id)" @{ cliente_id = $cliente.id; nombre = 'Sitio web con menú y reservas'; estado = 'en_curso'; monto_total = 4200000 } $token | Out-Null

Write-Host ''
Write-Host '== Pagos ==' -ForegroundColor Cyan
Pedir POST '/pagos' @{ proyecto_id = $proyecto.id; monto = 1500000; metodo = 'transferencia'; fecha = '2026-11-01'; nota = 'Seña 40%' } $token | Out-Null
Pedir POST '/pagos' @{ proyecto_id = $proyecto.id; monto = 9000000; fecha = '2026-11-02' } $token | Out-Null    # 400: supera el saldo
Pedir PUT "/proyectos/$($proyecto.id)" @{ cliente_id = $cliente.id; nombre = 'Sitio'; estado = 'en_curso'; monto_total = 1000 } $token | Out-Null  # 400: menos de lo cobrado
Pedir GET "/pagos?proyecto_id=$($proyecto.id)" $null $token | Out-Null
Pedir GET '/proyectos' $null $token | Out-Null
Pedir PATCH "/proyectos/$($proyecto.id)/estado" @{ estado = 'entregado' } $token | Out-Null

Write-Host ''
Write-Host '== Resumen ==' -ForegroundColor Cyan
Pedir GET '/resumen' $null $token | Out-Null
