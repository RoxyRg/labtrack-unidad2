import json
import getpass
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:3002"

correo = input("Correo ADMIN: ").strip()
password = getpass.getpass("Contraseña ADMIN: ")

def consultar(ruta, metodo="GET", datos=None, token=None):
    cuerpo = json.dumps(datos).encode() if datos is not None else None

    headers = {"Content-Type": "application/json"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(
        BASE + ruta,
        data=cuerpo,
        headers=headers,
        method=metodo
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, {}

estado, login = consultar(
    "/auth/login",
    "POST",
    {"correo": correo, "password": password}
)

if estado != 201 or not login.get("access_token"):
    raise SystemExit(f"ERROR: login ADMIN HTTP {estado}")

print("OK | Login ADMIN: HTTP 201")

token = login["access_token"]

estado, usuario = consultar("/auth/me", token=token)

if estado != 200 or usuario.get("rol") != "ADMIN":
    raise SystemExit("ERROR: rol ADMIN no confirmado")

print("OK | Rol ADMIN confirmado: HTTP 200")

estado, _ = consultar("/auth/admin-test", token=token)

if estado != 200:
    raise SystemExit(f"ERROR: ruta ADMIN HTTP {estado}")

print("OK | Acceso ADMIN: HTTP 200")
print("\nRESULTADO: 3/3 PRUEBAS APROBADAS")
print("JWT no mostrado ni guardado.")
