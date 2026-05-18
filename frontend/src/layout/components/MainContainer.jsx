import { Outlet } from 'react-router'

export function MainContainer() {
  return (
    <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <Outlet />
      </div>
    </main>
  )
}
