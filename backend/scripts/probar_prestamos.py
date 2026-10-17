#!/usr/bin/env python3
"""Pruebas funcionales de los estados de LabTrack; conserva datos en PostgreSQL.

Ejecutar con NestJS corriendo en http://127.0.0.1:3002.
No guarda JWT, contraseñas ni correos en archivos.
"""
import datetime as dt
import getpass
import json
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:3002'
checks = 0


def http(method, path, data=None, token=None):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            raw = response.read().decode('utf-8')
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode('utf-8')
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {}
        return exc.code, payload
    except urllib.error.URLError as exc:
        raise SystemExit(f'No se puede conectar a {BASE}. ¿Está ejecutándose NestJS? ({exc.reason})')


def check(label, got, expected):
    global checks
    if got != expected:
        raise SystemExit(f'ERROR | {label}: HTTP {got}, se esperaba {expected}. Prueba detenida.')
    checks += 1
    print(f'OK | {label}: HTTP {got}')


def login(role):
    mail = input(f'Correo {role}: ').strip()
    password = getpass.getpass(f'Contraseña {role}: ')
    code, response = http('POST', '/auth/login', {'correo': mail, 'password': password})
    check(f'Login {role}', code, 201)
    token = response.get('access_token')
    if not token:
        raise SystemExit(f'ERROR: login {role} no generó access_token')
    code, me = http('GET', '/auth/me', token=token)
    check(f'Consulta de identidad {role}', code, 200)
    if me.get('rol') != role:
        raise SystemExit(f'ERROR: se esperaba rol {role}, se obtuvo {me.get("rol")}')
    return token


def estado_prestamo(result, expected, label):
    if result.get('estado') != expected:
        raise SystemExit(f'ERROR: {label}: se esperaba estado {expected}')
    print(f'OK | {label}: {expected}')


def estado_equipo(eid, token, estado):
    code, result = http('GET', f'/equipos/{eid}', token=token)
    check(f'Consultar equipo {eid}', code, 200)
    if result.get('estado') != estado:
        raise SystemExit(f'ERROR: equipo {eid}: se esperaba estado {estado}')
    print(f'OK | Equipo {eid}: {estado}')


print('=== LABTRACK: PRUEBAS REALES DEL FLUJO DE PRÉSTAMOS ===')
print('Las solicitudes y el equipo de prueba se conservan para el portafolio.')
print('No se imprimen contraseñas ni tokens. No se utilizará el equipo ID 1 dado de baja.')
admin = login('ADMIN')
sol = login('SOLICITANTE')

code, _ = http('GET', '/prestamos/mios')
check('Préstamos sin JWT bloqueados', code, 401)
code, _ = http('GET', '/prestamos', token=sol)
check('SOLICITANTE no puede listar todos los préstamos', code, 403)

code, categorias = http('GET', '/categorias', token=admin)
check('Listar categorías existentes', code, 200)
if not isinstance(categorias, list) or not categorias:
    raise SystemExit('ERROR: no existen categorías. Primero crea una con el CRUD anterior.')
print('Categorías disponibles:')
for categoria in categorias:
    print(f'  {categoria["id"]}: {categoria["nombre"]}')
try:
    categoria_id = int(input('ID de categoría para el equipo de préstamo: ').strip())
except ValueError:
    raise SystemExit('ERROR: el ID debe ser numérico')
if categoria_id not in {c['id'] for c in categorias}:
    raise SystemExit('ERROR: selecciona una categoría de la lista')

codigo = input('Código de inventario NUEVO y único (ej. LAB-ARD-002): ').strip()
nombre = input('Nombre del equipo real (ej. Kit Arduino UNO): ').strip()
marca = input('Marca del equipo: ').strip()
modelo = input('Modelo del equipo: ').strip()
if not all([codigo, nombre, marca, modelo]):
    raise SystemExit('ERROR: se requieren los cuatro datos del equipo')

code, equipo = http('POST', '/equipos', {
    'codigoInventario': codigo, 'nombre': nombre, 'marca': marca,
    'modelo': modelo, 'categoriaId': categoria_id,
}, admin)
check('Crear equipo activo para préstamo', code, 201)
eid = equipo['id']
print('Equipo nuevo, ID:', eid)
estado_equipo(eid, sol, 'DISPONIBLE')

