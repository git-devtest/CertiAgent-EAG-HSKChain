# Nocturnal Archive · Guía UI de CertiAgent-HSK

## Paleta
- Fondo `#0F1115`, panel `#191D24`, coral principal `#E06C4F`, turquesa secundario `#4FA3A5`, acento amarillo oliva `#D6D04E`, violeta complementario `#7B5EA7`, texto `#F1EEE8`, texto secundario `#A8ADB7`, bordes `#34363A`.

## Pantalla actual del MVP
- Encabezado y hero: tipografía editorial Georgia en el titular y acento coral en el mensaje de privacidad.
- Estado de la red: panel oscuro y franjas coral; etiqueta turquesa; conectar MetaMask en coral, desplegar y autorizar en outline. Mantener estados de negocio explícitos.
- Verificación: zona de carga con borde discontinuo cobre/coral, input oscuro, botón coral. Resultado `good` turquesa, `bad` coral. Evitar que un simple color sustituya el texto del resultado.
- Registro del agente: tabla de fondo pizarra, líneas sutiles, hashes en monoespaciada y links turquesa a explorador.
- Pie: aclaración de que la prueba de integridad no equivale a validación de contenido o identidad.

## Nuevas pantallas, si se desarrollan después
- Landing: navegación mínima, hero editorial, acción primaria coral y acción secundaria outline. No simular transacciones reales.
- Dashboard: métricas reales del backend; no mostrar indicadores, número de usuarios, volumen de operaciones ni estados falsos.
- Tarjetas: borde y sombra suave, separación generosa y sin glow neón.
- Formularios: inputs de al menos 44 px de alto, foco visible amarillo oliva, errores textuales y color coral.
- Botones: reservar coral sólido a la acción principal por panel; usar outline para acciones administrativas secundarias.

## Instalación
Sustituir `public/style.css` por el CSS adjunto y reiniciar o actualizar el navegador. No hay cambios de lógica ni de configuración `.env`.
