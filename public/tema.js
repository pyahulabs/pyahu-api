// Se carga en el <head>, antes de pintar: aplica el tema guardado y evita
// que la página aparezca un instante en claro si elegiste oscuro (o al revés).
// Está en un archivo aparte porque la política de seguridad no deja scripts inline.
try {
  const tema = localStorage.getItem('tema');
  if (tema === 'claro' || tema === 'oscuro') document.documentElement.dataset.tema = tema;
} catch { /* sin localStorage: se usa el tema del sistema */ }
