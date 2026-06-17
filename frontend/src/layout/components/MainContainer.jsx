import { Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'

export function MainContainer() {
  const location = useLocation()
  
  return (
    <main className="flex-1 min-w-0 overflow-auto bg-muted/20">
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