hoy = dt.date.today()
salida = (hoy + dt.timedelta(days=1)).isoformat()
fin = (hoy + dt.timedelta(days=8)).isoformat()
datos = {'equipoIds': [eid], 'fechaSalida': salida,
         'fechaDevolucion': fin, 'motivo': 'Actividad académica de laboratorio'}

code, p1 = http('POST', '/prestamos', datos, sol)
check('SOLICITANTE crea solicitud 1', code, 201)
pid1 = p1['id']
estado_prestamo(p1, 'PENDIENTE', 'Solicitud 1 creada')

code, p2 = http('POST', '/prestamos', datos, sol)
check('SOLICITANTE crea solicitud 2 pendiente', code, 201)
pid2 = p2['id']
estado_prestamo(p2, 'PENDIENTE', 'Solicitud 2 creada')

code, p1 = http('PATCH', f'/prestamos/{pid1}', {'motivo': 'Práctica de laboratorio (modificada)'}, sol)
check('Editar solicitud aún pendiente', code, 200)

code, _ = http('PATCH', f'/prestamos/{pid1}/aprobar', token=sol)
check('SOLICITANTE no puede aprobar', code, 403)

code, p1 = http('PATCH', f'/prestamos/{pid1}/aprobar', token=admin)
check('ADMIN aprueba solicitud 1', code, 200)
estado_prestamo(p1, 'APROBADO', 'Solicitud 1 aprobada')
estado_equipo(eid, admin, 'RESERVADO')

code, _ = http('PATCH', f'/prestamos/{pid2}/aprobar', token=admin)
check('Se evita doble reserva del equipo', code, 409)

code, _ = http('PATCH', f'/prestamos/{pid1}', {'motivo': 'No debería funcionar'}, sol)
check('No se edita una solicitud ya aprobada', code, 409)

code, p1 = http('PATCH', f'/prestamos/{pid1}/entregar', token=admin)
check('ADMIN registra entrega', code, 200)
estado_prestamo(p1, 'ENTREGADO', 'Préstamo entregado')
estado_equipo(eid, admin, 'PRESTADO')

code, p1 = http('PATCH', f'/prestamos/{pid1}/devolver', token=admin)
check('ADMIN registra devolución', code, 200)
estado_prestamo(p1, 'DEVUELTO', 'Préstamo devuelto')
if not p1.get('devueltoEn'):
    raise SystemExit('ERROR: no se guardó devueltoEn')
estado_equipo(eid, sol, 'DISPONIBLE')

code, p2 = http('PATCH', f'/prestamos/{pid2}/cancelar', token=sol)
check('SOLICITANTE cancela solicitud 2 pendiente', code, 200)
estado_prestamo(p2, 'CANCELADO', 'Solicitud 2 cancelada')

code, p3 = http('POST', '/prestamos', datos, sol)
check('SOLICITANTE crea solicitud 3 pendiente', code, 201)
pid3 = p3['id']
code, p3 = http('PATCH', f'/prestamos/{pid3}/rechazar', token=admin)
check('ADMIN rechaza solicitud 3', code, 200)
estado_prestamo(p3, 'RECHAZADO', 'Solicitud 3 rechazada')
estado_equipo(eid, sol, 'DISPONIBLE')

code, propios = http('GET', '/prestamos/mios', token=sol)
check('SOLICITANTE consulta su historial', code, 200)
ids = {p['id'] for p in propios}
if not {pid1, pid2, pid3}.issubset(ids):
    raise SystemExit('ERROR: faltan registros en Mis préstamos')
code, _ = http('GET', '/prestamos/vencidos', token=admin)
check('ADMIN consulta préstamos vencidos', code, 200)

print(f'\nRESULTADO: {checks}/{checks} verificaciones HTTP completadas.')
print('Estados verificados: PENDIENTE, APROBADO, ENTREGADO, DEVUELTO, CANCELADO, RECHAZADO.')
print('Conflicto de doble reserva detectado: HTTP 409.')
print(f'Equipo conservado: ID {eid}; disponible para futuros préstamos.')
print(f'Préstamos conservados: IDs {pid1}, {pid2}, {pid3}.')
print('No se imprimieron ni guardaron tokens JWT o contraseñas.')
