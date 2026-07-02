// Feature-set de animaciones DOM para LazyMotion, en módulo propio para que
// Vite lo emita como chunk async. LazyMotion lo carga vía import() después de
// la hidratación, así el primer paint solo arrastra el core ligero de `m` y no
// las ~15-20 kB de features de animación (Vercel: bundle-conditional).
//
// domAnimation cubre lo que usa la app (animate/initial/exit, whileHover/Tap,
// variants). NO incluye drag ni layout animations (domMax) — verificado que no
// se usan.
export { domAnimation as default } from 'motion/react'
