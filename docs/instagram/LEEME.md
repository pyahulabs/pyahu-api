# Lanzamiento del panel de gestión en Instagram

Material para anunciar el panel: un prompt para armar las piezas en **Claude Design**, el texto del posteo y la historia. Las capturas de esta carpeta son del panel real (con los datos de ejemplo de `npm run demo`).

| Archivo | Qué es |
|---|---|
| `1-resumen-compu.jpg` | Resumen en la compu (2880 × 1800) |
| `2-ficha-compu.jpg` | Ficha de un proyecto en la compu |
| `3-ficha-celu.jpg` | Ficha en el celu (1170 × 2532) |
| `4-historial-celu.jpg` | Historial en el celu |
| `5-resumen-celu-oscuro.jpg` | Resumen en el celu, modo oscuro |

## 1. Prompt para Claude Design

Adjuntá las cinco capturas y pegá esto:

```
Diseñá un carrusel de Instagram de 6 placas (1080 × 1350, formato 4:5) y una historia (1080 × 1920) para anunciar un producto nuevo de Pyahu Labs, un estudio web de Villarrica, Paraguay: el Panel de gestión.

Qué es: un panel web para quien cobra por trabajo o por proyecto (estudios, freelancers, profesionales). Lleva clientes, proyectos, cobros con factura, IVA, gastos (dominios, hosting, licencias), pendientes y el historial de cada proyecto, y te dice cuánto te queda neto. Anda en la compu y en el celu, con modo oscuro. Se prueba gratis en pyahulabs.com/gestion.

Identidad visual (respetala exacta):
- Colores: papel #F3EFE1 (fondo), papel oscuro #EAE4D1, tinta #23281C (texto), noche #161A12 (fondos oscuros), terracota #C1502E (acento y botones), dorado #E7A64B, verde #3E6259.
- Tipografías: Instrument Serif para los títulos grandes, con una palabra en itálica y en terracota; Figtree para los textos; JetBrains Mono en mayúsculas y con espaciado para las etiquetas chicas.
- Textura de papel suave en los fondos claros. Esquinas redondeadas, sombras suaves, mucho aire. Sin degradados violetas, íconos 3D ni emojis.
- Logo: un brote (tallo y dos hojas terracota, con un sol dorado arriba) junto a "Pyahu Labs".
- "Pyahu" en guaraní significa "nuevo": usalo en la etiqueta "NUEVO · LO MÁS PYAHU".

Usá las capturas adjuntas tal cual, dentro de una compu o un celular simples y oscuros. Son del panel real: no inventes pantallas ni números.

Placas:
1. Portada. Etiqueta "NUEVO · LO MÁS PYAHU". Título: "¿Cuánto te queda *de verdad* de lo que cobrás?". Un celular con la captura 3 (ficha del proyecto), un poco inclinado.
2. El problema. Fondo noche. Título: "Cobrás. Pagás el dominio, el hosting, el IVA…" y debajo, más chico: "…y a fin de mes no sabés cuánto ganaste." Sin captura: un cuaderno y una planilla dibujados a línea, en dorado.
3. Cada proyecto, su ficha. La captura 2 en una compu. Texto: "Monto, IVA incluido, gastos y *neto*, en una sola mirada."
4. Que no se te escape nada. La captura 4 en un celular. Tres líneas cortas con un punto de color cada una: "Qué cobros falta facturar" · "Lo que le falta a cada proyecto" · "Todo lo que pasó, con fecha".
5. En todos lados. La captura 5 (modo oscuro) en un celular adelante y la captura 1 en una compu atrás. Texto: "En la compu y en el celu. Con modo oscuro." y una etiqueta: "Pedí el saldo por WhatsApp con un toque".
6. Cierre. Fondo terracota, texto en papel. Título: "Probalo *gratis*" y debajo, bien grande, "pyahulabs.com/gestion". Abajo: "¿Querés uno para tu negocio? Escribime." y "@pyahulabs".

Historia (1080 × 1920): fondo papel, etiqueta "NUEVO · LO MÁS PYAHU", título "Panel de *gestión*", un celular grande con la captura 3 y, arriba de la franja de abajo, "Probalo: tocá el link". Dejá libres los últimos 350 px de abajo para el sticker de link que agrego en Instagram.

Todos los textos en español de Paraguay, con voseo ("cobrás", "probalo", "escribime"). Que se lean bien en el celu: títulos de 72 px o más y ningún texto de menos de 28 px.
```

Las palabras entre asteriscos (`*de verdad*`) son las que van en itálica y terracota.

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

1. En Claude Design, adjuntá las cinco capturas, pegá el prompt y revisá cada placa: que los números y las pantallas sean los de las capturas.
2. Descargá las 6 placas (PNG o JPG) y la historia.
3. **Posteo:** carrusel con las 6 placas en orden, el texto de arriba y el texto alternativo de cada una.
4. **Bio:** poné `pyahulabs.com/gestion` como link mientras dure el lanzamiento.
5. **Historia:** subí la imagen vertical y agregá el sticker de **Enlace** con `https://pyahulabs.com/gestion/` en la franja libre de abajo. Si querés, guardala en una historia destacada "Nuevo".

> El link `pyahulabs.com/gestion` anda recién cuando la rama `claude/panel-de-gestion` del repo `pyahu-labs` esté en `main` (Cloudflare publica lo que hay en `main`). Publicá en Instagram después de eso.
