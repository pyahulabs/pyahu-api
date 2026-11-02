-- IVA y gastos por proyecto.
--
-- tasa_iva: el porcentaje de IVA que va INCLUIDO en monto_total (como se
-- cotiza en Paraguay). 10 para servicios, 5 para algunos rubros, 0 si no
-- se factura con IVA. Los proyectos que ya existían quedan con 10.
ALTER TABLE proyectos ADD COLUMN tasa_iva TINYINT UNSIGNED NOT NULL DEFAULT 10 AFTER monto_total;

-- Lo que gasta el estudio en cada proyecto: dominios, hosting, licencias,
-- trabajo tercerizado… Se resta para calcular el neto.
CREATE TABLE IF NOT EXISTS gastos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id INT NOT NULL,
  concepto VARCHAR(150) NOT NULL,
  categoria ENUM('dominio','hosting','software','tercerizado','otro') NOT NULL DEFAULT 'otro',
  monto DECIMAL(14,0) NOT NULL,
  fecha DATE NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);
