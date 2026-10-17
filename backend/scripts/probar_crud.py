#!/usr/bin/env python3
"""Pruebas CRUD con inventario introducido por el estudiante. No expone tokens."""
from getpass import getpass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json

BASE = 'http://127.0.0.1:3002'


def request(method, path, payload=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(payload).encode('utf-8') if payload is not None else None
    req = Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urlopen(req, timeout=12) as response:
            data = response.read().decode('utf-8')
            return response.status, json.loads(data) if data else None
    except HTTPError as e:
        data = e.read().decode('utf-8')
        try:
            decoded = json.loads(data) if data else {}
        except ValueError:
            decoded = {'message': 'Respuesta no JSON'}
        return e.code, decoded
    except URLError as e:
        raise SystemExit('ERROR: la API NestJS no responde en el puerto 3002: ' + str(e))


def check(label, actual, expected):
    ok = actual == expected
    print(('OK' if ok else 'ERROR') + f' | {label}: HTTP {actual} (esperado {expected})')
    if not ok:
        raise SystemExit('Detenido. Revisa la respuesta anterior; no ejecutes más operaciones hasta corregirlo.')


def login(role):
    email = input(f'Correo {role}: ').strip()
    password = getpass(f'Contraseña {role}: ')
    code, data = request('POST', '/auth/login', {'correo': email, 'password': password})
    check('Login ' + role, code, 201)
    token = data.get('access_token') if isinstance(data, dict) else None
    if not token:
        raise SystemExit(f'ERROR: falta access_token en login {role}')
    code, info = request('GET', '/auth/me', token=token)
    check('Rol '+role, code, 200)
    if info.get('rol') != role:
        raise SystemExit(f'ERROR: el usuario no tiene rol {role}')
    return token


print('PRUEBAS CRUD LABTRACK — usar datos representativos del laboratorio.')
print('Los registros creados quedan en PostgreSQL para documentar el funcionamiento.')
admin = login('ADMIN')
solicitante = login('SOLICITANTE')

code, _ = request('GET', '/categorias')
check('Categorías sin token', code, 401)
code, _ = request('GET', '/categorias', token=solicitante)
check('Listar categorías con SOLICITANTE', code, 200)
code, _ = request('POST', '/categorias', {'nombre': 'No autorizada'}, token=solicitante)
check('SOLICITANTE no crea categorías', code, 403)

nombre_categoria = input('Nombre de una NUEVA categoría (p.ej. Kits Arduino): ').strip()
if not nombre_categoria:
    raise SystemExit('ERROR: indica un nombre de categoría.')
code, data = request('POST', '/categorias', {'nombre': nombre_categoria, 'descripcion': 'Equipo del laboratorio de cómputo'}, token=admin)
check('ADMIN crea categoría', code, 201)
categoria_id = data['id']
print('Categoría creada, ID:', categoria_id)
code, _ = request('PATCH', f'/categorias/{categoria_id}', {'descripcion': 'Inventario de laboratorio'}, token=admin)
check('ADMIN actualiza categoría', code, 200)

codigo = input('Código de inventario NUEVO y único: ').strip()
nombre = input('Nombre del equipo: ').strip()
marca = input('Marca: ').strip()
modelo = input('Modelo: ').strip()
if not all([codigo, nombre, marca, modelo]):
    raise SystemExit('ERROR: equipo incompleto. La categoría ya quedó registrada.')

code, data = request('POST', '/equipos', {
    'codigoInventario': codigo,
    'nombre': nombre,
    'marca': marca,
    'modelo': modelo,
    'categoriaId': categoria_id,
}, token=admin)
check('ADMIN crea equipo', code, 201)
equipo_id = data['id']
print('Equipo creado, ID:', equipo_id)

code, data = request('GET', '/equipos', token=solicitante)
check('SOLICITANTE ve catálogo', code, 200)
if not any(it.get('id') == equipo_id for it in data):
    raise SystemExit('ERROR: el nuevo equipo no apareció en catálogo.')
code, _ = request('POST', '/equipos', {
    'codigoInventario': codigo + '-otro', 'nombre': nombre,
    'marca': marca, 'modelo': modelo, 'categoriaId': categoria_id,
}, token=solicitante)
check('SOLICITANTE no crea equipos', code, 403)

code, _ = request('PATCH', f'/equipos/{equipo_id}', {'nombre': nombre + ' - Laboratorio'}, token=admin)
check('ADMIN actualiza equipo', code, 200)
code, data = request('PATCH', f'/equipos/{equipo_id}/estado', {'estado': 'MANTENIMIENTO'}, token=admin)
check('ADMIN registra mantenimiento', code, 200)
code, _ = request('PATCH', f'/equipos/{equipo_id}/estado', {'estado': 'DISPONIBLE'}, token=admin)
check('ADMIN vuelve a disponible', code, 200)

code, _ = request('DELETE', f'/equipos/{equipo_id}', token=admin)
check('ADMIN realiza baja lógica', code, 200)
code, _ = request('GET', f'/equipos/{equipo_id}', token=solicitante)
check('SOLICITANTE no ve equipo dado de baja', code, 404)
code, data = request('GET', f'/equipos/{equipo_id}', token=admin)
check('ADMIN conserva historial de equipo', code, 200)
if data.get('activo') is not False:
    raise SystemExit('ERROR: el equipo no está dado de baja.')
code, _ = request('DELETE', f'/categorias/{categoria_id}', token=admin)
check('Categoría usada protegida frente a eliminación', code, 409)

print('\nPRUEBAS CRUD APROBADAS. Conserva captura de esta salida.')
print('Se creó la categoría ID', categoria_id, 'y equipo ID', equipo_id, '(equipo dado de baja lógicamente).')
print('Los datos se mantienen para demostrar el historial; no se alteraron otros proyectos.')
