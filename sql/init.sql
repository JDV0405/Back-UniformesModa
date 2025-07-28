-- Departamento
CREATE TABLE departamento (
    id_departamento INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL
);

-- Ciudad
CREATE TABLE ciudad (
    id_ciudad INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    ciudad VARCHAR(100) NOT NULL,
	id_departamento INTEGER,
	FOREIGN KEY (id_departamento) REFERENCES departamento(id_departamento)
);

-- Rol
CREATE TABLE rol (
    id_rol INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Comprobante de Pago
CREATE TABLE comprobante_pago (
    id_comprobante_pago INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    url_comprobante VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Estado de Proceso
CREATE TABLE estado_proceso (
    id_proceso INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre VARCHAR(100)
);

-- Cliente
CREATE TABLE cliente (
    id_cliente INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo CHAR(10) NOT NULL CHECK (tipo IN ('Natural', 'Juridico')),
    correo VARCHAR(100)
);

-- Natural
CREATE TABLE cli_natural (
    id_cliente INTEGER PRIMARY KEY,
    tipo_doc VARCHAR(50) NOT NULL CHECK (tipo_doc IN ('Cedula de Ciudadania', 'Pasaporte', 'Cedula Extranjeria')),
    profesion VARCHAR(100),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Juridico
CREATE TABLE juridico (
    id_cliente INTEGER PRIMARY KEY,
    sector_economico VARCHAR(100),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Dirección
CREATE TABLE direccion (
    id_direccion SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    id_ciudad INTEGER NOT NULL,
    observaciones VARCHAR(200),
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_ciudad) REFERENCES ciudad(id_ciudad)
);

-- Empleado
CREATE TABLE empleado (
    cedula VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
	activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Empleado_Rol
CREATE TABLE empleado_rol (
    cedula_empleado VARCHAR(20) NOT NULL,
    id_rol INTEGER NOT NULL,
    PRIMARY KEY (cedula_empleado, id_rol),
    FOREIGN KEY (cedula_empleado) REFERENCES empleado(cedula),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- Usuario
CREATE TABLE usuario (
    id_usuario INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    cedula_empleado VARCHAR(20) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (cedula_empleado) REFERENCES empleado(cedula)
);

-- Color
CREATE TABLE color (
    id_color INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre_color VARCHAR(50) NOT NULL,
    codigo_hex VARCHAR(8) -- opcional
);

--Estampado
CREATE TABLE estampado (
	id_estampado INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre_estampado VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100) -- opcional
);

--Categoria
CREATE TABLE categoria (
    id_categoria INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

-- Categoria_Estampado
CREATE TABLE categoria_estampado (
    id_categoria INTEGER NOT NULL,
    id_estampado INTEGER NOT NULL,
    PRIMARY KEY (id_categoria, id_estampado),
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_estampado) REFERENCES estampado(id_estampado)
);

-- Categoria_Color
CREATE TABLE categoria_color (
    id_categoria INTEGER NOT NULL,
    id_color INTEGER NOT NULL,
    PRIMARY KEY (id_categoria, id_color),
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_color) REFERENCES color(id_color)
);

-- Producto (Modificado)
CREATE TABLE producto (
    id_producto INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500),
    id_categoria INTEGER NOT NULL,
    atributos JSONB, -- Información dinámica
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

-- Orden de Producción
CREATE TABLE orden_produccion (
    id_orden INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_cliente INTEGER NOT NULL,
    fecha_aproximada DATE,
    tipo_pago VARCHAR(50),
    id_comprobante_pago INTEGER,
	prioridad_orden VARCHAR(200) NOT NULL DEFAULT 'Baja',
    observaciones VARCHAR(500),
    cedula_empleado_responsable VARCHAR(20) NOT NULL,
	id_direccion INTEGER NOT NULL,
	activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_comprobante_pago) REFERENCES comprobante_pago(id_comprobante_pago),
    FOREIGN KEY (cedula_empleado_responsable) REFERENCES empleado(cedula),
	FOREIGN KEY (id_direccion) REFERENCES direccion(id_direccion)
);

ALTER TABLE orden_produccion
ALTER COLUMN prioridad_orden SET DEFAULT 'Baja';


-- TABLA CONFECCIONISTA
CREATE TABLE confeccionista (
	id_confeccionista INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
	cedula INTEGER NOT NULL,
	nombre varchar(100) NOT NULL,
	telefono VARCHAR(15),
	direccion VARCHAR(100),
	municipio VARCHAR(100),
	observaciones VARCHAR(500),
	activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Detalle Producto Orden
CREATE TABLE detalle_producto_orden (
    id_detalle INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_orden INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
	atributosUsuario JSONB,
    observacion TEXT,
    url_producto VARCHAR(255),
    estado VARCHAR(20) NOT NULL DEFAULT 'En Producción',
    FOREIGN KEY (id_orden) REFERENCES orden_produccion(id_orden),
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

-- Detalle Proceso
CREATE TABLE detalle_proceso (
    id_detalle_proceso INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_orden INTEGER NOT NULL,
    id_proceso INTEGER NOT NULL,
    fecha_inicio_proceso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_final_proceso TIMESTAMP,
    cedula_empleado VARCHAR(20) NOT NULL,
    observaciones VARCHAR(500),
    estado VARCHAR(20) NOT NULL DEFAULT 'En Proceso',
    FOREIGN KEY (id_orden) REFERENCES orden_produccion(id_orden),
    FOREIGN KEY (id_proceso) REFERENCES estado_proceso(id_proceso),
    FOREIGN KEY (cedula_empleado) REFERENCES empleado(cedula)
);

-- Teléfono Cliente
CREATE TABLE telefono_cliente (
    id_telefono INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_cliente INTEGER NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- Móvil, Fijo, Trabajo
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- Product Process Relationship Table
CREATE TABLE producto_proceso (
    id_producto_proceso INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_detalle_producto INTEGER NOT NULL,
    id_detalle_proceso INTEGER NOT NULL,
    id_confeccionista INTEGER,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    fecha_recibido TIMESTAMP,
    fecha_entrega TIMESTAMP,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cortado BOOLEAN NOT NULL DEFAULT FALSE,
    cantidad_cortada INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (id_detalle_producto) REFERENCES detalle_producto_orden(id_detalle),
    FOREIGN KEY (id_detalle_proceso) REFERENCES detalle_proceso(id_detalle_proceso),
    FOREIGN KEY (id_confeccionista) REFERENCES confeccionista(id_confeccionista),
    CHECK (cantidad_cortada >= 0 AND cantidad_cortada <= cantidad)
);

-- valoracion
CREATE TABLE valoracion (
  id_valoracion INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  id_orden_produccion INTEGER NOT NULL,
  estrellas SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario TEXT,
  fecha_valoracion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_orden_produccion) REFERENCES orden_produccion(id_orden)
);

CREATE TABLE factura (
 id_factura INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
 numero_factura VARCHAR(100) UNIQUE NOT NULL,
 fecha_emision TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 url_factura VARCHAR(255),
 observaciones TEXT
);

CREATE TABLE factura_producto_proceso (
 id_factura INTEGER NOT NULL,
 id_producto_proceso INTEGER NOT NULL,
 PRIMARY KEY (id_factura, id_producto_proceso),
 FOREIGN KEY (id_factura) REFERENCES factura(id_factura),
 FOREIGN KEY (id_producto_proceso) REFERENCES producto_proceso(id_producto_proceso)
);


-- Nueva tabla para registrar todos los empleados que han participado
CREATE TABLE historial_empleado_proceso (
    id_historial INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
    id_detalle_proceso INTEGER NOT NULL,
    cedula_empleado VARCHAR(20) NOT NULL,
    fecha_participacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    productos_avanzados JSONB,
    cantidad_total_avanzada INTEGER DEFAULT 0,
    accion VARCHAR(100),
    datos_adicionales JSONB,
    FOREIGN KEY (id_detalle_proceso) REFERENCES detalle_proceso(id_detalle_proceso),
    FOREIGN KEY (cedula_empleado) REFERENCES empleado(cedula)
);

-- ÍNDICES IMPLEMENTADOS
-- Indice para búsqueda por email (el más importante)
CREATE INDEX idx_usuario_email ON usuario(email);
-- Opcional: mejora filtro booleano en login
CREATE INDEX idx_usuario_activo ON usuario(activo);
CREATE INDEX idx_empleado_activo ON empleado(activo);
-- Mejora JOIN entre empleado y empleado_rol
CREATE INDEX idx_empleado_rol_cedula ON empleado_rol(cedula_empleado);

																												
--Departamento
INSERT INTO departamento (nombre) VALUES
('Amazonas'),
('Antioquia'),
('Arauca'),
('Atlántico'),
('Bolívar'),
('Boyacá'),
('Caldas'),
('Caquetá'),
('Casanare'),
('Cauca'),
('Cesar'),
('Chocó'),
('Córdoba'),
('Cundinamarca'),
('Guainía'),
('Guaviare'),
('Huila'),
('La Guajira'),
('Magdalena'),
('Meta'),
('Nariño'),
('Norte de Santander'),
('Putumayo'),
('Quindío'),
('Risaralda'),
('San Andrés y Providencia'),
('Santander'),
('Sucre'),
('Tolima'),
('Valle del Cauca'),
('Vaupés'),
('Vichada');

--Ciudad / Municipios
COPY ciudad(ciudad, id_departamento) FROM '/docker-entrypoint-initdb.d/municipios_utf8.csv' DELIMITER ',' CSV HEADER;

--Rol
INSERT INTO rol (nombre_rol, descripcion) VALUES 
('Administrador', 'Encargado general del sistema'),
('Solicitud', 'Responsable de la revision de los pedidos'),
('Trazo y Moldes', 'Encargado realizar los trazos de las prendas'),
('Cortes', 'Encargado realizar los cortes de las prendas'),
('Confección', 'Encargado de confeccionar las prendas'),
('Bordado', 'Encargado bordar las prendas'),
('Facturacion', 'Encargado de facturar las ordenes'),
('Entrega', 'Encargado despachar el pedido');

--Estado_Proceso
INSERT INTO estado_proceso (nombre) VALUES 
('Solicitud'), ('Trazo y Moldes'),('Cortes'),('Confección'),('Bordado'), ('Facturacion'), ('Entrega');

-- Estampado
INSERT INTO estampado(nombre_estampado, descripcion) VALUES
('Mickey Mouse', 'Las maravilloas aventuras de nuestro'), ('SpiderMan', 'Tiramos telarañas'), ('SuperMan', 'Fuerte y poderoso'), ('Ben 10', 'Del espacio le llego algo especial'),
('Barbie', 'Tu puedes ser lo que quieras ser');

-- Colores
COPY color(nombre_color, codigo_hex) FROM '/docker-entrypoint-initdb.d/colores.csv' DELIMITER ';' CSV HEADER;


-- Categoria
INSERT INTO categoria (nombre_categoria, descripcion) VALUES 
('Conjunto', 'Prenda con camisa y pantalón'),
('Bata', 'Prenda superior'),
('Pantalón', 'Prenda inferior'),
('Gorros', 'Accesorios para la cabeza'),
('Lencería Hospitalaria', 'Insumos para hospitales'),
('Zapatos','Prenda Calzado'),
('Camisa', 'Prenda individual');

-- Categoria - Estampado
INSERT INTO categoria_estampado (id_categoria, id_estampado) VALUES 
(1,1),(1,2),(1,3),(1,4),(1,5),
(7,1),(7,3),(7,2),(7,4),
(4,1),(4,2),(4,3),(4,4);

-- Categoria - COLOR
INSERT INTO categoria_color (id_categoria, id_color) VALUES 
(1,1),(1,2),(1,3),(1,4),(1, 5),(1,6),(1, 7),(1,8),(1, 9),(1,10),
(1,11),(1,12),(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20),
(1,21),(1,22),(1,23),(1,24),(1,25),(1,26),(1,27),(1,28),(1,29),(1,30),
(2,1),(2,2),(2, 3),(2,4),(2, 5),(2,6),(2, 7),(2,8),(2, 9),(2,10),
(2,11),(2,12),(2,13),(2,14),(2,15),(2,16),(2,17),(2,18),(2,19),(2,20),
(2,21),(2,22),(2,23),(2,24),(2,25),(2,26),(2,27),(2,28),(2,29),(2,30),
(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3, 9),(3,10),
(3,11),(3,12),(3,13),(3,14),(3,15),(3,16),(3,17),(3,18),(3,19),(3,20),
(3,21),(3,22),(3,23),(3,24),(3,25),(3,26),(3,27),(3,28),(3,29),(3,30),
(4, 1),(4,2),(4,3),(4,4),(4,5),(4,6),(4,7),(4,8),(4,9),(4,10),
(4, 11),(4,12),(4,13),(4,14),(4,15),(4,16),(4,17),(4,18),(4,19),(4,20),
(4, 21),(4,22),(4,23),(4,24),(4,25),(4,26),(4,27),(4,28),(4,29),(4,30),
(5, 2),(5,7),(5,10),(5,28),
(6, 5),(6,10),(6,19),
(7, 2),(7,7),(7,10),(7,28);

INSERT INTO confeccionista (cedula, nombre, telefono, direccion, municipio, observaciones, activo) VALUES
(435400875, 'DORIS PANIAGUA', '3235041236', 'CLLE 50 # 86 A 35 APTO 817', 'MEDELLIN-CALASANZ', '', TRUE),
(70103292, 'LUIS FERNANDO PANIAGUA', '3160532702', 'CL 54 86 A 35 APT 807', 'BELLO', '', TRUE),
(71628890, 'WILFREDO PANIAGUA', '3007912622', '', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(43261408, 'DIANA PATRICIA GUERRA', '3052531326', 'CLLE 39 B # 103 55 INT 271', 'MEDELLIN SAN JAVIER', '', TRUE),
(42901481, 'ASTRID QUINTERO RUA', '3132820295', 'CR 107 65 F 68', 'MEDELLIN- BELEN', '', TRUE),
(1023722641, 'HUGO ATEHORTUA', '3113277495', 'CALLE 20 TO 16  21', 'GOMEZ PLATA', '', TRUE),
(43264438, 'SOLEDAD QUIROZ', '3116816492', 'CRA 47B 47 A 03', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(43363706, 'LUZ AMANADA', '3195164008', 'Cra 47A N.48-26', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(700290957, 'NATALY LUCCAS', '3162361687', 'Cra 51 AA  N.46a-44  Barrio San Jose', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(1013557079, 'LEIDY LONDOÑO', '3225167356', 'Cra 50 N 56-54 interior 101', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(1040321869, 'LIBIA VANEGAS', '3148246099', 'VDA PULGARINA', 'SAN PEDRO DE LOS MILAGROS', '', TRUE),
(42867003, 'MARIA GENOVEVA PANIAGUA', '3053491308', 'CRA 96B N.49F 21', 'MEDELLIN', '', TRUE),
(3474476, 'JUAN JOSE GRAJALES PANIAGUA', '3192871964', 'CRA 38 N. 51-09', 'ITAGUI', '', TRUE);


-- Producto
INSERT INTO producto (nombre_producto, descripcion, id_categoria, atributos) VALUES 
('Camisa Estampada', 'Camisa cuello redondo', 7, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione una Talla" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester", "Licra"] , "placeholder": "Seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Estampado": { "tipo": "select", "fuente": "categoria_estampado", "placeholder": "Seleccione una Opción"  }
}'),

('Bata Polo', 'Bata Tipo Polo', 2, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione una Talla" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester", "Licra"] , "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione un Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Manga": { "tipo": "select", "opciones": ["Larga", "Corta"], "placeholder": "Seleccione una Opción" }
}'),

('Bata Cuello Neru', 'Bata Tipo Neru', 2, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione una Talla" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester", "Licra"] , "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione un Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Manga": { "tipo": "select", "opciones": ["Larga", "Corta"], "placeholder": "Seleccione una Opción" }
}'),

('Bata Cuello Neru Delujo', 'Bata Tipo Neru Delujo', 2, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione una Talla" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester", "Licra"] , "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione un Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Manga": { "tipo": "select", "opciones": ["Larga", "Corta"],"placeholder": "Seleccione una Opción" }
}'),

('Gorro Guarda Cabello', 'Cubre cabello', 4, '{
  "Estilo Gorro": {"tipo": "select", "opciones": ["Color", "Estampado"], "placeholder": "Seleccione una Opción"},
  "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione un Color",
  "condicional": {"campo": "Estilo Gorro","valor": "Color"}},
  "Estampado": {"tipo": "select","fuente": "categoria_estampado","placeholder": "Seleccione un Estampado",
  "condicional": {"campo": "Estilo Gorro","valor": "Estampado"}}}'),

('Gorro Cirujano', 'Cubre cabello tipo Cirujano', 4, '{
  "Estilo Gorro": {"tipo": "select", "opciones": ["Color", "Estampado"], "placeholder": "Seleccione una Opción"},
  "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione un Color",
  "condicional": {"campo": "Estilo Gorro","valor": "Color"}},
  "Estampado": {"tipo": "select","fuente": "categoria_estampado","placeholder": "Seleccione un Estampado",
  "condicional": {"campo": "Estilo Gorro","valor": "Estampado"}}}'),

('Zapatos Antideslizante', 'Material Antideslizante', 6, '{
  "talla": { "tipo": "select", "opciones": ["35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5", "41", "41.5", "42", "42.5", "43"], "placeholder": "Seleccione una Talla" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" }
}'),

('Botas de Seguridad', 'Material Protector', 6, '{
  "talla": { "tipo": "select", "opciones": ["35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5", "41", "41.5", "42", "42.5", "43"], "placeholder": "Seleccione una Talla" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" }
}'),

('Zapatos Croydon', 'Zapatos Importados', 6, '{
  "talla": { "tipo": "select", "opciones": ["35", "35.5", "36", "36.5", "37", "37.5", "38", "38.5", "39", "39.5", "40", "40.5", "41", "41.5", "42", "42.5", "43"], "placeholder": "Seleccione una Talla" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" }
}'),

('Polainas', 'Zapatos de Lenceria Medica', 5, '{
  "talla": { "tipo": "select", "opciones": ["Talla Unica"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero", "Drill"], "placeholder": "Seleccione una Opción" }
}'),

('Campos Quirurjicos', 'Lenceria Medica', 5, '{
  "Ancho": { "tipo": "number", "placeholder": "Ingrese el Ancho en Cm" },
  "Largo": { "tipo": "number", "placeholder": "Ingrese el Largo en Cm" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Campo": { "tipo": "select", "opciones": ["Abierto", "Cerrado"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero", "Drill"], "placeholder": "Seleccione una Opción" },
  "Alto de Abertura": {"tipo": "number","placeholder": "Ingrese el Alto de la Abertura en Cm","condicional": {"campo": "Tipo de Campo","valor": "Abierto"}},
  "Ancho de Abertura": {"tipo": "number","placeholder": "Ingrese el Ancho de la Abertura en Cm","condicional": {"campo": "Tipo de Campo","valor": "Abierto"}}
}'),

('Sabanas', 'Lenceria Medica', 5, '{
  "Ancho": { "tipo": "number", "placeholder": "Ingrese el Ancho en Cm" },
  "Largo": { "tipo": "number", "placeholder": "Ingrese el Largo en Cm" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Sabana": { "tipo": "select", "opciones": ["Plana", "Enresortada"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero", "Drill"], "placeholder": "Seleccione una Opción" },
  "Alto": {"tipo": "number","placeholder": "Ingrese el Alto en Cm","condicional": {"campo": "Tipo de Sabana","valor": "Enresortada"}}
}'),

('Talegos', 'Lenceria Medica', 5, '{
  "Ancho": { "tipo": "number", "placeholder": "Ingrese el Ancho en Cm" },
  "Largo": { "tipo": "number", "placeholder": "Ingrese el Largo en Cm" },
  "color": { "tipo": "select", "fuente": "categoria_color" , "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Talego": { "tipo": "select", "opciones": ["Doble", "Sencillo"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero", "Drill"], "placeholder": "Seleccione una Opción" }
}'),

('Fundas', 'Lenceria Medica', 5, '{
  "Ancho": { "tipo": "number", "placeholder": "Ingrese el Ancho en Cm" },
  "Largo": { "tipo": "number", "placeholder": "Ingrese el Largo en Cm" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Talego": { "tipo": "select", "opciones": ["Doble", "Sencillo"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero", "Drill"], "placeholder": "Seleccione una Opción" }
}'),

('Gorros Esterilizados', 'Gorros de Lenceria Medica', 5, '{
  "talla": { "tipo": "select", "opciones": ["Talla Unica"] , "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Sublimado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Gorro": { "tipo": "select", "opciones": ["Guarda Cabello", "Quirurgico"], "placeholder": "Seleccione una Opción" }
}'),

('Pantalon Recto', 'Pantalones individuales', 3, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Bolsillo": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo": { "tipo": "select", "opciones": ["Caballero","Dama"], "placeholder": "Seleccione una Opción" },
  "Cm Adicionales": { "tipo": "number", "placeholder": "Ingrese el Numero de Cm Adicionales" }
}'),

('Pantalon Yoguer', 'Pantalones individuales', 3, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Bolsillo": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo": { "tipo": "select", "opciones": ["Caballero","Dama"], "placeholder": "Seleccione una Opción" },
  "Cm Adicionales": { "tipo": "number", "placeholder": "Ingrese el Numero de Cm Adicionales" }
}'),

('Pantalon Neru', 'Pantalones individuales', 3, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Bolsillo": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo": { "tipo": "select", "opciones": ["Caballero","Dama"], "placeholder": "Seleccione una Opción" },
  "Cm Adicionales": { "tipo": "number", "placeholder": "Ingrese el Numero de Cm Adicionales" }
}'),

('Pantalon Gaby', 'Pantalones individuales', 3, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Bolsillo": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo": { "tipo": "select", "opciones": ["Caballero","Dama"], "placeholder": "Seleccione una Opción" },
  "Cm Adicionales": { "tipo": "number", "placeholder": "Ingrese el Numero de Cm Adicionales" }
}'),

('Pantalon Unisex', 'Pantalones individuales', 3, '{
  "talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Tipo de Tela": { "tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "Seleccione la Opción" },
  "color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Bolsillo": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo": { "tipo": "select", "opciones": ["Caballero","Dama"], "placeholder": "Seleccione una Opción" },
  "Cm Adicionales": { "tipo": "number", "placeholder": "Ingrese el Numero de Cm Adicionales" }
}'),
--------------------------------------CONJUNTOS-------------------------------------------------------------
(
  'Cuello V',
  'Conjunto con estilo en V.', 1,'{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"}, "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Sesgo": {"tipo": "select","opciones": ["Si","No"],"placeholder": "Seleccione una opción"},
  "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Si"}}}'
),

('Cuello Redondo','Conjunto con estilo con cuello redondo.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),


('Conjunto 029 Dama','Conjunto con estilo en 029.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Multicosturas Dama','Conjunto con estilo de multiples costuras.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cuello V RIB Dama','Conjunto con estilo de cuello RIB .',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto HGM Dama','Conjunto con estilo HGM.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),


('Conjunto Cuello V Cierre','Conjunto con estilo del cuello en forma de V',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cuello Polo Cierre','Conjunto con estilo de cuello polo cierre.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cinturon Dama','Conjunto con estilo cinturón dama.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cuello en Y Dama','Conjunto con estilo cuello Y.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Fonendo Dama','Conjunto con estilo fonendo.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cuello Embudo','Conjunto con cuello de embudo.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cheff','Conjunto con estilo cheff.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Gaby Dama','Conjunto con estilo con cuello gaby.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Cuello Trenza','Conjunto con estilo con cuello trenza',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Cuello Cruzado UDA','Blusa médica tipo UDA.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Cuello Ruth','Conjunto con estilo de cuello Ruth.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Combinacion": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinacion", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinacion", "valor": "combinacion" } }
}'),

('Conjunto Bolero Dama','Conjunto con estilo bolero',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Kimono Embarazada','Conjunto con estilo de kimono para embarazadas',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Marcofidel','Conjunto para marcofidel',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Cuello Triangulo','Conjunto con estilo con cuello triangulo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Materno','Conjunto con estilo materno',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Cuello Nerú','Conjunto con estilo con cuello Nerú',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Lucca','Conjunto con estilo Lucca.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Combinacion": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinacion", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinacion", "valor": "combinacion" } }
}'),

('Conjunto Paris Dama','Conjunto con estilo Paris Dama.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto Princesa Dama','Blusa médica tipo cuello Cruzado con opción de Sesgo.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

('Conjunto Polo Caballero','Conjunto con estilo tipo polo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Polo Dama','Conjunto con estilo tipo polo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si", "No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Combinado Dama','Conjunto con estilo combinado para dama.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto Combinado Cierre Delujo Dama','Conjunto con estilo Cierre Delujo para dama.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto deportivo dama','Conjunto con estilo deportivo.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto Indigo Dama','Conjunto con estilo indigo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Roma dama','Conjunto con estilo Roma',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Combinación": { "tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción" },
  "Tono 1 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } },
  "Tono 2 Combinación": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": { "campo": "Combinación", "valor": "combinacion" } }
}'),

('Conjunto Manga Oruga Dama','Conjunto con estilo indigo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Manga Petalo','Conjunto con estilo petalo',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" }
}'),

('Conjunto Cuello Cruzado Dama','Conjunto tipo cuello Cruzado dama.',1,
'{
  "Talla": { "tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción" },
  "Color": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base" },
  "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
  "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
  "Sesgo": { "tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción" },
  "Tono 1": { "tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": { "campo": "Sesgo", "valor": "Sesgo" } }
}'),

-------------------camisas-------------------
('Camisa Cuello V',
 'Conjunto con estilo en V.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Si","No"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Si"}}}'
),

('Camisa Cuello Redondo',
 'Conjunto con estilo con cuello redondo.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" }}'),

('Camisa 029 Dama',
 'Conjunto con estilo en 029.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Multicosturas Dama',
 'Conjunto con estilo de multiples costuras.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Cuello V RIB Dama',
 'Conjunto con estilo de cuello RIB .', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Combinación": {"tipo": "select","opciones": ["combinacion"],"placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Primer Tono de la Combinación","condicional": {"campo": "Combinación","valor": "combinacion"}}}'
),

('Camisa HGM Dama',
 'Conjunto con estilo HGM.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Cuello V Cierre',
 'Conjunto con estilo de multiples costuras.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Cuello Polo Cierre',
 'Conjunto con estilo de cuello polo cierre.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Cinturon Dama',
 'Conjunto con estilo cinturon dama.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Cuello Y Dama',
 'Conjunto con estilo cuello Y.', 7,
 '{"Talla": { "tipo": "select", "opciones": ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"], "placeholder": "Seleccione la Opción" },
   "Color": {"tipo": "select", "fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": { "tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción" },
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo","condicional": {"campo": "Sesgo","valor": "Sesgo"}}}'
),

('Camisa Fonendo Dama','Conjunto con estilo fonendo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
),

('Camisa Cuello Embudo','Conjunto con cuello de embudo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
),

('Camisa Cheff','Conjunto con estilo cheff.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
),

('Camisa Gaby Dama','Conjunto con estilo con cuello gaby.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Cuello Trenza','Conjunto con estilo con cuello trenza',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Cuello Cruzado UDA','Blusa médica tipo UDA.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select","opciones": ["Sesgo"],"placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
),

('Camisa Cuello Ruth','Conjunto con estilo de cuello Ruth .',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select","opciones": ["combinacion"],"placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Bolero Dama','Conjunto con estilo bolero',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Kimono Embarazada','Conjunto con estilo de kimono para embarazadas',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Marcofidel','Conjunto para marcofidel',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select","fuente": "categoria_color","placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select","opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Cuello Triangulo','Conjunto con estilo con cuello triangulo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Materno','Conjunto con estilo materno',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Cuello Nerú','Conjunto con estilo con cuello Nerú',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Lucca','Conjunto con estilo Lucca .',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Paris Dama','Conjunto con estilo Paris Dama.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Princesa Dama','Blusa médica tipo cuello Cruzado con opción de Sesgo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
),

('Camisa Polo Caballero','Conjunto con estilo tipo polo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Polo Dama','Conjunto con estilo tipo polo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Combinado Dama','Conjunto con estilo combinado para dama.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Combinado Cierre Delujo Dama','Conjunto con estilo combinado para dama.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa deportivo dama','Conjunto con estilo deportivo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Indigo Dama','Conjunto con estilo indigo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Roma dama','Conjunto con estilo deportivo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Combinación": {"tipo": "select", "opciones": ["combinacion"], "placeholder": "Seleccione una opción"},
   "Tono 1 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Primer Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}},
   "Tono 2 Combinación": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Segundo Tono de la Combinación", "condicional": {"campo": "Combinación", "valor": "combinacion"}}}'
),

('Camisa Manga Oruga Dama','Conjunto con estilo indigo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Manga Petalo','Conjunto con estilo indigo',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"}}'
),

('Camisa Cuello Cruzado Dama','Blusa médica tipo cuello Cruzado con opción de Sesgo.',7,
 '{"Talla": {"tipo": "select", "opciones": ["XS","S","M","L","XL","XXL","XXXL","XXXXL"], "placeholder": "Seleccione la Opción"},
   "Color": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Color Base"},
   "Tipo de Tela": {"tipo": "select", "opciones": ["Genero","La fayette","Drill","Poliester","Licra"], "placeholder": "seleccione la Opción" },
   "Bordado": {"tipo": "select", "opciones": ["Si","No"], "placeholder": "Seleccione una Opción"},
   "Sesgo": {"tipo": "select", "opciones": ["Sesgo"], "placeholder": "Seleccione una opción"},
   "Tono 1": {"tipo": "select", "fuente": "categoria_color", "placeholder": "Seleccione el Tono para el Sesgo", "condicional": {"campo": "Sesgo", "valor": "Sesgo"}}}'
);