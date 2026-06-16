import { Outlet } from 'react-router'

export function MainContainer() {
  return (
    <main className="flex-1 min-w-0 overflow-auto bg-muted/20">
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
    </main>
  )
}
