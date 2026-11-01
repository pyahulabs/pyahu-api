-- Fecha de entrega comprometida con el cliente (opcional).
-- El panel la usa para avisar qué proyectos vencen pronto o ya están atrasados.
ALTER TABLE proyectos ADD COLUMN fecha_entrega DATE NULL AFTER monto_total;
