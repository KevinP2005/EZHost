import { requireAuth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { getTopBarProperties } from '@/lib/services/properties'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAuth()
  const properties = await getTopBarProperties(profile)

  return (
    <div className="dark flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar profile={profile} properties={properties} />
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-10 lg:px-14">
          {children}
        </main>
      </div>
    </div>
  )
}
