import { motion } from 'framer-motion'
import { HardDrives, Cpu, Key, Robot } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlatformApiKeysCard } from '../components/settings/PlatformApiKeysCard.jsx'
import { PlatformLlmConfigCard } from '../components/settings/PlatformLlmConfigCard.jsx'
import { PlatformNodesCard } from '../components/settings/PlatformNodesCard.jsx'

export function AdminPlatformPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mx-auto max-w-5xl pb-10"
    >
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl flex items-center gap-3">
          <HardDrives className="text-primary" weight="duotone" />
          Plataforma
        </h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">
          Configuración del motor Prometheus, llaves de API globales y modelos base del sistema.
        </p>
      </header>

      <Tabs defaultValue="prometheus" className="space-y-6">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl glass-card border border-border/50 shadow-sm w-full sm:w-auto overflow-x-auto justify-start h-auto">
          <TabsTrigger value="prometheus" className="rounded-xl font-bold text-sm px-5 py-2.5">
            <Cpu size={18} weight="bold" className="mr-2" /> Prometheus Engine
          </TabsTrigger>
          <TabsTrigger value="modelos" className="rounded-xl font-bold text-sm px-5 py-2.5">
            <Robot size={18} weight="bold" className="mr-2" /> Modelos IA
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="rounded-xl font-bold text-sm px-5 py-2.5">
            <Key size={18} weight="bold" className="mr-2" /> API Keys Globales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prometheus" className="mt-0 space-y-6">
          <PlatformNodesCard />
        </TabsContent>

        <TabsContent value="modelos" className="mt-0 space-y-6">
          <PlatformLlmConfigCard />
        </TabsContent>

        <TabsContent value="apikeys" className="mt-0 space-y-6">
          <PlatformApiKeysCard />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
