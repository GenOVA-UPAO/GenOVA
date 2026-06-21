const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)

export function ComicWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="h-14 bg-gray-200/80 rounded-md relative overflow-hidden">
        <div className="absolute top-2 right-2 h-5 w-12 bg-white rounded-md border border-gray-300/60 flex items-center px-1">
          <div className="h-1 w-full bg-gray-300/60 rounded-full" />
        </div>
        <div className="absolute bottom-0 left-3 h-9 w-5 bg-gray-300/60 rounded-t-full" />
        <div className="absolute top-1 left-1 h-3.5 w-3.5 rounded-full bg-gray-400/50 flex items-center justify-center">
          <span className="text-[7px] text-gray-500 font-bold">2</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
        <div className="h-5 w-5 bg-gray-200/80 rounded-full" />
        <div className="flex gap-1">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className={`rounded-full ${i === 2 ? 'h-2 w-2 bg-gray-500' : 'h-1.5 w-1.5 bg-gray-300/80'}`} />
          ))}
        </div>
        <div className="h-5 w-5 bg-gray-200/80 rounded-full" />
      </div>
      <div className="flex gap-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className={`flex-1 h-5 rounded-sm ${i === 2 ? 'bg-gray-400/60 ring-1 ring-gray-400' : 'bg-gray-200/60'}`} />
        ))}
      </div>
    </div>
  )
}

export function DilemmaWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="border border-gray-200 rounded-md p-2 flex flex-col gap-1 bg-gray-50">
        <L /><L w="3/4" /><L w="4/5" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {['A', 'B'].map((opt) => (
          <div key={opt} className="border border-dashed border-gray-300 rounded-md p-2 flex flex-col gap-1">
            <div className="h-4 w-4 rounded-full bg-gray-300/80 text-[9px] text-gray-500 flex items-center justify-center">{opt}</div>
            <L w="full" h="1" /><L w="3/4" h="1" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArticleWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div className="h-2.5 bg-gray-400/70 rounded-full w-3/4" />
      <div className="h-6 bg-gray-200/80 rounded-md" />
      <div className="w-full h-px bg-gray-200" />
      <div className="flex flex-col gap-1">
        <L /><L w="4/5" /><L /><L w="3/4" /><L w="full" />
      </div>
      <div className="flex items-center gap-1 mt-1">
        <div className="h-4 w-4 rounded-full bg-gray-200" />
        <L w="20" h="1" />
      </div>
    </div>
  )
}

export function RolesWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      {[
        { side: 'left',  name: 'A' },
        { side: 'right', name: 'B' },
        { side: 'left',  name: 'A' },
      ].map(({ side, name }, i) => (
        <div key={i} className={`flex items-start gap-1.5 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
          <div className="h-6 w-6 rounded-full bg-gray-300/80 shrink-0 flex items-center justify-center text-[9px] text-gray-500">{name}</div>
          <div className={`flex-1 bg-gray-100 rounded-xl px-2 py-1 ${side === 'left' ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
            <L w={i === 1 ? '3/4' : 'full'} h="1" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ScenarioWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="bg-gray-100 rounded-md p-2 flex flex-col gap-1">
        <L /><L w="3/4" />
      </div>
      <div className="text-[9px] text-gray-400 font-medium">Elige tu camino:</div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-1.5 border border-gray-200 rounded-md px-2 py-1 bg-white">
          <div className="h-1.5 w-1.5 rounded-full bg-gray-300/80 shrink-0" />
          <L w="3/4" h="1" />
        </div>
      ))}
    </div>
  )
}
