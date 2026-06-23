const L = ({ w = 'full', h = '1.5' }) => (
  <div className={`h-${h} w-${w} bg-gray-300/80 rounded-full`} />
)
const Opt = ({ checked = false }) => (
  <div className="flex items-center gap-1.5">
    <div className={`h-3 w-3 rounded-full border-2 ${checked ? 'border-gray-500 bg-gray-400' : 'border-gray-300'} shrink-0`} />
    <L w="3/4" />
  </div>
)
const Tag = () => <div className="h-5 px-2 bg-gray-200/80 rounded-full flex items-center"><L w="8" /></div>
const Btn = ({ w = '10' }) => <div className={`h-5 w-${w} bg-gray-300/80 rounded`} />

export function GameBoardWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex justify-between items-center bg-gray-100 rounded p-1.5">
        <span className="text-[9px] text-gray-400">Puntos: —</span>
        <div className="flex items-center gap-1 bg-gray-200/80 rounded px-1.5 py-0.5">
          <div className="h-3 w-3 rounded-full border-2 border-gray-400/60" />
          <div className="h-1.5 w-5 bg-gray-400/60 rounded-full" />
        </div>
      </div>
      <div className="border border-dashed border-gray-300 rounded-md p-2 flex flex-col gap-1.5">
        <L /><L w="3/4" />
      </div>
      {[false, true, false, false].map((c, i) => <Opt key={i} checked={c} />)}
      <div className="flex justify-end"><Btn w="16" /></div>
    </div>
  )
}

export function EscapeRoomWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex justify-center">
        <div className="h-12 w-10 bg-gray-300/60 rounded-md flex flex-col items-center justify-center gap-1">
          <div className="h-4 w-4 rounded-full border-2 border-gray-400/70" />
          <div className="h-1 w-3 bg-gray-400/60 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[1,2,3,4].map(i => (
          <div key={i} className="border border-dashed border-gray-300 rounded p-1.5 flex flex-col gap-1">
            <L w="2/3" h="1" /><L w="full" h="1" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DragDropWireframe() {
  return (
    <div className="flex gap-2 p-2">
      <div className="flex-1 flex flex-col gap-1.5">
        <span className="text-[9px] text-gray-400">Elementos</span>
        {['bg-gray-300/70','bg-gray-200/80','bg-gray-300/70'].map((bg, i) => (
          <div key={i} className={`h-6 ${bg} rounded flex items-center px-2`}><L w="3/4" /></div>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <span className="text-[9px] text-gray-400">Categorías</span>
        {[1,2,3].map(i => (
          <div key={i} className="h-6 border border-dashed border-gray-300 rounded flex items-center px-2"><L w="1/2" h="1" /></div>
        ))}
      </div>
    </div>
  )
}

export function ChatWireframe() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {[
        { right: false, w: '3/4' },
        { right: true,  w: '2/3' },
        { right: false, w: '4/5' },
        { right: true,  w: '1/2' },
      ].map(({ right, w }, i) => (
        <div key={i} className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-2 py-1.5 rounded-xl ${right ? 'bg-gray-300/70 rounded-tr-none' : 'bg-gray-100 rounded-tl-none'}`}>
            <L w={w} />
          </div>
        </div>
      ))}
      <div className="flex gap-1 mt-1 border border-gray-200 rounded-full px-2 py-1 bg-gray-50">
        <L /><div className="h-4 w-4 bg-gray-300/80 rounded-full shrink-0" />
      </div>
    </div>
  )
}

export function StrategyWireframe() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex justify-between text-[9px] text-gray-400">
        <span>Ronda 1/3</span><span>⟳ recursos: 5</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className={`h-7 rounded border ${i === 3 ? 'border-gray-400 bg-gray-300/60' : 'border-gray-200 bg-gray-100'} flex items-center justify-center`}>
            <L w="2/3" h="1" />
          </div>
        ))}
      </div>
      <div className="flex gap-1 justify-center"><Tag /><Tag /></div>
      <div className="h-1.5 bg-gray-200 rounded-full"><div className="h-full w-1/3 bg-gray-400/60 rounded-full" /></div>
    </div>
  )
}
