# Lanzamiento del panel de gestión en Instagram

Material para anunciar el panel: un prompt para armar las piezas en **Claude Design** con el estilo de tu último post, el texto del posteo y la historia. Las capturas de esta carpeta son del panel real (con los datos de ejemplo de `npm run demo`).

| Archivo | Qué es |
|---|---|
| `1-resumen-compu.jpg` | Resumen en la compu (2880 × 1800) |
| `2-ficha-compu.jpg` | Ficha de un proyecto en la compu |
| `3-ficha-celu.jpg` | Ficha en el celu (1170 × 2532) |
| `4-historial-celu.jpg` | Historial en el celu |
| `5-resumen-celu-oscuro.jpg` | Resumen en el celu, modo oscuro |

## 1. Prompt para Claude Design

Adjuntá una captura de tu **último post** (el estilo sale de ahí), las cinco capturas del panel, y pegá esto:

```
Diseñá un carrusel de Instagram de 6 placas (1080 × 1350) y una historia (1080 × 1920) para anunciar un producto nuevo de Pyahu Labs, un estudio web de Villarrica, Paraguay: el Panel de gestión.

Que se parezca al último post de Pyahu Labs, que te adjunto: mismo estilo.

Qué es: un panel web para quien cobra por trabajo o por proyecto (estudios, freelancers, profesionales). Lleva clientes, proyectos, cobros con factura, IVA, gastos (dominios, hosting, licencias), pendientes y el historial de cada proyecto, y te dice cuánto te queda neto. Anda en la compu y en el celu. Se prueba gratis en pyahulabs.com/gestion.

Usá las capturas del panel tal cual: son del panel real, no inventes pantallas ni números.

Placas:
1. Portada: "Nuevo · lo más pyahu" (pyahu significa "nuevo" en guaraní) y el título "¿Cuánto te queda de verdad de lo que cobrás?", con la captura 3 (la ficha de un proyecto en el celu).
2. El problema: "Cobrás. Pagás el dominio, el hosting, el IVA…" y "…y a fin de mes no sabés cuánto ganaste." Sin captura.
3. Cada proyecto, su ficha: la captura 2 (la ficha en la compu) y "Monto, IVA incluido, gastos y neto, en una sola mirada."
4. Que no se te escape nada: la captura 4 (el historial en el celu) y tres líneas: "Qué cobros falta facturar", "Lo que le falta a cada proyecto" y "Todo lo que pasó, con fecha".
5. En todos lados: la captura 5 (el celu en modo oscuro) y la captura 1 (la compu), con "En la compu y en el celu" y "Pedí el saldo por WhatsApp con un toque".
6. Cierre: "Probalo gratis", "pyahulabs.com/gestion", "¿Querés uno para tu negocio? Escribime." y "@pyahulabs".

Historia: "Nuevo · lo más pyahu", "Panel de gestión", la captura 3 y "Probalo: tocá el link". Dejá libre la parte de abajo para el sticker de link de Instagram.

Todos los textos en español de Paraguay, con voseo.
```

## 2. Texto del posteo

```
¿Cuánto te queda de verdad de lo que cobrás?

Abrí el panel con el que llevo Pyahu Labs para que lo pruebes: clientes, cobros con factura, IVA, gastos y pendientes de cada proyecto, en un solo lugar. Y al final te dice cuánto te queda neto.

→ Ves qué cobros te falta facturar.
→ Cada proyecto tiene su ficha, con todo lo que pasó.
→ Pedís el saldo por WhatsApp con un toque.
→ Anda en la compu y en el celu, con modo oscuro.

Probalo gratis en pyahulabs.com/gestion (link en la bio). Si querés uno a la medida de tu negocio, escribime.

Pyahu, en guaraní, significa nuevo.

#Paraguay #Villarrica #Guaira #EmprendedoresPY #FreelancePY #DesarrolloWeb #SistemaDeGestion #PyahuLabs
```

## 3. Texto alternativo de cada placa

Instagram lo pide en **Configuración avanzada → Escribir texto alternativo**. Lo leen las personas que usan lector de pantalla.

1. Portada: "¿Cuánto te queda de verdad de lo que cobrás?" junto a un celular con la ficha de un proyecto en el panel de Pyahu Labs.
2. Texto sobre fondo oscuro: cobrás, pagás el dominio, el hosting y el IVA, y a fin de mes no sabés cuánto ganaste.
3. La ficha de un proyecto en la compu: monto total, IVA incluido, gastos y lo que queda neto.
4. El historial de un proyecto en el celu, con notas, cobros con y sin factura y gastos.
5. El panel en el celu en modo oscuro y en la compu.
6. Probalo gratis en pyahulabs.com/gestion. Escribime si querés uno para tu negocio. @pyahulabs.

## 4. Cómo publicarlo

1. En Claude Design, adjuntá una captura de tu último post y las cinco capturas del panel, pegá el prompt y revisá cada placa: que los números y las pantallas sean los de las capturas.
2. Descargá las 6 placas (PNG o JPG) y la historia.
3. **Posteo:** carrusel con las 6 placas en orden, el texto de arriba y el texto alternativo de cada una.
4. **Bio:** poné `pyahulabs.com/gestion` como link mientras dure el lanzamiento.
5. **Historia:** subí la imagen vertical y agregá el sticker de **Enlace** con `https://pyahulabs.com/gestion/` en la franja libre de abajo. Si querés, guardala en una historia destacada "Nuevo".

> El link `pyahulabs.com/gestion` anda recién cuando la rama `claude/panel-de-gestion` del repo `pyahu-labs` esté en `main` (Cloudflare publica lo que hay en `main`). Publicá en Instagram después de eso.
