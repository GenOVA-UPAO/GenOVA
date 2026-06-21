const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)
const Box = ({ h = '10', children, dashed = false }) => (
  <div className={`h-${h} rounded-md ${dashed ? 'border border-dashed border-gray-300 bg-gray-50' : 'bg-gray-200/80'} flex items-center justify-center`}>
    {children}
  </div>
)
const Btn = ({ w = '10' }) => <div className={`h-5 w-${w} bg-gray-300/80 rounded`} />

export function PodcastWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex items-end justify-center gap-0.5 h-10">
        {[3,5,8,4,7,6,9,4,6,5,3,8,5,7,4,6].map((h, i) => (
          <div key={i} className="w-1.5 bg-gray-300/80 rounded-t-sm" style={{ height: `${h * 4}px` }} />
        ))}
      </div>
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
        <div className="h-6 w-6 rounded-full bg-gray-300/80 shrink-0" />
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full"><div className="h-full w-1/3 bg-gray-400/60 rounded-full" /></div>
        <Btn w="8" />
      </div>
      <div className="flex justify-between"><L w="16" /><L w="12" /></div>
    </div>
  )
}

export function StoryboardWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1 flex flex-col gap-1">
            <Box h="12"><span className="text-[10px] text-gray-400">#{n}</span></Box>
            <L w="full" /><L w="3/4" />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1"><L w="3/4" /><Btn w="12" /></div>
    </div>
  )
}

export function VideoWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Box h="16">
        <div className="h-8 w-8 rounded-full bg-gray-400/50 flex items-center justify-center">
          <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-t-transparent border-b-transparent border-l-gray-500 ml-0.5" />
        </div>
      </Box>
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-gray-300/80 shrink-0" />
        <div className="flex-1 h-1 bg-gray-200 rounded-full"><div className="h-full w-2/5 bg-gray-400/70 rounded-full" /></div>
        <L w="8" />
      </div>
      <div className="flex gap-1"><L w="full" /><L w="3/4" /></div>
    </div>
  )
}

export function AnimatedDemoWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex gap-1">
        {[1,2,3,4].map((n) => (
          <div key={n} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-8 w-full rounded-md ${n === 2 ? 'bg-gray-400/60 ring-1 ring-gray-400' : 'bg-gray-200/80'} flex items-center justify-center`}>
              <span className="text-[9px] text-gray-400">{n}</span>
            </div>
            <div className="h-0.5 w-3 bg-gray-300/80 rounded-full" />
          </div>
        ))}
      </div>
      <L /><L w="3/4" />
      <div className="flex gap-1 justify-end"><Btn /><Btn /></div>
    </div>
  )
}
