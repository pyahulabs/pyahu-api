// Ajustes de la demo que necesitan que app.js ya haya cargado
'use strict';
(() => {
  // Credenciales precargadas: en el celu alcanza con tocar "Ingresar"
  const form = document.getElementById('form-acceso');
  form.email.value = pyahuDemo.DEMO.email;
  form.password.value = pyahuDemo.DEMO.password;

  // Dentro de un visor (un iframe, como los artifacts de Claude) los navegadores
  // no dejan descargar archivos: ahí avisamos en vez de fingir que se bajó.
  // En pyahulabs.com/gestion/ el CSV se descarga normal
  let enVisor = true;
  try { enVisor = window.self !== window.top; } catch { /* sin acceso al de arriba: es un visor */ }

  document.addEventListener('click', (e) => {
    if (enVisor && e.target.closest('[data-accion="exportar"]')) {
      e.stopImmediatePropagation();
      avisar('Acá no se pueden descargar archivos. En la app el CSV baja directo para abrirlo en Excel.', 'error');
    }
    if (e.target.closest('[data-accion="reiniciar-demo"]')) pyahuDemo.reiniciar();
  }, true);
})();
