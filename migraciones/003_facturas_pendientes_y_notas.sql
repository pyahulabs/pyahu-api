-- Seguimiento de cada proyecto: facturas, pendientes e historial.

-- ¿Se le dio factura al cliente por este pago? El número es opcional
-- (en Paraguay tiene la forma 001-001-0000123).
ALTER TABLE pagos
  ADD COLUMN facturado TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN factura_numero VARCHAR(30) NULL;

-- Lo que le falta a cada proyecto, como una lista para tildar
CREATE TABLE IF NOT EXISTS tareas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id INT NOT NULL,
  texto VARCHAR(255) NOT NULL,
  hecha TINYINT(1) NOT NULL DEFAULT 0,
  creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

-- Historial del proyecto: notas escritas a mano (tipo "nota") y cambios de
-- estado (tipo "estado"), que la API guarda sola con el motivo si lo hay.
CREATE TABLE IF NOT EXISTS notas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id INT NOT NULL,
  tipo ENUM('nota','estado') NOT NULL DEFAULT 'nota',
  estado ENUM('presupuesto','en_curso','entregado','cancelado') NULL,
  texto TEXT NULL,
  creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);
